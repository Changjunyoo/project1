import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ArrowRightLeft, Settings, ChefHat, ShoppingCart, MapPin, Building2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
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
  { id: "transactions", href: "/transactions", label: "입출고 내역", icon: ArrowRightLeft },
];

const STORAGE_KEY = "kitchenos-sidebar-order";

function loadOrder(): NavLink[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const ids: string[] = JSON.parse(saved);
      const mapped = ids.map(id => defaultLinks.find(l => l.id === id)).filter(Boolean) as NavLink[];
      const missing = defaultLinks.filter(l => !ids.includes(l.id));
      return [...mapped, ...missing];
    }
  } catch {}
  return defaultLinks;
}

function saveOrder(links: NavLink[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links.map(l => l.id)));
}

function SortableNavItem({ link, isActive }: { link: NavLink; isActive: boolean }) {
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
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [links, setLinks] = useState<NavLink[]>(loadOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    saveOrder(links);
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
