/**
 * Central branding & site configuration.
 *
 * Every page, metadata block, and footer should pull from here rather than
 * hardcoding the forum name, tagline, or parent company — so a future
 * rebrand only requires editing this one file.
 */

export const siteConfig = {
  name: "PondyHub",
  tagline: "Pondicherry's Community Forum",
  description:
    "PondyHub is the community forum for Puducherry — discuss local news, find restaurant recommendations, browse jobs, buy and sell, and connect with your neighbors.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  parentCompany: {
    name: "SafeShield",
    poweredByLabel: "Powered by SafeShield",
  },
  locale: "en_IN",
  themeColor: "#0e7490", // deep coastal ocean teal — see tailwind.config.ts "coastal" palette
} as const;

export const defaultCategories = [
  {
    name: "General Discussion",
    description: "Talk about anything related to Pondicherry life and beyond.",
  },
  {
    name: "Local News",
    description: "Stay updated with what's happening around Puducherry.",
  },
  {
    name: "Tourism",
    description: "Tips, guides, and discussions for visitors and explorers.",
  },
  {
    name: "Food & Restaurants",
    description: "Reviews, recommendations, and recipes from the local food scene.",
  },
  {
    name: "Jobs & Careers",
    description: "Job postings, career advice, and hiring discussions.",
  },
  {
    name: "Buy & Sell",
    description: "A marketplace for the PondyHub community.",
  },
  {
    name: "Events",
    description: "Local events, meetups, festivals, and happenings.",
  },
  {
    name: "Education",
    description: "Schools, colleges, courses, and learning resources.",
  },
  {
    name: "Business & Startups",
    description: "Entrepreneurship, local business news, and startup culture.",
  },
  {
    name: "Help & Support",
    description: "Ask questions and get help from the community.",
  },
] as const;
