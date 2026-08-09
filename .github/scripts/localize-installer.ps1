param(
    [Parameter(Mandatory = $true)]
    [string]$InstallerDirectory
)

$guiPath = Join-Path $InstallerDirectory "gui.go"
$script:source = Get-Content -LiteralPath $guiPath -Raw -Encoding utf8

function Replace-Required {
    param(
        [string]$From,
        [string]$To
    )

    if (-not $script:source.Contains($From)) {
        throw "Installer localization source text was not found: $From"
    }

    $script:source = $script:source.Replace($From, $To)
}

Replace-Required '"image/color"' "`"image/color`"`n`tarabic `"github.com/AmrEsam0/goarabic`""
Replace-Required 'func main() {' "func ar(text string) string {`n`treturn arabic.FixBidiText(text, 120)`n}`n`nfunc main() {"
Replace-Required 'win = g.NewMasterWindow("Vencord Installer", 1200, 800, 0)' "g.SetDefaultFont(`"Segoe UI`", 18)`n`twin = g.NewMasterWindow(ar(`"مثبّت Vencord`"), 1200, 800, 0)"

$replacements = @(
    @('g.Label("Vencord Installer")', 'g.Label(ar("مثبّت Vencord"))'),
    @('g.Label("Please select an install to patch")', 'g.Label(ar("اختر نسخة ديسكورد التي تريد تثبيت Vencord عليها"))'),
    @('"No Discord installs found. You first need to install Discord."', 'ar("لم يتم العثور على أي نسخة ديسكورد. ثبّت ديسكورد أولاً.")'),
    @('g.RadioButton("Custom Install Location",', 'g.RadioButton(ar("اختيار موقع تثبيت مخصص"),'),
    @('.Hint("The custom location")', '.Hint(ar("موقع التثبيت المخصص"))'),
    @('g.Button("Install")', 'g.Button(ar("تثبيت"))'),
    @('Tooltip("Patch the selected Discord Install")', 'Tooltip(ar("تثبيت Vencord على نسخة ديسكورد المحددة"))'),
    @('g.Button("Reinstall / Repair")', 'g.Button(ar("إعادة التثبيت / الإصلاح"))'),
    @('Tooltip("Reinstall & Update Vencord")', 'Tooltip(ar("إعادة تثبيت Vencord وتحديثه"))'),
    @('g.Button("Uninstall")', 'g.Button(ar("إزالة التثبيت"))'),
    @('Tooltip("Unpatch the selected Discord Install")', 'Tooltip(ar("إزالة Vencord من نسخة ديسكورد المحددة"))'),
    @('g.Button("Open Directory")', 'g.Button(ar("فتح المجلد"))'),
    @('g.Button("Take me there!")', 'g.Button(ar("افتح الموقع"))'),
    @('g.Button("Accept")', 'g.Button(ar("موافق"))'),
    @('g.Button("Cancel")', 'g.Button(ar("إلغاء"))'),
    @('g.Button("Ok")', 'g.Button(ar("حسنًا"))'),
    @('g.Button("Update Now")', 'g.Button(ar("تحديث الآن"))'),
    @('g.Button("Later")', 'g.Button(ar("لاحقًا"))'),
    @('"Your Installer is outdated!"', 'ar("إصدار المثبّت لديك قديم!")'),
    @('"Oh No :("', 'ar("حدث خطأ")'),
    @('"Uh Oh!"', 'ar("حدث خطأ")'),
    @('"Successfully Patched"', 'ar("تم التثبيت بنجاح")'),
    @('"Successfully Unpatched"', 'ar("تمت الإزالة بنجاح")'),
    @('"Hold On!"', 'ar("انتظر قليلاً")'),
    @('"Invalid Location"', 'ar("الموقع غير صالح")'),
    @('"Successfully Installed OpenAsar"', 'ar("تم تثبيت OpenAsar بنجاح")'),
    @('"Successfully Uninstalled OpenAsar"', 'ar("تمت إزالة OpenAsar بنجاح")'),
    @('"Install OpenAsar"', 'ar("تثبيت OpenAsar")'),
    @('"Uninstall OpenAsar"', 'ar("إزالة OpenAsar")'),
    @('"(Un-)Install OpenAsar"', 'ar("تثبيت / إزالة OpenAsar")'),
    @('Tooltip("Manage OpenAsar")', 'Tooltip(ar("إدارة OpenAsar"))'),
    @('"Vencord will be downloaded to: "', 'ar("سيتم تنزيل Vencord إلى: ")'),
    @('"Dev Install: "', 'ar("تثبيت تطويري: ")'),
    @('"Installer Version: "', 'ar("إصدار المثبّت: ")'),
    @('"Local Vencord Version: "', 'ar("إصدار Vencord المحلي: ")'),
    @('"Latest Vencord Version: "', 'ar("أحدث إصدار من Vencord: ")'),
    @('"Not updating Vencord due to being in DevMode"', 'ar("لن يتم تحديث Vencord لأن وضع التطوير مفعّل")'),
    @('"Resolve this error, then restart me!"', 'ar("أصلح هذا الخطأ ثم أعد تشغيل المثبّت")'),
    @('"If Discord is still open, fully close it first.\n"', 'ar("إذا كان ديسكورد مفتوحًا فأغلقه بالكامل أولاً.") + "\n"'),
    @('"Then, start it and verify Vencord installed successfully by looking for its category in Discord Settings"', 'ar("ثم شغّله وتأكد من ظهور قسم Vencord داخل إعدادات ديسكورد.")'),
    @('"If Discord is still open, fully close it first. Then start it again, it should be back to stock!"', 'ar("إذا كان ديسكورد مفتوحًا فأغلقه بالكامل، ثم شغّله مجددًا وسيعود إلى حالته الأصلية.")'),
    @('"The specified location is not a valid Discord install.\nMake sure you select the base folder.\n\nHint: Discord snap is not supported. use flatpak or .deb"', 'ar("الموقع المحدد ليس تثبيتًا صالحًا لديسكورد. اختر المجلد الأساسي لنسخة ديسكورد.")'),
    @('"**Github** and **vencord.dev** are the only official places to get Vencord. Any other site claiming to be us is malicious.\n"', 'ar("GitHub وvencord.dev هما المصدران الرسميان الوحيدان للحصول على Vencord.") + "\n"'),
    @('"If you downloaded from any other source, you should delete / uninstall everything immediately, run a malware scan and change your Discord password."', 'ar("إذا نزّلته من مصدر آخر، فاحذفه وافحص جهازك من البرمجيات الضارة وغيّر كلمة مرور ديسكورد.")'),
    @('"To customise this location, set the environment variable ''VENCORD_USER_DATA_DIR'' and restart me"', 'ar("لتخصيص هذا الموقع، اضبط متغير البيئة VENCORD_USER_DATA_DIR ثم أعد تشغيل المثبّت")')
)

foreach ($replacement in $replacements) {
    Replace-Required $replacement[0] $replacement[1]
}

[IO.File]::WriteAllText($guiPath, $script:source, [Text.UTF8Encoding]::new($false))
