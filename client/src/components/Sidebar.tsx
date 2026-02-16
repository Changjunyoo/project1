import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ArrowRightLeft, Settings, ChefHat, ShoppingCart, MapPin, Building2, GripVertical, Pencil, Check, X, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type NavLink = {
  id: string;
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const defaultLinks: NavLink[] = [
  { id: "dashboard", href: "/", label: "대시보드", icon: LayoutDashboard },
  { id: "inventory", href: "/inventory", label: "MK", icon: Package },
  { id: "purchases", href: "/purchases", label: "주문서", icon: ShoppingCart },
  { id: "outgoing", href: "/outgoing", label: "지점별 출고", icon: MapPin },
  { id: "branches", href: "/branches", label: "지점 관리", icon: Building2 },
  { id: "categories", href: "/settings/categories", label: "카테고리/원산지", icon: Tags },
  { id: "transactions", href: "/transactions", label: "입출고 내역", icon: ArrowRightLeft },
];

const ORDER_KEY = "kitchenos-sidebar-order";
const LABELS_KEY = "kitchenos-sidebar-labels";

const SIDEBAR_VERSION_KEY = "kitchenos-sidebar-version";
const CURRENT_SIDEBAR_VERSION = "2"; // bump this when adding/removing menu items

function loadLinks(): NavLink[] {
  try {
    // If menu structure changed, clear old cached order
    const savedVersion = localStorage.getItem(SIDEBAR_VERSION_KEY);
    if (savedVersion !== CURRENT_SIDEBAR_VERSION) {
      localStorage.removeItem(ORDER_KEY);
      localStorage.removeItem(LABELS_KEY);
      localStorage.setItem(SIDEBAR_VERSION_KEY, CURRENT_SIDEBAR_VERSION);
      return defaultLinks;
    }

    const savedOrder = localStorage.getItem(ORDER_KEY);
    const savedLabels = localStorage.getItem(LABELS_KEY);
    const labels: Record<string, string> = savedLabels ? JSON.parse(savedLabels) : {};

    const base = defaultLinks.map(l => ({
      ...l,
      label: labels[l.id] || l.label,
    }));

    if (savedOrder) {
      const ids: string[] = JSON.parse(savedOrder);
      const mapped = ids.map(id => base.find(l => l.id === id)).filter(Boolean) as NavLink[];
      const missing = base.filter(l => !ids.includes(l.id));
      return [...mapped, ...missing];
    }
    return base;
  } catch {}
  return defaultLinks;
}

function saveOrder(links: NavLink[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(links.map(l => l.id)));
}

function saveLabels(links: NavLink[]) {
  const labels: Record<string, string> = {};
  links.forEach(l => {
    const def = defaultLinks.find(d => d.id === l.id);
    if (def && l.label !== def.label) {
      labels[l.id] = l.label;
    }
  });
  localStorage.setItem(LABELS_KEY, JSON.stringify(labels));
}

function SortableNavItem({
  link,
  isActive,
  onRename,
}: {
  link: NavLink;
  isActive: boolean;
  onRename: (id: string, newLabel: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(link.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onRename(link.id, trimmed);
    } else {
      setEditValue(link.label);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditValue(link.label);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            : "text-muted-foreground"
        )}
        data-testid={`sidebar-item-${link.id}`}
      >
        <div className="flex items-center gap-1 flex-1 px-2 py-1.5">
          <link.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="h-7 text-sm bg-background/20 border-border/50 text-foreground px-2"
            data-testid={`input-rename-${link.id}`}
          />
          <button onClick={handleSave} className="p-1 shrink-0" data-testid={`button-save-rename-${link.id}`}>
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCancel} className="p-1 shrink-0" data-testid={`button-cancel-rename-${link.id}`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-all duration-200 group",
        isDragging && "opacity-50 z-50",
        isActive
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "text-muted-foreground"
      )}
      data-testid={`sidebar-item-${link.id}`}
    >
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "flex items-center justify-center pl-2 py-3 cursor-grab active:cursor-grabbing",
          isActive ? "text-primary-foreground/60" : "text-muted-foreground/40"
        )}
        data-testid={`drag-handle-${link.id}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <Link href={link.href} className="flex-1">
        <div
          className={cn(
            "flex items-center gap-3 pl-1 pr-4 py-3 cursor-pointer",
            !isActive && "hover:text-foreground"
          )}
        >
          <link.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
          {link.label}
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditValue(link.label);
          setEditing(true);
        }}
        className={cn(
          "p-1 mr-2 rounded invisible group-hover:visible",
          isActive ? "text-primary-foreground/60 hover:text-primary-foreground" : "text-muted-foreground/40 hover:text-foreground"
        )}
        data-testid={`button-rename-${link.id}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [links, setLinks] = useState<NavLink[]>(loadLinks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    saveOrder(links);
    saveLabels(links);
  }, [links]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLinks((prev) => {
        const oldIndex = prev.findIndex((l) => l.id === active.id);
        const newIndex = prev.findIndex((l) => l.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function handleRename(id: string, newLabel: string) {
    setLinks((prev) => prev.map(l => l.id === id ? { ...l, label: newLabel } : l));
  }

  return (
    <div className="h-screen w-64 bg-card border-r border-border flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none">KitchenOS</h1>
            <p className="text-xs text-muted-foreground mt-1">재고 관리 시스템</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map(l => l.id)} strategy={verticalListSortingStrategy}>
            {links.map((link) => (
              <SortableNavItem
                key={link.id}
                link={link}
                isActive={location === link.href}
                onRename={handleRename}
              />
            ))}
          </SortableContext>
        </DndContext>
      </nav>

      <div className="p-4 border-t border-border/50">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all">
          <Settings className="w-5 h-5" />
          설정
        </button>
      </div>
    </div>
  );
}
