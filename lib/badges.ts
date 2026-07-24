export type SupporterTier = "bronze" | "silver" | "gold" | "platinum";

export type ResolvedBadge = { kind: "supporter_tier"; tier: SupporterTier } | { kind: "beta_tester" };

export type BadgeEligibility = {
  total_donated: number;
  is_beta_tester: boolean;
  show_supporter_badge: boolean;
  show_beta_tester_badge: boolean;
};

const MAX_VISIBLE_BADGES = 3;

// Single source of truth for the tier thresholds -- computeSupporterTier()
// reads from this rather than repeating the numbers, and the support-flow
// hint modal displays these same values to explain what donating unlocks.
export const TIER_THRESHOLDS: Record<SupporterTier, number> = {
  bronze: 3,
  silver: 10,
  gold: 25,
  platinum: 100,
};

export const ALL_TIERS: SupporterTier[] = ["bronze", "silver", "gold", "platinum"];

export function computeSupporterTier(totalDonated: number): SupporterTier | null {
  if (totalDonated >= TIER_THRESHOLDS.platinum) return "platinum";
  if (totalDonated >= TIER_THRESHOLDS.gold) return "gold";
  if (totalDonated >= TIER_THRESHOLDS.silver) return "silver";
  if (totalDonated >= TIER_THRESHOLDS.bronze) return "bronze";
  return null;
}

type BadgeResolver = (input: BadgeEligibility) => ResolvedBadge | null;

const resolveSupporterBadge: BadgeResolver = (input) => {
  if (!input.show_supporter_badge) return null;
  const tier = computeSupporterTier(input.total_donated);
  return tier ? { kind: "supporter_tier", tier } : null;
};

const resolveBetaTesterBadge: BadgeResolver = (input) =>
  input.is_beta_tester && input.show_beta_tester_badge ? { kind: "beta_tester" } : null;

// Display order is resolver order -- the only place ordering/capping
// logic lives. A future 3rd badge kind is one more resolver appended
// here, not a rework of any render site.
const BADGE_RESOLVERS: BadgeResolver[] = [resolveSupporterBadge, resolveBetaTesterBadge];

export function getVisibleBadges(input: BadgeEligibility): ResolvedBadge[] {
  return BADGE_RESOLVERS.map((resolve) => resolve(input))
    .filter((badge): badge is ResolvedBadge => badge !== null)
    .slice(0, MAX_VISIBLE_BADGES);
}

export function badgeKey(badge: ResolvedBadge): string {
  return badge.kind === "supporter_tier" ? `supporter_tier:${badge.tier}` : badge.kind;
}

export function badgeLabelKey(badge: ResolvedBadge): string {
  return badge.kind === "supporter_tier" ? `badges.supporterTier.${badge.tier}` : "badges.betaTester.label";
}
