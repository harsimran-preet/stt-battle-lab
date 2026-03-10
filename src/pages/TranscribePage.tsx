import { useState, useRef, useEffect } from 'react';
import { Mic2, Sparkles, AlertCircle, Loader2, RefreshCw, Download, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { TranscriptResult, AnalysisResult, ModelConfig } from '@/types';
import { transcribeFile } from '@/services/deepgram';
import { transcribeSonioxFull } from '@/services/soniox';
import { transcribeOriSTTFull } from '@/services/oristt';
import { analyzeTranscript } from '@/services/gemini';
import { FileUploadZone } from '@/components/FileUploadZone';
import { TranscriptViewer } from '@/components/TranscriptViewer';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { ModelConfigPanel } from '@/components/ModelConfigPanel';
import { AudioPlayer, type AudioPlayerHandle } from '@/components/AudioPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

type Step = 'idle' | 'transcribing' | 'transcript_done' | 'analyzing' | 'done' | 'error';

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { id: 'upload', label: 'Upload', done: currentStep !== 'idle' },
    { id: 'transcribe', label: 'Transcribe', done: ['transcript_done', 'analyzing', 'done'].includes(currentStep), active: currentStep === 'transcribing' },
    { id: 'analyze', label: 'AI Analysis', done: currentStep === 'done', active: currentStep === 'analyzing' },
  ];

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            step.done ? 'bg-primary text-primary-foreground' :
            step.active ? 'bg-primary/20 text-primary border border-primary/40' :
            'bg-muted text-muted-foreground'
          }`}>
            {step.active && <Loader2 className="h-3 w-3 animate-spin" />}
            {step.done && <Check className="h-3 w-3" />}
            {step.label}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-6 rounded-full transition-all ${step.done ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function TranscribePage() {
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('transcript');
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    sttService: 'deepgram',
    deepgramModel: 'nova-3',
    deepgramLanguage: 'en',
    diarize: true,
    sonioxModel: 'stt-async-v4',
    oristtModel: 'ori-indic-prime-v1',
    oristtLanguage: 'hi',
    geminiModel: 'gemini-2.5-flash',
  });
  const [fileNameHint, setFileNameHint] = useState<string | null>(null);

  const isTranscribing = step === 'transcribing';
  const isAnalyzing = step === 'analyzing';
  const isBusy = isTranscribing || isAnalyzing;
  const isBusyRef = useRef(false);
  isBusyRef.current = isBusy;
  const isRestoredRef = useRef(false);

  // ── sessionStorage restore (once on mount) ──
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('stt_transcribe_state');
      if (!raw) { isRestoredRef.current = true; return; }
      const s = JSON.parse(raw);
      const safeStep: Step = (s.step === 'transcribing' || s.step === 'analyzing')
        ? 'error' : (s.step ?? 'idle');
      setStep(safeStep);
      if (s.transcript) setTranscript(s.transcript);
      if (s.analysis) setAnalysis(s.analysis);
      if (safeStep === 'error' && !s.error) {
        setError(
          s.step === 'analyzing'
            ? 'Analysis was interrupted — re-run Analyze to get results.'
            : 'Transcription was interrupted — please re-transcribe.'
        );
      } else if (s.error !== undefined) {
        setError(s.error);
      }
      if (s.activeTab) setActiveTab(s.activeTab);
      if (s.modelConfig) setModelConfig(s.modelConfig);
      if (s.fileNameHint) setFileNameHint(s.fileNameHint);
    } catch {
      // Corrupt storage — ignore
    }
    isRestoredRef.current = true;
  }, []);

  // ── sessionStorage save (on relevant state changes) ──
  useEffect(() => {
    if (!isRestoredRef.current) return;
    try {
      sessionStorage.setItem('stt_transcribe_state', JSON.stringify({
        step, transcript, analysis, error, activeTab, modelConfig, fileNameHint,
      }));
    } catch {
      // Storage full — ignore
    }
  }, [step, transcript, analysis, error, activeTab, modelConfig, fileNameHint]);

  // ── beforeunload guard ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isBusyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setFileNameHint(file.name);
    setTranscript(null);
    setAnalysis(null);
    setError(null);
    setStep('idle');
  };

  const handleClear = () => {
    setSelectedFile(null);
    setFileNameHint(null);
    setTranscript(null);
    setAnalysis(null);
    setError(null);
    setStep('idle');
    setActiveTab('transcript');
    sessionStorage.removeItem('stt_transcribe_state');
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;
    setError(null);
    setStep('transcribing');
    try {
      const result = modelConfig.sttService === 'soniox'
        ? await transcribeSonioxFull(selectedFile, modelConfig.sonioxModel)
        : modelConfig.sttService === 'oristt'
        ? await transcribeOriSTTFull(selectedFile, modelConfig.oristtModel, modelConfig.oristtLanguage)
        : await transcribeFile(selectedFile, modelConfig.deepgramModel, modelConfig.deepgramLanguage, modelConfig.diarize);
      setTranscript(result);
      setStep('transcript_done');
      setActiveTab('transcript');
      toast.success('Transcription complete!', {
        description: result.speakerBlocks.length > 0
          ? `${result.speakerBlocks.length} speaker blocks detected`
          : `${result.rawTranscript.trim().split(/\s+/).length} words transcribed`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg);
      setStep('error');
      toast.error('Transcription failed', { description: msg });
    }
  };

  const handleAnalyze = async () => {
    const fileName = selectedFile?.name ?? fileNameHint ?? 'unknown';
    if (!transcript) return;
    setError(null);
    setStep('analyzing');
    try {
      const result = await analyzeTranscript(transcript, fileName, modelConfig.geminiModel);
      setAnalysis(result);
      setStep('done');
      setActiveTab('analysis');
      toast.success('Analysis complete!', {
        description: `Overall score: ${result.deepgramAnalysis.overallScore.toFixed(1)}/10`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg);
      setStep('error');
      toast.error('Analysis failed', { description: msg });
    }
  };

  const handleDownloadJSON = () => {
    if (!transcript) return;
    const data = { transcript, analysis: analysis ?? null, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile?.name ?? 'transcript'}-results.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasTranscript = transcript !== null;
  const hasAnalysis = analysis !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Transcribe</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload audio, transcribe with Deepgram, analyze with Gemini</p>
        </div>
        {step !== 'idle' && <StepIndicator currentStep={step} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* Left Panel – Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audio Input</CardTitle>
              <CardDescription className="text-sm">
                Upload an audio or video file to transcribe using Deepgram Nova-3
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedFile && fileNameHint && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-100 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Session restored — re-upload <span className="font-semibold">{fileNameHint}</span> to transcribe again.
                  </p>
                </div>
              )}
              <FileUploadZone
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClear={handleClear}
                disabled={isBusy}
              />

              {selectedFile && (
                <AudioPlayer ref={audioPlayerRef} file={selectedFile} />
              )}

              <Separator />

              <div className="space-y-2">
                <Button className="w-full" size="lg" onClick={handleTranscribe} disabled={!selectedFile || isBusy}>
                  {isTranscribing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Transcribing...</>
                  ) : hasTranscript ? (
                    <><RefreshCw className="mr-2 h-4 w-4" />Re-Transcribe</>
                  ) : (
                    <><Mic2 className="mr-2 h-4 w-4" />Transcribe with Deepgram</>
                  )}
                </Button>

                <Button className="w-full" variant="secondary" size="lg" onClick={handleAnalyze} disabled={!hasTranscript || isBusy}>
                  {isAnalyzing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing with Gemini...</>
                  ) : hasAnalysis ? (
                    <><RefreshCw className="mr-2 h-4 w-4" />Re-Analyze</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />Analyze Quality with Gemini</>
                  )}
                </Button>

                {hasTranscript && (
                  <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadJSON}>
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Export Results as JSON
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <ModelConfigPanel config={modelConfig} onChange={setModelConfig} disabled={isBusy} />
        </div>

        {/* Right Panel – Results */}
        <div>
          {step === 'idle' && !hasTranscript && (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/35 text-center p-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Mic2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Ready to Transcribe</h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Upload an audio or video file, click Transcribe, then use Gemini to analyze the quality.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center w-full max-w-xs">
                {['1. Upload File', '2. Transcribe', '3. AI Analysis'].map((s) => (
                  <div key={s} className="rounded-lg bg-muted px-2 py-2">
                    <p className="text-[11px] font-medium text-muted-foreground">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isBusy && (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border bg-muted/20 p-8">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-4 border-muted animate-pulse" />
                <Loader2 className="absolute inset-0 m-auto h-10 w-10 animate-spin text-primary" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">
                  {isTranscribing ? 'Transcribing Audio...' : 'Analyzing with Gemini...'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isTranscribing
                    ? 'Sending to Deepgram Nova-3 with speaker detection'
                    : 'Gemini is evaluating transcript quality'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-start gap-3 pt-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive text-sm">Error</p>
                  <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {hasTranscript && !isBusy && (
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-0">
                  <TabsList className="w-full">
                    <TabsTrigger value="transcript" className="flex-1 gap-2">
                      <Mic2 className="h-3.5 w-3.5" />
                      Transcript
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="flex-1 gap-2" disabled={!hasAnalysis}>
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Analysis
                      {!hasAnalysis && <span className="text-[10px] text-muted-foreground">(run analysis first)</span>}
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-5">
                  <TabsContent value="transcript" className="mt-0">
                    <TranscriptViewer
                      result={transcript}
                      geminiModel={modelConfig.geminiModel}
                      onSeekTo={(t) => audioPlayerRef.current?.seekAndPlay(t)}
                    />
                  </TabsContent>
                  <TabsContent value="analysis" className="mt-0">
                    {hasAnalysis && <AnalysisPanel analysis={analysis!} />}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
