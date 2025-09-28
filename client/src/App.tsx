import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HouseholdSetup from "./pages/HouseholdSetup";
import Devices from "./pages/Devices";
import Appliances from "./pages/Appliances";
import Battery from "./pages/Battery";
import Forecasting from "./pages/Forecasting";
import Community from "./pages/Community";
import Analytics from "./pages/Analytics";
import Algorithms from "./pages/Algorithms";
import NotFound from "./pages/not-found";

function AuthenticatedApp() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/household-setup" component={HouseholdSetup} />
        <Route path="/devices" component={Devices} />
        <Route path="/appliances" component={Appliances} />
        <Route path="/battery" component={Battery} />
        <Route path="/forecasting" component={Forecasting} />
        <Route path="/community" component={Community} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/algorithms" component={Algorithms} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function UnauthenticatedApp() {
  return (
    <Switch>
      <Route path="/register" component={Register} />
      <Route path="/*" component={Login} />
    </Switch>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <UnauthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
