import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { IngredientWithNames, Category, Origin } from "@shared/schema";

export function EditableCategoryCell({ ingredient, categories, onUpdate, onFilter, testIdPrefix = "" }: {
  ingredient: IngredientWithNames;
  categories: Category[];
  onUpdate: (data: { id: number; categoryId: number }) => Promise<any>;
  onFilter: (val: string) => void;
  testIdPrefix?: string;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSelect = async (catId: number) => {
    await onUpdate({ id: ingredient.id, categoryId: catId });
    setPopoverOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="p-0 h-auto text-muted-foreground underline-offset-2 hover:underline"
        onClick={() => ingredient.categoryName && onFilter(ingredient.categoryName)}
        data-testid={`${testIdPrefix}cell-category-${ingredient.id}`}
      >
        {ingredient.categoryName || "-"}
      </Button>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 invisible group-hover:visible" data-testid={`button-edit-category-${ingredient.id}`}>
            <Pencil className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={ingredient.categoryId === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleSelect(cat.id)}
                data-testid={`popover-category-${cat.name}-${ingredient.id}`}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function EditableOriginCell({ ingredient, origins, onUpdate, onFilter, testIdPrefix = "" }: {
  ingredient: IngredientWithNames;
  origins: Origin[];
  onUpdate: (data: { id: number; originId: number }) => Promise<any>;
  onFilter: (val: string) => void;
  testIdPrefix?: string;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSelect = async (originId: number) => {
    await onUpdate({ id: ingredient.id, originId });
    setPopoverOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="p-0 h-auto text-muted-foreground underline-offset-2 hover:underline"
        onClick={() => ingredient.originName && onFilter(ingredient.originName)}
        data-testid={`${testIdPrefix}cell-origin-${ingredient.id}`}
      >
        {ingredient.originName || "-"}
      </Button>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 invisible group-hover:visible" data-testid={`button-edit-origin-${ingredient.id}`}>
            <Pencil className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1 flex-wrap">
            {origins.map((origin) => (
              <Button
                key={origin.id}
                variant={ingredient.originId === origin.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleSelect(origin.id)}
                data-testid={`popover-origin-${origin.name}-${ingredient.id}`}
              >
                {origin.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
