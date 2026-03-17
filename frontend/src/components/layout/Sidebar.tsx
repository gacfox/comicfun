import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Home,
  BookText,
  Image,
  Film,
  Bookmark,
  History,
  Settings,
  Users,
  Tags,
  Book,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores";
import { getMe } from "@/services/user";

interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: MenuItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  variant?: "desktop" | "mobile";
}

function MenuItems({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, updateUser } = useAuthStore();
  const [openMenus, setOpenMenus] = useState<string[]>(["content"]);

  const isAdmin = Number(user?.isAdmin) === 1;

  useEffect(() => {
    const fetchUser = async () => {
      const res = await getMe();
      if (res.code === 0 && res.data) {
        updateUser(res.data);
      }
    };
    if (!user) {
      fetchUser();
    }
  }, [user, updateUser]);

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const menuItems: MenuItem[] = [
    {
      key: "home",
      label: t("nav.home"),
      icon: <Home className="w-4 h-4" />,
      href: "/",
    },
    {
      key: "reading",
      label: t("nav.reading"),
      icon: <Book className="w-4 h-4" />,
      href: "/reading",
    },
    {
      key: "bookmark",
      label: t("nav.bookmark"),
      icon: <Bookmark className="w-4 h-4" />,
      href: "/bookmark",
    },
    {
      key: "history",
      label: t("nav.history"),
      icon: <History className="w-4 h-4" />,
      href: "/history",
    },
    {
      key: "settings",
      label: t("nav.settings"),
      icon: <Settings className="w-4 h-4" />,
      href: "/settings",
    },
  ];

  const adminMenuItems: MenuItem[] = [
    {
      key: "content",
      label: t("layout.contentManagement"),
      icon: <BookOpen className="w-4 h-4" />,
      children: [
        {
          key: "novel",
          label: t("nav.novel"),
          icon: <BookText className="w-4 h-4" />,
          href: "/novel",
        },
        {
          key: "comic",
          label: t("nav.comic"),
          icon: <Image className="w-4 h-4" />,
          href: "/comic",
        },
        {
          key: "animation",
          label: t("nav.animation"),
          icon: <Film className="w-4 h-4" />,
          href: "/animation",
        },
      ],
    },
    {
      key: "users",
      label: t("layout.userManagement"),
      icon: <Users className="w-4 h-4" />,
      href: "/users",
    },
    {
      key: "tags",
      label: t("layout.tagManagement"),
      icon: <Tags className="w-4 h-4" />,
      href: "/tags",
    },
  ];

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const isParentActive = (item: MenuItem) => {
    if (item.href) return isActive(item.href);
    if (item.children) {
      return item.children.some((child) => isActive(child.href));
    }
    return false;
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openMenus.includes(item.key) || isParentActive(item);
    const active = isActive(item.href);

    if (collapsed) {
      if (hasChildren) {
        return (
          <DropdownMenu key={item.key}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center justify-center w-full h-10 rounded-md transition-colors",
                        isParentActive(item)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {item.icon}
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent side="right" align="start">
              {item.children!.map((child) => (
                <DropdownMenuItem key={child.key} asChild>
                  <Link to={child.href!} className="flex items-center gap-2">
                    {child.icon}
                    <span>{child.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      return (
        <TooltipProvider key={item.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={item.href!}
                className={cn(
                  "flex items-center justify-center w-full h-10 rounded-md transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {item.icon}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (hasChildren) {
      return (
        <Collapsible
          key={item.key}
          open={isOpen}
          onOpenChange={() => toggleMenu(item.key)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-between w-full h-10 px-3 rounded-md transition-colors",
                isParentActive(item)
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </div>
              {isOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 pt-1 space-y-1">
            {item.children!.map((child) => (
              <Link
                key={child.key}
                to={child.href!}
                className={cn(
                  "flex items-center gap-3 h-9 px-3 rounded-md transition-colors",
                  isActive(child.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {child.icon}
                <span className="text-sm">{child.label}</span>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link
        key={item.key}
        to={item.href!}
        className={cn(
          "flex items-center gap-3 h-10 px-3 rounded-md transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent hover:text-accent-foreground",
        )}
      >
        {item.icon}
        {!collapsed && <span className="text-sm">{item.label}</span>}
      </Link>
    );
  };

  return (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {menuItems.map(renderMenuItem)}
      {isAdmin && (
        <>
          <Separator className="my-4" />
          {adminMenuItems.map(renderMenuItem)}
        </>
      )}
    </nav>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  variant = "desktop",
}: SidebarProps) {
  const { t } = useTranslation();
  const isMobileDrawer = variant === "mobile";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-background transition-all duration-300",
        isMobileDrawer ? "w-full" : "border-r",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center h-14 border-b",
          collapsed ? "justify-center" : "px-3",
        )}
      >
        {collapsed ? (
          isMobileDrawer ? (
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              <span className="font-semibold text-lg">ComicFun</span>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <PanelLeft className="w-4 h-4" />
              <span className="sr-only">{t("layout.toggleSidebar")}</span>
            </Button>
          )
        ) : (
          <>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              <span className="font-semibold text-lg">ComicFun</span>
            </div>
            {!isMobileDrawer && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="ml-auto"
              >
                <PanelLeftClose className="w-4 h-4" />
                <span className="sr-only">{t("layout.toggleSidebar")}</span>
              </Button>
            )}
          </>
        )}
      </div>

      <MenuItems collapsed={collapsed} />
    </aside>
  );
}
