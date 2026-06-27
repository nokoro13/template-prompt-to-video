"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";

import { StylePickerDialog } from "@/components/video-editor/StylePickerDialog";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import type { ChannelStyleRecord } from "@/lib/channel-styles/types";

type CreateVideoButtonProps = {
  variant: "sidebar" | "card" | "button" | "hero";
};

/**
 * Opens the style picker, then navigates to the video editor with the chosen style.
 */
export function CreateVideoButton({ variant }: CreateVideoButtonProps) {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [styles, setStyles] = useState<ChannelStyleRecord[]>([]);

  useEffect(() => {
    fetch("/api/styles")
      .then((r) => r.json())
      .then((data: { styles?: ChannelStyleRecord[] }) => {
        setStyles(data.styles ?? []);
      })
      .catch(() => setStyles([]));
  }, []);

  function handleConfirm(styleId: string) {
    setOpen(false);
    if (isMobile) {
      setOpenMobile(false);
    }
    if (styleId.trim()) {
      router.push(
        `/video-editor?styleId=${encodeURIComponent(styleId.trim())}`,
      );
    } else {
      router.push("/video-editor");
    }
  }

  return (
    <>
      {variant === "sidebar" ? (
        <SidebarMenuButton
          type="button"
          closeMobileOnClick={false}
          className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
          onClick={() => setOpen(true)}
        >
          <Plus />
          <span>Create video</span>
        </SidebarMenuButton>
      ) : variant === "button" ? (
        <Button type="button" className="inline-flex w-full gap-2 sm:w-auto" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Create video
        </Button>
      ) : variant === "hero" ? (
        <div className="relative flex w-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 p-4 text-left text-white shadow-md sm:p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative min-w-0">
            <span className="text-base font-semibold sm:text-lg">Create video</span>
            <p className="mt-1 text-sm leading-relaxed text-white/80">
              Script, voiceover, and scene images — then export from Studio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-white/95"
          >
            Choose style
            <ArrowRight className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full flex-col justify-between rounded-2xl bg-brand-600 p-4 text-left text-white shadow-lg transition hover:bg-brand-700 sm:w-auto"
        >
          <span className="text-lg font-semibold">Create video</span>
          <span className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white/20 px-4 py-2.5 text-sm font-medium sm:w-fit sm:rounded-full sm:py-1.5">
            Choose style
          </span>
        </button>
      )}

      <StylePickerDialog
        open={open}
        onOpenChange={setOpen}
        styles={styles}
        initialStyleId=""
        onConfirm={handleConfirm}
        confirmLabel="Continue"
      />
    </>
  );
}
