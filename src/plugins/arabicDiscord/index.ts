/*
 * Vencord user plugin
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

// Import styles and translations
import "./style.css";
import translations from "./ar.json";

// --- Constants & Configuration ---

const attributesToTranslate = ["aria-label", "title", "placeholder", "alt"];
const skipSelector = [
    "input", "textarea", "select", "option", "code", "pre", "kbd", "samp",
    "script", "style", "time", "[contenteditable='true']", "[role='textbox']",
    "[data-slate-editor='true']", "[id^='message-content-']", "[class*='messageContent']"
].join(",");

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
    [/^Plans start at only (.+?)\/(month|year)\. Cancel anytime$/, match => `تبدأ الخطط من \u200E${match[1]}\u200E/${match[2] === 'month' ? 'شهر' : 'سنة'} فقط. يمكنك الإلغاء في أي وقت`],
    [/^Plans start at only (.+)\. Cancel anytime$/, match => `تبدأ الخطط من \u200E${match[1]}\u200E فقط. يمكنك الإلغاء في أي وقت`],
    [/^(.+)\/month$/, match => `${match[1]}/شهر`],
    [/^(.+)\/year$/, match => `${match[1]}/سنة`],
    [/^Open the Inbox by pressing (.+), and mark your top message as read with (.+)\.$/, match => `افتح صندوق الوارد بالضغط على ${match[1]}، وحدد أول رسالة كمقروءة بالضغط على ${match[2]}.`],
    [/^PROTIP: Open the Inbox by pressing (.+), and mark your top message as read with (.+)\.$/, match => `نصيحة احترافية: افتح صندوق الوارد بالضغط على ${match[1]}، وحدد أول رسالة كمقروءة بالضغط على ${match[2]}.`]
];

// --- State ---

const translatedTextNodes = new Map<Text, string>();
const translatedAttributes = new Map<Element, Map<string, string>>();
let observer: MutationObserver | undefined;

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

function translate(value: string) {
    const normalized = normalize(value);
    const exact = translations[normalized];
    if (exact) return exact;

    for (const [pattern, replacer] of translationPatterns) {
        const match = normalized.match(pattern);
        if (match) return replacer(match);
    }
}

function replaceWithTranslation(value: string, translated: string) {
    const leadingWhitespace = value.match(/^\s*/)?.[0] ?? "";
    const trailingWhitespace = value.match(/\s*$/)?.[0] ?? "";
    return `${leadingWhitespace}${translated}${trailingWhitespace}`;
}

function shouldSkipElement(element: Element) {
    return Boolean(element.closest(skipSelector));
}

// --- Core Translation Logic ---

function translateTextNode(node: Text) {
    const parent = node.parentElement;
    if (!parent || shouldSkipElement(parent)) return;

    const translated = translate(node.data);
    if (!translated) return;

    if (!translatedTextNodes.has(node)) translatedTextNodes.set(node, node.data);
    node.data = replaceWithTranslation(node.data, translated);
}

function translateAttributes(element: Element) {
    if (shouldSkipElement(element)) return;

    for (const attribute of attributesToTranslate) {
        const value = element.getAttribute(attribute);
        if (!value) continue;

        const translated = translate(value);
        if (!translated) continue;

        let originals = translatedAttributes.get(element);
        if (!originals) {
            originals = new Map();
            translatedAttributes.set(element, originals);
        }

        if (!originals.has(attribute)) originals.set(attribute, value);
        element.setAttribute(attribute, replaceWithTranslation(value, translated));
    }
}

function translateTree(root: Node) {
    if (root instanceof Element) translateAttributes(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node: Node | null;

    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text);
            continue;
        }
        translateAttributes(node as Element);
    }
}

function restoreTranslations() {
    for (const [node, original] of translatedTextNodes) {
        node.data = original;
    }
    for (const [element, attributes] of translatedAttributes) {
        for (const [attribute, original] of attributes) {
            element.setAttribute(attribute, original);
        }
    }
    translatedTextNodes.clear();
    translatedAttributes.clear();
}

// --- Plugin Definition ---

export default definePlugin({
    name: "ArabicDiscord",
    description: "Adds a lightweight Arabic UI translation layer to Discord.",
    authors: [{ name: "Local Arabic User", id: 0n }],
    enabledByDefault: true,

    start() {
        // 1. Initial Translation
        translateTree(document.body);

        // 2. Setup DOM Observer for dynamic content
        observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes" && mutation.target instanceof Element) {
                    translateAttributes(mutation.target);
                    continue;
                }

                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        translateTextNode(node as Text);
                    } else if (node instanceof Element) {
                        translateTree(node);
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: attributesToTranslate
        });
    },

    stop() {
        observer?.disconnect();
        observer = undefined;
        restoreTranslations();
    }
});
