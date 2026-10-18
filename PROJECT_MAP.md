# خريطة مشروع ArabicUI لـ Vencord

آخر مراجعة للحالة وتنظيم التوثيق: **17 أكتوبر 2026**.
تجمع هذه الخريطة البنية وتدفقات العمل والنواقص؛ ويشرح
[توثيق المشروع](ARABICUI_PROJECT.md) تفاصيل التنفيذ والنشر.
توجد بروتوكولات العمل الملزمة في [AGENTS.md](AGENTS.md)، والأدلة التاريخية
في [سجل المراجعات](docs/REVIEW_HISTORY.md). هذه الخريطة مرجع الحالة والنواقص
والإصدارات؛ لا تُكرر حالتها في أدلة أخرى. أُعيدت الفحوص والبناء للمزامنة المحلية
في 17 أكتوبر، ثم نجح بناء المثبتين ونشر الإصدار؛ لم تُجر معاينة داخل Discord.

## [TECH_STACK]

| المكوّن | الحالة المثبتة في ملفات المشروع |
| --- | --- |
| Vencord | إصدار الحزمة المحلي `1.15.11` بعد مزامنة upstream؛ تخصيص للمستودع `2-sa/Vencord` |
| الواجهة والإضافات | TypeScript وReact وCSS، ضمن بنية Vencord الحالية |
| Node.js | المتطلب `>=22`؛ يستخدم بناء الإصدار Node.js 24 |
| مدير الحزم | `pnpm@11.9.0` وفق `package.json` |
| البناء | esbuild؛ النطاق المعلن `^0.28.1` |
| TypeScript | النطاق المعلن `^6.0.3` |
| فحوص المصدر | TypeScript وESLint وStylelint واختبارات `node:test` |
| الإصدارات | GitHub Actions؛ مثبت Windows وDMG موحّد لـ macOS |
| موقع التحميل | HTML وCSS وJavaScript في `website/`، مع إعداد Vercel |

مصدر الجدول: `package.json` وسير الإصدار، بتاريخ المراجعة أعلاه. النطاق المعلن
ليس النسخة المحلولة؛ مرجعها `pnpm-lock.yaml`. لم يُبحث عن أحدث إصدارات الحزم
في تحديث التوثيق هذا، ولم تُرقّ تبعية. اتبع بروتوكول التبعيات في `AGENTS.md`.

## [SYSTEM_FLOW]

### التعريب

تشغيل ArabicUI ← تحميل القاموس والأنماط ← جمع نصوص الواجهة غير المستثناة
← معالجة دفعات عبر `requestAnimationFrame` ← مراقبة التغييرات ← استعادة
النصوص التي لم يغيّرها التطبيق خارجيًا عند الإيقاف.

معيار النجاح: تُترجم الواجهة دون رسائل المستخدم أو المحررات؛ يحمي الإيقاف
والنقل والحذف سلامة الاستعادة. حد العمل 200 خطوة وهدف 4 مللي ثانية للإطار،
ومخبأ حتى 1024 مدخلًا بطول لا يتجاوز 512 محرفًا للمدخل المخزن. هذه حدود
تنفيذ وليست قياسات FPS أو ذاكرة فعلية. افحصها باختبارات ArabicUI ومعاينة Discord.

### اتجاه الواجهة

تشغيل RTL ← تحميل التنسيق وحفظ الاتجاه الأصلي ← تطبيق RTL والاستثناءات
← تفضيل فتح القوائم الفرعية يسارًا مع معالجة الحواف الأصلية ← استعادة الاتجاه
عند الإيقاف إن لم تغيّره جهة أخرى.

معيار النجاح: تبقى الواجهة RTL، والبروفايل LTR، وإجراءات الحساب RTL، وتظهر
علامات الأشرطة منفصلة والمؤشر عند قيمته. لا تحل اختبارات دورة التشغيل محل
معاينة القوائم والبطاقات والأشرطة في النسخة المثبتة.

### الإصدار

تغيير معتمد ← فحوص مناسبة و`pnpm test` ← رفع مأذون إلى `main`
← بناء Windows وmacOS ← التحقق من الملفات الستة ← نشر GitHub Release
← تحديث النسخة المثبتة وإعادة تشغيل Discord ← تحقق بصري.

معيار النجاح: تطابق ملفات الإصدار الكوميت المطلوب، وتنجح مهام المنصتين والنشر.
يبقى تحقق العرض خطوة مستقلة. لا تبدأ رفعًا أو تثبيتًا لمجرد وجوده في التدفق.

## [ARCHITECTURE]

| المسار | المسؤولية |
| --- | --- |
| `src/plugins/arabicDiscord/index.tsx` | دورة التعريب ومراقبة الواجهة والأنماط والاستعادة |
| `src/plugins/arabicDiscord/ar.json` | قاموس التعريب |
| `src/plugins/rtl/index.ts` و`style.css` | دورة RTL وترقيع موضع القوائم واستثناءات التنسيق |
| `src/components/settings/AddonCard.css` | عرض بطاقات الإضافات ووصفها ذي السطرين |
| `src/api/` و`src/utils/` | واجهات Vencord والأدوات المشتركة الموجودة؛ أعد استخدامها قبل إضافة تجريد |
| `src/utils/Logger.ts` | تشخيص بمستويات عبر console؛ ليس مسجلًا غير متزامن |
| `src/utils/arabicUiDefaults.ts` | ترحيل تفعيل الإضافات المحددة مرة واحدة ثم احترام اختيار المستخدم |
| `scripts/arabicui/` | فحوص القاموس والصياغة وسلوك التعريب والترحيل |
| `scripts/rtl/` | اختبارات دورة RTL وموضع القوائم |
| `scripts/hideDms/` و`scripts/forkPolicy/` | فحوص إخفاء الخاص وحماية تخصيصات النسخة |
| `.github/workflows/arabicui-release.yml` | بناء المثبتات ونشر الملفات |
| `.github/workflows/sync-upstream.yml` | دمج upstream واختباره قبل الرفع وتشغيل الإصدار |
| `website/` | موقع التحميل، مستقل عن تشغيل الإضافات |

تتبع الإضافات بنية الميزة الحالية. قواعد التجريد والتسجيل والتعديل في `AGENTS.md`.

## [VERIFICATION & MILESTONES]

| المرحلة | الهدف القابل للتحقق | الدليل والحالة |
| --- | --- | --- |
| اعتماد البروتوكولات | قواعد قابلة للتطبيق وخريطة مرتبطة بالمرجع | التوثيق موحّد محليًا؛ تعديلاته السابقة محفوظة بعد المزامنة |
| سلامة القاموس | مفاتيح فريدة وقيم صالحة | نجح `check-translations.mjs` في 17 أكتوبر: 3286 مفتاحًا |
| سلوك التعريب وRTL وحماية النسخة | نجاح حالات التشغيل والاستعادة وحماية المحتوى والتخصيصات | نجحت 68 حالة بعد كل كوميت مستورد، ثم نجح `pnpm test` كاملًا في 17 أكتوبر |
| المزامنة المحلية | استيراد كوميتات upstream بالتتابع دون إزالة تخصيصاتنا | اكتملت 29 عملية دمج حتى `32c90633`؛ صفر كوميتات ناقصة من المرجع المجلوب |
| البناء المحلي | نجاح البناء وفحوص المصدر | نجح البناء المكتبي وTypeScript وESLint وStylelint وقائمة الإضافات، وبناء المتصفح المستقل |
| البناء والنشر | نجاح المنصتين ومهمة النشر ووجود الأصول | الإصدار `arabicui-b87e47d`؛ نجحت مهام المنصتين والنشر وتحققت الأصول الستة في 17 أكتوبر |
| العرض المثبت | معاينة الشاشات المتأثرة بعد التحديث وإعادة التشغيل | جزئي؛ تفاصيله في النواقص أدناه |

آخر دمج محلي: `80a4c9161fffe2b74da5f15d480e66f35bbc05c9` على `main`، ويضم
upstream حتى `32c90633ce6a95d7e56c95479efbb431bacf1eac`. رُفعت المزامنة
والتوثيق ووصف الإصدار في `21d0f632` إلى `origin/main` في 17 أكتوبر.
أعاد المستخدم تفعيل Workflows من صفحة Actions الخاصة بالـ fork، فزال رفض
التشغيل HTTP 422. بدأ [التشغيل 38989767440](https://github.com/2-sa/Vencord/actions/runs/38989767440)
على `b87e47d1`؛ نجحت مهام Windows وmacOS والنشر، وصدر التحديث.
تفاصيل كل كوميت وحل التعارضات في قسم مزامنة 17 أكتوبر في سجل المراجعات.

آخر إصدار منشور متحقق منه مبني على `b87e47d14324039f9304e5f9139b3229fcd5535e`:
نجح [التشغيل 38989767440](https://github.com/2-sa/Vencord/actions/runs/38989767440)
ونُشر [الإصدار arabicui-b87e47d](https://github.com/2-sa/Vencord/releases/tag/arabicui-b87e47d)
في 17 أكتوبر 2026، الساعة 04:18 بتوقيت الرياض. أكّد GitHub أنه أحدث إصدار،
منشور لا مسودة أو إصدار تجريبي، وله ستة أصول مرفوعة وغير فارغة. يحتوي مثبت
Windows وDMG موحّدًا لـ macOS وأربعة ملفات Vencord. لا يثبت النشر تثبيته عند المستخدم.

## [ORPHANS & PENDING]

هذه بنود معروفة من التقارير، وليست تفويضًا لتنفيذ أعمال إضافية. لا تُحذف قبل
ظهور دليل إتمامها. لا توجد في هذه المهمة إضافات برمجية جديدة تحتاج ربطًا.

| البند | الدليل المتاح | التحقق التالي |
| --- | --- | --- |
| مدد خامل وعدم الإزعاج | ترقيع واختبارات؛ لا معاينة نهائية مثبتة | تحميل الإصدار وإعادة التشغيل وفحص الجهة والحواف والتعطيل |
| صف تبديل الحسابات وأزرار الكويستات | قواعد تنسيق؛ المعاينة النهائية غير مكتملة | فحص ترتيب الهوية والصح والأزرار دون تغيير الحساب أو قبول كويست |
| السطر الثاني لوصف الإضافات | استبدال الارتفاع الثابت بـ `2lh` وبناء ناجح | فحص السطرين بالعربية في النسخة المثبتة |
| أشرطة المسافة والتكبير | نجحت معاينة شريط حجم الخط ذي المكوّن المشترك | معاينة الشريطين مباشرة والتحقق من القيم والمؤشر |
| بطاقة الشخص وأجزاء التاريخ | معاينة يسار الصورة؛ لا تغطية لكل الأحجام، والتاريخ يحتاج مراجعة | اختبار أحجام مختلفة وترتيب التاريخ العربي |
| صفوف قوائم الرسائل والحقول التقنية | معاينات جزئية؛ آخر القواعد لم تُفحص كاملة | معاينة المحاذاة والقيم المختلطة في النسخة المثبتة |
| تشغيل تغييرات upstream داخل Discord | نجحت الفحوص والبناء المحلي حتى `32c90633`؛ لم تُثبت المزامنة | معاينة التنبيهات وشريط العنوان وGIF وبقية الشاشات المتأثرة بعد تثبيت مأذون |
| موقع التحميل | ملفات محلية وإعداد Vercel | التحقق من النشر الحي والمحتوى وروابط أحدث إصدار |

تفاصيل أدلة العرض وفحوص الأداء في [سجل المراجعات](docs/REVIEW_HISTORY.md).
حُفظت مراجعة الاتصالات فيه بتاريخها؛ ليست فحصًا للشبكة الحالية ولا تفويضًا
بتنفيذ خطة الإزالة التاريخية. لا توجد مراجعة شاملة حديثة
لإهمال التبعيات؛ لا يُفترض خلوها منه دون فحص رسمي مرتبط بمهمة التبعيات.

## Artifact storage policy — 2026-10-19

- `ARTIFACT-01` is implemented in `.github/workflows/artifact-maintenance.yml` and `.github/scripts/artifact-policy.cjs`; behavioral checks are in `.github/scripts/artifact-policy.test.cjs`.
- Direct artifact uploads retain files for one day. Policy checks also reject future upload steps that omit this limit. Where present, Flatpak's implicit upload is replaced by an explicit one-day upload.
- Every six hours, maintenance deletes expired (>24h) or superseded artifacts from completed runs only. Commit-suffixed names are grouped by platform; current runs are protected and checked again immediately before deletion. Manual dispatch defaults to preview-only. Maintenance never modifies release assets or caches.
- Distribution builds run on explicit manual/release triggers where separated from verification. Existing tests remain automatic; site/container deployment and platform-managed delivery retain their existing purpose. Publishing requires its existing release trigger or an explicit manual publishing choice.
- Verification: policy behavior and workflow checks run on GitHub-hosted Ubuntu for this source commit; see the **Artifact storage policy** Actions run attached to the commit for its actual result. No application tests, builds, downloads, or installations were run on the user's device. Application packaging/updater behavior was not exercised by a policy-only check.
- Pending: GitHub may take 6–12 hours to recalculate storage after deletions. Existing artifacts do not receive shorter expiry retroactively; scheduled maintenance applies the same policy to them. Quota recovery and a future authorized release/upload must be observed separately. Scheduled workflows can be delayed or disabled by GitHub after inactivity; one-day upload retention remains the primary limit.

