import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./components/layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Networks from "./pages/Networks";
import Changes from "./pages/Changes";
import Vulnerabilities from "./pages/Vulnerabilities";
import Detections from "./pages/Detections";
import LogsQueries from "./pages/LogsQueries";
import Incidents from "./pages/Incidents";
import Runbooks from "./pages/Runbooks";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="secnet-theme">
      <TooltipProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <Toaster />
            <Sonner position="top-right" />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<DashboardLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="assets" element={<Assets />} />
                  <Route path="networks" element={<Networks />} />
                  <Route path="changes" element={<Changes />} />
                  <Route path="vulnerabilities" element={<Vulnerabilities />} />
                  <Route path="detections" element={<Detections />} />
                  <Route path="logs" element={<LogsQueries />} />
                  <Route path="incidents" element={<Incidents />} />
                  <Route path="runbooks" element={<Runbooks />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </WorkspaceProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
