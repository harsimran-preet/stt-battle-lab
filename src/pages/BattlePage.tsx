import { useState, useRef, useEffect } from 'react';
import {
  Swords, Loader2, Trophy, Minus, AlertCircle, Clock, FileText, RotateCcw, Languages,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  STTService, BattleSlotConfig, BattleSlotResult, BattleVerdict,
  BattleSlotConfig as SlotCfg,
} from '@/types';
import { DEEPGRAM_MODELS, DEEPGRAM_LANGUAGES, SONIOX_MODELS, GEMINI_STT_MODELS, ORISTT_MODELS, ORISTT_LANGUAGES } from '@/types';
import { transcribeFile } from '@/services/deepgram';
import { transcribeWithSoniox } from '@/services/soniox';
import { transcribeWithGemini, judgeTranscripts, translateText } from '@/services/gemini';
import { transcribeWithOriSTT } from '@/services/oristt';
import { FileUploadZone } from '@/components/FileUploadZone';
import { AudioPlayer, type AudioPlayerHandle } from '@/components/AudioPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_META: Record<STTService, { label: string; color: string; badgeClass: string }> = {
  deepgram: {
    label: 'Deepgram',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  },
  soniox: {
    label: 'Soniox',
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  },
  gemini: {
    label: 'Gemini STT',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
  },
  oristt: {
    label: 'OriSTT',
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  },
};

const MODEL_OPTIONS: Record<STTService, readonly { value: string; label: string }[]> = {
  deepgram: DEEPGRAM_MODELS,
  soniox: SONIOX_MODELS,
  gemini: GEMINI_STT_MODELS,
  oristt: ORISTT_MODELS,
};

const DEFAULT_SLOT_A: BattleSlotConfig = { service: 'deepgram', model: 'nova-3', language: 'en' };
const DEFAULT_SLOT_B: BattleSlotConfig = { service: 'soniox', model: 'stt-async-v4', language: 'en' };

const IDLE_RESULT: BattleSlotResult = { status: 'idle', transcript: null, timeTakenMs: null, error: null };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slotLabel(cfg: SlotCfg): string {
  const svc = SERVICE_META[cfg.service].label;
  const mdl = MODEL_OPTIONS[cfg.service].find(m => m.value === cfg.model)?.label ?? cfg.model;
  return `${svc} · ${mdl}`;
}

async function runSlot(
  file: File,
  cfg: BattleSlotConfig,
  onChunk: (text: string) => void,
  onStatus: (msg: string) => void,
): Promise<{ transcript: string }> {
  switch (cfg.service) {
    case 'deepgram': {
      onStatus('Transcribing…');
      const result = await transcribeFile(file, cfg.model, cfg.language, false);
      const transcript = result.rawTranscript;
      onChunk(transcript);
      return { transcript };
    }
    case 'soniox':
      return transcribeWithSoniox(file, cfg.model, onStatus);
    case 'gemini':
      return transcribeWithGemini(file, cfg.model, onChunk);
    case 'oristt': {
      onStatus('Transcribing…');
      const result = await transcribeWithOriSTT(file, cfg.model, cfg.language);
      onChunk(result.transcript);
      return result;
    }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectField({
  value, onChange, disabled, options,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50 text-foreground',
        )}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

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
        )}>
          {side}
        </span>
        <Badge variant="outline" className={cn('text-xs', meta.badgeClass)}>
          {meta.label}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Service</Label>
        <SelectField
          value={config.service}
          onChange={v => {
            const svc = v as STTService;
            const model = MODEL_OPTIONS[svc][0].value;
            const language = svc === 'oristt'
              ? (ORISTT_LANGUAGES[model]?.[0]?.value ?? 'hi')
              : config.service === 'oristt' ? 'en' : config.language;
            onChange({ ...config, service: svc, model, language });
          }}
          disabled={disabled}
          options={Object.entries(SERVICE_META).map(([v, m]) => ({ value: v, label: m.label }))}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Model</Label>
        <SelectField
          value={config.model}
          onChange={v => {
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
          options={MODEL_OPTIONS[config.service]}
        />
      </div>

      {config.service === 'deepgram' && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Language</Label>
          <div className="relative">
            <input
              list={`lang-list-${side}`}
              value={config.language}
              onChange={e => onChange({ ...config, language: e.target.value.trim() })}
              disabled={disabled}
              placeholder="e.g. en, es, fr…"
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50 text-foreground placeholder:text-muted-foreground',
              )}
            />
            <datalist id={`lang-list-${side}`}>
              {DEEPGRAM_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </datalist>
          </div>
        </div>
      )}

      {config.service === 'oristt' && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Language</Label>
          <SelectField
            value={config.language}
            onChange={v => onChange({ ...config, language: v })}
            disabled={disabled}
            options={ORISTT_LANGUAGES[config.model] ?? ORISTT_LANGUAGES['ori-indic-prime-v1']}
          />
        </div>
      )}
    </div>
  );
}

function SlotResultPanel({
  side, config, result, translation,
}: {
  side: 'A' | 'B';
  config: BattleSlotConfig;
  result: BattleSlotResult;
  translation?: string | null;
}) {
  const meta = SERVICE_META[config.service];
  const displayText = translation ?? result.transcript;

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0',
          side === 'A' ? 'bg-blue-500' : 'bg-orange-500',
        )}>
          {side}
        </span>
        <Badge variant="outline" className={cn('text-xs', meta.badgeClass)}>
          {meta.label}
        </Badge>
        <span className="text-xs text-muted-foreground truncate">{slotLabel(config)}</span>
        {translation && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Languages className="h-3 w-3" />
            Translated
          </Badge>
        )}
        {result.timeTakenMs !== null && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {(result.timeTakenMs / 1000).toFixed(2)}s
          </span>
        )}
      </div>

      {/* Body */}
      <div className={cn(
        'rounded-lg border min-h-[280px] flex flex-col',
        result.status === 'error' && 'border-destructive/50 bg-destructive/5',
        result.status === 'done' && 'bg-card',
        (result.status === 'idle' || result.status === 'running') && 'bg-muted/30',
      )}>
        {result.status === 'idle' && (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p className="text-sm text-muted-foreground">Waiting to run…</p>
          </div>
        )}

        {result.status === 'running' && !result.transcript && (
          <div className="flex flex-1 items-center justify-center gap-3 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {result.statusMsg ?? 'Transcribing…'}
            </p>
          </div>
        )}

        {result.status === 'running' && result.transcript && (
          <ScrollArea className="h-[280px]">
            <div className="p-4">
              {result.statusMsg && (
                <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {result.statusMsg}
                </p>
              )}
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {result.transcript}
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
              </p>
            </div>
          </ScrollArea>
        )}

        {result.status === 'error' && (
          <div className="flex items-start gap-3 p-4">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Failed</p>
              <p className="text-xs text-muted-foreground mt-0.5">{result.error}</p>
            </div>
          </div>
        )}

        {result.status === 'done' && (
          <ScrollArea className="h-[280px]">
            <div className="p-4 space-y-2">
              {displayText ? (
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {displayText}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">No transcript returned.</p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Word count */}
      {displayText && (result.status === 'done' || result.status === 'running') && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          {displayText.trim().split(/\s+/).length} words
          {result.status === 'running' && <span className="animate-pulse">…</span>}
        </p>
      )}
    </div>
  );
}

function VerdictCard({
  verdict, labelA, labelB, judging,
}: {
  verdict: BattleVerdict | null;
  labelA: string;
  labelB: string;
  judging: boolean;
}) {
  if (judging) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Gemini is judging…</p>
        </CardContent>
      </Card>
    );
  }

  if (!verdict) return null;

  const winnerLabel = verdict.winner === 'A' ? labelA : verdict.winner === 'B' ? labelB : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-amber-500" />
          Gemini Verdict
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Winner banner */}
        <div className={cn(
          'rounded-lg border p-4 text-center',
          verdict.winner === 'tie'
            ? 'bg-muted/50 border-border'
            : 'bg-amber-100 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700',
        )}>
          {verdict.winner === 'tie' ? (
            <div className="flex items-center justify-center gap-2">
              <Minus className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-bold text-foreground">It&apos;s a Tie</span>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Winner</p>
              <p className="text-lg font-bold text-foreground">{winnerLabel}</p>
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-3">
          {([['A', labelA, verdict.scoreA, verdict.reasoningA, 'blue'], ['B', labelB, verdict.scoreB, verdict.reasoningB, 'orange']] as const).map(
            ([side, label, score, reasoning, color]) => (
              <div key={side} className={cn(
                'rounded-lg border p-3 space-y-2',
                (verdict.winner === side)
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10'
                  : 'border-border bg-card',
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                      color === 'blue' ? 'bg-blue-500' : 'bg-orange-500',
                    )}>
                      {side}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground truncate max-w-[100px]">{label}</span>
                  </div>
                  <span className={cn(
                    'text-lg font-black tabular-nums',
                    score >= 8 ? 'text-emerald-600 dark:text-emerald-400'
                    : score >= 6 ? 'text-blue-600 dark:text-blue-400'
                    : score >= 4 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400',
                  )}>
                    {score}<span className="text-xs font-medium text-muted-foreground">/10</span>
                  </span>
                </div>
                {/* Score bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-blue-500' : score >= 4 ? 'bg-amber-500' : 'bg-red-500',
                    )}
                    style={{ width: `${score * 10}%` }}
                  />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{reasoning}</p>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BattlePage() {
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  const [file, setFile] = useState<File | null>(null);
  const [slotAConfig, setSlotAConfig] = useState<BattleSlotConfig>(DEFAULT_SLOT_A);
  const [slotBConfig, setSlotBConfig] = useState<BattleSlotConfig>(DEFAULT_SLOT_B);
  const [slotAResult, setSlotAResult] = useState<BattleSlotResult>(IDLE_RESULT);
  const [slotBResult, setSlotBResult] = useState<BattleSlotResult>(IDLE_RESULT);
  const [verdict, setVerdict] = useState<BattleVerdict | null>(null);
  const [judging, setJudging] = useState(false);
  const [judgeModel, setJudgeModel] = useState('gemini-2.5-flash');
  const [cachedTranslationA, setCachedTranslationA] = useState<string | null>(null);
  const [cachedTranslationB, setCachedTranslationB] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [fileNameHint, setFileNameHint] = useState<string | null>(null);

  const isRunning = slotAResult.status === 'running' || slotBResult.status === 'running' || judging;
  const isRunningRef = useRef(false);
  isRunningRef.current = isRunning;
  const isRestoredRef = useRef(false);

  // ── sessionStorage restore (once on mount) ──
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('stt_battle_state');
      if (!raw) { isRestoredRef.current = true; return; }
      const s = JSON.parse(raw);
      if (s.slotAConfig) setSlotAConfig(s.slotAConfig);
      if (s.slotBConfig) setSlotBConfig(s.slotBConfig);
      if (s.slotAResult) {
        const r = s.slotAResult as BattleSlotResult;
        setSlotAResult(r.status === 'running' ? IDLE_RESULT : r);
      }
      if (s.slotBResult) {
        const r = s.slotBResult as BattleSlotResult;
        setSlotBResult(r.status === 'running' ? IDLE_RESULT : r);
      }
      if (s.verdict !== undefined) setVerdict(s.verdict);
      if (s.judgeModel) setJudgeModel(s.judgeModel);
      if (s.cachedTranslationA !== undefined) setCachedTranslationA(s.cachedTranslationA);
      if (s.cachedTranslationB !== undefined) setCachedTranslationB(s.cachedTranslationB);
      if (s.showTranslation !== undefined) setShowTranslation(s.showTranslation);
      if (s.fileNameHint) setFileNameHint(s.fileNameHint);
      // Detect judging-interrupted: slots done but no verdict
      const aIsDone = s.slotAResult?.status === 'done';
      const bIsDone = s.slotBResult?.status === 'done';
      if ((aIsDone || bIsDone) && !s.verdict) {
        toast.info('Gemini judging was interrupted — click Run Battle to re-judge.');
      }
    } catch {
      // Corrupt storage — ignore
    }
    isRestoredRef.current = true;
  }, []);

  // ── sessionStorage save (on relevant state changes) ──
  useEffect(() => {
    if (!isRestoredRef.current) return;
    try {
      sessionStorage.setItem('stt_battle_state', JSON.stringify({
        slotAConfig, slotBConfig, slotAResult, slotBResult,
        verdict, judgeModel, cachedTranslationA, cachedTranslationB,
        showTranslation, fileNameHint,
      }));
    } catch {
      // Storage full — ignore
    }
  }, [slotAConfig, slotBConfig, slotAResult, slotBResult, verdict, judgeModel,
      cachedTranslationA, cachedTranslationB, showTranslation, fileNameHint]);

  // ── beforeunload guard ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isRunningRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setFileNameHint(f.name);
    setSlotAResult(IDLE_RESULT);
    setSlotBResult(IDLE_RESULT);
    setVerdict(null);
  };

  const handleClear = () => {
    setFile(null);
    setFileNameHint(null);
    setSlotAResult(IDLE_RESULT);
    setSlotBResult(IDLE_RESULT);
    setVerdict(null);
    setCachedTranslationA(null);
    setCachedTranslationB(null);
    setShowTranslation(false);
    sessionStorage.removeItem('stt_battle_state');
  };

  const handleTranslateToggle = async () => {
    // If we already have cached translations, just toggle visibility
    if (cachedTranslationA || cachedTranslationB) {
      setShowTranslation(prev => !prev);
      return;
    }

    // Otherwise fetch translations
    const textA = slotAResult.transcript;
    const textB = slotBResult.transcript;
    if (!textA && !textB) return;

    setTranslating(true);
    try {
      const [resA, resB] = await Promise.allSettled([
        textA ? translateText(textA, 'gemini-2.0-flash') : Promise.resolve(null),
        textB ? translateText(textB, 'gemini-2.0-flash') : Promise.resolve(null),
      ]);
      setCachedTranslationA(resA.status === 'fulfilled' ? resA.value : null);
      setCachedTranslationB(resB.status === 'fulfilled' ? resB.value : null);
      setShowTranslation(true);
      toast.success('Translations complete!');
    } catch {
      toast.error('Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const handleRunBattle = async () => {
    if (!file) return;

    // Reset
    setSlotAResult({ ...IDLE_RESULT, status: 'running' });
    setSlotBResult({ ...IDLE_RESULT, status: 'running' });
    setVerdict(null);
    setCachedTranslationA(null);
    setCachedTranslationB(null);
    setShowTranslation(false);

    const start = Date.now();

    const onChunkA = (text: string) =>
      setSlotAResult(prev => ({ ...prev, transcript: text }));
    const onStatusA = (msg: string) =>
      setSlotAResult(prev => ({ ...prev, statusMsg: msg }));

    const onChunkB = (text: string) =>
      setSlotBResult(prev => ({ ...prev, transcript: text }));
    const onStatusB = (msg: string) =>
      setSlotBResult(prev => ({ ...prev, statusMsg: msg }));

    // Run both slots concurrently, capturing each slot's time individually
    let endA: number | null = null;
    let endB: number | null = null;

    const [resA, resB] = await Promise.allSettled([
      runSlot(file, slotAConfig, onChunkA, onStatusA).finally(() => { endA = Date.now(); }),
      runSlot(file, slotBConfig, onChunkB, onStatusB).finally(() => { endB = Date.now(); }),
    ]);

    const resultA: BattleSlotResult =
      resA.status === 'fulfilled'
        ? { status: 'done', transcript: resA.value.transcript, timeTakenMs: (endA ?? Date.now()) - start, error: null }
        : { status: 'error', transcript: null, timeTakenMs: null, error: (resA.reason as Error).message };

    const resultB: BattleSlotResult =
      resB.status === 'fulfilled'
        ? { status: 'done', transcript: resB.value.transcript, timeTakenMs: (endB ?? Date.now()) - start, error: null }
        : { status: 'error', transcript: null, timeTakenMs: null, error: (resB.reason as Error).message };

    setSlotAResult(resultA);
    setSlotBResult(resultB);

    // At least one must have a transcript to judge
    if (!resultA.transcript && !resultB.transcript) {
      toast.error('Both services failed — nothing to judge.');
      return;
    }

    // Judge
    setJudging(true);
    try {
      const v = await judgeTranscripts(
        slotLabel(slotAConfig), resultA.transcript ?? '(failed)',
        slotLabel(slotBConfig), resultB.transcript ?? '(failed)',
        file.name,
        judgeModel,
      );
      setVerdict(v);
      toast.success(`Winner: ${v.winner === 'tie' ? 'Tie' : v.winner === 'A' ? slotLabel(slotAConfig) : slotLabel(slotBConfig)}`);
    } catch (err) {
      toast.error('Gemini judge failed', { description: (err as Error).message });
    } finally {
      setJudging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          STT Battle Ground
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Race two STT services on the same audio — Gemini picks the winner
        </p>
      </div>

      {/* File upload + audio player */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {!file && fileNameHint && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-100 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Session restored — re-upload <span className="font-semibold">{fileNameHint}</span> to run a new battle.
              </p>
            </div>
          )}
          <FileUploadZone
            onFileSelect={handleFileSelect}
            selectedFile={file}
            onClear={handleClear}
            disabled={isRunning}
          />
          {file && <AudioPlayer ref={audioPlayerRef} file={file} />}
        </CardContent>
      </Card>

      {/* Slot configs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <SlotConfigPanel side="A" config={slotAConfig} onChange={setSlotAConfig} disabled={isRunning} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <SlotConfigPanel side="B" config={slotBConfig} onChange={setSlotBConfig} disabled={isRunning} />
          </CardContent>
        </Card>
      </div>

      {/* Judge model + Run button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Judge model</Label>
          <div className="w-48">
            <SelectField
              value={judgeModel}
              onChange={setJudgeModel}
              disabled={isRunning}
              options={[
                { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
                { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
                { value: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro' },
              ]}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {(slotAResult.status !== 'idle' || slotBResult.status !== 'idle') && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => { setSlotAResult(IDLE_RESULT); setSlotBResult(IDLE_RESULT); setVerdict(null); }}
              disabled={isRunning}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1 sm:flex-none gap-2"
            onClick={handleRunBattle}
            disabled={!file || isRunning}
          >
            {isRunning && !judging ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Running Battle…</>
            ) : judging ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Judging…</>
            ) : (
              <><Swords className="h-4 w-4" />Run Battle</>
            )}
          </Button>
        </div>
      </div>

      {/* Results — side by side */}
      {(slotAResult.status !== 'idle' || slotBResult.status !== 'idle') && (
        <div className="space-y-3">
          {/* Translate button */}
          {(slotAResult.status === 'done' || slotBResult.status === 'done') && (
            <div className="flex items-center gap-2">
              <Button
                variant={showTranslation ? 'secondary' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={handleTranslateToggle}
                disabled={translating || isRunning}
              >
                {translating ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Translating…</>
                ) : showTranslation ? (
                  <><Languages className="h-3.5 w-3.5" />Show Original</>
                ) : (
                  <><Languages className="h-3.5 w-3.5" />Translate to English</>
                )}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SlotResultPanel side="A" config={slotAConfig} result={slotAResult} translation={showTranslation ? cachedTranslationA : null} />
            <SlotResultPanel side="B" config={slotBConfig} result={slotBResult} translation={showTranslation ? cachedTranslationB : null} />
          </div>
        </div>
      )}

      {/* Verdict */}
      <VerdictCard
        verdict={verdict}
        labelA={slotLabel(slotAConfig)}
        labelB={slotLabel(slotBConfig)}
        judging={judging}
      />
    </div>
  );
}
