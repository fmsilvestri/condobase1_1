import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/notification-bell";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Maintenance from "@/pages/maintenance";
import Pool from "@/pages/pool";
import Water from "@/pages/water";
import Gas from "@/pages/gas";
import Energy from "@/pages/energy";
import Waste from "@/pages/waste";
import Occupancy from "@/pages/occupancy";
import Documents from "@/pages/documents";
import Suppliers from "@/pages/suppliers";
import Announcements from "@/pages/announcements";
import Admin from "@/pages/admin";
import Login from "@/pages/login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/manutencoes" component={Maintenance} />
      <Route path="/piscina" component={Pool} />
      <Route path="/agua" component={Water} />
      <Route path="/gas" component={Gas} />
      <Route path="/energia" component={Energy} />
      <Route path="/residuos" component={Waste} />
      <Route path="/ocupacao" component={Occupancy} />
      <Route path="/documentos" component={Documents} />
      <Route path="/fornecedores" component={Suppliers} />
      <Route path="/comunicados" component={Announcements} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, loading, signOut, userName, userRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar userName={userName} userRole={userRole} onSignOut={signOut} />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 lg:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
