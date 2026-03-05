import { Settings2, RotateCcw, Globe, Users } from 'lucide-react';
import type { ModelConfig } from '@/types';
import { DEEPGRAM_MODELS, GEMINI_MODELS, DEEPGRAM_LANGUAGES, SONIOX_MODELS } from '@/types';
import { Label } from '@/components/ui/label';
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
  geminiModel: 'gemini-2.5-flash',
};

export function ModelConfigPanel({ config, onChange, disabled }: ModelConfigPanelProps) {
  const isModified =
    config.sttService !== DEFAULT_CONFIG.sttService ||
    config.deepgramModel !== DEFAULT_CONFIG.deepgramModel ||
    config.deepgramLanguage !== DEFAULT_CONFIG.deepgramLanguage ||
    config.diarize !== DEFAULT_CONFIG.diarize ||
    config.sonioxModel !== DEFAULT_CONFIG.sonioxModel ||
    config.geminiModel !== DEFAULT_CONFIG.geminiModel;

  const handleReset = () => onChange({ ...DEFAULT_CONFIG });

  const selectedLangLabel =
    DEEPGRAM_LANGUAGES.find((l) => l.value === config.deepgramLanguage)?.label ?? config.deepgramLanguage;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
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
        <div className="grid grid-cols-2 gap-2">
          {([['deepgram', 'Deepgram', 'DG', 'blue'], ['soniox', 'Soniox', 'SX', 'purple']] as const).map(
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
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[9px] font-bold leading-none">DG</span>
              Deepgram Model
            </Label>
            <SelectField
              value={config.deepgramModel}
              onChange={(v) => onChange({ ...config, deepgramModel: v })}
              disabled={disabled}
              options={DEEPGRAM_MODELS}
              isDefault={config.deepgramModel === DEFAULT_CONFIG.deepgramModel}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              STT Language
            </Label>
            <div className="relative">
              <input
                list="lang-list"
                value={config.deepgramLanguage}
                onChange={(e) => onChange({ ...config, deepgramLanguage: e.target.value.trim() })}
                disabled={disabled}
                placeholder="e.g. en, es, fr, or custom code…"
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  'disabled:cursor-not-allowed disabled:opacity-50 text-foreground placeholder:text-muted-foreground',
                )}
              />
              <datalist id="lang-list">
                {DEEPGRAM_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </datalist>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {config.deepgramLanguage === DEFAULT_CONFIG.deepgramLanguage
                ? 'Default (English)'
                : 'Custom or selected language code'}
            </p>
          </div>

          {/* Speaker Diarization */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              <Label className="text-xs font-medium text-foreground cursor-pointer" htmlFor="diarize-toggle">
                Speaker Diarization
              </Label>
            </div>
            <button
              id="diarize-toggle"
              role="switch"
              aria-checked={config.diarize}
              onClick={() => !disabled && onChange({ ...config, diarize: !config.diarize })}
              disabled={disabled}
              className={cn(
                'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                config.diarize ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-500',
              )}
            >
              <span className={cn(
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                config.diarize ? 'translate-x-4' : 'translate-x-0',
              )} />
            </button>
          </div>
        </>
      )}

      {/* Soniox options */}
      {config.sttService === 'soniox' && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-[9px] font-bold leading-none">SX</span>
            Soniox Model
          </Label>
          <SelectField
            value={config.sonioxModel}
            onChange={(v) => onChange({ ...config, sonioxModel: v })}
            disabled={disabled}
            options={SONIOX_MODELS}
            isDefault={config.sonioxModel === DEFAULT_CONFIG.sonioxModel}
          />
          <p className="text-[11px] text-muted-foreground">
            Note: Soniox uses async transcription — processing may take a few seconds.
          </p>
        </div>
      )}

      {/* Gemini Analysis Model */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-[9px] font-bold leading-none">GM</span>
          Gemini Analysis Model
        </Label>
        <SelectField
          value={config.geminiModel}
          onChange={(v) => onChange({ ...config, geminiModel: v })}
          disabled={disabled}
          options={GEMINI_MODELS}
          isDefault={config.geminiModel === DEFAULT_CONFIG.geminiModel}
        />
      </div>

      {/* Active config pills */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t">
        <span className="text-[10px] text-muted-foreground self-center">Active:</span>
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
          {config.sttService === 'deepgram' ? config.deepgramModel : config.sonioxModel}
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
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
          {config.geminiModel}
        </span>
      </div>
    </div>
  );
}

function SelectField({
  value, onChange, disabled, options, isDefault,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  options: readonly { value: string; label: string }[];
  isDefault: boolean;
}) {
  return (
    <div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50 text-foreground',
          )}
        >
          {options.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {isDefault && <p className="mt-1 text-[11px] text-muted-foreground">Default</p>}
    </div>
  );
}
