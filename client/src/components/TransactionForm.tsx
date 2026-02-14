import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, ChevronLeft, Check, Search, Plus, CalendarDays } from "lucide-react";
import { addDays, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIngredients, useCreateIngredient, useUpdateIngredient, useCreateTransaction, useBranches } from "@/hooks/use-inventory";
import { createTransactionRequestSchema, insertIngredientSchema, INGREDIENT_CATEGORIES } from "@shared/schema";

interface TransactionFormProps {
  type: "IN" | "OUT" | "PURCHASE";
  preselectedIngredientId?: number;
  preselectedDestination?: string;
}

type PickerMode = "form" | "ingredient" | "branch" | "newIngredient";

export function TransactionForm({ type, preselectedIngredientId, preselectedDestination }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("form");
  const [searchTerm, setSearchTerm] = useState("");
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState("");
  const [showIngredientResults, setShowIngredientResults] = useState(false);
  const { data: ingredients } = useIngredients();
  const { data: branchList } = useBranches();
  const { mutateAsync: createTransaction, isPending } = useCreateTransaction();
  const { mutateAsync: createIngredient, isPending: isCreatingIngredient } = useCreateIngredient();
  const { mutateAsync: updateIngredient } = useUpdateIngredient();
  const [initialStock, setInitialStock] = useState(0);
  const [pendingIngredientName, setPendingIngredientName] = useState("");

  const newIngredientForm = useForm<z.infer<typeof insertIngredientSchema>>({
    resolver: zodResolver(insertIngredientSchema),
    defaultValues: {
      name: "",
      brand: "",
      category: "",
      origin: "",
      unit: "kg",
      minStockLevel: 10,
      shelfLifeDays: undefined,
    },
  });

  const form = useForm<z.infer<typeof createTransactionRequestSchema>>({
    resolver: zodResolver(createTransactionRequestSchema),
    defaultValues: {
      type,
      ingredientId: preselectedIngredientId || undefined,
      quantity: 0,
      unitPrice: (type === "IN" || type === "PURCHASE") ? 0 : undefined,
      destination: (type === "OUT" || type === "PURCHASE") ? (preselectedDestination || "") : undefined,
      supplier: type === "PURCHASE" ? "" : undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof createTransactionRequestSchema>) => {
    try {
      const submitValues = { ...values };
      if ((type === "IN" || type === "PURCHASE") && selectedIngredient?.shelfLifeDays) {
        submitValues.expiryDate = addDays(new Date(), selectedIngredient.shelfLifeDays);
      }
      await createTransaction(submitValues);
      setOpen(false);
      form.reset();
    } catch (error) {
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setPickerMode("form");
      setSearchTerm("");
      setIngredientSearchTerm("");
      setShowIngredientResults(false);
    }
  };

  const selectedIngredientId = form.watch("ingredientId");
  const selectedIngredient = ingredients?.find(i => i.id === selectedIngredientId);
  const selectedDestination = form.watch("destination");

  const filteredIngredients = ingredients?.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inlineFilteredIngredients = ingredients?.filter(i =>
    ingredientSearchTerm && i.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
  );

  const ingredientSearchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ingredientSearchRef.current && !ingredientSearchRef.current.contains(e.target as Node)) {
        setShowIngredientResults(false);
      }
    };
    if (showIngredientResults) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showIngredientResults]);

  useEffect(() => {
    if (pickerMode === "newIngredient" && pendingIngredientName) {
      newIngredientForm.reset({ name: pendingIngredientName, brand: "", category: "", origin: "", unit: "kg", minStockLevel: 10, shelfLifeDays: undefined });
      setPendingIngredientName("");
    }
  }, [pickerMode, pendingIngredientName]);

  const filteredBranches = branchList?.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (pickerMode === "ingredient") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button 
            variant={type === "IN" ? "default" : type === "PURCHASE" ? "secondary" : "outline"} 
            className={type === "IN" 
              ? "bg-green-600 text-white" 
              : type === "PURCHASE"
              ? "bg-blue-600 text-white"
              : "border-orange-200 bg-orange-50 text-orange-700"
            }
          >
            {type === "IN" ? <ArrowDownToLine className="w-4 h-4 mr-2" /> : type === "PURCHASE" ? <ShoppingCart className="w-4 h-4 mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
            {type === "IN" ? "입고" : type === "PURCHASE" ? "사입" : "출고"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setPickerMode("form"); setSearchTerm(""); }} data-testid="button-back-ingredient">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <DialogTitle>식자재 선택</DialogTitle>
            </div>
            <DialogDescription className="sr-only">식자재를 선택하세요</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="식자재 검색..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-ingredient"
            />
          </div>
          <div className="max-h-64 overflow-y-auto -mx-2">
            {filteredIngredients?.map((ing) => (
              <button
                key={ing.id}
                type="button"
                className={`w-full text-left px-4 py-3 flex items-center justify-between hover-elevate rounded-md mx-0 ${selectedIngredientId === ing.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
                onClick={() => {
                  form.setValue("ingredientId", ing.id);
                  setPickerMode("form");
                  setSearchTerm("");
                }}
                data-testid={`button-ingredient-${ing.id}`}
              >
                <span>{ing.name} <span className="text-muted-foreground text-sm">(현재: {ing.currentStock} {ing.unit})</span></span>
                {selectedIngredientId === ing.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
            {filteredIngredients?.length === 0 && (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">검색 결과가 없습니다.</div>
            )}
          </div>
          <div className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { setPickerMode("newIngredient"); newIngredientForm.reset({ name: searchTerm, brand: "", category: "", origin: "", unit: "kg", minStockLevel: 10 }); setInitialStock(0); setSearchTerm(""); }}
              data-testid="button-add-new-ingredient"
            >
              <Plus className="w-4 h-4 mr-2" />
              새 식자재 추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (pickerMode === "newIngredient") {
    const triggerButton = (
      <DialogTrigger asChild>
        <Button 
          variant={type === "IN" ? "default" : type === "PURCHASE" ? "secondary" : "outline"} 
          className={type === "IN" 
            ? "bg-green-600 text-white" 
            : type === "PURCHASE"
            ? "bg-blue-600 text-white"
            : "border-orange-200 bg-orange-50 text-orange-700"
          }
        >
          {type === "IN" ? <ArrowDownToLine className="w-4 h-4 mr-2" /> : type === "PURCHASE" ? <ShoppingCart className="w-4 h-4 mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
          {type === "IN" ? "입고" : type === "PURCHASE" ? "사입" : "출고"}
        </Button>
      </DialogTrigger>
    );

    const onCreateIngredient = async (values: z.infer<typeof insertIngredientSchema>) => {
      try {
        const created = await createIngredient(values);
        if (initialStock > 0) {
          await updateIngredient({ id: created.id, currentStock: initialStock } as any);
        }
        form.setValue("ingredientId", created.id);
        setIngredientSearchTerm(created.name);
        setShowIngredientResults(false);
        newIngredientForm.reset();
        setInitialStock(0);
        setPickerMode("form");
      } catch (error) {
      }
    };

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {triggerButton}
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setPickerMode("form")} data-testid="button-back-new-ingredient">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <DialogTitle>새 식자재 추가</DialogTitle>
            </div>
            <DialogDescription className="sr-only">새로운 식자재를 등록합니다</DialogDescription>
          </DialogHeader>
          <Form {...newIngredientForm}>
            <form onSubmit={newIngredientForm.handleSubmit(onCreateIngredient)} className="space-y-4">
              <FormField
                control={newIngredientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>품목명</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 소고기 등심" {...field} data-testid="input-new-ingredient-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={newIngredientForm.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>브랜드</FormLabel>
                      <FormControl>
                        <Input placeholder="예: CJ" {...field} value={field.value || ''} data-testid="input-new-ingredient-brand" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newIngredientForm.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>원산지</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 국내산" {...field} value={field.value || ''} data-testid="input-new-ingredient-origin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={newIngredientForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {INGREDIENT_CATEGORIES.map((cat) => (
                          <Button
                            key={cat}
                            type="button"
                            variant={field.value === cat ? "default" : "outline"}
                            size="sm"
                            onClick={() => field.onChange(cat)}
                            className="flex-1"
                            data-testid={`button-new-cat-${cat}`}
                          >
                            {cat}
                          </Button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newIngredientForm.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>단위</FormLabel>
                    <FormControl>
                      <Input placeholder="kg, 박스, 개..." {...field} data-testid="input-new-ingredient-unit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newIngredientForm.control}
                name="shelfLifeDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>유통기한 (일수)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="예: 30 (사입일로부터 30일)"
                        {...field}
                        value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                        data-testid="input-new-ingredient-shelf-life"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium leading-none">현재 재고</label>
                  <Input
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={e => setInitialStock(parseInt(e.target.value) || 0)}
                    data-testid="input-new-ingredient-current-stock"
                    className="mt-2"
                  />
                </div>
                <FormField
                  control={newIngredientForm.control}
                  name="minStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>최소 재고</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-new-ingredient-min-stock" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isCreatingIngredient} data-testid="button-submit-new-ingredient">
                  {isCreatingIngredient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  추가하고 선택
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  if (pickerMode === "branch") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button 
            variant={type === "IN" ? "default" : type === "PURCHASE" ? "secondary" : "outline"} 
            className={type === "IN" 
              ? "bg-green-600 text-white" 
              : type === "PURCHASE"
              ? "bg-blue-600 text-white"
              : "border-orange-200 bg-orange-50 text-orange-700"
            }
          >
            {type === "IN" ? <ArrowDownToLine className="w-4 h-4 mr-2" /> : type === "PURCHASE" ? <ShoppingCart className="w-4 h-4 mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
            {type === "IN" ? "입고" : type === "PURCHASE" ? "사입" : "출고"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setPickerMode("form"); setSearchTerm(""); }} data-testid="button-back-branch">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <DialogTitle>{type === "PURCHASE" ? "배송 지점 선택" : "출고처 선택"}</DialogTitle>
            </div>
            <DialogDescription className="sr-only">지점을 선택하세요</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="지점 검색..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-branch"
            />
          </div>
          <div className="max-h-64 overflow-y-auto -mx-2">
            {filteredBranches?.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`w-full text-left px-4 py-3 flex items-center justify-between hover-elevate rounded-md mx-0 ${selectedDestination === b.name ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
                onClick={() => {
                  form.setValue("destination", b.name);
                  setPickerMode("form");
                  setSearchTerm("");
                }}
                data-testid={`button-branch-${b.id}`}
              >
                <span>{b.name}</span>
                {selectedDestination === b.name && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
            {filteredBranches?.length === 0 && (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">검색 결과가 없습니다.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant={type === "IN" ? "default" : type === "PURCHASE" ? "secondary" : "outline"} 
          className={type === "IN" 
            ? "bg-green-600 text-white" 
            : type === "PURCHASE"
            ? "bg-blue-600 text-white"
            : "border-orange-200 bg-orange-50 text-orange-700"
          }
        >
          {type === "IN" ? <ArrowDownToLine className="w-4 h-4 mr-2" /> : type === "PURCHASE" ? <ShoppingCart className="w-4 h-4 mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
          {type === "IN" ? "입고" : type === "PURCHASE" ? "사입" : "출고"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-visible">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "IN" ? (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
            ) : type === "PURCHASE" ? (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <ShoppingCart className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <ArrowUpFromLine className="w-5 h-5" />
              </div>
            )}
            {type === "IN" ? "재고 입고 기록" : type === "PURCHASE" ? "사입 내역 기록" : "재고 출고 기록"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {type === "IN" ? "입고 내역을 기록합니다" : type === "PURCHASE" ? "사입 내역을 기록합니다" : "출고 내역을 기록합니다"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">

            <FormField
              control={form.control}
              name="ingredientId"
              render={() => (
                <FormItem>
                  <FormLabel>식자재</FormLabel>
                  {preselectedIngredientId ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                      disabled
                      data-testid="button-open-ingredient-picker"
                    >
                      {selectedIngredient 
                        ? <span>{selectedIngredient.name} <span className="text-muted-foreground">(현재: {selectedIngredient.currentStock} {selectedIngredient.unit})</span></span>
                        : <span className="text-muted-foreground">식자재 선택</span>
                      }
                    </Button>
                  ) : (
                    <div ref={ingredientSearchRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="식자재 검색..."
                          className="pl-9"
                          value={selectedIngredient && !showIngredientResults ? selectedIngredient.name : ingredientSearchTerm}
                          onChange={(e) => {
                            setIngredientSearchTerm(e.target.value);
                            setShowIngredientResults(true);
                            if (selectedIngredient) {
                              form.setValue("ingredientId", undefined as any);
                            }
                          }}
                          onFocus={() => {
                            if (selectedIngredient) {
                              setIngredientSearchTerm(selectedIngredient.name);
                            }
                            setShowIngredientResults(true);
                          }}
                          data-testid="input-ingredient-search"
                        />
                      </div>
                      {showIngredientResults && (
                        <div className="w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {inlineFilteredIngredients && inlineFilteredIngredients.length > 0 ? (
                            inlineFilteredIngredients.map((ing) => (
                              <button
                                key={ing.id}
                                type="button"
                                className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover-elevate ${selectedIngredientId === ing.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
                                style={{ minHeight: "48px" }}
                                onClick={() => {
                                  form.setValue("ingredientId", ing.id);
                                  setIngredientSearchTerm(ing.name);
                                  setShowIngredientResults(false);
                                }}
                                data-testid={`button-inline-ingredient-${ing.id}`}
                              >
                                <div className="flex flex-col gap-1">
                                  <span>{ing.name}</span>
                                  <span className="text-muted-foreground text-xs">현재: {ing.currentStock} {ing.unit}</span>
                                </div>
                                {selectedIngredientId === ing.id && <Check className="w-4 h-4 text-primary" />}
                              </button>
                            ))
                          ) : ingredientSearchTerm ? (
                            <div className="p-2">
                              <p className="text-sm text-muted-foreground text-center py-1">검색 결과가 없습니다.</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full mt-1"
                                onClick={() => {
                                  setShowIngredientResults(false);
                                  setInitialStock(0);
                                  setPendingIngredientName(ingredientSearchTerm);
                                  setPickerMode("newIngredient");
                                }}
                                data-testid="button-inline-add-ingredient"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                "{ingredientSearchTerm}" 새로 추가
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>수량 {selectedIngredient && `(${selectedIngredient.unit})`}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-quantity" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(type === "IN" || type === "PURCHASE") && (
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>단가 (₩)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        {...field} 
                        value={field.value ?? ""} 
                        onChange={e => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value))}
                        data-testid="input-unit-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(type === "IN" || type === "PURCHASE") && selectedIngredient?.shelfLifeDays && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-md border border-border" data-testid="text-expiry-info">
                <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  유통기한: <span className="font-medium text-foreground">{format(addDays(new Date(), selectedIngredient.shelfLifeDays), "yyyy-MM-dd")}</span>
                  <span className="ml-1">({selectedIngredient.shelfLifeDays}일)</span>
                </span>
              </div>
            )}

            {type === "PURCHASE" && (
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사입처 (공급원)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="예: 가락시장, XX상사" 
                        {...field} 
                        value={field.value ?? ""} 
                        data-testid="input-supplier"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(type === "OUT" || type === "PURCHASE") && (
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{type === "PURCHASE" ? "배송 지점" : "출고처 / 지점"}</FormLabel>
                    {branchList && branchList.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                        onClick={() => setPickerMode("branch")}
                        data-testid="button-open-branch-picker"
                      >
                        {field.value 
                          ? <span>{field.value}</span>
                          : <span className="text-muted-foreground">지점 선택</span>
                        }
                        <ChevronLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                      </Button>
                    ) : (
                      <FormControl>
                        <Input 
                          placeholder="예: 주방 A, 강남점" 
                          {...field} 
                          value={field.value ?? ""} 
                          data-testid="input-destination"
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending} data-testid="button-submit-transaction" className={type === "IN" ? "bg-green-600" : type === "PURCHASE" ? "bg-blue-600" : "bg-orange-600"}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                기록 완료
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
