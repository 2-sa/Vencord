/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import hiddenStyle from "./hidden.css?managed";

let running = false;

const settings = definePluginSettings({
    hidden: {
        type: OptionType.BOOLEAN,
        description: "إخفاء قائمة الخاص مع إبقاء مساحتها. لا يخفي المحادثة المفتوحة أو الإشعارات.",
        default: false,
        onChange: applyVisibility
    },
    shortcut: {
        type: OptionType.BOOLEAN,
        description: "تفعيل اختصار Ctrl+Shift+H (أو ⌘+Shift+H على الماك) داخل Discord.",
        default: true
    }
});

function applyVisibility() {
    if (running && settings.store.hidden) enableStyle(hiddenStyle);
    else disableStyle(hiddenStyle);
}

function toggle() {
    settings.store.hidden = !settings.store.hidden;
}

function onKeyDown(event: KeyboardEvent) {
    if (!running || !settings.store.shortcut || event.repeat || event.isComposing || event.defaultPrevented) return;
    const modifier = IS_MAC ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
    if (!modifier || !event.shiftKey || event.altKey || event.code !== "KeyH") return;

    event.preventDefault();
    event.stopPropagation();
    toggle();
}

function HideDMsButton() {
    const { hidden, shortcut } = settings.use(["hidden", "shortcut"]);
    const label = hidden ? "إظهار قائمة الخاص" : "إخفاء قائمة الخاص";
    const title = shortcut ? `${label} (${IS_MAC ? "⌘" : "Ctrl"}+Shift+H)` : label;

    return (
        <div className="vc-hide-dms-control">
            <button
                type="button"
                className="vc-hide-dms-button"
                aria-label="إخفاء قائمة الخاص"
                aria-pressed={hidden}
                title={title}
                onClick={toggle}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    {hidden && <path d="m3 3 18 18" />}
                </svg>
            </button>
        </div>
    );
}

export default definePlugin({
    name: "HideDMs",
    description: "إخفاء قائمة الخاص مؤقتًا بزر في شريط السيرفرات أو اختصار كيبورد، مع حفظ حالة الإخفاء.",
    authors: [Devs.TwoSa],
    tags: ["Privacy", "Utility"],
    dependencies: ["ServerListAPI"],
    enabledByDefault: true,
    settings,

    start() {
        running = true;
        applyVisibility();
        addServerListElement(ServerListRenderPosition.Above, HideDMsButton);
        document.addEventListener("keydown", onKeyDown, true);
    },

    stop() {
        running = false;
        document.removeEventListener("keydown", onKeyDown, true);
        removeServerListElement(ServerListRenderPosition.Above, HideDMsButton);
        disableStyle(hiddenStyle);
    }
});
