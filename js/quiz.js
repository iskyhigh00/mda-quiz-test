// ============================================
// QUIZ
// ============================================

function pickChip(g, v, el) {
  cfg[g] = v;
  el.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

let _approvedQCounts = null;
let _typeChipMsgTO = null;

async function loadApprovedQCounts() {
  try {
    const rows = await sbGet('/rest/v1/quiz_questions?status=eq.approved&select=type');
    _approvedQCounts = { falla: 0, curiosidad: 0, repuesto: 0 };
    rows.forEach(r => { if (_approvedQCounts[r.type] !== undefined) _approvedQCounts[r.type]++; });
  } catch (e) {
    _approvedQCounts = { falla: 0, curiosidad: 0, repuesto: 0 };
  }
  updateTypeChipAvailability();
}

function updateTypeChipAvailability() {
  if (!_approvedQCounts) return;
  const MIN = 15;
  ['falla', 'curiosidad', 'repuesto'].forEach(type => {
    const count = _approvedQCounts[type] || 0;
    const chipEl = document.querySelector('[data-type="' + type + '"]');
    if (!chipEl) return;
    chipEl.classList.toggle('chip-disabled', count < MIN);
    chipEl.dataset.count = count;
  });
}

function showTypeChipMsg(msg) {
  const el = document.getElementById('type-chip-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(_typeChipMsgTO);
  _typeChipMsgTO = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function pickTypeChip(type, el) {
  const chips = el.closest('.chips');
  const allChips = Array.from(chips.querySelectorAll('[data-type]'));
  const todoChip = chips.querySelector('[data-type="todo"]');

  if (el.classList.contains('chip-disabled')) {
    const count = parseInt(el.dataset.count || '0');
    showTypeChipMsg('Faltan preguntas aprobadas (' + count + '/15)');
    return;
  }

  if (type === 'todo') {
    allChips.forEach(c => c.classList.remove('active'));
    todoChip.classList.add('active');
    cfg.types = [];
    return;
  }

  el.classList.toggle('active');

  const enabledIndividuals = allChips.filter(c => c.dataset.type !== 'todo' && !c.classList.contains('chip-disabled'));
  const activeEnabled = enabledIndividuals.filter(c => c.classList.contains('active'));

  if (activeEnabled.length === 0) {
    todoChip.classList.add('active');
    cfg.types = [];
  } else if (activeEnabled.length === enabledIndividuals.length) {
    allChips.forEach(c => c.classList.remove('active'));
    todoChip.classList.add('active');
    cfg.types = [];
  } else {
    todoChip.classList.remove('active');
    cfg.types = activeEnabled.map(c => c.dataset.type);
  }
}

function pickDiffChip(diff, el) {
  cfg.diff = diff;
  el.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  updateSetupChips();
}


function updateSetupChips() {
  const d = DIFFICULTIES[cfg.diff] || DIFFICULTIES.normal;
  const displayMult = d.displayMult !== undefined ? d.displayMult : d.finalMult;
  [5, 10, 20].forEach(q => {
    const el = document.getElementById('chip-pts-' + q);
    const base = maxPtsConfig[q] || (q === 5 ? 1000 : q === 10 ? 1200 : 1300);
    if (el) el.textContent = '≤ ' + Math.round(base * displayMult) + ' pts';
  });
}

function vipMult() {
  const entry = HONOR_LIST[playerName.trim().toLowerCase()];
  return entry && entry.scoreMult ? entry.scoreMult : 1;
}

function timerMult() {
  return (DIFFICULTIES[cfg.diff] || DIFFICULTIES.normal).speedMult;
}

function graceExtra() {
  const entry = HONOR_LIST[playerName.trim().toLowerCase()];
  return entry && entry.graceFactor ? entry.graceFactor : 0;
}

function calcPts(ms) {
  const raw = Math.min(ms / (cfg.t * 1000), 1);
  const baseGrace = cfg.t === 5 ? 0.20 : 0;
  const extraGrace = graceExtra() / cfg.t;
  const totalGrace = Math.min(baseGrace + extraGrace, 0.99);
  const frac = totalGrace > 0 ? Math.max(0, (raw - totalGrace) / (1 - totalGrace)) : raw;
  const speedBonus = 90 * (1 - frac) * timerMult();
  return Math.round((10 + speedBonus) * vipMult());
}

function clearTimers() {
  clearInterval(timerInt);
  clearTimeout(autoTO);
}

function displayPts(raw) {
  if (!qTotal) return raw;
  const targetMax = qTotal <= 5 ? (maxPtsConfig[5] || 1000) : qTotal <= 10 ? (maxPtsConfig[10] || 1200) : (maxPtsConfig[20] || 1300);
  const d = DIFFICULTIES[cfg.diff] || DIFFICULTIES.normal;
  return Math.round(raw * targetMax / (qTotal * 100) * d.finalMult);
}

function updateQStats() {
  document.getElementById('q-ok').textContent = qCorrect;
  document.getElementById('q-err').textContent = qWrong;
  document.getElementById('q-pts').textContent = displayPts(qScore);
}

function showFb(ok, correctName, pts) {
  const msg = document.getElementById('fb-msg');
  const pEl = document.getElementById('fb-pts');
  if (ok) {
    msg.className = 'fb-msg fb-ok';
    msg.textContent = ['¡Correcto!', '¡Exacto!', '¡Muy bien!', '¡Perfecto!'][Math.floor(Math.random() * 4)];
    pEl.textContent = '+' + displayPts(pts) + ' pts';
    pEl.style.display = '';
  } else {
    msg.className = 'fb-msg fb-fail';
    msg.textContent = 'Era: ' + correctName;
    pEl.style.display = 'none';
  }
}

function scheduleNext(d) {
  const bw = document.getElementById('auto-bar-wrap');
  const b = document.getElementById('auto-bar');
  bw.style.display = 'block';
  b.style.transition = 'none';
  b.style.width = '100%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    b.style.transition = 'width ' + d + 'ms linear';
    b.style.width = '0%';
  }));
  autoTO = setTimeout(nextQ, d);
}

function startTimer() {
  const fg = document.getElementById('ring-fg');
  const num = document.getElementById('ring-num');
  const prev = document.getElementById('pts-preview');
  let el = 0;
  fg.style.stroke = 'var(--accent2)';
  num.style.color = 'var(--accent2)';
  fg.style.strokeDashoffset = '0';
  timerInt = setInterval(() => {
    el += 100;
    const fr = el / (cfg.t * 1000);
    fg.style.strokeDashoffset = Math.min(CIRC * fr, CIRC);
    num.textContent = Math.ceil(Math.max(0, cfg.t - el / 1000));
    prev.textContent = '+' + displayPts(calcPts(el));
    if (fr > 0.6) {
      fg.style.stroke = 'var(--red)';
      num.style.color = 'var(--red)';
    } else if (fr > 0.35) {
      fg.style.stroke = 'var(--gold)';
      num.style.color = 'var(--gold)';
    }
    if (el >= cfg.t * 1000) {
      clearInterval(timerInt);
      if (!qAnswered) timeOut();
    }
  }, 100);
}

function timeOut() {
  qAnswered = true;
  qWrong++;
  const correctName = qCurrentQ
    ? (qCurrentQ.source === 'machine' ? qCurrentQ.machine.name : qCurrentQ.correct_answer)
    : '';
  document.querySelectorAll('.opt').forEach(b => {
    b.disabled = true;
    if (b.textContent === correctName) b.classList.add('correct');
  });
  showFb(false, correctName, 0);
  recordAnswer(correctName, false, cfg.t * 1000, 0);
  updateQStats();
  scheduleNext(2400);
}

function pickOpt(isOk, btn, selectedText, correctText) {
  if (qAnswered) return;
  qAnswered = true;
  clearTimers();
  const ms = Date.now() - qStart;
  document.querySelectorAll('.opt').forEach(b => b.disabled = true);
  let pts = 0;
  if (isOk) {
    btn.classList.add('correct');
    qCorrect++;
    pts = calcPts(ms);
    qScore += pts;
    showFb(true, '', pts);
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('.opt').forEach(b => {
      if (b.textContent === correctText) b.classList.add('correct');
    });
    qWrong++;
    showFb(false, correctText, 0);
  }
  recordAnswer(correctText, isOk, ms, pts);
  updateQStats();
  scheduleNext(2000);
}

function nextQ() {
  if (qNum >= qTotal) { endQuiz(); return; }
  clearTimers();
  qAnswered = false;
  document.getElementById('fb-msg').textContent = '';
  document.getElementById('fb-pts').style.display = 'none';
  document.getElementById('auto-bar-wrap').style.display = 'none';

  const q = qQuestionQueue[qNum];
  qCurrentQ = q;
  qNum++;

  // Set per-question time based on difficulty + question type
  const _d = DIFFICULTIES[cfg.diff] || DIFFICULTIES.normal;
  cfg.t = q.source === 'machine' ? _d.tMachine : _d.tComm;


  document.getElementById('prog-lbl').textContent = qNum + '/' + qTotal;
  document.getElementById('prog-bar').style.width = ((qNum - 1) / qTotal * 100) + '%';

  const img = document.getElementById('quiz-img');
  const og = document.getElementById('opts');
  og.innerHTML = '';

  if (q.source === 'machine') {
    const m = q.machine;
    document.getElementById('quiz-q').textContent = '¿Cómo se llama este modelo?';
    const allP = [m.photo_url, ...(m.photo_urls || []).map(photoUrl)].filter(Boolean);
    const okP = allP.filter(u => imgCache[u] && imgCache[u] !== 'error');
    const photos = okP.length ? okP : allP;
    const chosenPhoto = photos[Math.floor(Math.random() * photos.length)];
    const cached = imgCache[chosenPhoto];
    if (cached && cached !== 'error' && cached.complete) {
      img.src = cached.src;
      img.style.opacity = '1';
    } else {
      img.style.opacity = '0.3';
      setTimeout(() => { img.src = getImgUrl(chosenPhoto); img.style.opacity = '1'; }, 80);
    }
    const pl = MACHINES.filter(x => x.photo_url);
    const pool = shuffle(pl.filter(x => x.name !== m.name));
    const allOpts = shuffle([m, ...pool.slice(0, 3)]);
    allOpts.forEach(om => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.textContent = om.name;
      b.onclick = () => pickOpt(om === m, b, om.name, m.name);
      og.appendChild(b);
    });
  } else {
    document.getElementById('quiz-q').textContent = q.question_text;
    img.style.opacity = '0.3';
    const cached = imgCache[q.image_url];
    if (cached && cached !== 'error' && cached.complete) {
      img.src = cached.src;
      img.style.opacity = '1';
    } else {
      img.src = getImgUrl(q.image_url);
      img.onload = () => { img.style.opacity = '1'; };
      img.onerror = () => { img.style.opacity = '0.5'; };
    }
    q.options.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.textContent = opt;
      b.onclick = () => pickOpt(opt === q.correct_answer, b, opt, q.correct_answer);
      og.appendChild(b);
    });
  }

  qStart = Date.now();
  startTimer();
}

async function preloadAndCountdown() {
  const overlay = document.getElementById('countdown-overlay');
  const cdStatus = document.getElementById('cd-status');
  const cdNum = document.getElementById('cd-num');
  const cdBar = document.getElementById('cd-bar');
  overlay.style.display = 'flex';

  const allUrls = [];
  qQuestionQueue.forEach(q => {
    if (q.source === 'machine') {
      const m = q.machine;
      [m.photo_url, ...(m.photo_urls || []).map(photoUrl)].filter(Boolean).forEach(u => allUrls.push(u));
    } else if (q.image_url) {
      allUrls.push(q.image_url);
    }
  });

  let loaded = 0;
  const totalToLoad = allUrls.length;
  cdStatus.textContent = 'Cargando imágenes... 0/' + totalToLoad;
  cdBar.style.width = '0%';

  await Promise.all(allUrls.map(url => new Promise(resolve => {
    if (imgCache[url] && imgCache[url] !== 'error') {
      loaded++;
      cdStatus.textContent = 'Cargando imágenes... ' + loaded + '/' + totalToLoad;
      cdBar.style.width = (loaded / totalToLoad * 60) + '%';
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => {
      cacheImg(url, img);
      loaded++;
      cdStatus.textContent = 'Cargando imágenes... ' + loaded + '/' + totalToLoad;
      cdBar.style.width = (loaded / totalToLoad * 60) + '%';
      resolve();
    };
    img.onerror = () => {
      cacheImg(url, 'error');
      loaded++;
      cdStatus.textContent = 'Cargando imágenes... ' + loaded + '/' + totalToLoad;
      cdBar.style.width = (loaded / totalToLoad * 60) + '%';
      resolve();
    };
    img.src = url;
  })));

  qQuestionQueue = qQuestionQueue.filter(q => {
    if (q.source === 'machine') {
      const m = q.machine;
      if (!m.photo_url) return false;
      const photos = [m.photo_url, ...(m.photo_urls || []).map(photoUrl)].filter(Boolean);
      return photos.some(u => imgCache[u] && imgCache[u] !== 'error');
    }
    return true;
  });
  qTotal = qQuestionQueue.length;

  if (qTotal < 4) {
    overlay.style.display = 'none';
    alert('No hay suficientes imágenes disponibles. Verifica tu conexión.');
    goTo('setup');
    return;
  }

  cdStatus.textContent = '¡Prepárate!';
  for (let i = 3; i >= 1; i--) {
    cdNum.textContent = i;
    cdBar.style.width = (60 + (3 - i + 1) / 3 * 40) + '%';
    await new Promise(r => setTimeout(r, 900));
  }
  cdNum.textContent = '';
  overlay.style.display = 'none';
  goTo('quiz');
  nextQ();
}

async function startQuiz() {
  playerName = playerName || localStorage.getItem('mda_user_name') || '';
  if (!playerName) {
    alert('Primero configura tu nombre en el catálogo.');
    goTo('catalog');
    return;
  }

  const pl = MACHINES.filter(m => m.photo_url);

  // --- Determinar mix de tipos ---
  let mix = { modelo: 100, falla: 0, curiosidad: 0, repuesto: 0 };
  if (compState.active || cfg.types.length === 0) {
    try {
      const rows = await sbGet('/rest/v1/settings?key=eq.quiz_type_mix');
      if (rows[0]) mix = JSON.parse(rows[0].value);
    } catch (e) {}
  } else {
    mix = { modelo: 0, falla: 0, curiosidad: 0, repuesto: 0 };
    const pct = Math.floor(100 / cfg.types.length);
    cfg.types.forEach(t => { mix[t] = pct; });
    const rem = 100 - pct * cfg.types.length;
    if (rem > 0) mix[cfg.types[0]] += rem;
  }

  // --- Precisión histórica por máquina ---
  const accMap = {};
  if (mix.modelo > 0) {
    try {
      const answers = await sbGet('/rest/v1/quiz_answers?order=id.desc&limit=3000');
      answers.forEach(a => {
        if (!a.machine_name) return;
        if (!accMap[a.machine_name]) accMap[a.machine_name] = { c: 0, t: 0 };
        accMap[a.machine_name].t++;
        if (a.correct) accMap[a.machine_name].c++;
      });
    } catch (e) {}
  }

  let allQs = [];

  // --- Máquinas con dificultad 50% fácil / 30% media / 20% difícil ---
  if (mix.modelo > 0) {
    if (pl.length < 4) { alert('Necesitas al menos 4 modelos con foto.'); return; }
    const target = Math.max(1, Math.round(cfg.q * mix.modelo / 100));

    const easy = [], medium = [], hard = [];
    pl.forEach(m => {
      const s = accMap[m.name];
      if (!s || s.t < 5) { medium.push(m); return; }
      const acc = s.c / s.t;
      if (acc >= 0.70) easy.push(m);
      else if (acc >= 0.40) medium.push(m);
      else hard.push(m);
    });

    const nEasy = Math.round(target * 0.50);
    const nMed  = Math.round(target * 0.30);
    const nHard = target - nEasy - nMed;
    const used = new Set();
    const pickN = (pool, n) => {
      const out = [];
      for (const m of shuffle([...pool])) {
        if (out.length >= n) break;
        if (!used.has(m.id)) { used.add(m.id); out.push(m); }
      }
      return out;
    };

    let picked = [...pickN(easy, nEasy), ...pickN(medium, nMed), ...pickN(hard, nHard)];
    if (picked.length < target) picked = [...picked, ...pickN(pl, target - picked.length)];

    allQs.push(...picked.map(m => ({ source: 'machine', machine: m })));
  }

  // --- Preguntas comunitarias por tipo ---
  const commTypes = ['falla','curiosidad','repuesto'].filter(t => mix[t] > 0);
  if (commTypes.length > 0) {
    try {
      const rows = await sbGet('/rest/v1/quiz_questions?status=eq.approved&type=in.(' + commTypes.join(',') + ')&limit=500');
      commTypes.forEach(type => {
        const target = Math.max(1, Math.round(cfg.q * mix[type] / 100));
        shuffle(rows.filter(r => r.type === type)).slice(0, target).forEach(r => {
          allQs.push({ source: 'community', id: r.id, type: r.type, image_url: r.image_url,
            question_text: r.question_text, correct_answer: r.correct_answer,
            options: shuffle([r.correct_answer, r.option_b, r.option_c, r.option_d]) });
        });
      });
    } catch (e) {}
  }

  allQs = shuffle(allQs);
  if (allQs.length < 4) { alert('No hay suficientes preguntas disponibles.'); return; }

  qQuestionQueue = allQs.slice(0, Math.min(cfg.q, allQs.length));
  qTotal = qQuestionQueue.length;
  qNum = 0; qCorrect = 0; qWrong = 0; qScore = 0; qCurrentQ = null;

  preloadAndCountdown();
}

async function saveIncompleteGame() {
  if (!playerName || qNum === 0) return;
  const answered = qCorrect + qWrong;
  const acc = answered > 0 ? Math.round(qCorrect / answered * 100) : 0;
  try {
    await sbPost('/rest/v1/scores', {
      name: playerName,
      pts: qScore,
      correct: qCorrect,
      total: cfg.q,
      timer_sec: cfg.t,
      accuracy: acc,
      completed: false,
      season: currentSeason()
    });
  } catch (e) {}
}

async function restartQuiz() {
  if (qNum > 0) await saveIncompleteGame();
  clearTimers();
  qNum = 0; qCorrect = 0; qWrong = 0; qScore = 0;
  document.getElementById('q-ok').textContent = 0;
  document.getElementById('q-err').textContent = 0;
  document.getElementById('q-pts').textContent = 0;
  startQuiz();
}

async function saveScore(name, pts, correct, total, sec, accuracy) {
  try {
    await sbPost('/rest/v1/scores', {
      name, pts, correct, total, timer_sec: sec, accuracy, completed: true, season: currentSeason()
    });
  } catch (e) {}
}

async function recordAnswer(correctName, correct, timeMs, pts) {
  try {
    await sbPost('/rest/v1/quiz_answers', {
      player_name: playerName, machine_name: correctName, correct, time_ms: timeMs, pts, timer_sec: cfg.t, season: currentSeason()
    });
  } catch (e) {}
}

async function endQuiz() {
  clearTimers();
  const acc = Math.round(qCorrect / qTotal * 100);
  const trophies = ['🏆', '🥈', '🥉', '💪'];
  const trophy = acc >= 90 ? trophies[0] : acc >= 70 ? trophies[1] : acc >= 50 ? trophies[2] : trophies[3];
  document.getElementById('r-name').textContent = playerName;

  const targetMax = qTotal <= 5 ? (maxPtsConfig[5] || 1000) : qTotal <= 10 ? (maxPtsConfig[10] || 1200) : (maxPtsConfig[20] || 1300);
  const _diffMult = (DIFFICULTIES[cfg.diff] || DIFFICULTIES.normal).finalMult;
  let normalizedScore = Math.round(qScore * targetMax / (qTotal * 100) * _diffMult);

  const _diffLabel = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' }[cfg.diff] || 'Normal';
  document.getElementById('r-sub').textContent = qCorrect + ' correctas de ' + qTotal + ' · ' + _diffLabel;
  document.getElementById('r-ok').textContent = qCorrect;
  document.getElementById('r-err').textContent = qWrong;
  document.getElementById('r-acc').textContent = acc + '%';

  normalizedScore = await checkSuddenDeath(normalizedScore);

  document.getElementById('r-trophy').innerHTML = trophy;
  document.getElementById('r-score').textContent = normalizedScore;

  await saveScore(playerName, normalizedScore, qCorrect, cfg.q, cfg.t, acc);
  if (typeof renderLeaderboard === 'function') renderLeaderboard();
  if (typeof loadRanking === 'function') loadRanking();
  goTo('results');
}

// ========== MUERTE SÚBITA ==========
let _sdInterval = null;
let _sdPts = 0;

async function checkSuddenDeath(score) {
  if (!compState.active || !compState.compId || score <= 0) return score;
  try {
    const maxPtsBase = qTotal <= 5 ? (maxPtsConfig[5] || 1000) : qTotal <= 10 ? (maxPtsConfig[10] || 1200) : (maxPtsConfig[20] || 1300);
    const _sdDiffMult = (DIFFICULTIES[cfg.diff] || DIFFICULTIES.normal).finalMult;
    const maxPts = Math.round(maxPtsBase * _sdDiffMult);
    const top = await sbGet('/rest/v1/scores?season=eq.' + encodeURIComponent(compState.compId) + '&completed=eq.true&order=pts.desc&limit=1');
    const tiesFirst = top.length > 0 && score >= top[0].pts;
    if (tiesFirst || score >= maxPts) return await runSuddenDeath(score);
  } catch (e) {}
  return score;
}

function runSuddenDeath(baseScore) {
  return new Promise(resolve => {
    const pool = MACHINES.filter(m => m.photo_url);
    const usedNames = new Set(qQuestionQueue.filter(q => q.source === 'machine').map(q => q.machine.name));
    const fresh = pool.filter(m => !usedNames.has(m.name));
    const candidates = fresh.length >= 4 ? fresh : pool;
    if (candidates.length < 4) { resolve(baseScore); return; }

    const machine = candidates[Math.floor(Math.random() * candidates.length)];
    const wrongs = shuffle(candidates.filter(m => m.id !== machine.id)).slice(0, 3);
    const opts = shuffle([machine, ...wrongs]);

    document.getElementById('sd-img').src = getImgUrl(machine.photo_url);
    document.getElementById('sd-result').style.display = 'none';

    const optsEl = document.getElementById('sd-opts');
    optsEl.innerHTML = '';
    opts.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'opt';
      btn.textContent = m.name;
      btn.onclick = () => {
        clearInterval(_sdInterval);
        optsEl.querySelectorAll('.opt').forEach(b => b.disabled = true);
        const correct = m.id === machine.id;
        const resultEl = document.getElementById('sd-result');
        resultEl.style.display = 'block';
        let finalScore;
        if (correct) {
          finalScore = baseScore + _sdPts;
          resultEl.innerHTML = '<span style="color:var(--green)">✓ ¡Correcto!</span> <span style="color:var(--gold)">+' + _sdPts + ' pts → ' + finalScore + ' total</span>';
        } else {
          finalScore = baseScore;
          resultEl.innerHTML = '<span style="color:var(--red)">✗ Incorrecto · Era: <strong>' + machine.name + '</strong></span><br><span style="color:var(--gold)">+0 pts → ' + finalScore + ' total</span>';
        }
        setTimeout(() => {
          document.getElementById('sd-overlay').classList.remove('open');
          resolve(finalScore);
        }, 2500);
      };
      optsEl.appendChild(btn);
    });

    const ptsEl = document.getElementById('sd-pts-val');
    _sdPts = 5;
    ptsEl.textContent = _sdPts;
    ptsEl.className = 'sd-pts-val';
    document.getElementById('sd-overlay').classList.add('open');

    _sdInterval = setInterval(() => {
      _sdPts = Math.max(0, _sdPts - 1);
      ptsEl.textContent = _sdPts;
      if (_sdPts <= 1) ptsEl.className = 'sd-pts-val critical';
      else if (_sdPts <= 3) ptsEl.className = 'sd-pts-val low';
      else ptsEl.className = 'sd-pts-val';
      if (_sdPts === 0) {
        clearInterval(_sdInterval);
        optsEl.querySelectorAll('.opt').forEach(b => b.disabled = true);
        const finalScore = baseScore;
        const resultEl = document.getElementById('sd-result');
        resultEl.style.display = 'block';
        resultEl.innerHTML = '<span style="color:var(--red)">⏱ ¡Tiempo! Era: <strong>' + machine.name + '</strong></span><br><span style="color:var(--gold)">+0 pts → ' + finalScore + ' total</span>';
        setTimeout(() => {
          document.getElementById('sd-overlay').classList.remove('open');
          resolve(finalScore);
        }, 2500);
      }
    }, 400);
  });
}
