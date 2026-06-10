/** Static snapshot for the landing page editor preview — real project assets on disk. */
export const LANDING_EDITOR_DEMO = {
  slug: "what-its-like-to-be-the-greatest-hacker",
  title: "What It's Like To Be The Greatest Hacker",
  topic:
    "Second-person story following someone who wakes up realizing they're the greatest hacker alive — curiosity, tension, and moral gray areas as they probe deeper into hidden networks.",
  style: {
    name: "Hypothetically",
    videoAspectRatio: "16:9" as const,
    thumbnailUrl: "/channel-styles/hypothetically/thumbnail.png",
  },
  sceneCount: 17,
  narration:
    "You wake up and the world feels a little different. Not in a way anyone would notice, not at first. The hum of your computer, the blink of the router—ordinary stuff grumbling along in the background. But this morning, your fingers itch. When you sit at your desk, one thought settles in your chest: You're the best hacker on earth.",
  scenes: [
    {
      index: 0,
      uid: "48d168cf-825e-46cb-ad08-9a49cbb5f168",
      text: "You wake up and the world feels a little different. Not in a way anyone would notice, not at first.",
      imageDescription:
        "A person sits up in bed at dawn, glancing around their familiar but subtly off-bedroom. Their face looks puzzled as the light filters in through half-closed blinds.",
      durationMs: 4820,
    },
    {
      index: 1,
      uid: "1069aa69-86b4-4adc-9843-adbcb3611d5f",
      text: "The hum of your computer, the blink of the router—ordinary stuff grumbling along in the background.",
      imageDescription:
        "Close-up of a dim desk setup: monitor glow, blinking router lights, coffee mug — everyday tech ambience.",
      durationMs: 5100,
    },
  ],
  voice: {
    name: "Adam — deep narrator",
    category: "Narration",
  },
} as const;
