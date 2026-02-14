import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Loader2 } from "lucide-react";
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
import { useIngredients, useUpdateIngredient } from "@/hooks/use-inventory";
import { insertIngredientSchema, INGREDIENT_CATEGORIES, type Ingredient } from "@shared/schema";

const editIngredientSchema = insertIngredientSchema.extend({
  currentStock: z.number().int().min(0),
});

interface EditIngredientDialogProps {
  ingredient: Ingredient;
}

export function EditIngredientDialog({ ingredient }: EditIngredientDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutateAsync: updateIngredient, isPending } = useUpdateIngredient();
  const { data: allIngredients } = useIngredients();

  const existingUnits = useMemo(() => {
    if (!allIngredients) return [];
    const units = Array.from(new Set(allIngredients.map(i => i.unit).filter(Boolean))) as string[];
    return units.sort();
  }, [allIngredients]);

  const form = useForm<z.infer<typeof editIngredientSchema>>({
    resolver: zodResolver(editIngredientSchema),
    defaultValues: {
      name: ingredient.name,
      brand: ingredient.brand || "",
      category: ingredient.category || "",
      origin: ingredient.origin || "",
      unit: ingredient.unit,
      currentStock: ingredient.currentStock,
      minStockLevel: ingredient.minStockLevel,
      shelfLifeDays: ingredient.shelfLifeDays ?? undefined,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: ingredient.name,
        brand: ingredient.brand || "",
        category: ingredient.category || "",
        origin: ingredient.origin || "",
        unit: ingredient.unit,
        currentStock: ingredient.currentStock,
        minStockLevel: ingredient.minStockLevel,
        shelfLifeDays: ingredient.shelfLifeDays ?? undefined,
      });
    }
  }, [open, ingredient, form]);

  const onSubmit = async (values: z.infer<typeof editIngredientSchema>) => {
    try {
      await updateIngredient({ id: ingredient.id, ...values });
      setOpen(false);
    } catch (error) {
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>식자재 정보 수정</DialogTitle>
          <DialogDescription>
            식자재의 이름, 브랜드, 단위 등을 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>품목명</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-name-edit" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>브랜드</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} data-testid="input-brand-edit" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
                          data-testid={`button-category-edit-${cat}`}
                          className="flex-1"
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
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>원산지</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 국내산, 미국산, 호주산" {...field} value={field.value || ''} data-testid="input-origin-edit" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>단위</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-unit-edit" />
                  </FormControl>
                  {existingUnits.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-xs text-muted-foreground">이전 단위:</span>
                      {existingUnits.map((u) => (
                        <Button
                          key={u}
                          type="button"
                          variant={field.value === u ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => field.onChange(u)}
                          data-testid={`button-unit-suggestion-${u}`}
                        >
                          {u}
                        </Button>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>현재 재고</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-current-stock-edit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>최소 재고</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-min-stock-edit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shelfLifeDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>유통기한(일)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="예: 30"
                        {...field}
                        value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                        data-testid="input-shelf-life-edit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending} data-testid="button-submit-edit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                저장하기
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
