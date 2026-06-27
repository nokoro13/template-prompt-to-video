"use client";

import { StorageImage } from "@/components/ui/storage-image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Film,
  ImageIcon,
  Loader2,
  Mic,
  Play,
  Sparkles,
  Square,
  Wand2,
} from "lucide-react";

import { StylePickerDialog } from "@/components/video-editor/StylePickerDialog";
import { VideoEditorStepActions } from "@/components/video-editor/VideoEditorStepActions";
import { VideoEditorStepBar } from "@/components/video-editor/VideoEditorStepBar";
import { ExportVideoButton } from "@/components/export/ExportVideoButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ChannelStyleRecord } from "@/lib/channel-styles/types";
import type { GeminiImageSize } from "@/lib/generation/generate-with-gemini";

type ProjectScene = {
  index: number;
  text: string;
  imageDescription: string;
  uid: string;
  hasImage: boolean;
  hasAudio: boolean;
  durationMs: number | null;
};

type ProjectPayload = {
  shortTitle: string;
  channelStyleId: string | null;
  videoAspectRatio: "9:16" | "16:9";
  hasTimeline: boolean;
  scenes: ProjectScene[];
};

type ElevenLabsVoiceRow = {
  voice_id: string;
  name: string;
  category?: string | null;
  previewUrl: string | null;
  sampleId: string | null;
};

function formatSceneDuration(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(2)}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${r.toFixed(2).padStart(5, "0")}`;
}

function isValidProjectSlug(s: string): boolean {
  return s.length <= 240 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

export function VideoEditorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [styles, setStyles] = useState<ChannelStyleRecord[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectPayload | null>(null);
  /**
   * Set when opening `/video-editor?slug=…` from Studio (Edit). User stays on
   * scene images / finish only — cannot return to setup, script, or voiceover.
   */
  const [studioEditLock, setStudioEditLock] = useState(false);

  /**
   * When non-null, the current `slug` was opened from `?slug=` in the URL; strip
   * the query after the first successful project load (Studio edit flow).
   */
  const openedFromQuerySlugRef = useRef<string | null>(null);

  /**
   * Bumped after scene images are regenerated so <img src> URLs change and the
   * browser does not keep showing a cached PNG (same path would otherwise look stale).
   */
  const [sceneImageCacheNonce, setSceneImageCacheNonce] = useState(0);

  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [envReady, setEnvReady] = useState<{
    openai: boolean;
    nanoBanana: boolean;
    elevenlabs: boolean;
  } | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** OpenAI Responses API + web_search for the main narration only (not scene split). */
  const [useWebSearchForScript, setUseWebSearchForScript] = useState(false);
  /** Gemini scene image output resolution (default 1K — lower cost per API docs). */
  const [geminiImageSize, setGeminiImageSize] =
    useState<GeminiImageSize>("1K");

  const [voices, setVoices] = useState<ElevenLabsVoiceRow[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [previewBusyVoiceId, setPreviewBusyVoiceId] = useState<string | null>(
    null,
  );

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastBlobUrlRef = useRef<string | null>(null);
  /** Bumps when starting a new preview so stale `onended`/`onerror` from the previous element cannot stop the new one. */
  const previewGenerationRef = useRef(0);

  /** Sequential playback of generated scene MP3s (`/content/{slug}/audio/{uid}.mp3`). */
  const voiceoverPlaybackGenRef = useRef(0);
  const voiceoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const [voiceoverPlaying, setVoiceoverPlaying] = useState(false);
  /** Bumped after voice generation so the browser reloads audio instead of caching old MP3s. */
  const [voiceoverCacheNonce, setVoiceoverCacheNonce] = useState(0);

  const stopGeneratedVoiceover = useCallback(() => {
    voiceoverPlaybackGenRef.current += 1;
    const a = voiceoverAudioRef.current;
    voiceoverAudioRef.current = null;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
      a.removeAttribute("src");
      try {
        a.load();
      } catch {
        // ignore
      }
    }
    setVoiceoverPlaying(false);
  }, []);

  const stopVoicePreview = useCallback(() => {
    const a = previewAudioRef.current;
    previewAudioRef.current = null;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
      a.removeAttribute("src");
      try {
        a.load();
      } catch {
        // ignore
      }
    }
    if (lastBlobUrlRef.current) {
      URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopVoicePreview();
      stopGeneratedVoiceover();
    };
  }, [stopVoicePreview, stopGeneratedVoiceover]);

  useEffect(() => {
    if (step !== 2) {
      stopGeneratedVoiceover();
    }
  }, [step, stopGeneratedVoiceover]);

  const playGeneratedVoiceover = useCallback(() => {
    if (!slug || !project) return;
    const scenesWithAudio = project.scenes.filter((s) => s.hasAudio);
    if (scenesWithAudio.length === 0) return;
    stopVoicePreview();
    const gen = ++voiceoverPlaybackGenRef.current;
    setVoiceoverPlaying(true);
    setError(null);

    const playNext = (sceneIndex: number) => {
      if (voiceoverPlaybackGenRef.current !== gen) return;
      if (sceneIndex >= scenesWithAudio.length) {
        voiceoverAudioRef.current = null;
        setVoiceoverPlaying(false);
        return;
      }
      const scene = scenesWithAudio[sceneIndex];
      const url = `/content/${encodeURIComponent(slug)}/audio/${scene.uid}.mp3?v=${voiceoverCacheNonce}`;
      const audio = new Audio(url);
      voiceoverAudioRef.current = audio;
      audio.onended = () => {
        playNext(sceneIndex + 1);
      };
      audio.onerror = () => {
        if (voiceoverPlaybackGenRef.current !== gen) return;
        setError("Could not play generated voiceover.");
        stopGeneratedVoiceover();
      };
      void audio.play().catch((e) => {
        if (voiceoverPlaybackGenRef.current !== gen) return;
        setError(e instanceof Error ? e.message : "Playback failed");
        stopGeneratedVoiceover();
      });
    };

    playNext(0);
  }, [
    slug,
    project,
    voiceoverCacheNonce,
    stopVoicePreview,
    stopGeneratedVoiceover,
  ]);

  const playVoicePreview = useCallback(
    async (v: ElevenLabsVoiceRow) => {
      if (!v.previewUrl && !v.sampleId) return;
      const generation = ++previewGenerationRef.current;
      stopGeneratedVoiceover();
      stopVoicePreview();
      setPreviewBusyVoiceId(v.voice_id);
      setError(null);
      try {
        let src: string;
        if (v.previewUrl) {
          src = v.previewUrl;
        } else {
          const res = await fetch("/api/elevenlabs/voice-sample", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              voiceId: v.voice_id,
              sampleId: v.sampleId,
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            throw new Error(t.slice(0, 200) || res.statusText);
          }
          if (previewGenerationRef.current !== generation) {
            return;
          }
          const blob = await res.blob();
          src = URL.createObjectURL(blob);
          lastBlobUrlRef.current = src;
        }

        if (previewGenerationRef.current !== generation) {
          if (lastBlobUrlRef.current === src) {
            URL.revokeObjectURL(src);
            lastBlobUrlRef.current = null;
          }
          return;
        }

        const audio = new Audio(src);
        previewAudioRef.current = audio;
        audio.onended = () => {
          if (previewGenerationRef.current !== generation) return;
          stopVoicePreview();
        };
        audio.onerror = () => {
          if (previewGenerationRef.current !== generation) return;
          stopVoicePreview();
          setError("Could not play voice preview.");
        };
        await audio.play();
      } catch (e) {
        if (previewGenerationRef.current === generation) {
          stopVoicePreview();
          setError(e instanceof Error ? e.message : "Preview failed");
        }
      } finally {
        if (previewGenerationRef.current === generation) {
          setPreviewBusyVoiceId(null);
        }
      }
    },
    [stopVoicePreview, stopGeneratedVoiceover],
  );

  const fetchProject = useCallback(async (s: string): Promise<ProjectPayload> => {
    const res = await fetch(`/api/generate/project/${encodeURIComponent(s)}`);
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      shortTitle?: string;
      channelStyleId?: string | null;
      videoAspectRatio?: "9:16" | "16:9";
      hasTimeline?: boolean;
      scenes?: ProjectScene[];
    };
    if (!res.ok) {
      throw new Error(data.error || res.statusText);
    }
    const payload: ProjectPayload = {
      shortTitle: data.shortTitle ?? "",
      channelStyleId: data.channelStyleId ?? null,
      videoAspectRatio: data.videoAspectRatio ?? "9:16",
      hasTimeline: Boolean(data.hasTimeline),
      scenes: data.scenes ?? [],
    };
    setProject(payload);
    return payload;
  }, []);

  useEffect(() => {
    const styleId = searchParams.get("styleId");
    if (styleId !== null) {
      setSelectedStyleId(styleId);
      router.replace("/video-editor", { scroll: false });
    }
  }, [searchParams, router]);

  /**
   * Apply `?slug=&step=` before paint so Studio “Edit” does not flash Setup while
   * the project JSON loads (fetch runs in a separate effect).
   */
  useLayoutEffect(() => {
    const slugParam = searchParams.get("slug")?.trim();
    if (!slugParam || !isValidProjectSlug(slugParam)) {
      openedFromQuerySlugRef.current = null;
      return;
    }

    const stepRaw = searchParams.get("step");
    const parsed =
      stepRaw != null ? Number.parseInt(stepRaw, 10) : Number.NaN;
    const stepFromUrl =
      Number.isFinite(parsed) && parsed >= 0 && parsed <= 4
        ? Math.trunc(parsed)
        : 3;
    const nextStep = stepFromUrl < 3 ? 3 : stepFromUrl;

    openedFromQuerySlugRef.current = slugParam;
    setSlug(slugParam);
    setProject(null);
    setStep(nextStep);
    setStudioEditLock(true);
    setError(null);
  }, [searchParams]);

  useEffect(() => {
    setSceneImageCacheNonce(0);
  }, [slug]);

  useEffect(() => {
    if (studioEditLock && step < 3) {
      setStep(3);
    }
  }, [studioEditLock, step]);

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

  useEffect(() => {
    if (!slug || (step !== 3 && step !== 4)) return;

    let cancelled = false;
    void (async () => {
      try {
        const payload = await fetchProject(slug);
        if (cancelled) return;

        if (openedFromQuerySlugRef.current === slug) {
          setTitle(payload.shortTitle);
          if (payload.channelStyleId) {
            setSelectedStyleId(payload.channelStyleId);
          }
          openedFromQuerySlugRef.current = null;
          setMessage(
            step === 3
              ? "Project loaded — regenerate scene images here or build the timeline. Setup, script, and voiceover stay closed for this session."
              : "Project loaded — continue editing your video.",
          );
          router.replace("/video-editor", { scroll: false });
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not open project from link.",
          );
          if (openedFromQuerySlugRef.current === slug) {
            openedFromQuerySlugRef.current = null;
            router.replace("/video-editor", { scroll: false });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, slug, fetchProject, router]);

  useEffect(() => {
    if (step === 1 && slug) {
      void fetchProject(slug).catch(() => {});
    }
  }, [step, slug, fetchProject]);

  useEffect(() => {
    if (step === 2 && slug) {
      void fetchProject(slug).catch(() => {});
    }
  }, [step, slug, fetchProject]);

  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    setVoicesLoading(true);
    setVoicesError(null);
    void (async () => {
      try {
        const res = await fetch("/api/elevenlabs/voices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = (await res.json()) as {
          voices?: ElevenLabsVoiceRow[];
          defaultVoiceId?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || res.statusText);
        }
        if (cancelled) return;
        const list = data.voices ?? [];
        setVoices(list);
        const def = data.defaultVoiceId?.trim();
        setSelectedVoiceId((prev) => {
          if (prev && list.some((v) => v.voice_id === prev)) {
            return prev;
          }
          if (def && list.some((v) => v.voice_id === def)) {
            return def;
          }
          return list[0]?.voice_id ?? "";
        });
      } catch (e) {
        if (!cancelled) {
          setVoicesError(
            e instanceof Error ? e.message : "Failed to load voices",
          );
          setVoices([]);
        }
      } finally {
        if (!cancelled) {
          setVoicesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const keysForScript = Boolean(envReady?.openai);
  const keysForVoice =
    Boolean(envReady?.openai) && Boolean(envReady?.elevenlabs);
  const keysForImages = Boolean(envReady?.nanoBanana);

  const selectedStyle = styles.find((s) => s.id === selectedStyleId);

  /** Full narration text from descriptor scenes (same order as generation). */
  const fullNarrationScript = useMemo(() => {
    if (!project?.scenes?.length) return "";
    return project.scenes.map((s) => s.text).join(" ");
  }, [project]);

  const hasScriptDraft = Boolean(
    slug && project && project.scenes.length > 0,
  );

  const hasOpenAiForSetup = Boolean(envReady?.openai);
  const canSuggestTopic =
    Boolean(selectedStyleId.trim()) &&
    Boolean(selectedStyle?.extractedFormat) &&
    Boolean(title.trim()) &&
    hasOpenAiForSetup &&
    !busy;
  const canSetupNext = title.trim() && topic.trim() && keysForScript;
  const canRunScript = canSetupNext && !busy;
  const canRunVoice = Boolean(slug) && keysForVoice && !busy && step === 2;
  const canRunImages = Boolean(slug) && keysForImages && !busy && step === 3;
  const allImagesDone =
    project?.scenes.length &&
    project.scenes.every((s) => s.hasImage);
  const allAudioDone =
    project?.scenes.length &&
    project.scenes.every((s) => s.hasAudio);

  async function runScript() {
    setError(null);
    setMessage(null);
    setBusy("script");
    try {
      const res = await fetch("/api/generate/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          topic: topic.trim(),
          ...(selectedStyleId.trim() ? { styleId: selectedStyleId.trim() } : {}),
          ...(useWebSearchForScript ? { useWebSearch: true } : {}),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; slug?: string };
      if (!res.ok) throw new Error(data.error || res.statusText);
      if (!data.slug) throw new Error("No slug returned");
      setSlug(data.slug);
      await fetchProject(data.slug);
      setMessage(
        useWebSearchForScript
          ? "Script (with web research) and scene beats are saved. Read the narration below, then continue to voiceover when you’re ready."
          : "Script and scene beats are saved. Read the narration below, then continue to voiceover when you’re ready.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Script step failed");
    } finally {
      setBusy(null);
    }
  }

  async function runVoice() {
    if (!slug) return;
    stopGeneratedVoiceover();
    setError(null);
    setMessage(null);
    setBusy("voice");
    try {
      const res = await fetch("/api/generate/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          ...(selectedVoiceId.trim()
            ? { voiceId: selectedVoiceId.trim() }
            : {}),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || res.statusText);
      await fetchProject(slug);
      setVoiceoverCacheNonce((n) => n + 1);
      setMessage(
        "Voiceover is ready for every scene. Continue to scene images when you’re ready.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice step failed");
    } finally {
      setBusy(null);
    }
  }

  async function runImagesAll() {
    if (!slug) return;
    setError(null);
    setBusy("images-all");
    try {
      const res = await fetch("/api/generate/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          imageSize: geminiImageSize,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || res.statusText);
      await fetchProject(slug);
      setSceneImageCacheNonce((n) => n + 1);
      setMessage("All scene images generated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image generation failed");
    } finally {
      setBusy(null);
    }
  }

  async function runImageOne(sceneIndex: number) {
    if (!slug) return;
    setError(null);
    setBusy(`img-${sceneIndex}`);
    try {
      const res = await fetch("/api/generate/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          sceneIndex,
          imageSize: geminiImageSize,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || res.statusText);
      await fetchProject(slug);
      setSceneImageCacheNonce((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image generation failed");
    } finally {
      setBusy(null);
    }
  }

  async function runFinalize() {
    if (!slug) return;
    setError(null);
    setBusy("finalize");
    try {
      const res = await fetch("/api/generate/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || res.statusText);
      await fetchProject(slug);
      setMessage("Timeline built. You can preview and render in Studio.");
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finalize failed");
    } finally {
      setBusy(null);
    }
  }

  function resetWizard() {
    stopGeneratedVoiceover();
    setStep(0);
    setSlug(null);
    setProject(null);
    setMessage(null);
    setError(null);
    setBusy(null);
    setStudioEditLock(false);
  }

  async function runScriptRegenerate() {
    if (hasScriptDraft) {
      const ok = window.confirm(
        "Regenerate the script? This replaces the current narration and scene beats for this project.",
      );
      if (!ok) return;
    }
    await runScript();
  }

  async function runSuggestTopic() {
    if (!selectedStyleId.trim() || !title.trim()) return;
    setBusy("suggest-topic");
    setError(null);
    try {
      const res = await fetch("/api/generate/suggest-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          styleId: selectedStyleId.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        topic?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || res.statusText);
      if (data.topic) setTopic(data.topic);
      setMessage(
        "Topic suggested from your title and style format — edit if you like, then continue.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Topic suggestion failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Create video
      </h1>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">
        Step through script, voiceover, and scene images — then build the
        timeline for Studio.
      </p>

      <VideoEditorStepBar step={step} className="mt-6 sm:mt-8" />

      <div className="mt-6 space-y-6 sm:mt-8">
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md border bg-white">
                    {selectedStyle ? (
                      <StorageImage
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
                      Style (optional)
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {selectedStyle ? (
                        <>
                          <span className="font-medium text-slate-900">
                            {selectedStyle.name}
                          </span>
                          <span className="text-slate-500">
                            {" "}
                            · {selectedStyle.videoAspectRatio}
                          </span>
                        </>
                      ) : (
                        "No style — shorter generic script."
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setStyleDialogOpen(true)}
                >
                  {selectedStyle ? "Change" : "Choose style"}
                </Button>
            </div>

            <div>
              <Label htmlFor="ve-title">Story title</Label>
              <Input
                id="ve-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Your life as every pirate rank"
                className="mt-1"
                autoComplete="off"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label htmlFor="ve-topic" className="block">
                  {selectedStyle
                    ? `New topic (following ${selectedStyle.name} format)`
                    : "Topic / angle"}
                </Label>
                {selectedStyle ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 gap-2"
                    disabled={!canSuggestTopic}
                    onClick={() => void runSuggestTopic()}
                    title={
                      !selectedStyle.extractedFormat
                        ? "Requires format analysis on this style (Styles → Format → Re-analyze)"
                        : !title.trim()
                          ? "Enter a story title first"
                          : !hasOpenAiForSetup
                            ? "AI generation is temporarily unavailable — contact support"
                            : "Generate a topic from your title and this style’s format analysis"
                    }
                  >
                    {busy === "suggest-topic" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Suggest topic
                  </Button>
                ) : null}
              </div>
              {selectedStyle && !selectedStyle.extractedFormat ? (
                <p className="mt-1 text-xs text-amber-900/90">
                  AI topic suggestions need format analysis on this style. Open
                  Styles → pick this style → Format tab → Re-analyze, then
                  return here.
                </p>
              ) : null}
              <textarea
                id="ve-topic"
                rows={4}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Describe the angle for this video…"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                autoComplete="off"
              />
            </div>

            <VideoEditorStepActions
              continue={
                <Button
                  type="button"
                  disabled={!canSetupNext || Boolean(busy)}
                  onClick={() => {
                    setError(null);
                    setStep(1);
                  }}
                >
                  Continue to script
                </Button>
              }
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              We generate a full narration script (and per-scene beats) using
              your style&apos;s reference transcript when a style is selected
              — matching tone and similar length to the reference. After it
              finishes, read the transcript here before moving on — you can
              come back from voiceover anytime without regenerating.
            </p>

            {hasScriptDraft && fullNarrationScript ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    Generated narration
                  </h2>
                  <p className="text-xs text-slate-500">
                    {project!.scenes.length} scene
                    {project!.scenes.length === 1 ? "" : "s"} · project{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
                      {slug}
                    </code>
                  </p>
                </div>
                <p className="text-xs text-slate-600">
                  This is the full voiceover transcript (what ElevenLabs will
                  read). Scene boundaries are preserved in the breakdown below.
                </p>
                <div
                  className="max-h-[min(52vh,32rem)] overflow-y-auto text-sm leading-relaxed text-slate-800"
                  tabIndex={0}
                  role="region"
                  aria-label="Generated narration transcript"
                >
                  {fullNarrationScript}
                </div>
                <details className="group text-sm">
                  <summary className="cursor-pointer select-none py-2 font-medium text-slate-700 hover:text-slate-900">
                    Scene-by-scene breakdown
                  </summary>
                  <ol className="space-y-4 pt-2">
                    {project!.scenes.map((scene) => (
                      <li key={scene.uid} className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                          Scene {scene.index + 1}
                        </span>
                        <p className="text-sm text-slate-800">{scene.text}</p>
                        <p className="text-xs leading-snug text-slate-500">
                          <span className="font-medium text-slate-600">
                            Visual:
                          </span>{" "}
                          {scene.imageDescription}
                        </p>
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
            ) : null}

            <VideoEditorStepActions
              options={
                <>
                  <Label
                    htmlFor="ve-script-web-search"
                    className="cursor-pointer text-sm font-medium text-slate-700"
                  >
                    Web search
                  </Label>
                  <Switch
                    id="ve-script-web-search"
                    checked={useWebSearchForScript}
                    onCheckedChange={(on) => setUseWebSearchForScript(on)}
                    disabled={Boolean(busy)}
                    aria-label="Web search"
                  />
                </>
              }
              back={
                !studioEditLock ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-slate-600"
                    onClick={() => setStep(0)}
                  >
                    Back to setup
                  </Button>
                ) : undefined
              }
              continue={
                hasScriptDraft ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep(2);
                    }}
                  >
                    Continue to voiceover
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={!canRunScript}
                    onClick={() => void runScriptRegenerate()}
                    className="gap-2"
                  >
                    {busy === "script" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Generate script
                  </Button>
                )
              }
            >
              {hasScriptDraft ? (
                <Button
                  type="button"
                  disabled={!canRunScript}
                  onClick={() => void runScriptRegenerate()}
                  variant="outline"
                  className="gap-2"
                >
                  {busy === "script" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Regenerate script
                </Button>
              ) : null}
            </VideoEditorStepActions>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="ve-voice-list">Voice</Label>
              <p className="text-xs text-slate-500">
                Choose a row to select the voice. Use the play button to hear a
                sample (preview URL from ElevenLabs, or the first attached
                sample via our server).
              </p>
              {voicesLoading ? (
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="size-4 animate-spin shrink-0" />
                  Loading voices…
                </p>
              ) : voicesError ? (
                <p className="text-sm text-amber-900">
                  Could not load the voice list ({voicesError}). You can still
                  generate — the default voice will be used. Refresh this step
                  to try again.
                </p>
              ) : voices.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No voices available right now.
                </p>
              ) : (
                <ul
                  id="ve-voice-list"
                  className="mt-1 max-h-64 w-full divide-y divide-slate-200 overflow-y-auto rounded-lg border border-input bg-background shadow-sm sm:max-w-xl"
                  role="listbox"
                  aria-label="ElevenLabs voices"
                >
                  {voices.map((v) => {
                    const selected = selectedVoiceId === v.voice_id;
                    const canPreview = Boolean(v.previewUrl || v.sampleId);
                    const rowBusy = previewBusyVoiceId === v.voice_id;
                    return (
                      <li
                        key={v.voice_id}
                        className={cn(
                          "flex items-stretch gap-1",
                          selected && "bg-brand-50/90",
                        )}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          disabled={busy === "voice"}
                          className={cn(
                            "min-w-0 flex-1 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 disabled:opacity-50",
                            selected && "font-medium text-slate-900",
                            !selected && "text-slate-800",
                          )}
                          onClick={() => setSelectedVoiceId(v.voice_id)}
                        >
                          <span className="block truncate">{v.name}</span>
                          {v.category ? (
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {v.category}
                            </span>
                          ) : null}
                        </button>
                        <div className="flex shrink-0 items-center pr-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9"
                            disabled={
                              busy === "voice" || !canPreview || rowBusy
                            }
                            title={
                              canPreview
                                ? "Play sample"
                                : "No sample for this voice"
                            }
                            aria-label={`Play sample: ${v.name}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void playVoicePreview(v);
                            }}
                          >
                            {rowBusy ? (
                              <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <Play className="size-4" aria-hidden />
                            )}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <VideoEditorStepActions
              options={
                allAudioDone ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <p className="text-sm text-emerald-900">
                      Voiceover is ready for every scene.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={busy === "voice"}
                      onClick={() =>
                        voiceoverPlaying
                          ? stopGeneratedVoiceover()
                          : playGeneratedVoiceover()
                      }
                    >
                      {voiceoverPlaying ? (
                        <>
                          <Square className="size-3.5 fill-current" />
                          Stop preview
                        </>
                      ) : (
                        <>
                          <Play className="size-4" />
                          Preview voiceover
                        </>
                      )}
                    </Button>
                  </div>
                ) : undefined
              }
              back={
                !studioEditLock ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-slate-600"
                    onClick={() => setStep(1)}
                  >
                    Review script
                  </Button>
                ) : undefined
              }
              continue={
                slug && project && allAudioDone ? (
                  <Button type="button" onClick={() => setStep(3)}>
                    Continue to scene images
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={!canRunVoice}
                    onClick={() => void runVoice()}
                    className="gap-2"
                  >
                    {busy === "voice" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                    Generate voiceover
                  </Button>
                )
              }
            >
              {allAudioDone ? (
                <Button
                  type="button"
                  disabled={!canRunVoice}
                  onClick={() => void runVoice()}
                  variant="outline"
                  className="gap-2"
                >
                  {busy === "voice" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                  Regenerate voiceover
                </Button>
              ) : null}
            </VideoEditorStepActions>
          </div>
        )}

        {step === 3 && slug && !project && !error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2
              className="size-10 animate-spin text-brand-600"
              aria-hidden
            />
            <p className="text-sm font-medium text-slate-800">Loading project…</p>
            <p className="max-w-sm text-xs text-slate-600">
              Fetching scenes from disk. This should only take a moment.
            </p>
          </div>
        ) : null}

        {step === 3 && slug && project && (
          <div className="space-y-6">
            {studioEditLock ? (
              <p className="text-sm text-amber-950">
                Opened from Studio — only scene images and the timeline can be
                changed here. To edit script or voiceover, use{" "}
                <strong className="font-medium">Start another video</strong> on
                the last step when you are done.
              </p>
            ) : null}
            <p className="text-sm text-slate-600">
              Each card pairs the narration for that beat with its scene image.
              Generate images after voiceover is ready.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Label
                htmlFor="ve-gemini-image-size"
                className="text-sm font-medium text-slate-700"
              >
                Image resolution (Gemini)
              </Label>
              <select
                id="ve-gemini-image-size"
                className="h-9 max-w-xs rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                value={geminiImageSize}
                onChange={(e) =>
                  setGeminiImageSize(e.target.value as GeminiImageSize)
                }
              >
                <option value="512">512 — smallest / fastest</option>
                <option value="1K">1K — default (balanced)</option>
                <option value="2K">2K — more detail</option>
                <option value="4K">4K — maximum detail</option>
              </select>
            </div>

            <div className="space-y-8">
              {project.scenes.map((scene) => (
                <div key={scene.uid} className="space-y-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      Scene {scene.index + 1}
                    </span>
                    <span className="text-xs text-slate-500">
                      Duration ({formatSceneDuration(scene.durationMs)})
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 md:items-start">
                    <div className="space-y-3">
                      <blockquote className="border-l-4 border-brand-500 pl-3 text-sm italic leading-relaxed text-slate-800">
                        &ldquo;{scene.text}&rdquo;
                      </blockquote>
                      <p className="text-xs leading-snug text-slate-500">
                        <span className="font-medium text-slate-600">
                          Image prompt:
                        </span>{" "}
                        {scene.imageDescription}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!canRunImages || busy !== null}
                        onClick={() => void runImageOne(scene.index)}
                        className="gap-1.5"
                      >
                        {busy === `img-${scene.index}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="size-3.5" />
                        )}
                        {scene.hasImage ? "Regenerate image" : "Generate image"}
                      </Button>
                    </div>
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900/5">
                      {scene.hasImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/content/${slug}/images/${scene.uid}.png?v=${sceneImageCacheNonce}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[140px] w-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-slate-500">
                          <ImageIcon className="size-8 opacity-40" />
                          No image yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 py-4 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                variant="secondary"
                disabled={!canRunImages || busy !== null}
                onClick={() => void runImagesAll()}
                className="w-full gap-2 sm:w-auto"
              >
                {busy === "images-all" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImageIcon className="size-4" />
                )}
                Generate all images
              </Button>
              <Button
                type="button"
                disabled={!allImagesDone || !allAudioDone || busy !== null}
                onClick={() => void runFinalize()}
                className="w-full gap-2 sm:w-auto"
              >
                {busy === "finalize" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Film className="size-4" />
                )}
                Build timeline
              </Button>
              {project.hasTimeline && (
                <span className="text-xs text-emerald-700">
                  Timeline already exists — open Studio to preview.
                </span>
              )}
            </div>

            {!studioEditLock ? (
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                ← Back to voiceover
              </Button>
            ) : null}
          </div>
        )}

        {step === 4 && slug && (
          <div className="space-y-4 text-center">
            <p className="text-lg font-medium text-slate-800">
              Video project is ready
            </p>
            <p className="text-sm text-slate-600">
              Preview in Studio or export an MP4 to download and upload.
            </p>
            <div className="flex flex-col items-center gap-4">
              <ExportVideoButton
                projectSlug={slug}
                aspectRatio={
                  project?.videoAspectRatio ??
                  selectedStyle?.videoAspectRatio ??
                  "9:16"
                }
                variant="default"
                className="items-center"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(`/studio?slug=${encodeURIComponent(slug)}`)
                }
              >
                Open Studio
              </Button>
              <Button type="button" variant="ghost" onClick={resetWizard}>
                Start another video
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && !error && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      )}

      <StylePickerDialog
        open={styleDialogOpen}
        onOpenChange={setStyleDialogOpen}
        styles={styles}
        initialStyleId={selectedStyleId}
        onConfirm={(id) => {
          setSelectedStyleId(id);
          setStyleDialogOpen(false);
        }}
        confirmLabel="Use this style"
      />
    </div>
  );
}
