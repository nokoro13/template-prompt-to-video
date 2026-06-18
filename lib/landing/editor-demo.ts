/** Static snapshot for the landing page editor preview — real project assets on disk. */
export const LANDING_EDITOR_DEMO = {
  slug: "your-life-as-every-combat-medic-rank",
  title: "Your life as Every Combat Medic Rank",
  topic:
    "Second-person journey through every combat medic rank — from a shaky first deployment in the medical tent to teaching tourniquets and IV lines, carrying the weight of triage decisions and the quiet competence the classroom never fully prepares you for.",
  style: {
    name: "Your Life as Every Rank",
    videoAspectRatio: "16:9" as const,
    thumbnailUrl: "/channel-styles/test-style/thumbnail.png",
  },
  sceneCount: 39,
  narration:
    "You remember the first time you walked into the medical tent. Nerves disguising themselves as confidence. Fresh uniform, patch sewn on that morning, hands shaking enough that they fumble with gauze. You want to believe training prepared you. It didn't. The noise is sharp, metallic, unreal. Boots splashing through puddles whose color you never forget. Someone shouts for a medic. It's you. Suddenly, theory becomes flesh. The wound is worse than any dummy in the classroom.",
  scenes: [
    {
      index: 0,
      uid: "7fe17f36-f39e-4be5-b338-1a8a3075ad20",
      text: "You remember the first time you walked into the medical tent. Nerves disguising themselves as confidence. Fresh uniform, patch sewn on that morning, hands shaking enough that they fumble with gauze.",
      imageDescription:
        "A young medic stands at the entrance of a crowded medical tent, nervously clutching a roll of gauze. Their uniform is crisp, patch freshly sewn, and their uncertain posture betrays their anxiety.",
      durationMs: 13560,
    },
    {
      index: 1,
      uid: "462ce392-f0cd-4b9f-887f-c432a8d34e5d",
      text: "You want to believe training prepared you. It didn't. The noise is sharp, metallic, unreal. Boots splashing through puddles whose color you never forget.",
      imageDescription:
        "Close-up of combat boots stomping through red-stained water in the chaotic interior of the tent, with the background blurred by metallic noises and scattered medical equipment.",
      durationMs: 12260,
    },
  ],
  voice: {
    name: "Adam — deep narrator",
    category: "Narration",
  },
} as const;
