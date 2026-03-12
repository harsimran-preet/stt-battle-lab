import type { BatchItem, BatchConfig, BatchState, AudioSource } from '@/types/batch';
import type { BattleVerdict } from '@/types';
import { runSlot, slotLabel } from '@/lib/battle-utils';
import { judgeTranscripts } from '@/services/gemini';
import { updateBatchItem, updateBatchSession } from '@/lib/batch-db';
import { prepareAudioFile } from '@/lib/audio-trimmer';

/** Clamp all scores in a verdict to 0-10 range */
function clampVerdict(v: BattleVerdict): BattleVerdict {
  const c = (n: number) => Math.max(0, Math.min(10, n));
  return {
    ...v,
    scoreA: c(v.scoreA),
    scoreB: c(v.scoreB),
    factors: v.factors.map(f => ({
      ...f,
      scoreA: c(f.scoreA),
      scoreB: c(f.scoreB),
    })),
  };
}

export interface BatchProcessorCallbacks {
  onItemUpdate: (item: BatchItem) => void;
  onStateChange: (state: BatchState) => void;
  onProgress: (processed: number, errors: number) => void;
}

export class BatchProcessor {
  private config: BatchConfig;
  private items: BatchItem[];
  private sources: AudioSource[];
  private callbacks: BatchProcessorCallbacks;
  private state: BatchState = 'idle';
  private paused = false;
  private processedCount = 0;
  private errorCount = 0;

  constructor(
    config: BatchConfig,
    items: BatchItem[],
    sources: AudioSource[],
    callbacks: BatchProcessorCallbacks,
  ) {
    this.config = config;
    this.items = items;
    this.sources = sources;
    this.callbacks = callbacks;

    // Count already-processed items (for resume)
    for (const item of items) {
      if (item.status === 'done') this.processedCount++;
      if (item.status === 'error') { this.processedCount++; this.errorCount++; }
      // Reset any items stuck in 'running' state (crash recovery)
      if (item.status === 'running') {
        item.status = 'pending';
      }
    }
  }

  async start(): Promise<void> {
    this.paused = false;
    this.setState('running');

    const pendingIndices = this.items
      .filter(it => it.status === 'pending')
      .map(it => it.index);

    if (pendingIndices.length === 0) {
      this.setState('completed');
      return;
    }

    // Simple concurrency pool
    let cursor = 0;
    const next = (): number | null => {
      if (this.paused || cursor >= pendingIndices.length) return null;
      return pendingIndices[cursor++];
    };

    const worker = async () => {
      while (true) {
        const idx = next();
        if (idx === null) break;
        await this.processItem(idx);
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < this.config.concurrency; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    if (this.paused) {
      this.setState('paused');
    } else {
      this.setState('completed');
    }
  }

  pause(): void {
    this.paused = true;
  }

  getState(): BatchState {
    return this.state;
  }

  private setState(state: BatchState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
    updateBatchSession({
      id: this.config.id,
      state,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      ...(state === 'paused' ? { pausedAt: new Date().toISOString() } : {}),
    }).catch(e => console.warn('[batch-db]', e));
  }

  private async processItem(index: number): Promise<void> {
    const item = this.items[index];
    const source = this.sources[index];
    if (!item || !source) return;

    item.status = 'running';
    this.callbacks.onItemUpdate({ ...item });

    let file: File;
    try {
      file = await source.getFile();
    } catch (err) {
      item.status = 'error';
      item.slotAError = `Failed to load file: ${(err as Error).message}`;
      item.slotBError = item.slotAError;
      this.processedCount++;
      this.errorCount++;
      this.callbacks.onItemUpdate({ ...item });
      this.callbacks.onProgress(this.processedCount, this.errorCount);
      await updateBatchItem(item).catch(e => console.warn('[batch-db]', e));
      return;
    }

    const noop = () => {};

    // Trim audio if needed
    let fileToUse = file;
    try {
      const prep = await prepareAudioFile(file, this.config.maxChunkDuration);
      fileToUse = prep.file;
      item.originalDuration = prep.originalDuration;
      item.wasTrimmed = prep.wasTrimmed;
      item.trimmedDuration = prep.trimmedDuration;
    } catch (err) {
      item.trimError = `Audio prep failed: ${(err as Error).message}`;
    }
    this.callbacks.onItemUpdate({ ...item });

    // Run both slots concurrently with individual timing
    const timed = async (cfg: typeof this.config.slotA) => {
      const start = Date.now();
      const result = await runSlot(fileToUse, cfg, noop, noop);
      return { ...result, timeMs: Date.now() - start };
    };

    const [resA, resB] = await Promise.allSettled([
      timed(this.config.slotA),
      timed(this.config.slotB),
    ]);

    if (resA.status === 'fulfilled') {
      item.slotATranscript = resA.value.transcript;
      item.slotATimeMs = resA.value.timeMs;
    } else {
      item.slotAError = (resA.reason as Error).message;
    }

    if (resB.status === 'fulfilled') {
      item.slotBTranscript = resB.value.transcript;
      item.slotBTimeMs = resB.value.timeMs;
    } else {
      item.slotBError = (resB.reason as Error).message;
    }

    // At least one transcript needed
    const hasAnyTranscript = item.slotATranscript || item.slotBTranscript;

    // Judge if enabled and we have transcripts
    if (this.config.judgeEnabled && hasAnyTranscript) {
      try {
        const raw = await judgeTranscripts(
          slotLabel(this.config.slotA),
          item.slotATranscript ?? '(failed)',
          slotLabel(this.config.slotB),
          item.slotBTranscript ?? '(failed)',
          item.fileName,
          this.config.judgeModel,
        );
        item.verdict = clampVerdict(raw);
      } catch (err) {
        item.judgeError = (err as Error).message;
      }
    }

    item.status = (item.slotAError && item.slotBError) ? 'error' : 'done';
    if (item.status === 'error') this.errorCount++;
    this.processedCount++;

    this.callbacks.onItemUpdate({ ...item });
    this.callbacks.onProgress(this.processedCount, this.errorCount);
    await updateBatchItem(item).catch(e => console.warn('[batch-db]', e));
  }
}
