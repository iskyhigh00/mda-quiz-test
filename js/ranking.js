// ============================================
// RANKING, COMPETENCIA Y GANADORES
// ============================================

let _hadCompActive = null;

async function renderLeaderboard() {
  const body = document.getElementById('lb-body');
  if (!body) return;
  body.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    const isCompetition = compState.active && compState.compId;
    const season = currentSeason();
    const scores = (await sbGet('/rest/v1/scores?season=eq.' + encodeURIComponent(season) + '&order=created_at.desc&limit=500')).filter(x => x.completed !== false);
    if (!scores.length) {
      body.innerHTML = '<div class="no-data">Sin puntajes.</div>';
      return;
    }
    let rows;
    if (isCompetition) {
      const best = {};
      scores.forEach(x => {
        if (!best[x.name] || x.pts > best[x.name].pts) best[x.name] = x;
      });
      rows = Object.values(best).sort((a, b) => b.pts - a.pts).slice(0, 20);
    } else {
      rows = scores.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
    }
    body.innerHTML = '<table><thead><tr><th>Pos</th><th>Nombre</th><th>Pts</th></tr></thead><tbody>' +
      rows.map((x, i) => '<tr><td>' + (i + 1) + '</td><td><strong>' + x.name + '</strong></td><td style="color:var(--gold)">' + x.pts + '</td></tr>').join('') +
      '</tbody></table>';
  } catch (e) {
    body.innerHTML = '<div class="no-data">Error cargando puntajes.</div>';
  }
}

async function loadRanking() {
  const body = document.getElementById('ranking-lb-body');
  if (!body) return;
  body.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    if (compState.active) {
      const r = await sbFetch('/rest/v1/scores?season=eq.' + encodeURIComponent(compState.compId) + '&completed=eq.true&order=pts.desc&limit=500');
      if (!r.ok) throw new Error('Error ' + r.status);
      const s = await r.json();
      if (!s.length) {
        body.innerHTML = '<div class="no-data">Sin puntajes aún!</div>';
        return;
      }
      const best = {};
      s.forEach(x => { if (!best[x.name] || x.pts > best[x.name].pts) best[x.name] = x; });
      const top = Object.values(best).sort((a, b) => b.pts - a.pts).slice(0, 100);
      const M = ['🥇', '🥈', '🥉'];
      body.innerHTML = '<table><thead><tr><th>#</th><th>Nombre</th><th>Mejor puntaje</th><th>Preguntas</th><th>Prec.</th><th>Seg.</th><th>Fecha</th></tr></thead><tbody>' +
        top.map((x, i) => {
          const f = new Date(x.created_at).toLocaleDateString('es-CL');
          return '<tr class="rank-' + (i + 1) + '"><td>' + (M[i] || i + 1) + '</td><td><strong>' + x.name + '</strong></td><td style="color:var(--gold);font-weight:800">' + x.pts + '</td><td style="color:var(--accent2);font-size:0.78rem;">' + (x.total || '?') + '</td><td>' + (x.accuracy || 0) + '%</td><td>' + (x.timer_sec || '?') + 's</td><td style="color:var(--muted)">' + f + '</td></tr>';
        }).join('') + '</tbody></table>';
    } else {
      const r = await sbFetch('/rest/v1/scores?season=eq.practica&completed=eq.true&order=created_at.desc&limit=30');
      if (!r.ok) throw new Error('Error ' + r.status);
      const s = await r.json();
      if (!s.length) {
        body.innerHTML = '<div class="no-data">Sin partidas de práctica aún. ¡Juega para aparecer aquí!</div>';
        return;
      }
      body.innerHTML = '<div style="padding:8px 14px;font-size:0.75rem;color:var(--muted);border-bottom:1px solid var(--border);">📚 Últimas partidas de práctica (por fecha)</div>' +
        '<table><thead><tr><th>Nombre</th><th>Puntaje</th><th>Preguntas</th><th>Prec.</th><th>Seg.</th><th>Fecha y hora</th></tr></thead><tbody>' +
        s.map(x => {
          const d = new Date(x.created_at);
          const f = d.toLocaleDateString('es-CL');
          const h = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          return '<tr><td><strong>' + x.name + '</strong></td><td style="color:var(--gold);font-weight:800">' + x.pts + '</td><td style="color:var(--accent2);font-size:0.78rem;">' + (x.total || '?') + '</td><td>' + (x.accuracy || 0) + '%</td><td>' + (x.timer_sec || '?') + 's</td><td style="color:var(--muted)">' + f + ' ' + h + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
  } catch (e) {
    body.innerHTML = '<div class="no-data">Error: ' + e.message + '</div>';
  }
}

async function loadWinnersHistory() {
  const body = document.getElementById('winners-history-body');
  if (!body) return;
  try {
    const rows = await sbGet('/rest/v1/winners_history?order=id.desc&limit=200');
    if (!rows.length) {
      body.innerHTML = '<div class="no-data">Sin historial aún.</div>';
      return;
    }
    const winners = rows.filter(r => r.rank === 1);
    if (!winners.length) {
      body.innerHTML = '<div class="no-data">Sin ganadores registrados.</div>';
      return;
    }
    body.innerHTML = winners.map((w, i) => {
      const prize = w.prize ? ' y ganó <span style="color:var(--green);font-weight:700;">' + w.prize + '</span>' : '';
      const sid = 'wseason-' + i;
      const seasonKey = w.season_ref || w.reset_date.replace(/\//g, '-');
      return '<div style="border-bottom:1px solid var(--border);">' +
        '<div class="winner-row" onclick="toggleWinnerSeason(\'' + sid + '\',\'' + seasonKey + '\')" style="cursor:pointer;">' +
        '🏆 El día <strong>' + w.reset_date + '</strong>, ' +
        '<strong style="color:var(--accent2)">' + w.player_name + '</strong> obtuvo ' +
        '<strong>' + w.pts + ' pts</strong>' + prize +
        '<span style="float:right;color:var(--muted);font-size:0.75rem;">▼ ver ranking</span>' +
        '<div class="winner-date">Precisión: ' + w.accuracy + '%</div>' +
        '</div>' +
        '<div id="' + sid + '" style="display:none;"><div class="loading">Cargando...</div></div>' +
        '</div>';
    }).join('');
  } catch (e) {
    body.innerHTML = '<div class="no-data">Error: ' + e.message + '</div>';
  }
}

async function toggleWinnerSeason(sid, seasonLabel) {
  const wrap = document.getElementById(sid);
  if (!wrap) return;
  if (wrap.style.display !== 'none') {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';
  try {
    const scores = await sbGet('/rest/v1/scores?season=eq.' + encodeURIComponent(seasonLabel) + '&completed=eq.true&order=pts.desc&limit=500');
    if (!scores.length) {
      wrap.innerHTML = '<div class="no-data" style="padding:14px;">Sin datos detallados.</div>';
      return;
    }
    const best = {};
    scores.forEach(x => { if (!best[x.name] || x.pts > best[x.name].pts) best[x.name] = x; });
    const top = Object.values(best).sort((a, b) => b.pts - a.pts);
    const M = ['🥇', '🥈', '🥉'];
    wrap.innerHTML = '<table style="width:100%"><thead><tr><th>#</th><th>Jugador</th><th>Puntaje</th><th>Preguntas</th><th>Prec.</th><th>Seg.</th></tr></thead><tbody>' +
      top.map((x, i) => '<tr><td>' + (M[i] || i + 1) + '</td><td><strong>' + x.name + '</strong></td><td style="color:var(--gold);font-weight:800">' + x.pts + '</td><td style="color:var(--accent2);font-size:0.78rem;">' + (x.total || '?') + '</td><td>' + (x.accuracy || 0) + '%</td><td>' + (x.timer_sec || '?') + 's</td></tr>').join('') +
      '</tbody></table>';
  } catch (e) {
    wrap.innerHTML = '<div class="no-data" style="padding:14px;">Error: ' + e.message + '</div>';
  }
}

// ========== COMPETENCIA ==========
async function loadCompetition() {
  try {
    const rows = await sbGet('/rest/v1/settings?key=in.(competition_active,competition_end,prize,current_comp_id)');
    let active = false, endStr = '', prize = '', compId = '';
    rows.forEach(r => {
      if (r.key === 'competition_active') active = r.value === 'true';
      if (r.key === 'competition_end') endStr = r.value || '';
      if (r.key === 'prize') prize = r.value || '';
      if (r.key === 'current_comp_id') compId = r.value || '';
    });
    compState.active = active;
    compState.endTime = endStr ? new Date(endStr) : null;
    compState.prize = prize;
    compState.compId = compId;
    if (active && compState.endTime && new Date() >= compState.endTime) {
      await finishCompetition();
      return;
    }
    updateCompetitionUI();
    startCompetitionCountdown();
  } catch (e) {
    console.error('loadCompetition:', e);
  }
}

function updateCompetitionUI() {
  const badge = document.getElementById('comp-status-badge');
  const startBtn = document.getElementById('comp-start-btn');
  const addBtn = document.getElementById('comp-addtime-btn');
  const stopBtn = document.getElementById('comp-stop-btn');
  const info = document.getElementById('comp-info');
  const upBtn = document.getElementById('comp-updateprize-btn');
  
  if (compState.active) {
    if (badge) {
      badge.textContent = 'ACTIVA';
      badge.style.background = 'rgba(16,185,129,0.15)';
      badge.style.color = 'var(--green)';
    }
    if (startBtn) startBtn.style.display = 'none';
    if (addBtn) addBtn.style.display = '';
    if (stopBtn) stopBtn.style.display = '';
    if (upBtn) upBtn.style.display = '';
    if (info && compState.endTime) info.innerHTML = 'Termina: <strong style="color:var(--accent2)">' + compState.endTime.toLocaleString('es-CL') + '</strong>';
  } else {
    if (badge) {
      badge.textContent = 'PRÁCTICA';
      badge.style.background = 'rgba(245,158,11,0.15)';
      badge.style.color = 'var(--gold)';
    }
    if (startBtn) startBtn.style.display = '';
    if (addBtn) addBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    if (upBtn) upBtn.style.display = 'none';
    if (info) info.innerHTML = 'La app está en modo práctica. Los puntajes no cuentan para el ranking.';
  }
  if (_hadCompActive === false && compState.active) {
    showNotif('🏆 Competencia activa', (compState.prize ? 'Premio: ' + compState.prize + ' · ' : '') + '¡A jugar!');
  }
  _hadCompActive = compState.active;
  renderCompetitionBanner();
}

function renderCompetitionBanner() {
  const w = document.getElementById('prize-banner-wrap');
  if (w) {
    if (compState.active && compState.endTime) {
      w.innerHTML = '<div class="prize-banner"><div class="prize-icon">🏆</div><div class="prize-text">Competencia activa — Premio: ' + (compState.prize || 'por definir') + '<div id="comp-countdown" style="font-size:1.3rem;font-weight:900;color:var(--accent2);margin-top:6px;"></div></div></div>';
    } else {
      w.innerHTML = '<div class="prize-banner" style="border-color:var(--gold);"><div class="prize-icon">📚</div><div class="prize-text" style="color:var(--gold);">Modo práctica</div></div>';
    }
  }
  const setup = document.getElementById('mode-banner-setup');
  if (setup) {
    if (compState.active && compState.endTime) {
      setup.innerHTML = '<div class="mode-banner mode-comp">🏆 Competencia activa · Premio: ' + (compState.prize || '…') + '<span id="mode-banner-cd" style="margin-left:auto;font-size:0.82rem;font-weight:800;color:var(--accent2);"></span></div>';
    } else {
      setup.innerHTML = '<div class="mode-banner mode-practice">📚 Modo práctica · puntajes no cuentan para el ranking</div>';
    }
  }
  const tg = document.getElementById('type-chips-group');
  if (tg) {
    tg.style.opacity = compState.active ? '0.55' : '1';
    tg.style.pointerEvents = compState.active ? 'none' : '';
    const lbl = tg.querySelector('.form-label');
    if (lbl) lbl.textContent = compState.active ? 'Tipo de preguntas (fijado por admin)' : 'Tipo de preguntas';
  }
}

function startCompetitionCountdown() {
  clearInterval(compCountdownInt);
  if (!compState.active || !compState.endTime) return;
  const tick = () => {
    const el = document.getElementById('comp-countdown');
    const now = new Date();
    const diff = compState.endTime - now;
    if (diff <= 0) {
      clearInterval(compCountdownInt);
      if (el) el.textContent = '¡Tiempo terminado!';
      finishCompetition();
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const cdStr = (d > 0 ? d + 'd ' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    if (el) el.textContent = cdStr;
    const mbCd = document.getElementById('mode-banner-cd');
    if (mbCd) mbCd.textContent = cdStr;
  };
  tick();
  compCountdownInt = setInterval(tick, 1000);
}

async function startCompetition() {
  const days = parseInt(document.getElementById('comp-days')?.value || 0);
  const hours = parseInt(document.getElementById('comp-hours')?.value || 0);
  const minutes = parseInt(document.getElementById('comp-minutes')?.value || 0);
  const durationMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
  if (durationMs <= 0) {
    alert('Por favor especifica una duracion valida.');
    return;
  }
  const prize = document.getElementById('prize-input')?.value.trim() || '';
  const end = new Date(Date.now() + durationMs);
  if (!confirm('Iniciar competencia hasta ' + end.toLocaleString('es-CL') + '?')) return;
  const now = new Date();
  const compId = 'comp_' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
  try {
    await Promise.all([
      sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'competition_active', value: 'true' }) }),
      sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'competition_end', value: end.toISOString() }) }),
      sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'prize', value: prize }) }),
      sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'current_comp_id', value: compId }) })
    ]);
    compState = { active: true, endTime: end, prize: prize, compId: compId };
    updateCompetitionUI();
    startCompetitionCountdown();
    loadRanking();
    alert('Competencia iniciada.');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function updateCompetitionPrize() {
  const prize = document.getElementById('prize-input')?.value.trim() || '';
  try {
    await sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'prize', value: prize }) });
    compState.prize = prize;
    renderCompetitionBanner();
    alert('Premio actualizado.');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function addCompetitionTime() {
  const days = parseInt(prompt('Días a agregar:', '0')) || 0;
  const hours = parseInt(prompt('Horas a agregar:', '0')) || 0;
  const minutes = parseInt(prompt('Minutos a agregar:', '0')) || 0;
  if (days === 0 && hours === 0 && minutes === 0) return;
  const extraMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
  const newEnd = new Date(compState.endTime.getTime() + extraMs);
  try {
    await sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'competition_end', value: newEnd.toISOString() }) });
    compState.endTime = newEnd;
    updateCompetitionUI();
    startCompetitionCountdown();
    alert('Tiempo agregado. Nuevo fin: ' + newEnd.toLocaleString('es-CL'));
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function stopCompetition() {
  if (!confirm('Detener la competencia AHORA? Se guardara el ganador y la app volvera a modo practica.')) return;
  await finishCompetition();
}

async function finishCompetition() {
  try {
    const prize = compState.prize || '';
    const compId = compState.compId;
    const today = new Date().toLocaleDateString('es-CL');
    if (!compId) {
      console.error('finishCompetition: no compId');
      return;
    }
    const scores = await sbGet('/rest/v1/scores?season=eq.' + encodeURIComponent(compId) + '&completed=eq.true&order=pts.desc&limit=500');
    if (scores.length) {
      const best = {};
      scores.forEach(x => { if (!best[x.name] || x.pts > best[x.name].pts) best[x.name] = x; });
      const EXCLUDED = ['obrist'];
      const ranked = Object.values(best).filter(x => !EXCLUDED.includes(x.name.toLowerCase().trim())).sort((a, b) => b.pts - a.pts);
      if (ranked.length) {
        const winner = ranked[0];
        const histRow = { period_label: today, reset_date: today, rank: 1, player_name: winner.name, pts: winner.pts, accuracy: winner.accuracy || 0, timer_sec: winner.timer_sec || 5, prize: prize, season_ref: compId };
        const r = await sbPost('/rest/v1/winners_history', histRow);
        if (!r.ok) {
          const e = await r.text();
          console.error('history save failed:', e);
          alert('ERROR guardando historial. Competencia NO finalizada.');
          return;
        }
      }
    }
    await Promise.all([
      sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'competition_active', value: 'false' }) }),
      sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'competition_end', value: '' }) }),
      sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'current_comp_id', value: '' }) })
    ]);
    compState = { active: false, endTime: null, prize: prize, compId: '' };
    clearInterval(compCountdownInt);
    updateCompetitionUI();
    loadRanking();
    loadWinnersHistory();
    if (adminUnlocked && typeof loadSeasonList === 'function') {
      loadSeasonList();
      loadWinnersMgmt();
    }
  } catch (e) {
    console.error('finishCompetition:', e);
    alert('Error: ' + e.message);
  }
}

async function loadMyHistory() {
  const body = document.getElementById('my-history-body');
  if (!body) return;
  const name = playerName || localStorage.getItem('mda_user_name') || '';
  if (!name) { body.innerHTML = '<div class="no-data">Sin nombre configurado.</div>'; return; }
  body.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    const rows = await sbGet('/rest/v1/scores?name=eq.' + encodeURIComponent(name) + '&order=created_at.desc&limit=50');
    if (!rows.length) { body.innerHTML = '<div class="no-data">Aún no hay partidas para <strong>' + name + '</strong>.</div>'; return; }
    body.innerHTML = '<table><thead><tr><th>Pts</th><th>Pregs.</th><th>Prec.</th><th>Seg.</th><th>Modo</th><th>Fecha</th></tr></thead><tbody>' +
      rows.map(s => {
        const d = new Date(s.created_at);
        const f = d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        const mode = s.season === 'practica' ? '<span style="color:var(--muted)">Práctica</span>' : '<span style="color:var(--gold)">🏆</span>';
        const ok = s.completed !== false;
        return '<tr' + (ok ? '' : ' style="opacity:0.5"') + '><td style="color:' + (ok ? 'var(--gold)' : 'var(--muted)') + ';font-weight:' + (ok ? '800' : 'normal') + ';">' + s.pts + (ok ? '' : ' ✗') + '</td><td>' + (s.total || '?') + '</td><td>' + (s.accuracy || 0) + '%</td><td>' + (s.timer_sec || '?') + 's</td><td>' + mode + '</td><td style="color:var(--muted);font-size:0.7rem">' + f + '</td></tr>';
      }).join('') + '</tbody></table>';
  } catch (e) { body.innerHTML = '<div class="no-data">Error: ' + e.message + '</div>'; }
}