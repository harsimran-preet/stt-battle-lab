// Soniox Speech-to-Text service
// API docs: https://soniox.com/docs/stt/api-reference
//
// Flow for file transcription (async):
//   1. POST /v1/files            → upload audio, get file_id
//   2. POST /v1/transcriptions   → create job with file_id + model, get transcription_id
//   3. GET  /v1/transcriptions/{id}           → poll until status = "completed" | "failed"
//   4. GET  /v1/transcriptions/{id}/transcript → fetch text + tokens
//   5. DELETE /v1/files/{file_id}             → clean up uploaded file

import type { TranscriptResult } from '@/types';

const SONIOX_API_KEY = import.meta.env.VITE_SONIOX_KEY as string;
const BASE = 'https://api.soniox.com/v1';

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 180; // ~3 minutes max

// ─── Internal types ───────────────────────────────────────────────────────────

interface SonioxFile {
  id: string;
  filename: string;
  size: number;
  created_at: string;
}

interface SonioxTranscription {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error_message?: string;
}

interface SonioxToken {
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
}

interface SonioxTranscript {
  id: string;
  text: string;
  tokens: SonioxToken[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeader() {
  return { Authorization: `Bearer ${SONIOX_API_KEY}` };
}

async function sonioxFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeader(), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Soniox API error (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const data = await sonioxFetch<SonioxFile>('/files', { method: 'POST', body: form });
  return data.id;
}

async function createTranscription(fileId: string, model: string): Promise<string> {
  const data = await sonioxFetch<SonioxTranscription>('/transcriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, model }),
  });
  return data.id;
}

async function pollUntilDone(
  transcriptionId: string,
  onStatus?: (msg: string) => void,
): Promise<void> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    // Check status first, then sleep — avoids a blind wait when job is already done
    const data = await sonioxFetch<SonioxTranscription>(`/transcriptions/${transcriptionId}`);
    if (data.status === 'completed') { onStatus?.('Finalising…'); return; }
    if (data.status === 'failed') {
      throw new Error(`Soniox transcription failed: ${data.error_message ?? 'unknown error'}`);
    }
    const elapsed = ((attempt + 1) * POLL_INTERVAL_MS / 1000).toFixed(0);
    onStatus?.(data.status === 'queued' ? `Queued… ${elapsed}s` : `Processing… ${elapsed}s`);
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Soniox transcription timed out after 3 minutes');
}

async function fetchTranscript(transcriptionId: string): Promise<SonioxTranscript> {
  return sonioxFetch<SonioxTranscript>(`/transcriptions/${transcriptionId}/transcript`);
}

async function deleteFile(fileId: string): Promise<void> {
  await fetch(`${BASE}/files/${fileId}`, { method: 'DELETE', headers: authHeader() });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Lightweight result for the Battle page */
export async function transcribeWithSoniox(
  file: File,
  model = 'stt-async-v4',
  onStatus?: (msg: string) => void,
): Promise<{ transcript: string }> {
  if (!SONIOX_API_KEY) throw new Error('VITE_SONIOX_KEY is not set in your .env file');

  onStatus?.('Uploading…');
  const fileId = await uploadFile(file);
  try {
    onStatus?.('Queued…');
    const transcriptionId = await createTranscription(fileId, model);
    await pollUntilDone(transcriptionId, onStatus);
    const data = await fetchTranscript(transcriptionId);
    return { transcript: data.text.trim() };
  } finally {
    deleteFile(fileId).catch(() => {});
  }
}

/** Full TranscriptResult for the Transcribe page */
export async function transcribeSonioxFull(
  file: File,
  model = 'stt-async-v4',
  onStatus?: (msg: string) => void,
): Promise<TranscriptResult> {
  if (!SONIOX_API_KEY) throw new Error('VITE_SONIOX_KEY is not set in your .env file');

  onStatus?.('Uploading…');
  const fileId = await uploadFile(file);
  let data: SonioxTranscript;
  try {
    onStatus?.('Queued…');
    const transcriptionId = await createTranscription(fileId, model);
    await pollUntilDone(transcriptionId, onStatus);
    data = await fetchTranscript(transcriptionId);
  } finally {
    deleteFile(fileId).catch(() => {});
  }

  const tokens = data.tokens ?? [];
  const avgConfidence = tokens.length > 0
    ? tokens.reduce((s, t) => s + (t.confidence ?? 1), 0) / tokens.length
    : 1;
  const durationSecs = tokens.length > 0
    ? (tokens[tokens.length - 1].end_ms ?? 0) / 1000
    : 0;

  return {
    rawTranscript: data.text.trim(),
    speakerBlocks: [],   // Soniox basic transcription — no diarization in this call
    words: [],
    confidence: avgConfidence,
    duration: durationSecs,
    utterances: undefined,
    rawResponse: data,
  };
}
