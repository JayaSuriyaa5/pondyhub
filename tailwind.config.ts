import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Coastal" palette — teal-leaning blues evoking Pondicherry's
        // promenade and the Bay of Bengal, paired with warm sand neutrals
        // and a restrained terracotta accent (a nod to White Town's
        // heritage rooftops — used sparingly, never as a base color).
        brand: {
          50: "#eefcfb",
          100: "#d4f5f3",
          200: "#aceae8",
          300: "#75d8d8",
          400: "#3fbcc0",
          500: "#1f9da3",
          600: "#157e87",
          700: "#13646e",
          800: "#14515a",
          900: "#15444c",
          950: "#062a30",
        },
        coastal: {
          ocean: "#0e7490",
          oceanDark: "#0c5a72",
          oceanDeep: "#073a4a",
          lagoon: "#22a6b3",
          sand: "#f7f3ea",
          shell: "#fdfbf7",
          ink: "#0f2a33",
          terracotta: "#e8895a",
          terracottaDark: "#c96a3d",
        },
        // Dark mode base: deep navy rather than pure black, so frosted
        // glass surfaces have depth/color to refract.
        abyss: {
          950: "#0b1622",
          900: "#0e1f2e",
          800: "#13293a",
          700: "#1a3548",
        },
        upvote: "#e8895a",
        downvote: "#22a6b3",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      fontSize: {
        "display-lg": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-md": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
      },
      boxShadow: {
        glass: "0 8px 32px -8px rgba(14, 116, 144, 0.18), inset 0 1px 0 0 rgba(255,255,255,0.4)",
        "glass-dark": "0 8px 32px -8px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255,255,255,0.06)",
        card: "0 1px 2px rgba(15, 42, 51, 0.04), 0 8px 24px -8px rgba(15, 42, 51, 0.08)",
        "card-hover": "0 4px 8px rgba(15, 42, 51, 0.06), 0 16px 32px -12px rgba(14, 116, 144, 0.18)",
        glow: "0 0 0 1px rgba(34, 166, 179, 0.15), 0 0 24px rgba(34, 166, 179, 0.12)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "tide-sweep": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "fade-up": "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "tide-sweep": "tide-sweep 3s linear infinite",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
