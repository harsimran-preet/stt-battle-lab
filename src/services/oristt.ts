// OriSTT Speech-to-Text service
// API: POST multipart/form-data with file, model, language, stream

import type { TranscriptResult } from '@/types';

const ORISTT_API_KEY = import.meta.env.VITE_ORISTT_API_KEY as string;
const ORISTT_API_URL = import.meta.env.DEV
  ? '/api/oristt/openai/v1/audio/transcriptions'
  : 'https://ori-stt-test.oriserve.com/openai/v1/audio/transcriptions';

interface OriSTTResponse {
  text: string;
  usage?: {
    type: string;
    seconds: number;
  };
}

async function callOriSTT(file: File, model: string, language: string): Promise<OriSTTResponse> {
  if (!ORISTT_API_KEY) throw new Error('VITE_ORISTT_API_KEY is not set in your .env file');

  const form = new FormData();
  form.append('file', file);
  form.append('model', model);
  form.append('language', language);
  form.append('stream', 'false');

  const res = await fetch(ORISTT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ORISTT_API_KEY}`,
      Accept: 'application/json',
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OriSTT API error (${res.status}): ${body}`);
  }

  return res.json() as Promise<OriSTTResponse>;
}

/** Lightweight result for the Battle page */
export async function transcribeWithOriSTT(
  file: File,
  model = 'ori-indic-prime-v1',
  language = 'hi',
): Promise<{ transcript: string }> {
  const data = await callOriSTT(file, model, language);
  return { transcript: data.text.trim() };
}

/** Full TranscriptResult for the Transcribe page */
export async function transcribeOriSTTFull(
  file: File,
  model = 'ori-indic-prime-v1',
  language = 'hi',
): Promise<TranscriptResult> {
  const data = await callOriSTT(file, model, language);

  return {
    rawTranscript: data.text.trim(),
    speakerBlocks: [],
    words: [],
    confidence: 1,
    duration: data.usage?.seconds ?? 0,
    utterances: undefined,
    rawResponse: data,
  };
}
