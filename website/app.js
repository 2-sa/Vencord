const fallbackAssets = {
    windows: "https://github.com/2-sa/Vencord/releases/latest/download/VencordInstaller.exe",
    mac: "https://github.com/2-sa/Vencord/releases/latest/download/ArabicUI-Vencord-macOS-Universal.dmg"
};

const status = document.querySelector("#release-status");
const windowsButton = document.querySelector("#windows-download");
const macButton = document.querySelector("#mac-download");

fetch("https://api.github.com/repos/2-sa/Vencord/releases/latest")
    .then(response => {
        if (!response.ok) throw new Error("Latest release is unavailable");
        return response.json();
    })
    .then(release => {
        const assets = new Map(release.assets.map(asset => [asset.name, asset.browser_download_url]));
        windowsButton.href = assets.get("VencordInstaller.exe") ?? fallbackAssets.windows;
        macButton.href = assets.get("ArabicUI-Vencord-macOS-Universal.dmg") ?? fallbackAssets.mac;
        status.innerHTML = `أحدث إصدار: <a href="${release.html_url}" target="_blank" rel="noreferrer">${release.name}</a>`;
    })
    .catch(() => {
        status.textContent = "تعمل روابط التحميل بأحدث إصدار متاح.";
    });
