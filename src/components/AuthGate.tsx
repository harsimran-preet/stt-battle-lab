import { useState, type ReactNode } from 'react';
import { Mic2, Lock, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const SESSION_KEY = 'stt_battle_lab_auth';
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD as string | undefined;

function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(isAuthenticated);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shaking, setShaking] = useState(false);

  // If no password is set in env, skip the gate entirely
  if (!APP_PASSWORD) return <>{children}</>;
  if (authed) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthed(true);
    } else {
      setError('Incorrect password.');
      setPassword('');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className={cn(
        'w-full max-w-sm space-y-6',
        shaking && 'animate-shake',
      )}>
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Mic2 className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-foreground">STT Battle Lab</h1>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Beta</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Enter the access password to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Password"
              autoFocus
              className={cn(
                'pl-9 pr-10',
                error && 'border-destructive focus-visible:ring-destructive',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={!password} className="w-full">
            Unlock
          </Button>
        </form>
      </div>
    </div>
  );
}
