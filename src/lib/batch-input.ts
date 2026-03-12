import JSZip from 'jszip';
import XLSX from 'xlsx-js-style';
import type { AudioSource } from '@/types/batch';

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm', '.aac', '.opus',
  '.mp4', '.mkv', '.mov', '.avi',
]);

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.mov', '.avi']);

function mimeForExtension(ext: string): string {
  if (VIDEO_EXTENSIONS.has(ext)) return `video/${ext.slice(1)}`;
  return `audio/${ext.slice(1)}`;
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function getBaseName(pathOrUrl: string): string {
  const segments = pathOrUrl.split('/');
  const last = segments[segments.length - 1];
  // Remove query params
  return last.split('?')[0] || last;
}

export async function parseZipInput(file: File): Promise<AudioSource[]> {
  const zip = await JSZip.loadAsync(file);
  const sources: AudioSource[] = [];

  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    const ext = getExtension(relativePath);
    if (!AUDIO_EXTENSIONS.has(ext)) return;

    const fileName = getBaseName(relativePath);
    sources.push({
      fileName,
      getFile: async () => {
        const blob = await entry.async('blob');
        return new File([blob], fileName, { type: mimeForExtension(ext) });
      },
    });
  });

  if (sources.length === 0) {
    throw new Error('No audio files found in the ZIP archive');
  }

  return sources;
}

export async function parseExcelInput(file: File): Promise<AudioSource[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel file has no sheets');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rows.length === 0) throw new Error('Excel sheet is empty');

  // Find the recordings column (case-insensitive)
  const firstRow = rows[0];
  const colKey = Object.keys(firstRow).find(
    k => k.toLowerCase().trim() === 'recordings'
  );
  if (!colKey) {
    throw new Error('No "recordings" column found in the Excel sheet. Available columns: ' + Object.keys(firstRow).join(', '));
  }

  const sources: AudioSource[] = [];
  for (let i = 0; i < rows.length; i++) {
    const url = String(rows[i][colKey] ?? '').trim();
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) continue;

    const fileName = getBaseName(url) || `recording-${i + 1}.mp3`;
    sources.push({
      fileName,
      sourceUrl: url,
      getFile: async () => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const ext = getExtension(fileName);
        return new File([blob], fileName, { type: blob.type || mimeForExtension(ext || '.mp3') });
      },
    });
  }

  if (sources.length === 0) {
    throw new Error('No recording URLs found in the "recordings" column');
  }

  return sources;
}
