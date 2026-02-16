import { useParams } from "wouter";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useIngredient, useTransactions, useUpdateTransaction, useDeleteTransaction, useBranches } from "@/hooks/use-inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { TransactionForm } from "@/components/TransactionForm";
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
import { ArrowLeft, Package, Calendar, ArrowUpRight, ArrowDownRight, ShoppingCart, Pencil, Trash2, Check, X, Loader2, Clock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from "@shared/schema";

interface EditState {
  id: number;
  quantity: number | "";
  unitPrice: number | "" | null;
  destination: string;
  supplier: string;
  department: string;
  personName: string;
}

export default function IngredientDetail() {
  const { id } = useParams<{ id: string }>();
  const ingredientId = parseInt(id);
  const { data: ingredient, isLoading: loadingIng } = useIngredient(ingredientId);
  const { data: transactions, isLoading: loadingTx } = useTransactions(ingredientId);
  const { data: branches } = useBranches();
  const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useDeleteTransaction();

  const [editingTx, setEditingTx] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const startEdit = (tx: Transaction) => {
    setEditingTx({
      id: tx.id,
      quantity: tx.quantity,
      unitPrice: tx.unitPrice ?? null,
      destination: tx.destination || "",
      supplier: tx.supplier || "",
      department: tx.department || "",
      personName: tx.personName || "",
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
    payload.department = editingTx.department || undefined;
    payload.personName = editingTx.personName || undefined;

    try {
      await updateTransaction(payload as any);
      setEditingTx(null);
    } catch { /* toast handled by hook */ }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteTransaction(deleteId);
      setDeleteId(null);
    } catch { /* toast handled by hook */ }
  };

  const deleteTxData = deleteId !== null ? transactions?.find(tx => tx.id === deleteId) : null;

  // Compute nearest expiry from IN/PURCHASE transactions
  const nearestExpiry = transactions
    ?.filter(tx => (tx.type === "IN" || tx.type === "PURCHASE") && tx.expiryDate)
    .map(tx => new Date(tx.expiryDate!))
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;

  const daysRemaining = nearestExpiry
    ? Math.floor((nearestExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
                원산지: <span className="font-medium text-foreground">{ingredient.originName || "-"}</span> • 
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
          {/* Current Stock Card */}
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

          {/* Shelf Life / Expiry Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                유통기한 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">유통기한(일)</span>
                  <span className="font-medium">{ingredient.shelfLifeDays ? `${ingredient.shelfLifeDays}일` : "-"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">최근 만료일</span>
                  <span className="font-medium">{nearestExpiry ? format(nearestExpiry, "yyyy-MM-dd") : "-"}</span>
                </div>
                {daysRemaining !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">남은 일수</span>
                    <Badge className={
                      daysRemaining < 0
                        ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-100"
                        : daysRemaining <= 3
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-50"
                        : daysRemaining <= 7
                        ? "bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                        : "bg-green-50 text-green-700 border-green-300 hover:bg-green-50"
                    }>
                      {daysRemaining < 0 ? `만료됨 (${Math.abs(daysRemaining)}일 초과)` : `${daysRemaining}일 남음`}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transaction summary */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">내역 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">총 입고</span>
                  <span className="font-medium text-green-600">
                    +{transactions?.filter(tx => tx.type === "IN").reduce((s, tx) => s + tx.quantity, 0) || 0} {ingredient.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">총 출고</span>
                  <span className="font-medium text-orange-600">
                    -{transactions?.filter(tx => tx.type === "OUT").reduce((s, tx) => s + tx.quantity, 0) || 0} {ingredient.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">총 사입</span>
                  <span className="font-medium text-blue-600">
                    +{transactions?.filter(tx => tx.type === "PURCHASE").reduce((s, tx) => s + tx.quantity, 0) || 0} {ingredient.unit}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="text-sm font-medium">전체 내역</span>
                  <span className="font-medium">{transactions?.length || 0}건</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="mt-8 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              입출고 히스토리
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions?.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">기록된 내역이 없습니다.</p>
                  <p className="text-muted-foreground text-xs mt-1">위의 입고/출고 버튼으로 첫 내역을 등록해 보세요.</p>
                </div>
              ) : (
                transactions?.map((tx) => {
                  const isEditing = editingTx?.id === tx.id;
                  const canEdit = !(tx.type === "PURCHASE" && tx.confirmed === "CONFIRMED");

                  if (isEditing && editingTx) {
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            tx.type === 'IN' ? 'bg-green-100 text-green-600' 
                            : tx.type === 'PURCHASE' ? 'bg-blue-100 text-blue-600'
                            : 'bg-orange-100 text-orange-600'
                          }`}>
                            {tx.type === 'IN' ? <ArrowDownRight className="w-4 h-4" /> 
                             : tx.type === 'PURCHASE' ? <ShoppingCart className="w-4 h-4" />
                             : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="font-medium text-sm">
                              {tx.type === 'IN' ? '입고' : tx.type === 'PURCHASE' ? '사입' : '출고'}
                              <span className="text-xs text-muted-foreground ml-2">{format(new Date(tx.createdAt!), "yyyy-MM-dd HH:mm")}</span>
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">수량:</span>
                                <Input
                                  type="number" min="1"
                                  value={editingTx.quantity}
                                  onChange={(e) => setEditingTx({ ...editingTx, quantity: e.target.value === "" ? "" : parseInt(e.target.value) || 1 })}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={(e) => { if (e.target.value === "") setEditingTx({ ...editingTx, quantity: 1 }); }}
                                  className="h-7 w-20 text-xs"
                                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                />
                              </div>
                              {(tx.type === "IN" || tx.type === "PURCHASE") && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">단가:</span>
                                  <Input
                                    type="number" min="0"
                                    value={editingTx.unitPrice ?? ""}
                                    onChange={(e) => setEditingTx({ ...editingTx, unitPrice: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })}
                                    onFocus={(e) => e.target.select()}
                                    onBlur={(e) => { if (e.target.value === "") setEditingTx({ ...editingTx, unitPrice: 0 }); }}
                                    className="h-7 w-24 text-xs"
                                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                  />
                                </div>
                              )}
                              {(tx.type === "OUT" || tx.type === "PURCHASE") && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">{tx.type === "PURCHASE" ? "배송:" : "출고처:"}</span>
                                  {branches && branches.length > 0 ? (
                                    <div className="flex gap-1 flex-wrap">
                                      {branches.map((b) => (
                                        <Button key={b.id} type="button"
                                          variant={editingTx.destination === b.name ? "default" : "outline"}
                                          size="sm" className="text-xs h-6 px-2"
                                          onClick={() => setEditingTx({ ...editingTx, destination: b.name })}
                                        >{b.name}</Button>
                                      ))}
                                    </div>
                                  ) : (
                                    <Input
                                      value={editingTx.destination}
                                      onChange={(e) => setEditingTx({ ...editingTx, destination: e.target.value })}
                                      className="h-7 w-28 text-xs" placeholder="출고처"
                                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                    />
                                  )}
                                </div>
                              )}
                              {tx.type === "PURCHASE" && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">사입처:</span>
                                  <Input
                                    value={editingTx.supplier}
                                    onChange={(e) => setEditingTx({ ...editingTx, supplier: e.target.value })}
                                    className="h-7 w-28 text-xs" placeholder="사입처"
                                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">부서:</span>
                                <Input
                                  value={editingTx.department}
                                  onChange={(e) => setEditingTx({ ...editingTx, department: e.target.value })}
                                  className="h-7 w-24 text-xs" placeholder="부서"
                                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">담당자:</span>
                                <Input
                                  value={editingTx.personName}
                                  onChange={(e) => setEditingTx({ ...editingTx, personName: e.target.value })}
                                  className="h-7 w-24 text-xs" placeholder="담당자"
                                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={saveEdit} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={cancelEdit} disabled={isUpdating}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  // Normal row
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white/50 hover:bg-white transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tx.type === 'IN' ? 'bg-green-100 text-green-600' 
                          : tx.type === 'PURCHASE' ? 'bg-blue-100 text-blue-600'
                          : 'bg-orange-100 text-orange-600'
                        }`}>
                          {tx.type === 'IN' ? <ArrowDownRight className="w-4 h-4" /> 
                           : tx.type === 'PURCHASE' ? <ShoppingCart className="w-4 h-4" />
                           : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {tx.type === 'IN' ? '입고' : tx.type === 'PURCHASE' ? '사입' : '출고'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.createdAt!), "yyyy-MM-dd • HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`font-bold ${
                            tx.type === 'IN' ? 'text-green-600' 
                            : tx.type === 'PURCHASE' ? 'text-blue-600'
                            : 'text-orange-600'
                          }`}>
                            {tx.type === 'IN' || tx.type === 'PURCHASE' ? '+' : '-'}{tx.quantity} {ingredient.unit}
                          </p>
                          {(tx.type === 'IN' || tx.type === 'PURCHASE') && tx.unitPrice != null && (
                            <p className="text-xs text-muted-foreground">@ ₩{tx.unitPrice.toLocaleString()}/{ingredient.unit}</p>
                          )}
                          {tx.type === 'OUT' && tx.destination && (
                            <p className="text-xs text-muted-foreground">출고처: {tx.destination}</p>
                          )}
                          {tx.type === 'PURCHASE' && tx.destination && (
                            <p className="text-xs text-muted-foreground">배송 지점: {tx.destination}</p>
                          )}
                          {tx.type === 'PURCHASE' && tx.supplier && (
                            <p className="text-xs text-muted-foreground">사입처: {tx.supplier}</p>
                          )}
                          {tx.expiryDate && (
                            <p className="text-xs text-muted-foreground">유통기한: {format(new Date(tx.expiryDate), "yyyy-MM-dd")}</p>
                          )}
                          {tx.department && (
                            <p className="text-xs text-muted-foreground">부서: {tx.department}</p>
                          )}
                          {tx.personName && (
                            <p className="text-xs text-muted-foreground">담당자: {tx.personName}</p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => startEdit(tx)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteId(tx.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delete confirmation */}
        <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>내역 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTxData ? (
                  <>
                    {deleteTxData.quantity}{ingredient.unit}{" "}
                    {deleteTxData.type === "IN" ? "입고" : deleteTxData.type === "OUT" ? "출고" : "사입"} 내역을 삭제하시겠습니까?
                    <br />
                    <span className="text-sm">
                      {deleteTxData.type === "IN"
                        ? "삭제 시 해당 수량만큼 재고가 차감됩니다."
                        : deleteTxData.type === "OUT"
                        ? "삭제 시 해당 수량만큼 재고가 복구됩니다."
                        : "삭제 시 사입 내역이 제거됩니다."}
                    </span>
                  </>
                ) : "이 내역을 삭제하시겠습니까?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
