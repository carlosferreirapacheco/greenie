import { ALL_TIERS, TIER_THRESHOLDS, badgeKey, badgeLabelKey, computeSupporterTier, getVisibleBadges } from "./badges";

describe("computeSupporterTier", () => {
  it("returns null below the bronze threshold", () => {
    expect(computeSupporterTier(0)).toBeNull();
    expect(computeSupporterTier(2.99)).toBeNull();
  });

  it("returns bronze from 3 up to just under 10", () => {
    expect(computeSupporterTier(3)).toBe("bronze");
    expect(computeSupporterTier(9.99)).toBe("bronze");
  });

  it("returns silver from 10 up to just under 25", () => {
    expect(computeSupporterTier(10)).toBe("silver");
    expect(computeSupporterTier(24.99)).toBe("silver");
  });

  it("returns gold from 25 up to just under 100", () => {
    expect(computeSupporterTier(25)).toBe("gold");
    expect(computeSupporterTier(99.99)).toBe("gold");
  });

  it("returns platinum at 100 and above", () => {
    expect(computeSupporterTier(100)).toBe("platinum");
    expect(computeSupporterTier(1000)).toBe("platinum");
  });
});

describe("getVisibleBadges", () => {
  const base = { total_donated: 0, is_beta_tester: false, show_supporter_badge: true, show_beta_tester_badge: true };

  it("returns no badges when neither applies", () => {
    expect(getVisibleBadges(base)).toEqual([]);
  });

  it("returns the supporter tier badge alone when only that qualifies", () => {
    expect(getVisibleBadges({ ...base, total_donated: 50 })).toEqual([{ kind: "supporter_tier", tier: "gold" }]);
  });

  it("returns the beta tester badge alone when only that qualifies", () => {
    expect(getVisibleBadges({ ...base, is_beta_tester: true })).toEqual([{ kind: "beta_tester" }]);
  });

  it("returns both, supporter tier first, when both qualify", () => {
    expect(getVisibleBadges({ ...base, total_donated: 5, is_beta_tester: true })).toEqual([
      { kind: "supporter_tier", tier: "bronze" },
      { kind: "beta_tester" },
    ]);
  });

  it("suppresses a qualifying tier when show_supporter_badge is off", () => {
    expect(getVisibleBadges({ ...base, total_donated: 50, show_supporter_badge: false })).toEqual([]);
  });

  it("suppresses beta tester status when show_beta_tester_badge is off", () => {
    expect(getVisibleBadges({ ...base, is_beta_tester: true, show_beta_tester_badge: false })).toEqual([]);
  });

  it("caps at 3 visible badges", () => {
    const many = getVisibleBadges({ ...base, total_donated: 5, is_beta_tester: true });
    expect(many.length).toBeLessThanOrEqual(3);
  });
});

describe("badgeKey", () => {
  it("includes the tier for a supporter badge", () => {
    expect(badgeKey({ kind: "supporter_tier", tier: "platinum" })).toBe("supporter_tier:platinum");
  });

  it("is just the kind for a beta tester badge", () => {
    expect(badgeKey({ kind: "beta_tester" })).toBe("beta_tester");
  });
});

describe("ALL_TIERS / TIER_THRESHOLDS", () => {
  it("lists every tier in ascending threshold order", () => {
    expect(ALL_TIERS).toEqual(["bronze", "silver", "gold", "platinum"]);
    const thresholds = ALL_TIERS.map((tier) => TIER_THRESHOLDS[tier]);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
  });

  it("matches computeSupporterTier's own boundaries", () => {
    for (const tier of ALL_TIERS) {
      expect(computeSupporterTier(TIER_THRESHOLDS[tier])).toBe(tier);
    }
  });
});

describe("badgeLabelKey", () => {
  it("resolves a per-tier i18n key for a supporter badge", () => {
    expect(badgeLabelKey({ kind: "supporter_tier", tier: "silver" })).toBe("badges.supporterTier.silver");
  });

  it("resolves the beta tester i18n key", () => {
    expect(badgeLabelKey({ kind: "beta_tester" })).toBe("badges.betaTester.label");
  });
});
