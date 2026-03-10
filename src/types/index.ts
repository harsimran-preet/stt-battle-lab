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
  sonioxLanguage: string;
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
] as const;

export const DEEPGRAM_LANGUAGES = [
  { value: 'multi', label: 'Multilingual (Auto-detect)' },
  { value: 'en',    label: 'English' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-NZ', label: 'English (New Zealand)' },
  { value: 'ar',    label: 'Arabic' },
  { value: 'ar-AE', label: 'Arabic (UAE)' },
  { value: 'ar-SA', label: 'Arabic (Saudi Arabia)' },
  { value: 'ar-EG', label: 'Arabic (Egypt)' },
  { value: 'ar-MA', label: 'Arabic (Morocco)' },
  { value: 'ar-IQ', label: 'Arabic (Iraq)' },
  { value: 'ar-QA', label: 'Arabic (Qatar)' },
  { value: 'ar-KW', label: 'Arabic (Kuwait)' },
  { value: 'ar-SY', label: 'Arabic (Syria)' },
  { value: 'ar-LB', label: 'Arabic (Lebanon)' },
  { value: 'ar-PS', label: 'Arabic (Palestine)' },
  { value: 'ar-JO', label: 'Arabic (Jordan)' },
  { value: 'ar-SD', label: 'Arabic (Sudan)' },
  { value: 'ar-TD', label: 'Arabic (Chad)' },
  { value: 'ar-DZ', label: 'Arabic (Algeria)' },
  { value: 'ar-TN', label: 'Arabic (Tunisia)' },
  { value: 'ar-IR', label: 'Arabic (Iran)' },
  { value: 'be',    label: 'Belarusian' },
  { value: 'bn',    label: 'Bengali' },
  { value: 'bs',    label: 'Bosnian' },
  { value: 'bg',    label: 'Bulgarian' },
  { value: 'ca',    label: 'Catalan' },
  { value: 'hr',    label: 'Croatian' },
  { value: 'cs',    label: 'Czech' },
  { value: 'da',    label: 'Danish' },
  { value: 'da-DK', label: 'Danish (Denmark)' },
  { value: 'nl',    label: 'Dutch' },
  { value: 'nl-BE', label: 'Flemish (Belgium)' },
  { value: 'et',    label: 'Estonian' },
  { value: 'fi',    label: 'Finnish' },
  { value: 'fr',    label: 'French' },
  { value: 'fr-CA', label: 'French (Canada)' },
  { value: 'de',    label: 'German' },
  { value: 'de-CH', label: 'German (Switzerland)' },
  { value: 'el',    label: 'Greek' },
  { value: 'he',    label: 'Hebrew' },
  { value: 'hi',    label: 'Hindi' },
  { value: 'hu',    label: 'Hungarian' },
  { value: 'id',    label: 'Indonesian' },
  { value: 'it',    label: 'Italian' },
  { value: 'ja',    label: 'Japanese' },
  { value: 'kn',    label: 'Kannada' },
  { value: 'ko',    label: 'Korean' },
  { value: 'ko-KR', label: 'Korean (South Korea)' },
  { value: 'lv',    label: 'Latvian' },
  { value: 'lt',    label: 'Lithuanian' },
  { value: 'mk',    label: 'Macedonian' },
  { value: 'ms',    label: 'Malay' },
  { value: 'mr',    label: 'Marathi' },
  { value: 'no',    label: 'Norwegian' },
  { value: 'fa',    label: 'Persian' },
  { value: 'pl',    label: 'Polish' },
  { value: 'pt',    label: 'Portuguese' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'pt-PT', label: 'Portuguese (Portugal)' },
  { value: 'ro',    label: 'Romanian' },
  { value: 'ru',    label: 'Russian' },
  { value: 'sr',    label: 'Serbian' },
  { value: 'sk',    label: 'Slovak' },
  { value: 'sl',    label: 'Slovenian' },
  { value: 'es',    label: 'Spanish' },
  { value: 'es-419', label: 'Spanish (Latin America)' },
  { value: 'sv',    label: 'Swedish' },
  { value: 'sv-SE', label: 'Swedish (Sweden)' },
  { value: 'tl',    label: 'Tagalog' },
  { value: 'ta',    label: 'Tamil' },
  { value: 'te',    label: 'Telugu' },
  { value: 'tr',    label: 'Turkish' },
  { value: 'uk',    label: 'Ukrainian' },
  { value: 'ur',    label: 'Urdu' },
  { value: 'vi',    label: 'Vietnamese' },
] as const;

// ─── Battle types ────────────────────────────────────────────────────────────

export type STTService = 'deepgram' | 'soniox' | 'oristt';

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

export interface BattleFactorScore {
  factor: string;
  scoreA: number;
  scoreB: number;
  feedbackA: string;
  feedbackB: string;
}

export interface BattleVerdict {
  winner: 'A' | 'B' | 'tie';
  scoreA: number;
  scoreB: number;
  reasoningA: string;
  reasoningB: string;
  factors: BattleFactorScore[];
}

export const SONIOX_MODELS = [
  { value: 'stt-async-v4', label: 'Soniox v4 Async — Latest (60+ langs)' },
  { value: 'stt-async-v3', label: 'Soniox v3 Async' },
] as const;

export const SONIOX_LANGUAGES = [
  { value: '',   label: 'Auto-detect' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'sq', label: 'Albanian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'az', label: 'Azerbaijani' },
  { value: 'eu', label: 'Basque' },
  { value: 'be', label: 'Belarusian' },
  { value: 'bn', label: 'Bengali' },
  { value: 'bs', label: 'Bosnian' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'ca', label: 'Catalan' },
  { value: 'zh', label: 'Chinese' },
  { value: 'hr', label: 'Croatian' },
  { value: 'cs', label: 'Czech' },
  { value: 'da', label: 'Danish' },
  { value: 'nl', label: 'Dutch' },
  { value: 'en', label: 'English' },
  { value: 'et', label: 'Estonian' },
  { value: 'fi', label: 'Finnish' },
  { value: 'fr', label: 'French' },
  { value: 'gl', label: 'Galician' },
  { value: 'de', label: 'German' },
  { value: 'el', label: 'Greek' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'he', label: 'Hebrew' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'id', label: 'Indonesian' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'kn', label: 'Kannada' },
  { value: 'kk', label: 'Kazakh' },
  { value: 'ko', label: 'Korean' },
  { value: 'lv', label: 'Latvian' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'mk', label: 'Macedonian' },
  { value: 'ms', label: 'Malay' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'no', label: 'Norwegian' },
  { value: 'fa', label: 'Persian' },
  { value: 'pl', label: 'Polish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'ro', label: 'Romanian' },
  { value: 'ru', label: 'Russian' },
  { value: 'sr', label: 'Serbian' },
  { value: 'sk', label: 'Slovak' },
  { value: 'sl', label: 'Slovenian' },
  { value: 'es', label: 'Spanish' },
  { value: 'sw', label: 'Swahili' },
  { value: 'sv', label: 'Swedish' },
  { value: 'tl', label: 'Tagalog' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'th', label: 'Thai' },
  { value: 'tr', label: 'Turkish' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'ur', label: 'Urdu' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'cy', label: 'Welsh' },
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
