import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";
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
import { useCreateIngredient } from "@/hooks/use-inventory";
import { insertIngredientSchema, INGREDIENT_CATEGORIES } from "@shared/schema";

export function CreateIngredientDialog() {
  const [open, setOpen] = useState(false);
  const { mutateAsync: createIngredient, isPending } = useCreateIngredient();

  const form = useForm<z.infer<typeof insertIngredientSchema>>({
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

  const onSubmit = async (values: z.infer<typeof insertIngredientSchema>) => {
    try {
      await createIngredient(values);
      setOpen(false);
      form.reset();
    } catch (error) {
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary shadow-lg shadow-primary/25">
          <Plus className="w-4 h-4 mr-2" />
          식자재 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 식자재 등록</DialogTitle>
          <DialogDescription>
            재고 관리를 위한 새로운 식자재를 등록합니다.
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
                    <Input placeholder="예: 소고기 등심" {...field} data-testid="input-name" />
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
                    <Input placeholder="예: CJ제일제당" {...field} value={field.value || ''} data-testid="input-brand" />
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
                          data-testid={`button-category-${cat}`}
                          className={field.value === cat ? "flex-1" : "flex-1"}
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
                    <Input placeholder="예: 국내산, 미국산, 호주산" {...field} value={field.value || ''} data-testid="input-origin" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>단위</FormLabel>
                    <FormControl>
                      <Input placeholder="kg, 박스, 개..." {...field} data-testid="input-unit" />
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
                    <FormLabel>최소 재고 알림 기준</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-min-stock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
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
                      data-testid="input-shelf-life"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending} data-testid="button-submit-ingredient">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                식자재 등록
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
