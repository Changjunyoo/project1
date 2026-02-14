import { Sidebar } from "@/components/Sidebar";
import { useTransactions, useIngredients, useBranches } from "@/hooks/use-inventory";
import { TransactionForm } from "@/components/TransactionForm";
import { format } from "date-fns";
import { ArrowUpRight, MapPin, Package, Building2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OutgoingByBranch() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: ingredients } = useIngredients();
  const { data: registeredBranches } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const outTransactions = transactions?.filter(tx => tx.type === "OUT") || [];

  const txByBranch = new Map<string, typeof outTransactions>();
  outTransactions.forEach(tx => {
    const branch = tx.destination || "미지정";
    if (!txByBranch.has(branch)) txByBranch.set(branch, []);
    txByBranch.get(branch)!.push(tx);
  });

  const allBranchNames = new Set<string>();
  registeredBranches?.forEach(b => allBranchNames.add(b.name));
  txByBranch.forEach((_, name) => allBranchNames.add(name));

  const branchEntries = Array.from(allBranchNames).map(name => ({
    name,
    count: txByBranch.get(name)?.length || 0,
    totalQty: (txByBranch.get(name) || []).reduce((s, tx) => s + tx.quantity, 0),
    isRegistered: registeredBranches?.some(b => b.name === name) || false,
  })).sort((a, b) => b.count - a.count);

  const displayedTransactions = selectedBranch
    ? txByBranch.get(selectedBranch) || []
    : outTransactions;

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">지점별 출고</h1>
            <p className="text-muted-foreground mt-1">지점별 출고 현황을 확인합니다.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/branches">
              <Button variant="outline" data-testid="link-branch-management">
                <Building2 className="w-4 h-4 mr-2" />
                지점 관리
              </Button>
            </Link>
            <TransactionForm type="OUT" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 출고 건수</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-out-count">{outTransactions.length}건</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">등록 지점</CardTitle>
              <Building2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-registered-branch-count">{registeredBranches?.length || 0}곳</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">출고 지점</CardTitle>
              <MapPin className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-branch-count">{txByBranch.size}곳</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 출고 수량</CardTitle>
              <Package className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-out-qty">
                {outTransactions.reduce((acc, tx) => acc + tx.quantity, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedBranch === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedBranch(null)}
            data-testid="button-filter-all"
          >
            전체
          </Button>
          {branchEntries.map((entry) => (
            <Button
              key={entry.name}
              variant={selectedBranch === entry.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedBranch(entry.name)}
              data-testid={`button-filter-branch-${entry.name}`}
            >
              {entry.isRegistered ? (
                <Building2 className="w-3 h-3 mr-1" />
              ) : (
                <MapPin className="w-3 h-3 mr-1" />
              )}
              {entry.name}
              <Badge variant="secondary" className="ml-1.5 no-default-active-elevate">{entry.count}</Badge>
            </Button>
          ))}
        </div>

        {selectedBranch && (() => {
          const entry = branchEntries.find(e => e.name === selectedBranch);
          const registered = registeredBranches?.find(b => b.name === selectedBranch);
          if (!entry) return null;
          return (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {entry.isRegistered ? (
                        <Building2 className="w-5 h-5 text-primary" />
                      ) : (
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedBranch}</h3>
                      {registered?.address && (
                        <p className="text-sm text-muted-foreground">{registered.address}</p>
                      )}
                      {!entry.isRegistered && (
                        <p className="text-xs text-muted-foreground">미등록 지점</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">출고 건수</p>
                      <p className="text-xl font-bold">{entry.count}건</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">총 출고량</p>
                      <p className="text-xl font-bold">{entry.totalQty.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">날짜</th>
                  <th className="px-6 py-4">지점</th>
                  <th className="px-6 py-4">식자재</th>
                  <th className="px-6 py-4">출고 수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">불러오는 중...</td></tr>
                ) : displayedTransactions.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">
                    {selectedBranch ? `"${selectedBranch}" 지점의 출고 내역이 없습니다.` : "등록된 출고 내역이 없습니다."}
                  </td></tr>
                ) : (
                  displayedTransactions.map((tx) => {
                    const ingredient = ingredients?.find(i => i.id === tx.ingredientId);
                    const isRegistered = registeredBranches?.some(b => b.name === tx.destination);
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-transaction-${tx.id}`}>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(tx.createdAt!), "yyyy-MM-dd HH:mm")}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1">
                            {isRegistered ? (
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <span className="font-medium">{tx.destination || "미지정"}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">{ingredient?.name || "알 수 없음"}</td>
                        <td className="px-6 py-4">
                          <span className="text-orange-600 font-bold">
                            -{tx.quantity} {ingredient?.unit}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
