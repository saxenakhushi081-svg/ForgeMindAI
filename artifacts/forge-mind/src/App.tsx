import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import NotFound from '@/pages/not-found';

import Landing from './pages/landing';
import Login from './pages/login';
import Signup from './pages/signup';
import ForgotPassword from './pages/forgot-password';
import Dashboard from './pages/dashboard';
import Documents from './pages/documents';
import Chat from './pages/chat';
import KnowledgeGraphPage from './pages/knowledge-graph';
import RCA from './pages/rca';
import Compliance from './pages/compliance';
import Notifications from './pages/notifications';
import Settings from './pages/settings';
import Admin from './pages/admin';

const queryClient = new QueryClient();

function ProtectedApp() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/documents" component={Documents} />
        <Route path="/chat" component={Chat} />
        <Route path="/knowledge-graph" component={KnowledgeGraphPage} />
        <Route path="/rca" component={RCA} />
        <Route path="/compliance" component={Compliance} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/:rest*">
        <ProtectedRoute>
          <ProtectedApp />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;