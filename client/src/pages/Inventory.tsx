import { useState, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CreateIngredientDialog } from "@/components/CreateIngredientDialog";
import { EditIngredientDialog } from "@/components/EditIngredientDialog";
import { TransactionForm } from "@/components/TransactionForm";
import { StatusBadge } from "@/components/StatusBadge";
import { useIngredients, useDeleteIngredient } from "@/hooks/use-inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MoreVertical, Trash2, History, X } from "lucide-react";
import { Link } from "wouter";
import { INGREDIENT_CATEGORIES } from "@shared/schema";

export default function Inventory() {
  const { data: ingredients, isLoading } = useIngredients();
  const { mutate: deleteIngredient } = useDeleteIngredient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const uniqueBrands = useMemo(() => {
    if (!ingredients) return [];
    const brands = [...new Set(ingredients.map(i => i.brand).filter(Boolean))] as string[];
    return brands.sort();
  }, [ingredients]);

  const uniqueOrigins = useMemo(() => {
    if (!ingredients) return [];
    const origins = [...new Set(ingredients.map(i => i.origin).filter(Boolean))] as string[];
    return origins.sort();
  }, [ingredients]);

  const activeFilterCount = [categoryFilter, brandFilter, originFilter].filter(f => f !== "all").length;

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setBrandFilter("all");
    setOriginFilter("all");
  };

  const filteredIngredients = ingredients?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesBrand = brandFilter === "all" || item.brand === brandFilter;
    const matchesOrigin = originFilter === "all" || item.origin === originFilter;
    return matchesSearch && matchesCategory && matchesBrand && matchesOrigin;
  });

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">식자재 관리</h1>
            <p className="text-muted-foreground mt-1">식자재 품목과 재고 수준을 관리합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <TransactionForm type="OUT" />
            <TransactionForm type="IN" />
            <CreateIngredientDialog />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="식자재 검색..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} data-testid="button-clear-filters">
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
                  data-testid="filter-category-all"
                >
                  전체
                </Button>
                {INGREDIENT_CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoryFilter === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
                    data-testid={`filter-category-${cat}`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {uniqueBrands.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">브랜드</span>
                  <Button
                    variant={brandFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBrandFilter("all")}
                    data-testid="filter-brand-all"
                  >
                    전체
                  </Button>
                  {uniqueBrands.map((brand) => (
                    <Button
                      key={brand}
                      variant={brandFilter === brand ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBrandFilter(brandFilter === brand ? "all" : brand)}
                      data-testid={`filter-brand-${brand}`}
                    >
                      {brand}
                    </Button>
                  ))}
                </div>
              )}

              {uniqueOrigins.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">원산지</span>
                  <Button
                    variant={originFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOriginFilter("all")}
                    data-testid="filter-origin-all"
                  >
                    전체
                  </Button>
                  {uniqueOrigins.map((origin) => (
                    <Button
                      key={origin}
                      variant={originFilter === origin ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOriginFilter(originFilter === origin ? "all" : origin)}
                      data-testid={`filter-origin-${origin}`}
                    >
                      {origin}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">적용된 필터:</span>
                {categoryFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1" data-testid="active-filter-category">
                    카테고리: {categoryFilter}
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 no-default-hover-elevate" onClick={() => setCategoryFilter("all")} data-testid="button-remove-category-filter">
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {brandFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1" data-testid="active-filter-brand">
                    브랜드: {brandFilter}
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 no-default-hover-elevate" onClick={() => setBrandFilter("all")} data-testid="button-remove-brand-filter">
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {originFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1" data-testid="active-filter-origin">
                    원산지: {originFilter}
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 no-default-hover-elevate" onClick={() => setOriginFilter("all")} data-testid="button-remove-origin-filter">
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">품목명</th>
                  <th className="px-6 py-4">카테고리</th>
                  <th className="px-6 py-4">브랜드</th>
                  <th className="px-6 py-4">원산지</th>
                  <th className="px-6 py-4">상태</th>
                  <th className="px-6 py-4">현재 재고</th>
                  <th className="px-6 py-4">단위</th>
                  <th className="px-6 py-4">유통기한</th>
                  <th className="px-6 py-4">최소 재고</th>
                  <th className="px-6 py-4 text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground">식자재 목록을 불러오는 중...</td>
                  </tr>
                ) : filteredIngredients?.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  filteredIngredients?.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <Link href={`/inventory/${item.id}`} className="hover:text-primary transition-colors">
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {item.category ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-muted-foreground"
                            onClick={() => setCategoryFilter(item.category!)}
                            data-testid={`cell-category-${item.id}`}
                          >
                            {item.category}
                          </Button>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {item.brand ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-muted-foreground"
                            onClick={() => setBrandFilter(item.brand!)}
                            data-testid={`cell-brand-${item.id}`}
                          >
                            {item.brand}
                          </Button>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {item.origin ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-muted-foreground"
                            onClick={() => setOriginFilter(item.origin!)}
                            data-testid={`cell-origin-${item.id}`}
                          >
                            {item.origin}
                          </Button>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge current={item.currentStock} min={item.minStockLevel} />
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">{item.currentStock}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.unit}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.shelfLifeDays ? `${item.shelfLifeDays}일` : "-"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.minStockLevel}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-1">
                        <EditIngredientDialog ingredient={item} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/inventory/${item.id}`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <History className="w-4 h-4 mr-2" />
                                히스토리 보기
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              onSelect={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 해당 식자재와 모든 입출고 내역을 영구적으로 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteId) deleteIngredient(deleteId);
                setDeleteId(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
