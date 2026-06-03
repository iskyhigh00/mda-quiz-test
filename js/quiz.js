// ============================================
// QUIZ
// ============================================

function pickChip(g, v, el) {
  cfg[g] = v;
  el.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function vipMult() {
  return playerName.trim().toLowerCase() === 'messa' ? 1.3 : 1;
}

function timerMult() {
  return { 5: 1.0, 10: 0.7 }[cfg.t] || 1.0;
}

function graceExtra() {
  return playerName.trim().toLowerCase() === 'obrist' ? 0.5 : 0;
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

function updateQStats() {
  document.getElementById('q-ok').textContent = qCorrect;
  document.getElementById('q-err').textContent = qWrong;
  document.getElementById('q-pts').textContent = qScore;
}

function showFb(ok, name, pts) {
  const msg = document.getElementById('fb-msg');
  const pEl = document.getElementById('fb-pts');
  if (ok) {
    msg.className = 'fb-msg fb-ok';
    msg.textContent = ['Correcto!', 'Exacto!', 'Muy bien!', 'Perfecto!'][Math.floor(Math.random() * 4)];
    pEl.textContent = '+' + pts + ' pts';
    pEl.style.display = '';
  } else {
    msg.className = 'fb-msg fb-fail';
    msg.textContent = 'Era: ' + name;
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
    prev.textContent = '+' + calcPts(el);
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
  const cn = MACHINES[qIdx]?.name || '';
  document.querySelectorAll('.opt').forEach(b => {
    b.disabled = true;
    if (b.textContent === cn) b.classList.add('correct');
  });
  showFb(false, cn, 0);
  recordAnswer(cn, false, cfg.t * 1000, 0);
  updateQStats();
  scheduleNext(2400);
}

function pickOpt(isOk, btn, name) {
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
    const cn = MACHINES[qIdx]?.name || '';
    document.querySelectorAll('.opt').forEach(b => {
      if (b.textContent === cn) b.classList.add('correct');
    });
    qWrong++;
    showFb(false, cn, 0);
  }
  recordAnswer(MACHINES[qIdx]?.name || '', isOk, ms, pts);
  updateQStats();
  scheduleNext(2000);
}

function nextQ() {
  if (qNum >= qTotal) {
    endQuiz();
    return;
  }
  clearTimers();
  qAnswered = false;
  document.getElementById('fb-msg').textContent = '';
  document.getElementById('fb-pts').style.display = 'none';
  document.getElementById('auto-bar-wrap').style.display = 'none';
  
  const pl = MACHINES.filter(m => m.photo_url);
  const m = pl[qQueue[qNum]];
  qNum++;
  qIdx = MACHINES.indexOf(m);
  
  document.getElementById('prog-lbl').textContent = qNum + '/' + qTotal;
  document.getElementById('prog-bar').style.width = ((qNum - 1) / qTotal * 100) + '%';
  
  const allP = [m.photo_url, ...(m.photo_urls || []).map(photoUrl)].filter(Boolean);
  const okP = allP.filter(u => imgCache[u] && imgCache[u] !== 'error');
  const photos = okP.length ? okP : allP;
  const chosenPhoto = photos[Math.floor(Math.random() * photos.length)];
  const img = document.getElementById('quiz-img');
  const cached = imgCache[chosenPhoto];
  if (cached && cached !== 'error' && cached.complete) {
    img.src = cached.src;
    img.style.opacity = '1';
  } else {
    img.style.opacity = '0.3';
    setTimeout(() => {
      img.src = getImgUrl(chosenPhoto);
      img.style.opacity = '1';
    }, 80);
  }
  
  const cn = m.name;
  const pool = shuffle(pl.filter((x, i) => i !== qQueue[qNum - 1] && x.name !== cn));
  const allOpts = shuffle([m, ...pool.slice(0, 3)]);
  const og = document.getElementById('opts');
  og.innerHTML = '';
  allOpts.forEach(om => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.textContent = om.name;
    b.onclick = () => pickOpt(om === m, b, om.name);
    og.appendChild(b);
  });
  qStart = Date.now();
  startTimer();
}

async function preloadAndCountdown(pl) {
  const overlay = document.getElementById('countdown-overlay');
  const cdStatus = document.getElementById('cd-status');
  const cdNum = document.getElementById('cd-num');
  const cdBar = document.getElementById('cd-bar');
  overlay.style.display = 'flex';
  
  const queuedMachines = qQueue.map(i => pl[i]).filter(m => m && m.photo_url);
  const allUrls = [];
  queuedMachines.forEach(m => {
    [m.photo_url, ...(m.photo_urls || []).map(photoUrl)].filter(Boolean).forEach(u => allUrls.push(u));
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
      imgCache[url] = img;
      loaded++;
      cdStatus.textContent = 'Cargando imágenes... ' + loaded + '/' + totalToLoad;
      cdBar.style.width = (loaded / totalToLoad * 60) + '%';
      resolve();
    };
    img.onerror = () => {
      imgCache[url] = 'error';
      loaded++;
      cdStatus.textContent = 'Cargando imágenes... ' + loaded + '/' + totalToLoad;
      cdBar.style.width = (loaded / totalToLoad * 60) + '%';
      resolve();
    };
    img.src = url;
  })));
  
  qQueue = qQueue.filter(i => {
    const m = pl[i];
    if (!m || !m.photo_url) return false;
    const photos = [m.photo_url, ...(m.photo_urls || []).map(photoUrl)].filter(Boolean);
    return photos.some(u => imgCache[u] && imgCache[u] !== 'error');
  });
  qTotal = qQueue.length;
  
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

function startQuiz() {
  playerName = playerName || localStorage.getItem('mda_user_name') || '';
  if (!playerName) {
    alert('Primero configura tu nombre en el catálogo.');
    goTo('catalog');
    return;
  }
  const pl = MACHINES.filter(m => m.photo_url);
  if (pl.length < 4) {
    alert('Necesitas al menos 4 modelos con foto.');
    return;
  }
  const cnt = cfg.q >= 999 ? pl.length : Math.min(cfg.q, pl.length);
  qQueue = shuffle(pl.map((_, i) => i)).slice(0, cnt);
  qTotal = qQueue.length;
  qNum = 0;
  qCorrect = 0;
  qWrong = 0;
  qScore = 0;
  preloadAndCountdown(pl);
}

async function saveIncompleteGame() {
  if (!playerName || qNum === 0) return;
  const acc = qNum > 0 ? Math.round(qCorrect / qNum * 100) : 0;
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
  } catch (e) {
    console.error('saveIncomplete failed', e);
  }
}

async function restartQuiz() {
  if (qNum > 0) {
    await saveIncompleteGame();
  }
  const pl = MACHINES.filter(m => m.photo_url);
  if (pl.length < 4) return;
  const cnt = cfg.q >= 999 ? pl.length : Math.min(cfg.q, pl.length);
  qQueue = shuffle(pl.map((_, i) => i)).slice(0, cnt);
  qTotal = qQueue.length;
  qNum = 0;
  qCorrect = 0;
  qWrong = 0;
  qScore = 0;
  clearTimers();
  document.getElementById('q-ok').textContent = 0;
  document.getElementById('q-err').textContent = 0;
  document.getElementById('q-pts').textContent = 0;
  preloadAndCountdown(pl);
}

async function saveScore(name, pts, correct, total, sec, accuracy) {
  try {
    await sbPost('/rest/v1/scores', {
      name, pts, correct, total, timer_sec: sec, accuracy, completed: true, season: currentSeason()
    });
  } catch (e) { }
}

async function recordAnswer(mn, correct, timeMs, pts) {
  try {
    await sbPost('/rest/v1/quiz_answers', {
      player_name: playerName, machine_name: mn, correct, time_ms: timeMs, pts, timer_sec: cfg.t, season: currentSeason()
    });
  } catch (e) { }
}

async function endQuiz() {
  clearTimers();
  const acc = Math.round(qCorrect / qTotal * 100);
  const trophies = ['🏆', '🥈', '🥉', '💪'];
  const trophy = acc >= 90 ? trophies[0] : acc >= 70 ? trophies[1] : acc >= 50 ? trophies[2] : trophies[3];
  document.getElementById('r-name').textContent = playerName;

  const targetMax = qTotal <= 5 ? (maxPtsConfig[5] || 1000) : qTotal <= 10 ? (maxPtsConfig[10] || 1200) : (maxPtsConfig[20] || 1300);
  let normalizedScore = Math.round(qScore * targetMax / (qTotal * 100));

  document.getElementById('r-sub').textContent = qCorrect + ' correctas de ' + qTotal + ' · ' + cfg.t + 's';
  document.getElementById('r-ok').textContent = qCorrect;
  document.getElementById('r-err').textContent = qWrong;
  document.getElementById('r-acc').textContent = acc + '%';

  // Desempate antes de mostrar resultado
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
    const maxPts = qTotal <= 5 ? (maxPtsConfig[5] || 1000) : qTotal <= 10 ? (maxPtsConfig[10] || 1200) : (maxPtsConfig[20] || 1300);
    const top = await sbGet('/rest/v1/scores?season=eq.' + encodeURIComponent(compState.compId) + '&completed=eq.true&order=pts.desc&limit=1');
    const topScore = top.length > 0 ? top[0].pts : 0;
    if (score >= topScore || score >= maxPts) return await runSuddenDeath(score);
  } catch (e) {}
  return score;
}

function runSuddenDeath(baseScore) {
  return new Promise(resolve => {
    const usedIds = new Set(qQueue.map(i => MACHINES[i]?.id));
    const pool = MACHINES.filter(m => m.photo_url);
    const fresh = pool.filter(m => !usedIds.has(m.id));
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