"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { AspectRatioToggle } from "@/components/styles/AspectRatioToggle";
import { cn } from "@/lib/utils";

type TranscriptDraft = { id: string; title: string; content: string };

const STEPS = [
  "Basic info",
  "Style reference images",
  "Transcripts",
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
  const [transcripts, setTranscripts] = useState<TranscriptDraft[]>([
    { id: crypto.randomUUID(), title: "", content: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) {
      setImages((prev) => [...prev, ...files]);
    }
  }, []);

  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setImages((prev) => [...prev, ...Array.from(files)]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addTranscript = () => {
    setTranscripts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", content: "" },
    ]);
  };

  const updateTranscript = (
    id: string,
    patch: Partial<Pick<TranscriptDraft, "title" | "content">>,
  ) => {
    setTranscripts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  };

  const removeTranscript = (id: string) => {
    setTranscripts((prev) => (prev.length <= 1 ? prev : prev.filter((t) => t.id !== id)));
  };

  const loadTxtFile = async (id: string, file: File) => {
    const text = await file.text();
    updateTranscript(id, { content: text });
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return images.length >= 1;
    if (step === 2) {
      return transcripts.some(
        (t) => t.title.trim() && t.content.trim().length > 0,
      );
    }
    return true;
  };

  const submit = async () => {
    setError(null);
    const validTranscripts = transcripts
      .filter((t) => t.title.trim() && t.content.trim())
      .map((t) => ({ title: t.title.trim(), content: t.content.trim() }));

    if (images.length < 1) {
      setError("Add at least one style reference image.");
      return;
    }
    if (validTranscripts.length < 1) {
      setError("Add at least one transcript with title and content.");
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

      <h1 className="mt-6 text-3xl font-bold tracking-tight">Create style</h1>
      <p className="mt-2 text-muted-foreground">
        Add a name, style-only reference images, and at least one transcript.
        We&apos;ll analyze the transcript to capture format and pacing.
      </p>

      <div className="mt-8 flex gap-2 border-b border-border pb-4">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium sm:text-sm",
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted/50 text-muted-foreground",
            )}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
              Upload images that show <strong>only how the art should look</strong>{" "}
              (line work, color, texture, stylization). Use neutral or varied
              subjects—do not rely on these frames to define who appears or what
              happens; character consistency uses the Characters tab after the
              style exists. Prefer images without watermarks or logos (up to 10MB
              each).
            </p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="mt-4 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center"
            >
              <Upload className="mb-2 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drag & drop images here</p>
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
              Paste a reference script or upload .txt files. Add a clear title
              for each (e.g. the original video title).
            </p>
            {transcripts.map((t) => (
              <div
                key={t.id}
                className="space-y-3 rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Label>Transcript title</Label>
                    <Input
                      value={t.title}
                      onChange={(e) =>
                        updateTranscript(t.id, { title: e.target.value })
                      }
                      placeholder="e.g. POV: Your life as EVERY NAVY SEAL RANK"
                      className="mt-1"
                    />
                  </div>
                  {transcripts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6 shrink-0"
                      onClick={() => removeTranscript(t.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label>Content</Label>
                  <textarea
                    value={t.content}
                    onChange={(e) =>
                      updateTranscript(t.id, { content: e.target.value })
                    }
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
                      if (f) void loadTxtFile(t.id, f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addTranscript}>
              + Add another transcript
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-sm">
            <p>
              Ready to create <strong>{name.trim() || "this style"}</strong> with{" "}
              <strong>{images.length}</strong> image(s) and{" "}
              <strong>
                {
                  transcripts.filter((t) => t.title.trim() && t.content.trim())
                    .length
                }
              </strong>{" "}
              transcript(s).
            </p>
            <p className="text-muted-foreground">
              We&apos;ll save files under{" "}
              <code className="rounded bg-muted px-1">public/channel-styles/</code>{" "}
              and run AI analysis on the first transcript.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || submitting}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              disabled={!canNext()}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
              <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button type="button" disabled={submitting} onClick={() => void submit()}>
              {submitting ? "Analyzing reference transcript…" : "Create style"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
