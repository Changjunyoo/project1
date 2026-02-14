import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowDownToLine, ArrowUpFromLine, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIngredients, useCreateTransaction } from "@/hooks/use-inventory";
import { createTransactionRequestSchema } from "@shared/schema";

interface TransactionFormProps {
  type: "IN" | "OUT" | "PURCHASE";
  preselectedIngredientId?: number;
}

export function TransactionForm({ type, preselectedIngredientId }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const { data: ingredients } = useIngredients();
  const { mutateAsync: createTransaction, isPending } = useCreateTransaction();

  const form = useForm<z.infer<typeof createTransactionRequestSchema>>({
    resolver: zodResolver(createTransactionRequestSchema),
    defaultValues: {
      type,
      ingredientId: preselectedIngredientId || undefined,
      quantity: 0,
      unitPrice: (type === "IN" || type === "PURCHASE") ? 0 : undefined,
      destination: type === "OUT" ? "" : undefined,
      supplier: type === "PURCHASE" ? "" : undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof createTransactionRequestSchema>) => {
    try {
      await createTransaction(values);
      setOpen(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation hook toast
    }
  };

  const selectedIngredientId = form.watch("ingredientId");
  const selectedIngredient = ingredients?.find(i => i.id === selectedIngredientId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={type === "IN" ? "default" : type === "PURCHASE" ? "secondary" : "outline"} 
          className={type === "IN" 
            ? "bg-green-600 hover:bg-green-700 text-white" 
            : type === "PURCHASE"
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
          }
        >
          {type === "IN" ? <ArrowDownToLine className="w-4 h-4 mr-2" /> : type === "PURCHASE" ? <ShoppingCart className="w-4 h-4 mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
          {type === "IN" ? "입고" : type === "PURCHASE" ? "사입" : "출고"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            
            <FormField
              control={form.control}
              name="ingredientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>식자재</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(parseInt(val))} 
                    defaultValue={field.value?.toString()}
                    disabled={!!preselectedIngredientId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="식자재 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ingredients?.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id.toString()}>
                          {ing.name} (현재: {ing.currentStock} {ing.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>수량 {selectedIngredient && `(${selectedIngredient.unit})`}</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {type === "OUT" && (
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>출고처 / 지점</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="예: 주방 A, 강남점" 
                        {...field} 
                        value={field.value ?? ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending} className={type === "IN" ? "bg-green-600 hover:bg-green-700" : type === "PURCHASE" ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700"}>
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
