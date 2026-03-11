import type { STTService, BattleSlotConfig } from '@/types';
import { DEEPGRAM_MODELS, SONIOX_MODELS, ORISTT_MODELS, ORISTT_LANGUAGES } from '@/types';
import { transcribeFile } from '@/services/deepgram';
import { transcribeWithSoniox } from '@/services/soniox';
import { transcribeWithOriSTT } from '@/services/oristt';

export const SERVICE_META: Record<STTService, { label: string; color: string; badgeClass: string }> = {
  deepgram: {
    label: 'Deepgram',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  },
  soniox: {
    label: 'Soniox',
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  },
  oristt: {
    label: 'OriSTT',
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  },
};

export const MODEL_OPTIONS: Record<STTService, readonly { value: string; label: string }[]> = {
  deepgram: DEEPGRAM_MODELS,
  soniox: SONIOX_MODELS,
  oristt: ORISTT_MODELS,
};

export const DEFAULT_SLOT_A: BattleSlotConfig = { service: 'deepgram', model: 'nova-3', language: 'en' };
export const DEFAULT_SLOT_B: BattleSlotConfig = { service: 'soniox', model: 'stt-async-v4', language: 'en' };

export function slotLabel(cfg: BattleSlotConfig): string {
  const svc = SERVICE_META[cfg.service].label;
  const mdl = MODEL_OPTIONS[cfg.service].find(m => m.value === cfg.model)?.label ?? cfg.model;
  return `${svc} \u00b7 ${mdl}`;
}

export async function runSlot(
  file: File,
  cfg: BattleSlotConfig,
  onChunk: (text: string) => void,
  onStatus: (msg: string) => void,
): Promise<{ transcript: string }> {
  switch (cfg.service) {
    case 'deepgram': {
      onStatus('Transcribing\u2026');
      const result = await transcribeFile(file, cfg.model, cfg.language, false);
      const transcript = result.rawTranscript;
      onChunk(transcript);
      return { transcript };
    }
    case 'soniox':
      return transcribeWithSoniox(file, cfg.model, onStatus, cfg.language || undefined);
    case 'oristt': {
      onStatus('Transcribing\u2026');
      const result = await transcribeWithOriSTT(file, cfg.model, cfg.language);
      onChunk(result.transcript);
      return result;
    }
  }
}

export { ORISTT_LANGUAGES };
