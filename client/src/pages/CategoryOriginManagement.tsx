import { useState, useMemo, type FormEvent } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useOrigins,
  useCreateOrigin,
  useDeleteOrigin,
  useIngredients,
  useTransactions,
} from "@/hooks/use-inventory";
import {
  Tags,
  Globe,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { IngredientWithNames, Transaction } from "@shared/schema";

// --- Helper types ---

interface IngredientExpiryInfo {
  ingredient: IngredientWithNames;
  /** The shelf-life declared on the ingredient (days) */
  shelfLifeDays: number | null;
  /** Nearest expiry date from confirmed IN/PURCHASE transactions */
  nearestExpiryDate: Date | null;
  /** Days remaining until that nearest expiry. Negative = already expired */
  daysRemaining: number | null;
}

type ExpiryStatus = "expired" | "danger" | "warning" | "safe" | "none";

function getExpiryStatus(info: IngredientExpiryInfo): ExpiryStatus {
  if (info.daysRemaining === null) return "none";
  if (info.daysRemaining < 0) return "expired";
  if (info.daysRemaining <= 3) return "danger";
  if (info.daysRemaining <= 7) return "warning";
  return "safe";
}

function getExpiryBadge(status: ExpiryStatus, days: number | null) {
  switch (status) {
    case "expired":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100">
          <XCircle className="w-3 h-3 mr-1" />
          만료됨 ({Math.abs(days!)}일 초과)
        </Badge>
      );
    case "danger":
      return (
        <Badge className="bg-red-50 text-red-600 border-red-200 hover:bg-red-50">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {days}일 남음
        </Badge>
      );
    case "warning":
      return (
        <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-50">
          <Clock className="w-3 h-3 mr-1" />
          {days}일 남음
        </Badge>
      );
    case "safe":
      return (
        <Badge className="bg-green-50 text-green-700 border-green-300 hover:bg-green-50">
          <CheckCircle className="w-3 h-3 mr-1" />
          {days}일 남음
        </Badge>
      );
    case "none":
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          유통기한 없음
        </Badge>
      );
  }
}

function getExpiryProgressColor(status: ExpiryStatus): string {
  switch (status) {
    case "expired":
    case "danger":
      return "bg-red-500";
    case "warning":
      return "bg-yellow-500";
    case "safe":
      return "bg-green-500";
    default:
      return "bg-gray-300";
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// --- Main component ---

export default function CategoryOriginManagement() {
  const { data: categories, isLoading: loadingCat } = useCategories();
  const { mutate: createCategory, isPending: isCreatingCat } = useCreateCategory();
  const { mutate: deleteCategory } = useDeleteCategory();

  const { data: origins, isLoading: loadingOrigin } = useOrigins();
  const { mutate: createOrigin, isPending: isCreatingOrigin } = useCreateOrigin();
  const { mutate: deleteOrigin } = useDeleteOrigin();

  const { data: ingredientList } = useIngredients();
  const { data: transactionList } = useTransactions();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newOriginName, setNewOriginName] = useState("");

  // Track expanded categories/origins
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [expandedOrigins, setExpandedOrigins] = useState<Set<number>>(new Set());

  const toggleCategory = (id: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleOrigin = (id: number) => {
    setExpandedOrigins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build expiry info for each ingredient
  const expiryMap = useMemo(() => {
    if (!ingredientList || !transactionList) return new Map<number, IngredientExpiryInfo>();

    const now = new Date();
    const map = new Map<number, IngredientExpiryInfo>();

    for (const ing of ingredientList) {
      // Find IN/PURCHASE transactions for this ingredient that have expiryDate
      const txsForIng = transactionList
        .filter(
          (tx: Transaction) =>
            tx.ingredientId === ing.id &&
            (tx.type === "IN" || tx.type === "PURCHASE") &&
            tx.expiryDate !== null &&
            tx.expiryDate !== undefined
        )
        .map((tx: Transaction) => ({
          ...tx,
          expiryDate: new Date(tx.expiryDate!),
        }))
        // Only consider future or recently-expired
        .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

      // Nearest expiry = the soonest expiry date (could be past = expired)
      const nearest = txsForIng.length > 0 ? txsForIng[0] : null;

      let nearestExpiryDate: Date | null = null;
      let daysRemaining: number | null = null;

      if (nearest) {
        nearestExpiryDate = nearest.expiryDate;
        daysRemaining = Math.floor(
          (nearest.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      map.set(ing.id, {
        ingredient: ing,
        shelfLifeDays: ing.shelfLifeDays,
        nearestExpiryDate,
        daysRemaining,
      });
    }

    return map;
  }, [ingredientList, transactionList]);

  // Group ingredients by categoryId
  const ingredientsByCategory = useMemo(() => {
    if (!ingredientList) return new Map<number, IngredientExpiryInfo[]>();
    const map = new Map<number, IngredientExpiryInfo[]>();
    for (const ing of ingredientList) {
      if (!ing.categoryId) continue;
      const info = expiryMap.get(ing.id);
      if (!info) continue;
      if (!map.has(ing.categoryId)) map.set(ing.categoryId, []);
      map.get(ing.categoryId)!.push(info);
    }
    return map;
  }, [ingredientList, expiryMap]);

  // Group ingredients by originId
  const ingredientsByOrigin = useMemo(() => {
    if (!ingredientList) return new Map<number, IngredientExpiryInfo[]>();
    const map = new Map<number, IngredientExpiryInfo[]>();
    for (const ing of ingredientList) {
      if (!ing.originId) continue;
      const info = expiryMap.get(ing.id);
      if (!info) continue;
      if (!map.has(ing.originId)) map.set(ing.originId, []);
      map.get(ing.originId)!.push(info);
    }
    return map;
  }, [ingredientList, expiryMap]);

  // Summary stats
  const expiryStats = useMemo(() => {
    const items = Array.from(expiryMap.values());
    const withExpiry = items.filter((i) => i.nearestExpiryDate !== null);
    const expired = withExpiry.filter((i) => i.daysRemaining !== null && i.daysRemaining < 0);
    const danger = withExpiry.filter(
      (i) => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 3
    );
    const warning = withExpiry.filter(
      (i) => i.daysRemaining !== null && i.daysRemaining > 3 && i.daysRemaining <= 7
    );
    return { total: items.length, withExpiry: withExpiry.length, expired: expired.length, danger: danger.length, warning: warning.length };
  }, [expiryMap]);

  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategory(
      { name: newCategoryName.trim() },
      { onSuccess: () => setNewCategoryName("") }
    );
  };

  const handleAddOrigin = (e: FormEvent) => {
    e.preventDefault();
    if (!newOriginName.trim()) return;
    createOrigin(
      { name: newOriginName.trim() },
      { onSuccess: () => setNewOriginName("") }
    );
  };

  // Helper to render ingredient expiry rows
  const renderIngredientRows = (items: IngredientExpiryInfo[]) => {
    // Sort: expired first, then by daysRemaining ascending
    const sorted = [...items].sort((a, b) => {
      if (a.daysRemaining === null && b.daysRemaining === null) return 0;
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

    return (
      <div className="bg-muted/20 border-t border-border">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/50">
          <div className="col-span-3">식자재명</div>
          <div className="col-span-2">유통기한(일)</div>
          <div className="col-span-2">최근 만료일</div>
          <div className="col-span-2">남은 일수</div>
          <div className="col-span-3">상태</div>
        </div>
        {sorted.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground text-center">
            등록된 식자재가 없습니다.
          </div>
        ) : (
          sorted.map((info) => {
            const status = getExpiryStatus(info);
            const progressValue =
              info.shelfLifeDays && info.daysRemaining !== null
                ? Math.max(0, Math.min(100, (info.daysRemaining / info.shelfLifeDays) * 100))
                : 0;

            return (
              <div
                key={info.ingredient.id}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="col-span-3 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{info.ingredient.name}</span>
                    {info.ingredient.brand && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({info.ingredient.brand})
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-sm">
                  {info.shelfLifeDays ? (
                    <span>{info.shelfLifeDays}일</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <div className="col-span-2 text-sm">
                  {info.nearestExpiryDate ? (
                    <span>{formatDate(info.nearestExpiryDate)}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <div className="col-span-2">
                  {info.daysRemaining !== null && info.shelfLifeDays ? (
                    <div className="space-y-1">
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all ${getExpiryProgressColor(status)}`}
                          style={{ width: `${progressValue}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
                <div className="col-span-3">{getExpiryBadge(status, info.daysRemaining)}</div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  // Compute per-category / per-origin summary
  const getCategorySummary = (catId: number) => {
    const items = ingredientsByCategory.get(catId) || [];
    const withExpiry = items.filter((i) => i.nearestExpiryDate !== null);
    const expired = withExpiry.filter((i) => getExpiryStatus(i) === "expired").length;
    const danger = withExpiry.filter((i) => getExpiryStatus(i) === "danger").length;
    const warning = withExpiry.filter((i) => getExpiryStatus(i) === "warning").length;
    return { total: items.length, expired, danger, warning };
  };

  const getOriginSummary = (originId: number) => {
    const items = ingredientsByOrigin.get(originId) || [];
    const withExpiry = items.filter((i) => i.nearestExpiryDate !== null);
    const expired = withExpiry.filter((i) => getExpiryStatus(i) === "expired").length;
    const danger = withExpiry.filter((i) => getExpiryStatus(i) === "danger").length;
    const warning = withExpiry.filter((i) => getExpiryStatus(i) === "warning").length;
    return { total: items.length, expired, danger, warning };
  };

  const renderSummaryBadges = (summary: { total: number; expired: number; danger: number; warning: number }) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {summary.total > 0 && (
        <span className="text-xs text-muted-foreground">{summary.total}개 품목</span>
      )}
      {summary.expired > 0 && (
        <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100 text-[10px] px-1.5 py-0">
          만료 {summary.expired}
        </Badge>
      )}
      {summary.danger > 0 && (
        <Badge className="bg-red-50 text-red-600 border-red-200 hover:bg-red-50 text-[10px] px-1.5 py-0">
          긴급 {summary.danger}
        </Badge>
      )}
      {summary.warning > 0 && (
        <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-50 text-[10px] px-1.5 py-0">
          주의 {summary.warning}
        </Badge>
      )}
    </div>
  );

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">카테고리 / 원산지 관리</h1>
          <p className="text-muted-foreground mt-1">
            식자재 분류에 사용하는 카테고리와 원산지를 관리하고, 유통기한 현황을 확인합니다.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">등록된 카테고리</CardTitle>
              <Tags className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories?.length || 0}개</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">등록된 원산지</CardTitle>
              <Globe className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{origins?.length || 0}개</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">유통기한 만료/임박</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {expiryStats.expired + expiryStats.danger}개
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                만료 {expiryStats.expired} / 3일 이내 {expiryStats.danger}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">유통기한 주의</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{expiryStats.warning}개</div>
              <p className="text-xs text-muted-foreground mt-0.5">7일 이내 만료 예정</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Categories Section */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Tags className="w-5 h-5 text-blue-500" />
                카테고리
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                식자재를 분류하는 카테고리입니다. 클릭하면 유통기한 현황을 볼 수 있습니다.
              </p>
            </div>

            <div className="p-4 border-b border-border">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <Input
                  placeholder="새 카테고리 이름"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  data-testid="input-new-category"
                />
                <Button
                  type="submit"
                  disabled={isCreatingCat || !newCategoryName.trim()}
                  data-testid="button-add-category"
                >
                  {isCreatingCat ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>

            <div className="divide-y divide-border">
              {loadingCat ? (
                <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>
              ) : !categories || categories.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  등록된 카테고리가 없습니다.
                </div>
              ) : (
                categories.map((cat) => {
                  const isExpanded = expandedCategories.has(cat.id);
                  const summary = getCategorySummary(cat.id);
                  return (
                    <div key={cat.id} data-testid={`row-category-${cat.id}`}>
                      <div
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => toggleCategory(cat.id)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <Tags className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">{cat.name}</span>
                          {renderSummaryBadges(summary)}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-delete-category-${cat.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{cat.name}" 카테고리를 삭제하시겠습니까?
                                이 카테고리를 사용하는 식자재의 카테고리가 비어있게 됩니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCategory(cat.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                data-testid={`button-confirm-delete-category-${cat.id}`}
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {isExpanded && renderIngredientRows(ingredientsByCategory.get(cat.id) || [])}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Origins Section */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-500" />
                원산지
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                식자재의 원산지입니다. 클릭하면 유통기한 현황을 볼 수 있습니다.
              </p>
            </div>

            <div className="p-4 border-b border-border">
              <form onSubmit={handleAddOrigin} className="flex gap-2">
                <Input
                  placeholder="새 원산지 이름"
                  value={newOriginName}
                  onChange={(e) => setNewOriginName(e.target.value)}
                  data-testid="input-new-origin"
                />
                <Button
                  type="submit"
                  disabled={isCreatingOrigin || !newOriginName.trim()}
                  data-testid="button-add-origin"
                >
                  {isCreatingOrigin ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>

            <div className="divide-y divide-border">
              {loadingOrigin ? (
                <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>
              ) : !origins || origins.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  등록된 원산지가 없습니다.
                </div>
              ) : (
                origins.map((origin) => {
                  const isExpanded = expandedOrigins.has(origin.id);
                  const summary = getOriginSummary(origin.id);
                  return (
                    <div key={origin.id} data-testid={`row-origin-${origin.id}`}>
                      <div
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => toggleOrigin(origin.id)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">{origin.name}</span>
                          {renderSummaryBadges(summary)}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-delete-origin-${origin.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>원산지 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{origin.name}" 원산지를 삭제하시겠습니까?
                                이 원산지를 사용하는 식자재의 원산지가 비어있게 됩니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteOrigin(origin.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                data-testid={`button-confirm-delete-origin-${origin.id}`}
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {isExpanded && renderIngredientRows(ingredientsByOrigin.get(origin.id) || [])}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
