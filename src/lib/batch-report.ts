import XLSX from 'xlsx-js-style';
import type { BatchItem, BatchConfig } from '@/types/batch';
import { slotLabel, SERVICE_META, MODEL_OPTIONS } from '@/lib/battle-utils';

// ─── Style constants ─────────────────────────────────────────────────────────

const COLORS = {
  headerBg: '2D3748',    // dark slate
  headerFg: 'FFFFFF',
  aWinBg: 'DBEAFE',      // blue-100
  bWinBg: 'FFEDD5',      // orange-100
  tieBg: 'F3F4F6',       // gray-100
  errorBg: 'FEE2E2',     // red-100
  doneBg: 'F0FDF4',      // green-50
  sectionBg: 'EDF2F7',   // gray-200
  titleBg: '1A202C',     // near-black
  titleFg: 'FFFFFF',
  slotAFg: '2563EB',     // blue-600
  slotBFg: 'EA580C',     // orange-600
  greenFg: '16A34A',     // green-600
  redFg: 'DC2626',       // red-600
  mutedFg: '6B7280',     // gray-500
};

type CellStyle = {
  font?: { bold?: boolean; color?: { rgb: string }; sz?: number; name?: string };
  fill?: { fgColor: { rgb: string } };
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean };
  border?: Record<string, { style: string; color: { rgb: string } }>;
};

const thinBorder = {
  top: { style: 'thin', color: { rgb: 'E2E8F0' } },
  bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
  left: { style: 'thin', color: { rgb: 'E2E8F0' } },
  right: { style: 'thin', color: { rgb: 'E2E8F0' } },
};

const headerStyle: CellStyle = {
  font: { bold: true, color: { rgb: COLORS.headerFg }, sz: 11, name: 'Calibri' },
  fill: { fgColor: { rgb: COLORS.headerBg } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: thinBorder,
};

const cellBase: CellStyle = {
  font: { sz: 10, name: 'Calibri' },
  alignment: { vertical: 'center' },
  border: thinBorder,
};

function scoreStyle(score: number | string, isSlotA: boolean): CellStyle {
  if (typeof score !== 'number') return { ...cellBase, alignment: { horizontal: 'center', vertical: 'center' } };
  const color = score >= 8 ? COLORS.greenFg : score >= 5 ? (isSlotA ? COLORS.slotAFg : COLORS.slotBFg) : COLORS.redFg;
  return {
    ...cellBase,
    font: { bold: true, color: { rgb: color }, sz: 10, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
}

function statusStyle(status: string): CellStyle {
  const bgMap: Record<string, string> = { done: COLORS.doneBg, error: COLORS.errorBg };
  return {
    ...cellBase,
    fill: bgMap[status] ? { fgColor: { rgb: bgMap[status] } } : undefined,
    font: {
      sz: 10, name: 'Calibri', bold: status === 'error',
      color: status === 'error' ? { rgb: COLORS.redFg } : { rgb: '374151' },
    },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
}

function winnerRowBg(winner: string): CellStyle['fill'] {
  if (winner === 'A') return { fgColor: { rgb: COLORS.aWinBg } };
  if (winner === 'B') return { fgColor: { rgb: COLORS.bWinBg } };
  if (winner === 'tie') return { fgColor: { rgb: COLORS.tieBg } };
  return undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setCell(ws: XLSX.WorkSheet, r: number, c: number, value: unknown, style: CellStyle) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { v: value ?? '', t: typeof value === 'number' ? 'n' : 's', s: style };
}

function setRow(ws: XLSX.WorkSheet, r: number, values: unknown[], styles: CellStyle[]) {
  values.forEach((v, c) => setCell(ws, r, c, v, styles[c] ?? cellBase));
}

// ─── Results Sheet ───────────────────────────────────────────────────────────

function buildResultsSheet(config: BatchConfig, items: BatchItem[]): XLSX.WorkSheet {
  const includeTranscripts = config.includeFullTranscripts !== false;
  const headers = [
    '#', 'File Name', 'Source URL',
    'Orig Duration (s)', 'Trimmed', 'Used Duration (s)', 'Trim Error',
    'Status',
    'A Service', 'A Model', 'A Language',
    'B Service', 'B Model', 'B Language',
    'A Time (s)', 'A Words', 'A Error',
    'B Time (s)', 'B Words', 'B Error',
    'Winner', 'Winner Label', 'Score A', 'Score B',
    'Reasoning A', 'Reasoning B',
    'Verbatim A', 'Verbatim B',
    'Punctuation A', 'Punctuation B',
    'Completeness A', 'Completeness B',
    'Proper Nouns A', 'Proper Nouns B',
    'Readability A', 'Readability B',
    'Judge Error',
    ...(includeTranscripts ? ['Transcript A', 'Transcript B'] : []),
  ];

  const labelA = slotLabel(config.slotA);
  const labelB = slotLabel(config.slotB);
  const ws = XLSX.utils.aoa_to_sheet([headers]);

  // Style header row
  headers.forEach((_, c) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  });

  // Data rows
  items.forEach((item, rowIdx) => {
    const r = rowIdx + 1;
    const v = item.verdict;
    const factors = v?.factors ?? [];
    const fb = (name: string) => factors.find(f => f.factor === name);
    const wordCountA = item.slotATranscript ? item.slotATranscript.trim().split(/\s+/).length : 0;
    const wordCountB = item.slotBTranscript ? item.slotBTranscript.trim().split(/\s+/).length : 0;
    const winLabel = v ? (v.winner === 'tie' ? 'Tie' : v.winner === 'A' ? labelA : labelB) : '';
    const rowBg = v ? winnerRowBg(v.winner) : undefined;

    const baseRow: CellStyle = { ...cellBase, fill: rowBg };
    const centeredRow: CellStyle = { ...baseRow, alignment: { horizontal: 'center', vertical: 'center' } };
    const errorStyle: CellStyle = { ...baseRow, font: { ...cellBase.font, color: { rgb: COLORS.redFg } } };

    const values: unknown[] = [
      item.index + 1, item.fileName, item.sourceUrl ?? '',
      item.originalDuration != null ? Number(item.originalDuration.toFixed(1)) : '',
      item.wasTrimmed != null ? (item.wasTrimmed ? 'Yes' : 'No') : '',
      item.trimmedDuration != null ? Number(item.trimmedDuration.toFixed(1)) : '',
      item.trimError ?? '',
      item.status,
      SERVICE_META[config.slotA.service].label,
      MODEL_OPTIONS[config.slotA.service].find(m => m.value === config.slotA.model)?.label ?? config.slotA.model,
      config.slotA.language,
      SERVICE_META[config.slotB.service].label,
      MODEL_OPTIONS[config.slotB.service].find(m => m.value === config.slotB.model)?.label ?? config.slotB.model,
      config.slotB.language,
      item.slotATimeMs ? Number((item.slotATimeMs / 1000).toFixed(2)) : '',
      wordCountA || '', item.slotAError ?? '',
      item.slotBTimeMs ? Number((item.slotBTimeMs / 1000).toFixed(2)) : '',
      wordCountB || '', item.slotBError ?? '',
      v?.winner ?? '', winLabel, v?.scoreA ?? '', v?.scoreB ?? '',
      v?.reasoningA ?? '', v?.reasoningB ?? '',
      fb('Verbatim Accuracy')?.scoreA ?? '', fb('Verbatim Accuracy')?.scoreB ?? '',
      fb('Punctuation & Formatting')?.scoreA ?? '', fb('Punctuation & Formatting')?.scoreB ?? '',
      fb('Completeness')?.scoreA ?? '', fb('Completeness')?.scoreB ?? '',
      fb('Proper Noun Handling')?.scoreA ?? '', fb('Proper Noun Handling')?.scoreB ?? '',
      fb('Readability & Naturalness')?.scoreA ?? '', fb('Readability & Naturalness')?.scoreB ?? '',
      item.judgeError ?? '',
      ...(includeTranscripts ? [item.slotATranscript ?? '', item.slotBTranscript ?? ''] : []),
    ];

    // Column-specific styles
    const styles: CellStyle[] = [
      centeredRow,               // #
      baseRow,                   // File Name
      { ...baseRow, font: { ...cellBase.font, color: { rgb: COLORS.mutedFg } } }, // URL
      centeredRow,               // Orig Duration
      centeredRow,               // Trimmed
      centeredRow,               // Used Duration
      errorStyle,                // Trim Error
      statusStyle(item.status),  // Status
      baseRow, baseRow, centeredRow,  // A config
      baseRow, baseRow, centeredRow,  // B config
      centeredRow, centeredRow,  // A time, words
      errorStyle,                // A error
      centeredRow, centeredRow,  // B time, words
      errorStyle,                // B error
      { ...centeredRow, font: { bold: true, sz: 11, name: 'Calibri' } },  // Winner
      centeredRow,               // Winner label
      { ...scoreStyle(v?.scoreA ?? '', true), fill: rowBg },    // Score A
      { ...scoreStyle(v?.scoreB ?? '', false), fill: rowBg },   // Score B
      { ...baseRow, alignment: { wrapText: true, vertical: 'center' } },  // Reasoning A
      { ...baseRow, alignment: { wrapText: true, vertical: 'center' } },  // Reasoning B
      // Factor scores (A/B alternating)
      { ...scoreStyle(fb('Verbatim Accuracy')?.scoreA ?? '', true), fill: rowBg },
      { ...scoreStyle(fb('Verbatim Accuracy')?.scoreB ?? '', false), fill: rowBg },
      { ...scoreStyle(fb('Punctuation & Formatting')?.scoreA ?? '', true), fill: rowBg },
      { ...scoreStyle(fb('Punctuation & Formatting')?.scoreB ?? '', false), fill: rowBg },
      { ...scoreStyle(fb('Completeness')?.scoreA ?? '', true), fill: rowBg },
      { ...scoreStyle(fb('Completeness')?.scoreB ?? '', false), fill: rowBg },
      { ...scoreStyle(fb('Proper Noun Handling')?.scoreA ?? '', true), fill: rowBg },
      { ...scoreStyle(fb('Proper Noun Handling')?.scoreB ?? '', false), fill: rowBg },
      { ...scoreStyle(fb('Readability & Naturalness')?.scoreA ?? '', true), fill: rowBg },
      { ...scoreStyle(fb('Readability & Naturalness')?.scoreB ?? '', false), fill: rowBg },
      errorStyle,                // Judge error
      ...(includeTranscripts ? [
        { ...baseRow, alignment: { wrapText: true, vertical: 'center' } },  // Transcript A
        { ...baseRow, alignment: { wrapText: true, vertical: 'center' } },  // Transcript B
      ] : []),
    ];

    setRow(ws, r, values, styles);
  });

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 40 }, { wch: 35 },
    { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 22 },
    { wch: 8 },
    { wch: 12 }, { wch: 22 }, { wch: 8 },
    { wch: 12 }, { wch: 22 }, { wch: 8 },
    { wch: 10 }, { wch: 8 }, { wch: 25 },
    { wch: 10 }, { wch: 8 }, { wch: 25 },
    { wch: 8 }, { wch: 20 }, { wch: 8 }, { wch: 8 },
    { wch: 40 }, { wch: 40 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 },
    { wch: 25 },
    ...(includeTranscripts ? [{ wch: 50 }, { wch: 50 }] : []),
  ];

  // Set range
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: items.length, c: headers.length - 1 } });
  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  return ws;
}

// ─── Summary Sheet ───────────────────────────────────────────────────────────

function buildSummarySheet(config: BatchConfig, items: BatchItem[]): XLSX.WorkSheet {
  const labelA = slotLabel(config.slotA);
  const labelB = slotLabel(config.slotB);

  const completed = items.filter(i => i.status === 'done');
  const withVerdict = completed.filter(i => i.verdict);
  const aWins = withVerdict.filter(i => i.verdict!.winner === 'A').length;
  const bWins = withVerdict.filter(i => i.verdict!.winner === 'B').length;
  const ties = withVerdict.filter(i => i.verdict!.winner === 'tie').length;
  const total = Math.max(withVerdict.length, 1);

  const avgScoreA = withVerdict.length > 0
    ? withVerdict.reduce((s, i) => s + (i.verdict!.scoreA ?? 0), 0) / withVerdict.length : 0;
  const avgScoreB = withVerdict.length > 0
    ? withVerdict.reduce((s, i) => s + (i.verdict!.scoreB ?? 0), 0) / withVerdict.length : 0;

  const withTimeA = completed.filter(i => i.slotATimeMs);
  const avgTimeA = withTimeA.length > 0
    ? withTimeA.reduce((s, i) => s + i.slotATimeMs!, 0) / withTimeA.length / 1000 : 0;
  const withTimeB = completed.filter(i => i.slotBTimeMs);
  const avgTimeB = withTimeB.length > 0
    ? withTimeB.reduce((s, i) => s + i.slotBTimeMs!, 0) / withTimeB.length / 1000 : 0;

  const factorNames = ['Verbatim Accuracy', 'Punctuation & Formatting', 'Completeness', 'Proper Noun Handling', 'Readability & Naturalness'];
  const factorStats = factorNames.map(name => {
    const wf = withVerdict.filter(i => i.verdict!.factors?.some(f => f.factor === name));
    if (wf.length === 0) return { name, avgA: 0, avgB: 0 };
    const avgA = wf.reduce((s, i) => s + (i.verdict!.factors.find(f => f.factor === name)?.scoreA ?? 0), 0) / wf.length;
    const avgB = wf.reduce((s, i) => s + (i.verdict!.factors.find(f => f.factor === name)?.scoreB ?? 0), 0) / wf.length;
    return { name, avgA, avgB };
  });

  // Build worksheet cell by cell for full style control
  const ws: XLSX.WorkSheet = {};
  let row = 0;

  const titleStyle: CellStyle = {
    font: { bold: true, color: { rgb: COLORS.titleFg }, sz: 16, name: 'Calibri' },
    fill: { fgColor: { rgb: COLORS.titleBg } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const sectionStyle: CellStyle = {
    font: { bold: true, color: { rgb: '1A202C' }, sz: 12, name: 'Calibri' },
    fill: { fgColor: { rgb: COLORS.sectionBg } },
    alignment: { vertical: 'center' },
    border: thinBorder,
  };
  const labelStyle: CellStyle = {
    font: { sz: 10, color: { rgb: COLORS.mutedFg }, name: 'Calibri' },
    alignment: { vertical: 'center' },
    border: thinBorder,
  };
  const valueStyle: CellStyle = {
    font: { bold: true, sz: 11, name: 'Calibri' },
    alignment: { vertical: 'center' },
    border: thinBorder,
  };
  const pctStyle: CellStyle = {
    font: { sz: 10, color: { rgb: COLORS.mutedFg }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  };

  // Title
  setCell(ws, row, 0, 'Batch Battle Report', titleStyle);
  setCell(ws, row, 1, '', titleStyle);
  setCell(ws, row, 2, '', titleStyle);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  row += 2;

  // Configuration section
  setCell(ws, row, 0, 'Configuration', sectionStyle);
  setCell(ws, row, 1, '', sectionStyle);
  setCell(ws, row, 2, '', sectionStyle);
  row++;
  const configRows: [string, string | number][] = [
    ['Batch ID', config.id],
    ['Date', new Date(config.createdAt).toLocaleString()],
    ['Slot A', labelA],
    ['Slot B', labelB],
    ['Judge', config.judgeEnabled ? `Yes (${config.judgeModel})` : 'No'],
    ['Concurrency', config.concurrency],
    ['Max Chunk Duration', `${config.maxChunkDuration ?? 30}s`],
    ['Include Transcripts', (config.includeFullTranscripts !== false) ? 'Yes' : 'No'],
  ];
  for (const [label, val] of configRows) {
    setCell(ws, row, 0, label, labelStyle);
    setCell(ws, row, 1, val, valueStyle);
    row++;
  }
  row++;

  // Results overview
  setCell(ws, row, 0, 'Overall Results', sectionStyle);
  setCell(ws, row, 1, '', sectionStyle);
  setCell(ws, row, 2, '', sectionStyle);
  row++;
  const resultsRows: [string, number | string][] = [
    ['Total Recordings', config.totalItems],
    ['Completed', completed.length],
    ['Errors', items.filter(i => i.status === 'error').length],
    ['Pending/Skipped', items.filter(i => i.status === 'pending' || i.status === 'skipped').length],
  ];
  for (const [label, val] of resultsRows) {
    setCell(ws, row, 0, label, labelStyle);
    setCell(ws, row, 1, val, valueStyle);
    row++;
  }
  row++;

  // Trim stats
  const withDuration = completed.filter(i => i.originalDuration != null);
  const trimmedItems = completed.filter(i => i.wasTrimmed);
  setCell(ws, row, 0, 'Audio Trim Stats', sectionStyle);
  setCell(ws, row, 1, '', sectionStyle);
  setCell(ws, row, 2, '', sectionStyle);
  row++;
  const trimRows: [string, string | number][] = [
    ['Files Trimmed', `${trimmedItems.length} / ${withDuration.length}`],
    ['Avg Original Duration', withDuration.length > 0
      ? `${(withDuration.reduce((s, i) => s + (i.originalDuration ?? 0), 0) / withDuration.length).toFixed(1)}s`
      : '-'],
    ['Avg Used Duration', withDuration.length > 0
      ? `${(withDuration.reduce((s, i) => s + (i.trimmedDuration ?? i.originalDuration ?? 0), 0) / withDuration.length).toFixed(1)}s`
      : '-'],
  ];
  for (const [label, val] of trimRows) {
    setCell(ws, row, 0, label, labelStyle);
    setCell(ws, row, 1, val, valueStyle);
    row++;
  }
  row++;

  // Win distribution
  setCell(ws, row, 0, 'Win Distribution', sectionStyle);
  setCell(ws, row, 1, '', sectionStyle);
  setCell(ws, row, 2, '', sectionStyle);
  row++;

  const aWinStyle: CellStyle = { ...valueStyle, font: { ...valueStyle.font, color: { rgb: COLORS.slotAFg } }, fill: { fgColor: { rgb: COLORS.aWinBg } } };
  const bWinStyle: CellStyle = { ...valueStyle, font: { ...valueStyle.font, color: { rgb: COLORS.slotBFg } }, fill: { fgColor: { rgb: COLORS.bWinBg } } };

  setCell(ws, row, 0, `${labelA} Wins`, labelStyle);
  setCell(ws, row, 1, aWins, aWinStyle);
  setCell(ws, row, 2, `${((aWins / total) * 100).toFixed(1)}%`, pctStyle);
  row++;
  setCell(ws, row, 0, `${labelB} Wins`, labelStyle);
  setCell(ws, row, 1, bWins, bWinStyle);
  setCell(ws, row, 2, `${((bWins / total) * 100).toFixed(1)}%`, pctStyle);
  row++;
  setCell(ws, row, 0, 'Ties', labelStyle);
  setCell(ws, row, 1, ties, valueStyle);
  setCell(ws, row, 2, `${((ties / total) * 100).toFixed(1)}%`, pctStyle);
  row += 2;

  // Average scores
  setCell(ws, row, 0, 'Average Scores', sectionStyle);
  setCell(ws, row, 1, '', sectionStyle);
  setCell(ws, row, 2, '', sectionStyle);
  row++;
  setCell(ws, row, 0, `${labelA} Avg`, labelStyle);
  setCell(ws, row, 1, Number(avgScoreA.toFixed(2)), { ...valueStyle, font: { ...valueStyle.font, color: { rgb: COLORS.slotAFg } } });
  setCell(ws, row, 2, '/10', pctStyle);
  row++;
  setCell(ws, row, 0, `${labelB} Avg`, labelStyle);
  setCell(ws, row, 1, Number(avgScoreB.toFixed(2)), { ...valueStyle, font: { ...valueStyle.font, color: { rgb: COLORS.slotBFg } } });
  setCell(ws, row, 2, '/10', pctStyle);
  row += 2;

  // Average times
  setCell(ws, row, 0, 'Average Transcription Time', sectionStyle);
  setCell(ws, row, 1, '', sectionStyle);
  setCell(ws, row, 2, '', sectionStyle);
  row++;
  setCell(ws, row, 0, `${labelA} Avg`, labelStyle);
  setCell(ws, row, 1, `${avgTimeA.toFixed(2)}s`, valueStyle);
  row++;
  setCell(ws, row, 0, `${labelB} Avg`, labelStyle);
  setCell(ws, row, 1, `${avgTimeB.toFixed(2)}s`, valueStyle);
  row += 2;

  // Per-factor breakdown
  setCell(ws, row, 0, 'Per-Factor Breakdown', sectionStyle);
  setCell(ws, row, 1, '', sectionStyle);
  setCell(ws, row, 2, '', sectionStyle);
  row++;
  // Sub-header
  setCell(ws, row, 0, 'Factor', { ...headerStyle, alignment: { horizontal: 'left', vertical: 'center' } });
  setCell(ws, row, 1, `${labelA} Avg`, headerStyle);
  setCell(ws, row, 2, `${labelB} Avg`, headerStyle);
  row++;
  for (const f of factorStats) {
    setCell(ws, row, 0, f.name, labelStyle);
    setCell(ws, row, 1, Number(f.avgA.toFixed(2)), scoreStyle(f.avgA, true));
    setCell(ws, row, 2, Number(f.avgB.toFixed(2)), scoreStyle(f.avgB, false));
    row++;
  }

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: 2 } });
  ws['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 18 }];

  return ws;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateBatchReport(config: BatchConfig, items: BatchItem[]): void {
  const wb = XLSX.utils.book_new();

  const ws1 = buildResultsSheet(config, items);
  XLSX.utils.book_append_sheet(wb, ws1, 'Results');

  const ws2 = buildSummarySheet(config, items);
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `batch-battle-report-${timestamp}.xlsx`);
}
