/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 2-sa
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Forms, MessageStore, SelectedChannelStore } from "@webpack/common";

// Import translations
import translations from "./ar.json";

// --- Constants & Configuration ---

const attributesToTranslate = ["aria-label", "title", "placeholder", "alt"];
const TRANSLATION_CACHE_LIMIT = 1_024;
const MAX_CACHED_TEXT_LENGTH = 512;
const FRAME_NODE_LIMIT = 200;
const FRAME_TIME_BUDGET_MS = 4;
const skipSelector = [
    "input", "textarea", "select", "option", "code", "pre", "kbd", "samp",
    "script", "style", "time", "[contenteditable]:not([contenteditable='false'])", "[role='textbox']",
    "[data-slate-editor='true']"
].join(",");
const messageSelector = "[id^='message-content-'],[class*='messageContent']";

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

const arabicPluralRules = new Intl.PluralRules("ar");

// The caller supplies the dual in its grammatical case (e.g. عضوين after إلى).
function formatArabicPlural(value: string, forms: Record<Intl.LDMLPluralRule, string>) {
    return forms[arabicPluralRules.select(Number(value))].replace("{n}", value);
}

function formatArabicCount(value: string, one: string, two: string, few: string, many: string) {
    const singular = one.replace(/ واحد(?:ة)?(?=\s|$)/, "");
    return formatArabicPlural(value, {
        zero: `{n} ${singular}`,
        one,
        two,
        few: `{n} ${few}`,
        many: `{n} ${many}`,
        other: `{n} ${many.replace(/ًا/g, "").replace(/ً/g, "")}`
    });
}

const translationPatterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^ROLES\s*[—–-]\s*(\d+)$/i, match => `الرتب — ${match[1]}`],
    [/^Mute (.+)$/, match => `كتم ${match[1]}`],
    [/^Privacy Settings([ :—–-]+)(.+)$/i, match => `إعدادات الخصوصية${match[1]}${match[2]}`],
    [/^Your message could not be delivered\. You can see the full list of reasons here: (https:\/\/support\.discord\.com\/hc\/en-us\/articles\/360060145013)$/, match => `تعذّر إرسال رسالتك. يمكنك الاطلاع على جميع الأسباب هنا: ${match[1]}`],
    [/^(\d+)\s+devices?$/i, match => formatArabicCount(match[1], "جهاز واحد", "جهازان", "أجهزة", "جهازًا")],
    [/^Control how your game and app activity is shared—what[’']s visible and who sees it\. You[’']re sharing activity with (.+) and (\d+) other servers?\.$/, match => `تحكّم في مشاركة نشاط ألعابك وتطبيقاتك، وما يظهر منه ومن يراه. تشارك نشاطك مع ${match[1]} و${formatArabicCount(match[2], "سيرفر آخر", "سيرفرين آخرين", "سيرفرات أخرى", "سيرفرًا آخر")}.`],
    [/^(?:(.+) )?and (\d+) other servers?(\.?)$/, match => `${match[1] ? `${match[1]} ` : ""}و${formatArabicCount(match[2], "سيرفر آخر", "سيرفرين آخرين", "سيرفرات أخرى", "سيرفرًا آخر")}${match[3]}`],
    [/^Group DMs can have up to (\d+) members\.$/, match => `يمكن أن تضم المحادثات الخاصة الجماعية ما يصل إلى ${formatArabicCount(match[1], "عضو واحد", "عضوين", "أعضاء", "عضوًا")}.`],
    [/^(Last played )?(a|an|\d+) (minute|hour|day|week|month|year)s? ago$/, match => `${match[1] ? "آخر لعب " : ""}${translateTimeAgo(match[2], match[3])}`],
    [/^Last used (a|an|\d+) (minute|hour|day|week|month|year)s? ago$/, match => `استُخدم آخر مرة ${translateTimeAgo(match[1], match[2])}`],
    [/^(\d+) Items?$/, match => formatArabicCount(match[1], "عنصر واحد", "عنصران", "عناصر", "عنصرًا")],
    [/^(.+) is not accepting friend requests\. They[’']ll have to add you to become friends\.$/, match => `لا يقبل حساب ${match[1]} طلبات الصداقة. يجب على صاحبه إضافتك لتصبحا صديقين.`],
    [/^Success! Your friend request to (.+) was sent\.$/, match => `أُرسل طلب صداقتك إلى ${match[1]}.`],
    [/^(.+) doesn't have any activity to share here$/, match => `لا يوجد لدى ${match[1]} أي نشاط لمشاركته هنا`],
    [/^You can add (\d+) more people\.$/, match => `يمكنك إضافة ${formatArabicCount(match[1], "شخص آخر", "شخصين آخرين", "أشخاص آخرين", "شخصًا آخر")}.`],
    [/^Your invite link expires in (\d+) hours?\.$/, match => `تنتهي صلاحية رابط دعوتك بعد ${formatArabicCount(match[1], "ساعة واحدة", "ساعتين", "ساعات", "ساعة")}.`],
    [/^Your invite link expires in (\d+) days?\.$/, match => `تنتهي صلاحية رابط دعوتك بعد ${formatArabicCount(match[1], "يوم واحد", "يومين", "أيام", "يومًا")}.`],
    [/^Status for (.+)$/, match => `حالة قناة ${match[1]}`],
    [/^Clear tomorrow at (.+)$/, match => `المسح غدًا الساعة ${match[1]}`],
    [/^(\d+) hours? \(tomorrow at (.+)\)$/, match => `${formatArabicCount(match[1], "ساعة واحدة", "ساعتان", "ساعات", "ساعة")} (غدًا الساعة ${match[2]})`],
    [/^(\d+) hours? \((.+)\)$/, match => `${formatArabicCount(match[1], "ساعة واحدة", "ساعتان", "ساعات", "ساعة")} (${match[2]})`],
    [/^(\d+) minutes? \((.+)\)$/, match => `${formatArabicCount(match[1], "دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة")} (${match[2]})`],
    [/^(\d+) minutes?$/, match => formatArabicCount(match[1], "دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة")],
    [/^(\d+) hours?$/, match => formatArabicCount(match[1], "ساعة واحدة", "ساعتان", "ساعات", "ساعة")],
    [/^(\d+) days?$/, match => formatArabicCount(match[1], "يوم واحد", "يومان", "أيام", "يومًا")],
    [/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})$/, match => `${match[2]} ${translatedMonths[match[1]]} ${match[3]}`],
    [/^(\d+)\s+connections?$/, match => formatArabicCount(match[1], "حساب مرتبط واحد", "حسابان مرتبطان", "حسابات مرتبطة", "حسابًا مرتبطًا")],
    [/^(\d+)\s+webhooks?$/i, match => formatArabicCount(match[1], "ويب هوك واحد", "ويب هوك اثنان", "ويب هوك", "ويب هوك")],
    [/^(\d+) of (\d+) slots available$/i, match => `الخانات المتاحة: ${match[1]} من ${match[2]}`],
    [/^(\d+) Slots? of (\d+) available$/i, match => `الخانات المتاحة: ${match[1]} من ${match[2]}`],
    [/^Permissions not synced with category: (.+)$/, match => `الصلاحيات غير متزامنة مع الفئة: ${match[1]}`],
    [/^You may (?:also )?be sharing activity from (\d+) games? you play, including (.+)\. Restrict sharing on a game-by-game basis\.$/, match => `قد تشارك نشاطك من الألعاب التي تلعبها (العدد: ${match[1]})، ومنها ${match[2]}. يمكنك تقييد المشاركة لكل لعبة على حدة.`],
    [/^You may (?:also )?be sharing activity from (\d+) games? you play, including$/, match => `قد تشارك نشاطك من الألعاب التي تلعبها (العدد: ${match[1]})، ومنها`],
    [/^Friend Anniversaries\s*[—–-]\s*(\d+)$/, match => `ذكريات الصداقة — ${match[1]}`],
    [/^(\d+)\s+Online$/, match => formatArabicCount(match[1], "متصل واحد", "متصلان", "متصلين", "متصلًا")],
    [/^(\d+)\s+Members?$/i, match => formatArabicCount(match[1], "عضو واحد", "عضوان", "أعضاء", "عضوًا")],
    [/^(\d+)\s+accounts$/, match => formatArabicCount(match[1], "حساب واحد", "حسابان", "حسابات", "حسابًا")],
    [/^(\d+)\s+Mutual Friends$/, match => formatArabicCount(match[1], "صديق مشترك واحد", "صديقان مشتركان", "أصدقاء مشتركون", "صديقًا مشتركًا")],
    [/^(\d+)\s+Mutual Servers?$/, match => formatArabicCount(match[1], "سيرفر مشترك واحد", "سيرفران مشتركان", "سيرفرات مشتركة", "سيرفرًا مشتركًا")],
    [/^Offline\s+[—-]\s+(\d+)$/, match => `غير متصل — ${match[1]}`],
    [/^Activity\s+[—-]\s+(\d+)$/, match => `النشاط — ${match[1]}`],
    [/^Online\s+[—-]\s+(\d+)$/, match => `متصلون — ${match[1]}`],
    [/^All friends\s+[—-]\s+(\d+)$/, match => `كل الأصدقاء — ${match[1]}`],
    [/^Sent\s+[—-]\s+(\d+)$/, match => `المرسلة — ${match[1]}`],
    [/^Screen\s+(\d+)$/, match => `الشاشة ${match[1]}`],
    [/^Smoother video\s*[·•]\s*(.+)$/, match => `فيديو أسلس · ${match[1]}`],
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
    [/^You have unsaved changes to the "(.+)" AutoMod rule\. Are you sure you want to stop editing without saving\?$/, match => `لديك تغييرات غير محفوظة في قاعدة أوتومود «${translations[match[1]] ?? match[1]}». هل تريد إيقاف التعديل دون حفظ؟`],
    [/^Add up to (\d+) custom emoji that anyone can use in this server\. Animated GIF emoji may be used by members with Discord Nitro\.$/, match => `أضف ما يصل إلى ${match[1]} إيموجي مخصص يمكن للجميع استخدامه في هذا السيرفر. ويمكن لمشتركي نيترو استخدام إيموجي GIF المتحرك.`],
    [/^The recommended minimum size is (\d+x\d+) and recommended aspect ratio is ([\d:]+)\.$/, match => `الحد الأدنى الموصى به للحجم هو ${match[1]} ونسبة الأبعاد الموصى بها هي ${match[2]}.`],
    [/^Buy for (.+)$/, match => `شراء بسعر ${match[1]}`],
    [/^Plans start at only (.+?)\/(month|year)\. Cancel anytime$/, match => `تبدأ الخطط من \u200E${match[1]}\u200E/${match[2] === "month" ? "شهر" : "سنة"} فقط. يمكنك الإلغاء في أي وقت`],
    [/^Plans start at only (.+)\. Cancel anytime$/, match => `تبدأ الخطط من \u200E${match[1]}\u200E فقط. يمكنك الإلغاء في أي وقت`],
    [/^(.+)\/month$/, match => `${match[1]}/شهر`],
    [/^(.+)\/year$/, match => `${match[1]}/سنة`],
    [/^In (\d+) Days?$/, match => `بعد ${formatArabicCount(match[1], "يوم واحد", "يومين", "أيام", "يومًا")}`],
    [/^(\d+) Orbs$/, match => formatArabicCount(match[1], "أورب واحد", "أوربان", "أوربز", "أوربًا")],
    [/^(.+) elapsed$/, match => `المدة: ${match[1]}`],
    [/^GOOD MORNING,?$/, () => "صباح الخير،"],
    [/^GOOD AFTERNOON,?$/, () => "مساء الخير،"],
    [/^GOOD EVENING,?$/, () => "مساء الخير،"],
    [/^Open the Inbox by pressing (.+), and mark your top message as read with (.+)\.$/, match => `افتح صندوق الوارد بالضغط على ${match[1]}، وعلّم أول رسالة مقروءة بالضغط على ${match[2]}.`],
    [/^PROTIP: Open the Inbox by pressing (.+), and mark your top message as read with (.+)\.$/, match => `نصيحة: افتح صندوق الوارد بالضغط على ${match[1]}، وعلّم أول رسالة مقروءة بالضغط على ${match[2]}.`],
    [/^(.+)'s Reviews$/, match => `تقييمات ${match[1]}`],
    [/^\((\d+) Reviews\)$/, match => `(${formatArabicCount(match[1], "تقييم واحد", "تقييمان", "تقييمات", "تقييمًا")})`],
    [/^(.+) gave (\d+) boosts?\.?$/, match => `${match[1]} منح ${formatArabicCount(match[2], "بوست واحد", "بوستين", "بوستات", "بوستًا")}.`],
    [/^(.+) (\d+) boosts? expired\.$/, match => `انتهت صلاحية ${formatArabicCount(match[2], "بوست واحد", "بوستين", "بوستات", "بوستًا")} لدى ${match[1]}.`],
    [/^(\d+) extremely cool (?:person|people) (?:has|have) boosted this server\.?$/, match => `دعم ${formatArabicCount(match[1], "شخص رائع", "شخصان رائعان", "أشخاص رائعين", "شخصًا رائعًا")} هذا السيرفر.`],
    [/^(.+) has boosted this server\.$/, match => `دعم ${match[1]} هذا السيرفر.`],
    [/^Invite friends to (.+)$/, match => `دعوة أصدقاء إلى ${match[1]}`],
    [/^Recipients will land in (.+)$/, match => `سيدخل المستلمون إلى ${match[1]}`],
    [/^Review @(.+)$/, match => `تقييم @${match[1]}`],
    [/^'s Reviews$/, () => " — التقييمات"],
    [/^This is the beginning of your direct message history with (.+)$/, match => `هذه بداية سجل رسائلك الخاصة مع ${match[1]}`],
    [/^We[’']ll need to verify your old email address,\s*(.+?),\s*in order to change it\.$/, match => `نحتاج إلى تأكيد عنوان بريدك الإلكتروني القديم، ${match[1]}، لتغييره.`],
    [/^Your current phone number is:\s*(.+)$/, match => `رقم هاتفك الحالي هو: ${match[1]}`],
    [/^Looks like you're in another voice channel\. Are you sure you want to switch to (.+)\?$/, match => `يبدو أنك متصل بقناة صوتية أخرى. هل تريد الانتقال إلى ${match[1]}؟`]
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
const pendingAttributes = new Map<Element, Set<string>>();
const traversalJobs = new Set<Generator<void>>();

// --- Helper Functions ---

function translateCallDuration(value: string) {
    const normalized = value.toLowerCase().trim();
    if (normalized === "a few seconds") return "ثوانٍ قليلة";
    if (normalized === "a minute") return "دقيقة";
    if (normalized === "an hour") return "ساعة";

    const duration = normalized.match(/^(\d+) (seconds?|minutes?|hours?)$/);
    if (!duration) return normalized;

    if (duration[2].startsWith("second")) {
        return formatArabicCount(duration[1], "ثانية واحدة", "ثانيتين", "ثوانٍ", "ثانية");
    }
    if (duration[2].startsWith("minute")) {
        return formatArabicCount(duration[1], "دقيقة واحدة", "دقيقتين", "دقائق", "دقيقة");
    }
    return formatArabicCount(duration[1], "ساعة واحدة", "ساعتين", "ساعات", "ساعة");
}

function translateTimeAgo(amount: string, unit: string) {
    const forms: Record<string, [string, string, string, string]> = {
        minute: ["دقيقة", "دقيقتين", "دقائق", "دقيقة"],
        hour: ["ساعة", "ساعتين", "ساعات", "ساعة"],
        day: ["يوم", "يومين", "أيام", "يومًا"],
        week: ["أسبوع", "أسبوعين", "أسابيع", "أسبوعًا"],
        month: ["شهر", "شهرين", "أشهر", "شهرًا"],
        year: ["سنة", "سنتين", "سنوات", "سنة"]
    };
    const count = amount === "a" || amount === "an" ? 1 : Number(amount);
    const [one, two, few, many] = forms[unit];
    return `قبل ${count === 1 ? one : count === 2 ? two : formatArabicCount(String(count), one, two, few, many)}`;
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
    if (!/[A-Za-z]/.test(value)) return;
    const normalized = normalize(value);

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
    // Long descriptions still translate, but cannot inflate the bounded cache.
    if (key.length > MAX_CACHED_TEXT_LENGTH) return;
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

function isClydeDeliveryNotice(element: Element) {
    const container = element.closest("[id^='message-content-']");
    const messageId = container?.getAttribute("id")?.slice("message-content-".length);
    const channelId = SelectedChannelStore?.getChannelId();
    if (!messageId || !channelId) return false;
    const message = MessageStore?.getMessage(channelId, messageId);
    return message?.author?.username === "Clyde"
        && message.author.isLocalBot?.() === true
        && message.content.startsWith("Your message could not be delivered.");
}

function isExcluded(element: Element) {
    return element.matches(skipSelector)
        || (element.matches(messageSelector) && !isClydeDeliveryNotice(element));
}

function isInsideExcludedTree(node: Node) {
    const element = node instanceof Element ? node : node.parentElement;
    if (element?.closest(skipSelector)) return true;
    const message = element?.closest(messageSelector);
    return Boolean(message && !isClydeDeliveryNotice(message));
}

// --- Core Translation Logic ---

function translateTextNode(node: Text) {
    const parent = node.parentElement;
    if (!parent) return;

    const previous = translatedTextNodes.get(node);
    if (previous?.translated === node.data) return;
    const translated = translate(node.data);
    if (!translated) {
        translatedTextNodes.delete(node);
        return;
    }

    const value = replaceWithTranslation(node.data, translated);
    if (value === node.data) return;

    translatedTextNodes.set(node, { original: node.data, translated: value });
    node.data = value;
}

function translateAttributes(element: Element, attributes: Iterable<string> = attributesToTranslate) {
    for (const attribute of attributes) {
        const value = element.getAttribute(attribute);
        const previous = translatedAttributes.get(element)?.get(attribute);
        if (previous?.translated === value) continue;

        const translated = value && translate(value);
        if (!translated) {
            const records = translatedAttributes.get(element);
            records?.delete(attribute);
            if (records?.size === 0) translatedAttributes.delete(element);
            continue;
        }

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

function* translateTreeSteps(root: Node): Generator<void> {
    // Snapshot each level so removing/reparenting a node between frames cannot
    // strand a live TreeWalker inside a detached subtree.
    const stack = [root];
    while (stack.length) {
        const node = stack.pop()!;
        if (node.isConnected && !(node.parentNode && isInsideExcludedTree(node.parentNode))) {
            if (node instanceof Element) {
                translateAttributes(node);
                if (!isExcluded(node)) {
                    const children = node.childNodes;
                    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
                }
            } else if (node instanceof Text) {
                translateTextNode(node);
            }
        }
        yield;
    }
}

function* forgetTreeSteps(root: Node): Generator<void> {
    // A removal record may describe a move, not a detached subtree.
    if (root.isConnected) return;
    const stack = [root];
    while (stack.length) {
        const node = stack.pop()!;
        if (node.isConnected) { yield; continue; }
        translatedTextNodes.delete(node as Text);
        translatedAttributes.delete(node as Element);
        if (node instanceof Element) {
            const children = node.childNodes;
            for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
        }
        yield;
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
    const started = performance.now();

    for (const root of removedRoots) {
        if (!isNestedInSet(root, removedRoots)) traversalJobs.add(forgetTreeSteps(root));
    }
    removedRoots.clear();

    for (const [element, attributes] of pendingAttributes) {
        if (element.isConnected && !pendingRoots.has(element) && !isNestedInSet(element, pendingRoots)) {
            traversalJobs.add((function* () {
                if (element.isConnected && !(element.parentNode && isInsideExcludedTree(element.parentNode))) translateAttributes(element, attributes);
                yield;
            })());
        }
    }
    pendingAttributes.clear();
    for (const node of pendingNodes) {
        if (!node.isConnected || pendingRoots.has(node) || isNestedInSet(node, pendingRoots)) continue;
        traversalJobs.add(translateTreeSteps(node));
    }
    pendingNodes.clear();

    for (const root of pendingRoots) {
        if (root.isConnected && !isNestedInSet(root, pendingRoots)) traversalJobs.add(translateTreeSteps(root));
    }
    pendingRoots.clear();
    let visited = 0;
    while (traversalJobs.size && visited < FRAME_NODE_LIMIT) {
        const job = traversalJobs.values().next().value!;
        if (job.next().done) traversalJobs.delete(job);
        visited++;
        if (performance.now() - started >= FRAME_TIME_BUDGET_MS) break;
    }
    scheduleFlush();
}

function scheduleFlush() {
    if (scheduledFrame === undefined && (pendingNodes.size || pendingRoots.size || removedRoots.size || pendingAttributes.size || traversalJobs.size)) {
        scheduledFrame = requestAnimationFrame(flushMutations);
    }
}

function handleMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
            const attribute = mutation.attributeName;
            if (!attribute || !attributesToTranslate.includes(attribute)) continue;
            if (mutation.target.parentNode && isInsideExcludedTree(mutation.target.parentNode)) continue;
            if (attribute && translatedAttributes.get(mutation.target)?.get(attribute)?.translated === mutation.target.getAttribute(attribute)) continue;
            let attributes = pendingAttributes.get(mutation.target);
            if (!attributes) pendingAttributes.set(mutation.target, attributes = new Set());
            attributes.add(attribute);
        } else if (mutation.type === "characterData") {
            const node = mutation.target as Text;
            if (translatedTextNodes.get(node)?.translated === node.data || isInsideExcludedTree(node)) continue;
            pendingNodes.add(node);
        } else {
            if (!isInsideExcludedTree(mutation.target)) {
                for (const node of mutation.addedNodes) {
                    if (node instanceof Element || node instanceof Text) pendingRoots.add(node);
                }
            }
            for (const node of mutation.removedNodes) removedRoots.add(node);
        }
    }
    scheduleFlush();
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
    description: "يترجم واجهة ديسكورد إلى العربية.",
    authors: [Devs.TwoSa],
    enabledByDefault: true,
    settingsAboutComponent: () => (
        <Forms.FormText>
            GitHub: <Link href="https://github.com/2-sa/Vencord">github.com/2-sa/Vencord</Link>
        </Forms.FormText>
    ),

    start() {
        // Translate the initial page with the same bounded scheduler as updates.
        pendingRoots.add(document.body);
        scheduleFlush();

        // 2. Setup DOM Observer for dynamic content
        observer = new MutationObserver(handleMutations);

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
        pendingAttributes.clear();
        traversalJobs.clear();
        restoreTranslations();
        translationCache.clear();
    }
});
