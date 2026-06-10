"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type YouTubeTranscriptImportProps = {
  onImported: (data: { title: string; content: string }) => void;
  disabled?: boolean;
  className?: string;
  buttonLabel?: string;
};

export function YouTubeTranscriptImport({
  onImported,
  disabled = false,
  className,
  buttonLabel = "Import",
}: YouTubeTranscriptImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importTranscript = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = (await res.json()) as {
        error?: string;
        title?: string;
        content?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not import transcript");
      }
      if (!data.title?.trim() || !data.content?.trim()) {
        throw new Error("Transcript response was incomplete");
      }
      onImported({
        title: data.title.trim(),
        content: data.content.trim(),
      });
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import transcript");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>YouTube video URL</Label>
      <p className="text-xs text-muted-foreground">
        Paste a YouTube link and we&apos;ll pull the captions as your reference
        transcript.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          disabled={disabled || loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void importTranscript();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          disabled={disabled || loading || !url.trim()}
          onClick={() => void importTranscript()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-1 size-4 animate-spin" />
              Importing…
            </>
          ) : (
            buttonLabel
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
