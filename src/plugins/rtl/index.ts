/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 2-sa
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import style from "./style.css?managed";

export default definePlugin({
    name: "RTL",
    description: "يعرض الرسائل ومربع الكتابة من اليمين إلى اليسار لتناسب المحادثات العربية.",
    authors: [Devs.TwoSa],
    enabledByDefault: true,

    start() {
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    }
});
