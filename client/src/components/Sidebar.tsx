import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ArrowRightLeft, Settings, ChefHat, ShoppingCart, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/inventory", label: "식자재 관리", icon: Package },
  { href: "/purchases", label: "사입 관리", icon: ShoppingCart },
  { href: "/outgoing", label: "지점별 출고", icon: MapPin },
  { href: "/branches", label: "지점 관리", icon: Building2 },
  { href: "/transactions", label: "입출고 내역", icon: ArrowRightLeft },
];

export function Sidebar() {
  const [location] = useLocation();

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
        {links.map((link) => {
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <link.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                {link.label}
              </div>
            </Link>
          );
        })}
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
