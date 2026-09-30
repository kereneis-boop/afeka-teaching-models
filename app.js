(function () {
  'use strict';

  var CHECKLIST_KEY = 'afeka-checklist-tashpaz-v1';
  var DRAFT_KEY = 'afeka-model-draft-v1';
  var view = document.getElementById('view');
  var announcer = document.getElementById('announcer');

  var data = { models: null, checklist: null };
  var state = {
    checked: new Set(readJSON(CHECKLIST_KEY, [])),
    station: 0,
    filters: { q: '', skill: '', school: '', courseType: '' },
    draft: null
  };

  /* ---------- the card template (form v2, 10 fields) ---------- */
  var PARTS = [
    { id: 'a', tag: 'חלק א', title: 'תעודת זהות של הדגם', fields: [1, 2, 3, 4, 5] },
    { id: 'b', tag: 'חלק ב', title: 'איך זה עובד בפועל', fields: [6, 7, 8] },
    { id: 'c', tag: 'חלק ג', title: 'למרצה שרוצה לאמץ את הדגם', fields: [9, 10] }
  ];
  var FIELDS = {
    1: { title: 'שם הדגם ומשפט אחד עליו', hint: 'כותרת קצרה, ואז משפט אחד: "בדגם הזה הסטודנטים ... בעזרת ..."' },
    2: { title: 'מרצה, קורס וקהל היעד', hint: 'שם המרצה ובית ספר / יחידה; שם הקורס (חובה / בחירה), שנה, מספר סטודנטים.' },
    3: { title: 'מיקום והיקף', hint: 'היכן בקורס היחידה ממוקמת, וכמה זמן היא לוקחת (מפגשים בכיתה / שעות עבודה עצמית).' },
    4: { title: 'מטרות הדגם', hint: '1–3 מטרות, מנוסחות כמה שהסטודנטים יוכלו לעשות בסוף היחידה, ומשפט אחד על התרומה של ה-AI ללמידה.' },
    5: { title: 'כלי ה-AI ותפקידו', hint: 'איזה כלי (חינמי / רישיון); במה הוא מסייע לסטודנט, ומה הוא לא אמור לעשות, בהתאם לשדה 4.' },
    6: { title: 'המהלך ב-3 עד 5 צעדים', hint: 'מה הסטודנטים עושים ומה המרצה עושה, לפני / במהלך / אחרי. בנקודות, לא בפסקאות.' },
    7: { title: 'החומרים', hint: 'פרומפט, סוכן, דף עבודה או הנחיות לסטודנטים. רק מה שכבר קיים, אין צורך ליצור חדש.' },
    8: { title: 'איך הערכתם (תעריכו)', hint: 'איך תדעו שהלמידה קרתה, ומהו העוגן שאי אפשר לעקוף עם AI. העוגן צריך לבדוק את מטרת הלמידה בשדה 4.' },
    9: { title: 'מה עבד, מה פחות, ומה הייתם משנים', hint: '2–3 נקודות בכנות, וגם משוב שקיבלתם מהסטודנטים. זה החלק הכי שימושי לעמיתים.' },
    10: { title: 'כדי להתאים לקורס אחר', hint: 'תנאים מוקדמים; מה מומלץ לשמור ומה אפשר לשנות; כמה זמן זה דורש מהמרצה.' }
  };
  var ANCHORS = ['הגנה בעל פה', 'בוחן בכיתה', 'רפלקציה', 'שאלה אקראית', 'כתיבה בכיתה ללא כלים', 'אחר'];

  // RTL: "forward/next" points left, "back" points right.
  var ICON_NEXT = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m6-6-6 6 6 6"/></svg>';
  var ICON_BACK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  var ICON_PRINT = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="m5 12 5 5 9-10"/></svg>';
  var ICON_DOC = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M6 3h8l4 4v14H6zM14 3v4h4M12 10v7m-3-3 3 3 3-3"/></svg>';
  var ICON_COPY = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M9 9h11v11H9zM5 15H4V4h11v1"/></svg>';
  var ICON_EDIT = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function announce(msg) {
    announcer.textContent = '';
    setTimeout(function () { announcer.textContent = msg; }, 30);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- storage (optional: the page works without it) ---------- */
  function readJSON(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function removeKey(key) { try { localStorage.removeItem(key); } catch (e) {} }

  /* ---------- theme ---------- */
  var themeBtn = document.querySelector('.theme-toggle');
  function currentTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function syncThemeBtn() {
    themeBtn.setAttribute('aria-label', currentTheme() === 'dark' ? 'מעבר למצב בהיר' : 'מעבר למצב כהה');
  }
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('afeka-theme', next); } catch (e) {}
    syncThemeBtn();
  });
  syncThemeBtn();

  /* ---------- routing ---------- */
  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    var name = 'home', arg = '';
    if (h === 'models') name = 'models';
    else if (h === 'checklist') name = 'checklist';
    else if (h === 'build') name = 'build';
    else if (h.indexOf('build/') === 0) { name = 'build'; arg = h.slice(6); }
    else if (h.indexOf('model/') === 0) { name = 'model'; arg = h.slice(6); }

    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var key = a.getAttribute('data-nav');
      var on = key === name || (name === 'model' && key === 'models');
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    if (name === 'models') renderCatalog();
    else if (name === 'checklist') renderChecklist();
    else if (name === 'model') renderModel(arg);
    else if (name === 'build') renderBuilder(arg);
    else renderHome();
  }

  // Keep Hebrew prefix + Latin word together ("ה-AI", "ב-Moodle") so the line never breaks at the hyphen.
  var PREFIXED = /[א-ת]{1,2}-[A-Za-z][A-Za-z0-9]*/g;
  function keepPrefixesTogether(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) {
      var n = walker.currentNode;
      if (n.parentNode.hasAttribute('data-nw') || n.parentNode.closest('textarea, option')) continue;
      PREFIXED.lastIndex = 0;
      if (PREFIXED.test(n.nodeValue)) nodes.push(n);
    }
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      var text = node.nodeValue, last = 0, m;
      PREFIXED.lastIndex = 0;
      while ((m = PREFIXED.exec(text))) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var span = document.createElement('span');
        span.style.whiteSpace = 'nowrap';
        span.setAttribute('data-nw', '');
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }
  new MutationObserver(function () { keepPrefixesTogether(view); })
    .observe(view, { childList: true, subtree: true });

  function afterNavigate(isInitial) {
    window.scrollTo(0, 0);
    if (!isInitial) {
      var h1 = view.querySelector('h1');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    }
  }

  function modelById(id) {
    var found = null;
    data.models.models.forEach(function (m) { if (m.id === id) found = m; });
    return found;
  }

  /* ---------- one card, three outputs: sheet (HTML), Word file, plain text ---------- */
  function has(v) { return Array.isArray(v) ? v.some(function (x) { return String(x).trim(); }) : !!String(v || '').trim(); }
  function list(arr) { return (arr || []).filter(function (x) { return String(x).trim(); }); }
  function audienceLine(c) { return [c.course ? c.course + (c.courseType ? ' (' + c.courseType + ')' : '') : '', c.audience].filter(Boolean).join(', '); }
  function toolLine(c) { return c.tool.name ? c.tool.name + (c.tool.license ? ' (' + c.tool.license + ')' : '') : ''; }
  function aiSentence(c) {
    if (!has(c.aiFor) && !has(c.aiNot)) return '';
    return 'ה-AI משמש ' + (c.aiFor || '…') + ', ולא ' + (c.aiNot || '…') + '.';
  }

  function fieldBody(no, c, empty) {
    var E = function (v) { return has(v) ? esc(v) : empty; };
    var kv = function (rows) {
      return '<dl class="kv">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + E(r[1]) + '</dd></div>'; }).join('') + '</dl>';
    };
    var ul = function (arr, tag) {
      var items = list(arr);
      return items.length ? '<' + tag + '>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</' + tag + '>' : '<p>' + empty + '</p>';
    };
    switch (no) {
      case 1: return '<p>' + (has(c.title) ? '<strong>' + esc(c.title) + '.</strong> ' : '') + E(c.sentence) + '</p>';
      case 2: return kv([['מרצה', [c.lecturer, c.school].filter(Boolean).join(', ')], ['קורס', audienceLine(c)]]);
      case 3: return '<p>' + E(c.placement) + '</p>';
      case 4: return '<p class="sub">מטרות למידה: בסוף היחידה הסטודנטים יוכלו</p>' + ul(c.goals, 'ul') +
        '<p class="ai-line"><span class="sub">תרומת ה-AI ללמידה</span>' + E(aiSentence(c)) + '</p>';
      case 5: return kv([['הכלי', toolLine(c)], ['במה מסייע', c.tool.does], ['מה לא', c.tool.doesNot]]);
      case 6: return ul(c.steps, 'ol');
      case 7: return ul(c.materials, 'ul');
      case 8: return '<p>' + E(c.assessment) + '</p>' + (has(c.anchor) ? '<p class="anchor-tag">עוגן שאי אפשר לעקוף עם AI: <strong>' + esc(c.anchor) + '</strong></p>' : '');
      case 9: return kv([['עבד', c.reflection.worked], ['פחות', c.reflection.less], ['היינו משנים', c.reflection.change], ['משוב סטודנטים', c.reflection.feedback]]);
      case 10: return kv([['תנאי מוקדם', c.adapt.prereq], ['לשמור', c.adapt.keep], ['אפשר לשנות', c.adapt.change], ['זמן מהמרצה', c.adapt.time]]);
    }
    return '';
  }

  function sheetHtml(c, opts) {
    opts = opts || {};
    var empty = '<span class="empty-val">טרם מולא</span>';
    return PARTS.map(function (p) {
      return '<section class="part"><h2 class="part-title"><span class="tag">' + p.tag + '</span>' + p.title + '</h2>' +
        '<div class="fields' + (opts.compact ? '' : ' two') + '">' +
        p.fields.map(function (no) {
          return '<div class="fld"><span class="no ltr" aria-hidden="true">' + no + '</span><div><h3><span class="sr-only">שדה ' + no + ': </span>' +
            FIELDS[no].title + '</h3>' + fieldBody(no, c, empty) + '</div></div>';
        }).join('') + '</div></section>';
    }).join('');
  }

  function fieldText(no, c) {
    var L = function (label, v) { return has(v) ? label + ': ' + v : ''; };
    var join = function (arr) { return arr.filter(Boolean).join('\n'); };
    switch (no) {
      case 1: return join([c.title, c.sentence]);
      case 2: return join([L('מרצה', [c.lecturer, c.school].filter(Boolean).join(', ')), L('קורס', audienceLine(c))]);
      case 3: return c.placement || '';
      case 4: return join(['מטרות למידה: בסוף היחידה הסטודנטים יוכלו', list(c.goals).map(function (g) { return '• ' + g; }).join('\n'), L('תרומת ה-AI ללמידה', aiSentence(c))]);
      case 5: return join([L('הכלי', toolLine(c)), L('במה מסייע', c.tool.does), L('מה לא', c.tool.doesNot)]);
      case 6: return list(c.steps).map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n');
      case 7: return list(c.materials).map(function (s) { return '• ' + s; }).join('\n');
      case 8: return join([c.assessment, L('עוגן שאי אפשר לעקוף עם AI', c.anchor)]);
      case 9: return join([L('עבד', c.reflection.worked), L('פחות', c.reflection.less), L('היינו משנים', c.reflection.change), L('משוב סטודנטים', c.reflection.feedback)]);
      case 10: return join([L('תנאי מוקדם', c.adapt.prereq), L('לשמור', c.adapt.keep), L('אפשר לשנות', c.adapt.change), L('זמן מהמרצה', c.adapt.time)]);
    }
    return '';
  }

  function cardText(c) {
    return ['כרטיס דגם הוראה' + (c.title ? ': ' + c.title : '')].concat(PARTS.map(function (p) {
      return '\n' + p.tag + ': ' + p.title + '\n' + p.fields.map(function (no) {
        return no + '. ' + FIELDS[no].title + '\n' + (fieldText(no, c) || '—');
      }).join('\n\n');
    })).join('\n');
  }

  function downloadWord(c) {
    var rows = PARTS.map(function (p) {
      return '<tr><td colspan="2" style="background:#0B6B5A;color:#fff;font-weight:bold;padding:6px 8px">' + p.tag + ': ' + p.title + '</td></tr>' +
        p.fields.map(function (no) {
          var body = esc(fieldText(no, c)).replace(/\n/g, '<br>') || '&nbsp;';
          return '<tr><td style="width:30%;font-weight:bold;vertical-align:top;padding:6px 8px;border:1px solid #9bb">' + no + '. ' + FIELDS[no].title +
            '</td><td style="vertical-align:top;padding:6px 8px;border:1px solid #9bb">' + body + '</td></tr>';
        }).join('');
    }).join('');
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">' +
      '<title>כרטיס דגם הוראה</title><style>body{font-family:Arial,sans-serif;font-size:11pt;direction:rtl}table{border-collapse:collapse;width:100%}</style></head>' +
      '<body dir="rtl"><p style="color:#0B6B5A;font-weight:bold;margin:0">המרכז לקידום הוראה · כרטיס דגם הוראה</p>' +
      '<h1 style="font-size:20pt;margin:4pt 0 8pt">' + esc(c.title || 'דגם הוראה') + '</h1>' +
      '<table dir="rtl">' + rows + '</table></body></html>';
    var blob = new Blob(['﻿', html], { type: 'application/msword' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'כרטיס דגם הוראה - ' + String(c.title || 'טיוטה').replace(/[\\/:*?"<>|]/g, '') + '.doc';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    announce('קובץ ה-Word ירד למחשב.');
  }

  function copyText(c) {
    var text = cardText(c);
    var done = function () { announce('הטקסט של הכרטיס הועתק.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.insetInlineStart = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  /* ---------- home ---------- */
  function renderHome() {
    var models = data.models.models;
    view.innerHTML =
      '<section class="band hero"><div class="wrap">' +
        '<p class="eyebrow">כנס הסגל האקדמי · פתיחת שנה״ל תשפ״ז · <span class="ltr">15.10.26</span></p>' +
        '<h1>דגמי הוראה ללומד עצמאי, בסיוע AI</h1>' +
        '<p class="lead">בפיילוט פיתחו מרצים יחידות הוראה שבהן הסטודנטים לומדים באופן עצמאי בעזרת AI, ונשארים אלה שבודקים, מחליטים ומנמקים. כאן אפשר למצוא דגם, להתאים אותו לקורס שלכם, ולבנות דגם משלכם.</p>' +
        '<div class="hero-path" aria-hidden="true"><span class="on"></span><i></i><span class="on"></span><i></i><span></span></div>' +
      '</div></section>' +
      '<div class="wrap">' +
        '<ol class="paths" aria-label="שלוש דרכים להשתמש באתר">' +
          '<li><a class="path" href="#models"><span class="step ltr">1</span><h2>מצאו דגם</h2>' +
            '<p>' + models.length + ' דגמים מהפיילוט, כל אחד בעמוד אחד. מסננים לפי מיומנות, בית ספר וסוג קורס, ורואים מיד כמה זמן הכנה הוא דורש.</p>' +
            '<span class="go">לדגמי ההוראה ' + ICON_NEXT + '</span></a></li>' +
          '<li><a class="path" href="#models"><span class="step ltr">2</span><h2>התאימו לקורס שלכם</h2>' +
            '<p>בכל כרטיס יש כפתור "התאמה לקורס שלי". הכרטיס נפתח לעריכה עם כל מה שכדאי לשמור, ואתם משנים את השאר.</p>' +
            '<span class="go">לבחירת דגם ' + ICON_NEXT + '</span></a></li>' +
          '<li><a class="path path-accent" href="#build"><span class="step ltr">3</span><h2>בנו דגם משלכם</h2>' +
            '<p>עשרה שדות, עם הסבר ודוגמה לכל שדה ותצוגה מקדימה חיה. בסוף מורידים קובץ Word ושולחים למרכז.</p>' +
            '<span class="go">לבניית כרטיס ' + ICON_NEXT + '</span></a></li>' +
        '</ol>' +

        '<section class="marks" aria-labelledby="marks-h">' +
          '<h2 id="marks-h" class="section-h">מה הופך דגם לטוב</h2>' +
          '<p class="section-sub">חמישה סימני איכות שכל הדגמים באתר עומדים בהם, וכדאי לבדוק גם בדגם שלכם.</p>' +
          '<ol class="marks-list">' +
            '<li><h3>הסטודנטים עושים, לא רק צופים</h3><p>הם מאתרים, מאמתים, מנמקים ומחליטים.</p></li>' +
            '<li><h3>ערך ללומד</h3><p>מעבר לחיסכון בזמן למרצה, הסטודנט רוכש מיומנות.</p></li>' +
            '<li><h3>תכנית למקרה שה-AI טועה</h3><p>ברור מה הסטודנט עושה כשהתוצר שגוי או חלקי.</p></li>' +
            '<li><h3>מטרה, פעילות והערכה מתיישרות</h3><p>שדות 4, 5 ו-8 בכרטיס מדברים על אותו דבר.</p></li>' +
            '<li><h3>עוגן שאי אפשר לעקוף</h3><p>הגנה בעל פה, בוחן בכיתה, רפלקציה או שאלה אקראית.</p></li>' +
          '</ol>' +
        '</section>' +

        '<section class="glance" aria-labelledby="glance-h">' +
          '<h2 id="glance-h" class="section-h">הדגמים במבט אחד</h2>' +
          '<ul class="glance-list">' + models.map(function (m) {
            return '<li><a href="#model/' + encodeURIComponent(m.id) + '"><span class="g-title">' + esc(m.title) + '</span>' +
              '<span class="g-meta">' + esc(m.school) + '</span><span class="g-meta">עוגן: ' + esc(m.anchor) + '</span>' +
              '<span class="g-go">' + ICON_NEXT + '<span class="sr-only">לכרטיס</span></span></a></li>';
          }).join('') + '</ul>' +
        '</section>' +

        '<section class="cta-band" aria-labelledby="cta-h">' +
          '<div><h2 id="cta-h">יש לכם יחידה שעבדה בכיתה?</h2><p>הפכו אותה לכרטיס שעמיתים יכולים לאמץ. זה לוקח כעשרים דקות.</p></div>' +
          '<a class="btn btn-lime" href="#build">' + ICON_EDIT + 'לבניית כרטיס</a>' +
        '</section>' +

        '<section class="side-promo" aria-labelledby="promo-h">' +
          '<h2 id="promo-h">מתכוננים לפתיחת השנה?</h2>' +
          '<p>צ׳קליסט של ' + totalItems() + ' סעיפים, מאתר הקורס ב-Moodle ועד מבנה ההערכה.</p>' +
          '<a class="btn" href="#checklist">לצ׳קליסט ' + ICON_NEXT + '</a>' +
        '</section>' +
      '</div>';
  }

  /* ---------- catalog ---------- */
  function uniq(key) {
    var seen = [];
    data.models.models.forEach(function (m) { if (seen.indexOf(m[key]) < 0) seen.push(m[key]); });
    return seen;
  }
  function selectHtml(id, label, key, values) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-filter="' + key + '">' +
      '<option value="">הכול</option>' +
      values.map(function (v) {
        return '<option value="' + esc(v) + '"' + (state.filters[key] === v ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('') + '</select></div>';
  }

  function renderCatalog() {
    view.innerHTML =
      '<section class="band page-head"><div class="wrap">' +
        '<p class="eyebrow">דגמים מהפיילוט · תוכן לדוגמה</p>' +
        '<h1>דגמי הוראה</h1>' +
        '<p>כל דגם בעמוד אחד: מה הסטודנטים עושים, מה ה-AI עושה ומה לא, ואיך מתאימים לקורס אחר. המרצים מסומנים באותיות בלבד.</p>' +
        '<div style="height:20px"></div>' +
      '</div></section>' +
      '<div class="wrap">' +
        '<form class="filters" id="filters" role="search" aria-label="חיפוש וסינון דגמים" onsubmit="return false">' +
          '<div class="field field-q"><label for="f-q">חיפוש חופשי</label><input type="search" id="f-q" data-filter="q" value="' + esc(state.filters.q) + '" placeholder="סימולציה, ראיון, הגנה בעל פה"></div>' +
          selectHtml('f-school', 'בית ספר / יחידה', 'school', uniq('school')) +
          selectHtml('f-type', 'חובה או בחירה', 'courseType', uniq('courseType')) +
          '<fieldset class="skills"><legend>מה הסטודנטים מתרגלים?</legend><div class="skill-chips">' +
            data.models.skills.map(function (s) {
              return '<button type="button" class="skill" data-skill="' + esc(s) + '" aria-pressed="' + (state.filters.skill === s) + '">' + esc(s) + '</button>';
            }).join('') +
          '</div></fieldset>' +
        '</form>' +
        '<div class="result-row"><p class="result-count" id="result-count" aria-live="polite"></p>' +
          '<button type="button" class="btn btn-quiet" id="f-reset">איפוס</button></div>' +
        '<div id="deck-wrap"></div>' +
        '<section class="cta-band" aria-labelledby="cta2-h">' +
          '<div><h2 id="cta2-h">לא מצאתם דגם לתחום שלכם?</h2><p>התחילו מדגם קרוב ושנו אותו, או בנו כרטיס חדש מאפס.</p></div>' +
          '<a class="btn btn-lime" href="#build">' + ICON_EDIT + 'לבניית כרטיס</a>' +
        '</section>' +
      '</div>';

    view.querySelectorAll('select[data-filter]').forEach(function (s) {
      s.addEventListener('change', function () { state.filters[s.getAttribute('data-filter')] = s.value; renderDeck(); });
    });
    document.getElementById('f-q').addEventListener('input', function (e) { state.filters.q = e.target.value; renderDeck(); });
    view.querySelectorAll('.skill').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = b.getAttribute('data-skill');
        state.filters.skill = state.filters.skill === s ? '' : s;
        view.querySelectorAll('.skill').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-skill') === state.filters.skill)); });
        renderDeck();
      });
    });
    document.getElementById('f-reset').addEventListener('click', resetFilters);
    renderDeck();
  }

  function resetFilters() {
    state.filters = { q: '', skill: '', school: '', courseType: '' };
    view.querySelectorAll('select[data-filter]').forEach(function (s) { s.value = ''; });
    document.getElementById('f-q').value = '';
    view.querySelectorAll('.skill').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
    renderDeck();
  }

  function filteredModels() {
    var f = state.filters;
    var q = f.q.trim().toLowerCase();
    return data.models.models.filter(function (m) {
      return (!f.school || m.school === f.school) &&
        (!f.courseType || m.courseType === f.courseType) &&
        (!f.skill || m.skills.indexOf(f.skill) >= 0) &&
        (!q || JSON.stringify(m).toLowerCase().indexOf(q) >= 0);
    });
  }

  function renderDeck() {
    var all = data.models.models;
    var shown = filteredModels();
    document.getElementById('result-count').textContent = 'מוצגים ' + shown.length + ' מתוך ' + all.length + ' דגמים';
    var wrap = document.getElementById('deck-wrap');
    if (!shown.length) {
      wrap.innerHTML = '<div class="empty"><h2>אין דגם שמתאים לחיפוש</h2>' +
        '<p>נסו להסיר סינון, או התחילו כרטיס חדש. אולי הדגם הבא באתר יהיה שלכם.</p>' +
        '<div class="empty-actions"><button type="button" class="btn" id="empty-reset">הצגת כל הדגמים</button>' +
        '<a class="btn btn-primary" href="#build">' + ICON_EDIT + 'לבניית כרטיס</a></div></div>';
      document.getElementById('empty-reset').addEventListener('click', function () {
        resetFilters();
        document.getElementById('f-q').focus();
      });
      return;
    }
    wrap.innerHTML = '<ul class="deck">' + shown.map(function (m) {
      var n = all.indexOf(m) + 1;
      return '<li class="deck-card">' +
        '<span class="n">דגם <span class="ltr">' + n + '</span> · ' + esc(m.school) + '</span>' +
        '<h2><a href="#model/' + encodeURIComponent(m.id) + '">' + esc(m.title) + '</a></h2>' +
        '<p>' + esc(m.sentence) + '</p>' +
        '<dl class="glance-facts">' +
          '<div><dt>הכנה</dt><dd>' + esc(m.prepTime) + '</dd></div>' +
          '<div><dt>בכיתה</dt><dd>' + esc(m.classTime) + '</dd></div>' +
          '<div><dt>עוגן</dt><dd>' + esc(m.anchor) + '</dd></div>' +
        '</dl>' +
        '<div class="chips">' + m.skills.map(function (s) { return '<span class="chip">' + esc(s) + '</span>'; }).join('') +
          '<span class="chip chip-req">' + esc(m.course) + ' · ' + esc(m.courseType) + '</span></div>' +
        '<span class="card-go" aria-hidden="true">לכרטיס המלא ' + ICON_NEXT + '</span>' +
        '</li>';
    }).join('') + '</ul>';
  }

  /* ---------- model card ---------- */
  function renderModel(id) {
    var all = data.models.models;
    var m = modelById(id);
    if (!m) {
      view.innerHTML = '<div class="wrap"><div class="error-box"><h1>הדגם לא נמצא</h1><p>ייתכן שהקישור שגוי.</p><p style="margin-top:12px"><a class="btn" href="#models">' + ICON_BACK + 'לכל הדגמים</a></p></div></div>';
      return;
    }
    var idx = all.indexOf(m);
    var prev = all[idx - 1], next = all[idx + 1];
    var fitQs = [
      'מטרת הלמידה בדגם תואמת אחד מתוצרי הלמידה של הקורס שלי.',
      'יש ליחידה מקום בסילבוס, והזמן נלקח ממשהו קיים.',
      'לסטודנטים שלי יש ידע מספיק כדי לבקר תוצר של AI בנושא.',
      'הכלי נגיש לכל הסטודנטים, בחינם או ברישיון מוסדי.'
    ];

    view.innerHTML =
      '<section class="band page-head model-head"><div class="wrap">' +
        '<div class="crumbs no-print"><a class="btn btn-on-band" href="#models">' + ICON_BACK + 'לכל הדגמים</a></div>' +
        '<p class="eyebrow">כרטיס דגם הוראה · דגם <span class="ltr">' + (idx + 1) + '</span> מתוך <span class="ltr">' + all.length + '</span> · דמו</p>' +
        '<h1>' + esc(m.title) + '</h1>' +
        '<p class="one">' + esc(m.sentence) + '</p>' +
        '<dl class="glance-facts on-band"><div><dt>הכנה</dt><dd>' + esc(m.prepTime) + '</dd></div><div><dt>בכיתה</dt><dd>' + esc(m.classTime) + '</dd></div><div><dt>עוגן</dt><dd>' + esc(m.anchor) + '</dd></div></dl>' +
        '<div style="height:20px"></div>' +
      '</div></section>' +
      '<div class="wrap model-layout">' +
        '<article class="sheet" aria-labelledby="sheet-h"><h2 id="sheet-h" class="sr-only">הכרטיס המלא</h2>' + sheetHtml(m) + '</article>' +
        '<aside class="adopt no-print" aria-labelledby="adopt-h">' +
          '<h2 id="adopt-h">רוצים לנסות בקורס שלכם?</h2>' +
          '<a class="btn btn-primary btn-block" href="#build/' + encodeURIComponent(m.id) + '">' + ICON_EDIT + 'התאמה לקורס שלי</a>' +
          '<p class="adopt-note">נפתח עותק לעריכה: המבנה, הכלי והמהלך נשמרים, ופרטי הקורס ריקים בשבילכם.</p>' +
          '<div class="adopt-row"><button type="button" class="btn" id="dl-word">' + ICON_DOC + 'הורדה ל-Word</button>' +
          '<button type="button" class="btn" id="print-card">' + ICON_PRINT + 'הדפסה / PDF</button></div>' +
          '<details class="fit"><summary>האם הדגם מתאים לקורס שלי?</summary>' +
            '<ul class="fit-list">' + fitQs.map(function (q, i) {
              return '<li><input type="checkbox" id="fit-' + i + '"><label for="fit-' + i + '"><span class="box">' + ICON_CHECK + '</span><span>' + q + '</span></label></li>';
            }).join('') + '</ul>' +
            '<p class="fit-result" id="fit-result" aria-live="polite">סמנו מה נכון לגבי הקורס שלכם.</p>' +
          '</details>' +
        '</aside>' +
      '</div>' +
      '<div class="wrap"><nav class="model-nav no-print" aria-label="דפדוף בין דגמים">' +
        (prev ? '<a class="btn" href="#model/' + encodeURIComponent(prev.id) + '">' + ICON_BACK + 'הקודם: ' + esc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a class="btn" href="#model/' + encodeURIComponent(next.id) + '">הבא: ' + esc(next.title) + ICON_NEXT + '</a>' : '<span></span>') +
      '</nav></div>';

    document.getElementById('print-card').addEventListener('click', function () { window.print(); });
    document.getElementById('dl-word').addEventListener('click', function () { downloadWord(m); });
    view.querySelectorAll('.fit-list input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var n = view.querySelectorAll('.fit-list input:checked').length;
        var msg = n === 4 ? 'נראה מתאים. לחצו "התאמה לקורס שלי" והתחילו מהכרטיס הזה.'
          : n >= 2 ? n + ' מתוך 4. אפשר להתאים, אבל כדאי לבדוק מה חסר ולשנות את הדגם בהתאם.'
          : n + ' מתוך 4. אולי דגם אחר יתאים יותר, או שכדאי לבנות דגם משלכם.';
        document.getElementById('fit-result').textContent = msg;
      });
    });
  }

  /* ---------- builder ---------- */
  function emptyCard() {
    return {
      title: '', sentence: '', lecturer: '', school: '', course: '', courseType: '', audience: '', placement: '',
      goals: ['', '', ''], aiFor: '', aiNot: '',
      tool: { name: '', license: '', does: '', doesNot: '' },
      steps: ['', '', '', '', ''], materials: [], assessment: '', anchor: '',
      reflection: { worked: '', less: '', change: '', feedback: '' },
      adapt: { prereq: '', keep: '', change: '', time: '' },
      checks: { aligned: false, active: false, errorPlan: false },
      from: ''
    };
  }
  function pad(arr, n) { arr = (arr || []).slice(0, n); while (arr.length < n) arr.push(''); return arr; }
  function normalizeDraft(d) {
    var c = emptyCard();
    if (!d || typeof d !== 'object') return c;
    Object.keys(c).forEach(function (k) {
      if (d[k] == null) return;
      if (c[k] && typeof c[k] === 'object' && !Array.isArray(c[k])) c[k] = Object.assign(c[k], d[k]);
      else c[k] = d[k];
    });
    c.goals = pad(c.goals, 3);
    c.steps = pad(c.steps, 5);
    return c;
  }
  function draftFromModel(m) {
    var c = normalizeDraft(clone(m));
    // Keep the structure; the course details and the reflection belong to the new lecturer.
    ['lecturer', 'school', 'course', 'courseType', 'audience', 'placement'].forEach(function (k) { c[k] = ''; });
    c.reflection = { worked: '', less: '', change: '', feedback: '' };
    c.checks = { aligned: false, active: false, errorPlan: false };
    c.from = m.id;
    return c;
  }
  function draftHasContent(c) {
    return !!c && ['title', 'sentence', 'lecturer', 'course', 'placement', 'aiFor', 'assessment'].some(function (k) { return has(c[k]); }) || (c && has(c.goals));
  }
  function saveDraft() { writeJSON(DRAFT_KEY, state.draft); }

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function setPath(obj, path, value) {
    var keys = path.split('.'), o = obj;
    for (var i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
  }

  function fieldDone(no, c) {
    switch (no) {
      case 1: return has(c.title) && has(c.sentence);
      case 2: return has(c.lecturer) && has(c.course);
      case 3: return has(c.placement);
      case 4: return has(c.goals) && has(c.aiFor) && has(c.aiNot);
      case 5: return has(c.tool.name) && has(c.tool.does) && has(c.tool.doesNot);
      case 6: return list(c.steps).length >= 3;
      case 7: return list(c.materials).length >= 1;
      case 8: return has(c.assessment) && has(c.anchor);
      case 9: return has(c.reflection.worked) && has(c.reflection.less) && has(c.reflection.change);
      case 10: return has(c.adapt.prereq) && has(c.adapt.keep) && has(c.adapt.time);
    }
    return false;
  }

  function qualityItems(c) {
    return [
      { ok: has(c.goals), text: 'המטרות מנוסחות כמה שהסטודנטים יוכלו לעשות (שדה 4)' },
      { ok: has(c.aiNot) && has(c.tool.doesNot), text: 'כתוב גם מה ה-AI לא עושה (שדות 4 ו-5)' },
      { ok: has(c.anchor), text: 'יש עוגן הערכה שאי אפשר לעקוף עם AI (שדה 8)' }
    ];
  }

  function inputHtml(path, label, placeholder, opts) {
    opts = opts || {};
    var id = 'b-' + path.replace(/\./g, '-');
    var v = getPath(state.draft, path);
    var val = Array.isArray(v) ? v.join('\n') : (v || '');
    var ph = placeholder ? ' placeholder="' + esc(placeholder) + '"' : '';
    var labelHtml = '<label for="' + id + '"' + (opts.srLabel ? ' class="sr-only"' : '') + '>' + label + '</label>';
    var control = opts.rows
      ? '<textarea id="' + id + '" data-path="' + path + '" rows="' + opts.rows + '"' + (opts.lines ? ' data-lines' : '') + ph + '>' + esc(val) + '</textarea>'
      : '<input type="text" id="' + id + '" data-path="' + path + '" value="' + esc(val) + '"' + ph + '>';
    return '<div class="bfield' + (opts.prefix ? ' has-prefix' : '') + '">' + labelHtml +
      (opts.prefix ? '<div class="prefixed"><span class="prefix" aria-hidden="true">' + opts.prefix + '</span>' + control + '</div>' : control) + '</div>';
  }
  function selectInput(path, label, options) {
    var id = 'b-' + path.replace(/\./g, '-');
    var v = getPath(state.draft, path) || '';
    return '<div class="bfield"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-path="' + path + '">' +
      '<option value="">לבחור…</option>' + options.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></div>';
  }
  function checkInput(path, label) {
    var id = 'b-' + path.replace(/\./g, '-');
    return '<div class="bcheck"><input type="checkbox" id="' + id + '" data-path="' + path + '"' + (getPath(state.draft, path) ? ' checked' : '') + '>' +
      '<label for="' + id + '"><span class="box">' + ICON_CHECK + '</span><span>' + label + '</span></label></div>';
  }

  function builderFieldControls(no, ex) {
    var X = function (path) { var v = getPath(ex, path); return Array.isArray(v) ? v[0] || '' : v || ''; };
    switch (no) {
      case 1: return inputHtml('title', 'שם הדגם', X('title')) +
        inputHtml('sentence', 'משפט אחד על הדגם', X('sentence'), { rows: 2 });
      case 2: return '<div class="brow">' + inputHtml('lecturer', 'שם המרצה', 'ד״ר ישראלה ישראלי') + inputHtml('school', 'בית ספר / יחידה', X('school')) + '</div>' +
        '<div class="brow">' + inputHtml('course', 'שם הקורס', X('course')) + selectInput('courseType', 'חובה או בחירה', ['חובה', 'בחירה']) + '</div>' +
        inputHtml('audience', 'שנה ומספר סטודנטים', X('audience'));
      case 3: return inputHtml('placement', 'מיקום בקורס והיקף', X('placement'), { rows: 2 });
      case 4: return '<p class="blabel">מטרות למידה (1–3). בסוף היחידה הסטודנטים יוכלו…</p>' +
        [0, 1, 2].map(function (i) {
          return inputHtml('goals.' + i, 'מטרה ' + (i + 1), i === 0 ? ex.goals[0] : (ex.goals[i] || (i === 2 ? 'לא חובה' : '')), { prefix: '<span class="ltr">' + (i + 1) + '</span>' });
        }).join('') +
        '<p class="blabel">תרומת ה-AI ללמידה</p>' +
        inputHtml('aiFor', 'ה-AI משמש…', X('aiFor'), { prefix: 'ה-AI משמש' }) +
        inputHtml('aiNot', '…ולא', X('aiNot'), { prefix: 'ולא' });
      case 5: return '<div class="brow">' + inputHtml('tool.name', 'איזה כלי', X('tool.name')) + selectInput('tool.license', 'חינמי או רישיון', ['חינמי', 'רישיון מוסדי', 'רישיון אישי']) + '</div>' +
        '<p class="echo" data-echo="ai"></p>' +
        inputHtml('tool.does', 'במה הכלי מסייע לסטודנט', X('tool.does'), { rows: 2 }) +
        inputHtml('tool.doesNot', 'מה הכלי לא אמור לעשות', X('tool.doesNot'), { rows: 2 });
      case 6: return '<p class="blabel">3 עד 5 צעדים. פותחים כל צעד ב"לפני", "במהלך" או "אחרי".</p>' +
        [0, 1, 2, 3, 4].map(function (i) {
          return inputHtml('steps.' + i, 'צעד ' + (i + 1), ex.steps[i] || (i > 2 ? 'לא חובה' : ''), { prefix: '<span class="ltr">' + (i + 1) + '</span>' });
        }).join('');
      case 7: return inputHtml('materials', 'שם של פריט בכל שורה', ex.materials.join('\n'), { rows: 3, lines: true });
      case 8: return '<p class="echo" data-echo="goals"></p>' +
        inputHtml('assessment', 'איך תדעו שהלמידה קרתה', X('assessment'), { rows: 2 }) +
        selectInput('anchor', 'העוגן שאי אפשר לעקוף עם AI', ANCHORS) +
        checkInput('checks.aligned', 'העוגן בודק את מטרת הלמידה שכתבתי בשדה 4');
      case 9: return inputHtml('reflection.worked', 'מה עבד', X('reflection.worked'), { rows: 2 }) +
        inputHtml('reflection.less', 'מה עבד פחות', X('reflection.less'), { rows: 2 }) +
        inputHtml('reflection.change', 'מה הייתם משנים', X('reflection.change'), { rows: 2 }) +
        inputHtml('reflection.feedback', 'משוב מהסטודנטים (אם יש)', X('reflection.feedback'), { rows: 2 });
      case 10: return inputHtml('adapt.prereq', 'תנאים מוקדמים', X('adapt.prereq')) +
        '<div class="brow">' + inputHtml('adapt.keep', 'מה מומלץ לשמור', X('adapt.keep')) + inputHtml('adapt.change', 'מה אפשר לשנות', X('adapt.change')) + '</div>' +
        inputHtml('adapt.time', 'כמה זמן זה דורש מהמרצה', X('adapt.time'));
    }
    return '';
  }

  function renderBuilder(fromId) {
    var base = fromId ? modelById(fromId) : null;
    var saved = readJSON(DRAFT_KEY, null);

    // Arriving from a model while another draft is saved: ask before replacing it.
    if (base && saved && draftHasContent(saved) && saved.from !== base.id) {
      view.innerHTML = '<section class="band page-head"><div class="wrap"><p class="eyebrow">בניית כרטיס</p><h1>יש לכם טיוטה שמורה</h1>' +
        '<p>בדפדפן הזה שמורה טיוטה של כרטיס' + (saved.title ? ' בשם "' + esc(saved.title) + '"' : '') + '. מה לעשות?</p><div style="height:20px"></div></div></section>' +
        '<div class="wrap"><div class="choice-box">' +
          '<button type="button" class="btn btn-primary" id="use-base">' + ICON_EDIT + 'להתחיל מהדגם "' + esc(base.title) + '"</button>' +
          '<a class="btn" href="#build">להמשיך את הטיוטה השמורה</a>' +
          '<p class="adopt-note">התחלה מהדגם תחליף את הטיוטה השמורה. אפשר להוריד אותה קודם כ-Word מעמוד הבנייה.</p>' +
        '</div></div>';
      document.getElementById('use-base').addEventListener('click', function () {
        writeJSON(DRAFT_KEY, draftFromModel(base));
        location.hash = '#build';
      });
      return;
    }

    if (base && !(saved && saved.from === base.id)) state.draft = draftFromModel(base);
    else state.draft = normalizeDraft(saved);
    if (base) { saveDraft(); history.replaceState(null, '', '#build'); }

    var from = state.draft.from ? modelById(state.draft.from) : null;
    var ex = from || data.models.models[0];

    view.innerHTML =
      '<section class="band page-head"><div class="wrap">' +
        '<p class="eyebrow">בניית כרטיס דגם הוראה · נשמר רק בדפדפן שלכם</p>' +
        '<h1>' + (from ? 'התאמת הדגם "' + esc(from.title) + '"' : 'בנו כרטיס לדגם שלכם') + '</h1>' +
        '<p>' + (from
          ? 'המבנה, הכלי והמהלך הועתקו מהדגם המקורי. שנו מה שצריך, ומלאו את פרטי הקורס ואת הניסיון שלכם. הטקסט האפור בכל שדה מראה מה נכתב במקור.'
          : 'עשרה שדות לפי תבנית הכרטיס. בכל שדה יש הסבר קצר, והטקסט האפור הוא דוגמה מהדגם "' + esc(ex.title) + '". כתבו בקצרה, שתיים-שלוש שורות לשדה.') + '</p>' +
        '<div class="build-progress"><p class="progress-meta" id="b-progress"></p>' +
          '<ol class="mini-stations" aria-label="קפיצה לשדה">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (no) {
            return '<li><button type="button" class="ms" data-jump="' + no + '" aria-label="שדה ' + no + ': ' + FIELDS[no].title + '"><span class="ltr">' + no + '</span></button></li>';
          }).join('') + '</ol><button type="button" class="btn btn-on-band jump-preview" id="b-jump">' + ICON_DOC + 'לתצוגה המקדימה ולהורדה</button></div>' +
        '<div style="height:20px"></div>' +
      '</div></section>' +
      '<div class="wrap builder-grid" id="builder">' +
        '<form class="builder-form no-print" id="builder-form" aria-label="טופס כרטיס דגם הוראה" onsubmit="return false">' +
          PARTS.map(function (p) {
            return '<fieldset class="bpart"><legend class="part-title"><span class="tag">' + p.tag + '</span>' + p.title + '</legend>' +
              p.fields.map(function (no) {
                return '<section class="bf" id="bf-' + no + '" aria-labelledby="bf-h-' + no + '">' +
                  '<header class="bf-head"><span class="no ltr" aria-hidden="true">' + no + '</span><div>' +
                    '<h2 id="bf-h-' + no + '">' + FIELDS[no].title + ' <span class="bf-state" data-state="' + no + '"></span></h2>' +
                    '<p class="hint">' + FIELDS[no].hint + '</p></div></header>' +
                  builderFieldControls(no, ex) + '</section>';
              }).join('') + '</fieldset>';
          }).join('') +
        '</form>' +
        '<div class="preview-col">' +
          '<section class="quality no-print" aria-labelledby="q-h"><h2 id="q-h">בדיקת איכות</h2>' +
            '<ul class="q-auto" id="q-auto"></ul>' +
            '<p class="q-sub">ובדיקה עצמית:</p>' +
            checkInput('checks.active', 'בצעדים הסטודנטים עושים משהו, לא רק צופים') +
            checkInput('checks.errorPlan', 'ברור מה הסטודנט עושה כשה-AI טועה') +
          '</section>' +
          '<section class="preview" aria-labelledby="pv-h">' +
            '<div class="preview-head no-print"><h2 id="pv-h">תצוגה מקדימה</h2>' +
              '<div class="preview-actions">' +
                '<button type="button" class="btn btn-primary" id="b-word">' + ICON_DOC + 'הורדה ל-Word</button>' +
                '<button type="button" class="btn" id="b-print">' + ICON_PRINT + 'הדפסה / PDF</button>' +
                '<button type="button" class="btn" id="b-copy">' + ICON_COPY + 'העתקת טקסט</button>' +
              '</div></div>' +
            '<div class="print-only print-title"><p class="eyebrow">כרטיס דגם הוראה</p></div>' +
            '<article class="sheet sheet-preview" id="b-sheet" aria-live="off"></article>' +
            '<div class="send-box no-print"><h3>סיימתם?</h3><p>הורידו את הכרטיס ל-Word ושלחו אותו למרכז לקידום הוראה. כך הוא יתווסף לאתר ועמיתים יוכלו לאמץ אותו.</p>' +
              '<p class="placeholder">פרטי הקשר של המרכז יתווספו כאן.</p></div>' +
            '<button type="button" class="btn btn-quiet no-print" id="b-clear">מחיקת הטיוטה והתחלה מחדש</button>' +
          '</section>' +
        '</div>' +
      '</div>';

    var builder = document.getElementById('builder');
    var onEdit = function (e) {
      var el = e.target;
      var path = el.getAttribute && el.getAttribute('data-path');
      if (!path) return;
      var value = el.type === 'checkbox' ? el.checked : el.hasAttribute('data-lines')
        ? el.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : el.value;
      setPath(state.draft, path, value);
      saveDraft();
      updateBuilder();
    };
    builder.addEventListener('input', onEdit);
    builder.addEventListener('change', onEdit);

    view.querySelectorAll('[data-jump]').forEach(function (b) {
      b.addEventListener('click', function () {
        var sec = document.getElementById('bf-' + b.getAttribute('data-jump'));
        sec.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        var first = sec.querySelector('input, textarea, select');
        if (first) first.focus({ preventScroll: true });
      });
    });
    document.getElementById('b-jump').addEventListener('click', function () {
      var pv = document.getElementById('pv-h');
      pv.scrollIntoView({ block: 'start' });
      pv.setAttribute('tabindex', '-1');
      pv.focus({ preventScroll: true });
    });
    document.getElementById('b-word').addEventListener('click', function () { downloadWord(state.draft); });
    document.getElementById('b-print').addEventListener('click', function () { window.print(); });
    document.getElementById('b-copy').addEventListener('click', function () { copyText(state.draft); });
    document.getElementById('b-clear').addEventListener('click', function () {
      if (!window.confirm('למחוק את הטיוטה? לא ניתן לשחזר אותה.')) return;
      removeKey(DRAFT_KEY);
      state.draft = null;
      if (location.hash === '#build') route(); else location.hash = '#build';
      announce('הטיוטה נמחקה.');
    });

    updateBuilder();
  }

  function updateBuilder() {
    var c = state.draft;
    var done = 0;
    for (var no = 1; no <= 10; no++) {
      var ok = fieldDone(no, c);
      if (ok) done++;
      var st = view.querySelector('[data-state="' + no + '"]');
      if (st) st.textContent = ok ? '· מולא' : '';
      var ms = view.querySelector('[data-jump="' + no + '"]');
      if (ms) { ms.classList.toggle('done', ok); ms.setAttribute('aria-label', 'שדה ' + no + ': ' + FIELDS[no].title + (ok ? ', מולא' : '')); }
    }
    document.getElementById('b-progress').textContent = done + ' מתוך 10 שדות מולאו';

    var echoAi = view.querySelector('[data-echo="ai"]');
    if (echoAi) echoAi.textContent = aiSentence(c) ? 'מה שכתבתם בשדה 4: ' + aiSentence(c) : 'כדאי למלא קודם את תרומת ה-AI בשדה 4. הכלי צריך לשרת אותה.';
    var echoGoals = view.querySelector('[data-echo="goals"]');
    if (echoGoals) echoGoals.textContent = has(c.goals) ? 'המטרות שכתבתם בשדה 4: ' + list(c.goals).join('; ') : 'כדאי למלא קודם את המטרות בשדה 4. העוגן צריך לבדוק אותן.';

    var q = qualityItems(c).concat([
      { ok: !!c.checks.aligned, text: 'העוגן בודק את מטרת הלמידה (שדה 8)' }
    ]);
    document.getElementById('q-auto').innerHTML = q.map(function (i) {
      return '<li class="' + (i.ok ? 'ok' : '') + '"><span class="q-dot" aria-hidden="true">' + (i.ok ? ICON_CHECK : '') + '</span><span>' + i.text +
        '<span class="sr-only">' + (i.ok ? ', תקין' : ', עוד לא') + '</span></span></li>';
    }).join('');

    document.getElementById('b-sheet').innerHTML =
      '<h2 class="preview-title">' + (has(c.title) ? esc(c.title) : '<span class="empty-val">שם הדגם</span>') + '</h2>' + sheetHtml(c, { compact: true });
  }

  /* ---------- checklist ---------- */
  function totalItems() {
    return data.checklist.groups.reduce(function (n, g) { return n + g.items.length; }, 0);
  }
  function groupDone(g) {
    return g.items.filter(function (_, i) { return state.checked.has(g.id + ':' + i); }).length;
  }
  function allDone() {
    return data.checklist.groups.reduce(function (n, g) { return n + groupDone(g); }, 0);
  }
  function saveChecked() { writeJSON(CHECKLIST_KEY, Array.from(state.checked)); }

  function renderChecklist() {
    var cl = data.checklist;
    var stations = cl.groups.map(function (g, i) {
      return '<li><button type="button" class="station" data-station="' + i + '" id="st-' + i + '" aria-controls="station-panel">' +
        '<span class="dot"><span class="ltr" data-count="' + i + '"></span></span>' +
        '<span class="lbl">' + esc(g.short) + '</span>' +
        '<span class="sr-only" data-sr="' + i + '"></span></button></li>';
    }).join('');

    view.innerHTML =
      '<section class="band page-head"><div class="wrap">' +
        '<p class="eyebrow">כלי למרצים · נשמר רק בדפדפן שלכם</p>' +
        '<h1>' + esc(cl.title) + '</h1>' +
        '<p>' + esc(cl.intro) + '</p>' +
        '<div class="progress-row">' +
          '<div><div class="big-pct"><span class="ltr" id="pct">0<small>%</small></span></div></div>' +
          '<div><div class="progress-meta" id="pct-meta"></div><div class="meter" aria-hidden="true"><i id="meter"></i></div></div>' +
        '</div>' +
        '<ol class="stations" aria-label="תחנות הצ׳קליסט">' + stations + '</ol>' +
        '<div style="height:28px"></div>' +
      '</div></section>' +
      '<div class="wrap">' +
        '<section class="station-panel" id="station-panel" aria-labelledby="panel-title"></section>' +
        '<div class="done-msg" id="done-msg" hidden>' + ICON_CHECK + '<span>כל ' + totalItems() + ' הסעיפים מסומנים. הקורס מוכן לפתיחת השנה.</span></div>' +
        '<div class="tools-row">' +
          '<button type="button" class="btn" id="print-cl">' + ICON_PRINT + 'הדפסה / שמירה כ-PDF</button>' +
          '<button type="button" class="btn" id="clear-cl">ניקוי סימונים</button>' +
        '</div>' +
        '<div class="print-only" id="print-list"></div>' +
        '<section class="contact" aria-labelledby="contact-h"><h2 id="contact-h">' + esc(cl.contact.title) + '</h2>' +
          '<p class="placeholder">' + esc(cl.contact.placeholder) + '</p></section>' +
      '</div>';

    view.querySelectorAll('.station').forEach(function (b) {
      b.addEventListener('click', function () {
        state.station = Number(b.getAttribute('data-station'));
        renderPanel();
        updateProgress();
      });
    });
    document.getElementById('print-cl').addEventListener('click', function () { window.print(); });
    document.getElementById('clear-cl').addEventListener('click', function () {
      if (!state.checked.size) { announce('אין סימונים לנקות.'); return; }
      state.checked.clear();
      saveChecked();
      renderPanel();
      updateProgress();
      announce('כל הסימונים נוקו.');
    });

    lastComplete = allDone() === totalItems();
    renderPanel();
    updateProgress();
  }

  function renderPanel() {
    var cl = data.checklist;
    var i = state.station;
    var g = cl.groups[i];
    var panel = document.getElementById('station-panel');
    var items = g.items.map(function (text, j) {
      var id = g.id + ':' + j;
      var domId = 'it-' + g.id + '-' + j;
      return '<li class="item"><input type="checkbox" id="' + domId + '" data-id="' + id + '"' + (state.checked.has(id) ? ' checked' : '') + '>' +
        '<label for="' + domId + '"><span class="box">' + ICON_CHECK + '</span><span>' + esc(text) + '</span></label></li>';
    }).join('');

    var prev = i > 0
      ? '<button type="button" class="btn" data-go="' + (i - 1) + '">' + ICON_BACK + 'לתחנה הקודמת</button>' : '';
    var next = i < cl.groups.length - 1
      ? '<button type="button" class="btn btn-primary" data-go="' + (i + 1) + '">לתחנה הבאה: ' + esc(cl.groups[i + 1].title) + ICON_NEXT + '</button>' : '';

    panel.innerHTML =
      '<div class="panel-head"><div><p class="eyebrow">תחנה <span class="ltr">' + (i + 1) + '</span> מתוך <span class="ltr">' + cl.groups.length + '</span></p>' +
        '<h2 id="panel-title">' + esc(g.title) + '</h2></div>' +
        '<span class="panel-count" id="panel-count"></span></div>' +
      '<ul class="items">' + items + '</ul>' +
      '<div class="panel-nav">' + prev + '<span class="spacer"></span>' + next + '</div>';

    panel.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = cb.getAttribute('data-id');
        if (cb.checked) state.checked.add(id); else state.checked.delete(id);
        saveChecked();
        if (updateProgress()) return;
        announce('תחנה ' + g.title + ': ' + groupDone(g) + ' מתוך ' + g.items.length + '. מוכנות כוללת ' + pctValue() + ' אחוז.');
      });
    });
    panel.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.station = Number(b.getAttribute('data-go'));
        renderPanel();
        updateProgress();
        var t = document.getElementById('panel-title');
        t.setAttribute('tabindex', '-1');
        t.focus();
      });
    });
  }

  function pctValue() { return Math.round((allDone() / totalItems()) * 100); }

  var lastComplete = false;
  function updateProgress() {
    var cl = data.checklist;
    var total = totalItems();
    var done = allDone();
    var pct = pctValue();

    document.getElementById('pct').innerHTML = pct + '<small>%</small>';
    document.getElementById('pct-meta').textContent = 'מוכנות כוללת: ' + done + ' מתוך ' + total + ' סעיפים';
    document.getElementById('meter').style.width = pct + '%';

    cl.groups.forEach(function (g, i) {
      var d = groupDone(g);
      var btn = document.getElementById('st-' + i);
      btn.classList.toggle('done', d === g.items.length);
      btn.classList.toggle('partial', d > 0 && d < g.items.length);
      if (i === state.station) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
      view.querySelector('[data-count="' + i + '"]').textContent = d + '/' + g.items.length;
      view.querySelector('[data-sr="' + i + '"]').textContent = ', ' + g.title + ', ' + d + ' מתוך ' + g.items.length + ' מסומנים';
    });

    var g = cl.groups[state.station];
    var pc = document.getElementById('panel-count');
    if (pc) pc.innerHTML = '<span class="ltr">' + groupDone(g) + '/' + g.items.length + '</span> מסומנים';

    var complete = done === total;
    document.getElementById('done-msg').hidden = !complete;
    var justCompleted = complete && !lastComplete;
    if (justCompleted) announce('כל ' + total + ' הסעיפים מסומנים. הקורס מוכן לפתיחת השנה.');
    lastComplete = complete;

    document.getElementById('print-list').innerHTML =
      '<p><strong>מוכנות: ' + done + ' מתוך ' + total + ' (' + pct + '%)</strong></p>' +
      cl.groups.map(function (grp, gi) {
        return '<div class="print-group"><h2>' + (gi + 1) + '. ' + esc(grp.title) + ' (' + groupDone(grp) + '/' + grp.items.length + ')</h2><ul>' +
          grp.items.map(function (t, j) {
            return '<li>' + (state.checked.has(grp.id + ':' + j) ? '☑' : '☐') + ' ' + esc(t) + '</li>';
          }).join('') + '</ul></div>';
      }).join('');

    return justCompleted;
  }

  /* ---------- boot ---------- */
  function showLoadError() {
    view.innerHTML = '<div class="wrap"><div class="error-box"><h1>לא הצלחנו לטעון את התוכן</h1>' +
      '<p>האתר קורא את הקבצים <span class="ltr">models.json</span> ו-<span class="ltr">checklist.json</span>. ' +
      'כשפותחים את <span class="ltr">index.html</span> בלחיצה כפולה הדפדפן חוסם את הקריאה, ולכן צריך לפתוח את האתר דרך שרת אינטרנט.</p></div></div>';
  }

  Promise.all([
    fetch('models.json').then(function (r) { if (!r.ok) throw new Error(); return r.json(); }),
    fetch('checklist.json').then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
  ]).then(function (res) {
    data.models = res[0];
    data.checklist = res[1];
    route();
    afterNavigate(true);
    window.addEventListener('hashchange', function () { route(); afterNavigate(false); });
  }).catch(function (e) { console.error(e); showLoadError(); });
})();
