"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Film,
  Globe2,
  ImageIcon,
  Mic,
  Play,
  Sparkles,
  Wand2,
} from "lucide-react";

import { VideoEditorStepBar } from "@/components/video-editor/VideoEditorStepBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LANDING_EDITOR_DEMO } from "@/lib/landing/editor-demo";
import { cn } from "@/lib/utils";

function formatSceneDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none select-none [&_button]:pointer-events-none [&_input]:pointer-events-none [&_select]:pointer-events-none [&_summary]:pointer-events-none [&_textarea]:pointer-events-none">
      {children}
    </div>
  );
}

function SetupStepPreview() {
  const demo = LANDING_EDITOR_DEMO;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-surface-border bg-surface-muted p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md border bg-white">
              <Image
                src={demo.style.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">Style (optional)</p>
              <p className="mt-0.5 text-sm text-slate-600">
                <span className="font-medium text-slate-900">{demo.style.name}</span>
                <span className="text-slate-500"> · {demo.style.videoAspectRatio}</span>
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" className="shrink-0">
            Change
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="landing-demo-title">Story title</Label>
        <Input
          id="landing-demo-title"
          readOnly
          value={demo.title}
          className="mt-1"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label htmlFor="landing-demo-topic" className="block">
            New topic (following {demo.style.name} format)
          </Label>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5">
            <Sparkles className="size-4" />
            Suggest topic
          </Button>
        </div>
        <textarea
          id="landing-demo-topic"
          readOnly
          rows={4}
          value={demo.topic}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-slate-900 shadow-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button">Continue to script</Button>
      </div>
    </div>
  );
}

function ScriptStepPreview() {
  const demo = LANDING_EDITOR_DEMO;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border-2 border-brand-200 bg-brand-50/40 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-brand-200">
            <Globe2 className="size-5 shrink-0" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
              Script · research
            </p>
            <Label className="block text-base font-semibold text-slate-900">
              Web search for script
            </Label>
            <p className="text-xs leading-relaxed text-slate-700">
              When on, OpenAI runs hosted web search for the narration only.
            </p>
          </div>
        </div>
        <Switch checked={false} aria-label="Web search for script" className="shrink-0" />
      </div>

      <div className="space-y-3 rounded-xl border border-brand-200 bg-gradient-to-b from-brand-50/80 to-white p-5 shadow-sm ring-1 ring-brand-100">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">Generated narration</h3>
          <p className="text-xs text-slate-500">
            {demo.sceneCount} scenes · project{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
              {demo.slug}
            </code>
          </p>
        </div>
        <div className="max-h-48 overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-inner">
          {demo.narration}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" className="gap-2">
          <Mic className="size-4" />
          Continue to voiceover
        </Button>
        <Button type="button" variant="outline" className="gap-2">
          <Sparkles className="size-4" />
          Regenerate script
        </Button>
      </div>
    </div>
  );
}

function VoiceoverStepPreview() {
  const demo = LANDING_EDITOR_DEMO;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        ElevenLabs creates voice audio and character timings for each scene.
      </p>

      <div className="space-y-2 rounded-xl border border-surface-border bg-surface-muted p-4">
        <Label>Voice</Label>
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          <li className="flex items-center gap-3 px-3 py-2.5">
            <span
              className="size-4 shrink-0 rounded-full border-[5px] border-brand-600"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {demo.voice.name}
              </p>
              <p className="text-xs text-slate-500">{demo.voice.category}</p>
            </div>
            <Button type="button" size="icon-sm" variant="outline" aria-label="Preview voice">
              <Play className="size-4" />
            </Button>
          </li>
        </ul>
      </div>

      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
        <p>Voiceover is ready for every scene.</p>
        <Button type="button" variant="secondary" size="sm" className="gap-2">
          <Play className="size-4" />
          Preview full voiceover
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="gap-2">
          <Mic className="size-4" />
          Regenerate voiceover
        </Button>
        <Button type="button" variant="secondary" className="gap-2">
          <ImageIcon className="size-4" />
          Continue to scene images
        </Button>
      </div>
    </div>
  );
}

function SceneImagesStepPreview() {
  const demo = LANDING_EDITOR_DEMO;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Each card pairs the narration for that beat with its scene image.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Label className="text-sm font-medium text-slate-700">Image resolution (Gemini)</Label>
        <select
          className="h-9 max-w-xs rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm"
          defaultValue="1K"
          tabIndex={-1}
        >
          <option value="1K">1K — default (balanced)</option>
        </select>
      </div>

      <div className="space-y-4">
        {demo.scenes.map((scene) => (
          <div
            key={scene.uid}
            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm"
          >
            <div className="flex flex-col gap-1 border-b border-slate-200 bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-slate-800">
                Scene {scene.index + 1}
              </span>
              <span className="text-xs text-slate-500">
                Duration ({formatSceneDuration(scene.durationMs)})
              </span>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2 md:items-start">
              <div className="space-y-3">
                <blockquote className="border-l-4 border-brand-500 pl-3 text-sm italic leading-relaxed text-slate-800">
                  &ldquo;{scene.text}&rdquo;
                </blockquote>
                <p className="text-xs leading-snug text-slate-500">
                  <span className="font-medium text-slate-600">Image prompt:</span>{" "}
                  {scene.imageDescription}
                </p>
                <Button type="button" size="sm" variant="secondary" className="gap-1.5">
                  <Wand2 className="size-3.5" />
                  Regenerate image
                </Button>
              </div>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900/5">
                <Image
                  src={`/content/${demo.slug}/images/${scene.uid}.png`}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <Button type="button" variant="secondary" className="gap-2">
          <ImageIcon className="size-4" />
          Generate all images
        </Button>
        <Button type="button" className="gap-2">
          <Film className="size-4" />
          Build timeline
        </Button>
      </div>
    </div>
  );
}

function FinishStepPreview() {
  const demo = LANDING_EDITOR_DEMO;

  return (
    <div className="space-y-4 py-6 text-center">
      <p className="text-lg font-medium text-slate-800">Video project is ready</p>
      <p className="text-sm text-slate-600">
        Composition id:{" "}
        <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">{demo.slug}</code>
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button">Open Studio</Button>
        <Button type="button" variant="outline">
          Start another video
        </Button>
      </div>
    </div>
  );
}

const STEP_VIEWS = [
  SetupStepPreview,
  ScriptStepPreview,
  VoiceoverStepPreview,
  SceneImagesStepPreview,
  FinishStepPreview,
] as const;

export function LandingVideoEditorPreview({ className }: { className?: string }) {
  const [step, setStep] = useState(3);
  const StepView = STEP_VIEWS[step];

  return (
    <div className={cn("mx-auto w-full max-w-4xl", className)}>
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-red-400/90" />
            <span className="size-2.5 rounded-full bg-amber-400/90" />
            <span className="size-2.5 rounded-full bg-emerald-400/90" />
            <span className="ml-2 text-xs font-medium text-slate-400">Video editor</span>
          </div>
        </div>

        <div className="max-h-[min(72vh,720px)] overflow-y-auto overscroll-contain p-5 sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Create video
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Step through script, voiceover, and scene images — then build the timeline for
            Studio.
          </p>

          <VideoEditorStepBar
            step={step}
            mode="tabs"
            onStepChange={setStep}
            className="pointer-events-auto mt-6"
          />

          <DemoShell>
            <div className="mt-6 space-y-6 rounded-2xl border border-surface-border bg-white p-5 shadow-sm sm:p-6">
              <StepView />
            </div>
          </DemoShell>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Tap a step above to explore the editor — this is the real app UI with sample project
        data.
      </p>
    </div>
  );
}
