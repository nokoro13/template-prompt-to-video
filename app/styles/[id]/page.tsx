"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ChannelStyleRecord,
  ExtractedFormat,
  StyleCharacter,
} from "@/lib/channel-styles/types";
import { AspectRatioToggle } from "@/components/styles/AspectRatioToggle";
import { YouTubeTranscriptImport } from "@/components/styles/YouTubeTranscriptImport";
import { cn } from "@/lib/utils";

type Tab = "overview" | "references" | "format" | "characters";

export default function StyleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [style, setStyle] = useState<ChannelStyleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const [name, setName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [description, setDescription] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"9:16" | "16:9">(
    "9:16",
  );
  const [targetWordInput, setTargetWordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formatJson, setFormatJson] = useState("");
  const [chars, setChars] = useState<StyleCharacter[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/styles/${id}`);
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Not found");
      }
      if (!data.style) throw new Error("Missing style");
      setStyle(data.style);
      setName(data.style.name);
      setCreatorName(data.style.creatorName ?? "");
      setDescription(data.style.description ?? "");
      setVideoAspectRatio(data.style.videoAspectRatio ?? "9:16");
      setTargetWordInput(
        data.style.targetTranscriptWordCount != null
          ? String(data.style.targetTranscriptWordCount)
          : "",
      );
      setFormatJson(
        JSON.stringify(data.style.extractedFormat ?? {}, null, 2),
      );
      setChars(data.style.characters ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setStyle(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMeta = async () => {
    if (!id) return;
    const tw = targetWordInput.trim();
    let targetTranscriptWordCount: number | null;
    if (tw === "") {
      targetTranscriptWordCount = null;
    } else {
      const n = Number(tw);
      if (!Number.isInteger(n) || n < 1 || n > 4000) {
        setError("Target word count must be a whole number from 1 to 4000, or leave blank for automatic length.");
        return;
      }
      targetTranscriptWordCount = n;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/styles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          creatorName: creatorName.trim() || null,
          description: description.trim() || null,
          videoAspectRatio,
          targetTranscriptWordCount,
        }),
      });
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.style) {
        setStyle(data.style);
        setTargetWordInput(
          data.style.targetTranscriptWordCount != null
            ? String(data.style.targetTranscriptWordCount)
            : "",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveFormat = async () => {
    if (!id) return;
    let parsed: ExtractedFormat;
    try {
      parsed = JSON.parse(formatJson) as ExtractedFormat;
    } catch {
      setError("Invalid JSON for extracted format");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/styles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedFormat: parsed }),
      });
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.style) {
        setStyle(data.style);
        setFormatJson(JSON.stringify(data.style.extractedFormat ?? {}, null, 2));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveCharacters = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/styles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characters: chars }),
      });
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.style) setStyle(data.style);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const reanalyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/styles/${id}/analyze`, { method: "POST" });
      const data = (await res.json()) as {
        extractedFormat?: ExtractedFormat;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      if (data.extractedFormat) {
        setFormatJson(JSON.stringify(data.extractedFormat, null, 2));
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const removeImage = async (imagePath: string) => {
    if (!id || !confirm("Remove this style reference image?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/styles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeImagePaths: [imagePath] }),
      });
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) throw new Error(data.error || "Remove failed");
      if (data.style) setStyle(data.style);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setSaving(false);
    }
  };

  const removeTranscript = async (tid: string) => {
    if (!id || !confirm("Remove this transcript?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/styles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeTranscriptIds: [tid] }),
      });
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) throw new Error(data.error || "Remove failed");
      if (data.style) setStyle(data.style);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setSaving(false);
    }
  };

  const addImages = async (files: FileList | null) => {
    if (!id || !files?.length) return;
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("images", f));
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/styles/${id}/images`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (data.style) setStyle(data.style);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const addTranscriptRow = async (title: string, content: string) => {
    if (!id || !title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/styles/${id}/transcripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcripts: [{ title: title.trim(), content: content.trim() }],
        }),
      });
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) throw new Error(data.error || "Add failed");
      if (data.style) setStyle(data.style);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setSaving(false);
    }
  };

  const [newTTitle, setNewTTitle] = useState("");
  const [newTContent, setNewTContent] = useState("");
  const [charImageBusy, setCharImageBusy] = useState<string | null>(null);

  /** Persist characters to the server so character ids exist before image upload/remove. */
  const persistCharacters = async (): Promise<void> => {
    if (!id) throw new Error("Missing style id");
    const res = await fetch(`/api/styles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characters: chars }),
    });
    const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
    if (!res.ok) throw new Error(data.error || "Could not save characters");
    if (data.style) {
      setStyle(data.style);
      setChars(data.style.characters ?? []);
    }
  };

  const uploadCharacterImage = async (characterId: string, files: FileList | null) => {
    const file = files?.[0];
    if (!id || !file) return;
    setCharImageBusy(characterId);
    setError(null);
    try {
      await persistCharacters();
      const form = new FormData();
      form.set("image", file);
      const res = await fetch(
        `/api/styles/${id}/characters/${encodeURIComponent(characterId)}/image`,
        { method: "POST", body: form },
      );
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (data.style) {
        setStyle(data.style);
        setChars(data.style.characters ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCharImageBusy(null);
    }
  };

  const clearCharacterImage = async (characterId: string) => {
    if (!id || !confirm("Remove this character reference image?")) return;
    setCharImageBusy(characterId);
    setError(null);
    try {
      await persistCharacters();
      const res = await fetch(
        `/api/styles/${id}/characters/${encodeURIComponent(characterId)}/image`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { style?: ChannelStyleRecord; error?: string };
      if (!res.ok) throw new Error(data.error || "Remove failed");
      if (data.style) {
        setStyle(data.style);
        setChars(data.style.characters ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setCharImageBusy(null);
    }
  };

  const deleteStyle = async () => {
    if (!id) return;
    if (!confirm("Delete this style permanently? This cannot be undone.")) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/styles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Delete failed");
      }
      router.push("/styles");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!style) {
    return (
      <div>
        <p className="text-destructive">{error || "Style not found"}</p>
        <Link href="/styles" className="mt-4 inline-block text-sm text-primary">
          ← Back to styles
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "references", label: "References" },
    { id: "format", label: "Format analysis" },
    { id: "characters", label: "Characters" },
  ];

  return (
    <div className="mx-auto w-full">
      <Link
        href="/styles"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All styles
      </Link>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl border bg-muted sm:h-48 sm:w-64">
          <Image
            src={style.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="256px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{style.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {style.creatorName ?? "No creator name"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {style.referenceCount} references · {style.characterCount} characters
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {tab === "overview" && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-creator">Creator / voice</Label>
              <Input
                id="edit-creator"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description</Label>
              <textarea
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Label>AI image shape (for generation)</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Portrait (9:16) or landscape (16:9) for Gemini scene images.
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
              <Label htmlFor="target-words">Target script length (words)</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                When generating a video with this style, the narration script aims
                for this many words (1–4000). Leave blank to infer length from the
                reference transcript.
              </p>
              <Input
                id="target-words"
                type="number"
                min={1}
                max={4000}
                inputMode="numeric"
                placeholder="Automatic from reference"
                value={targetWordInput}
                onChange={(e) => setTargetWordInput(e.target.value)}
                className="mt-2 max-w-xs"
              />
            </div>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void saveMeta()}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}

        {tab === "references" && (
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold">Style reference images</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                These images teach the model <strong>art style only</strong> (how
                things are drawn). They are not used for character likeness—add
                characters separately. Use clean images without watermarks or site
                branding when possible.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {style.references.images.map((src) => (
                  <div
                    key={src}
                    className="relative overflow-hidden rounded-lg border bg-muted"
                  >
                    <div className="relative aspect-video w-full">
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width:640px) 100vw, 50vw"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => void removeImage(src)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Label>Add style reference images</Label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="mt-1 block text-sm"
                  onChange={(e) => void addImages(e.target.files)}
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Transcripts</h3>
              <ul className="mt-3 space-y-2">
                {style.references.transcripts.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium">{t.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeTranscript(t.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-4 rounded-xl border border-dashed p-4">
                <YouTubeTranscriptImport
                  buttonLabel="Import transcript"
                  disabled={saving}
                  onImported={({ title, content }) => {
                    void addTranscriptRow(title, content);
                  }}
                />
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">
                    Or paste transcript manually
                  </summary>
                  <div className="mt-3 space-y-2">
                    <Input
                      placeholder="Title"
                      value={newTTitle}
                      onChange={(e) => setNewTTitle(e.target.value)}
                    />
                    <textarea
                      placeholder="Content"
                      value={newTContent}
                      onChange={(e) => setNewTContent(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        void addTranscriptRow(newTTitle, newTContent);
                        setNewTTitle("");
                        setNewTContent("");
                      }}
                    >
                      Add transcript
                    </Button>
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {tab === "format" && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={analyzing}
                onClick={() => void reanalyze()}
              >
                {analyzing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Re-analyze
              </Button>
              <span className="text-xs text-muted-foreground">
                Uses the first reference transcript and OpenAI.
              </span>
            </div>
            <div>
              <Label>Extracted format (JSON)</Label>
              <textarea
                value={formatJson}
                onChange={(e) => setFormatJson(e.target.value)}
                rows={18}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
              />
            </div>
            <Button type="button" disabled={saving} onClick={() => void saveFormat()}>
              Save format
            </Button>
          </div>
        )}

        {tab === "characters" && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Name recurring characters and optionally upload one portrait per
              character for likeness (uploading again replaces it). Scene generation
              sends <strong>style</strong> reference images (art style only) first,
              then character portraits (up to 14 images total to Gemini). Uploading or
              removing a character image saves the character list first so new rows
              exist on the server.
            </p>
            {chars.map((c, i) => (
              <div
                key={c.id}
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
              >
                <div>
                  <Label>Name</Label>
                  <Input
                    value={c.name}
                    onChange={(e) => {
                      const next = [...chars];
                      next[i] = { ...c, name: e.target.value };
                      setChars(next);
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={c.notes ?? ""}
                    onChange={(e) => {
                      const next = [...chars];
                      next[i] = { ...c, notes: e.target.value };
                      setChars(next);
                    }}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Reference image (likeness)</Label>
                  {c.imageUrl ? (
                    <div className="space-y-4">
                      <div className="relative max-w-md overflow-hidden rounded-lg border bg-muted">
                        <div className="relative aspect-video w-full">
                          <Image
                            src={c.imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width:640px) 100vw, 50vw"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute right-2 top-2"
                          disabled={charImageBusy === c.id}
                          onClick={() => void clearCharacterImage(c.id)}
                        >
                          {charImageBusy === c.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                      <div>
                        <Label>Replace image</Label>
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-1 block text-sm"
                          disabled={charImageBusy === c.id}
                          onChange={(e) =>
                            void uploadCharacterImage(c.id, e.target.files)
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>Add image</Label>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="block text-sm"
                          disabled={charImageBusy === c.id}
                          onChange={(e) =>
                            void uploadCharacterImage(c.id, e.target.files)
                          }
                        />
                        {charImageBusy === c.id ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="sm:col-span-2"
                  onClick={() =>
                    setChars((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  Remove character
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setChars((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    notes: "",
                  },
                ])
              }
            >
              + Add character
            </Button>
            <div>
              <Button
                type="button"
                disabled={saving}
                onClick={() => void saveCharacters()}
              >
                Save characters
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <Button type="button" variant="destructive" onClick={() => void deleteStyle()}>
          Delete style
        </Button>
      </div>
    </div>
  );
}
