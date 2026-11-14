import test from "node:test";
import assert from "node:assert/strict";
import { translate, validPreferences } from "../lib/i18n";
import { relativeSolarFlux } from "../lib/science";

test("locale and theme validation rejects malformed persisted preferences", () => {
  for (const locale of ["en", "ru", "kk"])
    for (const theme of ["dark", "light"])
      assert(validPreferences({ locale, theme }));
  for (const p of [null, {}, { locale: ["ru"], theme: "dark" }, { locale: "de", theme: "dark" }, { locale: "kk", theme: "auto" }])
    assert.equal(validPreferences(p), false);
});

test("translation preserves unknown mission names and translates dashboard labels", () => {
  for (const locale of ["en", "ru", "kk"] as const)
    assert.equal(translate("Aurora 2026 / Test-42", locale), "Aurora 2026 / Test-42");
  assert.notEqual(translate("Mission name", "ru"), "Mission name");
  assert.notEqual(translate("Mission name", "kk"), "Mission name");
  assert.equal(translate("", "kk"), "");
});

test("solar learning experiment follows inverse-square law and rejects invalid distance", () => {
  assert.equal(relativeSolarFlux(1), 1);
  assert.equal(relativeSolarFlux(2), 0.25);
  assert.equal(relativeSolarFlux(0.5), 4);
  for (const value of [0, -1, NaN, Infinity])
    assert.throws(() => relativeSolarFlux(value), RangeError);
});
