export const LANDING_NAV = [
  { label: "Workflow", href: "#workflow" },
  { label: "Editor", href: "#editor" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export const PRICING_TIERS = [
  {
    name: "Basic",
    price: "$49",
    period: "/ mo",
    description:
      "Full pipeline for solo operators. AI script, voice, and scene generation included.",
    highlighted: true,
    badge: "Popular",
    features: [
      "Unlimited projects & channel styles",
      "YouTube transcript import",
      "5-step video editor",
      "Studio preview & MP4 export",
    ],
    cta: "Get Basic",
  },
  {
    name: "Premium",
    price: "$69",
    period: "/ mo",
    description:
      "For teams and high-volume channels that need faster renders and shared workflows.",
    highlighted: false,
    badge: "Teams",
    features: [
      "Everything in Basic",
      "Priority render queue",
      "Team seats & shared styles",
      "Dedicated support",
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
      "Both include the full editor and Studio. Basic is $49/mo for individual operators. Premium is $69/mo and adds priority rendering, team seats, shared channel styles, and dedicated support.",
  },
] as const;
