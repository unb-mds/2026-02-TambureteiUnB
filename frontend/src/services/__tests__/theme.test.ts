import assert from "node:assert/strict";
import test from "node:test";
import {
  isThemePreference,
  resolveTheme,
} from "../theme.ts";

test("isThemePreference accepts only supported appearance preferences", () => {
  assert.equal(isThemePreference("light"), true);
  assert.equal(isThemePreference("dark"), true);
  assert.equal(isThemePreference("system"), true);
  assert.equal(isThemePreference("automatic"), false);
  assert.equal(isThemePreference(null), false);
});

test("resolveTheme honors explicit light and dark preferences", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("light", false), "light");
  assert.equal(resolveTheme("dark", true), "dark");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("resolveTheme follows the system preference in automatic mode", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});
