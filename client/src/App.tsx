import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AIModels from "./pages/AIModels";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import History from "./pages/History";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Templates from "./pages/Templates";
import TestCases from "./pages/TestCases";
import Users from "./pages/Users";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/documents">
        <DashboardLayout>
          <Documents />
        </DashboardLayout>
      </Route>
      <Route path="/test-cases">
        <DashboardLayout>
          <TestCases />
        </DashboardLayout>
      </Route>
      <Route path="/templates">
        <DashboardLayout>
          <Templates />
        </DashboardLayout>
      </Route>
      <Route path="/history">
        <DashboardLayout>
          <History />
        </DashboardLayout>
      </Route>
      <Route path="/ai-models">
        <DashboardLayout>
          <AIModels />
        </DashboardLayout>
      </Route>
      <Route path="/users">
        <DashboardLayout>
          <Users />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
