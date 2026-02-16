import { Sidebar } from "@/components/Sidebar";
import { useTransactions, useIngredients, useBranches, useUpdateTransaction, useDeleteTransaction } from "@/hooks/use-inventory";
import { TransactionForm } from "@/components/TransactionForm";
import { format } from "date-fns";
import { ArrowUpRight, MapPin, Package, Building2, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
  quantity: number;
  destination: string;
}

export default function OutgoingByBranch() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: ingredients } = useIngredients();
  const { data: registeredBranches } = useBranches();
  const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useDeleteTransaction();
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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

  const startEdit = (tx: Transaction) => {
    setEditingTx({
      id: tx.id,
      quantity: tx.quantity,
      destination: tx.destination || "",
    });
  };

  const cancelEdit = () => {
    setEditingTx(null);
  };

  const saveEdit = async () => {
    if (!editingTx) return;
    try {
      await updateTransaction({
        id: editingTx.id,
        quantity: editingTx.quantity,
        destination: editingTx.destination || undefined,
      });
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
            <TransactionForm key={selectedBranch || "all"} type="OUT" preselectedDestination={selectedBranch || undefined} />
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
                  <th className="px-6 py-4">단위</th>
                  <th className="px-6 py-4">출고 수량</th>
                  <th className="px-6 py-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">불러오는 중...</td></tr>
                ) : displayedTransactions.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {selectedBranch ? `"${selectedBranch}" 지점의 출고 내역이 없습니다.` : "등록된 출고 내역이 없습니다."}
                  </td></tr>
                ) : (
                  displayedTransactions.map((tx) => {
                    const ingredient = ingredients?.find(i => i.id === tx.ingredientId);
                    const isRegistered = registeredBranches?.some(b => b.name === tx.destination);
                    const isEditing = editingTx?.id === tx.id;

                    if (isEditing) {
                      return (
                        <tr key={tx.id} className="bg-primary/5" data-testid={`row-transaction-${tx.id}`}>
                          <td className="px-6 py-3 text-muted-foreground">
                            {format(new Date(tx.createdAt!), "yyyy-MM-dd HH:mm")}
                          </td>
                          <td className="px-6 py-3">
                            {registeredBranches && registeredBranches.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {registeredBranches.map((b) => (
                                  <Button
                                    key={b.id}
                                    type="button"
                                    variant={editingTx.destination === b.name ? "default" : "outline"}
                                    size="sm"
                                    className="text-xs h-7"
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
                                className="h-8 w-32 text-sm"
                                placeholder="지점명"
                              />
                            )}
                          </td>
                          <td className="px-6 py-3 font-medium">{ingredient?.name || "알 수 없음"}</td>
                          <td className="px-6 py-3 text-muted-foreground">{ingredient?.unit || "-"}</td>
                          <td className="px-6 py-3">
                            <Input
                              type="number"
                              min="1"
                              value={editingTx.quantity}
                              onChange={(e) => setEditingTx({ ...editingTx, quantity: e.target.value === "" ? ("" as any) : parseInt(e.target.value) || 1 })}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => { if (e.target.value === "") setEditingTx({ ...editingTx, quantity: 1 }); }}
                              className="h-8 w-20 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={saveEdit}
                                disabled={isUpdating}
                              >
                                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={cancelEdit}
                                disabled={isUpdating}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors group" data-testid={`row-transaction-${tx.id}`}>
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
                        <td className="px-6 py-4 text-muted-foreground">{ingredient?.unit || "-"}</td>
                        <td className="px-6 py-4">
                          <span className="text-orange-600 font-bold">
                            -{tx.quantity} {ingredient?.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => startEdit(tx)}
                              data-testid={`button-edit-${tx.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteId(tx.id)}
                              data-testid={`button-delete-${tx.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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

        <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>출고 내역 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTxData && deleteIngredient ? (
                  <>
                    <span className="font-medium text-foreground">{deleteIngredient.name}</span>
                    {" "}{deleteTxData.quantity}{deleteIngredient.unit} 출고 내역을 삭제하시겠습니까?
                    <br />
                    <span className="text-sm">삭제 시 재고가 복구됩니다.</span>
                  </>
                ) : (
                  "이 출고 내역을 삭제하시겠습니까?"
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
