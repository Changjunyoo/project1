import { useState, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useTransactions, useIngredients, useUpdateIngredient, useConfirmTransaction, useRejectTransaction, useResetTransaction, useCategories, useOrigins } from "@/hooks/use-inventory";
import { TransactionForm } from "@/components/TransactionForm";
import { format } from "date-fns";
import { ShoppingCart, Search, X, Pencil, XCircle, CheckCircle, Clock } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EditableCategoryCell, EditableOriginCell } from "@/components/EditableCells";

export default function Purchases() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: ingredients } = useIngredients();
  const { mutateAsync: updateIngredient } = useUpdateIngredient();
  const { mutate: confirmTransaction, isPending: isConfirming } = useConfirmTransaction();
  const { mutate: rejectTransaction, isPending: isRejecting } = useRejectTransaction();
  const { mutate: resetTransaction, isPending: isResetting } = useResetTransaction();
  const { data: categories } = useCategories();
  const { data: origins } = useOrigins();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");

  const purchaseTransactions = transactions?.filter(tx => tx.type === "PURCHASE") || [];

  const pendingCount = purchaseTransactions.filter(tx => !tx.confirmed || tx.confirmed === "PENDING").length;
  const confirmedCount = purchaseTransactions.filter(tx => tx.confirmed === "CONFIRMED").length;
  const rejectedCount = purchaseTransactions.filter(tx => tx.confirmed === "REJECTED").length;

  const activeFilterCount = [categoryFilter, originFilter].filter(f => f !== "all").length;

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setOriginFilter("all");
  };

  const filteredTransactions = purchaseTransactions.filter(tx => {
    const ingredient = ingredients?.find(i => i.id === tx.ingredientId);
    if (!ingredient) return true;
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.supplier || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || ingredient.categoryName === categoryFilter;
    const matchesOrigin = originFilter === "all" || ingredient.originName === originFilter;
    return matchesSearch && matchesCategory && matchesOrigin;
  });

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">주문서</h1>
            <p className="text-muted-foreground mt-1">식자재 주문 내역 및 비용을 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <TransactionForm type="PURCHASE" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">이달의 사입 건수</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredTransactions.length}건</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 사입 비용</CardTitle>
              <span className="text-primary font-bold">&#8361;</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredTransactions.reduce((acc, tx) => acc + (tx.quantity * (tx.unitPrice || 0)), 0).toLocaleString()}원
              </div>
            </CardContent>
          </Card>
          <Card className={pendingCount > 0 ? "border-yellow-200 bg-yellow-50/30 dark:bg-yellow-900/10" : ""}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">배송 확인 대기</CardTitle>
              <Clock className={`h-4 w-4 ${pendingCount > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${pendingCount > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}`}>{pendingCount}건</div>
              <p className="text-xs text-muted-foreground mt-1">확인: {confirmedCount} • 거부: {rejectedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">확인된 금액</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {purchaseTransactions.filter(tx => tx.confirmed === "CONFIRMED").reduce((acc, tx) => acc + (tx.quantity * (tx.unitPrice || 0)), 0).toLocaleString()}원
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="식자재 또는 사입처 검색..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-purchase"
                />
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} data-testid="button-clear-purchase-filters">
                  <X className="w-3 h-3 mr-1" />
                  필터 초기화
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground shrink-0">카테고리</span>
                <Button
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                  data-testid="filter-purchase-category-all"
                >
                  전체
                </Button>
                {categories?.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={categoryFilter === cat.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(categoryFilter === cat.name ? "all" : cat.name)}
                    data-testid={`filter-purchase-category-${cat.name}`}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>

              {origins && origins.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">원산지</span>
                  <Button
                    variant={originFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOriginFilter("all")}
                    data-testid="filter-purchase-origin-all"
                  >
                    전체
                  </Button>
                  {origins.map((origin) => (
                    <Button
                      key={origin.id}
                      variant={originFilter === origin.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOriginFilter(originFilter === origin.name ? "all" : origin.name)}
                      data-testid={`filter-purchase-origin-${origin.name}`}
                    >
                      {origin.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">적용된 필터:</span>
                {categoryFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1" data-testid="active-purchase-filter-category">
                    카테고리: {categoryFilter}
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 no-default-hover-elevate" onClick={() => setCategoryFilter("all")} data-testid="button-remove-purchase-category-filter">
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {originFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1" data-testid="active-purchase-filter-origin">
                    원산지: {originFilter}
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 no-default-hover-elevate" onClick={() => setOriginFilter("all")} data-testid="button-remove-purchase-origin-filter">
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">날짜</th>
                  <th className="px-6 py-4">식자재</th>
                  <th className="px-6 py-4">카테고리</th>
                  <th className="px-6 py-4">원산지</th>
                  <th className="px-6 py-4">수량</th>
                  <th className="px-6 py-4">단가</th>
                  <th className="px-6 py-4">합계</th>
                  <th className="px-6 py-4">사입처</th>
                  <th className="px-6 py-4">배송 지점</th>
                  <th className="px-6 py-4">배송 확인</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">불러오는 중...</td></tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">등록된 사입 내역이 없습니다.</td></tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const ingredient = ingredients?.find(i => i.id === tx.ingredientId);
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(tx.createdAt!), "yyyy-MM-dd HH:mm")}
                        </td>
                        <td className="px-6 py-4 font-medium">{ingredient?.name || '알 수 없음'}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {ingredient ? (
                            <EditableCategoryCell ingredient={ingredient} categories={categories || []} onUpdate={updateIngredient} onFilter={setCategoryFilter} testIdPrefix="purchase-" />
                          ) : "-"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {ingredient ? (
                            <EditableOriginCell ingredient={ingredient} origins={origins || []} onUpdate={updateIngredient} onFilter={setOriginFilter} testIdPrefix="purchase-" />
                          ) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          {tx.quantity} {ingredient?.unit}
                        </td>
                        <td className="px-6 py-4">
                          &#8361;{(tx.unitPrice || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600">
                          &#8361;{(tx.quantity * (tx.unitPrice || 0)).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {tx.supplier || "-"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {tx.destination || "-"}
                        </td>
                        <td className="px-6 py-4">
                          {(tx.confirmed === "PENDING" || tx.confirmed === null || tx.confirmed === undefined) ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => confirmTransaction(tx.id)}
                                disabled={isConfirming || isRejecting}
                                data-testid={`button-confirm-${tx.id}`}
                              >
                                <CheckCircle className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => rejectTransaction(tx.id)}
                                disabled={isConfirming || isRejecting}
                                data-testid={`button-reject-${tx.id}`}
                              >
                                <XCircle className="w-5 h-5" />
                              </Button>
                            </div>
                          ) : tx.confirmed === "CONFIRMED" ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid={`status-confirmed-${tx.id}`}>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                확인됨
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 invisible group-hover:visible"
                                onClick={() => resetTransaction(tx.id)}
                                disabled={isResetting}
                                data-testid={`button-reset-${tx.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : tx.confirmed === "REJECTED" ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" data-testid={`status-rejected-${tx.id}`}>
                                <XCircle className="w-3 h-3 mr-1" />
                                거부됨
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 invisible group-hover:visible"
                                onClick={() => resetTransaction(tx.id)}
                                disabled={isResetting}
                                data-testid={`button-reset-${tx.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="gap-1" data-testid={`status-pending-${tx.id}`}>
                              <Clock className="w-3 h-3" />
                              대기중
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredTransactions.length > 0 && (
                <tfoot className="bg-muted/30 font-medium border-t-2 border-border">
                  <tr>
                    <td className="px-6 py-3" colSpan={4}>합계</td>
                    <td className="px-6 py-3">{filteredTransactions.reduce((s, tx) => s + tx.quantity, 0)}</td>
                    <td className="px-6 py-3"></td>
                    <td className="px-6 py-3 font-bold text-blue-600">
                      &#8361;{filteredTransactions.reduce((s, tx) => s + (tx.quantity * (tx.unitPrice || 0)), 0).toLocaleString()}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

