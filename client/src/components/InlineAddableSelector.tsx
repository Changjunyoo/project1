import { useState, useRef, useEffect } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InlineAddableSelectorProps {
  items: { id: number; name: string }[] | undefined;
  selectedId: number | undefined;
  onSelect: (id: number) => void;
  onAdd: (name: string) => Promise<{ id: number; name: string }>;
  placeholder?: string;
  size?: "sm" | "default";
  className?: string;
  testIdPrefix?: string;
}

export function InlineAddableSelector({
  items,
  selectedId,
  onSelect,
  onAdd,
  placeholder = "새로 추가...",
  size = "sm",
  className = "",
  testIdPrefix = "selector",
}: InlineAddableSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      const created = await onAdd(trimmed);
      onSelect(created.id);
      setNewName("");
      setIsAdding(false);
    } catch {
      // toast is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewName("");
    }
  };

  return (
    <div className={`flex gap-1.5 flex-wrap items-center ${className}`}>
      {items?.map((item) => (
        <Button
          key={item.id}
          type="button"
          variant={selectedId === item.id ? "default" : "outline"}
          size={size}
          onClick={() => onSelect(item.id)}
          data-testid={`${testIdPrefix}-${item.name}`}
          className="text-xs"
        >
          {item.name}
        </Button>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-8 w-24 text-xs"
            disabled={isSubmitting}
            data-testid={`${testIdPrefix}-new-input`}
          />
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleAdd}
                disabled={!newName.trim()}
                data-testid={`${testIdPrefix}-confirm-add`}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { setIsAdding(false); setNewName(""); }}
                data-testid={`${testIdPrefix}-cancel-add`}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={() => setIsAdding(true)}
          className="text-xs border-dashed text-muted-foreground"
          data-testid={`${testIdPrefix}-add-btn`}
        >
          <Plus className="w-3 h-3 mr-1" />
          추가
        </Button>
      )}
    </div>
  );
}
