import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TranscriptResult, STTAnalysis, AnalysisResult, BattleVerdict } from '@/types';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;

export async function analyzeTranscript(
  result: TranscriptResult,
  fileName: string,
  geminiModel = 'gemini-2.0-flash'
): Promise<AnalysisResult> {
  if (!GOOGLE_API_KEY) {
    throw new Error('VITE_GOOGLE_API_KEY is not set in your .env file');
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: geminiModel });

  const speakerSection =
    result.speakerBlocks.length > 0
      ? result.speakerBlocks
          .map(b => `[Speaker ${b.speaker} | ${formatTime(b.start)}-${formatTime(b.end)}]: ${b.text}`)
          .join('\n')
      : 'No diarization data available';

  const prompt = `You are an expert Speech-to-Text quality analyst. Evaluate the following transcript and provide a detailed quality assessment.

## Audio File
Filename: ${fileName}
Duration: ${formatTime(result.duration)}
Overall Confidence Score: ${(result.confidence * 100).toFixed(1)}%
Number of Speaker Blocks: ${result.speakerBlocks.length}

## Raw Transcript
${result.rawTranscript || '(empty)'}

## Diarized Transcript (with speaker labels and timestamps)
${speakerSection}

## Word Count
${result.words.length} words transcribed

---
Analyze the STT output quality across these 5 factors and return ONLY a valid JSON object with this exact structure:
{
  "overallScore": <number 0-10>,
  "verdict": <"Excellent" | "Good" | "Fair" | "Poor">,
  "summary": "<2-3 sentence overall assessment>",
  "scores": [
    {"category": "Verbatim Accuracy", "score": <0-10>, "feedback": "<how faithfully it captured spoken words — missing words, hallucinations, substitutions>"},
    {"category": "Punctuation & Formatting", "score": <0-10>, "feedback": "<sentence boundaries, capitalization, commas, question marks, paragraph breaks>"},
    {"category": "Completeness", "score": <0-10>, "feedback": "<did it capture everything? any truncated or missing segments?>"},
    {"category": "Proper Noun Handling", "score": <0-10>, "feedback": "<names, places, brands, technical terms — correct or mangled?>"},
    {"category": "Readability & Naturalness", "score": <0-10>, "feedback": "<does it read like natural speech? grammar coherence, filler word handling, sentence flow>"}
  ],
}

Be specific in your feedback — reference actual words or phrases from the transcript when possible.`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini returned an unexpected response format');
  }

  const analysis: STTAnalysis = JSON.parse(jsonMatch[0]);

  return {
    deepgramAnalysis: analysis,
    timestamp: new Date().toISOString(),
  };
}

export interface TranslationResult {
  translatedBlocks: string[];
  translatedRaw: string;
}

export async function translateTranscript(
  result: TranscriptResult,
  geminiModel = 'gemini-2.5-flash'
): Promise<TranslationResult> {
  if (!GOOGLE_API_KEY) {
    throw new Error('VITE_GOOGLE_API_KEY is not set in your .env file');
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: geminiModel });

  const blockLines = result.speakerBlocks
    .map((b, i) => `${i}: ${b.text}`)
    .join('\n');

  const prompt = `Translate the following transcript content to English. Preserve the meaning as accurately as possible. Do not add any commentary.

Return ONLY a valid JSON object with this exact structure:
{
  "blocks": [<translated string for each block, in the same order>,  ...],
  "raw": "<translated full transcript as a single string>"
}

Speaker blocks (index: text):
${blockLines}

Full transcript:
${result.rawTranscript || ''}`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini returned an unexpected response format');
  }

  const parsed = JSON.parse(jsonMatch[0]) as { blocks: string[]; raw: string };

  return {
    translatedBlocks: parsed.blocks,
    translatedRaw: parsed.raw,
  };
}

export async function translateText(
  text: string,
  geminiModel = 'gemini-2.5-flash',
): Promise<string> {
  if (!GOOGLE_API_KEY) {
    throw new Error('VITE_GOOGLE_API_KEY is not set in your .env file');
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: geminiModel });

  const prompt = `Translate the following text to English. Preserve the meaning as accurately as possible. Return ONLY the translated text — no commentary, no labels, no extra formatting.\n\n${text}`;

  const response = await model.generateContent(prompt);
  return response.response.text().trim();
}

// ─── Gemini as STT ───────────────────────────────────────────────────────────
// Gemini supports inline audio up to ~20 MB. Larger files will throw.

const GEMINI_STT_PROMPT =
  'Transcribe this audio accurately. Include every spoken word as-is. ' +
  'Return ONLY the plain transcript text — no labels, no timestamps, no commentary.';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data URL prefix (e.g. "data:audio/mp3;base64,")
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function transcribeWithGemini(
  file: File,
  geminiModel = 'gemini-2.0-flash',
  onChunk?: (accumulated: string) => void,
): Promise<{ transcript: string }> {
  if (!GOOGLE_API_KEY) {
    throw new Error('VITE_GOOGLE_API_KEY is not set in your .env file');
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error('File exceeds the 20 MB inline limit for Gemini STT. Please use a smaller file.');
  }

  const base64 = await fileToBase64(file);
  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: geminiModel });
  const content = [
    { inlineData: { mimeType: file.type || 'audio/mp3', data: base64 } },
    GEMINI_STT_PROMPT,
  ];

  if (onChunk) {
    const stream = await model.generateContentStream(content);
    let accumulated = '';
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) {
        accumulated += text;
        onChunk(accumulated);
      }
    }
    return { transcript: accumulated.trim() };
  }

  const result = await model.generateContent(content);
  return { transcript: result.response.text().trim() };
}

// ─── Gemini as Battle Judge ───────────────────────────────────────────────────

export async function judgeTranscripts(
  labelA: string,
  transcriptA: string,
  labelB: string,
  transcriptB: string,
  fileName: string,
  geminiModel = 'gemini-2.5-flash',
): Promise<BattleVerdict> {
  if (!GOOGLE_API_KEY) {
    throw new Error('VITE_GOOGLE_API_KEY is not set in your .env file');
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: geminiModel });

  const prompt = `You are an expert Speech-to-Text quality judge. Two STT services transcribed the same audio file. Evaluate them across 5 quality factors and declare a winner.

Audio file: ${fileName}

--- Transcript A (${labelA}) ---
${transcriptA || '(empty — service failed or returned nothing)'}

--- Transcript B (${labelB}) ---
${transcriptB || '(empty — service failed or returned nothing)'}

Evaluate each transcript across these 5 factors:
1. **Verbatim Accuracy** — How faithfully it captured spoken words (missing words, hallucinations, substitutions)
2. **Punctuation & Formatting** — Proper sentence boundaries, capitalization, commas, question marks
3. **Completeness** — Did it capture everything? Any truncated or missing segments?
4. **Proper Noun Handling** — Names, places, brands, technical terms — correct or mangled?
5. **Readability & Naturalness** — Does it read like natural speech? Grammar coherence, filler word handling, sentence flow

Return ONLY a valid JSON object with this exact structure:
{
  "winner": <"A" | "B" | "tie">,
  "scoreA": <number 0-10>,
  "scoreB": <number 0-10>,
  "reasoningA": "<1 concise paragraph assessing transcript A's overall quality>",
  "reasoningB": "<1 concise paragraph assessing transcript B's overall quality>",
  "factors": [
    {"factor": "Verbatim Accuracy", "scoreA": <0-10>, "scoreB": <0-10>, "feedbackA": "<brief observation for A>", "feedbackB": "<brief observation for B>"},
    {"factor": "Punctuation & Formatting", "scoreA": <0-10>, "scoreB": <0-10>, "feedbackA": "<brief>", "feedbackB": "<brief>"},
    {"factor": "Completeness", "scoreA": <0-10>, "scoreB": <0-10>, "feedbackA": "<brief>", "feedbackB": "<brief>"},
    {"factor": "Proper Noun Handling", "scoreA": <0-10>, "scoreB": <0-10>, "feedbackA": "<brief>", "feedbackB": "<brief>"},
    {"factor": "Readability & Naturalness", "scoreA": <0-10>, "scoreB": <0-10>, "feedbackA": "<brief>", "feedbackB": "<brief>"}
  ]
}`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini judge returned an unexpected response format');
  }

  return JSON.parse(jsonMatch[0]) as BattleVerdict;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
