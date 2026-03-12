export interface AudioPrepResult {
  file: File;
  originalDuration: number;
  wasTrimmed: boolean;
  trimmedDuration: number;
}

function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const numChannels = channels.length;
  const numSamples = channels[0].length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  return buffer;
}

export async function prepareAudioFile(
  file: File,
  maxDurationSeconds: number,
): Promise<AudioPrepResult> {
  if (maxDurationSeconds <= 0) throw new Error('maxDurationSeconds must be positive');

  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }

  const originalDuration = audioBuffer.duration;

  if (originalDuration <= maxDurationSeconds) {
    return { file, originalDuration, wasTrimmed: false, trimmedDuration: originalDuration };
  }

  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const startSample = Math.max(0, audioBuffer.length - Math.ceil(maxDurationSeconds * sampleRate));

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch).slice(startSample));
  }

  const wavBuffer = encodeWav(channels, sampleRate);
  const trimmedDuration = channels[0].length / sampleRate;
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const trimmedFile = new File([wavBuffer], `${baseName}_trimmed.wav`, { type: 'audio/wav' });

  return { file: trimmedFile, originalDuration, wasTrimmed: true, trimmedDuration };
}
