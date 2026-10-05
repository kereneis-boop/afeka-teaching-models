(function () {
  'use strict';

  var MODELS = window.AFEKA_MODELS || [];
  var CHECKLIST = window.AFEKA_CHECKLIST || { groups: [] };
  var ANS_KEY = 'afeka-readiness-v2';

  var main = document.getElementById('main');
  var announcer = document.getElementById('announcer');
  var state = { field: '', homeScroll: 0, answers: readJSON(ANS_KEY, {}) };

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
    if (m.status === 'planned') return '<span class="tag tag-planned">יועבר בכיתה בתשפ״ז</span>';
    if (m.status === 'partial') return '<span class="tag tag-ran">הועבר בחלקו בכיתה</span>';
    return '<span class="tag tag-ran">הועבר בכיתה</span>';
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
        '<h2 class="blocks small"><span class="b1">הקורס שלכם מוכן לסמסטר?</span><span class="b2">' + CHECKLIST.stages.length + ' שלבים, ' + totalItems() + ' שאלות.</span></h2>' +
        '<a class="pill" href="#/checklist">לבדיקת המוכנות ' + ICON_NEXT + '</a>' +
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
        '<p class="byline">' + esc(m.people) + ' · ' + statusTag(m) + '</p>' +
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

  /* ---------- readiness: stages in time, three answers per item ---------- */
  var ANSWERS = [
    { key: 'ready', label: 'מוכן' },
    { key: 'doing', label: 'בעבודה' },
    { key: 'na', label: 'לא רלוונטי' }
  ];
  function allItems() {
    var out = [];
    CHECKLIST.stages.forEach(function (s) { s.items.forEach(function (it) { out.push({ stage: s, item: it }); }); });
    return out;
  }
  function totalItems() { return allItems().length; }
  function isClosed(id) { var a = state.answers[id]; return a === 'ready' || a === 'na'; }
  function stageClosed(s) { return s.items.filter(function (it) { return isClosed(it.id); }).length; }
  function modelTitle(id) {
    var t = '';
    MODELS.forEach(function (m) { if (m.id === id) t = m.title; });
    return t;
  }

  function renderChecklist() {
    main.innerHTML =
      '<div class="doc readiness">' +
        '<p class="kicker">רשימת מוכנות למרצים · תשפ״ז</p>' +
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
              return '<li class="ritem" id="ri-' + it.id + '">' +
                '<p class="rtext" id="rt-' + it.id + '">' + txt(it.text) + '</p>' +
                (it.model && modelTitle(it.model) ? '<a class="idea no-print" href="#/model/' + encodeURIComponent(it.model) + '">רעיון מהפיילוט: ' + txt(modelTitle(it.model)) + '</a>' : '') +
                '<div class="seg" role="radiogroup" aria-labelledby="rt-' + it.id + '">' + ANSWERS.map(function (a) {
                  var dom = 'a-' + it.id + '-' + a.key;
                  return '<input type="radio" name="ans-' + it.id + '" id="' + dom + '" value="' + a.key + '"' + (state.answers[it.id] === a.key ? ' checked' : '') + '>' +
                    '<label for="' + dom + '" class="seg-' + a.key + '">' + a.label + '</label>';
                }).join('') + '</div>' +
                '<span class="print-ans" id="pa-' + it.id + '"></span>' +
              '</li>';
            }).join('') + '</ul></section>';
        }).join('') +

        '<section class="todo" aria-labelledby="todo-h">' +
          '<h2 id="todo-h">מה נשאר לי</h2>' +
          '<p class="todo-sum" id="todo-sum" aria-live="polite"></p>' +
          '<div id="todo-list"></div>' +
          '<div class="todo-actions no-print">' +
            '<button type="button" class="pill" id="print">הדפסת הרשימה</button>' +
            '<button type="button" class="link-btn" id="clear">להתחיל מחדש</button>' +
          '</div>' +
        '</section>' +

        '<section class="contact"><h2>' + txt(CHECKLIST.contact.title) + '</h2><p>' + txt(CHECKLIST.contact.placeholder) + '</p></section>' +
      '</div>';

    main.querySelectorAll('.seg input').forEach(function (r) {
      r.addEventListener('change', function () {
        var id = r.name.slice(4);
        state.answers[id] = r.value;
        writeJSON(ANS_KEY, state.answers);
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
      if (!Object.keys(state.answers).length) { announce('אין עדיין תשובות.'); return; }
      if (!window.confirm('למחוק את כל התשובות ולהתחיל מחדש?')) return;
      state.answers = {};
      writeJSON(ANS_KEY, state.answers);
      main.querySelectorAll('.seg input').forEach(function (r) { r.checked = false; });
      updateChecklist(null);
      announce('התשובות נמחקו.');
    });
    updateChecklist(null);
  }

  function updateChecklist(changedId) {
    var labels = { ready: 'מוכן', doing: 'בעבודה', na: 'לא רלוונטי' };
    CHECKLIST.stages.forEach(function (s) {
      var closed = stageClosed(s);
      document.getElementById('sc-' + s.id).textContent = closed + '/' + s.items.length;
      document.getElementById('sd-' + s.id).hidden = closed !== s.items.length;
      s.items.forEach(function (it) {
        var a = state.answers[it.id];
        document.getElementById('ri-' + it.id).setAttribute('data-ans', a || 'none');
        document.getElementById('pa-' + it.id).textContent = a ? labels[a] : 'לא סומן';
      });
    });

    var open = allItems().filter(function (x) { return !isClosed(x.item.id); });
    var total = totalItems();
    var sum = document.getElementById('todo-sum');
    var listEl = document.getElementById('todo-list');
    if (!open.length) {
      sum.textContent = 'הכול סגור. הקורס מוכן לסמסטר.';
      sum.classList.add('all-done');
      listEl.innerHTML = '';
    } else {
      sum.classList.remove('all-done');
      sum.textContent = (total - open.length) + ' מתוך ' + total + ' סעיפים סגורים. נשארו ' + open.length + ':';
      var byStage = {};
      open.forEach(function (x) { (byStage[x.stage.id] = byStage[x.stage.id] || { stage: x.stage, items: [] }).items.push(x.item); });
      listEl.innerHTML = Object.keys(byStage).map(function (k) {
        var g = byStage[k];
        return '<h3>' + txt(g.stage.title) + '</h3><ul>' + g.items.map(function (it) {
          return '<li>' + (state.answers[it.id] === 'doing' ? '<span class="doing-tag">בעבודה</span> ' : '') + txt(it.text) + '</li>';
        }).join('') + '</ul>';
      }).join('');
    }
    if (changedId) {
      var stageOf = null;
      CHECKLIST.stages.forEach(function (s) { s.items.forEach(function (it) { if (it.id === changedId) stageOf = s; }); });
      announce(!open.length ? 'הכול סגור. הקורס מוכן לסמסטר.'
        : stageOf && stageClosed(stageOf) === stageOf.items.length ? 'השלב "' + stageOf.title + '" הושלם. נשארו ' + open.length + ' סעיפים.'
        : 'נשארו ' + open.length + ' סעיפים פתוחים.');
    }
  }

  /* ---------- boot ---------- */
  window.addEventListener('hashchange', function () { route(false); });
  route(true);
})();
