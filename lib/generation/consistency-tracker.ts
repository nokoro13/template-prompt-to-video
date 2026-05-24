/**
 * Scene-to-scene visual consistency via text: track character/location descriptions
 * from first appearance and inject them into later scene image prompts.
 */
import type {
  ConsistencyData,
  ContentItemWithDetails,
} from "../../src/lib/types";

/** Max chars stored per entity (descriptor size / prompt limits). */
const MAX_DESC_LENGTH = 900;

/** Longer phrases first so "living room" wins over "room". */
const LOCATION_PHRASES: readonly string[] = [
  "living room",
  "dining room",
  "conference room",
  "hotel room",
  "waiting room",
  "break room",
  "kitchen",
  "bathroom",
  "bedroom",
  "hallway",
  "basement",
  "attic",
  "garage",
  "driveway",
  "sidewalk",
  "warehouse",
  "restaurant",
  "café",
  "cafe",
  "office",
  "alley",
  "rooftop",
  "elevator",
  "stairwell",
  "parking lot",
  "hospital",
  "classroom",
  "courtroom",
  "prison",
  "jail",
  "bar",
  "club",
  "car",
  "van",
  "truck",
  "train",
  "plane",
  "airport",
  "street",
  "alleyway",
  "forest",
  "beach",
  "desert",
  "window",
  "porch",
  "balcony",
  "yard",
  "garden",
  "room",
  "house",
  "apartment",
  "building",
];

export type SceneEntityInfo = {
  characters: string[];
  /** Normalized location key, e.g. "kitchen", "living-room" */
  location?: string;
};

export type SceneEntityAnalysis = {
  /** Per scene index */
  scenes: SceneEntityInfo[];
};

function normalizeKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Role / archetype keywords → stable keys (order: more specific first). */
const ROLE_RULES: readonly { key: string; test: RegExp }[] = [
  { key: "victim", test: /\b(the victim|a victim|victim|the mark)\b/i },
  {
    key: "target",
    test: /\b(the target|your target|the target character|my target)\b/i,
  },
  { key: "hitman", test: /\b(hitman|assassin|contract killer|the killer)\b/i },
  {
    key: "protagonist",
    test: /\b(main character|the main character|the protagonist|your protagonist)\b/i,
  },
  {
    key: "antagonist",
    test: /\b(the antagonist|antagonist|the other guy|the other man|your rival)\b/i,
  },
  { key: "boss", test: /\b(your boss|the boss|crime boss|mob boss)\b/i },
  { key: "partner", test: /\b(your partner|a partner|partner)\b/i },
  { key: "bystander", test: /\b(bystander|witness|onlooker)\b/i },
  { key: "police", test: /\b(police|cop|detective|officer)\b/i },
  { key: "stranger", test: /\b(stranger|a stranger)\b/i },
];

function detectRolesInText(combined: string): string[] {
  const found = new Set<string>();
  for (const { key, test } of ROLE_RULES) {
    if (test.test(combined)) {
      found.add(key);
    }
  }
  return [...found];
}

function detectStyleCharacterNames(
  combined: string,
  styleNames: string[],
): string[] {
  const lower = combined.toLowerCase();
  const found: string[] = [];
  for (const raw of styleNames) {
    const n = raw.trim();
    if (!n) continue;
    if (lower.includes(n.toLowerCase())) {
      found.push(normalizeKey(n));
    }
  }
  return found;
}

function detectPrimaryLocation(combined: string): string | undefined {
  const lower = combined.toLowerCase();
  for (const phrase of LOCATION_PHRASES) {
    if (lower.includes(phrase)) {
      return normalizeKey(phrase);
    }
  }
  return undefined;
}

/**
 * Which characters and (optional) primary location appear in each scene,
 * inferred from image description + narration.
 */
export function analyzeSceneEntities(
  scenes: ContentItemWithDetails[],
  styleCharacterNames: string[],
): SceneEntityAnalysis {
  const out: SceneEntityInfo[] = [];
  for (const item of scenes) {
    const combined = `${item.imageDescription}\n${item.text}`;
    const roles = detectRolesInText(combined);
    const fromStyle = detectStyleCharacterNames(combined, styleCharacterNames);
    const characters = [...new Set([...roles, ...fromStyle])];
    const location = detectPrimaryLocation(combined);
    out.push({ characters, location });
  }
  return { scenes: out };
}

/**
 * Extract a short canonical visual line for an entity from the scene text.
 */
export function extractCanonicalDescription(
  entityKey: string,
  imageDescription: string,
  narration: string,
): string {
  const combined = `${imageDescription}\n${narration}`;
  const sentences = combined
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lowerEntity = entityKey.replace(/-/g, " ");
  const relevant = sentences.filter((s) => {
    const low = s.toLowerCase();
    return (
      low.includes(entityKey.replace(/-/g, " ")) ||
      low.includes(lowerEntity) ||
      (entityKey === "victim" && /\bvictim\b/i.test(s)) ||
      (entityKey === "target" && /\btarget\b/i.test(s)) ||
      (entityKey === "hitman" && /\b(hitman|assassin)\b/i.test(s)) ||
      (entityKey === "protagonist" && /\b(main character|protagonist)\b/i.test(s)) ||
      (entityKey === "antagonist" && /\b(antagonist|other guy|other man)\b/i.test(s))
    );
  });
  const pick = relevant.length > 0 ? relevant.join(" ") : imageDescription.trim();
  const truncated =
    pick.length > MAX_DESC_LENGTH ? `${pick.slice(0, MAX_DESC_LENGTH)}…` : pick;
  return truncated;
}

function extractLocationDescription(
  locationKey: string,
  imageDescription: string,
  narration: string,
): string {
  const combined = `${imageDescription}\n${narration}`;
  const human = locationKey.replace(/-/g, " ");
  const sentences = combined
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const relevant = sentences.filter((s) => s.toLowerCase().includes(human));
  const pick =
    relevant.length > 0 ? relevant.join(" ") : imageDescription.trim();
  const truncated =
    pick.length > MAX_DESC_LENGTH ? `${pick.slice(0, MAX_DESC_LENGTH)}…` : pick;
  return `Setting (${human}): ${truncated}`;
}

export type ConsistencyRuntimeState = {
  data: ConsistencyData;
};

export function createEmptyConsistencyState(
  existing?: ConsistencyData | null,
): ConsistencyRuntimeState {
  return {
    data: {
      characters: { ...(existing?.characters ?? {}) },
      locations: { ...(existing?.locations ?? {}) },
    },
  };
}

/**
 * Build optional multi-line block for Gemini (passed separately from scene prompt).
 */
export function buildConsistencyBlock(
  sceneIndex: number,
  sceneInfo: SceneEntityInfo,
  state: ConsistencyRuntimeState,
): string | undefined {
  const lines: string[] = [];

  for (const charKey of sceneInfo.characters) {
    const rec = state.data.characters[charKey];
    if (rec && rec.firstScene < sceneIndex) {
      lines.push(
        `Character "${charKey}": ${rec.description}`,
      );
    }
  }

  if (sceneInfo.location) {
    const locKey = sceneInfo.location;
    const rec = state.data.locations[locKey];
    if (rec && rec.firstScene < sceneIndex) {
      lines.push(`Location "${locKey}": ${rec.description}`);
    }
  }

  if (lines.length === 0) return undefined;
  return lines.join("\n");
}

/**
 * Merges entity-based consistency with a fallback when the previous scene image
 * is not available as a reference (e.g. missing file).
 */
export function composeSceneConsistencyBlock(
  sceneIndex: number,
  sceneInfo: SceneEntityInfo,
  state: ConsistencyRuntimeState,
  hasPreviousSceneImageRef: boolean,
): string | undefined {
  const parts: string[] = [];
  const entityBlock = buildConsistencyBlock(sceneIndex, sceneInfo, state);
  if (entityBlock) parts.push(entityBlock);
  if (sceneIndex > 0 && !hasPreviousSceneImageRef) {
    parts.push(
      "This scene follows the previous scene in the same story — keep recurring characters and locations visually consistent with the narration.",
    );
  }
  if (parts.length === 0) return undefined;
  return parts.join("\n\n");
}

/**
 * After a scene is generated, record first-appearance descriptions for entities
 * that appear in this scene but were not yet in state.
 */
export function recordFirstAppearances(
  sceneIndex: number,
  item: ContentItemWithDetails,
  sceneInfo: SceneEntityInfo,
  state: ConsistencyRuntimeState,
): void {
  for (const charKey of sceneInfo.characters) {
    if (!state.data.characters[charKey]) {
      state.data.characters[charKey] = {
        description: extractCanonicalDescription(
          charKey,
          item.imageDescription,
          item.text,
        ),
        firstScene: sceneIndex,
      };
    }
  }

  if (sceneInfo.location && !state.data.locations[sceneInfo.location]) {
    state.data.locations[sceneInfo.location] = {
      description: extractLocationDescription(
        sceneInfo.location,
        item.imageDescription,
        item.text,
      ),
      firstScene: sceneIndex,
    };
  }
}
