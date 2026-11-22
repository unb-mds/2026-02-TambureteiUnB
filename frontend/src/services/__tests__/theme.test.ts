import assert from "node:assert/strict";
import test from "node:test";
import {
  isThemePreference,
  resolveTheme,
} from "../theme.ts";

test("isThemePreference accepts only the light and dark preferences", () => {
  assert.equal(isThemePreference("light"), true);
  assert.equal(isThemePreference("dark"), true);
  assert.equal(isThemePreference("system"), false);
  assert.equal(isThemePreference("automatic"), false);
  assert.equal(isThemePreference(null), false);
});

test("resolveTheme honors explicit light and dark preferences", () => {
  assert.equal(resolveTheme("light"), "light");
  assert.equal(resolveTheme("dark"), "dark");
});
