/**
 * Lists voices for the authenticated account (GET /v1/voices).
 * @see https://elevenlabs.io/docs/api-reference/voices/get
 */

export type ElevenLabsVoiceOption = {
  voice_id: string;
  name: string;
  category?: string | null;
  /** When present, browser can play this URL without our proxy (ElevenLabs list payload). */
  previewUrl: string | null;
  /** First sample id for GET /v1/voices/{voice_id}/samples/{sample_id}/audio when no previewUrl. */
  sampleId: string | null;
};

function firstSampleIdFromVoice(v: Record<string, unknown>): string | null {
  const samples = v.samples;
  if (!Array.isArray(samples) || samples.length === 0) {
    return null;
  }
  const s = samples[0] as Record<string, unknown>;
  const id = (s.sample_id ?? s.sampleId ?? s.id) as string | undefined;
  const trimmed = id?.trim();
  return trimmed || null;
}

type VoicesApiResponse = {
  voices?: Array<Record<string, unknown>>;
};

export async function listElevenLabsVoices(
  apiKey: string,
): Promise<ElevenLabsVoiceOption[]> {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: {
      "xi-api-key": apiKey,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `ElevenLabs voices list failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as VoicesApiResponse;
  const raw = data.voices ?? [];
  const out: ElevenLabsVoiceOption[] = [];
  for (const v of raw) {
    const voice_id = String(v.voice_id ?? v.voiceId ?? "").trim();
    if (!voice_id) continue;
    const previewRaw = v.preview_url ?? v.previewUrl;
    const previewUrl =
      typeof previewRaw === "string" && previewRaw.trim().length > 0
        ? previewRaw.trim()
        : null;
    out.push({
      voice_id,
      name: (String(v.name ?? voice_id) || voice_id).trim(),
      category:
        typeof v.category === "string" && v.category.trim()
          ? v.category.trim()
          : null,
      previewUrl,
      sampleId: firstSampleIdFromVoice(v),
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return out;
}
