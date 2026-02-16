import { type ReactNode, type FormEvent } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch, useTransactions, useIngredients } from "@/hooks/use-inventory";
import { useState, useMemo } from "react";
import { MapPin, Plus, Pencil, Trash2, Loader2, ArrowUpRight, Package } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import type { Branch } from "@shared/schema";

function BranchFormDialog({
  branch,
  trigger,
}: {
  branch?: Branch;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(branch?.name || "");
  const [address, setAddress] = useState(branch?.address || "");

  const { mutate: createBranch, isPending: isCreating } = useCreateBranch();
  const { mutate: updateBranch, isPending: isUpdating } = useUpdateBranch();
  const isPending = isCreating || isUpdating;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (branch) {
      updateBranch(
        { id: branch.id, name: name.trim(), address: address.trim() || null },
        { onSuccess: () => setOpen(false) }
      );
    } else {
      createBranch(
        { name: name.trim(), address: address.trim() || null },
        {
          onSuccess: () => {
            setOpen(false);
            setName("");
            setAddress("");
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v && branch) {
        setName(branch.name);
        setAddress(branch.address || "");
      }
      if (v && !branch) {
        setName("");
        setAddress("");
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? "지점 수정" : "새 지점 추가"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">지점명</Label>
            <Input
              id="branch-name"
              placeholder="예: 강남점, 본점"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-branch-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-address">주소 (선택)</Label>
            <Input
              id="branch-address"
              placeholder="예: 서울시 강남구..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              data-testid="input-branch-address"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">취소</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !name.trim()} data-testid="button-save-branch">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {branch ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BranchManagement() {
  const { data: branches, isLoading } = useBranches();
  const { mutate: deleteBranch } = useDeleteBranch();
  const { data: transactions } = useTransactions();
  const { data: ingredients } = useIngredients();

  // Compute per-branch stats from OUT transactions
  const branchStats = useMemo(() => {
    if (!transactions || !branches) return new Map<string, { count: number; totalQty: number; uniqueItems: Set<number> }>();
    const map = new Map<string, { count: number; totalQty: number; uniqueItems: Set<number> }>();
    const outTxs = transactions.filter(tx => tx.type === "OUT" && tx.destination);
    for (const tx of outTxs) {
      const dest = tx.destination!;
      if (!map.has(dest)) map.set(dest, { count: 0, totalQty: 0, uniqueItems: new Set() });
      const entry = map.get(dest)!;
      entry.count++;
      entry.totalQty += tx.quantity;
      entry.uniqueItems.add(tx.ingredientId);
    }
    return map;
  }, [transactions, branches]);

  const totalOutCount = transactions?.filter(tx => tx.type === "OUT").length || 0;
  const activeBranches = branches?.filter(b => branchStats.has(b.name)).length || 0;

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">지점 관리</h1>
            <p className="text-muted-foreground mt-1">출고 및 사입 배송에 사용할 지점을 관리합니다.</p>
          </div>
          <BranchFormDialog
            trigger={
              <Button data-testid="button-add-branch">
                <Plus className="w-4 h-4 mr-2" />
                지점 추가
              </Button>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">등록된 지점</CardTitle>
              <MapPin className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-branch-count">{branches?.length || 0}곳</div>
              <p className="text-xs text-muted-foreground mt-1">활성 지점: {activeBranches}곳</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 출고 건수</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOutCount}건</div>
              <p className="text-xs text-muted-foreground mt-1">전체 지점 출고 건수</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 출고 품목</CardTitle>
              <Package className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(transactions?.filter(tx => tx.type === "OUT").map(tx => tx.ingredientId) || []).size}개
              </div>
              <p className="text-xs text-muted-foreground mt-1">출고된 고유 품목 수</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">지점명</th>
                  <th className="px-6 py-4">주소</th>
                  <th className="px-6 py-4 text-center">출고 건수</th>
                  <th className="px-6 py-4 text-center">총 출고량</th>
                  <th className="px-6 py-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">불러오는 중...</td></tr>
                ) : !branches || branches.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">등록된 지점이 없습니다. 새 지점을 추가해 주세요.</td></tr>
                ) : (
                  branches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-branch-${branch.id}`}>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{branch.name}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{branch.address || "-"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-medium">{branchStats.get(branch.name)?.count || 0}건</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-medium">{branchStats.get(branch.name)?.totalQty || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <BranchFormDialog
                            branch={branch}
                            trigger={
                              <Button size="icon" variant="ghost" data-testid={`button-edit-branch-${branch.id}`}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-branch-${branch.id}`}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>지점 삭제</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{branch.name}" 지점을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBranch(branch.id)}
                                  data-testid={`button-confirm-delete-${branch.id}`}
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
