/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 2-sa
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import style from "./style.css?managed";

let originalDirection: string | null = null;

export default definePlugin({
    name: "RTL",
    description: "يعرض واجهة Discord كاملة من اليمين إلى اليسار لتناسب اللغة العربية.",
    authors: [Devs.TwoSa],
    enabledByDefault: true,

    start() {
        originalDirection = document.documentElement.getAttribute("dir");
        document.documentElement.setAttribute("dir", "rtl");
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
        if (document.documentElement.getAttribute("dir") !== "rtl") return;
        if (originalDirection === null) document.documentElement.removeAttribute("dir");
        else document.documentElement.setAttribute("dir", originalDirection);
    }
});
