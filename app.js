/* Mon Chinois HSK 1 — app de révision (vanilla JS, hors ligne). */
(function () {
  "use strict";
  const C = window.COURSE;
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n) => shuffle(a).slice(0, n);
  const DAY = 86400000;

  /* ---------- stockage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("zh1." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("zh1." + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
  };
  const S = {
    settings: Object.assign({ chapters: [1, 2, 3, 4, 5, 6, 7], pinyin: true, french: true, rate: 0.8, newPerDay: 20, dir: "zh" }, store.get("settings", {})),
    srs: store.get("srs", {}),
    exo: store.get("exo", {}),
    mistakes: store.get("mistakes", {}),
    log: store.get("log", {}),
  };
  const save = (k) => store.set(k, S[k]);
  function today() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function logAnswer(ok) { const t = today(); S.log[t] = S.log[t] || { n: 0, ok: 0 }; S.log[t].n++; if (ok) S.log[t].ok++; save("log"); }
  function streak() { let n = 0; const d = new Date(); for (;;) { const k = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); if (S.log[k]) { n++; d.setDate(d.getDate() - 1); } else break; } return n; }

  /* ---------- données dérivées ---------- */
  const LES = C.lessons;
  const byN = {}; LES.forEach((l) => (byN[l.n] = l));
  const ALLWORDS = [];
  LES.forEach((l) => l.vocab.forEach((v, i) => ALLWORDS.push(Object.assign({ id: l.n + ":" + v.zh, les: l.n, idx: i }, v))));
  const seenZh = new Set(); const UNIQUE = ALLWORDS.filter((w) => (seenZh.has(w.zh) ? false : (seenZh.add(w.zh), true)));
  const ALLEX = []; LES.forEach((l) => l.ex.forEach((e, i) => ALLEX.push(Object.assign({ id: "L" + l.n + "-" + i, les: l.n }, e))));
  C.mock.forEach((e, i) => ALLEX.push(Object.assign({ id: "M-" + i, les: 0, mock: true }, e)));
  const exById = {}; ALLEX.forEach((e) => (exById[e.id] = e));
  const wordById = {}; ALLWORDS.forEach((w) => (wordById[w.id] = w));
  const chapSet = () => new Set(S.settings.chapters);
  const selWords = () => { const s = chapSet(); const seen = new Set(); return ALLWORDS.filter((w) => s.has(w.les) && !seen.has(w.zh) && seen.add(w.zh)); };
  const selEx = () => { const s = chapSet(); return ALLEX.filter((e) => s.has(e.les)); };
  function sentencesFor(les) {
    const l = byN[les]; const out = [];
    l.texts.forEach((t) => t.lines.forEach((x) => out.push({ zh: x.zh, fr: x.fr.replace(/^[^:：]+[:：]\s*/, "") })));
    l.pp.forEach((x) => out.push(x));
    l.grammar.forEach((g) => g.ex.forEach((x) => { if (/[。？！]$/.test(x.zh) && !/[A-Z]：/.test(x.zh)) out.push(x); }));
    return out;
  }
  function contextFor(w) { const l = byN[w.les]; for (const t of l.texts) for (const x of t.lines) if (x.zh.includes(w.zh)) return x; for (const x of l.pp) if (x.zh.includes(w.zh)) return x; return null; }

  /* ---------- pinyin & voix ---------- */
  const PY = window.pinyinPro;
  function ruby(text) {
    if (!PY) return esc(text);
    const arr = PY.pinyin(text, { type: "all", toneType: "symbol" });
    return arr.map((o) => (o.isZh ? "<ruby>" + esc(o.origin) + "<rt>" + esc(o.pinyin) + "</rt></ruby>" : esc(o.origin))).join("");
  }
  function pyOf(text) { return PY ? PY.pinyin(text, { toneType: "symbol" }) : ""; }
  let zhVoice = null;
  function loadVoices() { if (!("speechSynthesis" in window)) return; const v = speechSynthesis.getVoices(); zhVoice = v.find((x) => /zh[-_]CN/i.test(x.lang)) || v.find((x) => /^zh/i.test(x.lang)) || null; }
  if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function speak(text, rate) {
    if (!("speechSynthesis" in window)) { toast("La voix n'est pas disponible sur cet appareil."); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[A-Za-z]+[:：]/g, ""));
    u.lang = "zh-CN"; if (zhVoice) u.voice = zhVoice; u.rate = rate || S.settings.rate;
    speechSynthesis.speak(u);
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-say]"); if (b) { e.preventDefault(); e.stopPropagation(); speak(b.dataset.say); } });
  const sayBtn = (t) => '<button class="say" data-say="' + esc(t) + '" aria-label="Écouter">🔊</button>';

  /* ---------- UI commune ---------- */
  let toastT;
  function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2200); }
  function setTitle(t, back) { $("#title").textContent = t; $("#backBtn").hidden = !back; }
  $("#backBtn").onclick = () => history.back();
  function chapLabel() {
    const c = S.settings.chapters.slice().sort((a, b) => a - b);
    if (!c.length) return "aucun";
    const parts = []; let s = c[0], p = c[0];
    for (let i = 1; i <= c.length; i++) { if (c[i] === p + 1) { p = c[i]; continue; } parts.push(s === p ? "" + s : s + "–" + p); s = p = c[i]; }
    return parts.join(", ");
  }
  function refreshChap() { $("#chapLabel").textContent = chapLabel(); }
  function openSheet() {
    const sel = new Set(S.settings.chapters);
    const draw = () => {
      $("#chapGrid").innerHTML = LES.map((l) => '<button data-c="' + l.n + '" class="' + (sel.has(l.n) ? "on" : "") + '" aria-pressed="' + sel.has(l.n) + '">' + l.n + "</button>").join("");
    };
    const presets = [["1–7 (examen)", [1, 2, 3, 4, 5, 6, 7]], ["Tout", LES.map((l) => l.n)], ["1–4", [1, 2, 3, 4]], ["8–15", [8, 9, 10, 11, 12, 13, 14, 15]], ["Aucun", []]];
    $("#presets").innerHTML = presets.map((p, i) => '<button class="chip" data-p="' + i + '">' + p[0] + "</button>").join("");
    $("#presets").onclick = (e) => { const b = e.target.closest("[data-p]"); if (!b) return; sel.clear(); presets[+b.dataset.p][1].forEach((n) => sel.add(n)); draw(); };
    $("#chapGrid").onclick = (e) => { const b = e.target.closest("[data-c]"); if (!b) return; const n = +b.dataset.c; sel.has(n) ? sel.delete(n) : sel.add(n); draw(); };
    $("#sheetOk").onclick = () => {
      if (!sel.size) { toast("Choisis au moins un chapitre."); return; }
      S.settings.chapters = [...sel].sort((a, b) => a - b); save("settings"); refreshChap(); $("#sheet").hidden = true; route();
    };
    draw(); $("#sheet").hidden = false;
  }
  $("#chapBtn").onclick = openSheet;
  $("#sheet").onclick = (e) => { if (e.target.id === "sheet") $("#sheet").hidden = true; };

  /* ---------- SRS (répétition espacée, système de Leitner) ---------- */
  const BOX_DAYS = [0, 1, 3, 7, 14, 30];
  function srsGrade(id, g) { // g: 0 raté, 1 difficile, 2 su
    const c = S.srs[id] || { box: 0, due: 0, n: 0, ok: 0 };
    c.n++; if (g > 0) c.ok++;
    c.box = g === 0 ? 0 : g === 1 ? Math.max(1, c.box) : Math.min(5, c.box + 1);
    c.due = g === 0 ? Date.now() + 60000 : Date.now() + BOX_DAYS[c.box] * DAY;
    S.srs[id] = c; save("srs");
  }
  const known = (w) => { const c = S.srs[w.id]; return c && c.box >= 3; };
  const learned = (w) => !!S.srs[w.id];

  /* ---------- erreurs ---------- */
  function markMistake(key, ok) { if (ok) delete S.mistakes[key]; else S.mistakes[key] = Date.now(); save("mistakes"); }

  /* ================= ÉCRANS ================= */
  function home() {
    setTitle("学中文 · HSK 1", false);
    const words = selWords(); const due = words.filter((w) => S.srs[w.id] && S.srs[w.id].due <= Date.now()).length;
    const newW = words.filter((w) => !S.srs[w.id]).length; const k = words.filter(known).length;
    const exs = selEx(); const exDone = exs.filter((e) => S.exo[e.id] && S.exo[e.id].ok).length;
    const t = S.log[today()] || { n: 0, ok: 0 };
    app.innerHTML = `
      <section class="card hero">
        <h2>你好 ! 👋</h2>
        <div class="muted small">Chapitres actifs : <b>${esc(chapLabel())}</b> · <a href="#" id="chg" style="color:#fff">changer</a></div>
        <div class="stats">
          <div class="stat"><b>${k}/${words.length}</b><span class="small">mots maîtrisés</span></div>
          <div class="stat"><b>${exDone}/${exs.length}</b><span class="small">exercices réussis</span></div>
          <div class="stat"><b>${streak()}🔥</b><span class="small">jours de suite</span></div>
        </div>
        <div class="small mt">Aujourd'hui : ${t.n} réponses, ${t.n ? Math.round((t.ok / t.n) * 100) : 0} % de bonnes.</div>
      </section>
      <div class="grid2">
        <a class="tile" href="#/cartes"><span class="ico">🃏</span><b>Cartes mémoire</b><small>${due} à revoir · ${newW} nouvelles</small></a>
        <a class="tile" href="#/quiz"><span class="ico">⚡</span><b>Quiz vocabulaire</b><small>汉字 ↔ français ↔ pinyin</small></a>
        <a class="tile" href="#/exos"><span class="ico">✏️</span><b>Exercices des livres</b><small>Manuel + cahier, corrigés</small></a>
        <a class="tile" href="#/phrases"><span class="ico">🧩</span><b>Phrases en ordre</b><small>Reconstruire les phrases</small></a>
        <a class="tile" href="#/ecriture"><span class="ico">🖌️</span><b>Écriture</b><small>Tracer les caractères</small></a>
        <a class="tile" href="#/ecoute"><span class="ico">🎧</span><b>Écoute</b><small>Entendre et reconnaître</small></a>
        <a class="tile" href="#/examen"><span class="ico">📝</span><b>Examen blanc</b><small>Test noté + HSK 1 du cahier</small></a>
        <a class="tile" href="#/revoir"><span class="ico">🎯</span><b>Mes erreurs</b><small>${Object.keys(S.mistakes).length} à retravailler</small></a>
      </div>
      <a class="card tile mt" href="#/cours"><b>📖 Relire les leçons</b><small>Textes, vocabulaire, grammaire et explications de chaque chapitre</small></a>`;
    $("#chg").onclick = (e) => { e.preventDefault(); openSheet(); };
  }

  function coursList() {
    setTitle("Les leçons", false);
    const s = chapSet();
    app.innerHTML = '<div class="card"><ul class="list">' + LES.map((l) => {
      const n = l.vocab.length; const k = l.vocab.filter((v) => known(wordById[l.n + ":" + v.zh] || {})).length;
      return `<li><a class="lessonlink" href="#/cours/${l.n}"><span class="num ${s.has(l.n) ? "on" : ""}">${l.n}</span>
        <span style="flex:1"><span class="zh" style="font-size:1.15rem">${esc(l.title)}</span><br><span class="muted small">${esc(l.fr)}</span>
        <span class="bar"><i style="width:${n ? (k / n) * 100 : 0}%"></i></span></span><span class="muted">›</span></a></li>`;
    }).join("") + "</ul></div><p class=\"muted small center\">Les chapitres en rouge sont ceux que tu révises en ce moment.</p>";
  }

  function lesson(n, tab) {
    const l = byN[n]; if (!l) return coursList();
    setTitle("Leçon " + n, true);
    const tabs = [["textes", "Textes"], ["mots", "Vocabulaire"], ["gram", "Grammaire"], ["prof", "Phrases de la prof"], ["pron", "Prononciation"], ["hanzi", "Caractères"]]
      .filter(([k]) => (k === "prof" ? l.pp.length : k === "pron" ? l.pron.length : k === "hanzi" ? l.hanzi.chars.length || l.hanzi.rules.length : k === "gram" ? l.grammar.length || l.tips.length : true));
    tab = tab || "textes"; if (!tabs.find((t) => t[0] === tab)) tab = tabs[0][0];
    const cls = (S.settings.pinyin ? "" : " nopy") + (S.settings.french ? "" : " nofr");
    let body = "";
    if (tab === "textes") {
      body = `<div class="card"><h2 class="zh">${esc(l.title)}</h2><div class="muted">${esc(l.fr)}</div>
        <h3>🎯 Objectifs</h3><ul>${l.obj.map((o) => "<li>" + esc(o) + "</li>").join("")}</ul></div>` +
        l.texts.map((t, i) => `<div class="card"><h2>Texte ${i + 1} ${sayBtn(t.lines.map((x) => x.zh).join(""))}</h2><div class="scene">📍 ${esc(t.scene)}</div>
          ${t.lines.map((x) => `<div class="dl"><div class="who zh">${esc(x.who)}</div><div class="bubble"><div class="zhline">${ruby(x.zh)}</div><div class="fr">${esc(x.fr.replace(/^[^:：]+[:：]\s*/, ""))}</div></div>${sayBtn(x.zh)}</div>`).join("")}</div>`).join("") +
        (l.tw ? `<div class="card"><h2>👅 Virelangue ${sayBtn(l.tw.zh)}</h2><div class="zhline">${ruby(l.tw.zh)}</div><div class="fr muted small">${esc(l.tw.fr)}</div></div>` : "");
    } else if (tab === "mots") {
      body = l.texts.map((t, i) => `<div class="card"><h2>Mots du texte ${i + 1}</h2><div class="vocab">${t.vocab.map((v) =>
        `<span class="w">${esc(v.zh)}</span><span><span class="p">${esc(v.py)}</span> <span class="pill">${esc(v.pos || "—")}</span><br><span class="m">${esc(v.fr)}</span></span>${sayBtn(v.zh)}`).join("")}</div></div>`).join("") +
        `<a class="btn primary block" href="#/cartes?les=${n}">Réviser ces mots en cartes</a>`;
    } else if (tab === "gram") {
      body = `<div class="card">${l.grammar.map((g) => `<div class="gram"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p>${g.ex.map((x) =>
        `<div class="row"><div class="ex zhline" style="flex:1">${ruby(x.zh)}</div>${sayBtn(x.zh)}</div><div class="exfr">${esc(x.fr)}</div>`).join("")}</div>`).join("")}
        ${l.tips.length ? "<h3>💡 Astuces du livre</h3>" + l.tips.map((t) => '<div class="tip">' + esc(t) + "</div>").join("") : ""}</div>`;
    } else if (tab === "prof") {
      body = `<div class="card"><h2>Phrases d'exemple du cours</h2><p class="muted small">Exemples tirés des PPT de ta prof.</p>${l.pp.map((x) =>
        `<div class="dl"><div class="bubble"><div class="zhline">${ruby(x.zh)}</div><div class="fr">${esc(x.fr)}</div></div>${sayBtn(x.zh)}</div>`).join("")}</div>`;
    } else if (tab === "pron") {
      body = l.pron.map((p) => `<div class="card"><h2>${esc(p.t)}</h2><p>${esc(p.d)}</p>${p.ex.length ? '<ul class="list">' + p.ex.map((x) =>
        `<li><span class="zh" style="font-size:1.3rem;min-width:70px">${esc(x.zh)}</span><span style="flex:1">${esc(x.py)}</span>${/[一-鿿]/.test(x.zh) ? sayBtn(x.zh) : ""}</li>`).join("") + "</ul>" : ""}</div>`).join("");
    } else if (tab === "hanzi") {
      const h = l.hanzi;
      body = `<div class="card">${h.strokes.length ? "<h2>Traits</h2><ul class=\"list\">" + h.strokes.map((s) => `<li><span class="zh" style="font-size:1.6rem;min-width:40px">${esc(s.s)}</span><span>${esc(s.d)}</span></li>`).join("") + "</ul>" : ""}
        ${h.rules.length ? "<h2 class=\"mt\">Règles</h2><ul class=\"list\">" + h.rules.map((r) => `<li><span class="zh" style="font-size:1.6rem;min-width:40px">${esc(r.c)}</span><span><b class="zh">${esc(r.zh)}</b><br><span class="muted small">${esc(r.fr)}</span></span></li>`).join("") + "</ul>" : ""}
        ${h.chars.length ? `<h2 class="mt">Caractères à recopier</h2><div class="chips">${h.chars.map((c) => `<a class="chip zh" style="font-size:1.4rem" href="#/ecriture?c=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</div><p class="muted small">Touche un caractère pour t'entraîner à l'écrire.</p>` : ""}</div>`;
    }
    app.innerHTML = `<div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}" role="tab" aria-selected="${k === tab}">${t}</button>`).join("")}</div>
      <div class="row" style="margin-bottom:8px"><label class="chip"><input type="checkbox" id="tpy" ${S.settings.pinyin ? "checked" : ""}> pinyin</label>
      <label class="chip"><input type="checkbox" id="tfr" ${S.settings.french ? "checked" : ""}> français</label><span class="spacer"></span>
      <a class="chip" href="#/exos?les=${n}">✏️ Exercices</a></div><div class="${cls}" id="lbody">${body}</div>`;
    app.querySelector(".tabs").onclick = (e) => { const b = e.target.closest("[data-t]"); if (b) location.replace("#/cours/" + n + "/" + b.dataset.t); };
    $("#tpy").onchange = (e) => { S.settings.pinyin = e.target.checked; save("settings"); $("#lbody").classList.toggle("nopy", !e.target.checked); };
    $("#tfr").onchange = (e) => { S.settings.french = e.target.checked; save("settings"); $("#lbody").classList.toggle("nofr", !e.target.checked); };
  }

  /* ---------- cartes mémoire ---------- */
  function cartes(q) {
    setTitle("Cartes mémoire", !!q.les);
    let pool = q.les ? ALLWORDS.filter((w) => w.les === +q.les) : selWords();
    const now = Date.now();
    const due = pool.filter((w) => S.srs[w.id] && S.srs[w.id].due <= now).sort((a, b) => S.srs[a.id].due - S.srs[b.id].due);
    const fresh = pool.filter((w) => !S.srs[w.id]).slice(0, S.settings.newPerDay);
    let queue = due.concat(fresh);
    if (!queue.length) {
      app.innerHTML = `<div class="card center"><div class="big">🎉</div><h2>Tout est révisé !</h2><p class="muted">Aucune carte à revoir pour les chapitres ${esc(chapLabel())}. Reviens plus tard, ou entraîne-toi quand même :</p>
        <button class="btn primary block" id="all">Réviser toutes les cartes quand même</button><a class="btn block mt" href="#/quiz">Faire un quiz</a></div>`;
      $("#all").onclick = () => { queue = shuffle(pool); start(); };
      return;
    }
    start();
    function start() {
      let i = 0, flipped = false; const total = queue.length; let dir = S.settings.dir;
      draw();
      function draw() {
        if (!queue.length) { app.innerHTML = `<div class="card center"><div class="big">✅</div><h2>Session terminée</h2><p>${total} cartes revues.</p><a class="btn primary block" href="#/">Accueil</a></div>`; return; }
        const w = queue[0]; const ctx = contextFor(w); flipped = false;
        const front = dir === "zh" ? `<div class="big">${esc(w.zh)}</div><div class="muted small">Que veut dire ce mot ?</div>`
          : dir === "fr" ? `<div class="m" style="font-size:1.4rem">${esc(w.fr)}</div><div class="muted small mt">Comment dit-on en chinois ?</div>`
          : `<div class="p" style="font-size:2rem">${esc(w.py)}</div><div class="muted small mt">Quel mot ?</div>`;
        app.innerHTML = `<div class="progress"><span>${total - queue.length + 1}/${total}</span><span class="bar"><i style="width:${((total - queue.length) / total) * 100}%"></i></span><span class="pill">L${w.les}</span></div>
          <div class="chips" style="margin-bottom:10px">${[["zh", "汉字 → sens"], ["fr", "Sens → 汉字"], ["py", "Pinyin → 汉字"]].map(([k, t]) => `<button class="chip ${dir === k ? "on" : ""}" data-d="${k}">${t}</button>`).join("")}</div>
          <div class="card flash" id="fc">${front}<div id="back" hidden>${dir === "zh" ? "" : `<div class="big" style="font-size:2.6rem">${esc(w.zh)}</div>`}<div class="p">${esc(w.py)}</div><div class="m">${esc(w.fr)}</div>
          ${w.pos ? `<span class="pill mt">${esc(w.pos)}</span>` : ""}${ctx ? `<div class="ctx">« ${esc(ctx.zh)} »<br><span class="small">${esc(ctx.fr.replace(/^[^:：]+[:：]\s*/, ""))}</span></div>` : ""}</div>
          <div class="muted small mt" id="hint">Touche la carte pour voir la réponse</div></div>
          <div class="row"><button class="btn ghost" data-say="${esc(w.zh)}">🔊 Écouter</button><span class="spacer"></span></div>
          <div class="srsbtns" id="grade" hidden><button class="btn k-again" data-g="0">Raté<small>revoir</small></button><button class="btn k-hard" data-g="1">Difficile<small>bientôt</small></button><button class="btn k-good" data-g="2">Je savais<small>plus tard</small></button></div>`;
        if (dir === "zh") speak(w.zh);
        $("#fc").onclick = () => { if (flipped) return; flipped = true; $("#back").hidden = false; $("#hint").hidden = true; $("#grade").hidden = false; if (dir !== "zh") speak(w.zh); };
        app.querySelector(".chips").onclick = (e) => { const b = e.target.closest("[data-d]"); if (!b) return; dir = S.settings.dir = b.dataset.d; save("settings"); draw(); };
        $("#grade").onclick = (e) => {
          const b = e.target.closest("[data-g]"); if (!b) return; const g = +b.dataset.g;
          srsGrade(w.id, g); logAnswer(g > 0); markMistake("w:" + w.id, g > 0);
          queue.shift(); if (g === 0) queue.splice(Math.min(queue.length, 3), 0, w); draw();
        };
      }
    }
  }

  /* ---------- moteur de questions générique ---------- */
  function runSession(qs, opts) {
    opts = opts || {}; let i = 0, score = 0; const wrong = []; const t0 = Date.now();
    if (!qs.length) { app.innerHTML = `<div class="card center"><h2>Rien à faire ici</h2><p class="muted">Aucune question pour les chapitres choisis.</p><button class="btn primary" id="cc">Changer de chapitres</button></div>`; $("#cc").onclick = openSheet; return; }
    next();
    function next() {
      if (i >= qs.length) return finish();
      const q = qs[i]; const host = document.createElement("div");
      app.innerHTML = `<div class="progress"><span>${i + 1}/${qs.length}</span><span class="bar"><i style="width:${(i / qs.length) * 100}%"></i></span><span>✅ ${score}</span></div>`;
      app.appendChild(host); renderQ(q, host, (ok, info) => {
        if (ok) score++; else wrong.push({ q, info });
        logAnswer(ok); if (q.key) markMistake(q.key, ok); if (q.exId) { S.exo[q.exId] = { ok, t: Date.now() }; save("exo"); }
        if (q.wordId) srsGrade(q.wordId, ok ? 2 : 0);
        const nb = document.createElement("button"); nb.className = "btn primary block mt"; nb.textContent = i + 1 < qs.length ? "Suivant →" : "Voir le résultat";
        nb.onclick = () => { i++; next(); }; host.appendChild(nb); nb.focus();
      });
    }
    function finish() {
      const pct = Math.round((score / qs.length) * 100); const min = Math.round((Date.now() - t0) / 60000);
      const note = (score / qs.length * 20).toFixed(1).replace(".0", "");
      app.innerHTML = `<div class="card center"><div class="score">${opts.exam ? note + "/20" : pct + " %"}</div><p>${score} bonnes réponses sur ${qs.length}${opts.exam ? " · " + min + " min" : ""}</p>
        <p>${pct >= 90 ? "Excellent ! 太好了！🎉" : pct >= 70 ? "Très bien, continue ! 很好！" : pct >= 50 ? "Pas mal, encore un effort 💪" : "Courage, revois la leçon puis recommence 📖"}</p>
        <button class="btn primary block" id="again">Recommencer</button><a class="btn block mt" href="#/">Accueil</a></div>
        ${wrong.length ? `<div class="card"><h2>À retenir</h2><ul class="list">${wrong.map((w) => `<li><span style="flex:1"><span class="${/[一-鿿]/.test(w.q.prompt) ? "zh" : ""}">${esc(w.q.prompt)}</span><br><span class="small">✅ <b class="zh">${esc(w.q.answer)}</b>${w.q.explain ? " — " + esc(w.q.explain) : ""}</span></span></li>`).join("")}</ul></div>` : ""}`;
      $("#again").onclick = () => (opts.again ? opts.again() : route());
    }
  }

  function norm(s) { return String(s).replace(/[\s，。？！、,.?!：:；;“”"'（）()_—…]/g, "").toLowerCase(); }

  function renderQ(q, host, done) {
    const src = q.src ? `<div class="qsrc">${esc(q.src)}${q.les ? " · L" + q.les : ""}</div>` : "";
    const isZh = /[一-鿿]/.test(q.prompt);
    const promptHtml = q.audio ? `<div class="center"><button class="btn gold" data-say="${esc(q.audio)}" style="font-size:1.4rem">🔊 Écouter</button></div>`
      : q.big ? `<div class="big">${esc(q.prompt)}</div>` : `<div class="qtext ${isZh ? "zhq" : ""}">${q.ruby && S.settings.pinyin ? ruby(q.prompt) : esc(q.prompt)}</div>`;
    const help = q.help ? `<div class="muted small" style="margin:${q.audio || q.big ? "10px" : "-6px"} 0 10px;text-align:${q.audio ? "center" : "left"}">${esc(q.help)}</div>` : "";
    const fb = (ok, extra) => {
      const d = document.createElement("div"); d.className = "feedback " + (ok ? "ok" : "ko");
      d.innerHTML = (ok ? "✅ Bravo !" : "❌ La bonne réponse : <b class=\"zh\">" + esc(q.answer) + "</b>") + (q.explain ? "<br><span class=\"small\">" + esc(q.explain) + "</span>" : "") + (extra || "");
      host.appendChild(d);
    };
    if (q.audio) setTimeout(() => speak(q.audio), 250);
    if (q.kind === "mcq") {
      host.innerHTML = `<div class="card">${src}${promptHtml}${help}<div class="opts">${q.options.map((o, k) => `<button class="opt ${/[一-鿿]/.test(o) ? "zh" : ""}" data-k="${k}">${esc(o)}</button>`).join("")}</div></div>`;
      host.querySelector(".opts").onclick = (e) => {
        const b = e.target.closest(".opt"); if (!b) return; const o = q.options[+b.dataset.k]; const ok = o === q.answer;
        host.querySelectorAll(".opt").forEach((x) => { x.disabled = true; if (q.options[+x.dataset.k] === q.answer) x.classList.add("ok"); });
        if (!ok) b.classList.add("ko");
        if (/[一-鿿]/.test(q.answer) && !q.noSpeak) speak(q.speakFull || q.answer);
        fb(ok); done(ok, o);
      };
    } else if (q.kind === "write") {
      host.innerHTML = `<div class="card">${src}${promptHtml}${help}<input class="input" id="inp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ta réponse (en caractères)…">
        <div class="row mt"><button class="btn primary" id="ok">Valider</button><button class="btn ghost" id="show">Je ne sais pas</button></div></div>`;
      const go = (giveUp) => {
        const v = $("#inp", host).value; const ok = !giveUp && norm(v) === norm(q.answer);
        $("#inp", host).disabled = true; $("#ok", host).remove(); $("#show", host).remove(); fb(ok); speak(q.answer); done(ok, v);
      };
      $("#ok", host).onclick = () => go(false); $("#show", host).onclick = () => go(true);
      $("#inp", host).onkeydown = (e) => { if (e.key === "Enter") go(false); };
    } else if (q.kind === "open") {
      host.innerHTML = `<div class="card">${src}${promptHtml}${help}<p class="muted small">Réponds à voix haute ou dans ta tête, puis regarde la réponse modèle.</p><button class="btn primary block" id="rev">Voir la réponse</button></div>`;
      $("#rev", host).onclick = () => {
        $("#rev", host).remove();
        const d = document.createElement("div"); d.className = "feedback ok";
        d.innerHTML = `Réponse modèle : <div class="zhline">${ruby(q.answer)}</div>${sayBtn(q.answer)}<div class="row mt"><button class="btn k-again" data-s="0">Je me suis trompé(e)</button><button class="btn k-good" data-s="1">J'avais juste</button></div>`;
        host.firstElementChild.appendChild(d); speak(q.answer);
        d.querySelector(".row").onclick = (e) => { const b = e.target.closest("[data-s]"); if (!b) return; d.querySelector(".row").remove(); done(b.dataset.s === "1"); };
      };
    } else if (q.kind === "order") {
      const toks = shuffle(q.tokens.map((t, k) => ({ t, k })));
      host.innerHTML = `<div class="card">${src}<div class="qtext">${esc(q.prompt)}</div><div class="built" id="built"></div><div class="tray" id="tray">${toks.map((o, k) => `<button class="tok" data-k="${k}">${esc(o.t)}</button>`).join("")}</div>
        <div class="row mt"><button class="btn ghost" id="undo">↺ Effacer</button><span class="spacer"></span><button class="btn primary" id="ok" disabled>Valider</button></div></div>`;
      const built = []; const B = $("#built", host);
      const draw = () => { B.innerHTML = built.map((k, j) => `<button class="tok" data-j="${j}">${esc(toks[k].t)}</button>`).join(""); host.querySelectorAll("#tray .tok").forEach((x) => x.classList.toggle("used", built.includes(+x.dataset.k))); $("#ok", host).disabled = built.length !== toks.length; };
      $("#tray", host).onclick = (e) => { const b = e.target.closest(".tok"); if (!b || b.classList.contains("used")) return; built.push(+b.dataset.k); draw(); };
      B.onclick = (e) => { const b = e.target.closest(".tok"); if (!b) return; built.splice(+b.dataset.j, 1); draw(); };
      $("#undo", host).onclick = () => { built.length = 0; draw(); };
      $("#ok", host).onclick = () => {
        const v = built.map((k) => toks[k].t).join(""); const ok = norm(v) === norm(q.answer);
        host.querySelectorAll("button").forEach((x) => (x.disabled = true)); fb(ok, ok ? "" : `<div class="small">Ta phrase : <span class="zh">${esc(v)}</span></div>`); speak(q.answer); done(ok, v);
      };
    }
  }

  /* ---------- conversion des exercices des livres en questions ---------- */
  function exToQ(e) {
    const base = { exId: e.id, key: "e:" + e.id, src: e.src, les: e.les || "", explain: e.e || "" };
    let prompt = e.q;
    if (e.type === "mcq" || e.type === "fill") {
      return Object.assign(base, { kind: "mcq", prompt, options: e.opts.slice(), answer: e.a, ruby: true, noSpeak: !/[一-鿿]/.test(e.a), speakFull: e.q.includes("___") ? e.q.replace("___", e.a).replace(/（ ）/, e.a) : null,
        help: e.type === "fill" ? "Choisis le mot qui convient." : "" });
    }
    if (e.type === "write") return Object.assign(base, { kind: "write", prompt, answer: e.a, ruby: true, help: "Complète le trou ___ (en caractères chinois)." });
    return Object.assign(base, { kind: "open", prompt: e.q, answer: e.a, ruby: true });
  }

  /* ---------- quiz vocabulaire ---------- */
  function vocabQ(w, pool, kind) {
    const others = pool.filter((x) => x.zh !== w.zh && x.fr !== w.fr);
    const d3 = pick(others, 3);
    const base = { wordId: w.id, key: "w:" + w.id, les: w.les, src: "Vocabulaire" };
    if (kind === "zh2fr") return Object.assign(base, { kind: "mcq", prompt: w.zh, big: true, options: shuffle([w.fr, ...d3.map((x) => x.fr)]), answer: w.fr, explain: w.zh + " = " + w.py, noSpeak: true });
    if (kind === "fr2zh") return Object.assign(base, { kind: "mcq", prompt: w.fr, options: shuffle([w.zh, ...d3.map((x) => x.zh)]), answer: w.zh, explain: w.py, help: "Quel mot chinois ?" });
    if (kind === "zh2py") { const ds = pick(others.filter((x) => x.py !== w.py), 3).map((x) => x.py); return Object.assign(base, { kind: "mcq", prompt: w.zh, big: true, options: shuffle([w.py, ...ds]), answer: w.py, explain: w.fr, help: "Quelle est la bonne prononciation ?" }); }
    if (kind === "audio") return Object.assign(base, { kind: "mcq", prompt: "🔊 " + w.zh, audio: w.zh, options: shuffle([w.zh, ...d3.map((x) => x.zh)]), answer: w.zh, explain: w.py + " — " + w.fr, help: "Quel mot entends-tu ?", noSpeak: true });
    if (kind === "py2zh") return Object.assign(base, { kind: "mcq", prompt: w.py, options: shuffle([w.zh, ...d3.map((x) => x.zh)]), answer: w.zh, explain: w.fr, help: "Quel mot correspond à ce pinyin ?" });
  }
  function quiz(q) {
    setTitle("Quiz vocabulaire", false);
    const kinds = { zh2fr: "汉字 → français", fr2zh: "français → 汉字", zh2py: "汉字 → pinyin", py2zh: "pinyin → 汉字", audio: "🔊 écoute → 汉字", mix: "Mélange" };
    if (!q.k) {
      app.innerHTML = `<div class="card"><h2>Quel type de quiz ?</h2><p class="muted small">Mots des chapitres ${esc(chapLabel())} (${selWords().length} mots).</p><div class="opts">${Object.entries(kinds).map(([k, t]) => `<a class="opt" href="#/quiz?k=${k}">${t}</a>`).join("")}</div>
        <h3>Nombre de questions</h3><div class="chips" id="nq">${[10, 20, 30].map((n) => `<button class="chip ${(store.get("nq", 10) === n) ? "on" : ""}" data-n="${n}">${n}</button>`).join("")}</div></div>`;
      $("#nq").onclick = (e) => { const b = e.target.closest("[data-n]"); if (!b) return; store.set("nq", +b.dataset.n); quiz(q); };
      return;
    }
    const pool = selWords(); const all = pool.length >= 4 ? pool : UNIQUE; const n = store.get("nq", 10);
    const ks = ["zh2fr", "fr2zh", "zh2py", "py2zh", "audio"];
    const words = shuffle(pool).sort((a, b) => ((S.srs[a.id] || { box: -1 }).box - (S.srs[b.id] || { box: -1 }).box)).slice(0, n * 2);
    const qs = shuffle(words).slice(0, n).map((w) => vocabQ(w, all, q.k === "mix" ? ks[Math.floor(Math.random() * ks.length)] : q.k));
    setTitle(kinds[q.k], true);
    runSession(qs, { again: () => quiz(q) });
  }

  /* ---------- exercices des livres ---------- */
  function exos(q) {
    setTitle("Exercices des livres", !!q.les);
    const list = q.les ? ALLEX.filter((e) => e.les === +q.les) : selEx();
    const groups = {}; list.forEach((e) => { (groups[e.src] = groups[e.src] || []).push(e); });
    if (!q.go) {
      const done = (arr) => arr.filter((e) => S.exo[e.id] && S.exo[e.id].ok).length;
      app.innerHTML = `<div class="card"><h2>${q.les ? "Leçon " + q.les : "Chapitres " + esc(chapLabel())}</h2><p class="muted small">${list.length} exercices tirés du manuel et du cahier, avec correction.</p>
        <a class="btn primary block" href="#/exos?${q.les ? "les=" + q.les + "&" : ""}go=all">▶ Tout mélanger (20 au hasard)</a>
        <a class="btn block mt" href="#/exos?${q.les ? "les=" + q.les + "&" : ""}go=todo">Seulement ceux pas encore réussis</a></div>
        <div class="card"><h2>Par type d'exercice</h2><ul class="list">${Object.entries(groups).map(([k, a]) => `<li><a class="lessonlink" href="#/exos?${q.les ? "les=" + q.les + "&" : ""}go=${encodeURIComponent(k)}"><span style="flex:1">${esc(k)}<br><span class="muted small">${done(a)}/${a.length} réussis</span></span><span class="muted">›</span></a></li>`).join("")}</ul></div>
        ${q.les ? "" : `<div class="card"><h2>Par leçon</h2><div class="chips">${S.settings.chapters.map((n) => `<a class="chip" href="#/exos?les=${n}">Leçon ${n}</a>`).join("")}</div></div>`}`;
      return;
    }
    let sel = q.go === "all" ? list : q.go === "todo" ? list.filter((e) => !(S.exo[e.id] && S.exo[e.id].ok)) : groups[q.go] || [];
    sel = q.go === "all" || q.go === "todo" ? shuffle(sel).slice(0, 20) : sel.slice().sort((a, b) => a.les - b.les);
    setTitle(q.go === "all" ? "Exercices mélangés" : q.go === "todo" ? "À réussir" : q.go, true);
    runSession(sel.map(exToQ), { again: () => exos(q) });
  }

  /* ---------- phrases en ordre ---------- */
  const DICT = [...new Set(ALLWORDS.map((w) => w.zh).concat(["什么", "这个", "那个", "我们", "你们", "他们", "她们", "一个", "两个", "没有", "不是", "很好", "好的", "是的", "多少", "怎么", "哪儿", "一些", "一下"]))].sort((a, b) => b.length - a.length);
  function segment(s) {
    const out = []; let i = 0; const clean = s.replace(/\s/g, "");
    while (i < clean.length) {
      const ch = clean[i];
      if (/[，。？！、：；,]/.test(ch)) { if (out.length) out[out.length - 1] += ch; i++; continue; }
      if (/[0-9+]/.test(ch)) { let j = i; while (j < clean.length && /[0-9+:.]/.test(clean[j])) j++; out.push(clean.slice(i, j)); i = j; continue; }
      const w = DICT.find((d) => d.length > 1 && clean.startsWith(d, i)); if (w) { out.push(w); i += w.length; } else { out.push(ch); i++; }
    }
    return out;
  }
  function phrases(q) {
    setTitle("Phrases en ordre", false);
    const s = chapSet(); const pool = [];
    LES.filter((l) => s.has(l.n)).forEach((l) => sentencesFor(l.n).forEach((x) => { const zh = x.zh.split(/\s*—\s*/)[0]; const t = segment(zh); if (t.length >= 3 && t.length <= 10) pool.push({ zh, fr: x.fr.split(/\s*—\s*/)[0], t, les: l.n }); }));
    const seen = new Set(); const uniq = pool.filter((p) => !seen.has(p.zh) && seen.add(p.zh));
    const qs = pick(uniq, 10).map((p) => ({ kind: "order", prompt: p.fr, tokens: p.t, answer: p.zh, les: p.les, src: "Remets les mots dans l'ordre", key: "s:" + p.zh }));
    runSession(qs, { again: () => phrases(q) });
  }

  /* ---------- écoute ---------- */
  function ecoute() {
    setTitle("Écoute", false);
    const s = chapSet(); const pool = selWords(); const all = pool.length >= 4 ? pool : UNIQUE;
    const sents = []; LES.filter((l) => s.has(l.n)).forEach((l) => sentencesFor(l.n).forEach((x) => sents.push(Object.assign({ les: l.n }, x))));
    const qs = [];
    pick(pool, 6).forEach((w) => qs.push(vocabQ(w, all, "audio")));
    pick(sents, 4).forEach((x) => { const others = pick(sents.filter((y) => y.fr !== x.fr), 2).map((y) => y.fr); qs.push({ kind: "mcq", audio: x.zh, prompt: x.zh, options: shuffle([x.fr, ...others]), answer: x.fr, explain: x.zh, les: x.les, src: "Écoute une phrase", help: "Que veut dire la phrase ? (touche 🔊 pour réécouter)", key: "a:" + x.zh, noSpeak: true }); });
    if (!("speechSynthesis" in window)) toast("Ton navigateur ne propose pas de voix chinoise.");
    runSession(shuffle(qs), { again: ecoute });
  }

  /* ---------- écriture ---------- */
  function ecriture(q) {
    setTitle("Écriture", !!q.c);
    if (!window.HanziWriter) { app.innerHTML = '<div class="card">Le module d\'écriture n\'a pas pu se charger.</div>'; return; }
    let items;
    if (q.c) items = [{ zh: q.c, py: pyOf(q.c), fr: (UNIQUE.find((w) => w.zh === q.c) || {}).fr || "" }];
    else items = shuffle(selWords().filter((w) => /^[一-鿿]+$/.test(w.zh) && w.zh.length <= 3));
    if (!items.length) { app.innerHTML = '<div class="card">Aucun mot à écrire pour ces chapitres.</div>'; return; }
    let wi = 0;
    const loader = (ch, onLoad, onErr) => fetch("hanzi/" + encodeURIComponent(ch) + ".json").then((r) => r.json()).then(onLoad).catch(onErr);
    drawWord();
    function drawWord() {
      const w = items[wi % items.length]; const chars = [...w.zh]; let ci = 0; let mistakesTotal = 0;
      app.innerHTML = `<div class="card center"><div class="muted small">Écris le mot :</div><div class="m" style="font-size:1.2rem">${esc(w.fr)}</div><div class="p" style="color:var(--red);font-size:1.2rem">${esc(w.py)} ${sayBtn(w.zh)}</div>
        <div class="charrow" id="cr">${chars.map((c, k) => `<span data-k="${k}">${k === 0 ? "?" : "?"}</span>`).join("")}</div>
        <div class="writer" id="wr"></div><div class="muted small" id="msg">Trace les traits dans l'ordre.</div>
        <div class="row mt" style="justify-content:center"><button class="btn" id="hint">💡 Indice</button><button class="btn" id="anim">▶ Voir l'animation</button><button class="btn" id="skip">Passer →</button></div></div>`;
      const size = Math.min(300, window.innerWidth - 80);
      let writer;
      const markCur = () => app.querySelectorAll("#cr span").forEach((s, k) => { s.classList.toggle("cur", k === ci); s.classList.toggle("done", k < ci); if (k < ci) s.textContent = chars[k]; });
      function startChar() {
        markCur(); $("#wr").innerHTML = "";
        writer = HanziWriter.create("wr", chars[ci], { width: size, height: size, padding: 10, showOutline: !!q.c, showCharacter: false, strokeColor: "#c8102e", radicalColor: "#9e0c24", highlightColor: "#f2b705", outlineColor: "#ddd", drawingWidth: 18, charDataLoader: loader });
        writer.quiz({
          showHintAfterMisses: 3, highlightOnComplete: true,
          onMistake: () => { mistakesTotal++; },
          onComplete: (s) => {
            ci++; if (ci < chars.length) { setTimeout(startChar, 600); return; }
            markCur(); const ok = mistakesTotal <= chars.length * 2; logAnswer(ok);
            $("#msg").innerHTML = ok ? "✅ Bravo ! " + (mistakesTotal ? mistakesTotal + " erreur(s) de trait." : "Parfait !") : "👍 Fini, mais avec " + mistakesTotal + " erreurs : réessaie plus tard.";
            speak(w.zh); $("#skip").textContent = "Mot suivant →";
          },
        });
      }
      startChar();
      $("#hint").onclick = () => { writer.showOutline(); };
      $("#anim").onclick = () => { writer.cancelQuiz(); writer.showCharacter(); writer.animateCharacter({ onComplete: () => setTimeout(() => { writer.hideCharacter(); startChar(); }, 800) }); };
      $("#skip").onclick = () => { wi++; drawWord(); };
    }
  }

  /* ---------- examen blanc ---------- */
  function examen(q) {
    setTitle("Examen blanc", !!q.t);
    if (!q.t) {
      app.innerHTML = `<div class="card"><h2>📝 Examen blanc</h2><p class="muted small">Chapitres ${esc(chapLabel())}. Note sur 20 à la fin et liste des erreurs à revoir.</p>
        <a class="btn primary block" href="#/examen?t=mix">Examen des chapitres choisis (25 questions)</a>
        <a class="btn block mt" href="#/examen?t=hsk">HSK 1 blanc du cahier (partie lecture, 20 questions)</a></div>
        <div class="card"><h3>Contenu de l'examen des chapitres</h3><ul class="small"><li>8 questions de vocabulaire (sens, pinyin, écoute)</li><li>12 exercices des livres (manuel + cahier)</li><li>5 phrases à remettre dans l'ordre</li></ul></div>`;
      return;
    }
    if (q.t === "hsk") { runSession(C.mock.map((e, i) => exToQ(Object.assign({ id: "M-" + i, les: 0 }, e))), { exam: true, again: () => examen(q) }); return; }
    const pool = selWords(); const all = pool.length >= 4 ? pool : UNIQUE; const ks = ["zh2fr", "fr2zh", "zh2py", "audio"];
    const qs = pick(pool, 8).map((w, i) => vocabQ(w, all, ks[i % ks.length]));
    pick(selEx().filter((e) => e.type !== "open"), 12).forEach((e) => qs.push(exToQ(e)));
    const s = chapSet(); const sp = [];
    LES.filter((l) => s.has(l.n)).forEach((l) => sentencesFor(l.n).forEach((x) => { const zh = x.zh.split(/\s*—\s*/)[0]; const t = segment(zh); if (t.length >= 3 && t.length <= 9) sp.push({ kind: "order", prompt: x.fr.split(/\s*—\s*/)[0], tokens: t, answer: zh, les: l.n, src: "Remets les mots dans l'ordre", key: "s:" + zh }); }));
    pick(sp, 5).forEach((x) => qs.push(x));
    runSession(qs, { exam: true, again: () => examen(q) });
  }

  /* ---------- erreurs ---------- */
  function revoir() {
    setTitle("Mes erreurs", false);
    const keys = Object.keys(S.mistakes).sort((a, b) => S.mistakes[b] - S.mistakes[a]);
    const pool = selWords(); const all = pool.length >= 4 ? pool : UNIQUE;
    const qs = keys.map((k) => {
      if (k.startsWith("w:")) { const w = wordById[k.slice(2)]; return w ? vocabQ(w, all, Math.random() < 0.5 ? "zh2fr" : "fr2zh") : null; }
      if (k.startsWith("e:")) { const e = exById[k.slice(2)]; return e ? exToQ(e) : null; }
      if (k.startsWith("s:")) { const zh = k.slice(2); const t = segment(zh); const src = LES.flatMap((l) => sentencesFor(l.n).map((x) => Object.assign({ les: l.n }, x))).find((x) => x.zh.split(/\s*—\s*/)[0] === zh); return src ? { kind: "order", prompt: src.fr.split(/\s*—\s*/)[0], tokens: t, answer: zh, les: src.les, src: "Remets les mots dans l'ordre", key: k } : null; }
      if (k.startsWith("a:")) { const zh = k.slice(2); const all2 = LES.flatMap((l) => sentencesFor(l.n)); const x = all2.find((y) => y.zh === zh); if (!x) return null; const others = pick(all2.filter((y) => y.fr !== x.fr), 2).map((y) => y.fr); return { kind: "mcq", audio: x.zh, prompt: x.zh, options: shuffle([x.fr, ...others]), answer: x.fr, explain: x.zh, src: "Écoute une phrase", key: k, noSpeak: true }; }
      return null;
    }).filter(Boolean);
    if (!qs.length) { app.innerHTML = `<div class="card center"><div class="big">🌟</div><h2>Aucune erreur en attente</h2><p class="muted">Les questions ratées apparaîtront ici pour que tu les retravailles.</p><a class="btn primary" href="#/quiz">Faire un quiz</a></div>`; return; }
    app.innerHTML = `<div class="card"><h2>${qs.length} question(s) à retravailler</h2><p class="muted small">Une question réussie ici disparaît de la liste.</p><button class="btn primary block" id="go">Commencer</button></div>`;
    $("#go").onclick = () => runSession(shuffle(qs).slice(0, 25), { again: revoir });
  }

  /* ---------- plus / réglages ---------- */
  function plus() {
    setTitle("Plus", false);
    const voices = "speechSynthesis" in window ? speechSynthesis.getVoices().filter((v) => /^zh/i.test(v.lang)) : [];
    app.innerHTML = `<div class="grid2">
        <a class="tile" href="#/quiz"><span class="ico">⚡</span><b>Quiz</b></a><a class="tile" href="#/phrases"><span class="ico">🧩</span><b>Phrases</b></a>
        <a class="tile" href="#/ecriture"><span class="ico">🖌️</span><b>Écriture</b></a><a class="tile" href="#/ecoute"><span class="ico">🎧</span><b>Écoute</b></a>
        <a class="tile" href="#/examen"><span class="ico">📝</span><b>Examen</b></a><a class="tile" href="#/revoir"><span class="ico">🎯</span><b>Erreurs</b></a>
        <a class="tile" href="#/lexique"><span class="ico">🔎</span><b>Lexique</b></a><button class="tile" id="chap2"><span class="ico">📚</span><b>Chapitres</b></button></div>
      <div class="card mt"><h2>Réglages</h2>
        <div class="setting"><span>Afficher le pinyin sur les textes</span><input type="checkbox" id="spy" ${S.settings.pinyin ? "checked" : ""}></div>
        <div class="setting"><span>Afficher la traduction</span><input type="checkbox" id="sfr" ${S.settings.french ? "checked" : ""}></div>
        <div class="setting"><span>Vitesse de la voix<br><span class="muted small" id="rv">${S.settings.rate}</span></span><input type="range" min="0.5" max="1.2" step="0.05" value="${S.settings.rate}" id="srate"></div>
        <div class="setting"><span>Nouvelles cartes par session</span><select id="snew" class="chip">${[10, 20, 30, 50].map((n) => `<option ${S.settings.newPerDay === n ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div class="setting"><span>Voix chinoise</span><span class="muted small">${voices.length ? esc(voices[0].name) : "non détectée"} <button class="chip" data-say="你好，欢迎学习中文！">Tester</button></span></div>
      </div>
      <div class="card"><h2>Installer sur l'iPhone</h2><ol class="small"><li>Ouvre cette page dans <b>Safari</b>.</li><li>Touche le bouton <b>Partager</b> (carré avec une flèche ↑).</li><li>Choisis <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b>.</li></ol><p class="muted small">L'app marche ensuite sans internet. Ta progression reste sur ton téléphone.</p></div>
      <div class="card"><h2>Progression</h2><p class="small">${Object.keys(S.srs).length} mots vus · ${Object.values(S.exo).filter((x) => x.ok).length} exercices réussis</p>
        <button class="btn block" id="reset">Remettre la progression à zéro</button></div>
      <p class="muted small center">Contenu : New HSK Course 1 (manuel + cahier) et cours de ta prof.</p>`;
    $("#chap2").onclick = openSheet;
    $("#spy").onchange = (e) => { S.settings.pinyin = e.target.checked; save("settings"); };
    $("#sfr").onchange = (e) => { S.settings.french = e.target.checked; save("settings"); };
    $("#srate").oninput = (e) => { S.settings.rate = +e.target.value; $("#rv").textContent = S.settings.rate; save("settings"); };
    $("#snew").onchange = (e) => { S.settings.newPerDay = +e.target.value; save("settings"); };
    $("#reset").onclick = () => { if (confirm("Effacer toute ta progression (cartes, exercices, erreurs) ?")) { S.srs = {}; S.exo = {}; S.mistakes = {}; S.log = {}; ["srs", "exo", "mistakes", "log"].forEach(save); toast("Progression effacée."); plus(); } };
  }

  function lexique(q) {
    setTitle("Lexique", true);
    app.innerHTML = `<input class="input" id="lq" placeholder="Chercher (汉字, pinyin ou français)…" value="${esc(q.s || "")}" style="margin-bottom:12px"><div class="card"><div class="vocab" id="lr"></div></div>`;
    const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const draw = () => {
      const s = strip($("#lq").value.trim());
      const r = UNIQUE.filter((w) => !s || strip(w.zh + " " + w.py + " " + w.py.replace(/\s/g, "") + " " + w.fr).includes(s)).slice(0, 150);
      $("#lr").innerHTML = r.map((v) => `<span class="w">${esc(v.zh)}</span><span><span class="p">${esc(v.py)}</span> <span class="pill">L${v.les}</span><br><span class="m">${esc(v.fr)}</span></span>${sayBtn(v.zh)}`).join("") || '<span class="muted">Aucun résultat</span>';
    };
    $("#lq").oninput = draw; draw();
  }

  /* ---------- routeur ---------- */
  function parse() {
    const h = location.hash.replace(/^#\/?/, ""); const [path, qs] = h.split("?"); const q = {};
    (qs || "").split("&").filter(Boolean).forEach((p) => { const [k, v] = p.split("="); q[k] = decodeURIComponent(v || ""); });
    return { parts: path.split("/").filter(Boolean), q };
  }
  function route() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const { parts, q } = parse(); const p = parts[0] || "home";
    document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.tab === (["quiz", "phrases", "ecriture", "ecoute", "examen", "revoir", "lexique"].includes(p) ? "plus" : p)));
    refreshChap(); window.scrollTo(0, 0);
    try {
      ({ home, cours: () => (parts[1] ? lesson(+parts[1], parts[2]) : coursList()), cartes, quiz, exos, phrases, ecoute, ecriture, examen, revoir, plus, lexique }[p] || home)(q);
    } catch (err) { console.error(err); app.innerHTML = '<div class="card">Oups, une erreur est survenue. <a href="#/">Retour à l\'accueil</a></div>'; }
  }
  window.addEventListener("hashchange", route);
  route();
  if (!store.get("welcomed", false)) { store.set("welcomed", true); setTimeout(openSheet, 400); }

  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
