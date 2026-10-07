(function () {
  'use strict';

  var MODELS = window.AFEKA_MODELS || [];
  var CHECKLIST = window.AFEKA_CHECKLIST || { groups: [] };
  var CHECK_KEY = 'afeka-checklist-v3';

  var main = document.getElementById('main');
  var announcer = document.getElementById('announcer');
  var state = { field: '', homeScroll: 0, checked: readJSON(CHECK_KEY, {}) };

  var ICON_BACK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m6-6-6 6 6 6"/></svg>';
  var ICON_OUT = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14 5h5v5M19 5l-8 8M10 5H5v14h14v-5"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="m5 12 5 5 9-10"/></svg>';

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Text content: escape, and keep a Hebrew prefix glued to a Latin word ("ה-AI") so lines never break at the hyphen.
  function txt(s) {
    return esc(s).replace(/([א-ת]{1,2}-[A-Za-z][A-Za-z0-9]*)/g, '<span class="nw">$1</span>');
  }
  function announce(msg) {
    announcer.textContent = '';
    setTimeout(function () { announcer.textContent = msg; }, 40);
  }
  function readJSON(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function copyText(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'הועתק';
      announce('הטקסט הועתק.');
      setTimeout(function () { btn.textContent = old; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }
  // Status comes from the pilot tracking sheet: delivered in class, or scheduled for next year.
  function statusTag(m) {
    // Three looks: solid + check (delivered), outline + half circle (partly), lime + clock (next year).
    var icon = {
      ran: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="m3.5 8.5 3 3 6-7"/></svg>',
      partial: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/></svg>',
      planned: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 4.8V8l2.2 1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    };
    var s = m.status === 'planned' || m.status === 'partial' ? m.status : 'ran';
    var label = { ran: 'הועבר בכיתה', partial: 'הועבר בחלקו בכיתה', planned: 'יועבר בכיתה בתשפ״ז' }[s];
    return '<span class="tag status status-' + s + '">' + icon[s] + label + '</span>';
  }
  function ranCount() {
    return MODELS.filter(function (m) { return m.status !== 'planned'; }).length;
  }
  function takeCount() {
    return MODELS.reduce(function (n, m) { return n + m.take.length; }, 0);
  }
  function fieldsWithCounts() {
    var counts = {};
    MODELS.forEach(function (m) { counts[m.field] = (counts[m.field] || 0) + 1; });
    return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b, 'he'); })
      .map(function (f) { return { name: f, count: counts[f] }; });
  }

  /* ---------- routing ---------- */
  var current = '';
  function parse() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    if (h === 'checklist') return { page: 'checklist' };
    if (h.indexOf('model/') === 0) return { page: 'model', id: h.slice(6) };
    return { page: 'home' };
  }
  function route(initial) {
    if (current === 'home') state.homeScroll = window.scrollY;
    var r = parse();
    current = r.page;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === (r.page === 'checklist' ? 'checklist' : 'models');
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (r.page === 'checklist') renderChecklist();
    else if (r.page === 'model') renderModel(r.id);
    else renderHome();

    if (r.page === 'home' && state.homeScroll && !initial) window.scrollTo(0, state.homeScroll);
    else window.scrollTo(0, 0);
    if (!initial) {
      var h1 = main.querySelector('h1');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    }
  }

  /* ---------- home: all models ---------- */
  function renderHome() {
    var fields = fieldsWithCounts();
    main.innerHTML =
      '<section class="intro"><div class="wrap">' +
        '<div class="hero">' +
          '<div class="hero-text">' +
            '<p class="kicker">פיילוט הלומד העצמאי בסיוע <span class="nw">AI</span> · תשפ״ו</p>' +
            '<h1 class="blocks"><span class="b1">' + MODELS.length + ' דגמי הוראה.</span><span class="b2">מהכיתה, לקורס שלכם.</span></h1>' +
            '<p class="lead">מרצים באפקה פיתחו יחידות של למידה עצמאית בסיוע ' + txt('AI') + '. בכל דגם: מה הסטודנטים עשו, מה ' + txt('ה-AI') + ' עשה ומה לא, ומה אפשר לקחת לקורס שלכם.</p>' +
            '<dl class="stats">' +
              '<div><dt>' + MODELS.length + '</dt><dd>דגמי הוראה מהפיילוט</dd></div>' +
              '<div><dt>' + ranCount() + '</dt><dd>כבר הועברו בכיתה</dd></div>' +
              '<div><dt>' + ((window.AFEKA_STATS || {}).lessonPlans || MODELS.length) + '</dt><dd>מערכי שיעור בפיילוט</dd></div>' +
            '</dl>' +
          '</div>' +
          '<div class="hero-art" aria-hidden="true">' + MODELS.slice(0, 3).map(function (m, i) {
            return '<div class="mini mini-' + i + '"><span class="mini-n">0' + (i + 1) + '</span><span class="mini-f">' + esc(m.field) + '</span><span class="mini-t">' + txt(m.title) + '</span></div>';
          }).join('') + '</div>' +
        '</div>' +
      '</div></section>' +

      '<section class="how"><div class="wrap">' +
        '<h2 class="sec-h">איך <span class="hl">משתמשים</span> באתר?</h2>' +
        '<ol class="how-list">' +
          '<li><span class="big-n">01</span><h3>בוחרים דגם</h3><p>מסננים לפי בית ספר ופותחים דגם שנשמע רלוונטי.</p></li>' +
          '<li><span class="big-n">02</span><h3>קוראים בדקה</h3><p>מה הסטודנטים עושים, מה ' + txt('ה-AI') + ' עושה, ואיך בודקים שהלמידה קרתה.</p></li>' +
          '<li><span class="big-n">03</span><h3>לוקחים לקורס</h3><p>מעתיקים את הפרומפטים והחומרים, ומתאימים לפי הטיפים של המרצה.</p></li>' +
        '</ol>' +
      '</div></section>' +

      '<section class="models" id="models"><div class="wrap">' +
        '<h2 class="sec-h">כל <span class="hl">הדגמים</span></h2>' +
        '<div class="chips" role="group" aria-label="סינון לפי בית ספר">' +
          [{ name: '', count: MODELS.length }].concat(fields).map(function (f) {
            return '<button type="button" class="chip" data-field="' + esc(f.name) + '" aria-pressed="' + (state.field === f.name) + '">' +
              (f.name ? esc(f.name) : 'כל בתי הספר') + ' <span class="chip-n">' + f.count + '</span></button>';
          }).join('') +
        '</div>' +
        '<p class="count" id="count" aria-live="polite"></p>' +
        '<ul class="cards" id="cards"></ul>' +
      '</div></section>' +

      '<section class="promo"><div class="wrap promo-row">' +
        '<h2 class="blocks small"><span class="b1">מתכוננים לפתיחת השנה?</span><span class="b2">צ׳קליסט של ' + totalItems() + ' סעיפים.</span></h2>' +
        '<a class="pill" href="#/checklist">לצ׳קליסט ' + ICON_NEXT + '</a>' +
      '</div></section>';

    main.querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () {
        state.field = b.getAttribute('data-field');
        main.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        renderCards();
      });
    });
    renderCards();
  }

  function renderCards() {
    var list = MODELS.filter(function (m) { return !state.field || m.field === state.field; });
    document.getElementById('count').textContent = state.field
      ? list.length + ' דגמים ב' + state.field
      : list.length + ' דגמים';
    document.getElementById('cards').innerHTML = list.map(function (m) {
      var n = MODELS.indexOf(m) + 1;
      return '<li><a class="card" href="#/model/' + encodeURIComponent(m.id) + '">' +
        '<span class="card-top"><span class="card-field">' + esc(m.field) + '</span><span class="big-n" aria-hidden="true">' + (n < 10 ? '0' : '') + n + '</span></span>' +
        '<h3>' + txt(m.title) + '</h3>' + '<p class="card-course">' + txt(String(m.course).replace(/\s*\(.*\)\s*$/, '')) + '</p>' +
        '<p>' + txt(m.summary) + '</p>' +
        statusTag(m) +
        '<span class="card-meta"><span>' + esc(m.people) + '</span><span class="card-go">לדגם ' + ICON_NEXT + '</span></span>' +
      '</a></li>';
    }).join('');
  }

  /* ---------- one model: reads top to bottom ---------- */
  function takeBlock(t, i) {
    if (t.kind === 'link') {
      return '<div class="block"><h3>' + txt(t.title) + '</h3><ul class="links">' + t.links.map(function (l) {
        return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + txt(l.label) + ' ' + ICON_OUT + '<span class="sr-only"> (נפתח בלשונית חדשה)</span></a></li>';
      }).join('') + '</ul></div>';
    }
    var body = t.kind === 'prompt'
      ? '<pre class="prompt" dir="auto">' + esc(t.text) + '</pre>'
      : '<ul>' + t.items.map(function (x) { return '<li>' + txt(x) + '</li>'; }).join('') + '</ul>';
    return '<div class="block"><div class="block-head"><h3>' + txt(t.title) + '</h3>' +
      '<button type="button" class="copy no-print" data-take="' + i + '">העתקה</button></div>' + body + '</div>';
  }
  function takeText(t) {
    return t.kind === 'prompt' ? t.text : t.title + '\n' + t.items.map(function (x) { return '• ' + x; }).join('\n');
  }
  function list(items) {
    return '<ul>' + items.map(function (x) { return '<li>' + txt(x) + '</li>'; }).join('') + '</ul>';
  }

  // Icons for the "at a glance" tiles (outline, 24px grid).
  var GLANCE_ICONS = {
    students: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7M22 21v-1a6 6 0 0 0-4-5.6"/></svg>',
    ai: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    not: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.6 5.6l12.8 12.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 4h6v3H9zM7 5.5H5v15h14v-15h-2M8.5 13.5l2.5 2.5 4.5-5"/></svg>',
    tools: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2.1 2.1 0 0 1-3-3zM6 3l3 3-1.5 1.5-3-3"/></svg>'
  };
  var ICON_MD = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M6 3h8l4 4v14H6zM14 3v4h4M12 10v7m-3-3 3 3 3-3"/></svg>';
  var ICON_COPY = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M9 9h11v11H9zM5 15H4V4h11v1"/></svg>';
  var ICON_PRINT = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>';

  // Student feedback: response count, optional stacked bars per statement, key findings, quotes.
  function feedbackSection(m) {
    var f = m.feedback;
    if (!f) return '';
    var bars = (f.bars || []).map(function (b) {
      var t = b.high + b.some + b.no;
      var pct = function (v) { return (v / t * 100).toFixed(1) + '%'; };
      return '<li class="fb-row"><span class="fb-label">' + txt(b.label) + '</span>' +
        '<span class="fb-bar" aria-hidden="true"><i class="fb-high" style="width:' + pct(b.high) + '"></i><i class="fb-some" style="width:' + pct(b.some) + '"></i><i class="fb-no" style="width:' + pct(b.no) + '"></i></span>' +
        '<span class="fb-nums">' + b.high + ' במידה רבה · ' + b.some + ' במידה מסוימת · ' + b.no + ' לא</span></li>';
    }).join('');
    return '<section class="feedback" aria-labelledby="fb-h"><h2 id="fb-h">משוב הסטודנטים</h2>' +
      '<p class="fb-meta">' + (f.n === 1 ? 'סטודנט אחד ענה' : f.n + ' סטודנטים ענו') + ' · ' + txt(f.source) + '</p>' +
      (bars ? '<ul class="fb-bars">' + bars + '</ul><p class="fb-legend" aria-hidden="true"><i class="fb-high"></i>במידה רבה <i class="fb-some"></i>במידה מסוימת <i class="fb-no"></i>לא</p>' : '') +
      ((f.facts || []).length ? list(f.facts) : '') +
      (f.quotes || []).map(function (q) { return '<blockquote>' + txt(q) + '</blockquote>'; }).join('') +
      '</section>';
  }

  function glanceTile(kind, title, body) {
    return '<div class="g-tile g-' + kind + '"><span class="g-icon">' + GLANCE_ICONS[kind] + '</span>' +
      '<div><h3>' + txt(title) + '</h3><p>' + txt(body) + '</p></div></div>';
  }

  /* ---------- one model as Markdown: for an AI tool, or to keep as a file ---------- */
  function modelMarkdown(m) {
    var L = [];
    var bullets = function (items) { items.forEach(function (x) { L.push('- ' + x); }); };
    L.push('# ' + m.title, '');
    L.push('**' + m.field + '** · ' + m.course + ' · ' + m.people, '');
    L.push(m.summary, '');
    L.push('## בקצרה');
    L.push('- **מה הסטודנטים עושים:** ' + m.students);
    L.push('- **במה ה-AI עוזר:** ' + m.ai);
    L.push('- **מה ה-AI לא עושה:** ' + m.aiNot);
    L.push('- **איך בודקים שהלמידה קרתה:** ' + m.assessment);
    L.push('- **כלים:** ' + m.tools, '');
    L.push('## איך זה עובד');
    m.steps.forEach(function (s, i) { L.push((i + 1) + '. ' + s); });
    L.push('');
    if (m.take.length) {
      L.push('## קחו לקורס שלכם');
      m.take.forEach(function (t) {
        L.push('### ' + t.title);
        if (t.kind === 'prompt') L.push('```', t.text, '```');
        else if (t.kind === 'link') t.links.forEach(function (l) { L.push('- [' + l.label + '](' + l.url + ')'); });
        else bullets(t.items);
        L.push('');
      });
    }
    if (m.worked.length || m.harder.length || m.quotes.length) {
      L.push('## מה למדנו');
      if (m.worked.length) { L.push('### מה עבד'); bullets(m.worked); L.push(''); }
      if (m.harder.length) { L.push('### מה היה קשה, ומה כדאי לדעת'); bullets(m.harder); L.push(''); }
      if (m.quotes.length) { L.push('### מה אמרו הסטודנטים'); m.quotes.forEach(function (q) { L.push('> ' + q, ''); }); }
    }
    if (m.feedback) {
      var f = m.feedback;
      L.push('## משוב הסטודנטים', (f.n === 1 ? 'סטודנט אחד ענה' : f.n + ' סטודנטים ענו') + ' (' + f.source + ')', '');
      (f.bars || []).forEach(function (b) { L.push('- ' + b.label + ': ' + b.high + ' במידה רבה, ' + b.some + ' במידה מסוימת, ' + b.no + ' לא'); });
      bullets(f.facts || []);
      L.push('');
      (f.quotes || []).forEach(function (q) { L.push('> ' + q, ''); });
    }
    L.push('## כדי להתאים לקורס שלכם', m.adapt, '');
    L.push('---', 'מתוך דגמי ההוראה של פיילוט הלומד העצמאי בסיוע AI, המרכז לקידום הוראה, אפקה.');
    return L.join('\n');
  }
  function aiPrompt(m) {
    return 'להלן דגם הוראה מפיילוט באפקה. עזרו לי להתאים אותו לקורס שלי.\n' +
      'הקורס שלי: [שם הקורס, נושא היחידה, שנה ומספר סטודנטים]\n' +
      'מה חשוב לי: [למשל: זמן הכנה קצר, עבודה בכיתה, סוג ההערכה]\n\n' + modelMarkdown(m);
  }
  function downloadText(text, filename) {
    var blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function renderModel(id) {
    var idx = -1;
    MODELS.forEach(function (m, i) { if (m.id === id) idx = i; });
    if (idx < 0) {
      main.innerHTML = '<div class="doc"><h1>הדגם לא נמצא</h1><p class="lead">ייתכן שהקישור ישן או שגוי.</p>' +
        '<p><a class="back" href="#/">' + ICON_BACK + 'לכל הדגמים</a></p></div>';
      return;
    }
    var m = MODELS[idx];
    var prev = idx > 0 ? MODELS[idx - 1] : null;
    var next = idx < MODELS.length - 1 ? MODELS[idx + 1] : null;
    var learned = (m.worked.length || m.harder.length || m.quotes.length)
      ? '<section><h2>מה למדנו</h2>' +
          (m.worked.length ? '<h3>מה עבד</h3>' + list(m.worked) : '') +
          (m.harder.length ? '<h3>מה היה קשה, ומה כדאי לדעת</h3>' + list(m.harder) : '') +
          (m.quotes.length ? '<h3>מה אמרו הסטודנטים</h3>' + m.quotes.map(function (q) { return '<blockquote>' + txt(q) + '</blockquote>'; }).join('') : '') +
        '</section>'
      : '';

    main.innerHTML =
      '<article class="doc">' +
        '<a class="back no-print" href="#/">' + ICON_BACK + 'כל הדגמים</a>' +
        '<p class="kicker">' + esc(m.field) + ' · ' + txt(m.course) + '</p>' +
        '<h1>' + txt(m.title) + '</h1>' +
        '<p class="byline">' + esc(m.people) + ' · ' + statusTag(m) + '</p>' +
        '<p class="lead">' + txt(m.summary) + '</p>' +

        '<section class="glance" aria-labelledby="glance-h"><h2 id="glance-h" class="sr-only">הדגם בקצרה</h2>' +
          '<div class="g-grid">' +
            glanceTile('students', 'מה הסטודנטים עושים', m.students) +
            glanceTile('ai', 'במה ה-AI עוזר', m.ai) +
            glanceTile('not', 'מה ה-AI לא עושה', m.aiNot) +
            glanceTile('check', 'איך בודקים שהלמידה קרתה', m.assessment) +
          '</div>' +
          '<p class="g-tools"><span class="g-tools-label">' + GLANCE_ICONS.tools + 'כלים</span>' +
            String(m.tools).split(/,\s*(?![^()]*\))/).map(function (t) { return '<span class="tool-chip">' + txt(t.trim()) + '</span>'; }).join('') +
          '</p>' +
        '</section>' +

        '<section><h2>איך זה עובד</h2><ol class="steps">' +
          m.steps.map(function (s) { return '<li>' + txt(s) + '</li>'; }).join('') + '</ol></section>' +

        (m.take.length ? '<section class="take"><h2>קחו לקורס שלכם</h2>' + m.take.map(takeBlock).join('') + '</section>' : '') +

        learned +

        feedbackSection(m) +

        '<section class="adapt"><h2>כדי להתאים לקורס שלכם</h2><p>' + txt(m.adapt) + '</p></section>' +

        '<section class="export no-print" aria-labelledby="export-h">' +
          '<h2 id="export-h">לשמור או להמשיך עם AI</h2>' +
          '<p>העתיקו את הדגם עם בקשת התאמה מוכנה, הדביקו בכלי ה-AI שלכם והשלימו את פרטי הקורס. אפשר גם להוריד אותו כקובץ Markdown או להדפיס.</p>' +
          '<div class="export-actions">' +
            '<button type="button" class="pill" id="copy-ai">' + ICON_COPY + '<span class="lbl">העתקה לכלי AI</span></button>' +
            '<button type="button" class="pill pill-ghost" id="dl-md">' + ICON_MD + 'הורדה כקובץ Markdown</button>' +
            '<button type="button" class="pill pill-ghost" id="print">' + ICON_PRINT + 'הדפסה</button>' +
          '</div>' +
        '</section>' +

        // RTL: "previous" sits on the right and points right; "next" sits on the left and points left.
        '<nav class="model-nav no-print" aria-label="מעבר בין דגמים">' +
          (prev ? '<a class="mn-prev" href="#/model/' + encodeURIComponent(prev.id) + '">' + ICON_BACK + '<span><span class="mn-label">הדגם הקודם</span><span class="mn-title">' + txt(prev.title) + '</span></span></a>' : '<span></span>') +
          (next ? '<a class="mn-next" href="#/model/' + encodeURIComponent(next.id) + '"><span><span class="mn-label">הדגם הבא</span><span class="mn-title">' + txt(next.title) + '</span></span>' + ICON_NEXT + '</a>' : '<span></span>') +
        '</nav>' +
      '</article>';

    document.getElementById('print').addEventListener('click', function () { window.print(); });
    document.getElementById('copy-ai').addEventListener('click', function (e) { copyText(aiPrompt(m), e.currentTarget.querySelector('.lbl')); });
    document.getElementById('dl-md').addEventListener('click', function () {
      downloadText(modelMarkdown(m), 'דגם הוראה - ' + String(m.title).replace(/[\\/:*?"<>|]/g, '') + '.md');
      announce('קובץ ה-Markdown ירד למחשב.');
    });
    main.querySelectorAll('.copy').forEach(function (b) {
      b.addEventListener('click', function () { copyText(takeText(m.take[+b.getAttribute('data-take')]), b); });
    });
  }

  /* ---------- checklist: stages in time, one checkbox per item ---------- */
  function allItems() {
    var out = [];
    CHECKLIST.stages.forEach(function (s) { s.items.forEach(function (it) { out.push({ stage: s, item: it }); }); });
    return out;
  }
  function totalItems() { return allItems().length; }
  function isDone(id) { return !!state.checked[id]; }
  function stageDone(s) { return s.items.filter(function (it) { return isDone(it.id); }).length; }
  function modelTitle(id) {
    var t = '';
    MODELS.forEach(function (m) { if (m.id === id) t = m.title; });
    return t;
  }

  function renderChecklist() {
    main.innerHTML =
      '<div class="doc readiness">' +
        '<p class="kicker">לקראת פתיחת שנה״ל תשפ״ז</p>' +
        '<h1>' + txt(CHECKLIST.title) + '</h1>' +
        '<p class="lead">' + txt(CHECKLIST.intro) + '</p>' +
        '<ol class="stage-nav" aria-label="השלבים">' + CHECKLIST.stages.map(function (s, i) {
          return '<li><a href="#st-' + s.id + '" data-jump="' + s.id + '"><span class="sn">0' + (i + 1) + '</span><span class="st">' + txt(s.title) + '</span><span class="sc" id="sc-' + s.id + '"></span></a></li>';
        }).join('') + '</ol>' +

        CHECKLIST.stages.map(function (s, i) {
          return '<section class="stage" id="st-' + s.id + '" tabindex="-1" aria-labelledby="sh-' + s.id + '">' +
            '<header class="stage-head"><span class="big-n" aria-hidden="true">0' + (i + 1) + '</span><div><h2 id="sh-' + s.id + '">' + txt(s.title) + '</h2>' +
              '<p>' + txt(s.note) + '</p></div><span class="stage-done" id="sd-' + s.id + '" hidden>הושלם</span></header>' +
            '<ul class="items">' + s.items.map(function (it) {
              var dom = 'c-' + it.id;
              return '<li class="citem' + (isDone(it.id) ? ' is-done' : '') + '" id="ri-' + it.id + '">' +
                '<input type="checkbox" id="' + dom + '" data-id="' + it.id + '"' + (isDone(it.id) ? ' checked' : '') + '>' +
                '<label for="' + dom + '"><span class="box">' + ICON_CHECK + '</span><span>' + txt(it.text) + '</span></label>' +
                (it.model && modelTitle(it.model) ? '<a class="idea no-print" href="#/model/' + encodeURIComponent(it.model) + '">רעיון מהפיילוט: ' + txt(modelTitle(it.model)) + '</a>' : '') +
              '</li>';
            }).join('') + '</ul></section>';
        }).join('') +

        '<section class="todo" aria-labelledby="todo-h">' +
          '<h2 id="todo-h">מה נשאר לי</h2>' +
          '<p class="todo-sum" id="todo-sum" aria-live="polite"></p>' +
          '<div id="todo-list"></div>' +
          '<div class="todo-actions no-print">' +
            '<button type="button" class="pill" id="print">הדפסה / שמירה כ-PDF</button>' +
            '<button type="button" class="link-btn" id="clear">ניקוי הסימונים</button>' +
          '</div>' +
        '</section>' +

        '<section class="contact"><h2>' + txt(CHECKLIST.contact.title) + '</h2><p>' + txt(CHECKLIST.contact.text) + '</p>' +
          '<p><a class="contact-mail" href="mailto:' + esc(CHECKLIST.contact.email) + '">' + esc(CHECKLIST.contact.email) + '</a></p></section>' +
      '</div>';

    main.querySelectorAll('.citem input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = cb.getAttribute('data-id');
        if (cb.checked) state.checked[id] = true; else delete state.checked[id];
        writeJSON(CHECK_KEY, state.checked);
        updateChecklist(id);
      });
    });
    main.querySelectorAll('[data-jump]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var sec = document.getElementById('st-' + a.getAttribute('data-jump'));
        sec.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        sec.focus({ preventScroll: true });
      });
    });
    document.getElementById('print').addEventListener('click', function () { window.print(); });
    document.getElementById('clear').addEventListener('click', function () {
      if (!Object.keys(state.checked).length) { announce('אין עדיין סימונים.'); return; }
      state.checked = {};
      writeJSON(CHECK_KEY, state.checked);
      main.querySelectorAll('.citem input').forEach(function (cb) { cb.checked = false; });
      updateChecklist(null);
      announce('הסימונים נוקו.');
    });
    updateChecklist(null);
  }

  function updateChecklist(changedId) {
    CHECKLIST.stages.forEach(function (s) {
      var done = stageDone(s);
      document.getElementById('sc-' + s.id).textContent = done + '/' + s.items.length;
      document.getElementById('sd-' + s.id).hidden = done !== s.items.length;
      s.items.forEach(function (it) { document.getElementById('ri-' + it.id).classList.toggle('is-done', isDone(it.id)); });
    });

    var open = allItems().filter(function (x) { return !isDone(x.item.id); });
    var total = totalItems();
    var sum = document.getElementById('todo-sum');
    var listEl = document.getElementById('todo-list');
    if (!open.length) {
      sum.textContent = 'כל הסעיפים מסומנים. הקורס מוכן לפתיחת השנה.';
      sum.classList.add('all-done');
      listEl.innerHTML = '';
    } else {
      sum.classList.remove('all-done');
      sum.textContent = (total - open.length) + ' מתוך ' + total + ' סעיפים מסומנים. נשארו ' + open.length + ':';
      var byStage = {};
      open.forEach(function (x) { (byStage[x.stage.id] = byStage[x.stage.id] || { stage: x.stage, items: [] }).items.push(x.item); });
      listEl.innerHTML = Object.keys(byStage).map(function (k) {
        var g = byStage[k];
        return '<h3>' + txt(g.stage.title) + '</h3><ul>' + g.items.map(function (it) { return '<li>' + txt(it.text) + '</li>'; }).join('') + '</ul>';
      }).join('');
    }
    if (changedId) {
      var stageOf = null;
      CHECKLIST.stages.forEach(function (s) { s.items.forEach(function (it) { if (it.id === changedId) stageOf = s; }); });
      announce(!open.length ? 'כל הסעיפים מסומנים. הקורס מוכן לפתיחת השנה.'
        : stageOf && stageDone(stageOf) === stageOf.items.length ? 'השלב "' + stageOf.title + '" הושלם. נשארו ' + open.length + ' סעיפים.'
        : 'נשארו ' + open.length + ' סעיפים.');
    }
  }

  /* ---------- boot ---------- */
  window.addEventListener('hashchange', function () { route(false); });
  route(true);
})();
