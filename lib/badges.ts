export type SupporterTier = "bronze" | "silver" | "gold" | "platinum";

export type ResolvedBadge = { kind: "supporter_tier"; tier: SupporterTier } | { kind: "beta_tester" };

export type BadgeEligibility = {
  total_donated: number;
  is_beta_tester: boolean;
  show_supporter_badge: boolean;
  show_beta_tester_badge: boolean;
};

const MAX_VISIBLE_BADGES = 3;

export function computeSupporterTier(totalDonated: number): SupporterTier | null {
  if (totalDonated >= 100) return "platinum";
  if (totalDonated >= 25) return "gold";
  if (totalDonated >= 10) return "silver";
  if (totalDonated >= 3) return "bronze";
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
