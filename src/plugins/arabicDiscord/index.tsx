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
    ibmPlexSansArabic: {
        family: '"IBM Plex Sans Arabic", "Noto Sans Arabic", sans-serif',
        lineHeight: "1.38",
        url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
    },
    notoSansArabic: {
        family: '"Noto Sans Arabic", sans-serif',
        lineHeight: "1.4",
        url: "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400..700&display=swap"
    },
    alexandria: {
        family: '"Alexandria", "Noto Sans Arabic", sans-serif',
        lineHeight: "1.36",
        url: "https://fonts.googleapis.com/css2?family=Alexandria:wght@400..700&display=swap"
    },
    amiri: {
        family: '"Amiri", "Noto Naskh Arabic", serif',
        lineHeight: "1.5",
        url: "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap"
    },
    cairo: {
        family: '"Cairo", "Noto Sans Arabic", sans-serif',
        lineHeight: "1.42",
        url: "https://fonts.googleapis.com/css2?family=Cairo:wght@400..700&display=swap"
    },
    tajawal: {
        family: '"Tajawal", "Noto Sans Arabic", sans-serif',
        lineHeight: "1.38",
        url: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
    },
    vazirmatn: {
        family: '"Vazirmatn", "Noto Sans Arabic", sans-serif',
        lineHeight: "1.4",
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
        root.style.removeProperty("--arabic-ui-line-height");
        return;
    }

    const link = existingLink ?? Object.assign(document.createElement("link"), {
        id: FONT_LINK_ID,
        rel: "stylesheet"
    });
    if (link.href !== definition.url) link.href = definition.url;
    if (!link.isConnected) document.head.append(link);

    root.style.setProperty("--arabic-ui-font", definition.family);
    root.style.setProperty("--arabic-ui-line-height", definition.lineHeight);
    root.classList.add(FONT_CLASS);
}

const settings = definePluginSettings({
    font: {
        type: OptionType.SELECT,
        description: "اختر خط الواجهة. يُنصح بخط IBM Plex Sans Arabic لأنه واضح ومتوازن في ديسكورد.",
        options: [
            { label: "IBM Plex Sans Arabic — موصى به", value: "ibmPlexSansArabic", default: true },
            { label: "Noto Sans Arabic — واضح ومحايد", value: "notoSansArabic" },
            { label: "Alexandria — عصري وهندسي", value: "alexandria" },
            { label: "Cairo — عريض وواضح", value: "cairo" },
            { label: "Tajawal — خفيف ومضغوط", value: "tajawal" },
            { label: "Vazirmatn — متوازن", value: "vazirmatn" },
            { label: "Amiri — تقليدي للنصوص", value: "amiri" },
            { label: "خط ديسكورد الافتراضي", value: "default" }
        ],
        onChange: value => applyFont(value as FontName)
    }
});

const translatedMonths: Record<string, string> = {
    Apr: "أبريل",
    Aug: "أغسطس",
    Dec: "ديسمبر",
    Feb: "فبراير",
    Jan: "يناير",
    Jul: "يوليو",
    Jun: "يونيو",
    Mar: "مارس",
    May: "مايو",
    Nov: "نوفمبر",
    Oct: "أكتوبر",
    Sep: "سبتمبر"
};

function formatArabicCount(value: string, one: string, two: string, few: string, many: string) {
    const count = Number(value);
    const lastTwoDigits = count % 100;
    let form = many;

    if (count === 1) form = one;
    else if (count === 2) form = two;
    else if (lastTwoDigits >= 3 && lastTwoDigits <= 10) form = few;

    return `${value} ${form}`;
}

const translationPatterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^(\d+) Items?$/, match => formatArabicCount(match[1], "عنصر", "عنصران", "عناصر", "عنصرًا")],
    [/^(.+) is not accepting friend requests\. They[’']ll have to add you to become friends\.$/, match => `لا يقبل حساب ${match[1]} طلبات الصداقة. يجب على صاحبه إضافتك لتصبحا صديقين.`],
    [/^Success! Your friend request to (.+) was sent\.$/, match => `تم إرسال طلب صداقتك إلى ${match[1]} بنجاح.`],
    [/^(.+) doesn't have any activity to share here$/, match => `لا يوجد لدى ${match[1]} أي نشاط لمشاركته هنا`],
    [/^You can add (\d+) more people\.$/, match => `يمكنك إضافة ${formatArabicCount(match[1], "شخص آخر", "شخصين آخرين", "أشخاص آخرين", "شخصًا آخر")}.`],
    [/^Your invite link expires in (\d+) hours?\.$/, match => `تنتهي صلاحية رابط دعوتك بعد ${formatArabicCount(match[1], "ساعة", "ساعتين", "ساعات", "ساعة")}.`],
    [/^Your invite link expires in (\d+) days?\.$/, match => `تنتهي صلاحية رابط دعوتك بعد ${formatArabicCount(match[1], "يوم", "يومين", "أيام", "يومًا")}.`],
    [/^Status for (.+)$/, match => `حالة قناة ${match[1]}`],
    [/^Clear tomorrow at (.+)$/, match => `المسح غدًا الساعة ${match[1]}`],
    [/^(\d+) hours? \(tomorrow at (.+)\)$/, match => `${formatArabicCount(match[1], "ساعة", "ساعتان", "ساعات", "ساعة")} (غدًا الساعة ${match[2]})`],
    [/^(\d+) hours? \((.+)\)$/, match => `${formatArabicCount(match[1], "ساعة", "ساعتان", "ساعات", "ساعة")} (${match[2]})`],
    [/^(\d+) minutes? \((.+)\)$/, match => `${formatArabicCount(match[1], "دقيقة", "دقيقتان", "دقائق", "دقيقة")} (${match[2]})`],
    [/^(\d+) minutes?$/, match => formatArabicCount(match[1], "دقيقة", "دقيقتان", "دقائق", "دقيقة")],
    [/^(\d+) hours?$/, match => formatArabicCount(match[1], "ساعة", "ساعتان", "ساعات", "ساعة")],
    [/^(\d+) days?$/, match => formatArabicCount(match[1], "يوم", "يومان", "أيام", "يومًا")],
    [/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})$/, match => `${match[2]} ${translatedMonths[match[1]]} ${match[3]}`],
    [/^(\d+)\s+connections?$/, match => formatArabicCount(match[1], "حساب مرتبط", "حسابان مرتبطان", "حسابات مرتبطة", "حسابًا مرتبطًا")],
    [/^(\d+)\s+webhooks?$/i, match => formatArabicCount(match[1], "ويب هوك", "ويب هوك", "ويب هوك", "ويب هوك")],
    [/^Permissions not synced with category: (.+)$/, match => `الصلاحيات غير متزامنة مع الفئة: ${match[1]}`],
    [/^You may be sharing activity from (\d+) games you play, including (.+)\. Restrict sharing on a game-by-game basis\.$/, match => `قد تتم مشاركة نشاطك من ${formatArabicCount(match[1], "لعبة واحدة", "لعبتين", "ألعاب", "لعبة")} تلعبها، ومنها ${match[2]}. يمكنك تقييد المشاركة لكل لعبة على حدة.`],
    [/^(\d+)\s+Online$/, match => formatArabicCount(match[1], "متصل", "متصلان", "متصلون", "متصلًا")],
    [/^(\d+)\s+Members$/, match => formatArabicCount(match[1], "عضو", "عضوان", "أعضاء", "عضوًا")],
    [/^(\d+)\s+accounts$/, match => formatArabicCount(match[1], "حساب", "حسابان", "حسابات", "حسابًا")],
    [/^(\d+)\s+Mutual Friends$/, match => formatArabicCount(match[1], "صديق مشترك", "صديقان مشتركان", "أصدقاء مشتركون", "صديقًا مشتركًا")],
    [/^(\d+)\s+Mutual Servers?$/, match => formatArabicCount(match[1], "سيرفر مشترك", "سيرفران مشتركان", "سيرفرات مشتركة", "سيرفرًا مشتركًا")],
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
    [/^You can add (\d+) more friends\.$/, match => `يمكنك إضافة ${formatArabicCount(match[1], "صديق آخر", "صديقين آخرين", "أصدقاء آخرين", "صديقًا آخر")}.`],
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
    [/^You have unsaved changes to the "(.+)" AutoMod rule\. Are you sure you want to stop editing without saving\?$/, match => `لديك تغييرات غير محفوظة في قاعدة أوتومود "${translations[match[1]] ?? match[1]}". هل تريد إيقاف التعديل دون حفظ؟`],
    [/^Add up to (\d+) custom emoji that anyone can use in this server\. Animated GIF emoji may be used by members with Discord Nitro\.$/, match => `أضف ما يصل إلى ${match[1]} إيموجي مخصص يمكن للجميع استخدامه في هذا السيرفر. ويمكن لمشتركي نيترو استخدام إيموجي GIF المتحرك.`],
    [/^The recommended minimum size is (\d+x\d+) and recommended aspect ratio is ([\d:]+)\.$/, match => `الحد الأدنى الموصى به للحجم هو ${match[1]} ونسبة الأبعاد الموصى بها هي ${match[2]}.`],
    [/^Buy for (.+)$/, match => `شراء بسعر ${match[1]}`],
    [/^Plans start at only (.+?)\/(month|year)\. Cancel anytime$/, match => `تبدأ الخطط من \u200E${match[1]}\u200E/${match[2] === "month" ? "شهر" : "سنة"} فقط. يمكنك الإلغاء في أي وقت`],
    [/^Plans start at only (.+)\. Cancel anytime$/, match => `تبدأ الخطط من \u200E${match[1]}\u200E فقط. يمكنك الإلغاء في أي وقت`],
    [/^(.+)\/month$/, match => `${match[1]}/شهر`],
    [/^(.+)\/year$/, match => `${match[1]}/سنة`],
    [/^In (\d+) Days?$/, match => `خلال ${formatArabicCount(match[1], "يوم", "يومين", "أيام", "يومًا")}`],
    [/^(\d+) Orbs$/, match => formatArabicCount(match[1], "أورب", "أوربان", "أوربز", "أوربًا")],
    [/^(.+) elapsed$/, match => `المدة: ${match[1]}`],
    [/^GOOD MORNING,?$/, () => "صباح الخير،"],
    [/^GOOD AFTERNOON,?$/, () => "مساء الخير،"],
    [/^GOOD EVENING,?$/, () => "مساء الخير،"],
    [/^Open the Inbox by pressing (.+), and mark your top message as read with (.+)\.$/, match => `افتح صندوق الوارد بالضغط على ${match[1]}، وحدد أول رسالة كمقروءة بالضغط على ${match[2]}.`],
    [/^PROTIP: Open the Inbox by pressing (.+), and mark your top message as read with (.+)\.$/, match => `نصيحة احترافية: افتح صندوق الوارد بالضغط على ${match[1]}، وحدد أول رسالة كمقروءة بالضغط على ${match[2]}.`],
    [/^(.+)'s Reviews$/, match => `تقييمات ${match[1]}`],
    [/^\((\d+) Reviews\)$/, match => `(${match[1]} تقييم)`]
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

    const duration = normalized.match(/^(\d+) (seconds?|minutes?|hours?)$/);
    if (!duration) return normalized;

    if (duration[2].startsWith("second")) {
        return formatArabicCount(duration[1], "ثانية", "ثانيتان", "ثوانٍ", "ثانية");
    }
    if (duration[2].startsWith("minute")) {
        return formatArabicCount(duration[1], "دقيقة", "دقيقتان", "دقائق", "دقيقة");
    }
    return formatArabicCount(duration[1], "ساعة", "ساعتان", "ساعات", "ساعة");
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
    if (root instanceof Element) translateAttributes(root);
    if (isInsideExcludedTree(root)) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (node instanceof Element && isExcluded(node)) {
                translateAttributes(node);
                return NodeFilter.FILTER_REJECT;
            }
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
        if (!node.isConnected) continue;
        if (node instanceof Element) {
            translateAttributes(node);
            continue;
        }
        if (!isInsideExcludedTree(node) && node instanceof Text) translateTextNode(node);
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
    description: "يترجم واجهة ديسكورد إلى العربية مع إمكانية اختيار الخط العربي.",
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
