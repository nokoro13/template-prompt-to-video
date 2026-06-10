"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { StylePickerDialog } from "@/components/video-editor/StylePickerDialog";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { ChannelStyleRecord } from "@/lib/channel-styles/types";

type CreateVideoButtonProps = {
  variant: "sidebar" | "card" | "button";
};

/**
 * Opens the style picker, then navigates to the video editor with the chosen style.
 */
export function CreateVideoButton({ variant }: CreateVideoButtonProps) {
  const router = useRouter();
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
          className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
          onClick={() => setOpen(true)}
        >
          <Plus />
          <span>Create video</span>
        </SidebarMenuButton>
      ) : variant === "button" ? (
        <Button type="button" className="inline-flex gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Create video
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-col justify-between rounded-2xl bg-brand-600 p-4 text-left text-white shadow-lg transition hover:bg-brand-700"
        >
          <span className="text-lg font-semibold">Create video</span>
          <span className="mt-4 inline-flex w-fit rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium">
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
