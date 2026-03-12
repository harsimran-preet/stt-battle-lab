import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { BatchItem, BatchConfig, BatchState, AudioSource, BatchSession } from '@/types/batch';
import type { BattleSlotConfig } from '@/types';
import { BatchProcessor } from '@/lib/batch-processor';
import {
  createBatchSession,
  getLatestUnfinishedBatch,
  deleteBatchSession,
} from '@/lib/batch-db';

interface BatchProgress {
  processed: number;
  errors: number;
  total: number;
}

export function useBatchProcessor() {
  const [batchState, setBatchState] = useState<BatchState>('idle');
  const [items, setItems] = useState<Map<number, BatchItem>>(new Map());
  const [progress, setProgress] = useState<BatchProgress>({ processed: 0, errors: 0, total: 0 });
  const [config, setConfig] = useState<BatchConfig | null>(null);
  const [recoveryBatch, setRecoveryBatch] = useState<{ session: BatchSession; items: BatchItem[] } | null>(null);

  const processorRef = useRef<BatchProcessor | null>(null);
  const sourcesRef = useRef<AudioSource[]>([]);

  // Check for unfinished batch on mount
  useEffect(() => {
    getLatestUnfinishedBatch().then(result => {
      if (result) setRecoveryBatch(result);
    }).catch(() => {});
  }, []);

  const updateItem = useCallback((item: BatchItem) => {
    setItems(prev => {
      const next = new Map(prev);
      next.set(item.index, item);
      return next;
    });
  }, []);

  const startBatch = useCallback(async (
    sources: AudioSource[],
    slotA: BattleSlotConfig,
    slotB: BattleSlotConfig,
    judgeEnabled: boolean,
    judgeModel: string,
    concurrency: number,
    maxChunkDuration: number,
    includeFullTranscripts: boolean,
  ) => {
    const batchId = crypto.randomUUID();
    const batchConfig: BatchConfig = {
      id: batchId,
      createdAt: new Date().toISOString(),
      slotA,
      slotB,
      judgeEnabled,
      judgeModel,
      concurrency,
      totalItems: sources.length,
      inputType: sources[0]?.sourceUrl ? 'excel' : 'zip',
      maxChunkDuration,
      includeFullTranscripts,
    };

    const batchItems: BatchItem[] = sources.map((src, i) => ({
      id: `${batchId}-${i}`,
      batchId,
      index: i,
      fileName: src.fileName,
      sourceUrl: src.sourceUrl,
      status: 'pending' as const,
      slotATranscript: null,
      slotATimeMs: null,
      slotAError: null,
      slotBTranscript: null,
      slotBTimeMs: null,
      slotBError: null,
      verdict: null,
      judgeError: null,
      originalDuration: null,
      wasTrimmed: null,
      trimmedDuration: null,
      trimError: null,
    }));

    const session: BatchSession = {
      id: batchId,
      config: batchConfig,
      state: 'running',
      processedCount: 0,
      errorCount: 0,
      startedAt: new Date().toISOString(),
      pausedAt: null,
    };

    // Persist to IndexedDB
    await createBatchSession(session, batchItems);

    // Set state
    setConfig(batchConfig);
    setProgress({ processed: 0, errors: 0, total: sources.length });
    const itemMap = new Map<number, BatchItem>();
    batchItems.forEach(it => itemMap.set(it.index, it));
    setItems(itemMap);

    sourcesRef.current = sources;

    const processor = new BatchProcessor(batchConfig, batchItems, sources, {
      onItemUpdate: updateItem,
      onStateChange: setBatchState,
      onProgress: (processed, errors) => {
        setProgress({ processed, errors, total: sources.length });
      },
    });

    processorRef.current = processor;
    setRecoveryBatch(null);
    await processor.start();
  }, [updateItem]);

  const resumeBatch = useCallback(async (
    recoveredSession: BatchSession,
    recoveredItems: BatchItem[],
    sources: AudioSource[],
  ) => {
    setConfig(recoveredSession.config);
    const processedAlready = recoveredItems.filter(i => i.status === 'done' || i.status === 'error').length;
    const errorsAlready = recoveredItems.filter(i => i.status === 'error').length;
    setProgress({ processed: processedAlready, errors: errorsAlready, total: recoveredSession.config.totalItems });

    const itemMap = new Map<number, BatchItem>();
    recoveredItems.forEach(it => itemMap.set(it.index, it));
    setItems(itemMap);

    sourcesRef.current = sources;

    const processor = new BatchProcessor(recoveredSession.config, recoveredItems, sources, {
      onItemUpdate: updateItem,
      onStateChange: setBatchState,
      onProgress: (processed, errors) => {
        setProgress({ processed, errors, total: recoveredSession.config.totalItems });
      },
    });

    processorRef.current = processor;
    setRecoveryBatch(null);
    await processor.start();
  }, [updateItem]);

  const pause = useCallback(() => {
    processorRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    if (!config || !processorRef.current) return;
    const currentItems = Array.from(items.values()).sort((a, b) => a.index - b.index);
    const processor = new BatchProcessor(config, currentItems, sourcesRef.current, {
      onItemUpdate: updateItem,
      onStateChange: setBatchState,
      onProgress: (processed, errors) => {
        setProgress(prev => ({ ...prev, processed, errors }));
      },
    });
    processorRef.current = processor;
    await processor.start();
  }, [config, items, updateItem]);

  const reset = useCallback(async () => {
    processorRef.current?.pause();
    processorRef.current = null;
    if (config) {
      await deleteBatchSession(config.id).catch(() => {});
    }
    setItems(new Map());
    setProgress({ processed: 0, errors: 0, total: 0 });
    setConfig(null);
    setBatchState('idle');
    setRecoveryBatch(null);
  }, [config]);

  const dismissRecovery = useCallback(async () => {
    if (recoveryBatch) {
      await deleteBatchSession(recoveryBatch.session.id).catch(() => {});
      setRecoveryBatch(null);
    }
  }, [recoveryBatch]);

  const itemsArray = useMemo(
    () => Array.from(items.values()).sort((a, b) => a.index - b.index),
    [items],
  );

  return {
    batchState,
    items: itemsArray,
    progress,
    config,
    recoveryBatch,
    startBatch,
    resumeBatch,
    resume,
    pause,
    reset,
    dismissRecovery,
  };
}
