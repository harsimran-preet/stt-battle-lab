import { useState } from 'react';
import { formatTime, getSpeakerColor, cn } from '@/lib/utils';
import type { TranscriptResult } from '@/types';
import { translateTranscript, type TranslationResult } from '@/services/gemini';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, Users, BarChart2, FileText, AlertTriangle, ChevronDown, ChevronRight, Search, Languages, Loader2, Play } from 'lucide-react';

interface TranscriptViewerProps {
  result: TranscriptResult;
  geminiModel?: string;
  onSeekTo?: (time: number) => void;
}

export function TranscriptViewer({ result, geminiModel, onSeekTo }: TranscriptViewerProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

  const handleTranslateToggle = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }
    if (translation) {
      setShowTranslated(true);
      return;
    }
    setTranslating(true);
    setTranslateError(null);
    try {
      const result_ = await translateTranscript(result, geminiModel);
      setTranslation(result_);
      setShowTranslated(true);
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const uniqueSpeakers = [...new Set(result.speakerBlocks.map(b => b.speaker))].sort((a, b) => a - b);
  const hasDiarization = result.speakerBlocks.length > 0 && uniqueSpeakers.length > 0;

  // Warn when all blocks resolved to the same speaker (diarization likely failed)
  const diarizationFailed = result.speakerBlocks.length > 1 && uniqueSpeakers.length === 1;

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Duration"
          value={formatTime(result.duration)}
          colorClass="text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/30"
        />
        <StatCard
          icon={<BarChart2 className="h-4 w-4" />}
          label="Confidence"
          value={`${(result.confidence * 100).toFixed(1)}%`}
          colorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Speakers"
          value={hasDiarization ? uniqueSpeakers.length.toString() : 'N/A'}
          colorClass="text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/30"
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Words"
          value={result.words.length.toString()}
          colorClass="text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/30"
        />
      </div>

      {/* Diarization failed warning */}
      {diarizationFailed && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-950/20 px-3.5 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Diarization may have failed</span> — all segments are tagged as Speaker 0.
            This can happen with certain languages, short audio, or single-speaker recordings.
            Check the <button
              className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100"
              onClick={() => setShowRaw(v => !v)}
            >Raw Response</button> to inspect the Deepgram output.
          </div>
        </div>
      )}

      {/* Speaker Legend */}
      {hasDiarization && (
        <div className="flex flex-wrap gap-2">
          {uniqueSpeakers.map(speaker => {
            const colors = getSpeakerColor(speaker);
            return (
              <Badge key={speaker} variant="outline" className={cn('gap-1.5', colors.text, colors.border)}>
                <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
                Speaker {speaker}
              </Badge>
            );
          })}
        </div>
      )}

      <Separator />

      {/* Diarized / Full Transcript */}
      {hasDiarization ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Diarized Transcript
            </h3>
            <Button
              variant={showTranslated ? 'default' : 'outline'}
              size="sm"
              className="h-7 gap-1.5 text-xs px-2.5"
              onClick={handleTranslateToggle}
              disabled={translating}
            >
              {translating
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Languages className="h-3 w-3" />}
              {translating ? 'Translating…' : showTranslated ? 'Show Original' : 'Translate to English'}
            </Button>
          </div>
          {translateError && (
            <p className="mb-2 text-xs text-destructive">{translateError}</p>
          )}
          <ScrollArea className="h-[320px] pr-3">
            <div className="space-y-2.5">
              {result.speakerBlocks.map((block, idx) => {
                const colors = getSpeakerColor(block.speaker);
                const displayText = showTranslated && translation?.translatedBlocks[idx]
                  ? translation.translatedBlocks[idx]
                  : block.text;
                return (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      colors.bg, colors.border
                    )}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full flex-shrink-0', colors.dot)} />
                      <span className={cn('text-xs font-bold uppercase tracking-wide', colors.text)}>
                        Speaker {block.speaker}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        {onSeekTo && (
                          <button
                            onClick={() => onSeekTo(block.start)}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                            aria-label={`Play from ${formatTime(block.start)}`}
                            title={`Play from ${formatTime(block.start)}`}
                          >
                            <Play className="h-2.5 w-2.5 fill-current translate-x-[0.5px]" />
                          </button>
                        )}
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatTime(block.start)} – {formatTime(block.end)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{displayText}</p>
                    {showTranslated && translation?.translatedBlocks[idx] && block.text !== displayText && (
                      <p className="mt-1.5 text-xs text-muted-foreground italic border-t pt-1.5">{block.text}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Full Transcript
            </h3>
            <Button
              variant={showTranslated ? 'default' : 'outline'}
              size="sm"
              className="h-7 gap-1.5 text-xs px-2.5"
              onClick={handleTranslateToggle}
              disabled={translating}
            >
              {translating
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Languages className="h-3 w-3" />}
              {translating ? 'Translating…' : showTranslated ? 'Show Original' : 'Translate to English'}
            </Button>
          </div>
          {translateError && (
            <p className="mb-2 text-xs text-destructive">{translateError}</p>
          )}
          <ScrollArea className="h-[320px]">
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {showTranslated && translation?.translatedRaw
                ? translation.translatedRaw
                : result.rawTranscript || (
                  <span className="text-muted-foreground italic">No transcript returned.</span>
                )}
            </p>
          </ScrollArea>
        </div>
      )}

      {/* Raw JSON debug section */}
      <Collapsible open={showRaw} onOpenChange={setShowRaw}>
        <div className="rounded-lg border bg-muted/20">
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Raw Deepgram Response (debug)</span>
              {showRaw
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t">
              <ScrollArea className="h-64">
                <pre className="p-3 text-[11px] leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(result.rawResponse, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className={cn('mb-1.5 inline-flex items-center justify-center rounded-md p-1.5', colorClass)}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
