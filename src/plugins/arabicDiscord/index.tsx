/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 2-sa
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Forms } from "@webpack/common";

// Import styles and translations
import translations from "./ar.json";

// --- Constants & Configuration ---

const attributesToTranslate = ["aria-label", "title", "placeholder", "alt"];
const fontDefinitions = {
    amiri: {
        family: '"Amiri", "Noto Naskh Arabic", serif',
        url: "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap"
    },
    cairo: {
        family: '"Cairo", "Noto Sans Arabic", sans-serif',
        url: "https://fonts.googleapis.com/css2?family=Cairo:wght@400..700&display=swap"
    },
    tajawal: {
        family: '"Tajawal", "Noto Sans Arabic", sans-serif',
        url: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
    },
    vazirmatn: {
        family: '"Vazirmatn", "Noto Sans Arabic", sans-serif',
        url: "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400..700&display=swap"
    }
};
type FontName = keyof typeof fontDefinitions | "default";

const FONT_LINK_ID = "vc-arabic-ui-font";
const FONT_CLASS = "vc-arabic-ui-custom-font";
const TRANSLATION_CACHE_LIMIT = 1_024;
const skipSelector = [
    "input", "textarea", "select", "option", "code", "pre", "kbd", "samp",
    "script", "style", "time", "[contenteditable='true']", "[role='textbox']",
    "[data-slate-editor='true']", "[id^='message-content-']", "[class*='messageContent']"
].join(",");

function applyFont(font: FontName) {
    const root = document.documentElement;
    const existingLink = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
    const definition = font === "default" ? undefined : fontDefinitions[font];

    if (!definition) {
        existingLink?.remove();
        root.classList.remove(FONT_CLASS);
        root.style.removeProperty("--arabic-ui-font");
        return;
    }

    const link = existingLink ?? Object.assign(document.createElement("link"), {
        id: FONT_LINK_ID,
        rel: "stylesheet"
    });
    if (link.href !== definition.url) link.href = definition.url;
    if (!link.isConnected) document.head.append(link);

    root.style.setProperty("--arabic-ui-font", definition.family);
    root.classList.add(FONT_CLASS);
}

const settings = definePluginSettings({
    font: {
        type: OptionType.SELECT,
        description: "اختر الخط العربي المستخدم في واجهة ديسكورد",
        options: [
            { label: "Discord Default", value: "default" },
            { label: "Cairo", value: "cairo", default: true },
            { label: "Tajawal", value: "tajawal" },
            { label: "Amiri", value: "amiri" },
            { label: "Vazirmatn", value: "vazirmatn" }
        ],
        onChange: value => applyFont(value as FontName)
    }
});

const translationPatterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^(\d+)\s+Online$/, match => `${match[1]} متصل`],
    [/^(\d+)\s+Members$/, match => `${match[1]} عضو`],
    [/^(\d+)\s+accounts$/, match => `${match[1]} حساباً`],
    [/^(\d+)\s+Mutual Friends$/, match => `${match[1]} أصدقاء مشتركون`],
    [/^(\d+)\s+Mutual Servers$/, match => `${match[1]} سيرفرات مشتركة`],
    [/^(\d+)\s+Mutual Server$/, match => `${match[1]} سيرفر مشترك`],
    [/^Offline\s+[—-]\s+(\d+)$/, match => `غير متصل — ${match[1]}`],
    [/^Activity\s+[—-]\s+(\d+)$/, match => `النشاط — ${match[1]}`],
    [/^Online\s+[—-]\s+(\d+)$/, match => `متصلون — ${match[1]}`],
    [/^All friends\s+[—-]\s+(\d+)$/, match => `كل الأصدقاء — ${match[1]}`],
    [/^Sent\s+[—-]\s+(\d+)$/, match => `المرسلة — ${match[1]}`],
    [/^Screen\s+(\d+)$/, match => `الشاشة ${match[1]}`],
    [/^Smoother video\s*[·•]\s*(.+)$/, match => `فيديو أكثر سلاسة · ${match[1]}`],
    [/^Clearer text\s*[·•]\s*(.+)$/, match => `نص أوضح · ${match[1].replace("Source", "المصدر")}`],
    [/^Well, it looks like Discord is not detecting any input from your mic\. Let[’']s fix that! Error: (\d+)$/, match => `يبدو أن ديسكورد لا يلتقط أي صوت من الميكروفون. لنصلح ذلك! خطأ: ${match[1]}`],
    [/^(.+)\s+Error:\s*(\d+)$/, match => `${translations[match[1]] ?? match[1]} رمز الخطأ: ${match[2]}`],
    [/^Average ping:\s*(\d+)\s*ms$/, match => `متوسط الاستجابة: ${match[1]} مللي ثانية`],
    [/^Last ping:\s*(\d+)\s*ms$/, match => `آخر استجابة: ${match[1]} مللي ثانية`],
    [/^Outbound packet loss rate:\s*([\d.]+)%$/, match => `نسبة فقدان الحزم الصادرة: ${match[1]}%`],
    [/^You can add (\d+) more friends\.$/, match => `يمكنك إضافة ${match[1]} أصدقاء آخرين.`],
    [/^EDIT ROLE\s+[—-]\s+(.+)$/, match => `تعديل الرتبة — ${translations[match[1]] ?? match[1]}`],
    [/^Manage Members \((\d+)\)$/, match => `إدارة الأعضاء (${match[1]})`],
    [/^Your current phone number is: (.+)\. Reveal$/, match => `رقم هاتفك الحالي هو: ${match[1]}. إظهار`],
    [/^Accept as (.+)$/, match => `قبول باسم ${match[1]}`],
    [/^Leave '(.+)'$/, match => `مغادرة '${match[1]}'`],
    [/^Are you sure you want to leave (.+)\? You won[’']t be able to rejoin this server unless you are re-invited\.$/, match => `هل أنت متأكد أنك تريد مغادرة ${match[1]}؟ لن تتمكن من العودة إلى هذا السيرفر إلا بدعوة جديدة.`],
    [/^Delete '(.+)'$/, match => `حذف '${match[1]}'`],
    [/^Are you sure you want to delete (.+)\? This action cannot be undone\.$/, match => `هل أنت متأكد أنك تريد حذف ${match[1]}؟ لا يمكن التراجع عن هذا الإجراء.`],
    [/^(.+)\s+started a call\.$/, match => `${match[1]} بدأ مكالمة.`],
    [/^(.+)\s+started a call that lasted (.+)\.$/, match => `${match[1]} بدأ مكالمة استمرت ${translateCallDuration(match[2])}.`],
    [/^This is the beginning of your direct message history with (.+)\.$/, match => `هذه بداية سجل رسائلك الخاصة مع ${match[1]}.`],
    [/^Ignore (.+)\?$/, match => `تجاهل ${match[1]}؟`],
    [/^You have unsaved changes to the "(.+)" AutoMod rule\. Are you sure you want to stop editing without saving\?$/, match => `لديك تغييرات غير محفوظة في قاعدة الإشراف التلقائي "${translations[match[1]] ?? match[1]}". هل أنت متأكد أنك تريد إيقاف التعديل دون الحفظ؟`],
    [/^Add up to (\d+) custom emoji that anyone can use in this server\. Animated GIF emoji may be used by members with Discord Nitro\.$/, match => `أضف ما يصل إلى ${match[1]} رمزاً تعبيرياً مخصصاً يمكن لأي شخص استخدامه في هذا السيرفر. يمكن للأعضاء الذين يمتلكون ديسكورد نايترو استخدام الرموز التعبيرية المتحركة بصيغة GIF.`],
    [/^The recommended minimum size is (\d+x\d+) and recommended aspect ratio is ([\d:]+)\.$/, match => `الحد الأدنى الموصى به للحجم هو ${match[1]} ونسبة الأبعاد الموصى بها هي ${match[2]}.`],
    [/^Buy for (.+)$/, match => `شراء بسعر ${match[1]}`],
    [/^Plans start at only (.+?)\/(month|year)\. Cancel anytime$/, match => `تبدأ الخطط من \u200E${match[1]}\u200E/${match[2] === "month" ? "شهر" : "سنة"} فقط. يمكنك الإلغاء في أي وقت`],
    [/^Plans start at only (.+)\. Cancel anytime$/, match => `تبدأ الخطط من \u200E${match[1]}\u200E فقط. يمكنك الإلغاء في أي وقت`],
    [/^(.+)\/month$/, match => `${match[1]}/شهر`],
    [/^(.+)\/year$/, match => `${match[1]}/سنة`],
    [/^In (\d+) Days?$/, match => `خلال ${match[1]} يوم`],
    [/^(\d+) Orbs$/, match => `${match[1]} أوربز`],
    [/^GOOD MORNING,?$/, () => "صباح الخير،"],
    [/^GOOD AFTERNOON,?$/, () => "مساء الخير،"],
    [/^GOOD EVENING,?$/, () => "مساء الخير،"],
    [/^Open the Inbox by pressing (.+), and mark your top message as read with (.+)\.$/, match => `افتح صندوق الوارد بالضغط على ${match[1]}، وحدد أول رسالة كمقروءة بالضغط على ${match[2]}.`],
    [/^PROTIP: Open the Inbox by pressing (.+), and mark your top message as read with (.+)\.$/, match => `نصيحة احترافية: افتح صندوق الوارد بالضغط على ${match[1]}، وحدد أول رسالة كمقروءة بالضغط على ${match[2]}.`]
];

// --- State ---

interface TranslationRecord {
    original: string;
    translated: string;
}

const translatedTextNodes = new Map<Text, TranslationRecord>();
const translatedAttributes = new Map<Element, Map<string, TranslationRecord>>();
const translationCache = new Map<string, string | null>();
let observer: MutationObserver | undefined;
let scheduledFrame: number | undefined;
const pendingRoots = new Set<Node>();
const pendingNodes = new Set<Node>();
const removedRoots = new Set<Node>();

// --- Helper Functions ---

function translateCallDuration(value: string) {
    const normalized = value.toLowerCase().trim();
    if (normalized === "a few seconds") return "ثوانٍ قليلة";
    if (normalized === "a minute") return "دقيقة";
    if (normalized === "an hour") return "ساعة";

    return normalized
        .replace(/^(\d+) seconds?$/, "$1 ثانية")
        .replace(/^(\d+) minutes?$/, "$1 دقيقة")
        .replace(/^(\d+) hours?$/, "$1 ساعة");
}

function normalize(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

const normalizedTranslations = new Map<string, string>();
for (const [key, value] of Object.entries(translations)) {
    const normalizedKey = normalize(key);
    if (!normalizedTranslations.has(normalizedKey)) normalizedTranslations.set(normalizedKey, normalize(value));
}

function translate(value: string) {
    const normalized = normalize(value);
    if (!normalized || !/[A-Za-z]/.test(normalized)) return;

    const exact = normalizedTranslations.get(normalized);
    if (exact) return exact;

    const cached = translationCache.get(normalized);
    if (cached !== undefined) return cached ?? undefined;

    for (const [pattern, replacer] of translationPatterns) {
        const match = normalized.match(pattern);
        if (match) {
            const result = replacer(match);
            cacheTranslation(normalized, result);
            return result;
        }
    }

    cacheTranslation(normalized, null);
}

function cacheTranslation(key: string, value: string | null) {
    if (translationCache.size >= TRANSLATION_CACHE_LIMIT) {
        const oldest = translationCache.keys().next().value;
        if (oldest) translationCache.delete(oldest);
    }
    translationCache.set(key, value);
}

function replaceWithTranslation(value: string, translated: string) {
    const leadingWhitespace = value.match(/^\s*/)?.[0] ?? "";
    const trailingWhitespace = value.match(/\s*$/)?.[0] ?? "";
    return `${leadingWhitespace}${translated}${trailingWhitespace}`;
}

function isExcluded(element: Element) {
    return element.matches(skipSelector);
}

function isInsideExcludedTree(node: Node) {
    const element = node instanceof Element ? node : node.parentElement;
    return Boolean(element?.closest(skipSelector));
}

// --- Core Translation Logic ---

function translateTextNode(node: Text) {
    const parent = node.parentElement;
    if (!parent) return;

    const translated = translate(node.data);
    if (!translated) return;

    const value = replaceWithTranslation(node.data, translated);
    const previous = translatedTextNodes.get(node);
    if (previous?.translated === node.data || value === node.data) return;

    translatedTextNodes.set(node, { original: node.data, translated: value });
    node.data = value;
}

function translateAttributes(element: Element) {
    for (const attribute of attributesToTranslate) {
        const value = element.getAttribute(attribute);
        if (!value) continue;

        const previous = translatedAttributes.get(element)?.get(attribute);
        if (previous?.translated === value) continue;

        const translated = translate(value);
        if (!translated) continue;

        const translatedValue = replaceWithTranslation(value, translated);
        if (translatedValue === value) continue;

        let originals = translatedAttributes.get(element);
        if (!originals) {
            originals = new Map();
            translatedAttributes.set(element, originals);
        }

        originals.set(attribute, { original: value, translated: translatedValue });
        element.setAttribute(attribute, translatedValue);
    }
}

function translateTree(root: Node) {
    if (isInsideExcludedTree(root)) return;
    if (root instanceof Element) translateAttributes(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (node instanceof Element && isExcluded(node)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    let node: Node | null;

    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text);
            continue;
        }
        translateAttributes(node as Element);
    }
}

function forgetTree(root: Node) {
    translatedTextNodes.delete(root as Text);
    translatedAttributes.delete(root as Element);

    if (!(root instanceof Element)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        translatedTextNodes.delete(node as Text);
        translatedAttributes.delete(node as Element);
    }
}

function isNestedInSet(node: Node, roots: Set<Node>) {
    for (let parent = node.parentNode; parent; parent = parent.parentNode) {
        if (roots.has(parent)) return true;
    }
    return false;
}

function flushMutations() {
    scheduledFrame = undefined;

    for (const root of removedRoots) forgetTree(root);
    removedRoots.clear();

    for (const node of pendingNodes) {
        if (!node.isConnected || isInsideExcludedTree(node)) continue;
        if (node instanceof Text) translateTextNode(node);
        else if (node instanceof Element) translateAttributes(node);
    }
    pendingNodes.clear();

    for (const root of pendingRoots) {
        if (root.isConnected && !isNestedInSet(root, pendingRoots)) translateTree(root);
    }
    pendingRoots.clear();
}

function scheduleFlush() {
    if (scheduledFrame === undefined) scheduledFrame = requestAnimationFrame(flushMutations);
}

function restoreTranslations() {
    for (const [node, record] of translatedTextNodes) {
        if (node.isConnected && node.data === record.translated) node.data = record.original;
    }
    for (const [element, attributes] of translatedAttributes) {
        if (!element.isConnected) continue;
        for (const [attribute, record] of attributes) {
            if (element.getAttribute(attribute) === record.translated) element.setAttribute(attribute, record.original);
        }
    }
    translatedTextNodes.clear();
    translatedAttributes.clear();
}

// --- Plugin Definition ---

export default definePlugin({
    name: "ArabicUI",
    description: "Translates Discord's interface into Arabic with selectable Arabic fonts.",
    authors: [Devs.TwoSa],
    enabledByDefault: true,
    settings,
    settingsAboutComponent: () => (
        <Forms.FormText>
            GitHub: <Link href="https://github.com/2-sa/Vencord">github.com/2-sa/Vencord</Link>
        </Forms.FormText>
    ),

    start() {
        applyFont(settings.store.font as FontName);

        // 1. Initial Translation
        translateTree(document.body);

        // 2. Setup DOM Observer for dynamic content
        observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes" && mutation.target instanceof Element) {
                    pendingNodes.add(mutation.target);
                    continue;
                }

                if (mutation.type === "characterData") {
                    pendingNodes.add(mutation.target);
                    continue;
                }

                for (const node of mutation.addedNodes) pendingRoots.add(node);
                for (const node of mutation.removedNodes) removedRoots.add(node);
            }
            scheduleFlush();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
            attributeFilter: attributesToTranslate
        });
    },

    stop() {
        observer?.disconnect();
        observer = undefined;
        if (scheduledFrame !== undefined) cancelAnimationFrame(scheduledFrame);
        scheduledFrame = undefined;
        pendingRoots.clear();
        pendingNodes.clear();
        removedRoots.clear();
        restoreTranslations();
        translationCache.clear();
        document.getElementById(FONT_LINK_ID)?.remove();
        document.documentElement.classList.remove(FONT_CLASS);
        document.documentElement.style.removeProperty("--arabic-ui-font");
    }
});
