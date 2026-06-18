"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { AspectRatioToggle } from "@/components/styles/AspectRatioToggle";
import { YouTubeTranscriptImport } from "@/components/styles/YouTubeTranscriptImport";
import { MAX_REFERENCE_IMAGES_PER_STYLE } from "@/lib/channel-styles/image-limits";
import { cn } from "@/lib/utils";

const STEPS = [
  "Basic info",
  "Style reference images",
  "Reference transcript",
  "Create",
] as const;

export default function NewStylePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [description, setDescription] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"9:16" | "16:9">(
    "9:16",
  );
  const [targetWordInput, setTargetWordInput] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [transcriptTitle, setTranscriptTitle] = useState("");
  const [transcriptContent, setTranscriptContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) {
      setImages((prev) =>
        [...prev, ...files].slice(0, MAX_REFERENCE_IMAGES_PER_STYLE),
      );
    }
  }, []);

  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setImages((prev) =>
      [...prev, ...Array.from(files)].slice(0, MAX_REFERENCE_IMAGES_PER_STYLE),
    );
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const loadTxtFile = async (file: File) => {
    const text = await file.text();
    setTranscriptContent(text);
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return images.length >= 1;
    if (step === 2) {
      return transcriptTitle.trim().length > 0 && transcriptContent.trim().length > 0;
    }
    return true;
  };

  const submit = async () => {
    setError(null);
    const validTranscripts =
      transcriptTitle.trim() && transcriptContent.trim()
        ? [
            {
              title: transcriptTitle.trim(),
              content: transcriptContent.trim(),
            },
          ]
        : [];

    if (images.length < 1) {
      setError("Add at least one style reference image.");
      return;
    }
    if (images.length > MAX_REFERENCE_IMAGES_PER_STYLE) {
      setError(
        `Each style supports up to ${MAX_REFERENCE_IMAGES_PER_STYLE} reference images.`,
      );
      return;
    }
    if (validTranscripts.length < 1) {
      setError("Add a reference transcript with title and content.");
      return;
    }

    const tw = targetWordInput.trim();
    if (tw !== "") {
      const n = Number(tw);
      if (!Number.isInteger(n) || n < 1 || n > 4000) {
        setError(
          "Target word count must be a whole number from 1 to 4000, or leave blank for automatic length.",
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("creatorName", creatorName.trim());
      form.set("description", description.trim());
      form.set("videoAspectRatio", videoAspectRatio);
      if (tw !== "") {
        form.set("targetTranscriptWordCount", tw);
      }
      form.set("transcripts", JSON.stringify(validTranscripts));
      images.forEach((f) => form.append("images", f));

      const res = await fetch("/api/styles", { method: "POST", body: form });
      const data = (await res.json()) as { error?: string; style?: { id: string } };
      if (!res.ok) {
        throw new Error(data.error || "Failed to create style");
      }
      if (data.style?.id) {
        router.push(`/styles/${data.style.id}`);
        return;
      }
      throw new Error("Unexpected response");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full">
      <Link
        href="/styles"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to styles
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:mt-6 sm:text-3xl">Create style</h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        Add a name, style-only reference images, and one reference transcript.
        We&apos;ll analyze it to capture format and pacing.
      </p>

      <div className="-mx-4 mt-6 border-b border-border px-4 pb-4 sm:mx-0 sm:mt-8 sm:px-0">
        <div className="scrollbar-none flex w-full snap-x snap-mandatory gap-2 overflow-x-auto sm:gap-3 sm:overflow-visible">
          {STEPS.map((label, i) => {
            const mobileLabels = ["Info", "Images", "Transcript", "Create"] as const;
            return (
              <div
                key={label}
                className={cn(
                  "flex min-h-11 min-w-[4.75rem] shrink-0 snap-start items-center justify-center rounded-lg px-2.5 text-xs font-medium leading-none sm:min-h-10 sm:min-w-0 sm:flex-1 sm:px-3 sm:text-sm",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground",
                )}
              >
                <span className="whitespace-nowrap">
                  <span className="sm:hidden">
                    {i + 1}. {mobileLabels[i]}
                  </span>
                  <span className="hidden sm:inline">
                    {i + 1}. {label}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:mt-8 sm:p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="style-name">Style name *</Label>
              <Input
                id="style-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. spencer"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="creator">Creator / voice name</Label>
              <Input
                id="creator"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Optional"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Optional notes"
              />
            </div>
            <div>
              <Label>AI image shape (for generation)</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Matches short-form portrait (9:16) or landscape (16:9) for scene
                images.
              </p>
              <div className="mt-2">
                <AspectRatioToggle
                  value={videoAspectRatio}
                  onChange={setVideoAspectRatio}
                  labelStyle="descriptive"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-target-words">Target script length (words)</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. Generated narration aims for this many words (1–4000).
                Leave blank to infer length from your reference transcript.
              </p>
              <input
                id="new-target-words"
                type="number"
                min={1}
                max={4000}
                inputMode="numeric"
                placeholder="Automatic from reference"
                value={targetWordInput}
                onChange={(e) => setTargetWordInput(e.target.value)}
                className="mt-2 max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="text-sm text-muted-foreground">
              Upload 1–2 images that show <strong>only how the art should look</strong>{" "}
              (line work, color, texture, stylization). Use neutral or varied
              subjects—do not rely on these frames to define who appears or what
              happens; character consistency uses the Characters tab after the
              style exists. Prefer images without watermarks or logos (up to 10MB
              each).
            </p>
            {images.length < MAX_REFERENCE_IMAGES_PER_STYLE ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="mt-4 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center"
              >
                <Upload className="mb-2 size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drag & drop images here</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {images.length}/{MAX_REFERENCE_IMAGES_PER_STYLE} added
                </p>
                <label className="mt-2">
                  <span className="cursor-pointer text-sm text-primary underline">
                    or browse
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onPickImages}
                  />
                </label>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Maximum of {MAX_REFERENCE_IMAGES_PER_STYLE} reference images
                reached. Remove one below to replace it.
              </p>
            )}
            {images.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="relative overflow-hidden rounded-lg border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 rounded bg-background/90 p-1 shadow"
                      aria-label="Remove"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Paste a YouTube URL to import captions, or enter a reference script
              manually. Use a clear title (e.g. the original video title). Each
              style supports one reference transcript.
            </p>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <YouTubeTranscriptImport
                onImported={({ title, content }) => {
                  setTranscriptTitle(title);
                  setTranscriptContent(content);
                }}
                disabled={submitting}
              />
              <div>
                <Label>Transcript title</Label>
                <Input
                  value={transcriptTitle}
                  onChange={(e) => setTranscriptTitle(e.target.value)}
                  placeholder="e.g. POV: Your life as EVERY NAVY SEAL RANK"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Content</Label>
                <textarea
                  value={transcriptContent}
                  onChange={(e) => setTranscriptContent(e.target.value)}
                  rows={8}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
                  placeholder="Paste transcript text…"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Or upload .txt
                </Label>
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="mt-1 block text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void loadTxtFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-sm">
            <p>
              Ready to create <strong>{name.trim() || "this style"}</strong> with{" "}
              <strong>{images.length}</strong> image(s) and one reference transcript.
            </p>
            <p className="text-muted-foreground">
              We&apos;ll save files under{" "}
              <code className="rounded bg-muted px-1">public/channel-styles/</code>{" "}
              and run AI format analysis on the transcript.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || submitting}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              disabled={!canNext() || submitting}
              onClick={() => setStep((s) => s + 1)}
              className="w-full sm:w-auto"
            >
              Next
              <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="w-full sm:w-auto"
            >
              {submitting ? "Analyzing reference transcript…" : "Create style"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
