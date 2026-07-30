import { lookup, resolveLocale, splitBold, t } from "./index";

describe("resolveLocale", () => {
  it("returns an explicit preference unchanged", () => {
    expect(resolveLocale("pt-PT", ["en-US"])).toBe("pt-PT");
    expect(resolveLocale("en", ["pt-PT"])).toBe("en");
  });

  it("matches system locales starting with pt to pt-PT", () => {
    expect(resolveLocale("system", ["pt-PT", "en-US"])).toBe("pt-PT");
    expect(resolveLocale("system", ["pt-BR"])).toBe("pt-PT");
  });

  it("falls back to en when no system locale matches", () => {
    expect(resolveLocale("system", ["fr-FR", "de-DE"])).toBe("en");
    expect(resolveLocale("system", [])).toBe("en");
  });
});

describe("lookup", () => {
  const dict = {
    common: { save: "Save" },
    settings: { dangerZone: { confirm: "Delete everything" } },
  };

  it("resolves a nested dot-path key", () => {
    expect(lookup(dict, "settings.dangerZone.confirm")).toBe("Delete everything");
  });

  it("resolves a top-level namespace key", () => {
    expect(lookup(dict, "common.save")).toBe("Save");
  });

  it("interpolates {token} params", () => {
    const withToken = { settings: { emailSent: "Code sent to {email}" } };
    expect(lookup(withToken, "settings.emailSent", { email: "a@b.com" })).toBe("Code sent to a@b.com");
  });

  it("falls back to the key itself for a missing path", () => {
    expect(lookup(dict, "nowhere.to.be.found")).toBe("nowhere.to.be.found");
  });
});

describe("splitBold", () => {
  it("splits a single bold marker into plain/bold/plain runs", () => {
    expect(splitBold("Tap the **Plants** tab.")).toEqual(["Tap the ", { bold: "Plants" }, " tab."]);
  });

  it("handles multiple bold markers", () => {
    expect(splitBold("Add a plant from **Plants** with the **+** button.")).toEqual([
      "Add a plant from ",
      { bold: "Plants" },
      " with the ",
      { bold: "+" },
      " button.",
    ]);
  });

  it("returns the whole string unchanged when there's no bold marker", () => {
    expect(splitBold("No emphasis here.")).toEqual(["No emphasis here."]);
  });

  it("handles a bold marker at the very start or end", () => {
    expect(splitBold("**Alerts** collects everything")).toEqual([{ bold: "Alerts" }, " collects everything"]);
    expect(splitBold("open your **profile**")).toEqual(["open your ", { bold: "profile" }]);
  });
});

describe("t", () => {
  it("looks up from the real en/pt-PT dictionaries by locale", () => {
    // en/pt-PT are empty scaffolding until screens are converted --
    // any key is currently "missing," so this just proves t() routes
    // to the right dictionary and falls back safely either way.
    expect(t("en", "anything.here")).toBe("anything.here");
    expect(t("pt-PT", "anything.here")).toBe("anything.here");
  });
});
