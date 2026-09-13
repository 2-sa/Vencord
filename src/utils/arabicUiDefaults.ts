/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// This is a fixed, one-time rollout. Future default plugins must not be added
// here: users may have already chosen to disable them after this migration.
export const ARABIC_UI_DEFAULTS_V1 = [
    "YoutubeAdblock",
    "BetterSettings",
    "FixImagesQuality",
    "ValidReply",
    "CharacterCounter",
    "PermissionsViewer",
    "ReviewDB",
    "HideDMs"
] as const;

interface MigrationSettings {
    plugins: Record<string, { enabled: boolean; }>;
    arabicUiDefaultsV1Applied?: string[];
}

/** Run before dependency resolution and patch registration, using the settings
 * proxy so both the enabled flags and completion markers are saved normally. */
export function applyArabicUiDefaultsV1(settings: MigrationSettings, availablePlugins: Record<string, unknown>) {
    const applied = new Set(settings.arabicUiDefaultsV1Applied ?? []);
    for (const name of ARABIC_UI_DEFAULTS_V1) {
        // In particular, YoutubeAdblock is absent from browser builds. Do not
        // mark it done until it is actually available (e.g. on desktop later).
        if (applied.has(name) || !Object.hasOwn(availablePlugins, name)) continue;

        if (settings.plugins[name]) settings.plugins[name].enabled = true;
        else settings.plugins[name] = { enabled: true };

        applied.add(name);
        settings.arabicUiDefaultsV1Applied = [...applied];
    }
}
