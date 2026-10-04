(function () {
  'use strict';

  var MODELS = window.AFEKA_MODELS || [];
  var CHECKLIST = window.AFEKA_CHECKLIST || { groups: [] };
  var CHECK_KEY = 'afeka-checklist-tashpaz-v1';

  var main = document.getElementById('main');
  var announcer = document.getElementById('announcer');
  var state = { field: '', homeScroll: 0, checked: new Set(readJSON(CHECK_KEY, [])) };

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
            '<p class="lead">מרצים באפקה ניסו בכיתה למידה עצמאית בסיוע ' + txt('AI') + '. בכל דגם: מה הסטודנטים עשו, מה ' + txt('ה-AI') + ' עשה ומה לא, ומה אפשר לקחת לקורס שלכם.</p>' +
            '<dl class="stats">' +
              '<div><dt>' + MODELS.length + '</dt><dd>דגמים שנוסו בכיתה</dd></div>' +
              '<div><dt>' + fields.length + '</dt><dd>תחומי הנדסה ושפה</dd></div>' +
              '<div><dt>' + takeCount() + '</dt><dd>פרומפטים וכלים להעתקה</dd></div>' +
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
          '<li><span class="big-n">01</span><h3>בוחרים דגם</h3><p>מסננים לפי תחום ופותחים דגם שנשמע רלוונטי.</p></li>' +
          '<li><span class="big-n">02</span><h3>קוראים בדקה</h3><p>מה הסטודנטים עושים, מה ' + txt('ה-AI') + ' עושה, ואיך בודקים שהלמידה קרתה.</p></li>' +
          '<li><span class="big-n">03</span><h3>לוקחים לקורס</h3><p>מעתיקים את הפרומפטים והחומרים, ומתאימים לפי הטיפים של המרצה.</p></li>' +
        '</ol>' +
      '</div></section>' +

      '<section class="models" id="models"><div class="wrap">' +
        '<h2 class="sec-h">כל <span class="hl">הדגמים</span></h2>' +
        '<div class="chips" role="group" aria-label="סינון לפי תחום">' +
          [{ name: '', count: MODELS.length }].concat(fields).map(function (f) {
            return '<button type="button" class="chip" data-field="' + esc(f.name) + '" aria-pressed="' + (state.field === f.name) + '">' +
              (f.name ? esc(f.name) : 'כל התחומים') + ' <span class="chip-n">' + f.count + '</span></button>';
          }).join('') +
        '</div>' +
        '<p class="count" id="count" aria-live="polite"></p>' +
        '<ul class="cards" id="cards"></ul>' +
      '</div></section>' +

      '<section class="promo"><div class="wrap promo-row">' +
        '<h2 class="blocks small"><span class="b1">מתכוננים לפתיחת השנה?</span><span class="b2">' + totalItems() + ' סעיפים, רשימה אחת.</span></h2>' +
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
        '<h3>' + txt(m.title) + '</h3>' +
        '<p>' + txt(m.summary) + '</p>' +
        (m.status === 'planned' ? '<span class="tag">מתוכנן לשנה הקרובה</span>' : '') +
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

  function renderModel(id) {
    var idx = -1;
    MODELS.forEach(function (m, i) { if (m.id === id) idx = i; });
    if (idx < 0) {
      main.innerHTML = '<div class="doc"><h1>הדגם לא נמצא</h1><p class="lead">ייתכן שהקישור ישן או שגוי.</p>' +
        '<p><a class="back" href="#/">' + ICON_BACK + 'לכל הדגמים</a></p></div>';
      return;
    }
    var m = MODELS[idx];
    var next = MODELS[(idx + 1) % MODELS.length];
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
        '<p class="byline">' + esc(m.people) + (m.status === 'planned' ? ' · <span class="tag">מתוכנן לשנה הקרובה</span>' : '') + '</p>' +
        '<p class="lead">' + txt(m.summary) + '</p>' +

        '<dl class="brief">' +
          '<div><dt>הסטודנטים</dt><dd>' + txt(m.students) + '</dd></div>' +
          '<div><dt>' + txt('ה-AI') + '</dt><dd>' + txt(m.ai) + '</dd></div>' +
          '<div><dt>ומה לא</dt><dd>' + txt(m.aiNot) + '</dd></div>' +
          '<div><dt>איך בודקים</dt><dd>' + txt(m.assessment) + '</dd></div>' +
          '<div><dt>כלים</dt><dd>' + txt(m.tools) + '</dd></div>' +
        '</dl>' +

        '<section><h2>איך זה עובד</h2><ol class="steps">' +
          m.steps.map(function (s) { return '<li>' + txt(s) + '</li>'; }).join('') + '</ol></section>' +

        (m.take.length ? '<section class="take"><h2>קחו לקורס שלכם</h2>' + m.take.map(takeBlock).join('') + '</section>' : '') +

        learned +

        '<section class="adapt"><h2>כדי להתאים לקורס שלכם</h2><p>' + txt(m.adapt) + '</p></section>' +

        '<div class="doc-end no-print">' +
          '<button type="button" class="link-btn" id="print">הדפסה</button>' +
          '<a class="next" href="#/model/' + encodeURIComponent(next.id) + '"><span class="next-label">הדגם הבא</span><span class="next-title">' + txt(next.title) + '</span>' + ICON_NEXT + '</a>' +
        '</div>' +
      '</article>';

    document.getElementById('print').addEventListener('click', function () { window.print(); });
    main.querySelectorAll('.copy').forEach(function (b) {
      b.addEventListener('click', function () { copyText(takeText(m.take[+b.getAttribute('data-take')]), b); });
    });
  }

  /* ---------- checklist: one list ---------- */
  function totalItems() { return CHECKLIST.groups.reduce(function (n, g) { return n + g.items.length; }, 0); }
  function groupDone(g) { return g.items.filter(function (_, i) { return state.checked.has(g.id + ':' + i); }).length; }

  function renderChecklist() {
    main.innerHTML =
      '<div class="doc">' +
        '<p class="kicker">לקראת פתיחת שנה״ל תשפ״ז</p>' +
        '<h1>' + txt(CHECKLIST.title) + '</h1>' +
        '<p class="lead">' + txt(CHECKLIST.intro) + ' הסימונים נשמרים רק בדפדפן שלכם.</p>' +
        '<div class="progress" aria-hidden="true"><div class="bar"><i id="bar"></i></div><p id="progress-text"></p></div>' +
        CHECKLIST.groups.map(function (g) {
          return '<section class="group"><h2><span>' + txt(g.title) + '</span> <span class="gcount" id="gc-' + g.id + '"></span></h2><ul class="checks">' +
            g.items.map(function (t, i) {
              var id = g.id + ':' + i, dom = 'c-' + g.id + '-' + i;
              return '<li><input type="checkbox" id="' + dom + '" data-id="' + id + '"' + (state.checked.has(id) ? ' checked' : '') + '>' +
                '<label for="' + dom + '"><span class="box">' + ICON_CHECK + '</span><span>' + txt(t) + '</span></label></li>';
            }).join('') + '</ul></section>';
        }).join('') +
        '<p class="done" id="done" hidden>כל הסעיפים מסומנים. הקורס מוכן לפתיחת השנה.</p>' +
        '<div class="doc-end no-print">' +
          '<button type="button" class="link-btn" id="print">הדפסה / שמירה כ-PDF</button>' +
          '<button type="button" class="link-btn" id="clear">ניקוי הסימונים</button>' +
        '</div>' +
        '<section class="contact"><h2>' + txt(CHECKLIST.contact.title) + '</h2><p>' + txt(CHECKLIST.contact.placeholder) + '</p></section>' +
      '</div>';

    main.querySelectorAll('.checks input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = cb.getAttribute('data-id');
        if (cb.checked) state.checked.add(id); else state.checked.delete(id);
        writeJSON(CHECK_KEY, Array.from(state.checked));
        updateChecklist(true);
      });
    });
    document.getElementById('print').addEventListener('click', function () { window.print(); });
    document.getElementById('clear').addEventListener('click', function () {
      state.checked.clear();
      writeJSON(CHECK_KEY, []);
      main.querySelectorAll('.checks input').forEach(function (cb) { cb.checked = false; });
      updateChecklist(false);
      announce('הסימונים נוקו.');
    });
    updateChecklist(false);
  }

  function updateChecklist(speak) {
    var total = totalItems();
    var done = CHECKLIST.groups.reduce(function (n, g) { return n + groupDone(g); }, 0);
    var pct = total ? Math.round(done / total * 100) : 0;
    document.getElementById('bar').style.width = pct + '%';
    document.getElementById('progress-text').innerHTML = '<strong>' + pct + '%</strong> מוכן · ' + done + ' מתוך ' + total + ' סעיפים';
    CHECKLIST.groups.forEach(function (g) {
      document.getElementById('gc-' + g.id).textContent = groupDone(g) + '/' + g.items.length;
    });
    var complete = done === total;
    document.getElementById('done').hidden = !complete;
    if (speak) announce(complete ? 'כל הסעיפים מסומנים. הקורס מוכן לפתיחת השנה.' : done + ' מתוך ' + total + ' סעיפים מסומנים.');
  }

  /* ---------- boot ---------- */
  window.addEventListener('hashchange', function () { route(false); });
  route(true);
})();
