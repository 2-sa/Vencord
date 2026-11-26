import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("account menu retains translations for the exact Discord labels", () => {
    const translations = JSON.parse(readFileSync(new URL("../../src/plugins/arabicDiscord/ar.json", import.meta.url), "utf8"));
    const normalize = value => value.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
    const normalized = new Map(Object.entries(translations).map(([k, v]) => [normalize(k), normalize(v)]));

    assert.equal(translations["Active account"], "الحساب النشط");
    assert.equal(translations["Log out"], "تسجيل الخروج");
    assert.equal(translations["Log Out"], "تسجيل الخروج");
    assert.equal(normalized.get(normalize("  Active   account ")), "الحساب النشط");
    assert.equal(normalized.get(normalize(" Log out\n")), "تسجيل الخروج");
});
