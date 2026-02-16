import { Sidebar } from "@/components/Sidebar";
import { useTransactions, useIngredients, useBranches, useUpdateTransaction, useDeleteTransaction } from "@/hooks/use-inventory";
import { TransactionForm } from "@/components/TransactionForm";
import { format } from "date-fns";
import {
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Filter,
  Search,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { Transaction } from "@shared/schema";

interface EditState {
  id: number;
  quantity: number | "";
  unitPrice: number | "" | null;
  destination: string;
  supplier: string;
}

type TypeFilter = "ALL" | "IN" | "OUT" | "PURCHASE";

export default function TransactionsList() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: ingredients } = useIngredients();
  const { data: branches } = useBranches();
  const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useDeleteTransaction();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTx, setEditingTx] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filteredTransactions = (typeFilter === "ALL"
    ? transactions
    : transactions?.filter(tx => tx.type === typeFilter)
  )?.filter(tx => {
    if (!searchTerm.trim()) return true;
    const ingredient = ingredients?.find(i => i.id === tx.ingredientId);
    const term = searchTerm.toLowerCase();
    return (
      (ingredient?.name || "").toLowerCase().includes(term) ||
      (tx.destination || "").toLowerCase().includes(term) ||
      (tx.supplier || "").toLowerCase().includes(term)
    );
  });

  const startEdit = (tx: Transaction) => {
    setEditingTx({
      id: tx.id,
      quantity: tx.quantity,
      unitPrice: tx.unitPrice ?? null,
      destination: tx.destination || "",
      supplier: tx.supplier || "",
    });
  };

  const cancelEdit = () => setEditingTx(null);

  const saveEdit = async () => {
    if (!editingTx) return;
    const tx = transactions?.find(t => t.id === editingTx.id);
    if (!tx) return;

    const payload: Record<string, any> = {
      id: editingTx.id,
      quantity: editingTx.quantity === "" ? tx.quantity : editingTx.quantity,
    };

    if (tx.type === "IN" || tx.type === "PURCHASE") {
      payload.unitPrice = editingTx.unitPrice === "" ? 0 : (editingTx.unitPrice ?? undefined);
    }
    if (tx.type === "OUT" || tx.type === "PURCHASE") {
      payload.destination = editingTx.destination || undefined;
    }
    if (tx.type === "PURCHASE") {
      payload.supplier = editingTx.supplier || undefined;
    }

    try {
      await updateTransaction(payload as any);
      setEditingTx(null);
    } catch {
      // toast handled by hook
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteTransaction(deleteId);
      setDeleteId(null);
    } catch {
      // toast handled by hook
    }
  };

  const deleteTxData = deleteId !== null ? transactions?.find(tx => tx.id === deleteId) : null;
  const deleteIngredient = deleteTxData ? ingredients?.find(i => i.id === deleteTxData.ingredientId) : null;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "IN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <ArrowDownRight className="w-3 h-3" />
            입고
          </span>
        );
      case "OUT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <ArrowUpRight className="w-3 h-3" />
            출고
          </span>
        );
      case "PURCHASE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <ShoppingCart className="w-3 h-3" />
            사입
          </span>
        );
      default:
        return <span>{type}</span>;
    }
  };

  const getQuantityDisplay = (tx: Transaction, unit?: string) => {
    const prefix = tx.type === "IN" || tx.type === "PURCHASE" ? "+" : "-";
    const colorClass = tx.type === "IN"
      ? "text-green-600"
      : tx.type === "PURCHASE"
      ? "text-blue-600"
      : "text-orange-600";
    return (
      <span className={`${colorClass} font-bold`}>
        {prefix}{tx.quantity} {unit}
      </span>
    );
  };

  const filterButtons: { value: TypeFilter; label: string; count: number }[] = [
    { value: "ALL", label: "전체", count: transactions?.length || 0 },
    { value: "IN", label: "입고", count: transactions?.filter(t => t.type === "IN").length || 0 },
    { value: "OUT", label: "출고", count: transactions?.filter(t => t.type === "OUT").length || 0 },
    { value: "PURCHASE", label: "사입", count: transactions?.filter(t => t.type === "PURCHASE").length || 0 },
  ];

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

        {/* Search + Type filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="식자재, 출고처, 사입처 검색..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-transactions"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
          {filterButtons.map((fb) => (
            <Button
              key={fb.value}
              variant={typeFilter === fb.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(fb.value)}
              data-testid={`button-filter-${fb.value.toLowerCase()}`}
            >
              {fb.label}
              <Badge variant="secondary" className="ml-1.5">{fb.count}</Badge>
            </Button>
          ))}
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
                  <th className="px-6 py-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">불러오는 중...</td></tr>
                ) : !filteredTransactions || filteredTransactions.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {typeFilter === "ALL" ? "입출고 내역이 없습니다." : `${filterButtons.find(f => f.value === typeFilter)?.label} 내역이 없습니다.`}
                  </td></tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const ingredient = ingredients?.find(i => i.id === tx.ingredientId);
                    const isEditing = editingTx?.id === tx.id;

                    if (isEditing && editingTx) {
                      return (
                        <tr key={tx.id} className="bg-primary/5" data-testid={`row-transaction-${tx.id}`}>
                          <td className="px-6 py-3 text-muted-foreground">
                            {format(new Date(tx.createdAt!), "yyyy-MM-dd HH:mm")}
                          </td>
                          <td className="px-6 py-3">
                            {getTypeBadge(tx.type)}
                          </td>
                          <td className="px-6 py-3 font-medium">
                            {ingredient?.name || "알 수 없음"}
                          </td>
                          <td className="px-6 py-3">
                            <Input
                              type="number"
                              min="1"
                              value={editingTx.quantity}
                              onChange={(e) => setEditingTx({
                                ...editingTx,
                                quantity: e.target.value === "" ? "" : parseInt(e.target.value) || 1,
                              })}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => { if (e.target.value === "") setEditingTx({ ...editingTx, quantity: 1 }); }}
                              className="h-8 w-20 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              data-testid={`input-edit-quantity-${tx.id}`}
                            />
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col gap-2">
                              {/* Unit Price for IN/PURCHASE */}
                              {(tx.type === "IN" || tx.type === "PURCHASE") && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">단가:</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={editingTx.unitPrice ?? ""}
                                    onChange={(e) => setEditingTx({
                                      ...editingTx,
                                      unitPrice: e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                                    })}
                                    onFocus={(e) => e.target.select()}
                                    onBlur={(e) => { if (e.target.value === "") setEditingTx({ ...editingTx, unitPrice: 0 }); }}
                                    className="h-7 w-24 text-xs"
                                    placeholder="단가"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEdit();
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    data-testid={`input-edit-price-${tx.id}`}
                                  />
                                </div>
                              )}
                              {/* Destination for OUT/PURCHASE */}
                              {(tx.type === "OUT" || tx.type === "PURCHASE") && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {tx.type === "PURCHASE" ? "배송:" : "출고처:"}
                                  </span>
                                  {branches && branches.length > 0 ? (
                                    <div className="flex gap-1 flex-wrap">
                                      {branches.map((b) => (
                                        <Button
                                          key={b.id}
                                          type="button"
                                          variant={editingTx.destination === b.name ? "default" : "outline"}
                                          size="sm"
                                          className="text-xs h-6 px-2"
                                          onClick={() => setEditingTx({ ...editingTx, destination: b.name })}
                                        >
                                          {b.name}
                                        </Button>
                                      ))}
                                    </div>
                                  ) : (
                                    <Input
                                      value={editingTx.destination}
                                      onChange={(e) => setEditingTx({ ...editingTx, destination: e.target.value })}
                                      className="h-7 w-28 text-xs"
                                      placeholder="출고처"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveEdit();
                                        if (e.key === "Escape") cancelEdit();
                                      }}
                                      data-testid={`input-edit-dest-${tx.id}`}
                                    />
                                  )}
                                </div>
                              )}
                              {/* Supplier for PURCHASE */}
                              {tx.type === "PURCHASE" && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">사입처:</span>
                                  <Input
                                    value={editingTx.supplier}
                                    onChange={(e) => setEditingTx({ ...editingTx, supplier: e.target.value })}
                                    className="h-7 w-28 text-xs"
                                    placeholder="사입처"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEdit();
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    data-testid={`input-edit-supplier-${tx.id}`}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={saveEdit}
                                disabled={isUpdating}
                                data-testid={`button-save-${tx.id}`}
                              >
                                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={cancelEdit}
                                disabled={isUpdating}
                                data-testid={`button-cancel-${tx.id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Normal (non-editing) row
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors group" data-testid={`row-transaction-${tx.id}`}>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(tx.createdAt!), "yyyy-MM-dd HH:mm")}
                        </td>
                        <td className="px-6 py-4">
                          {getTypeBadge(tx.type)}
                        </td>
                        <td className="px-6 py-4 font-medium">{ingredient?.name || "알 수 없음"}</td>
                        <td className="px-6 py-4">
                          {getQuantityDisplay(tx, ingredient?.unit)}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          <div className="flex flex-col gap-0.5">
                            {(tx.type === "IN" || tx.type === "PURCHASE") && tx.unitPrice != null && (
                              <span>단가: ₩{tx.unitPrice.toLocaleString()}</span>
                            )}
                            {tx.type === "OUT" && tx.destination && (
                              <span>출고처: {tx.destination}</span>
                            )}
                            {tx.type === "PURCHASE" && tx.destination && (
                              <span>배송 지점: {tx.destination}</span>
                            )}
                            {tx.type === "PURCHASE" && tx.supplier && (
                              <span>사입처: {tx.supplier}</span>
                            )}
                            {tx.type === "PURCHASE" && tx.confirmed && (
                              <span>
                                상태:{" "}
                                <Badge
                                  variant={tx.confirmed === "CONFIRMED" ? "default" : tx.confirmed === "REJECTED" ? "destructive" : "secondary"}
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {tx.confirmed === "CONFIRMED" ? "확인됨" : tx.confirmed === "REJECTED" ? "거부됨" : "대기중"}
                                </Badge>
                              </span>
                            )}
                            {tx.expiryDate && (
                              <span>유통기한: {format(new Date(tx.expiryDate), "yyyy-MM-dd")}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Don't allow editing confirmed PURCHASE */}
                            {!(tx.type === "PURCHASE" && tx.confirmed === "CONFIRMED") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => startEdit(tx)}
                                data-testid={`button-edit-${tx.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {!(tx.type === "PURCHASE" && tx.confirmed === "CONFIRMED") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteId(tx.id)}
                                data-testid={`button-delete-${tx.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>내역 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTxData && deleteIngredient ? (
                  <>
                    <span className="font-medium text-foreground">{deleteIngredient.name}</span>
                    {" "}{deleteTxData.quantity}{deleteIngredient.unit}{" "}
                    {deleteTxData.type === "IN" ? "입고" : deleteTxData.type === "OUT" ? "출고" : "사입"} 내역을 삭제하시겠습니까?
                    <br />
                    <span className="text-sm">
                      {deleteTxData.type === "IN"
                        ? "삭제 시 해당 수량만큼 재고가 차감됩니다."
                        : deleteTxData.type === "OUT"
                        ? "삭제 시 해당 수량만큼 재고가 복구됩니다."
                        : deleteTxData.confirmed === "CONFIRMED"
                        ? "확인된 사입 내역은 삭제할 수 없습니다."
                        : "삭제 시 사입 내역이 제거됩니다."}
                    </span>
                  </>
                ) : (
                  "이 내역을 삭제하시겠습니까?"
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
