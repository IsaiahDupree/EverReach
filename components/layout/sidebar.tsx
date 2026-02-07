"use client";

/**
 * Sidebar Component (WEB-LAYOUT-005)
 *
 * Dashboard sidebar navigation with:
 * - Navigation items from dashboardNav config
 * - Active state highlighting based on current path
 * - Collapsible functionality with state persistence
 * - Support for nested navigation items
 *
 * CUSTOMIZATION:
 * - Update navigation items in config/nav.ts (dashboardNav)
 * - Modify styling with Tailwind classes
 * - Adjust collapse behavior as needed
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { dashboardNav, type NavItem } from "@/config/nav";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Load collapsed state from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
  }, []);

  // Persist collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
  };

  // Check if a nav item or its children are active
  const isNavItemActive = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
    if (item.items) {
      return item.items.some((subItem) => pathname === subItem.href);
    }
    return false;
  };

  return (
    <nav
      data-testid="sidebar"
      aria-label="Dashboard sidebar navigation"
      className={cn(
        "relative flex flex-col border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-end p-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {dashboardNav.map((item) => (
            <div key={item.href}>
              {/* Main Nav Item */}
              <Link
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isNavItemActive(item)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                  item.disabled && "cursor-not-allowed opacity-50",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.title : item.description}
                aria-label={item.title}
              >
                {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />}
                <span className={cn(isCollapsed && "sr-only")}>{item.title}</span>
              </Link>

              {/* Nested Navigation Items */}
              {!isCollapsed && item.items && item.items.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.disabled ? "#" : subItem.href}
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        pathname === subItem.href
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground",
                        subItem.disabled && "cursor-not-allowed opacity-50"
                      )}
                      title={subItem.description}
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
