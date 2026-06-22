/**
 * Curated "Featured Pondicherry" content for the home page hero section.
 *
 * This is editorial content maintained by the PondyHub team, not
 * user-generated posts — kept as static config for the MVP rather than a
 * new database model. A future iteration could move this into an admin-
 * managed `FeaturedItem` table if the team wants to update it without a
 * code deploy.
 */

export interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  emoji: string;
  href: string;
  tag: string;
}

export const featuredPondicherryContent: FeaturedItem[] = [
  {
    id: "white-town",
    title: "A Walking Guide to White Town",
    emoji: "🏛️",
    description: "Mustard facades, blue shutters, and the streets that define Pondicherry's French Quarter.",
    href: "/categories/tourism",
    tag: "Tourism",
  },
  {
    id: "promenade",
    title: "Best Sunrise Spots on the Promenade",
    emoji: "🌅",
    description: "Where locals actually go to watch the Bay of Bengal wake up.",
    href: "/categories/tourism",
    tag: "Tourism",
  },
  {
    id: "auroville",
    title: "Auroville Day Trip Essentials",
    emoji: "🕉️",
    description: "What to know before you visit the Matrimandir and the surrounding townships.",
    href: "/categories/tourism",
    tag: "Tourism",
  },
  {
    id: "food-scene",
    title: "Pondicherry's Café Culture, Mapped",
    emoji: "☕",
    description: "From French bakeries to filter coffee institutions — the community's running list.",
    href: "/categories/food-restaurants",
    tag: "Food & Restaurants",
  },
];
