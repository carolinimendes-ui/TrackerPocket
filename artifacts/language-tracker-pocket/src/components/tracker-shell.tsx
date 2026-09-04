import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { BarChart3, BookOpen, CalendarDays, ChevronRight, CircleUserRound, Compass, Headphones, LayoutDashboard, Menu, Moon, Settings, Sparkles, Sun, Timer, X } from 'lucide-react';
import { formatBrasiliaLongDate, useBrasiliaNow } from '@/lib/brasilia-date';

const nav = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/register', label: 'Registrar estudo', icon: BookOpen },
  { href: '/sessao', label: 'Sessão de estudos', icon: Timer },
  { href: '/progresso', label: 'Progresso', icon: BarChart3 },
  { href: '/caiz', label: 'Jornada CAIZ', icon: Compass },
  { href: '/historico', label: 'Histórico', icon: CalendarDays },
  { href: '/resumo-mensal', label: 'Resumo mensal', icon: Sparkles },
  { href: '/playlists', label: 'Playlists', icon: Headphones },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function TrackerShell({ children, vocabulary = 4242, goal = 6000, darkMode = false, onToggleTheme }: { children: ReactNode; vocabulary?: number; goal?: number; darkMode?: boolean; onToggleTheme?: () => void }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const brasiliaNow = useBrasiliaNow();
  const percent = Math.min(100, Math.round((vocabulary / goal) * 100));
  return (
    <div className={`grain min-h-[100dvh] bg-background text-foreground ${darkMode ? 'dark' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-sidebar-border bg-sidebar px-5 py-6 transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/.24)]"><BookOpen size={19} strokeWidth={2.4} /></span>
            <span><strong className="block font-display text-[15px] leading-tight text-sidebar-foreground">Language Tracker</strong><small className="font-mono-custom text-[9px] tracking-[.08em] text-muted-foreground">POCKET · CAROLINI</small></span>
          </Link>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground md:hidden" data-testid="button-close-menu"><X size={18} /></button>
        </div>
        <div className="mt-9 space-y-1">
          <p className="px-3 pb-2 font-mono-custom text-[10px] uppercase tracking-[.18em] text-muted-foreground">Seu espaço</p>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? location === '/' : location.startsWith(href);
            return <Link key={href} href={href} onClick={() => setOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors ${active ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_hsl(var(--primary)/.18)]' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}><Icon size={16} strokeWidth={active ? 2.3 : 1.8} /><span>{label}</span>{active && <ChevronRight size={14} className="ml-auto" />}</Link>;
          })}
        </div>
        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-sidebar-border bg-background/40 p-4">
            <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-sidebar-foreground">Vocabulário</span><span className="font-mono-custom text-[11px] font-medium text-primary">{percent}%</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sidebar-accent"><div className="progress-grow h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
            <div className="mt-2 font-mono-custom text-[10px] text-muted-foreground">{vocabulary.toLocaleString('pt-BR')} / {goal.toLocaleString('pt-BR')}</div>
          </div>
          <div className="flex items-center gap-3 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><CircleUserRound size={18} /></span><div className="min-w-0"><p className="truncate text-xs font-bold text-sidebar-foreground">Carolini</p><p className="truncate text-[10px] text-muted-foreground">estudante de inglês</p></div><button className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent" onClick={onToggleTheme} data-testid="button-toggle-theme">{darkMode ? <Sun size={15} /> : <Moon size={15} />}</button></div>
        </div>
      </aside>
      {open && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setOpen(false)} data-testid="button-overlay-menu" />}
      <div className="md:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-md md:px-10">
          <button onClick={() => setOpen(true)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted md:hidden" data-testid="button-open-menu"><Menu size={21} /></button>
          <div className="hidden items-center gap-2 font-mono-custom text-[10px] uppercase tracking-[.16em] text-muted-foreground md:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {formatBrasiliaLongDate(brasiliaNow)}</div>
          <div className="ml-auto flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">Seu ritmo, uma palavra por vez.</span><button onClick={onToggleTheme} className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition hover:text-primary md:hidden" data-testid="button-toggle-theme-mobile">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button></div>
        </header>
        <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-10 md:py-11">{children}</main>
      </div>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary">{eyebrow ?? 'LANGUAGE TRACKER POCKET'}</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-.04em] text-foreground md:text-[42px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>;
}

export function Surface({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-card-border bg-card shadow-[0_8px_28px_hsl(var(--foreground)/.035)] ${className}`} {...props}>{children}</div>;
}

export function LoadingState() { return <div className="space-y-4" data-testid="status-loading">{[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>; }
export function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center" data-testid="status-error"><p className="font-display text-lg font-bold">Não conseguimos carregar este pedaço.</p><p className="mt-1 text-sm text-muted-foreground">Tente novamente em alguns segundos.</p>{onRetry && <button onClick={onRetry} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground" data-testid="button-retry">Tentar novamente</button>}</div>; }
export function EmptyState({ title, description }: { title: string; description: string }) { return <div className="rounded-2xl border border-dashed border-border p-10 text-center" data-testid="status-empty"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"><BookOpen size={20} /></span><p className="mt-4 font-display font-bold">{title}</p><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p></div>; }