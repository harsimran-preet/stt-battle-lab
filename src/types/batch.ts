import type { BattleSlotConfig, BattleVerdict } from '@/types';

export type BatchItemStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';
export type BatchState = 'idle' | 'running' | 'paused' | 'completed';

export interface BatchItem {
  id: string;
  batchId: string;
  index: number;
  fileName: string;
  sourceUrl?: string;
  status: BatchItemStatus;
  slotATranscript: string | null;
  slotATimeMs: number | null;
  slotAError: string | null;
  slotBTranscript: string | null;
  slotBTimeMs: number | null;
  slotBError: string | null;
  verdict: BattleVerdict | null;
  judgeError: string | null;
  originalDuration: number | null;
  wasTrimmed: boolean | null;
  trimmedDuration: number | null;
  trimError: string | null;
}

export interface BatchConfig {
  id: string;
  createdAt: string;
  slotA: BattleSlotConfig;
  slotB: BattleSlotConfig;
  judgeEnabled: boolean;
  judgeModel: string;
  concurrency: number;
  totalItems: number;
  inputType: 'zip' | 'excel';
  maxChunkDuration: number;
  includeFullTranscripts: boolean;
}

export interface BatchSession {
  id: string;
  config: BatchConfig;
  state: BatchState;
  processedCount: number;
  errorCount: number;
  startedAt: string | null;
  pausedAt: string | null;
}

export interface AudioSource {
  fileName: string;
  sourceUrl?: string;
  getFile: () => Promise<File>;
}
