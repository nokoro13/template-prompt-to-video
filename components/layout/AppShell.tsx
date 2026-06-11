"use client";

import type { ReactNode } from "react";
import { Suspense, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { LandingScrollProvider } from "@/components/landing/LandingScrollContext";
import { AppSidebar } from "./app-sidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [landingScrollEl, setLandingScrollEl] = useState<HTMLDivElement | null>(
    null,
  );
  const landingScrollRef = useCallback((node: HTMLDivElement | null) => {
    setLandingScrollEl(node);
  }, []);
  const isStudio = pathname.startsWith("/studio");
  const isAuthPage =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isPricing = pathname.startsWith("/pricing");
  const isLanding = pathname === "/";

  if (isLanding || isAuthPage || isPricing) {
    return (
      <LandingScrollProvider scrollElement={landingScrollEl}>
        <div
          ref={landingScrollRef}
          className={cn(
            "h-svh overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-pt-20 [scrollbar-gutter:stable]",
            isLanding && "bg-slate-50",
            isPricing && "bg-slate-50",
            isAuthPage && "flex items-center justify-center bg-background p-6",
          )}
        >
          {children}
        </div>
      </LandingScrollProvider>
    );
  }

  return (
    <TooltipProvider delay={0}>
      <SidebarProvider defaultOpen className="flex h-svh min-h-0 w-full overflow-hidden">
        <Suspense fallback={null}>
          <AppSidebar />
        </Suspense>
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background/95 px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-2 sm:px-4 md:px-2">
            <SidebarTrigger className="shrink-0" />
            <TopBar />
          </header>
          <div
            className={cn(
              "min-h-0 flex-1 safe-area-bottom",
              isStudio
                ? "flex flex-col overflow-hidden px-3 py-3 sm:p-4 lg:p-6"
                : "overflow-y-auto overflow-x-hidden px-4 py-4 sm:p-6 lg:p-8",
            )}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
