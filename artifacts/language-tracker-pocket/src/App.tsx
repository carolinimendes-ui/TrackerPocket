import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { TrackerShell } from '@/components/tracker-shell';
import { CaizPage, DashboardPage, HistoryPage, MonthlySummaryPage, PlaylistsPage, ProgressPage, RegisterPage, SettingsPage } from '@/pages/tracker-pages';
import StudySessionPage from '@/pages/study-session-page';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('language-tracker-dark') === 'true');
  useEffect(() => {
    localStorage.setItem('language-tracker-dark', String(darkMode));
  }, [darkMode]);
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <TrackerShell darkMode={darkMode} onToggleTheme={() => setDarkMode(value => !value)}>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/sessao" component={StudySessionPage} />
          <Route path="/progresso" component={ProgressPage} />
          <Route path="/caiz" component={CaizPage} />
          <Route path="/historico" component={HistoryPage} />
          <Route path="/resumo-mensal" component={MonthlySummaryPage} />
          <Route path="/playlists" component={PlaylistsPage} />
          <Route path="/configuracoes"><SettingsPage onThemeChange={setDarkMode} /></Route>
          <Route component={NotFound} />
        </Switch>
      </TrackerShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
