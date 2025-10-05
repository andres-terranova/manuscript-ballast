import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ManuscriptsProvider } from "@/contexts/ManuscriptsContext";
import Login from "@/components/auth/Login";
import PasswordReset from "@/components/auth/PasswordReset";
import Dashboard from "@/components/dashboard/Dashboard";
import ManuscriptWorkspace from "@/components/workspace/ManuscriptWorkspace";
import Editor from "@/components/workspace/Editor";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ManuscriptsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset" element={<PasswordReset />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/manuscript/:id/legacy" element={<ManuscriptWorkspace />} />
              <Route path="/manuscript/:id" element={<Editor />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ManuscriptsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
