const releaseBase = "https://github.com/2-sa/Vencord/releases";
const statusElement = document.querySelector("#release-status");

document.querySelectorAll("[data-language]").forEach(button => {
    button.addEventListener("click", () => {
        const language = button.dataset.language;
        document.querySelectorAll("[data-language]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        const demo = document.querySelector(".discord-window");
        demo.lang = language;
        demo.dir = language === "ar" ? "rtl" : "ltr";
        demo.querySelectorAll("[data-ar]").forEach(item => { item.textContent = item.dataset[language]; });
    });
});

document.querySelectorAll("[data-platform]").forEach(button => {
    button.addEventListener("click", () => {
        const isMac = button.dataset.platform === "mac";
        document.querySelectorAll("[data-platform]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        document.querySelector("#step-open").textContent = isMac
            ? "حمّل ملف macOS من الأعلى، افتح ملف DMG ثم افتح المثبّت الموجود بداخله."
            : "حمّل ملف Windows من الأعلى، ثم شغّل VencordInstaller.exe.";
        document.querySelector("#install-tip").textContent = isMac
            ? "نسخة الماك تشمل Apple Silicon وIntel. إذا تعذّر فتح المثبّت، راجع رسالة macOS وتعليمات الإصدار على GitHub."
            : "إذا كان Discord مفتوحًا أثناء التثبيت، أغلقه بالكامل ثم شغّله من جديد.";
    });
});

function safeReleaseUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === "github.com" && url.pathname.startsWith("/2-sa/Vencord/releases/") ? url.href : null;
    } catch { return null; }
}

async function loadRelease() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch("https://api.github.com/repos/2-sa/Vencord/releases/latest", { signal: controller.signal });
        if (!response.ok) throw new Error("Release unavailable");
        const release = await response.json();
        if (!Array.isArray(release.assets)) throw new Error("Invalid release");
        for (const [id, name] of [["windows-download", "VencordInstaller.exe"], ["mac-download", "ArabicUI-Vencord-macOS-Universal.dmg"]]) {
            const asset = release.assets.find(item => item.name === name);
            const url = safeReleaseUrl(asset?.browser_download_url);
            if (url) document.getElementById(id).href = url;
        }
        const link = document.createElement("a");
        link.href = safeReleaseUrl(release.html_url) || releaseBase;
        link.textContent = typeof release.name === "string" ? release.name : "عرض الإصدار";
        link.target = "_blank";
        link.rel = "noreferrer";
        statusElement.replaceChildren(document.createTextNode("أحدث إصدار: "), link);
    } catch {
        statusElement.textContent = "تعذّر جلب تفاصيل الإصدار. روابط التحميل المباشرة ما زالت متاحة.";
    } finally {
        clearTimeout(timeout);
    }
}
loadRelease();
