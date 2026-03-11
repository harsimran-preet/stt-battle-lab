import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Mic2, Github, Moon, Sun, Swords, Layers, BookOpen, ExternalLink, User } from 'lucide-react';
import { Toaster } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/transcribe',   label: 'Transcribe',    icon: Mic2,   end: false },
  { to: '/battle',       label: 'STT Battle',    icon: Swords, end: false },
  { to: '/batch-battle', label: 'Batch Battle',  icon: Layers, end: false },
];

const DOC_LINKS = [
  { href: 'https://developers.deepgram.com/docs/models-languages-overview', label: 'Deepgram Languages' },
  { href: 'https://soniox.com/docs/stt/concepts/supported-languages',       label: 'Soniox Languages'   },
];

export default function Layout() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="flex min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mic2 className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-bold tracking-tight text-foreground truncate">STT Battle Lab</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 flex-shrink-0">Beta</Badge>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          {/* Docs section */}
          <div className="pt-4">
            <p className="mb-1 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              <BookOpen className="h-3 w-3" />
              Docs
            </p>
            {DOC_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span className="truncate">{label}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
              </a>
            ))}
          </div>
        </nav>

        {/* Bottom link */}
        <div className="border-t border-sidebar-border px-3 py-3">
          <NavLink
            to="/about"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <User className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                About the Coder
              </>
            )}
          </NavLink>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <div className="flex flex-1 flex-col pl-56">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-1 border-b bg-card px-6">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDark(d => !d)}
                  aria-label="Toggle dark mode"
                >
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{dark ? 'Light mode' : 'Dark mode'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <a href="https://github.com/harsimran-preet" target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Github className="h-4 w-4" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>GitHub</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
