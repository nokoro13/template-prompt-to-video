"use client";

import type { ReactNode } from "react";
import { Suspense, useRef } from "react";
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
  const landingScrollRef = useRef<HTMLDivElement>(null);
  const isStudio = pathname.startsWith("/studio");
  const isAuthPage =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isLanding = pathname === "/";

  if (isLanding || isAuthPage) {
    return (
      <LandingScrollProvider scrollRef={landingScrollRef}>
        <div
          ref={landingScrollRef}
          className={cn(
            "h-svh overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-pt-20 [scrollbar-gutter:stable]",
            isLanding && "bg-slate-50",
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
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-2">
            <SidebarTrigger />
            <TopBar />
          </header>
          <div
            className={cn(
              "min-h-0 flex-1",
              isStudio
                ? "flex flex-col overflow-hidden p-4 lg:p-6"
                : "overflow-y-auto overflow-x-hidden p-6 lg:p-8",
            )}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
