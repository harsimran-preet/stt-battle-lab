import type { BatchItem, BatchConfig, BatchState, AudioSource } from '@/types/batch';
import { runSlot, slotLabel } from '@/lib/battle-utils';
import { judgeTranscripts } from '@/services/gemini';
import { updateBatchItem, updateBatchSession } from '@/lib/batch-db';

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
    }).catch(() => {});
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
      await updateBatchItem(item).catch(() => {});
      return;
    }

    const start = Date.now();
    const noop = () => {};

    // Run both slots concurrently
    const [resA, resB] = await Promise.allSettled([
      runSlot(file, this.config.slotA, noop, noop),
      runSlot(file, this.config.slotB, noop, noop),
    ]);

    if (resA.status === 'fulfilled') {
      item.slotATranscript = resA.value.transcript;
      item.slotATimeMs = Date.now() - start;
    } else {
      item.slotAError = (resA.reason as Error).message;
    }

    if (resB.status === 'fulfilled') {
      item.slotBTranscript = resB.value.transcript;
      item.slotBTimeMs = Date.now() - start;
    } else {
      item.slotBError = (resB.reason as Error).message;
    }

    // At least one transcript needed
    const hasAnyTranscript = item.slotATranscript || item.slotBTranscript;

    // Judge if enabled and we have transcripts
    if (this.config.judgeEnabled && hasAnyTranscript) {
      try {
        item.verdict = await judgeTranscripts(
          slotLabel(this.config.slotA),
          item.slotATranscript ?? '(failed)',
          slotLabel(this.config.slotB),
          item.slotBTranscript ?? '(failed)',
          item.fileName,
          this.config.judgeModel,
        );
      } catch (err) {
        item.judgeError = (err as Error).message;
      }
    }

    item.status = (item.slotAError && item.slotBError) ? 'error' : 'done';
    if (item.status === 'error') this.errorCount++;
    this.processedCount++;

    this.callbacks.onItemUpdate({ ...item });
    this.callbacks.onProgress(this.processedCount, this.errorCount);
    await updateBatchItem(item).catch(() => {});
  }
}
