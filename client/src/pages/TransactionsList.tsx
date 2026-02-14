import { Sidebar } from "@/components/Sidebar";
import { useTransactions, useIngredients } from "@/hooks/use-inventory";
import { TransactionForm } from "@/components/TransactionForm";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function TransactionsList() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: ingredients } = useIngredients();

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">입출고 내역</h1>
            <p className="text-muted-foreground mt-1">모든 재고 이동 현황의 전체 이력입니다.</p>
          </div>
          <div className="flex gap-2">
            <TransactionForm type="OUT" />
            <TransactionForm type="IN" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">날짜</th>
                  <th className="px-6 py-4">유형</th>
                  <th className="px-6 py-4">식자재</th>
                  <th className="px-6 py-4">수량</th>
                  <th className="px-6 py-4">상세 내역</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">불러오는 중...</td></tr>
                ) : transactions?.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">입출고 내역이 없습니다.</td></tr>
                ) : (
                  transactions?.map((tx) => {
                    const ingredient = ingredients?.find(i => i.id === tx.ingredientId);
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(tx.createdAt!), "yyyy-MM-dd HH:mm")}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tx.type === 'IN' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {tx.type === 'IN' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {tx.type === 'IN' ? '입고' : '출고'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">{ingredient?.name || '알 수 없음'}</td>
                        <td className="px-6 py-4">
                          <span className={tx.type === 'IN' ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                            {tx.type === 'IN' ? '+' : '-'}{tx.quantity} {ingredient?.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {tx.type === 'IN' && tx.unitPrice && `단가: ₩${tx.unitPrice.toLocaleString()}`}
                          {tx.type === 'OUT' && tx.destination && `출고처: ${tx.destination}`}
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
