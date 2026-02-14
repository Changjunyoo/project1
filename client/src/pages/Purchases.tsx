import { Sidebar } from "@/components/Sidebar";
import { useTransactions, useIngredients } from "@/hooks/use-inventory";
import { TransactionForm } from "@/components/TransactionForm";
import { format } from "date-fns";
import { ShoppingCart, Package, Calendar } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";

export default function Purchases() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: ingredients } = useIngredients();

  const purchaseTransactions = transactions?.filter(tx => tx.type === "PURCHASE") || [];

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">사입 관리</h1>
            <p className="text-muted-foreground mt-1">식자재 사입 내역 및 비용을 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <TransactionForm type="PURCHASE" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">이달의 사입 건수</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchaseTransactions.length}건</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 사입 비용</CardTitle>
              <span className="text-primary font-bold">₩</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {purchaseTransactions.reduce((acc, tx) => acc + (tx.quantity * (tx.unitPrice || 0)), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">날짜</th>
                  <th className="px-6 py-4">식자재</th>
                  <th className="px-6 py-4">수량</th>
                  <th className="px-6 py-4">단가</th>
                  <th className="px-6 py-4">합계</th>
                  <th className="px-6 py-4">사입처</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">불러오는 중...</td></tr>
                ) : purchaseTransactions.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">등록된 사입 내역이 없습니다.</td></tr>
                ) : (
                  purchaseTransactions.map((tx) => {
                    const ingredient = ingredients?.find(i => i.id === tx.ingredientId);
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(tx.createdAt!), "yyyy-MM-dd HH:mm")}
                        </td>
                        <td className="px-6 py-4 font-medium">{ingredient?.name || '알 수 없음'}</td>
                        <td className="px-6 py-4">
                          {tx.quantity} {ingredient?.unit}
                        </td>
                        <td className="px-6 py-4">
                          ₩{(tx.unitPrice || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600">
                          ₩{(tx.quantity * (tx.unitPrice || 0)).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {tx.supplier || "-"}
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
