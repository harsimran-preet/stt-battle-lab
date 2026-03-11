import * as XLSX from 'xlsx';
import type { BatchItem, BatchConfig } from '@/types/batch';
import { slotLabel, SERVICE_META, MODEL_OPTIONS } from '@/lib/battle-utils';

export function generateBatchReport(config: BatchConfig, items: BatchItem[]): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Results (one row per recording) ──
  const resultHeaders = [
    '#',
    'File Name',
    'Source URL',
    'Status',
    'Slot A Service',
    'Slot A Model',
    'Slot A Language',
    'Slot B Service',
    'Slot B Model',
    'Slot B Language',
    'Slot A Time (s)',
    'Slot A Word Count',
    'Slot A Error',
    'Slot B Time (s)',
    'Slot B Word Count',
    'Slot B Error',
    'Winner',
    'Winner Label',
    'Overall Score A',
    'Overall Score B',
    'Reasoning A',
    'Reasoning B',
    // Dynamic factor columns
    'Verbatim Accuracy A', 'Verbatim Accuracy B',
    'Punctuation & Formatting A', 'Punctuation & Formatting B',
    'Completeness A', 'Completeness B',
    'Proper Noun Handling A', 'Proper Noun Handling B',
    'Readability & Naturalness A', 'Readability & Naturalness B',
    'Judge Error',
    'Slot A Transcript',
    'Slot B Transcript',
  ];

  const labelA = slotLabel(config.slotA);
  const labelB = slotLabel(config.slotB);

  const resultData = items.map(item => {
    const wordCountA = item.slotATranscript ? item.slotATranscript.trim().split(/\s+/).length : 0;
    const wordCountB = item.slotBTranscript ? item.slotBTranscript.trim().split(/\s+/).length : 0;
    const v = item.verdict;
    const factors = v?.factors ?? [];
    const factorByName = (name: string) => factors.find(f => f.factor === name);

    const winnerLabel = v
      ? (v.winner === 'tie' ? 'Tie' : v.winner === 'A' ? labelA : labelB)
      : null;

    return [
      item.index + 1,
      item.fileName,
      item.sourceUrl ?? '',
      item.status,
      SERVICE_META[config.slotA.service].label,
      MODEL_OPTIONS[config.slotA.service].find(m => m.value === config.slotA.model)?.label ?? config.slotA.model,
      config.slotA.language,
      SERVICE_META[config.slotB.service].label,
      MODEL_OPTIONS[config.slotB.service].find(m => m.value === config.slotB.model)?.label ?? config.slotB.model,
      config.slotB.language,
      item.slotATimeMs ? Number((item.slotATimeMs / 1000).toFixed(2)) : null,
      wordCountA,
      item.slotAError ?? '',
      item.slotBTimeMs ? Number((item.slotBTimeMs / 1000).toFixed(2)) : null,
      wordCountB,
      item.slotBError ?? '',
      v?.winner ?? '',
      winnerLabel ?? '',
      v?.scoreA ?? '',
      v?.scoreB ?? '',
      v?.reasoningA ?? '',
      v?.reasoningB ?? '',
      factorByName('Verbatim Accuracy')?.scoreA ?? '',
      factorByName('Verbatim Accuracy')?.scoreB ?? '',
      factorByName('Punctuation & Formatting')?.scoreA ?? '',
      factorByName('Punctuation & Formatting')?.scoreB ?? '',
      factorByName('Completeness')?.scoreA ?? '',
      factorByName('Completeness')?.scoreB ?? '',
      factorByName('Proper Noun Handling')?.scoreA ?? '',
      factorByName('Proper Noun Handling')?.scoreB ?? '',
      factorByName('Readability & Naturalness')?.scoreA ?? '',
      factorByName('Readability & Naturalness')?.scoreB ?? '',
      item.judgeError ?? '',
      item.slotATranscript ?? '',
      item.slotBTranscript ?? '',
    ];
  });

  const ws1 = XLSX.utils.aoa_to_sheet([resultHeaders, ...resultData]);
  // Set column widths
  ws1['!cols'] = resultHeaders.map((h) => ({ wch: Math.max(h.length, 12) }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Results');

  // ── Sheet 2: Aggregate Stats ──
  const completed = items.filter(i => i.status === 'done');
  const withVerdict = completed.filter(i => i.verdict);
  const aWins = withVerdict.filter(i => i.verdict!.winner === 'A').length;
  const bWins = withVerdict.filter(i => i.verdict!.winner === 'B').length;
  const ties = withVerdict.filter(i => i.verdict!.winner === 'tie').length;

  const avgScoreA = withVerdict.length > 0
    ? withVerdict.reduce((s, i) => s + (i.verdict!.scoreA ?? 0), 0) / withVerdict.length
    : 0;
  const avgScoreB = withVerdict.length > 0
    ? withVerdict.reduce((s, i) => s + (i.verdict!.scoreB ?? 0), 0) / withVerdict.length
    : 0;

  const avgTimeA = completed.filter(i => i.slotATimeMs).length > 0
    ? completed.filter(i => i.slotATimeMs).reduce((s, i) => s + i.slotATimeMs!, 0) / completed.filter(i => i.slotATimeMs).length / 1000
    : 0;
  const avgTimeB = completed.filter(i => i.slotBTimeMs).length > 0
    ? completed.filter(i => i.slotBTimeMs).reduce((s, i) => s + i.slotBTimeMs!, 0) / completed.filter(i => i.slotBTimeMs).length / 1000
    : 0;

  // Per-factor averages
  const factorNames = ['Verbatim Accuracy', 'Punctuation & Formatting', 'Completeness', 'Proper Noun Handling', 'Readability & Naturalness'];
  const factorStats = factorNames.map(name => {
    const withFactor = withVerdict.filter(i => i.verdict!.factors?.some(f => f.factor === name));
    if (withFactor.length === 0) return { name, avgA: 0, avgB: 0 };
    const avgA = withFactor.reduce((s, i) => s + (i.verdict!.factors.find(f => f.factor === name)?.scoreA ?? 0), 0) / withFactor.length;
    const avgB = withFactor.reduce((s, i) => s + (i.verdict!.factors.find(f => f.factor === name)?.scoreB ?? 0), 0) / withFactor.length;
    return { name, avgA, avgB };
  });

  const statsData = [
    ['Batch Report Summary'],
    [],
    ['Configuration'],
    ['Batch ID', config.id],
    ['Date', config.createdAt],
    ['Slot A', labelA],
    ['Slot B', labelB],
    ['Judge Enabled', config.judgeEnabled ? 'Yes' : 'No'],
    ['Judge Model', config.judgeModel],
    ['Concurrency', config.concurrency],
    [],
    ['Overall Results'],
    ['Total Recordings', config.totalItems],
    ['Completed', completed.length],
    ['Errors', items.filter(i => i.status === 'error').length],
    ['Skipped', items.filter(i => i.status === 'pending' || i.status === 'skipped').length],
    [],
    ['Win Distribution'],
    [`${labelA} Wins`, aWins, `${((aWins / Math.max(withVerdict.length, 1)) * 100).toFixed(1)}%`],
    [`${labelB} Wins`, bWins, `${((bWins / Math.max(withVerdict.length, 1)) * 100).toFixed(1)}%`],
    ['Ties', ties, `${((ties / Math.max(withVerdict.length, 1)) * 100).toFixed(1)}%`],
    [],
    ['Average Scores'],
    [`${labelA} Avg Score`, Number(avgScoreA.toFixed(2))],
    [`${labelB} Avg Score`, Number(avgScoreB.toFixed(2))],
    [],
    ['Average Transcription Time (seconds)'],
    [`${labelA} Avg Time`, Number(avgTimeA.toFixed(2))],
    [`${labelB} Avg Time`, Number(avgTimeB.toFixed(2))],
    [],
    ['Per-Factor Average Scores'],
    ['Factor', `${labelA} Avg`, `${labelB} Avg`],
    ...factorStats.map(f => [f.name, Number(f.avgA.toFixed(2)), Number(f.avgB.toFixed(2))]),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(statsData);
  ws2['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  // ── Download ──
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `batch-battle-report-${timestamp}.xlsx`);
}
