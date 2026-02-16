import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import IngredientDetail from "@/pages/IngredientDetail";
import TransactionsList from "@/pages/TransactionsList";
import Purchases from "@/pages/Purchases";
import OutgoingByBranch from "@/pages/OutgoingByBranch";
import BranchManagement from "@/pages/BranchManagement";
import CategoryOriginManagement from "@/pages/CategoryOriginManagement";
import NotFound from "@/pages/not-found";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/inventory/:id" component={IngredientDetail} />
      <Route path="/transactions" component={TransactionsList} />
      <Route path="/purchases" component={Purchases} />
      <Route path="/outgoing" component={OutgoingByBranch} />
      <Route path="/branches" component={BranchManagement} />
      <Route path="/settings/categories" component={CategoryOriginManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
