import { useIngredients, useTransactions } from "@/hooks/use-inventory";
import { Sidebar } from "@/components/Sidebar";
import { TransactionForm } from "@/components/TransactionForm";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Package, AlertTriangle, ArrowUpRight, ShoppingCart, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: ingredients, isLoading: loadingIng } = useIngredients();
  const { data: transactions, isLoading: loadingTx } = useTransactions();

  // Calculate stats
  const totalIngredients = ingredients?.length || 0;
  const lowStockItems = ingredients?.filter(i => i.currentStock <= i.minStockLevel) || [];
  const recentTransactions = transactions?.slice(0, 5) || [];

  // Chart data: Top 5 ingredients by stock
  const chartData = ingredients
    ?.sort((a, b) => b.currentStock - a.currentStock)
    .slice(0, 5)
    .map(i => ({
      name: i.name,
      stock: i.currentStock
    })) || [];

  if (loadingIng || loadingTx) return <DashboardSkeleton />;

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8 animate-enter">
          <h1 className="text-3xl font-bold text-foreground">대시보드</h1>
          <p className="text-muted-foreground mt-2">재고 상태 및 최근 활동 요약입니다.</p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-enter" style={{ animationDelay: "100ms" }}>
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체 식자재</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalIngredients}</div>
              <p className="text-xs text-muted-foreground mt-1">등록된 품목 수</p>
            </CardContent>
          </Card>

          <Card className="card-hover border-orange-200 bg-orange-50/30 dark:bg-orange-900/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">재고 부족 알림</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{lowStockItems.length}</div>
              <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">최소 재고 미달 품목</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">이달의 활동</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">기록된 입출고 건수</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-enter" style={{ animationDelay: "200ms" }}>
          {/* Main Chart */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>보유 재고 상위 품목</CardTitle>
              <CardDescription>현재 재고량이 가장 많은 상위 5개 품목입니다.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748B" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">최근 활동이 없습니다.</p>
                ) : (
                  recentTransactions.map((tx) => {
                    const ingredient = ingredients?.find(i => i.id === tx.ingredientId);
                    return (
                      <div key={tx.id} className="flex items-start gap-4">
                        <div className={`mt-1 p-1.5 rounded-full ${
                          tx.type === 'IN' ? 'bg-green-100 text-green-600' 
                          : tx.type === 'PURCHASE' ? 'bg-blue-100 text-blue-600' 
                          : 'bg-orange-100 text-orange-600'
                        }`}>
                          {tx.type === 'PURCHASE' 
                            ? <ShoppingCart className="w-3 h-3" />
                            : <ArrowUpRight className={`w-3 h-3 ${tx.type === 'IN' ? 'rotate-180' : ''}`} />
                          }
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {tx.type === 'IN' ? '입고' : tx.type === 'PURCHASE' ? '사입' : '출고'}: {ingredient?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.quantity} {ingredient?.unit} • {formatDistanceToNow(new Date(tx.createdAt!), { addSuffix: true, locale: ko })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts Table */}
        {lowStockItems.length > 0 && (
          <div className="mt-8 animate-enter" style={{ animationDelay: "300ms" }}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-orange-500 w-5 h-5" />
              재고 부족 알림
            </h3>
            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium">
                  <tr>
                    <th className="px-6 py-4">품목명</th>
                    <th className="px-6 py-4">현재 재고</th>
                    <th className="px-6 py-4">최소 재고</th>
                    <th className="px-6 py-4">상태</th>
                    <th className="px-6 py-4 text-right">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{item.name}</td>
                      <td className="px-6 py-4">{item.currentStock} {item.unit}</td>
                      <td className="px-6 py-4">{item.minStockLevel} {item.unit}</td>
                      <td className="px-6 py-4">
                        <StatusBadge current={item.currentStock} min={item.minStockLevel} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <TransactionForm type="IN" preselectedIngredientId={item.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex bg-muted/20 min-h-screen">
      <div className="w-64 bg-card border-r border-border h-screen fixed" />
      <main className="flex-1 ml-64 p-8">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </main>
    </div>
  );
}
