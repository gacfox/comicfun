import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  User,
  Sun,
  Moon,
  Monitor,
  Settings,
  Github,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/stores";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface HeaderProps {
  onMenuClick: () => void;
  isMobile: boolean;
}

export function Header({ onMenuClick, isMobile }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const getCurrentThemeIcon = () => {
    if (!mounted) return <Monitor className="w-5 h-5" />;
    switch (theme) {
      case "light":
        return <Sun className="w-5 h-5" />;
      case "dark":
        return <Moon className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const cycleTheme = () => {
    const modes = ["system", "light", "dark"];
    const currentIndex = modes.indexOf(theme || "system");
    const nextIndex = (currentIndex + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  const getBreadcrumbs = () => {
    const path = window.location.pathname;

    const contentPages = ["/novel", "/comic", "/animation"];
    const isContentPage = contentPages.some((p) => path.startsWith(p));

    const pageLabels: Record<string, string> = {
      "/novel": t("nav.novel"),
      "/comic": t("nav.comic"),
      "/animation": t("nav.animation"),
      "/reading": t("nav.reading"),
      "/tags": t("layout.tagManagement"),
      "/users": t("layout.userManagement"),
      "/settings": t("nav.settings"),
      "/bookmark": t("nav.bookmark"),
      "/history": t("nav.history"),
      "/about": t("nav.about"),
      "/profile": t("profile.title"),
    };

    if (path === "/") {
      return [{ label: t("nav.home"), href: "/" }];
    }

    if (isContentPage) {
      const breadcrumbs = [{ label: t("layout.contentManagement"), href: "" }];

      const basePath = contentPages.find((p) => path.startsWith(p));
      if (basePath && pageLabels[basePath]) {
        breadcrumbs.push({ label: pageLabels[basePath], href: basePath });
      }

      if (path.match(/^\/(novel|comic|animation)\/\d+$/)) {
        const editLabel = path.startsWith("/novel")
          ? t("novel.metadata")
          : t("comic.metadata");
        breadcrumbs.push({ label: editLabel, href: path });
      }

      return breadcrumbs;
    }

    if (pageLabels[path]) {
      return [{ label: pageLabels[path], href: path }];
    }

    return [{ label: t("nav.home"), href: "/" }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-background">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={item.href}>
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href}>
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <a
            href="https://github.com/gacfox/comicfun"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </Button>

        <Button variant="ghost" size="icon" onClick={cycleTheme}>
          {getCurrentThemeIcon()}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
        >
          <Settings className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.displayUsername
                    ? getInitials(user.displayUsername)
                    : user?.username
                      ? getInitials(user.username)
                      : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none">
                  {user?.displayUsername || user?.username}
                </p>
                {user?.isAdmin === 1 && (
                  <Badge variant="secondary" className="text-xs">
                    {t("home.admin")}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="w-4 h-4 mr-2" />
              {t("userMenu.profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t("userMenu.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
