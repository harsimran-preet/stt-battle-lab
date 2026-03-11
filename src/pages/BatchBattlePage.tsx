import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Layers, Loader2, Upload, FileSpreadsheet, Archive, AlertCircle,
  Play, Pause, RotateCcw, Download, CheckCircle2, Clock, Trophy,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BattleSlotConfig, STTService } from '@/types';
import { DEEPGRAM_LANGUAGES, SONIOX_LANGUAGES, ORISTT_LANGUAGES } from '@/types';
import { SERVICE_META, MODEL_OPTIONS, DEFAULT_SLOT_A, DEFAULT_SLOT_B, slotLabel } from '@/lib/battle-utils';
import { parseZipInput, parseExcelInput } from '@/lib/batch-input';
import { generateBatchReport } from '@/lib/batch-report';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { LanguageCombobox } from '@/components/LanguageCombobox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { AudioSource } from '@/types/batch';

// ─── Slot Config Panel (shared) ──────────────────────────────────────────────

function SlotConfigPanel({
  side, config, onChange, disabled,
}: {
  side: 'A' | 'B';
  config: BattleSlotConfig;
  onChange: (c: BattleSlotConfig) => void;
  disabled: boolean;
}) {
  const meta = SERVICE_META[config.service];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white',
          side === 'A' ? 'bg-blue-500' : 'bg-orange-500',
        )}>{side}</span>
        <Badge variant="outline" className={cn('text-xs', meta.badgeClass)}>{meta.label}</Badge>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Service</Label>
        <Select
          value={config.service}
          onValueChange={v => {
            const svc = v as STTService;
            const model = MODEL_OPTIONS[svc][0].value;
            const language = svc === 'oristt'
              ? (ORISTT_LANGUAGES[model]?.[0]?.value ?? 'hi')
              : config.service === 'oristt' ? 'en' : config.language;
            onChange({ ...config, service: svc, model, language });
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(SERVICE_META).map(([v, m]) => (
              <SelectItem key={v} value={v}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Model</Label>
        <Select
          value={config.model}
          onValueChange={v => {
            const updated = { ...config, model: v };
            if (config.service === 'oristt') {
              const langs = ORISTT_LANGUAGES[v];
              if (langs && !langs.some(l => l.value === config.language)) {
                updated.language = langs[0].value;
              }
            }
            onChange(updated);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS[config.service].map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {config.service === 'deepgram' && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Language</Label>
          <LanguageCombobox value={config.language} onChange={v => onChange({ ...config, language: v })} disabled={disabled} options={DEEPGRAM_LANGUAGES} placeholder="Search languages\u2026" />
        </div>
      )}
      {config.service === 'soniox' && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Language</Label>
          <LanguageCombobox value={config.language} onChange={v => onChange({ ...config, language: v })} disabled={disabled} options={SONIOX_LANGUAGES} placeholder="Search languages\u2026" />
        </div>
      )}
      {config.service === 'oristt' && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Language</Label>
          <LanguageCombobox value={config.language} onChange={v => onChange({ ...config, language: v })} disabled={disabled} options={ORISTT_LANGUAGES[config.model] ?? ORISTT_LANGUAGES['ori-indic-prime-v1']} placeholder="Search languages\u2026" />
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>;
    case 'running':
      return <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 animate-pulse">Running</Badge>;
    case 'done':
      return <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">Done</Badge>;
    case 'error':
      return <Badge variant="outline" className="text-[10px] text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">Error</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

// ─── Virtualized Progress Table ──────────────────────────────────────────────

const ROW_HEIGHT = 44;
const TABLE_HEIGHT = 440;
const BUFFER_ROWS = 5;

function BatchProgressTable({
  items,
  filter,
}: {
  items: { index: number; fileName: string; sourceUrl?: string; status: string; slotATimeMs: number | null; slotBTimeMs: number | null; verdict: { winner: string; scoreA: number; scoreB: number } | null; slotAError: string | null; slotBError: string | null }[];
  filter: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(i => i.status === filter);
  }, [items, filter]);

  const totalHeight = filtered.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
  const endIndex = Math.min(filtered.length, Math.ceil((scrollTop + TABLE_HEIGHT) / ROW_HEIGHT) + BUFFER_ROWS);
  const visibleItems = filtered.slice(startIndex, endIndex);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[50px_1fr_80px_80px_80px_70px_70px] gap-2 px-3 py-2 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b">
        <span>#</span>
        <span>File</span>
        <span>Status</span>
        <span>A Time</span>
        <span>B Time</span>
        <span>Score A</span>
        <span>Score B</span>
      </div>

      {/* Virtualized body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto"
        style={{ height: Math.min(TABLE_HEIGHT, totalHeight + 2) }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((item) => {
            const actualIndex = filtered.indexOf(item);
            return (
              <div
                key={item.index}
                className={cn(
                  'grid grid-cols-[50px_1fr_80px_80px_80px_70px_70px] gap-2 px-3 items-center border-b border-border/50 text-sm',
                  item.status === 'error' && 'bg-red-50/50 dark:bg-red-950/10',
                  item.status === 'running' && 'bg-blue-50/50 dark:bg-blue-950/10',
                )}
                style={{
                  height: ROW_HEIGHT,
                  position: 'absolute',
                  top: actualIndex * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                }}
              >
                <span className="text-xs text-muted-foreground tabular-nums">{item.index + 1}</span>
                <span className="text-xs truncate" title={item.sourceUrl || item.fileName}>{item.fileName}</span>
                <StatusBadge status={item.status} />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {item.slotATimeMs ? `${(item.slotATimeMs / 1000).toFixed(1)}s` : item.slotAError ? 'Err' : '-'}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {item.slotBTimeMs ? `${(item.slotBTimeMs / 1000).toFixed(1)}s` : item.slotBError ? 'Err' : '-'}
                </span>
                <span className={cn('text-xs font-semibold tabular-nums', item.verdict && scoreColor(item.verdict.scoreA))}>
                  {item.verdict ? `${item.verdict.scoreA}/10` : '-'}
                </span>
                <span className={cn('text-xs font-semibold tabular-nums', item.verdict && scoreColor(item.verdict.scoreB))}>
                  {item.verdict ? `${item.verdict.scoreB}/10` : '-'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          No items match this filter
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 8) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 6) return 'text-blue-600 dark:text-blue-400';
  if (score >= 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BatchBattlePage() {
  const [slotAConfig, setSlotAConfig] = useState<BattleSlotConfig>(DEFAULT_SLOT_A);
  const [slotBConfig, setSlotBConfig] = useState<BattleSlotConfig>(DEFAULT_SLOT_B);
  const [judgeEnabled, setJudgeEnabled] = useState(true);
  const [judgeModel, setJudgeModel] = useState('gemini-2.5-flash');
  const [concurrency, setConcurrency] = useState(2);
  const [sources, setSources] = useState<AudioSource[]>([]);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [tableFilter, setTableFilter] = useState('all');
  const [showStats, setShowStats] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    batchState, items, progress, config,
    recoveryBatch, startBatch, pause, reset, dismissRecovery,
  } = useBatchProcessor();

  const isRunning = batchState === 'running';
  const isActive = batchState === 'running' || batchState === 'paused';

  // Beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (batchState !== 'running') return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [batchState]);

  const handleFileUpload = async (file: File) => {
    setInputFile(file);
    setParsing(true);
    try {
      const name = file.name.toLowerCase();
      let parsed: AudioSource[];
      if (name.endsWith('.zip')) {
        parsed = await parseZipInput(file);
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        parsed = await parseExcelInput(file);
      } else {
        throw new Error('Please upload a .zip or .xlsx file');
      }
      setSources(parsed);
      toast.success(`Found ${parsed.length} recording${parsed.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error('Failed to parse file', { description: (err as Error).message });
      setSources([]);
      setInputFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleStartBatch = async () => {
    if (sources.length === 0) return;
    try {
      await startBatch(sources, slotAConfig, slotBConfig, judgeEnabled, judgeModel, concurrency);
    } catch (err) {
      toast.error('Batch failed', { description: (err as Error).message });
    }
  };

  const handleExport = () => {
    if (!config) return;
    generateBatchReport(config, items);
    toast.success('Report downloaded');
  };

  const handleReset = async () => {
    await reset();
    setSources([]);
    setInputFile(null);
  };

  // ── Aggregate stats ──
  const completed = items.filter(i => i.status === 'done');
  const withVerdict = completed.filter(i => i.verdict);
  const aWins = withVerdict.filter(i => i.verdict!.winner === 'A').length;
  const bWins = withVerdict.filter(i => i.verdict!.winner === 'B').length;
  const ties = withVerdict.filter(i => i.verdict!.winner === 'tie').length;
  const avgScoreA = withVerdict.length > 0
    ? (withVerdict.reduce((s, i) => s + i.verdict!.scoreA, 0) / withVerdict.length).toFixed(1)
    : '-';
  const avgScoreB = withVerdict.length > 0
    ? (withVerdict.reduce((s, i) => s + i.verdict!.scoreB, 0) / withVerdict.length).toFixed(1)
    : '-';

  // ETA
  const avgTimePerItem = progress.processed > 0 && config
    ? (Date.now() - new Date(config.createdAt).getTime()) / progress.processed
    : 0;
  const remaining = progress.total - progress.processed;
  const etaMs = avgTimePerItem * remaining;
  const etaMinutes = Math.ceil(etaMs / 60000);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Batch Battle
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Battle two STT services across many recordings at once
        </p>
      </div>

      {/* Recovery banner */}
      {recoveryBatch && batchState === 'idle' && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  A previous batch ({recoveryBatch.items.filter(i => i.status === 'done' || i.status === 'error').length}/{recoveryBatch.session.config.totalItems} completed) was interrupted.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Re-upload the same file to resume, or discard.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={dismissRecovery}>
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: File Upload */}
      {!isActive && batchState !== 'completed' && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Step 1 — Upload Recordings</span>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors',
                'hover:border-primary/50 hover:bg-muted/30',
                inputFile ? 'border-primary/30 bg-primary/5' : 'border-border',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.xlsx,.xls"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {parsing ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Parsing file...</p>
                </>
              ) : inputFile ? (
                <>
                  {inputFile.name.endsWith('.zip')
                    ? <Archive className="h-8 w-8 text-primary" />
                    : <FileSpreadsheet className="h-8 w-8 text-primary" />
                  }
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">{inputFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sources.length} recording{sources.length === 1 ? '' : 's'} found
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSources([]); setInputFile(null); }}>
                    Change File
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Drop a <span className="text-primary font-semibold">.zip</span> or{' '}
                      <span className="text-primary font-semibold">.xlsx</span> file here
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ZIP with audio files, or Excel with a "recordings" column containing MP3 URLs
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Slot Configs */}
      {!isActive && batchState !== 'completed' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Step 2a</span>
              <SlotConfigPanel side="A" config={slotAConfig} onChange={setSlotAConfig} disabled={isRunning} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Step 2b</span>
              <SlotConfigPanel side="B" config={slotBConfig} onChange={setSlotBConfig} disabled={isRunning} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Judge + Concurrency + Start */}
      {!isActive && batchState !== 'completed' && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Step 3 — Settings & Run</span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch id="batch-judge-toggle" checked={judgeEnabled} onCheckedChange={setJudgeEnabled} />
                  <Label className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer" htmlFor="batch-judge-toggle">
                    Gemini Judge
                  </Label>
                </div>
                {judgeEnabled && (
                  <div className="w-48">
                    <Select value={judgeModel} onValueChange={setJudgeModel}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                        <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Concurrency</Label>
                  <Select value={String(concurrency)} onValueChange={v => setConcurrency(Number(v))}>
                    <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="lg"
                className="gap-2"
                onClick={handleStartBatch}
                disabled={sources.length === 0 || parsing}
              >
                <Play className="h-4 w-4" />
                Start Batch ({sources.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Panel */}
      {(isActive || batchState === 'completed') && (
        <div className="space-y-4">
          {/* Progress header */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {batchState === 'paused' && <Pause className="h-4 w-4 text-amber-500" />}
                  {batchState === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  <span className="text-sm font-medium text-foreground">
                    {batchState === 'running' && 'Processing...'}
                    {batchState === 'paused' && 'Paused'}
                    {batchState === 'completed' && 'Completed'}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {progress.processed}/{progress.total}
                  </span>
                  {progress.errors > 0 && (
                    <Badge variant="outline" className="text-[10px] text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">
                      {progress.errors} error{progress.errors === 1 ? '' : 's'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isRunning && etaMinutes > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      ~{etaMinutes}m remaining
                    </span>
                  )}
                  {isRunning && (
                    <Button variant="outline" size="sm" onClick={pause} className="gap-1.5">
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </Button>
                  )}
                  {batchState === 'paused' && (
                    <Button size="sm" onClick={handleStartBatch} className="gap-1.5">
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </Button>
                  )}
                  {(batchState === 'completed' || batchState === 'paused') && (
                    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      Export Report
                    </Button>
                  )}
                  {(batchState === 'completed' || batchState === 'paused') && (
                    <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      New Batch
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    batchState === 'completed' ? 'bg-emerald-500' : 'bg-primary',
                  )}
                  style={{ width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` }}
                />
              </div>

              {/* Config summary */}
              {config && (
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">{slotLabel(config.slotA)}</Badge>
                  <span>vs</span>
                  <Badge variant="secondary" className="text-[10px]">{slotLabel(config.slotB)}</Badge>
                  {config.judgeEnabled && (
                    <Badge variant="secondary" className="text-[10px]">Judge: {config.judgeModel}</Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">Concurrency: {config.concurrency}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          {withVerdict.length > 0 && (
            <Card>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowStats(s => !s)}>
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Live Results
                  </div>
                  {showStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {showStats && (
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">A Wins</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">{aWins}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">B Wins</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400 tabular-nums">{bWins}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Ties</p>
                      <p className="text-lg font-bold text-muted-foreground tabular-nums">{ties}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Avg Score A</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">{avgScoreA}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Avg Score B</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400 tabular-nums">{avgScoreB}</p>
                    </div>
                  </div>

                  {/* Win rate bar */}
                  {withVerdict.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>A: {((aWins / withVerdict.length) * 100).toFixed(0)}%</span>
                        <span>B: {((bWins / withVerdict.length) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex h-3 w-full overflow-hidden rounded-full">
                        <div className="bg-blue-500 transition-all" style={{ width: `${(aWins / withVerdict.length) * 100}%` }} />
                        <div className="bg-gray-300 dark:bg-gray-600 transition-all" style={{ width: `${(ties / withVerdict.length) * 100}%` }} />
                        <div className="bg-orange-500 transition-all" style={{ width: `${(bWins / withVerdict.length) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Filter tabs + Table */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              {['all', 'running', 'done', 'error', 'pending'].map(f => (
                <Button
                  key={f}
                  variant={tableFilter === f ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 px-2.5 capitalize"
                  onClick={() => setTableFilter(f)}
                >
                  {f === 'all' ? `All (${items.length})` :
                   f === 'done' ? `Done (${items.filter(i => i.status === 'done').length})` :
                   f === 'error' ? `Error (${items.filter(i => i.status === 'error').length})` :
                   f === 'running' ? `Running (${items.filter(i => i.status === 'running').length})` :
                   `Pending (${items.filter(i => i.status === 'pending').length})`}
                </Button>
              ))}
            </div>
            <BatchProgressTable items={items} filter={tableFilter} />
          </div>
        </div>
      )}
    </div>
  );
}
