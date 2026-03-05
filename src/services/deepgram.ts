import type {
  DeepgramResult,
  TranscriptResult,
  SpeakerBlock,
} from '@/types';

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY as string;
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';

export async function transcribeFile(
  file: File,
  model = 'nova-3',
  language = 'en',
  diarize = true,
): Promise<TranscriptResult> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('VITE_DEEPGRAM_API_KEY is not set in your .env file');
  }

  const params = new URLSearchParams({
    model,
    smart_format: 'true',
    punctuate:    'true',
    filler_words: 'false',
    language,
  });

  if (diarize) {
    params.set('diarize',    'true');
    params.set('utterances', 'true');
  }

  const response = await fetch(`${DEEPGRAM_API_URL}?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': file.type || 'audio/*',
    },
    body: file,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Deepgram API error (${response.status}): ${err}`);
  }

  const data: DeepgramResult = await response.json();
  return parseDeepgramResult(data, diarize);
}

/**
 * Streams a pre-recorded file through Deepgram's WebSocket API.
 * Calls onChunk with the accumulated transcript as each sentence is finalised.
 * Auth uses the `['token', key]` subprotocol that Deepgram supports for browsers.
 */
export function transcribeFileStreaming(
  file: File,
  model = 'nova-3',
  language = 'en',
  onChunk?: (accumulated: string) => void,
): Promise<{ transcript: string }> {
  if (!DEEPGRAM_API_KEY) {
    return Promise.reject(new Error('VITE_DEEPGRAM_API_KEY is not set in your .env file'));
  }

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      model,
      language,
      smart_format: 'true',
      punctuate:    'true',
      filler_words: 'false',
    });

    const ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params}`,
      ['token', DEEPGRAM_API_KEY],
    );

    let accumulated = '';
    let settled = false;

    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve({ transcript: accumulated });
    };

    ws.onopen = async () => {
      const buffer = await file.arrayBuffer();
      const CHUNK = 16_384; // 16 KB — avoids overwhelming the socket
      for (let i = 0; i < buffer.byteLength; i += CHUNK) {
        if (ws.readyState !== WebSocket.OPEN) break;
        ws.send(buffer.slice(i, i + CHUNK));
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'CloseStream' }));
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data) as {
          type: string;
          is_final?: boolean;
          channel?: { alternatives?: { transcript?: string }[] };
        };
        if (msg.type === 'Results' && msg.is_final) {
          const text = msg.channel?.alternatives?.[0]?.transcript ?? '';
          if (text.trim()) {
            accumulated += (accumulated ? ' ' : '') + text;
            onChunk?.(accumulated);
          }
        }
      } catch { /* malformed frame — ignore */ }
    };

    ws.onerror = () => done(new Error('Deepgram WebSocket error'));
    ws.onclose  = () => done();
  });
}

function groupWordsBySpeaker(words: DeepgramResult['results']['channels'][0]['alternatives'][0]['words']): SpeakerBlock[] {
  if (!words || words.length === 0) return [];

  const blocks: SpeakerBlock[] = [];
  let currentSpeaker = words[0]?.speaker ?? 0;
  let currentWords: typeof words = [];
  let blockStart = words[0]?.start ?? 0;

  for (const word of words) {
    const speaker = word.speaker ?? 0;
    if (speaker !== currentSpeaker && currentWords.length > 0) {
      blocks.push({
        speaker: currentSpeaker,
        start: blockStart,
        end: currentWords[currentWords.length - 1].end,
        text: currentWords.map(w => w.punctuated_word || w.word).join(' '),
      });
      currentSpeaker = speaker;
      currentWords = [word];
      blockStart = word.start;
    } else {
      currentWords.push(word);
    }
  }

  if (currentWords.length > 0) {
    blocks.push({
      speaker: currentSpeaker,
      start: blockStart,
      end: currentWords[currentWords.length - 1].end,
      text: currentWords.map(w => w.punctuated_word || w.word).join(' '),
    });
  }

  return blocks;
}

function parseDeepgramResult(data: DeepgramResult, diarize = true): TranscriptResult {
  const channel     = data.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];
  const utterances  = data.results?.utterances;

  const rawTranscript = alternative?.transcript ?? '';
  const confidence    = alternative?.confidence ?? 0;
  const duration      = data.metadata?.duration ?? 0;
  const words         = alternative?.words ?? [];

  let speakerBlocks: SpeakerBlock[] = [];

  // Strategy 1: Use utterances (best — full-segment diarization from Deepgram)
  if (diarize && utterances && utterances.length > 0) {
    speakerBlocks = utterances.map(utt => ({
      speaker: utt.speaker ?? 0,
      start:   utt.start,
      end:     utt.end,
      text:    utt.transcript,
    }));

    // Check if diarization actually produced multiple speakers.
    // If all utterances are speaker 0 but words have varied speaker values,
    // fall back to word-level grouping (handles some nova-3 quirks).
    const uniqueFromUtterances = new Set(speakerBlocks.map(b => b.speaker));
    if (uniqueFromUtterances.size === 1) {
      const uniqueFromWords = new Set(words.map(w => w.speaker ?? 0));
      if (uniqueFromWords.size > 1) {
        // Word-level diarization is richer — use it instead
        speakerBlocks = groupWordsBySpeaker(words);
      }
    }
  } else if (diarize && words.length > 0) {
    // Strategy 2: Word-level grouping (fallback when no utterances)
    speakerBlocks = groupWordsBySpeaker(words);
  }

  return {
    rawTranscript,
    speakerBlocks,
    words,
    confidence,
    duration,
    utterances,
    rawResponse: data,
  };
}
