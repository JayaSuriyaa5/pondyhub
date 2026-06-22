/**
 * Maps a category slug to a display icon (emoji, to avoid needing an icon
 * font/sprite dependency) and an accent gradient. Falls back to a generic
 * default for any category not in this list (e.g. one created later by an
 * admin), so the UI never breaks for new categories.
 */

export interface CategoryVisual {
  emoji: string;
  gradient: string; // tailwind gradient classes
}

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  "general-discussion": { emoji: "💬", gradient: "from-coastal-ocean to-coastal-lagoon" },
  "local-news": { emoji: "📰", gradient: "from-coastal-oceanDark to-coastal-ocean" },
  tourism: { emoji: "🏖️", gradient: "from-coastal-lagoon to-brand-400" },
  "food-restaurants": { emoji: "🍛", gradient: "from-coastal-terracotta to-coastal-terracottaDark" },
  "jobs-careers": { emoji: "💼", gradient: "from-coastal-ocean to-brand-700" },
  "buy-sell": { emoji: "🛍️", gradient: "from-coastal-terracotta to-coastal-lagoon" },
  events: { emoji: "🎉", gradient: "from-brand-500 to-coastal-lagoon" },
  education: { emoji: "🎓", gradient: "from-coastal-oceanDark to-brand-600" },
  "business-startups": { emoji: "🚀", gradient: "from-coastal-ocean to-coastal-terracotta" },
  "help-support": { emoji: "🛟", gradient: "from-coastal-lagoon to-coastal-ocean" },
};

const DEFAULT_VISUAL: CategoryVisual = { emoji: "📌", gradient: "from-coastal-ocean to-coastal-lagoon" };

export function getCategoryVisual(slug: string): CategoryVisual {
  return CATEGORY_VISUALS[slug] ?? DEFAULT_VISUAL;
}
