// Types for Deepgram response
export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word: string;
  speaker?: number;
}

export interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
}

export interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

export interface DeepgramUtterance {
  start: number;
  end: number;
  confidence: number;
  channel: number;
  transcript: string;
  words: DeepgramWord[];
  speaker: number;
  id: string;
}

export interface DeepgramMetadata {
  transaction_key: string;
  request_id: string;
  sha256: string;
  created: string;
  duration: number;
  channels: number;
  models: string[];
  model_info: Record<string, { name: string; version: string; arch: string }>;
}

export interface DeepgramResult {
  metadata: DeepgramMetadata;
  results: {
    channels: DeepgramChannel[];
    utterances?: DeepgramUtterance[];
  };
}

// Parsed / structured output for display
export interface SpeakerBlock {
  speaker: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  rawTranscript: string;
  speakerBlocks: SpeakerBlock[];
  words: DeepgramWord[];
  confidence: number;
  duration: number;
  utterances?: DeepgramUtterance[];
  rawResponse: unknown; // Deepgram or Soniox raw API response
}

// Analysis types
export interface AnalysisScore {
  category: string;
  score: number; // 0-10
  feedback: string;
}

export interface STTAnalysis {
  overallScore: number;
  verdict: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
  scores: AnalysisScore[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface AnalysisResult {
  deepgramAnalysis: STTAnalysis;
  timestamp: string;
}

// Model configuration
export interface ModelConfig {
  sttService: 'deepgram' | 'soniox' | 'oristt';
  deepgramModel: string;
  deepgramLanguage: string;
  diarize: boolean;
  sonioxModel: string;
  oristtModel: string;
  oristtLanguage: string;
  geminiModel: string;
}

export const DEEPGRAM_MODELS = [
  { value: 'nova-3', label: 'Nova 3 (Latest, Recommended)' },
  { value: 'nova-2', label: 'Nova 2' },
  { value: 'nova-2-general', label: 'Nova 2 General' },
  { value: 'nova-2-meeting', label: 'Nova 2 Meeting' },
  { value: 'nova-2-phonecall', label: 'Nova 2 Phone Call' },
  { value: 'enhanced', label: 'Enhanced' },
  { value: 'base', label: 'Base' },
  { value: 'whisper-large', label: 'Whisper Large' },
  { value: 'whisper-medium', label: 'Whisper Medium' },
  { value: 'whisper-small', label: 'Whisper Small' },
] as const;

export const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Default)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-2.0-flash-thinking-exp', label: 'Gemini 2.0 Flash Thinking (Exp)' },
] as const;

export const DEEPGRAM_LANGUAGES = [
  { value: 'en',    label: '🇺🇸 English' },
  { value: 'es',    label: '🇪🇸 Spanish' },
  { value: 'fr',    label: '🇫🇷 French' },
  { value: 'de',    label: '🇩🇪 German' },
  { value: 'it',    label: '🇮🇹 Italian' },
  { value: 'pt',    label: '🇵🇹 Portuguese' },
  { value: 'nl',    label: '🇳🇱 Dutch' },
  { value: 'ja',    label: '🇯🇵 Japanese' },
  { value: 'ko',    label: '🇰🇷 Korean' },
  { value: 'zh',    label: '🇨🇳 Chinese (Mandarin)' },
  { value: 'hi',    label: '🇮🇳 Hindi' },
  { value: 'ar',    label: '🇸🇦 Arabic' },
  { value: 'ru',    label: '🇷🇺 Russian' },
  { value: 'tr',    label: '🇹🇷 Turkish' },
  { value: 'pl',    label: '🇵🇱 Polish' },
  { value: 'sv',    label: '🇸🇪 Swedish' },
  { value: 'da',    label: '🇩🇰 Danish' },
  { value: 'no',    label: '🇳🇴 Norwegian' },
  { value: 'fi',    label: '🇫🇮 Finnish' },
  { value: 'uk',    label: '🇺🇦 Ukrainian' },
  { value: 'id',    label: '🇮🇩 Indonesian' },
] as const;

// ─── Battle types ────────────────────────────────────────────────────────────

export type STTService = 'deepgram' | 'soniox' | 'gemini' | 'oristt';

export interface BattleSlotConfig {
  service: STTService;
  model: string;
  language: string; // used by deepgram; others auto-detect
}

export interface BattleSlotResult {
  status: 'idle' | 'running' | 'done' | 'error';
  transcript: string | null;
  timeTakenMs: number | null;
  error: string | null;
  statusMsg?: string | null; // live status for Soniox polling
}

export interface BattleVerdict {
  winner: 'A' | 'B' | 'tie';
  scoreA: number;
  scoreB: number;
  reasoningA: string;
  reasoningB: string;
}

export const SONIOX_MODELS = [
  { value: 'stt-async-v4', label: 'Soniox v4 Async — Latest (60+ langs)' },
  { value: 'stt-async-v3', label: 'Soniox v3 Async' },
] as const;

export const GEMINI_STT_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro' },
] as const;

export const ORISTT_MODELS = [
  { value: 'ori-indic-prime-v1', label: 'Ori Indic Prime v1 (13 langs)' },
  { value: 'ori-prime-v2.3',    label: 'Ori Prime v2.3 (Hinglish)' },
] as const;

export const ORISTT_LANGUAGES: Record<string, readonly { value: string; label: string }[]> = {
  'ori-indic-prime-v1': [
    { value: 'as', label: 'Assamese' },
    { value: 'bn', label: 'Bengali' },
    { value: 'gu', label: 'Gujarati' },
    { value: 'hi', label: 'Hindi' },
    { value: 'kn', label: 'Kannada' },
    { value: 'en', label: 'English' },
    { value: 'ml', label: 'Malayalam' },
    { value: 'mr', label: 'Marathi' },
    { value: 'ne', label: 'Nepali' },
    { value: 'or', label: 'Odia' },
    { value: 'pa', label: 'Punjabi' },
    { value: 'ta', label: 'Tamil' },
    { value: 'te', label: 'Telugu' },
  ],
  'ori-prime-v2.3': [
    { value: 'hi', label: 'Hindi' },
    { value: 'en', label: 'English' },
  ],
} as const;

export type AppView = 'transcribe' | 'analysis';

export interface UploadedFile {
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
}
