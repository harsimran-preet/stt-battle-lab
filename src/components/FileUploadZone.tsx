import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileAudio, X, CheckCircle } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  'audio/*': ['.mp3', '.mp4', '.m4a', '.wav', '.flac', '.ogg', '.webm', '.aac', '.opus'],
  'video/*': ['.mp4', '.mkv', '.mov', '.avi', '.webm'],
};

export function FileUploadZone({ onFileSelect, selectedFile, onClear, disabled }: FileUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
      setIsDragActive(false);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: false,
    disabled,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  if (selectedFile) {
    return (
      <div className="relative flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-5">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
          <FileAudio className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-green-800 dark:text-green-200">
            {selectedFile.name}
          </p>
          <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
            {formatFileSize(selectedFile.size)} · {selectedFile.type || 'audio/video file'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            disabled={disabled}
            className="h-8 w-8 text-green-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer',
        isDragActive
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      <div className={cn(
        'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-200',
        isDragActive ? 'bg-primary/10' : 'bg-muted'
      )}>
        <Upload className={cn(
          'h-8 w-8 transition-colors duration-200',
          isDragActive ? 'text-primary' : 'text-muted-foreground'
        )} />
      </div>
      <p className="mb-1 text-base font-semibold text-foreground">
        {isDragActive ? 'Drop your audio file here' : 'Upload Audio or Video'}
      </p>
      <p className="text-sm text-muted-foreground">
        Drag & drop or <span className="text-primary font-medium">browse files</span>
      </p>
      <p className="mt-3 text-xs text-muted-foreground/70">
        Supports MP3, WAV, M4A, FLAC, OGG, MP4, MOV · Max recommended: 500MB
      </p>
    </div>
  );
}
