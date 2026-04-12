"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { StylePickerDialog } from "@/components/video-editor/StylePickerDialog";
import type { ChannelStyleRecord } from "@/lib/channel-styles/types";

export function VideoEditorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [styles, setStyles] = useState<ChannelStyleRecord[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [elevenKey, setElevenKey] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [envReady, setEnvReady] = useState<{
    openai: boolean;
    nanoBanana: boolean;
    elevenlabs: boolean;
  } | null>(null);

  const [styleDialogOpen, setStyleDialogOpen] = useState(false);

  useEffect(() => {
    const styleId = searchParams.get("styleId");
    if (styleId !== null) {
      setSelectedStyleId(styleId);
      router.replace("/video-editor", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    fetch("/api/env-status")
      .then((r) => r.json())
      .then(
        (data: {
          openai?: boolean;
          nanoBanana?: boolean;
          elevenlabs?: boolean;
        }) => {
          setEnvReady({
            openai: Boolean(data.openai),
            nanoBanana: Boolean(data.nanoBanana),
            elevenlabs: Boolean(data.elevenlabs),
          });
        },
      )
      .catch(() =>
        setEnvReady({ openai: false, nanoBanana: false, elevenlabs: false }),
      );
  }, []);

  useEffect(() => {
    fetch("/api/styles")
      .then((r) => r.json())
      .then((data: { styles?: ChannelStyleRecord[] }) => {
        setStyles(data.styles ?? []);
      })
      .catch(() => setStyles([]));
  }, []);

  async function runGenerate(styleId: string) {
    setStatus("running");
    setMessage("Generating… this can take several minutes.");
    setSlug(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic,
          skipVoice: !voiceEnabled,
          ...(styleId.trim() ? { styleId: styleId.trim() } : {}),
          ...(openaiKey.trim()
            ? { openaiApiKey: openaiKey.trim() }
            : {}),
          ...(geminiKey.trim()
            ? { geminiApiKey: geminiKey.trim() }
            : {}),
          ...(elevenKey.trim()
            ? { elevenlabsApiKey: elevenKey.trim() }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        slug?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setStatus("done");
      setSlug(data.slug ?? null);
      setMessage(
        "Done! Open Studio in the sidebar to preview and export your video (slug below).",
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Generation failed");
    }
  }

  function handleGenerateClick() {
    if (!title.trim() || !topic.trim()) {
      setMessage("Please enter a story title and topic first.");
      setStatus("error");
      return;
    }
    setMessage(null);
    void runGenerate(selectedStyleId);
  }

  function handleStyleChangeConfirm(styleId: string) {
    setSelectedStyleId(styleId);
    setStyleDialogOpen(false);
  }

  const keysOk =
    envReady &&
    envReady.openai &&
    envReady.nanoBanana &&
    (envReady.elevenlabs || !voiceEnabled);

  const selectedStyle = styles.find((s) => s.id === selectedStyleId);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-900">Video editor</h1>
      <p className="mt-2 text-slate-600">
        Generate a short AI story video: script, images, voiceover, and
        timeline — same pipeline as{" "}
        <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm">
          npm run gen
        </code>
        . API keys are read from the server&apos;s{" "}
        <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm">.env</code>{" "}
        by default (never typed in the browser unless you use overrides below).
      </p>

      {envReady && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            keysOk
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {keysOk ? (
            <p>
              <strong>Ready:</strong>{" "}
              <code className="text-xs">OPENAI_API_KEY</code>,{" "}
              <code className="text-xs">NANO_BANANA_API_KEY</code> (Gemini
              images)
              {voiceEnabled ? (
                <>
                  , and <code className="text-xs">ELEVENLABS_API_KEY</code> are
                  set on the server. You only need title and topic — no keys in
                  this form.
                </>
              ) : (
                <>
                  {" "}
                  are set. Voiceover is off, so ElevenLabs is not required for
                  generation.
                </>
              )}
            </p>
          ) : (
            <p>
              <strong>Missing env:</strong> add{" "}
              <code className="text-xs">OPENAI_API_KEY</code>,{" "}
              <code className="text-xs">NANO_BANANA_API_KEY</code>
              {voiceEnabled ? (
                <>
                  , and <code className="text-xs">ELEVENLABS_API_KEY</code>
                </>
              ) : null}{" "}
              to <code className="text-xs">.env</code> in the project root, then
              restart <code className="text-xs">pnpm run dev</code>. Or turn off
              voiceover to test without ElevenLabs, or use &quot;Advanced&quot;
              overrides below.
            </p>
          )}
        </div>
      )}

      <div className="mt-8 space-y-6 rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
        <form
          onSubmit={(e) => e.preventDefault()}
          autoComplete="off"
          className="space-y-6"
        >
          <div className="rounded-xl border border-surface-border bg-surface-muted p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md border bg-white">
                  {selectedStyle ? (
                    <Image
                      src={selectedStyle.thumbnailUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
                      Basic
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    Style for this video
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {selectedStyle ? (
                      <>
                        <span className="font-medium text-slate-900">
                          {selectedStyle.name}
                        </span>
                        <span className="text-slate-500">
                          {" "}
                          · {selectedStyle.videoAspectRatio} ·{" "}
                          {selectedStyle.referenceCount} refs
                        </span>
                      </>
                    ) : (
                      "Basic — no reference style."
                    )}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => setStyleDialogOpen(true)}
                disabled={status === "running"}
              >
                {selectedStyle ? "Change style" : "Choose style"}
              </Button>
            </div>
          </div>

          <div>
            <label
              htmlFor="story-title-field"
              className="block text-sm font-medium text-slate-700"
            >
              Story title
            </label>
            <input
              id="story-title-field"
              name="tbgen_story_title"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. The deepest ocean mysteries"
            />
          </div>
          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-slate-700"
            >
              {selectedStyle
                ? `New topic (following ${selectedStyle.name} format)`
                : "Topic"}
            </label>
            <textarea
              id="topic"
              required
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Fun science facts for a general audience"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-row items-center justify-between rounded-xl border border-surface-border bg-surface-muted px-4 py-3">
            <div className="space-y-1 pr-4">
              <Label
                htmlFor="voiceover-switch"
                className="text-sm font-medium text-slate-800"
              >
                Voiceover (ElevenLabs)
              </Label>
              <p className="text-xs text-slate-600">
                Turn off to generate with silent audio and save credits while
                testing.
              </p>
            </div>
            <Switch
              id="voiceover-switch"
              checked={voiceEnabled}
              onCheckedChange={setVoiceEnabled}
            />
          </div>

          <button
            type="button"
            disabled={status === "running"}
            onClick={handleGenerateClick}
            className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "running" ? "Generating…" : "Generate video"}
          </button>
        </form>

        <details className="rounded-lg border border-dashed border-surface-border bg-surface-muted p-4 text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">
            Advanced — override API keys (optional)
          </summary>
          <p className="mt-2 text-slate-600">
            Only if you need different keys than{" "}
            <code className="text-xs">.env</code> for this run. Leave blank to
            use the server environment.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="openai"
                className="block text-xs font-medium text-slate-600"
              >
                OpenAI API key
              </label>
              <input
                id="openai"
                type="password"
                autoComplete="new-password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="mt-1 w-full rounded border border-surface-border bg-white px-2 py-1.5 text-sm"
                placeholder="Leave empty to use .env"
              />
            </div>
            <div>
              <label
                htmlFor="gemini"
                className="block text-xs font-medium text-slate-600"
              >
                Gemini API key (NANO_BANANA)
              </label>
              <input
                id="gemini"
                type="password"
                autoComplete="new-password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="mt-1 w-full rounded border border-surface-border bg-white px-2 py-1.5 text-sm"
                placeholder="Leave empty to use .env"
              />
            </div>
            <div>
              <label
                htmlFor="eleven"
                className="block text-xs font-medium text-slate-600"
              >
                ElevenLabs API key
              </label>
              <input
                id="eleven"
                type="password"
                autoComplete="new-password"
                value={elevenKey}
                onChange={(e) => setElevenKey(e.target.value)}
                className="mt-1 w-full rounded border border-surface-border bg-white px-2 py-1.5 text-sm"
                placeholder="Leave empty to use .env"
              />
            </div>
          </div>
        </details>
      </div>

      {message && (
        <div
          className={`mt-6 rounded-xl border p-4 text-sm ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-surface-border bg-white text-slate-700"
          }`}
        >
          {message}
          {slug && (
            <p className="mt-2 font-mono text-xs text-slate-600">
              Output slug: <strong>{slug}</strong>
            </p>
          )}
        </div>
      )}

      <StylePickerDialog
        open={styleDialogOpen}
        onOpenChange={setStyleDialogOpen}
        styles={styles}
        initialStyleId={selectedStyleId}
        onConfirm={handleStyleChangeConfirm}
        confirmLabel="Use this style"
      />
    </div>
  );
}
