import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        surface: {
          muted: "#f4f6f9",
          border: "#e5e7eb",
        },
        // shadcn/ui — map to CSS variables in app/globals.css
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      keyframes: {
        "orbit-sweep": {
          to: { strokeDashoffset: "-3280" },
        },
        "orbit-ring-reveal": {
          "0%": { opacity: "0" },
          "35%": { opacity: "0.5" },
          "60%": { opacity: "1" },
          "100%": { opacity: "1" },
        },
        "orbit-accent-reveal": {
          "0%": { opacity: "0" },
          "35%": { opacity: "0.45" },
          "60%": { opacity: "0.85" },
          "100%": { opacity: "0.8" },
        },
        "orbit-ring-ripple": {
          "0%, 100%": { opacity: "0" },
          "6%": { opacity: "0.18" },
          "14%": { opacity: "0.45" },
          "24%": { opacity: "0" },
          "36%": { opacity: "0" },
        },
        "orbit-icon-reveal": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "orbit-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "hub-pulse": {
          "0%, 100%": { opacity: "0.45", transform: "translate(-50%, -50%) scale(1)" },
          "50%": { opacity: "0.7", transform: "translate(-50%, -50%) scale(1.06)" },
        },
        "hero-rise": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "orbit-sweep": "orbit-sweep 48s linear infinite",
        "orbit-ring-reveal":
          "orbit-ring-reveal 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards",
        "orbit-ring-ripple":
          "orbit-ring-ripple 5.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite",
        "orbit-icon-reveal":
          "orbit-icon-reveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "orbit-float": "orbit-float 5s ease-in-out infinite",
        "hub-pulse": "hub-pulse 6s ease-in-out infinite",
        "hero-rise": "hero-rise 0.7s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
