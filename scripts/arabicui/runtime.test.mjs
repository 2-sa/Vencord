import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

// Bundle the production implementation; stub Discord imports, not translation logic.
const result = await build({
    stdin: {
        contents: readFileSync(new URL("../../src/plugins/arabicDiscord/index.tsx", import.meta.url), "utf8")
            + "\nexport { translateTreeSteps, forgetTreeSteps, restoreTranslations, handleMutations, flushMutations, translatedTextNodes, translatedAttributes, pendingNodes, pendingRoots, traversalJobs, translationCache };",
        resolveDir: new URL("../../src/plugins/arabicDiscord", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"),
        loader: "tsx"
    },
    bundle: true, write: false, format: "cjs", platform: "node",
    plugins: [{
        name: "discord-fixtures",
        setup(builder) {
            builder.onResolve({ filter: /^@/ }, args => ({ path: args.path, namespace: "discord" }));
            builder.onLoad({ filter: /.*/, namespace: "discord" }, () => ({
                contents: "export default x=>x; export const Link=null, Devs={TwoSa:{}}, Forms={}; export const MessageStore={getMessage:(_,id)=>globalThis.testMessages.get(id)}, SelectedChannelStore={getChannelId:()=> 'channel'};"
            }));
        }
    }]
});

function fixture(now = () => 0) {
    class TestNode {
        static TEXT_NODE = 3;
        parentNode = null;
        children = [];
        connected = false;
        get isConnected() { return this.connected || Boolean(this.parentNode?.isConnected); }
        get parentElement() { return this.parentNode instanceof TestElement ? this.parentNode : null; }
        get childNodes() { visits++; return this.children; }
        append(node) { node.parentNode = this; this.children.push(node); return node; }
    }
    class TestElement extends TestNode {
        excluded = false;
        attrs = new Map();
        matches(selector) {
            if (selector.includes("message-content")) return this.attrs.get("id")?.startsWith("message-content-") ?? false;
            if (selector.includes("[contenteditable]") && this.attrs.has("contenteditable")) return this.attrs.get("contenteditable") !== "false";
            return this.excluded;
        }
        closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); }
        getAttribute(key) { return this.attrs.get(key) ?? null; }
        setAttribute(key, value) { this.attrs.set(key, value); }
    }
    class TestText extends TestNode {
        nodeType = 3;
        constructor(data) { super(); this.data = data; }
    }
    let frames = 0;
    let visits = 0;
    const document = {};
    const testMessages = new Map();
    const context = {
        testMessages,
        performance: { now },
        module: { exports: {} }, document,
        Node: TestNode, Element: TestElement, Text: TestText,
        MutationObserver: class { observe() {} disconnect() {} },
        requestAnimationFrame: () => ++frames, cancelAnimationFrame: () => {}
    };
    vm.runInNewContext(result.outputFiles[0].text, context);
    context.module.exports.translateTree = root => { for (const _ of context.module.exports.translateTreeSteps(root)) {} };
    context.module.exports.forgetTree = root => { for (const _ of context.module.exports.forgetTreeSteps(root)) {} };
    const root = new TestElement();
    root.connected = true;
    document.body = root;
    return { api: context.module.exports, root, TestElement, TestText, testMessages, frames: () => frames, visits: () => visits };
}

test("translates standalone inserted text and restores original whitespace", () => {
    const f = fixture(), text = f.root.append(new f.TestText(" Open "));
    f.api.translateTree(text);
    assert.equal(text.data, " فتح ");
    f.api.restoreTranslations();
    assert.equal(text.data, " Open ");
});

test("translates split login instructions without changing the nested layout", () => {
    const f = fixture();
    const before = f.root.append(new f.TestText("Scan this with the "));
    const bold = f.root.append(new f.TestElement());
    const app = bold.append(new f.TestText("Discord mobile app"));
    const after = f.root.append(new f.TestText(" to log in instantly."));
    f.api.translateTree(f.root);
    assert.equal(before.data, "امسح هذا الرمز باستخدام ");
    assert.equal(app.data, "تطبيق ديسكورد على الهاتف");
    assert.equal(after.data, " لتسجيل الدخول فورًا.");
    assert.equal(app.parentNode, bold);
});

test("translates clip hint around unchanged keyboard keys", () => {
    const f = fixture();
    const before = f.root.append(new f.TestText("Press "));
    const keys = f.root.append(new f.TestElement());
    keys.excluded = true;
    const shortcut = keys.append(new f.TestText("ALT C"));
    const after = f.root.append(new f.TestText(" to capture a clip while gaming."));
    f.api.translateTree(f.root);
    assert.equal(before.data, "اضغط ");
    assert.equal(shortcut.data, "ALT C");
    assert.equal(after.data, " لالتقاط مقطع أثناء اللعب.");
});

test("translates passkey login and profile prompts from the shipped dictionary", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["Or sign in with a passkey", "أو سجّل الدخول بمفتاح مرور"],
        ["What video game item would you be?", "لو كنت عنصرًا في لعبة فيديو، ماذا ستكون؟"],
        ["Your vibe in five words", "صف شخصيتك بخمس كلمات"]
    ]) {
        const node = f.root.append(new f.TestText(label));
        f.api.translateTree(node);
        assert.equal(node.data, expected);
    }
});
test("translates anniversary counts and the Nitro trial offer", () => {
    const f = fixture();
    for (const count of [1, 2, 12]) {
        const node = f.root.append(new f.TestText(`Friend Anniversaries — ${count}`));
        f.api.translateTree(node);
        assert.equal(node.data, `ذكريات الصداقة — ${count}`);
    }
    const offer = f.root.append(new f.TestText("Send three friends a 2-week Nitro trial and become the MVP of the group chat."));
    f.api.translateTree(offer);
    assert.equal(offer.data, "أرسل إلى ثلاثة أصدقاء تجربة نيترو مدتها أسبوعان، وتألّق في المحادثة الجماعية.");
});

test("translates game activity counts around the original bold game name", () => {
    for (const count of [1, 2, 5]) {
        const f = fixture();
        const prefix = `You may also be sharing activity from ${count} ${count === 1 ? "game" : "games"} you play, including`;
        const before = f.root.append(new f.TestText(prefix + " "));
        const bold = f.root.append(new f.TestElement());
        const game = bold.append(new f.TestText("VALORANT"));
        const after = f.root.append(new f.TestText(". Restrict sharing on a game-by-game basis."));
        f.api.translateTree(f.root);
        assert.equal(before.data, `قد تشارك نشاطك من الألعاب التي تلعبها (العدد: ${count})، ومنها `);
        assert.equal(game.data, "VALORANT");
        assert.equal(game.parentNode, bold);
        assert.equal(after.data, ". يمكنك تقييد المشاركة لكل لعبة على حدة.");
        const whole = f.root.append(new f.TestText(prefix + " VALORANT. Restrict sharing on a game-by-game basis."));
        f.api.translateTree(whole);
        assert.equal(whole.data, before.data + game.data + after.data);
    }
});

test("translates last-played durations as whole labels and split emphasized text", () => {
    const f = fixture();
    for (const [duration, expected] of [
        ["a day ago", "قبل يوم"], ["2 days ago", "قبل يومين"],
        ["9 days ago", "قبل 9 أيام"], ["12 days ago", "قبل 12 يومًا"],
        ["an hour ago", "قبل ساعة"], ["3 hours ago", "قبل 3 ساعات"],
        ["a minute ago", "قبل دقيقة"], ["2 weeks ago", "قبل أسبوعين"],
        ["3 months ago", "قبل 3 أشهر"], ["a year ago", "قبل سنة"]
    ]) {
        const whole = f.root.append(new f.TestText(`Last played ${duration}`));
        const label = f.root.append(new f.TestText("Last played "));
        const bold = f.root.append(new f.TestElement());
        const time = bold.append(new f.TestText(duration));
        f.api.translateTree(f.root);
        assert.equal(whole.data, `آخر لعب ${expected}`);
        assert.equal(label.data + time.data, whole.data);
        assert.equal(time.parentNode, bold);
    }
});

test("translates activity privacy description while retaining the game name", () => {
    const f = fixture();
    const game = f.root.append(new f.TestText("VALORANT"));
    const description = f.root.append(new f.TestText("Control who sees activity information from games and connected apps I use."));
    f.api.translateTree(f.root);
    assert.equal(game.data, "VALORANT");
    assert.equal(description.data, "تحكّم في من يمكنه رؤية معلومات نشاطك في الألعاب والتطبيقات المرتبطة التي تستخدمها.");
});

test("translates discovery descriptions, uppercase headings and student hub notices", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["Connect with students, teachers, and learning centers.", "تواصل مع الطلاب والمعلمين ومراكز التعليم."],
        ["Connect with developers, aficionados, and technology brands.", "تواصل مع المطورين وهواة التقنية وشركاتها."],
        ["Connect with your favorite creators and their fans.", "تواصل مع صنّاع المحتوى المفضلين لديك وجمهورهم."],
        ["Get updates, connect with artists, and chat with other music fans.", "تابع آخر الأخبار، وتواصل مع الفنانين، ودردش مع محبي الموسيقى."],
        ["Get updates, connect with developers, and chat with other players.", "تابع آخر الأخبار، وتواصل مع المطورين، ودردش مع لاعبين آخرين."],
        ["FIND YOUR COMMUNITY ON DISCORD", "اعثر على مجتمعك في ديسكورد"],
        ["JOIN THE STUDENT HUB FOR YOUR SCHOOL", "انضم إلى مركز طلاب مدرستك"],
        ["Meet classmates from your school, discover communities, and share your servers, all in one place.", "تعرّف على زملاء مدرستك، واكتشف مجتمعات، وشارك سيرفراتك، كل ذلك في مكان واحد."],
        ["Hubs are not affiliated with or managed by schools.", "مراكز الطلاب لا تتبع المدارس ولا تديرها المدارس."],
        ["Servers listed in the school’s Student Hub are run by students.", "يدير الطلاب السيرفرات المدرجة في مركز طلاب مدرستهم."],
        ["Servers listed in the school's Student Hub are run by students.", "يدير الطلاب السيرفرات المدرجة في مركز طلاب مدرستهم."],
        ["Users do not need to be a member of a Student Hub to be invited to join a server listed there.", "لا تُشترط عضوية مركز الطلاب لتلقي دعوة إلى سيرفر مدرج فيه."]
    ]) {
        const text = f.root.append(new f.TestText(label));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("translates age and account notices around links and restores the original text", () => {
    const f = fixture();
    const labels = [
        ["Age groups determine if you can access content and settings meant for adults. You're in the adult age group (18+), so nothing changes for you.", "تحدد الفئات العمرية إمكانية وصولك إلى المحتوى والإعدادات المخصصة للبالغين. أنت ضمن الفئة العمرية للبالغين (18+)، لذلك لن يتغير شيء."],
        ["Learn more on our blog", "تعرّف على المزيد في مدونتنا"],
        ["You're in the adult age group (18+) and have access to", "أنت ضمن الفئة العمرية للبالغين (18+) ويمكنك الوصول إلى"],
        ["age-restricted content, spaces, and settings", "المحتوى والمساحات والإعدادات المقيّدة عمريًا"],
        ["Thank you for upholding Discord's", "شكرًا لالتزامك بقواعد ديسكورد:"],
        [". If you have a violation, it will appear here.", ". إذا ارتكبت مخالفة، فستظهر هنا."],
        ["All good", "سليم"],
        ["Age groups determine if you can access content and settings meant for adults. You’re in the adult age group (18+), so nothing changes for you.", "تحدد الفئات العمرية إمكانية وصولك إلى المحتوى والإعدادات المخصصة للبالغين. أنت ضمن الفئة العمرية للبالغين (18+)، لذلك لن يتغير شيء."],
        ["You’re in the adult age group (18+) and have access to", "أنت ضمن الفئة العمرية للبالغين (18+) ويمكنك الوصول إلى"],
        ["Thank you for upholding Discord’s", "شكرًا لالتزامك بقواعد ديسكورد:"],
        ["age-restricted content, spaces, and settings.", "المحتوى والمساحات والإعدادات المقيّدة عمريًا."],
        ["Age groups determine if you can access content and settings meant for adults. You're in the adult age group (18+), so nothing changes for you. Learn more on our blog", "تحدد الفئات العمرية إمكانية وصولك إلى المحتوى والإعدادات المخصصة للبالغين. أنت ضمن الفئة العمرية للبالغين (18+)، لذلك لن يتغير شيء. تعرّف على المزيد في مدونتنا"],
        ["You're in the adult age group (18+) and have access to age-restricted content, spaces, and settings.", "أنت ضمن الفئة العمرية للبالغين (18+) ويمكنك الوصول إلى المحتوى والمساحات والإعدادات المقيّدة عمريًا."],
        ["Thank you for upholding Discord's Terms of Service and Community Guidelines. If you have a violation, it will appear here.", "شكرًا لالتزامك بشروط خدمة ديسكورد وإرشادات المجتمع. إذا ارتكبت مخالفة، فستظهر هنا."],
        ["Age groups determine if you can access content and settings meant for adults. You’re in the adult age group (18+), so nothing changes for you. Learn more on our blog", "تحدد الفئات العمرية إمكانية وصولك إلى المحتوى والإعدادات المخصصة للبالغين. أنت ضمن الفئة العمرية للبالغين (18+)، لذلك لن يتغير شيء. تعرّف على المزيد في مدونتنا"],
        ["You’re in the adult age group (18+) and have access to age-restricted content, spaces, and settings.", "أنت ضمن الفئة العمرية للبالغين (18+) ويمكنك الوصول إلى المحتوى والمساحات والإعدادات المقيّدة عمريًا."],
        ["Thank you for upholding Discord’s Terms of Service and Community Guidelines. If you have a violation, it will appear here.", "شكرًا لالتزامك بشروط خدمة ديسكورد وإرشادات المجتمع. إذا ارتكبت مخالفة، فستظهر هنا."],
        ["Terms of Service", "شروط الخدمة"],
        ["Community Guidelines", "إرشادات المجتمع"]
    ];
    const nodes = labels.map(([label]) => {
        const link = f.root.append(new f.TestElement());
        return [link.append(new f.TestText(label)), link];
    });
    f.api.translateTree(f.root);
    nodes.forEach(([text, parent], i) => {
        assert.equal(text.data, labels[i][1]);
        assert.equal(text.parentNode, parent);
    });
    f.api.restoreTranslations();
    nodes.forEach(([text], i) => assert.equal(text.data, labels[i][0]));
});

test("translates activity privacy labels and all device count categories", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["What Activity I Share", "النشاط الذي أشاركه"],
        ["Share when I start streaming", "المشاركة عند بدء البث"],
        ["Allow members that you interact with the most to get a notification when you start streaming in small servers.", "إشعار الأعضاء الذين تتفاعل معهم كثيرًا عند بدء بثك في السيرفرات الصغيرة."],
        ["Looking for per-server controls? Navigate to the server, select the dropdown menu next to the server name, then select", "لضبط الخيارات لكل سيرفر، افتح السيرفر ثم القائمة بجوار اسمه، واختر"],
        [". From there, you can toggle on or off Activity Joining for just that server.", ". يمكنك بعدها السماح بالانضمام إلى نشاطك أو منعه في ذلك السيرفر وحده."],
        ["Looking for per-server controls? Navigate to the server, select the dropdown menu next to the server name, then select Privacy Settings. From there, you can toggle on or off Activity Joining for just that server.", "لضبط الخيارات لكل سيرفر، افتح السيرفر ثم القائمة بجوار اسمه، واختر إعدادات الخصوصية. يمكنك بعدها السماح بالانضمام إلى نشاطك أو منعه في ذلك السيرفر وحده."],
        ["Control how your game and app activity is shared—what's visible and who sees it. You're sharing activity with", "تحكّم في مشاركة نشاط ألعابك وتطبيقاتك، وما يظهر منه ومن يراه. تشارك نشاطك مع"],
        ["Control how your game and app activity is shared—what’s visible and who sees it. You’re sharing activity with", "تحكّم في مشاركة نشاط ألعابك وتطبيقاتك، وما يظهر منه ومن يراه. تشارك نشاطك مع"],
        ["0 devices", "0 جهاز"], ["1 device", "جهاز واحد"], ["2 devices", "جهازان"],
        ["8 devices", "8 أجهزة"], ["11 devices", "11 جهازًا"], ["100 devices", "100 جهاز"],
        ["Fahad's server and 1 other server.", "Fahad's server وسيرفر آخر."],
        ["Fahad's server and 2 other servers.", "Fahad's server وسيرفرين آخرين."],
        ["Fahad's server and 3 other servers.", "Fahad's server و3 سيرفرات أخرى."],
        ["Fahad's server and 11 other servers.", "Fahad's server و11 سيرفرًا آخر."],
        ["and 2 other servers.", "وسيرفرين آخرين."],
        ["Control how your game and app activity is shared—what's visible and who sees it. You're sharing activity with Fahad's server and 2 other servers.", "تحكّم في مشاركة نشاط ألعابك وتطبيقاتك، وما يظهر منه ومن يراه. تشارك نشاطك مع Fahad's server وسيرفرين آخرين."]
    ]) {
        const text = f.root.append(new f.TestText(label));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("translates phone verification, profile prompts and last-used times", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["No Connections", "لا توجد ارتباطات"],
        ["Enter a phone number", "أدخل رقم هاتف"],
        ["You will receive a text message with a verification code.", "ستصلك رسالة نصية برمز تحقق."],
        ["Country Code", "رمز الدولة"],
        ["United States", "الولايات المتحدة"],
        ["Your phone number can be used to verify one Discord account at a time and is only used for verification and login.", "يمكن استخدام رقم هاتفك للتحقق من حساب ديسكورد واحد فقط في كل مرة، ويُستخدم للتحقق وتسجيل الدخول فقط."],
        ["Your phone number can be used to verify", "يمكن استخدام رقم هاتفك للتحقق من"],
        ["one Discord account", "حساب ديسكورد واحد فقط"],
        ["at a time and is only used for verification and login.", "في كل مرة، ويُستخدم للتحقق وتسجيل الدخول فقط."],
        ["Send", "إرسال"],
        ["Favorite anime lately?", "ما أنميك المفضل مؤخرًا؟"],
        ["Tell us a bit about you", "عرّفنا بنفسك"],
        ["Banner Color", "لون الغلاف"],
        ["Level up your look, only with", "حسّن مظهرك مع"],
        ["Level up your look, only with Nitro", "حسّن مظهرك مع نيترو"],
        ["Preview Nitro", "معاينة نيترو"],
        ["Last used", "استُخدم آخر مرة"],
        ["NO CONNECTIONS", "لا توجد ارتباطات"],
        ["Last used a minute ago", "استُخدم آخر مرة قبل دقيقة"],
        ["Last used 2 hours ago", "استُخدم آخر مرة قبل ساعتين"],
        ["Last used 3 days ago", "استُخدم آخر مرة قبل 3 أيام"],
        ["Last used 11 months ago", "استُخدم آخر مرة قبل 11 شهرًا"]
    ]) {
        const text = f.root.append(new f.TestText(label));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("translates app permission descriptions and delivery notice labels", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["Read Messages", "قراءة الرسائل"],
        ["Can access messages in this server and read their contents.", "يمكنه الوصول إلى رسائل هذا السيرفر وقراءة محتواها."],
        ["Can see who's in the server and their roles, nicknames, and permission changes.", "يمكنه معرفة أعضاء السيرفر ورتبهم وألقابهم والتغييرات في صلاحياتهم."],
        ["Can see who’s in the server and their roles, nicknames, and permission changes.", "يمكنه معرفة أعضاء السيرفر ورتبهم وألقابهم والتغييرات في صلاحياتهم."],
        ["All apps can access a set of baseline data. Please visit the Help Center to learn more.", "يمكن لجميع التطبيقات الوصول إلى مجموعة من البيانات الأساسية. لمعرفة المزيد، زر مركز المساعدة."],
        ["All apps can access a set of baseline data. Please visit the", "يمكن لجميع التطبيقات الوصول إلى مجموعة من البيانات الأساسية. زر"],
        ["to learn more.", "للمزيد من المعلومات."],
        ["Your message could not be delivered.", "تعذّر إرسال رسالتك."],
        ["You can see the full list of reasons here:", "يمكنك الاطلاع على جميع الأسباب هنا:"],
        ["Only you can see this", "لا تظهر هذه الرسالة إلا لك"],
        ["Dismiss message", "إخفاء الرسالة"],
    ]) {
        const text = f.root.append(new f.TestText(label));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("only local Clyde delivery notices bypass the message exclusion", () => {
    const f = fixture();
    for (const [id, local, username, content, expected] of [
        ["local", true, "Clyde", "Your message could not be delivered.", "تعذّر إرسال رسالتك."],
        ["user", false, "Clyde", "Your message could not be delivered.", "Your message could not be delivered."],
        ["bot", true, "Other", "Your message could not be delivered.", "Your message could not be delivered."],
        ["other", true, "Clyde", "Read Messages", "Read Messages"]
    ]) {
        f.testMessages.set(id, { author: { username, isLocalBot: () => local }, content });
        const container = f.root.append(new f.TestElement());
        container.setAttribute("id", `message-content-${id}`);
        const text = container.append(new f.TestText(content));
        const link = container.append(new f.TestElement());
        const url = link.append(new f.TestText("https://support.discord.com/hc/en-us/articles/360060145013"));
        f.api.translateTree(f.root);
        assert.equal(text.data, expected);
        assert.equal(url.data, "https://support.discord.com/hc/en-us/articles/360060145013");
        assert.equal(url.parentNode, link);
        if (id === "local") {
            const code = container.append(new f.TestElement());
            code.excluded = true;
            const codeText = code.append(new f.TestText("Read Messages"));
            f.api.translateTree(code);
            assert.equal(codeText.data, "Read Messages");
            text.data = "You can see the full list of reasons here:";
            f.api.handleMutations([{ type: "characterData", target: text }]);
            f.api.flushMutations();
            assert.equal(text.data, "يمكنك الاطلاع على جميع الأسباب هنا:");
            text.data = "Your message could not be delivered.\n\nYou can see the full list of reasons here: https://support.discord.com/hc/en-us/articles/360060145013";
            const original = text.data;
            f.api.translateTree(container);
            assert.equal(text.data, "تعذّر إرسال رسالتك. يمكنك الاطلاع على جميع الأسباب هنا: https://support.discord.com/hc/en-us/articles/360060145013");
            f.api.restoreTranslations();
            assert.equal(text.data, original);
        }
    }
});

test("translates message menus and server privacy and notification settings", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["Resend message", "إعادة إرسال الرسالة"],
        ["Share Profile", "مشاركة الملف الشخصي"],
        ["Report Message", "الإبلاغ عن الرسالة"],
        ["Stats for Nerds", "إحصاءات تقنية"],
        ["Privacy settings", "إعدادات الخصوصية"],
        ["Allow DMs from other members in this server", "السماح بالرسائل الخاصة من أعضاء هذا السيرفر"],
        ["Message requests", "طلبات الرسائل"],
        ["Activity joining", "الانضمام إلى النشاط"],
        ["Allow users to join your activity in this server.", "السماح للمستخدمين بالانضمام إلى نشاطك في هذا السيرفر."],
        ["Learn about enhanced safety measures in Community Servers here.", "تعرّف هنا على تدابير الأمان الإضافية في السيرفرات المجتمعية."],
        ["Learn about enhanced safety measures in Community Servers", "تعرّف على تدابير الأمان الإضافية في السيرفرات المجتمعية"],
        ["here", "هنا"],
        ["Muting a server prevents unread indicators and notifications from appearing unless you are mentioned.", "يخفي كتم السيرفر مؤشرات الرسائل غير المقروءة والإشعارات، إلا عند الإشارة إليك."],
        ["Only", "فقط"],
        ["@mentions", "المنشنات"],
        ["Community Activity Alerts", "تنبيهات نشاط المجتمع"],
        ["Receive notifications for DM or join activity that exceeds usual numbers for your server.", "تلقي إشعارات عند ارتفاع نشاط الرسائل الخاصة أو الانضمام فوق المعدّل المعتاد في سيرفرك."],
        ["In-app alerts", "تنبيهات داخل التطبيق"],
        ["A global bar that appears across the top of Discord when you are using it, regardless of what channel or server you're in at the time.", "شريط يظهر أعلى ديسكورد أثناء استخدامه، أيًا كانت القناة أو السيرفر الذي تتصفحه."],
        ["Push notifications", "إشعارات فورية"],
        ["Sends to mobile or desktop devices when you are not using Discord.", "تُرسل إلى الهاتف أو الكمبيوتر عندما لا تستخدم ديسكورد."],
        ["Suppress", "كتم"],
        ["Suppress Highlights", "كتم التنبيهات المهمة"],
        ["Highlights provide occasional updates when your friends are chatting in busy servers, and more.", "تعرض التنبيهات المهمة تحديثات من حين لآخر، منها محادثات أصدقائك في السيرفرات النشطة."],
        ["Learn more about Highlights", "معرفة المزيد عن التنبيهات المهمة"],
        ["Mute New Events", "كتم الفعاليات الجديدة"],
        ["Mobile Push Notifications", "الإشعارات الفورية للهاتف"],
        ["Select a channel or category...", "اختر قناة أو فئة..."],
        ["Add a channel to override its default notification settings", "أضف قناة لتخصيص إعدادات إشعاراتها الافتراضية"],
        ["CHANNEL OR CATEGORY", "القناة أو الفئة"],
        ["Channel or Category", "القناة أو الفئة"],
        ["This is the channel we send system event messages to.", "تُرسل رسائل أحداث النظام إلى هذه القناة."],
        ["TEXT CHANNELS", "القنوات النصية"],
        ["Text Channels", "القنوات النصية"],
        ["Shows a feed of activity from games and connected apps in this server.", "يعرض موجز نشاط الألعاب والتطبيقات المرتبطة في هذا السيرفر."],
        ["This will determine whether members who have not explicitly set their notification settings receive a notification for every message sent in this server or not.", "يحدد ما إذا كان الأعضاء الذين لم يخصّصوا إعدادات إشعاراتهم يتلقون إشعارًا بكل رسالة تُرسل في هذا السيرفر."],
        ["We highly recommend setting this to only @mentions for a Community Server.", "نوصي باختيار المنشنات فقط في السيرفرات المجتمعية."],
        ["We highly recommend setting this to only", "نوصي باختيار"],
        ["for a Community Server.", "فقط في السيرفرات المجتمعية."],
        ["A global bar that appears across the top of Discord when you are using it, regardless of what channel or server you’re in at the time.", "شريط يظهر أعلى ديسكورد أثناء استخدامه، أيًا كانت القناة أو السيرفر الذي تتصفحه."],
        ["Mute Fahad's server", "كتم Fahad's server"],
        ["Privacy Settings — Fahad's server", "إعدادات الخصوصية — Fahad's server"],
        ["Only @mentions", "المنشنات فقط"],
        ["Suppress @everyone and @here", "كتم @everyone و@here"]
    ]) {
        const text = f.root.append(new f.TestText(label));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("translates server boost, sound, member, invite and safety settings", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["Enjoy more stickers and other perks by boosting your server to Level 1. Each Level unlocks more sticker slots and new benefits for everyone.", "ادعم سيرفرك ليرتقي إلى المستوى 1 وتحصل على مزيد من الستيكرات والمزايا. يفتح كل مستوى خانات إضافية للستيكرات ومزايا جديدة للجميع."],
        ["Boost Server", "دعم السيرفر ببوستات"],
        ["Learn More", "معرفة المزيد"],
        ["No Server Boost", "لا توجد بوستات للسيرفر"],
        ["No one has bestowed Boosts to this server yet. See if any members would kindly bless your server for server-wide Boost Perks!", "لم يدعم أحد هذا السيرفر ببوستات بعد. ادعُ الأعضاء لدعمه ليفتحوا مزايا البوستات للجميع!"],
        ["NO SOUNDS", "لا توجد أصوات"],
        ["No Sounds", "لا توجد أصوات"],
        ["Get the party started by uploading a sound", "أضف جوًا من المرح برفع صوت"],
        ["Server Members", "أعضاء السيرفر"],
        ["Before searching, we need to index this server. Give us a bit.", "نحتاج إلى فهرسة هذا السيرفر قبل البحث. انتظر قليلًا."],
        ["applies to all server members", "تنطبق على كل أعضاء السيرفر"],
        ["Active invite links", "روابط الدعوة النشطة"],
        ["Inviter", "صاحب الدعوة"],
        ["Invite Code", "رمز الدعوة"],
        ["Uses", "عدد الاستخدامات"],
        ["Members of the server must meet the following criteria before they can send messages in text channels or initiate a direct message conversation. If a member has an assigned role and server onboarding is not enabled, this does not apply.", "يجب أن يستوفي أعضاء السيرفر الشروط التالية قبل إرسال الرسائل في القنوات النصية أو بدء محادثة خاصة. لا ينطبق ذلك على من لديه رتبة محددة إذا لم يكن إعداد الترحيب بالسيرفر مفعّلًا."],
        ["We recommend setting a verification level for a Community Server.", "نوصي بتحديد مستوى تحقق للسيرفرات المجتمعية."],
        ["Choose if server members can share image-based media detected by Discord's sensitive content filters. This setting will apply to channels that are not age-restricted.", "اختر ما إذا كان أعضاء السيرفر يستطيعون مشاركة الصور والوسائط التي ترصدها فلاتر المحتوى الحساس في ديسكورد. ينطبق هذا الإعداد على القنوات غير المقيّدة عمريًا."],
        ["Choose if server members can share image-based media detected by Discord's sensitive content filters.", "اختر ما إذا كان أعضاء السيرفر يستطيعون مشاركة الصور والوسائط التي ترصدها فلاتر المحتوى الحساس في ديسكورد."],
        ["This setting will apply to channels that are not age-restricted.", "ينطبق هذا الإعداد على القنوات غير المقيّدة عمريًا."],
        ["Apply to be in", "اطلب إدراج سيرفرك في"],
        ["Server Discovery", "استكشاف السيرفرات"],
        ["so more people can find your server directly on Discord.", "ليجده مزيد من الناس مباشرة في ديسكورد."],
        ["Access tools like", "استعن بأدوات مثل"],
        ["Server Insights", "إحصاءات السيرفر"],
        ["that can better help you moderate and keep your server engaged.", "لتحسين الإشراف وتنشيط التفاعل في سيرفرك."],
        ["Choose if server members can share image-based media detected by Discord’s sensitive content filters. This setting will apply to channels that are not age-restricted.", "اختر ما إذا كان أعضاء السيرفر يستطيعون مشاركة الصور والوسائط التي ترصدها فلاتر المحتوى الحساس في ديسكورد. ينطبق هذا الإعداد على القنوات غير المقيّدة عمريًا."],
        ["Choose if server members can share image-based media detected by Discord’s sensitive content filters.", "اختر ما إذا كان أعضاء السيرفر يستطيعون مشاركة الصور والوسائط التي ترصدها فلاتر المحتوى الحساس في ديسكورد."],
        ["BETA", "تجريبي"],
        ["ROLES – 2", "الرتب — 2"],
        ["ROLES — 10", "الرتب — 10"]
    ]) {
        const text = f.root.append(new f.TestText(label));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("translates group DM member limits", () => {
    const f = fixture();
    for (const [count, expected] of [
        [10, "يمكن أن تضم المحادثات الخاصة الجماعية ما يصل إلى 10 أعضاء."],
        [20, "يمكن أن تضم المحادثات الخاصة الجماعية ما يصل إلى 20 عضوًا."]
    ]) {
        const node = f.root.append(new f.TestText(`Group DMs can have up to ${count} members.`));
        f.api.translateTree(node);
        assert.equal(node.data, expected);
    }
});

test("group DM member counts support singular, plural and uppercase labels", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["1 Member", "عضو واحد"], ["1 MEMBER", "عضو واحد"],
        ["0 Members", "0 عضو"], ["2 Members", "عضوان"],
        ["3 Members", "3 أعضاء"], ["10 MEMBERS", "10 أعضاء"],
        ["11 Members", "11 عضوًا"], ["99 Members", "99 عضوًا"],
        ["100 Members", "100 عضو"], ["1\u00a0Member", "عضو واحد"]
    ]) {
        const text = f.root.append(new f.TestText(label));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("Arabic counters use all six plural categories without prefixing the dual", () => {
    const f = fixture();
    for (const [count, expected] of [
        [0, "0 عنصر"], [1, "عنصر واحد"], [2, "عنصران"],
        [3, "3 عناصر"], [10, "10 عناصر"], [11, "11 عنصرًا"], [99, "99 عنصرًا"],
        [100, "100 عنصر"], [101, "101 عنصر"], [102, "102 عنصر"],
        [103, "103 عناصر"], [110, "110 عناصر"], [111, "111 عنصرًا"],
        [200, "200 عنصر"], [1000, "1000 عنصر"]
    ]) {
        const text = f.root.append(new f.TestText(`${count} Items`));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("duals follow the grammatical case in invitations, limits and durations", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["Group DMs can have up to 2 members.", "يمكن أن تضم المحادثات الخاصة الجماعية ما يصل إلى عضوين."],
        ["You can add 2 more people.", "يمكنك إضافة شخصين آخرين."],
        ["Your invite link expires in 2 hours.", "تنتهي صلاحية رابط دعوتك بعد ساعتين."],
        ["In 2 Days", "بعد يومين"],
        ["Sam started a call that lasted 2 minutes.", "Sam بدأ مكالمة استمرت دقيقتين."],
        ["Sam gave 2 boosts.", "Sam منح بوستين."],
        ["Sam 2 boosts expired.", "انتهت صلاحية بوستين لدى Sam."]
    ]) {
        const text = f.root.append(new f.TestText(label));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("boost notices support singular and plural English subjects", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["1 extremely cool person has boosted this server", "دعم شخص رائع هذا السيرفر."],
        ["2 extremely cool people have boosted this server.", "دعم شخصان رائعان هذا السيرفر."],
        ["3 extremely cool people have boosted this server.", "دعم 3 أشخاص رائعين هذا السيرفر."]
    ]) {
        const text = f.root.append(new f.TestText(label));
        f.api.translateTree(text);
        assert.equal(text.data, expected);
    }
});

test("moving a translated subtree retains restoration records", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    f.api.forgetTree(f.root);
    f.api.restoreTranslations();
    assert.equal(text.data, "Open");
});
test("detached subtrees release restoration references", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    f.root.connected = false;
    f.api.forgetTree(f.root);
    assert.equal(f.api.translatedTextNodes.has(text), false);
});
test("self-generated text and attribute mutations do not schedule another frame", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.root.setAttribute("title", "Open");
    f.api.translateTree(f.root);
    f.api.handleMutations([
        { type: "characterData", target: text },
        { type: "attributes", target: f.root, attributeName: "title" }
    ]);
    assert.equal(f.frames(), 0);
});
test("external updates still translate and restore the new source value", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    text.data = "Close";
    f.api.handleMutations([{ type: "characterData", target: text }]);
    assert.equal(f.frames(), 1);
    f.api.flushMutations();
    assert.equal(text.data, "إغلاق");
    f.api.restoreTranslations();
    assert.equal(text.data, "Close");
});
test("excluded user content is unchanged and does not schedule text processing", () => {
    const f = fixture();
    f.root.excluded = true;
    const text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    f.api.handleMutations([{ type: "characterData", target: text }]);
    assert.equal(text.data, "Open");
    assert.equal(f.frames(), 0);
});
test("nested added roots are walked once", () => {
    const f = fixture(), child = f.root.append(new f.TestElement());
    const text = child.append(new f.TestText("Open"));
    f.api.pendingRoots.add(f.root);
    f.api.pendingRoots.add(child);
    f.api.pendingNodes.add(text);
    f.api.flushMutations();
    assert.equal(f.visits(), 2);
    assert.equal(text.data, "فتح");
});
test("stop cancels pending work and preserves externally changed text", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    text.data = "User change";
    f.api.pendingNodes.add(text);
    f.api.default.stop();
    assert.equal(text.data, "User change");
    assert.equal(f.api.pendingNodes.size, 0);
    assert.equal(f.api.translatedTextNodes.size, 0);
});

test("large trees yield between frames and resume after removal or reparenting", () => {
    const f = fixture();
    const nodes = Array.from({ length: 2500 }, () => f.root.append(new f.TestText("Open")));
    f.api.pendingRoots.add(f.root);
    f.api.flushMutations();
    const firstFrame = nodes.filter(node => node.data === "فتح").length;
    assert.ok(firstFrame > 0 && firstFrame < 200);
    assert.ok(f.api.traversalJobs.size > 0);
    const excluded = f.root.append(new f.TestElement());
    excluded.excluded = true;
    nodes[2499].parentNode = excluded;
    nodes[2498].parentNode = null;
    let frames = 1;
    while (f.api.traversalJobs.size && frames++ < 30) f.api.flushMutations();
    assert.equal(f.api.traversalJobs.size, 0);
    assert.equal(nodes[2000].data, "فتح");
    assert.equal(nodes[2499].data, "Open");
    assert.equal(nodes[2498].data, "Open");
    f.api.default.stop();
    assert.equal(nodes[2000].data, "Open");
});

test("stop discards an unfinished traversal", () => {
    const f = fixture();
    const nodes = Array.from({ length: 500 }, () => f.root.append(new f.TestText("Open")));
    f.api.pendingRoots.add(f.root);
    f.api.flushMutations();
    f.api.default.stop();
    assert.equal(f.api.traversalJobs.size, 0);
    f.api.flushMutations();
    assert.ok(nodes.every(node => node.data === "Open"));
});

test("child insertions inside excluded content do not schedule translation", () => {
    const f = fixture();
    f.root.excluded = true;
    const nodes = Array.from({ length: 1000 }, () => f.root.append(new f.TestText("Open")));
    f.api.handleMutations([{ type: "childList", target: f.root, addedNodes: nodes, removedNodes: [] }]);
    assert.equal(f.frames(), 0);
    assert.equal(f.api.pendingRoots.size, 0);
});

test("attribute updates read only the changed attribute and release stale records", () => {
    const f = fixture();
    f.root.setAttribute("title", "Open");
    let reads = 0;
    const original = f.root.getAttribute.bind(f.root);
    f.root.getAttribute = key => { reads++; return original(key); };
    f.api.handleMutations([{ type: "attributes", target: f.root, attributeName: "title" }]);
    f.api.flushMutations();
    assert.equal(reads, 2);
    assert.equal(original("title"), "فتح");
    f.root.attrs.delete("title");
    f.api.handleMutations([{ type: "attributes", target: f.root, attributeName: "title" }]);
    f.api.flushMutations();
    assert.equal(f.api.translatedAttributes.size, 0);
});

test("dynamic cache is bounded and does not retain oversized unmatched strings", () => {
    const f = fixture();
    for (let n = 0; n < 1500; n++) {
        const text = f.root.append(new f.TestText(`Unknown label ${n}`));
        f.api.translateTree(text);
    }
    assert.equal(f.api.translationCache.size, 1024);
    const longText = "Unknown ".repeat(200);
    f.api.translateTree(f.root.append(new f.TestText(longText)));
    assert.equal(f.api.translationCache.has(longText.trim()), false);
});

test("initial startup is deferred and the elapsed-time budget can yield before the node cap", () => {
    let clock = 0;
    const f = fixture(() => clock += 5);
    const text = f.root.append(new f.TestText("Open"));
    f.api.default.start();
    assert.equal(text.data, "Open");
    assert.equal(f.frames(), 1);
    f.api.flushMutations();
    assert.equal(text.data, "Open");
    f.api.flushMutations();
    assert.equal(text.data, "فتح");
    f.api.default.stop();
});

test("plaintext-only and empty contenteditable values protect typed text", () => {
    for (const mode of ["", "plaintext-only", "true"]) {
        const f = fixture();
        f.root.setAttribute("contenteditable", mode);
        f.root.setAttribute("placeholder", "Open");
        const text = f.root.append(new f.TestText("Open"));
        f.api.translateTree(f.root);
        assert.equal(text.data, "Open");
        assert.equal(f.root.getAttribute("placeholder"), "فتح");
    }
});

test("large removals release records over multiple frames", () => {
    const f = fixture();
    for (let n = 0; n < 500; n++) f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    f.root.connected = false;
    f.api.handleMutations([{ type: "childList", target: f.root, addedNodes: [], removedNodes: [f.root] }]);
    f.api.flushMutations();
    assert.ok(f.api.translatedTextNodes.size > 0);
    for (let n = 0; n < 10 && f.api.traversalJobs.size; n++) f.api.flushMutations();
    assert.equal(f.api.translatedTextNodes.size, 0);
});
