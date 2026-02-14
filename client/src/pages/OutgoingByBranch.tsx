import { Sidebar } from "@/components/Sidebar";
import { useTransactions, useIngredients } from "@/hooks/use-inventory";
import { TransactionForm } from "@/components/TransactionForm";
import { format } from "date-fns";
import { ArrowUpRight, MapPin, Package } from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OutgoingByBranch() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: ingredients } = useIngredients();
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const outTransactions = transactions?.filter(tx => tx.type === "OUT") || [];

  const branchMap = new Map<string, typeof outTransactions>();
  outTransactions.forEach(tx => {
    const branch = tx.destination || "미지정";
    if (!branchMap.has(branch)) branchMap.set(branch, []);
    branchMap.get(branch)!.push(tx);
  });

  const branches = Array.from(branchMap.entries()).sort((a, b) => b[1].length - a[1].length);

  const displayedTransactions = selectedBranch
    ? branchMap.get(selectedBranch) || []
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
          <div className="flex gap-2">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">총 지점 수</CardTitle>
              <MapPin className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-branch-count">{branches.length}곳</div>
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
          {branches.map(([branch, txs]) => (
            <Button
              key={branch}
              variant={selectedBranch === branch ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedBranch(branch)}
              data-testid={`button-filter-branch-${branch}`}
            >
              <MapPin className="w-3 h-3 mr-1" />
              {branch}
              <Badge variant="secondary" className="ml-1.5 no-default-active-elevate">{txs.length}</Badge>
            </Button>
          ))}
        </div>

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
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-transaction-${tx.id}`}>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(tx.createdAt!), "yyyy-MM-dd HH:mm")}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
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
