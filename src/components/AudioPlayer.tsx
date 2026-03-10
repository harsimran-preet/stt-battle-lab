import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { formatTime, formatFileSize, cn } from '@/lib/utils';

interface AudioPlayerProps {
  file: File;
}

export interface AudioPlayerHandle {
  seekAndPlay: (time: number) => void;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
function AudioPlayer({ file }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    isPlaying ? el.pause() : void el.play();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const t = Number(e.target.value);
    el.currentTime = t;
    setCurrentTime(t);
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !muted;
    setMuted(m => !m);
  };

  useImperativeHandle(ref, () => ({
    seekAndPlay(time: number) {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = time;
      void el.play();
    },
  }));

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <audio
        ref={audioRef}
        src={objectUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        preload="metadata"
      />

      {/* File info row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
        <span className="text-xs text-muted-foreground flex-shrink-0">{formatFileSize(file.size)}</span>
      </div>

      {/* Seek bar */}
      <div className="group relative flex items-center gap-0">
        {/* Track */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Thumb (always visible, moves with progress) */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background shadow transition-none"
          style={{ left: `calc(${progress}% - 7px)` }}
        />
        {/* Invisible range input for interaction */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Seek"
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all',
            'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95',
          )}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying
            ? <Pause className="h-4 w-4 fill-current" />
            : <Play className="h-4 w-4 fill-current translate-x-[1px]" />}
        </button>

        {/* Time */}
        <div className="flex items-baseline gap-1 font-mono text-sm tabular-nums">
          <span className="text-foreground font-medium">{formatTime(currentTime)}</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-muted-foreground">{formatTime(duration)}</span>
        </div>

        {/* Mute */}
        <button
          onClick={toggleMute}
          className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted
            ? <VolumeX className="h-4 w-4" />
            : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
});
