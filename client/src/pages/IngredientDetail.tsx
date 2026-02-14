import { useParams } from "wouter";
import { Sidebar } from "@/components/Sidebar";
import { useIngredient, useTransactions } from "@/hooks/use-inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { TransactionForm } from "@/components/TransactionForm";
import { ArrowLeft, Package, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function IngredientDetail() {
  const { id } = useParams<{ id: string }>();
  const ingredientId = parseInt(id);
  const { data: ingredient, isLoading: loadingIng } = useIngredient(ingredientId);
  const { data: transactions, isLoading: loadingTx } = useTransactions(ingredientId);

  if (loadingIng || loadingTx) {
    return (
      <div className="flex bg-muted/20 min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!ingredient) return <div>식자재를 찾을 수 없습니다.</div>;

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <Link href="/inventory" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> 목록으로 돌아가기
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                {ingredient.name}
                <StatusBadge current={ingredient.currentStock} min={ingredient.minStockLevel} />
              </h1>
              <p className="text-muted-foreground mt-1">
                브랜드: <span className="font-medium text-foreground">{ingredient.brand || "-"}</span> • 
                기본 단위: <span className="font-medium text-foreground">{ingredient.unit}</span> • 
                최소 재고: <span className="font-medium text-foreground">{ingredient.minStockLevel}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <TransactionForm type="OUT" preselectedIngredientId={ingredient.id} />
              <TransactionForm type="IN" preselectedIngredientId={ingredient.id} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">현재 재고</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-foreground">{ingredient.currentStock}</div>
                  <div className="text-sm text-muted-foreground">{ingredient.unit} 보유 중</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                입출고 히스토리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions?.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">기록된 내역이 없습니다.</p>
                ) : (
                  transactions?.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white/50 hover:bg-white transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${tx.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                          {tx.type === 'IN' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {tx.type === 'IN' ? '입고' : '출고'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.createdAt!), "yyyy-MM-dd • HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.type === 'IN' ? 'text-green-600' : 'text-orange-600'}`}>
                          {tx.type === 'IN' ? '+' : '-'}{tx.quantity} {ingredient.unit}
                        </p>
                        {tx.type === 'IN' && tx.unitPrice && (
                          <p className="text-xs text-muted-foreground">@ ₩{tx.unitPrice.toLocaleString()}/{ingredient.unit}</p>
                        )}
                        {tx.type === 'OUT' && tx.destination && (
                          <p className="text-xs text-muted-foreground">출고처: {tx.destination}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
