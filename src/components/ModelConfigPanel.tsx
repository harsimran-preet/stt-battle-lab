import { Settings2, RotateCcw, Globe, Users } from 'lucide-react';
import type { ModelConfig } from '@/types';
import { DEEPGRAM_MODELS, GEMINI_MODELS, DEEPGRAM_LANGUAGES, SONIOX_MODELS, SONIOX_LANGUAGES, ORISTT_MODELS, ORISTT_LANGUAGES } from '@/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LanguageCombobox } from '@/components/LanguageCombobox';
import { cn } from '@/lib/utils';

interface ModelConfigPanelProps {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
  disabled?: boolean;
}

const DEFAULT_CONFIG: ModelConfig = {
  sttService: 'deepgram',
  deepgramModel: 'nova-3',
  deepgramLanguage: 'en',
  diarize: true,
  sonioxModel: 'stt-async-v4',
  sonioxLanguage: '',
  oristtModel: 'ori-indic-prime-v1',
  oristtLanguage: 'hi',
  geminiModel: 'gemini-2.5-flash',
};

export function ModelConfigPanel({ config, onChange, disabled }: ModelConfigPanelProps) {
  const isModified =
    config.sttService !== DEFAULT_CONFIG.sttService ||
    config.deepgramModel !== DEFAULT_CONFIG.deepgramModel ||
    config.deepgramLanguage !== DEFAULT_CONFIG.deepgramLanguage ||
    config.diarize !== DEFAULT_CONFIG.diarize ||
    config.sonioxModel !== DEFAULT_CONFIG.sonioxModel ||
    config.sonioxLanguage !== DEFAULT_CONFIG.sonioxLanguage ||
    config.oristtModel !== DEFAULT_CONFIG.oristtModel ||
    config.oristtLanguage !== DEFAULT_CONFIG.oristtLanguage ||
    config.geminiModel !== DEFAULT_CONFIG.geminiModel;

  const handleReset = () => onChange({ ...DEFAULT_CONFIG });

  const selectedLangLabel =
    DEEPGRAM_LANGUAGES.find((l) => l.value === config.deepgramLanguage)?.label ?? config.deepgramLanguage;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Model Configuration
          </span>
        </div>
        {isModified && (
          <button
            onClick={handleReset}
            disabled={disabled}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset to defaults"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* STT Service selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">STT Service</Label>
        <div className="grid grid-cols-3 gap-2">
          {([['deepgram', 'Deepgram', 'DG', 'blue'], ['soniox', 'Soniox', 'SX', 'purple'], ['oristt', 'OriSTT', 'OR', 'amber']] as const).map(
            ([svc, label, badge, color]) => (
              <button
                key={svc}
                onClick={() => !disabled && onChange({ ...config, sttService: svc })}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  config.sttService === svc
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                )}
              >
                <span className={cn(
                  'inline-flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold leading-none',
                  config.sttService === svc
                    ? 'bg-white/20 text-white'
                    : color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                    : color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                                       : 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
                )}>
                  {badge}
                </span>
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Deepgram options */}
      {config.sttService === 'deepgram' && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[9px] font-bold leading-none">DG</span>
              Deepgram Model
            </Label>
            <Select value={config.deepgramModel} onValueChange={(v) => onChange({ ...config, deepgramModel: v })} disabled={disabled}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEEPGRAM_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              STT Language
            </Label>
            <LanguageCombobox
              value={config.deepgramLanguage}
              onChange={(v) => onChange({ ...config, deepgramLanguage: v })}
              disabled={disabled}
              options={DEEPGRAM_LANGUAGES}
              placeholder="Search languages…"
            />
          </div>

          {/* Speaker Diarization */}
          <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              <Label className="text-xs font-medium text-foreground cursor-pointer" htmlFor="diarize-toggle">
                Speaker Diarization
              </Label>
            </div>
            <Switch
              id="diarize-toggle"
              checked={config.diarize}
              onCheckedChange={(checked) => onChange({ ...config, diarize: checked })}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Soniox options */}
      {config.sttService === 'soniox' && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-[9px] font-bold leading-none">SX</span>
              Soniox Model
            </Label>
            <Select value={config.sonioxModel} onValueChange={(v) => onChange({ ...config, sonioxModel: v })} disabled={disabled}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SONIOX_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Note: Soniox uses async transcription — processing may take a few seconds.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
              STT Language
            </Label>
            <LanguageCombobox
              value={config.sonioxLanguage}
              onChange={(v) => onChange({ ...config, sonioxLanguage: v })}
              disabled={disabled}
              options={SONIOX_LANGUAGES}
              placeholder="Search languages…"
            />
          </div>
        </div>
      )}

      {/* OriSTT options */}
      {config.sttService === 'oristt' && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[9px] font-bold leading-none">OR</span>
              OriSTT Model
            </Label>
            <Select
              value={config.oristtModel}
              onValueChange={(v) => {
                const langs = ORISTT_LANGUAGES[v];
                const langValid = langs?.some(l => l.value === config.oristtLanguage);
                onChange({
                  ...config,
                  oristtModel: v,
                  oristtLanguage: langValid ? config.oristtLanguage : (langs?.[0]?.value ?? 'hi'),
                });
              }}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORISTT_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
              STT Language
            </Label>
            <LanguageCombobox
              value={config.oristtLanguage}
              onChange={(v) => onChange({ ...config, oristtLanguage: v })}
              disabled={disabled}
              options={ORISTT_LANGUAGES[config.oristtModel] ?? ORISTT_LANGUAGES['ori-indic-prime-v1']}
              placeholder="Search languages…"
            />
          </div>
        </div>
      )}

      {/* Gemini Analysis Model */}
      <div className="space-y-1.5 border-t pt-3">
        <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-[9px] font-bold leading-none">GM</span>
          Gemini Analysis Model
        </Label>
        <Select value={config.geminiModel} onValueChange={(v) => onChange({ ...config, geminiModel: v })} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GEMINI_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active config pills */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t">
        <span className="text-[10px] text-muted-foreground self-center">Active:</span>
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
          {config.sttService === 'deepgram' ? config.deepgramModel : config.sttService === 'oristt' ? config.oristtModel : config.sonioxModel}
        </span>
        {config.sttService === 'deepgram' && (
          <>
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              {selectedLangLabel}
            </span>
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              config.diarize
                ? 'border-border bg-muted text-foreground'
                : 'border-border bg-muted text-muted-foreground',
            )}>
              <Users className="h-2.5 w-2.5" />
              {config.diarize ? 'Diarization on' : 'Diarization off'}
            </span>
          </>
        )}
        {config.sttService === 'soniox' && (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
            {SONIOX_LANGUAGES.find(l => l.value === config.sonioxLanguage)?.label ?? 'Auto-detect'}
          </span>
        )}
        {config.sttService === 'oristt' && (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
            {ORISTT_LANGUAGES[config.oristtModel]?.find(l => l.value === config.oristtLanguage)?.label ?? config.oristtLanguage}
          </span>
        )}
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
          {config.geminiModel}
        </span>
      </div>
    </div>
  );
}
