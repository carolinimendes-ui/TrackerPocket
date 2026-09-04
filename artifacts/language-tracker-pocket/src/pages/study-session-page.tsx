import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, CalendarDays, Clock3, Pause, Play, RotateCcw, Sparkles, Tag, TimerReset, Trash2 } from 'lucide-react';
import {
  getGetStudySessionSummaryQueryKey,
  getListStudySessionsQueryKey,
  useCreateStudySession,
  useDeleteStudySession,
  useGetStudySessionSummary,
  useListStudySessions,
} from '@workspace/api-client-react';
import type { StudySession, StudySessionSummary } from '@workspace/api-client-react';
import { EmptyState, ErrorState, LoadingState, PageHeading, Surface } from '@/components/tracker-shell';
import { formatBrasiliaDate, formatBrasiliaTime, getBrasiliaDateKey } from '@/lib/brasilia-date';

const TIMER_STORAGE_KEY = 'language-tracker-pocket:study-timer';
const SESSION_RANGE = 30;
const CATEGORY_OPTIONS = ['Vocabulário', 'Gramática', 'Escuta', 'Conversação', 'Leitura', 'Escrita'];
const chartColors = ['bg-primary', 'bg-secondary-foreground', 'bg-accent-foreground', 'bg-chart-4', 'bg-chart-5', 'bg-muted-foreground'];

type TimerStatus = 'idle' | 'running' | 'paused';
type PersistedTimer = {
  status: Exclude<TimerStatus, 'idle'>;
  elapsedSeconds: number;
  startedAt: string;
  lastResumedAt: string;
  description?: string;
  category?: string;
};

const pad = (value: number) => String(value).padStart(2, '0');

function formatTimer(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(safeSeconds / 3600))}:${pad(Math.floor((safeSeconds % 3600) / 60))}:${pad(safeSeconds % 60)}`;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${pad(remainingMinutes)}min`;
  return `${minutes} min`;
}

function formatDate(value: string) {
  return formatBrasiliaDate(value);
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function formatTime(value: string) {
  return formatBrasiliaTime(value);
}

function localDate() {
  return getBrasiliaDateKey();
}

function readPersistedTimer(): PersistedTimer | null {
  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimer;
    if (!['running', 'paused'].includes(parsed.status) || !parsed.startedAt || !parsed.lastResumedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedTimer(timer: PersistedTimer | null) {
  if (!timer) {
    window.localStorage.removeItem(TIMER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
}

function getElapsed(timer: PersistedTimer | null, now = Date.now()) {
  if (!timer) return 0;
  if (timer.status === 'paused') return timer.elapsedSeconds;
  return timer.elapsedSeconds + Math.max(0, Math.floor((now - new Date(timer.lastResumedAt).getTime()) / 1000));
}

function ChartCard({ summary, isLoading, isError, onRetry }: { summary?: StudySessionSummary; isLoading: boolean; isError: boolean; onRetry: () => void }) {
  const daily = useMemo(() => {
    const values = [...(summary?.daily ?? [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
    return values;
  }, [summary?.daily]);
  const maxDaily = Math.max(...daily.map((item) => item.seconds), 1);
  const categories = useMemo(
    () => [...(summary?.byCategory ?? [])].sort((a, b) => b.seconds - a.seconds),
    [summary?.byCategory],
  );
  const maxCategory = Math.max(...categories.map((item) => item.seconds), 1);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={onRetry} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
      <Surface className="p-5 md:p-6" data-testid="card-daily-chart">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary"><BarChart3 size={16} /><h2 className="font-display text-lg font-bold">Ritmo diário</h2></div>
            <p className="mt-1 text-xs text-muted-foreground">Minutos registrados nos últimos dias com atividade.</p>
          </div>
          <span className="rounded-lg bg-secondary px-2.5 py-1 font-mono-custom text-[10px] text-secondary-foreground">30 dias</span>
        </div>
        {daily.length === 0 ? (
          <div className="mt-8"><EmptyState title="Seu ritmo aparece aqui" description="Pare o primeiro cronômetro para começar a formar este gráfico." /></div>
        ) : (
          <div className="mt-8 flex h-44 items-end gap-2 sm:gap-4" data-testid="chart-daily">
            {daily.map((item) => (
              <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="font-mono-custom text-[9px] text-muted-foreground">{Math.round(item.seconds / 60)}m</span>
                <div className="flex h-28 w-full items-end rounded-t-lg bg-muted/70">
                  <div
                    className="w-full rounded-t-lg bg-primary transition-[height] duration-500"
                    style={{ height: `${Math.max(7, Math.round((item.seconds / maxDaily) * 100))}%` }}
                    title={`${formatDate(item.date)} · ${formatDuration(item.seconds)}`}
                  />
                </div>
                <span className="font-mono-custom text-[9px] uppercase text-muted-foreground">
                  {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(new Date(`${dateOnly(item.date)}T12:00:00`)).replace('.', '')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <Surface className="p-5 md:p-6" data-testid="card-category-chart">
        <div className="flex items-center gap-2 text-secondary-foreground"><Tag size={16} /><h2 className="font-display text-lg font-bold">Por categoria</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Onde o seu tempo tem encontrado espaço.</p>
        {categories.length === 0 ? (
          <div className="mt-8"><EmptyState title="Sem categorias ainda" description="As categorias das suas sessões serão comparadas aqui." /></div>
        ) : (
          <div className="mt-7 space-y-5" data-testid="chart-categories">
            {categories.map((item, index) => (
              <div key={item.category}>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-semibold">{item.category}</span>
                  <span className="shrink-0 font-mono-custom text-[10px] text-muted-foreground">{formatDuration(item.seconds)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${chartColors[index % chartColors.length]} transition-[width] duration-500`} style={{ width: `${Math.max(5, Math.round((item.seconds / maxCategory) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}

function SessionRow({ session, onDelete, deleting }: { session: StudySession; onDelete: (session: StudySession) => void; deleting: boolean }) {
  return (
    <div className="group flex flex-col gap-3 border-b border-border/70 py-4 last:border-0 sm:flex-row sm:items-center sm:gap-5" data-testid={`session-row-${session.id}`}>
      <div className="flex items-center gap-3 sm:w-32 sm:shrink-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><Clock3 size={17} /></div>
        <div>
          <p className="text-xs font-bold">{formatDate(session.date)}</p>
          <p className="mt-0.5 font-mono-custom text-[10px] text-muted-foreground">{formatTime(session.startedAt)}</p>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{session.description}</p>
        <span className="mt-1 inline-flex rounded-md bg-primary/10 px-2 py-1 font-mono-custom text-[10px] text-primary">{session.category}</span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 sm:border-0 sm:pt-0">
        <span className="font-mono-custom text-xs font-medium text-foreground">{formatDuration(session.durationSeconds)}</span>
        <button
          type="button"
          onClick={() => onDelete(session)}
          disabled={deleting}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
          data-testid={`button-delete-session-${session.id}`}
          aria-label={`Apagar sessão ${session.description}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export function StudySessionPage() {
  const queryClient = useQueryClient();
  const [timer, setTimer] = useState<PersistedTimer | null>(() => readPersistedTimer());
  const [elapsedSeconds, setElapsedSeconds] = useState(() => getElapsed(readPersistedTimer()));
  const [description, setDescription] = useState(() => readPersistedTimer()?.description ?? '');
  const [category, setCategory] = useState(() => readPersistedTimer()?.category ?? CATEGORY_OPTIONS[0]);
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const sessionsQuery = useListStudySessions({ range: SESSION_RANGE });
  const summaryQuery = useGetStudySessionSummary({ range: SESSION_RANGE });
  const createSession = useCreateStudySession();
  const deleteSession = useDeleteStudySession();
  const sessions = sessionsQuery.data ?? [];

  useEffect(() => {
    savePersistedTimer(timer);
  }, [timer]);

  useEffect(() => {
    if (timer) savePersistedTimer({ ...timer, description, category });
  }, [description, category, timer]);

  useEffect(() => {
    if (!timer || timer.status !== 'running') {
      setElapsedSeconds(getElapsed(timer));
      return;
    }
    const update = () => setElapsedSeconds(getElapsed(timer));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [timer]);

  const startTimer = () => {
    const now = new Date().toISOString();
    const nextTimer: PersistedTimer = { status: 'running', elapsedSeconds: 0, startedAt: now, lastResumedAt: now, description, category };
    setSaveError('');
    setTimer(nextTimer);
    setElapsedSeconds(0);
  };

  const pauseTimer = () => {
    if (!timer) return;
    const nextTimer: PersistedTimer = { ...timer, status: 'paused', elapsedSeconds: getElapsed(timer) };
    setTimer(nextTimer);
    setElapsedSeconds(nextTimer.elapsedSeconds);
  };

  const resumeTimer = () => {
    if (!timer) return;
    const now = new Date().toISOString();
    setTimer({ ...timer, status: 'running', elapsedSeconds: getElapsed(timer), lastResumedAt: now });
  };

  const stopTimer = () => {
    if (!timer || elapsedSeconds < 1 || !description.trim() || createSession.isPending) return;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(1, getElapsed(timer));
    setSaveError('');
    createSession.mutate(
      {
        data: {
          date: localDate(),
          description: description.trim(),
          category: category.trim(),
          durationSeconds,
          startedAt: timer.startedAt,
          endedAt,
        },
      },
      {
        onSuccess: () => {
          setTimer(null);
          setElapsedSeconds(0);
          setDescription('');
          void queryClient.invalidateQueries({ queryKey: getListStudySessionsQueryKey({ range: SESSION_RANGE }) });
          void queryClient.invalidateQueries({ queryKey: getGetStudySessionSummaryQueryKey({ range: SESSION_RANGE }) });
        },
        onError: () => setSaveError('Não foi possível salvar esta sessão. O cronômetro continua pausado para você tentar novamente.'),
      },
    );
  };

  const resetTimer = () => {
    if (timer && !window.confirm('Descartar o cronômetro atual?')) return;
    setTimer(null);
    setElapsedSeconds(0);
    setSaveError('');
  };

  const handleDelete = (session: StudySession) => {
    if (!window.confirm(`Apagar a sessão “${session.description}”?`)) return;
    setDeleteError('');
    deleteSession.mutate(
      { id: session.id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListStudySessionsQueryKey({ range: SESSION_RANGE }) });
          void queryClient.invalidateQueries({ queryKey: getGetStudySessionSummaryQueryKey({ range: SESSION_RANGE }) });
        },
        onError: () => setDeleteError('Não foi possível apagar essa sessão. Tente novamente.'),
      },
    );
  };

  const queryError = sessionsQuery.isError || summaryQuery.isError;
  const timerRunning = timer?.status === 'running';
  const timerPaused = timer?.status === 'paused';
  const canStop = Boolean(timer && elapsedSeconds > 0 && description.trim() && !createSession.isPending);
  const totalTime = summaryQuery.data?.totalSeconds ?? 0;

  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="SESSÃO DE ESTUDOS"
        title="Foco que cabe no seu dia."
        description="Abra espaço para o idioma, acompanhe o tempo e deixe o histórico cuidar da memória."
        action={<div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground"><TimerReset size={15} className="text-primary" /><span>{formatDuration(totalTime)} nos últimos 30 dias</span></div>}
      />

      <Surface className="overflow-hidden border-primary/20 bg-card" data-testid="card-study-timer">
        <div className="grid lg:grid-cols-[1fr_1.1fr]">
          <div className="relative flex flex-col justify-between overflow-hidden bg-primary p-6 text-primary-foreground md:p-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[24px] border-primary-foreground/10" />
            <div className="absolute -bottom-20 left-8 h-40 w-40 rounded-full border-[18px] border-primary-foreground/10" />
            <div className="relative">
              <div className="flex items-center gap-2 font-mono-custom text-[10px] uppercase tracking-[.16em] text-primary-foreground/75"><Sparkles size={13} /> Estúdio de foco</div>
              <p className="mt-8 max-w-xs font-display text-2xl font-bold leading-tight tracking-[-.04em] md:text-3xl">Uma sessão de cada vez.</p>
            </div>
            <div className="relative mt-10">
              <p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-primary-foreground/70">{timerRunning ? 'Em andamento' : timerPaused ? 'Pausado' : 'Pronto para começar'}</p>
              <p className="mt-2 font-mono-custom text-5xl font-medium tracking-[-.08em] md:text-6xl" data-testid="timer-display">{formatTimer(elapsedSeconds)}</p>
              {timer && <p className="mt-3 text-xs text-primary-foreground/75">Começou às {formatTime(timer.startedAt)}</p>}
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="font-mono-custom text-[10px] font-medium uppercase tracking-[.13em] text-muted-foreground">O que você vai estudar?</span>
                <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: revisar os verbos irregulares" className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" data-testid="input-session-description" />
              </label>
              <label className="grid gap-2">
                <span className="font-mono-custom text-[10px] font-medium uppercase tracking-[.13em] text-muted-foreground">Categoria</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" data-testid="select-session-category">
                  {CATEGORY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {!timer && <button type="button" onClick={startTimer} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_6px_16px_hsl(var(--primary)/.18)] transition hover:-translate-y-0.5 sm:flex-none" data-testid="button-start-timer"><Play size={16} fill="currentColor" /> Começar</button>}
              {timerRunning && <button type="button" onClick={pauseTimer} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground sm:flex-none" data-testid="button-pause-timer"><Pause size={16} fill="currentColor" /> Pausar</button>}
              {timerPaused && <button type="button" onClick={resumeTimer} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_6px_16px_hsl(var(--primary)/.18)] sm:flex-none" data-testid="button-resume-timer"><Play size={16} fill="currentColor" /> Retomar</button>}
              {timer && <button type="button" onClick={stopTimer} disabled={!canStop} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/25 px-5 py-3.5 text-sm font-bold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none" data-testid="button-stop-timer"><span className="h-2.5 w-2.5 rounded-sm bg-current" /> {createSession.isPending ? 'Salvando...' : 'Parar e salvar'}</button>}
              {timer && <button type="button" onClick={resetTimer} className="rounded-xl border border-border p-3.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Descartar cronômetro" data-testid="button-reset-timer"><RotateCcw size={16} /></button>}
            </div>
            {!description.trim() && timer && <p className="mt-3 text-xs text-muted-foreground">Adicione uma descrição para habilitar o salvamento.</p>}
            {saveError && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" data-testid="status-save-error">{saveError}</p>}
          </div>
        </div>
      </Surface>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Surface className="p-5" data-testid="metric-session-total">
          <div className="flex items-center justify-between">
            <span className="font-mono-custom text-[10px] font-medium uppercase tracking-[.13em] text-muted-foreground">Tempo total</span>
            <TimerReset size={16} className="text-primary" />
          </div>
          <p className="mt-4 font-display text-2xl font-bold tracking-[-.04em]">{formatDuration(summaryQuery.data?.totalSeconds ?? 0)}</p>
          <p className="mt-1 text-xs text-muted-foreground">nos últimos 30 dias</p>
        </Surface>
        <Surface className="p-5" data-testid="metric-session-average">
          <div className="flex items-center justify-between">
            <span className="font-mono-custom text-[10px] font-medium uppercase tracking-[.13em] text-muted-foreground">Média por dia ativo</span>
            <Clock3 size={16} className="text-secondary-foreground" />
          </div>
          <p className="mt-4 font-display text-2xl font-bold tracking-[-.04em]">{formatDuration(summaryQuery.data?.averageSeconds ?? 0)}</p>
          <p className="mt-1 text-xs text-muted-foreground">ritmo médio de presença</p>
        </Surface>
        <Surface className="p-5" data-testid="metric-session-count">
          <div className="flex items-center justify-between">
            <span className="font-mono-custom text-[10px] font-medium uppercase tracking-[.13em] text-muted-foreground">Sessões concluídas</span>
            <CalendarDays size={16} className="text-accent-foreground" />
          </div>
          <p className="mt-4 font-display text-2xl font-bold tracking-[-.04em]">{summaryQuery.data?.totalSessions ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">em {summaryQuery.data?.activeDays ?? 0} dias ativos</p>
        </Surface>
      </div>

      <div className="mt-5">
        {queryError ? (
          <ErrorState onRetry={() => { void sessionsQuery.refetch(); void summaryQuery.refetch(); }} />
        ) : (
          <ChartCard summary={summaryQuery.data} isLoading={summaryQuery.isLoading} isError={summaryQuery.isError} onRetry={() => void summaryQuery.refetch()} />
        )}
      </div>

      <Surface className="mt-5 p-5 md:p-6" data-testid="card-recent-sessions">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="flex items-center gap-2 text-foreground"><CalendarDays size={17} className="text-primary" /><h2 className="font-display text-lg font-bold">Sessões recentes</h2></div><p className="mt-1 text-xs text-muted-foreground">Os seus últimos registros de foco, sempre à mão.</p></div>
          {sessions.length > 0 && <span className="font-mono-custom text-[10px] uppercase tracking-[.12em] text-muted-foreground">{sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'}</span>}
        </div>
        {deleteError && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" data-testid="status-delete-error">{deleteError}</p>}
        {sessionsQuery.isLoading ? <div className="mt-5"><LoadingState /></div> : sessionsQuery.isError ? <div className="mt-5"><ErrorState onRetry={() => void sessionsQuery.refetch()} /></div> : sessions.length === 0 ? <div className="mt-5"><EmptyState title="Nenhuma sessão concluída" description="Quando você parar o cronômetro, o registro aparece neste espaço." /></div> : (
          <div className="mt-4">
            {[...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).map((session) => <SessionRow key={session.id} session={session} onDelete={handleDelete} deleting={deleteSession.isPending} />)}
          </div>
        )}
      </Surface>
    </div>
  );
}

export default StudySessionPage;