export const LANDING_NAV = [
  { label: "Workflow", href: "#workflow" },
  { label: "Editor", href: "#editor" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export const PRICING_TIERS = [
  {
    name: "Basic",
    price: "$99.99",
    period: "/ mo",
    description:
      "Full app access — script, voice, scenes, and export.",
    highlighted: true,
    badge: "Popular",
    features: ["25,000 credits per month"],
    cta: "Get Basic",
  },
  {
    name: "Premium",
    price: "$199.99",
    period: "/ mo",
    description:
      "Full app access with more monthly credits.",
    highlighted: false,
    badge: "More credits",
    features: [
      "65,000 credits per month",
      "Everything in Basic",
    ],
    cta: "Get Premium",
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "Who is clipng for?",
    answer:
      "Faceless, story, and explainer YouTube channels that publish narration plus illustrated scenes on a schedule. clipng connects style, script, voice, scenes, and render in one app.",
  },
  {
    question: "Do I need API keys?",
    answer:
      "No. clipng runs OpenAI, Gemini, and ElevenLabs on our servers. Subscribe and start creating — no API setup required.",
  },
  {
    question: "How does transcript import work?",
    answer:
      "When creating a channel style, paste a public YouTube URL. clipng fetches the transcript and uses it as a format reference for new scripts.",
  },
  {
    question: "What can I export?",
    answer:
      "Upload-ready MP4s from Studio, matched to your channel style — 9:16 for Shorts or 16:9 for standard YouTube.",
  },
  {
    question: "What's the difference between Basic and Premium?",
    answer:
      "Both plans include the same app access. The only difference is monthly credits: Basic ($99.99/mo) includes 25,000; Premium ($199.99/mo) includes 65,000. Credits are spent on AI generation — scripts, voice, and scenes.",
  },
] as const;
