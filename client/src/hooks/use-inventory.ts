import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type IngredientWithNames, type CreateIngredientRequest, type UpdateIngredientRequest, type Transaction, type CreateTransactionRequest, type UpdateTransactionRequest, type Branch, type InsertBranch, type Category, type InsertCategory, type Origin, type InsertOrigin, type Department, type InsertDepartment, type Person, type InsertPerson } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// ============================================
// INGREDIENTS
// ============================================

export function useIngredients() {
  return useQuery({
    queryKey: [api.ingredients.list.path],
    queryFn: async () => {
      const res = await fetch(api.ingredients.list.path);
      if (!res.ok) throw new Error("Failed to fetch ingredients");
      return api.ingredients.list.responses[200].parse(await res.json());
    },
  });
}

export function useIngredient(id: number) {
  return useQuery({
    queryKey: [api.ingredients.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.ingredients.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch ingredient");
      return api.ingredients.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: CreateIngredientRequest) => {
      const res = await fetch(api.ingredients.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create ingredient");
      return api.ingredients.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ingredients.list.path] });
      toast({ title: "Success", description: "Ingredient created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateIngredientRequest) => {
      const url = buildUrl(api.ingredients.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update ingredient");
      return api.ingredients.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.ingredients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.ingredients.get.path, data.id] });
      toast({ title: "Success", description: "Ingredient updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.ingredients.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete ingredient");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ingredients.list.path] });
      toast({ title: "Success", description: "Ingredient deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

// ============================================
// TRANSACTIONS
// ============================================

export function useTransactions(ingredientId?: number) {
  return useQuery({
    queryKey: [api.transactions.list.path, ingredientId],
    queryFn: async () => {
      let url = api.transactions.list.path;
      if (ingredientId) {
        url += `?ingredientId=${ingredientId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

// ============================================
// BRANCHES
// ============================================

export function useBranches() {
  return useQuery({
    queryKey: [api.branches.list.path],
    queryFn: async () => {
      const res = await fetch(api.branches.list.path);
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json() as Promise<Branch[]>;
    },
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertBranch) => {
      const res = await fetch(api.branches.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create branch");
      return res.json() as Promise<Branch>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.branches.list.path] });
      toast({ title: "완료", description: "지점이 추가되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertBranch>) => {
      const url = buildUrl(api.branches.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update branch");
      return res.json() as Promise<Branch>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.branches.list.path] });
      toast({ title: "완료", description: "지점 정보가 수정되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.branches.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete branch");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.branches.list.path] });
      toast({ title: "완료", description: "지점이 삭제되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useConfirmTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.transactions.confirm.path, { id });
      const res = await fetch(url, { method: "PATCH" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to confirm");
      }
      return res.json() as Promise<Transaction>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.ingredients.list.path] });
      toast({ title: "완료", description: "배송 확인 완료 — 재고에 반영되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useRejectTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.transactions.reject.path, { id });
      const res = await fetch(url, { method: "PATCH" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reject");
      }
      return res.json() as Promise<Transaction>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      toast({ title: "완료", description: "배송이 거부되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useResetTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.transactions.reset.path, { id });
      const res = await fetch(url, { method: "PATCH" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reset");
      }
      return res.json() as Promise<Transaction>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.ingredients.list.path] });
      toast({ title: "완료", description: "배송 상태가 초기화되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTransactionRequest) => {
      const res = await fetch(api.transactions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to process transaction");
      }
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ingredients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      toast({ title: "Success", description: "Transaction recorded successfully" });
    },
    onError: (error) => {
      toast({ title: "Transaction Failed", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateTransactionRequest) => {
      const url = buildUrl(api.transactions.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update transaction");
      }
      return res.json() as Promise<Transaction>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ingredients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      toast({ title: "완료", description: "출고 내역이 수정되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.transactions.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete transaction");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ingredients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      toast({ title: "완료", description: "출고 내역이 삭제되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// CATEGORIES
// ============================================

export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json() as Promise<Category[]>;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCategory) => {
      const res = await fetch(api.categories.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json() as Promise<Category>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "완료", description: "카테고리가 추가되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.categories.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "완료", description: "카테고리가 삭제되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// ORIGINS
// ============================================

export function useOrigins() {
  return useQuery({
    queryKey: [api.origins.list.path],
    queryFn: async () => {
      const res = await fetch(api.origins.list.path);
      if (!res.ok) throw new Error("Failed to fetch origins");
      return res.json() as Promise<Origin[]>;
    },
  });
}

export function useCreateOrigin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertOrigin) => {
      const res = await fetch(api.origins.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create origin");
      return res.json() as Promise<Origin>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.origins.list.path] });
      toast({ title: "완료", description: "원산지가 추가되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteOrigin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.origins.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete origin");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.origins.list.path] });
      toast({ title: "완료", description: "원산지가 삭제되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// DEPARTMENTS
// ============================================

export function useDepartments() {
  return useQuery({
    queryKey: [api.departments.list.path],
    queryFn: async () => {
      const res = await fetch(api.departments.list.path);
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.json() as Promise<Department[]>;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertDepartment) => {
      const res = await fetch(api.departments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create department");
      return res.json() as Promise<Department>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.departments.list.path] });
      toast({ title: "완료", description: "부서가 추가되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.departments.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete department");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.departments.list.path] });
      toast({ title: "완료", description: "부서가 삭제되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// PERSONS
// ============================================

export function usePersons() {
  return useQuery({
    queryKey: [api.persons.list.path],
    queryFn: async () => {
      const res = await fetch(api.persons.list.path);
      if (!res.ok) throw new Error("Failed to fetch persons");
      return res.json() as Promise<Person[]>;
    },
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertPerson) => {
      const res = await fetch(api.persons.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create person");
      return res.json() as Promise<Person>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.persons.list.path] });
      toast({ title: "완료", description: "담당자가 추가되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.persons.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete person");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.persons.list.path] });
      toast({ title: "완료", description: "담당자가 삭제되었습니다." });
    },
    onError: (error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });
}
