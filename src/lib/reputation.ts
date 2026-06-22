/**
 * Reputation tier system.
 *
 * Karma = sum of upvotes received across all of a user's posts and
 * comments, minus downvotes (the API's `karma` field on the profile DTO,
 * computed from Post.score + Comment.score aggregates). Tiers are display
 * sugar only — they don't gate any permissions in the MVP, but the
 * structure here is where that could plug in later (e.g. unlock custom
 * flair at "Local Guide").
 */

export interface ReputationTier {
  key: string;
  label: string;
  minKarma: number;
  /** Tailwind classes for the badge pill */
  className: string;
  /** Short description shown on hover/profile */
  description: string;
}

export const REPUTATION_TIERS: ReputationTier[] = [
  {
    key: "newcomer",
    label: "Newcomer",
    minKarma: 0,
    className: "bg-slate-100 text-slate-600 dark:bg-abyss-800 dark:text-slate-300",
    description: "Just joined the PondyHub community.",
  },
  {
    key: "regular",
    label: "Regular",
    minKarma: 50,
    className: "bg-brand-100 text-coastal-oceanDark dark:bg-brand-900 dark:text-brand-200",
    description: "An active, recognized voice in the community.",
  },
  {
    key: "trusted",
    label: "Trusted Voice",
    minKarma: 250,
    className: "bg-coastal-lagoon/15 text-coastal-oceanDark dark:bg-coastal-lagoon/20 dark:text-brand-200",
    description: "Consistently helpful contributions, trusted by neighbors.",
  },
  {
    key: "local-guide",
    label: "Local Guide",
    minKarma: 750,
    className: "bg-gradient-to-r from-coastal-ocean to-coastal-lagoon text-white",
    description: "A go-to local expert whose posts shape the community.",
  },
  {
    key: "pondy-legend",
    label: "Pondy Legend",
    minKarma: 2000,
    className: "bg-gradient-to-r from-coastal-terracotta to-coastal-ocean text-white",
    description: "Among the most respected, longest-standing members of PondyHub.",
  },
];

export function getReputationTier(karma: number): ReputationTier {
  let current = REPUTATION_TIERS[0];
  for (const tier of REPUTATION_TIERS) {
    if (karma >= tier.minKarma) current = tier;
  }
  return current;
}

export function getNextTier(karma: number): ReputationTier | null {
  const current = getReputationTier(karma);
  const currentIndex = REPUTATION_TIERS.findIndex((t) => t.key === current.key);
  return REPUTATION_TIERS[currentIndex + 1] ?? null;
}
