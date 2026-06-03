// ============================================
// ADMIN: MODELOS, FOTOS, ESTADÍSTICAS, HISTORIAL
// ============================================

// ===== PALETAS DE COLORES =====
const COLOR_PALETTES = {
  noche:     { name: 'Noche',     '--bg':'#0a0a12','--surface':'#12121e','--card':'#1a1a2e','--accent':'#7c3aed','--accent2':'#06b6d4','--gold':'#c8a850','--green':'#10b981','--red':'#ef4444','--text':'#e8e4f0','--muted':'#64748b','--border':'#2d2d4e' },
  casino:    { name: 'Casino',    '--bg':'#120404','--surface':'#1e0606','--card':'#2a0a0a','--accent':'#e11d1d','--accent2':'#f59e0b','--gold':'#f59e0b','--green':'#16a34a','--red':'#fca5a5','--text':'#ffeee8','--muted':'#8a5050','--border':'#4a1010' },
  neon:      { name: 'Neón',      '--bg':'#060309','--surface':'#0e0518','--card':'#160830','--accent':'#a21caf','--accent2':'#06b6d4','--gold':'#ffec00','--green':'#00ff88','--red':'#ff3060','--text':'#f5d8ff','--muted':'#8060a0','--border':'#2e1060' },
  esmeralda: { name: 'Esmeralda','--bg':'#021208','--surface':'#041d0c','--card':'#082814','--accent':'#15803d','--accent2':'#06d6a0','--gold':'#c8a850','--green':'#4ade80','--red':'#f87171','--text':'#d4f0de','--muted':'#3d7a55','--border':'#0d3d1c' },
  zafiro:    { name: 'Zafiro',   '--bg':'#020810','--surface':'#04101e','--card':'#071428','--accent':'#1d4ed8','--accent2':'#60a5fa','--gold':'#c8a850','--green':'#34d399','--red':'#f87171','--text':'#d4e8fc','--muted':'#3d5a8a','--border':'#0a2048' },
  onix:      { name: 'Ónix',     '--bg':'#050505','--surface':'#0d0d0d','--card':'#151515','--accent':'#475569','--accent2':'#94a3b8','--gold':'#d4af37','--green':'#4ade80','--red':'#f87171','--text':'#f8f8f8','--muted':'#4a4a5a','--border':'#1e1e2a' },
  granate:   { name: 'Granate',  '--bg':'#0e0208','--surface':'#1c0510','--card':'#280818','--accent':'#881337','--accent2':'#e11d48','--gold':'#c8a850','--green':'#4ade80','--red':'#fda4af','--text':'#fce4ee','--muted':'#7a3050','--border':'#420e24' },
  indigo:    { name: 'Índigo',   '--bg':'#060410','--surface':'#0c0820','--card':'#120e30','--accent':'#4338ca','--accent2':'#818cf8','--gold':'#c8a850','--green':'#34d399','--red':'#f87171','--text':'#e4e8ff','--muted':'#4a5080','--border':'#201e50' },
  ambar:     { name: 'Ámbar',    '--bg':'#120900','--surface':'#1e1000','--card':'#2e1800','--accent':'#c2410c','--accent2':'#fbbf24','--gold':'#fbbf24','--green':'#4ade80','--red':'#ef4444','--text':'#fff0d4','--muted':'#8a6030','--border':'#4a2800' },
  titanio:   { name: 'Titanio',  '--bg':'#080c0e','--surface':'#0e1418','--card':'#141e24','--accent':'#0f766e','--accent2':'#2dd4bf','--gold':'#c8a850','--green':'#4ade80','--red':'#f87171','--text':'#e4f0f0','--muted':'#3d5a5a','--border':'#0e2e30' },
};

function applyPalette(key) {
  const p = COLOR_PALETTES[key];
  if (!p) return;
  const root = document.documentElement;
  Object.keys(p).forEach(k => { if (k.startsWith('--')) root.style.setProperty(k, p[k]); });
  localStorage.setItem('mda_palette', key);
  const sel = document.getElementById('palette-select');
  if (sel && sel.value !== key) sel.value = key;
}

function loadSavedPalette() {
  applyPalette(localStorage.getItem('mda_palette') || 'noche');
}

function renderPaletteSelect() {
  const sel = document.getElementById('palette-select');
  if (!sel) return;
  const current = localStorage.getItem('mda_palette') || 'noche';
  sel.innerHTML = Object.keys(COLOR_PALETTES).map(k =>
    '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + COLOR_PALETTES[k].name + '</option>'
  ).join('');
}
document.addEventListener('DOMContentLoaded', renderPaletteSelect);

async function adminLogin() {
  if (adminUnlocked) {
    goTo('admin');
    adminTab('competencia');
    loadResetConfig();
    loadMaxPts();
    loadCompetition();
    return;
  }
  const input = prompt('Clave:');
  if (!input) return;
  if (input.trim() === getClaveHora()) {
    adminUnlocked = true;
    goTo('admin');
    adminTab('competencia');
    loadResetConfig();
    loadMaxPts();
    loadCompetition();
  } else {
    alert('Clave incorrecta.');
  }
}

function adminTab(tab) {
  document.querySelectorAll('.atab-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('atab-' + tab);
  if (panel) panel.style.display = '';
  document.querySelectorAll('.atab').forEach(t => t.classList.toggle('atab-active', t.getAttribute('onclick')?.includes(tab)));
  if (tab === 'modelos') renderAdmin();
  if (tab === 'estadisticas') { loadStats(); loadScoresMgmt(); }
  if (tab === 'historial') {
    loadSeasonList();
    loadWinnersMgmt();
    loadNotesMgmt();
  }
}

function renderAdmin() {
  const q = (document.getElementById('admin-search')?.value || '').toLowerCase();
  const list = document.getElementById('admin-list');
  if (!list) return;
  list.innerHTML = '';
  MACHINES.filter(m => m.name.toLowerCase().includes(q)).forEach(m => {
    const row = document.createElement('div');
    row.className = 'model-row';
    const th = m.photo_url ? '<img class="model-thumb" src="' + getImgUrl(m.photo_url) + '">' : '<div class="model-thumb-empty">🎰</div>';
    const extras = m.photo_urls?.length || 0;
    row.innerHTML = th + '<div class="model-info"><div class="model-name">' + m.name + '</div><div class="model-meta">' + (m.photo_url ? (extras + 1 + ' foto(s)') : 'Sin foto') + ' · ID:' + m.id + '</div></div>' +
      '<div class="model-actions"><button class="btn btn-secondary btn-sm" onclick="openPhotos(' + m.id + ')">📷</button><button class="btn btn-secondary btn-sm" onclick="openEdit(' + m.id + ')">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteModel(' + m.id + ')">🗑️</button></div>';
    list.appendChild(row);
  });
  updateCounts();
}

function openAdd() {
  editingId = null;
  modalNewFile = null;
  document.getElementById('modal-title').textContent = 'Agregar modelo';
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-preview').innerHTML = '<span>Sin imagen</span>';
  document.getElementById('modal-file').value = '';
  openModal('modal-model');
}

function openEdit(id) {
  const m = MACHINES.find(x => x.id === id);
  if (!m) return;
  editingId = id;
  modalNewFile = null;
  document.getElementById('modal-title').textContent = 'Editar: ' + m.name;
  document.getElementById('modal-name').value = m.name;
  document.getElementById('modal-preview').innerHTML = m.photo_url ? '<img src="' + getImgUrl(m.photo_url) + '">' : '<span>Sin imagen</span>';
  document.getElementById('modal-file').value = '';
  openModal('modal-model');
}

function previewFile(input) {
  if (!input.files[0]) return;
  modalNewFile = input.files[0];
  resizeImgPromise(input.files[0], 400, 520).then(b64 => {
    document.getElementById('modal-preview').innerHTML = '<img src="data:image/jpeg;base64,' + b64 + '">';
  });
}

async function saveModel() {
  const name = document.getElementById('modal-name').value.trim();
  if (!name) {
    alert('Nombre obligatorio.');
    return;
  }
  const prog = document.getElementById('modal-progress');
  const saveBtn = document.getElementById('modal-save-btn');
  saveBtn.disabled = true;
  if (editingId === null) {
    if (!modalNewFile) {
      alert('Agrega una foto.');
      saveBtn.disabled = false;
      return;
    }
    prog.style.display = 'block';
    prog.textContent = 'Guardando nombre...';
    const res = await sbPost('/rest/v1/machines', { name, sort_order: MACHINES.length + 1, photo_url: '', photo_urls: '[]' });
    if (!res.ok) {
      const e = await res.text();
      alert('Error: ' + e);
      saveBtn.disabled = false;
      prog.style.display = 'none';
      return;
    }
    const rows = await sbGet('/rest/v1/machines?name=eq.' + encodeURIComponent(name) + '&order=id.desc&limit=1');
    const newId = rows[0]?.id;
    if (!newId) {
      alert('Error al obtener ID.');
      saveBtn.disabled = false;
      prog.style.display = 'none';
      return;
    }
    prog.textContent = 'Subiendo foto...';
    try {
      const filename = makeFilename(newId, 0);
      const url = await uploadPhoto(modalNewFile, filename);
      await sbPatch('/rest/v1/machines?id=eq.' + newId, { photo_url: url });
      MACHINES.push({ id: newId, name, sort_order: MACHINES.length, photo_url: url, photo_urls: [] });
    } catch (e) {
      alert('Nombre guardado pero error en foto: ' + e.message);
    }
  } else {
    const m = MACHINES.find(x => x.id === editingId);
    if (!m) {
      saveBtn.disabled = false;
      return;
    }
    prog.style.display = 'block';
    prog.textContent = 'Guardando...';
    const updateData = { name };
    if (modalNewFile) {
      prog.textContent = 'Subiendo foto...';
      try {
        const filename = makeFilename(editingId, Date.now());
        const url = await uploadPhoto(modalNewFile, filename);
        updateData.photo_url = url;
        m.photo_url = url;
      } catch (e) {
        alert('Error en foto: ' + e.message);
      }
    }
    await sbPatch('/rest/v1/machines?id=eq.' + editingId, updateData);
    m.name = name;
  }
  prog.style.display = 'none';
  saveBtn.disabled = false;
  await loadMachines();
  closeModal('modal-model');
}

async function deleteModel(id) {
  const m = MACHINES.find(x => x.id === id);
  if (!confirm('Eliminar "' + m?.name + '"?')) return;
  const res = await sbDelete('/rest/v1/machines?id=eq.' + id);
  if (!res.ok) {
    const e = await res.text();
    alert('Error: ' + e);
    return;
  }
  MACHINES = MACHINES.filter(x => x.id !== id);
  buildCatalog();
  renderAdmin();
  updateCounts();
}

function openPhotos(id) {
  photosEditingId = id;
  const m = MACHINES.find(x => x.id === id);
  document.getElementById('modal-photos-title').textContent = 'Fotos: ' + (m?.name || '');
  renderPhotosGrid();
  openModal('modal-photos');
}

function renderPhotosGrid() {
  const m = MACHINES.find(x => x.id === photosEditingId);
  if (!m) return;
  const g = document.getElementById('photos-grid');
  g.innerHTML = '';
  if (m.photo_url) {
    const mw = document.createElement('div');
    mw.className = 'photo-wrap';
    mw.innerHTML = '<img src="' + getImgUrl(m.photo_url) + '"><span class="photo-main-badge">MAIN</span>';
    const md = document.createElement('button');
    md.className = 'photo-del';
    md.textContent = 'x';
    md.onclick = async () => {
      const extras = (m.photo_urls || []).filter(p => photoUrl(p) !== m.photo_url);
      if (!extras.length) {
        alert('No puedes eliminar la unica foto.');
        return;
      }
      const newMain = extras[0];
      m.photo_url = photoUrl(newMain);
      m.photo_urls = extras.slice(1);
      await sbPatch('/rest/v1/machines?id=eq.' + m.id, { photo_url: m.photo_url, photo_urls: JSON.stringify(m.photo_urls) });
      renderPhotosGrid();
      buildCatalog();
      renderAdmin();
    };
    mw.appendChild(md);
    g.appendChild(mw);
  }
  (m.photo_urls || []).forEach((entry, idx) => {
    if (photoUrl(entry) === m.photo_url) return;
    const url = photoUrl(entry);
    const ew = document.createElement('div');
    ew.className = 'photo-wrap';
    const by = photoBy(entry);
    ew.innerHTML = '<img src="' + getImgUrl(url) + '">' + (by ? '<div style="position:absolute;left:2px;bottom:2px;background:rgba(0,0,0,0.7);color:#fff;font-size:0.48rem;padding:1px 3px;border-radius:3px;">' + by + '</div>' : '');
    const es = document.createElement('button');
    es.className = 'photo-set-main';
    es.textContent = 'v';
    es.onclick = async () => {
      const old = m.photo_url;
      m.photo_url = url;
      m.photo_urls.splice(idx, 1);
      if (old) m.photo_urls.unshift({ url: old, uploaded_by: '' });
      await sbPatch('/rest/v1/machines?id=eq.' + m.id, { photo_url: url, photo_urls: JSON.stringify(m.photo_urls) });
      renderPhotosGrid();
      buildCatalog();
      renderAdmin();
    };
    const ed = document.createElement('button');
    ed.className = 'photo-del';
    ed.textContent = 'x';
    ed.onclick = async () => {
      m.photo_urls.splice(idx, 1);
      await sbPatch('/rest/v1/machines?id=eq.' + m.id, { photo_urls: JSON.stringify(m.photo_urls) });
      renderPhotosGrid();
      buildCatalog();
      renderAdmin();
    };
    ew.appendChild(es);
    ew.appendChild(ed);
    g.appendChild(ew);
  });
  if (!m.photo_url && !m.photo_urls?.length) g.innerHTML = '<div>Sin fotos.</div>';
}

async function addPhotos(input) {
  const m = MACHINES.find(x => x.id === photosEditingId);
  if (!m || !input.files.length) return;
  if (!m.photo_urls) m.photo_urls = [];
  const prog = document.getElementById('photos-progress');
  prog.style.display = 'block';
  const files = Array.from(input.files);
  for (let i = 0; i < files.length; i++) {
    prog.textContent = 'Subiendo foto ' + (i + 1) + ' de ' + files.length + '...';
    try {
      const filename = makeFilename(m.id, i + '_' + Date.now());
      const url = await uploadPhoto(files[i], filename);
      if (!m.photo_url) {
        m.photo_url = url;
        await sbPatch('/rest/v1/machines?id=eq.' + m.id, { photo_url: url, photo_urls: JSON.stringify(m.photo_urls) });
      } else {
        m.photo_urls.push({ url, uploaded_by: '' });
        await sbPatch('/rest/v1/machines?id=eq.' + m.id, { photo_urls: JSON.stringify(m.photo_urls) });
      }
    } catch (e) {
      alert('Error foto ' + (i + 1) + ': ' + e.message);
    }
  }
  prog.style.display = 'none';
  renderPhotosGrid();
  buildCatalog();
  renderAdmin();
  input.value = '';
}

// ========== ESTADÍSTICAS ==========
async function loadStats() {
  const global = document.getElementById('stats-global');
  const playersEl = document.getElementById('stats-players');
  if (!global) return;
  global.innerHTML = '<div class="loading">Cargando...</div>';
  if (playersEl) playersEl.innerHTML = '<div class="loading">Cargando...</div>';
  
  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const scope = document.getElementById('stats-scope')?.value || 'current';
  try {
    let scores = [];
    if (scope === 'all') {
      scores = await sbGet('/rest/v1/scores?order=id.desc&limit=5000');
    } else if (scope === 'last3') {
      const allScores = await sbGet('/rest/v1/scores?order=id.desc&limit=5000');
      const seasons = [...new Set(allScores.map(x => x.season).filter(s => s && s.startsWith('comp_')))].sort().reverse().slice(0, 3);
      scores = allScores.filter(x => seasons.includes(x.season));
    } else {
      const season = currentSeason();
      scores = await sbGet('/rest/v1/scores?season=eq.' + encodeURIComponent(season) + '&order=id.desc&limit=5000');
    }
    
    const complete = scores.filter(x => x.completed !== false);
    const incomplete = scores.filter(x => x.completed === false);
    const players = [...new Set(scores.map(x => x.name).filter(Boolean))];
    const best = complete.length ? Math.max(...complete.map(x => x.pts || 0)) : 0;
    const avgPts = avg(complete.map(x => x.pts || 0));
    const avgAcc = avg(complete.map(x => x.accuracy || 0));
    
    global.innerHTML = 
      '<div class="stat-card blue"><div class="stat-card-val">' + complete.length + '</div><div class="stat-card-lbl">partidas completas</div></div>' +
      '<div class="stat-card purple"><div class="stat-card-val">' + incomplete.length + '</div><div class="stat-card-lbl">incompletas</div></div>' +
      '<div class="stat-card green"><div class="stat-card-val">' + players.length + '</div><div class="stat-card-lbl">jugadores</div></div>' +
      '<div class="stat-card gold"><div class="stat-card-val">' + best + '</div><div class="stat-card-lbl">mejor puntaje</div></div>' +
      '<div class="stat-card"><div class="stat-card-val">' + avgPts + '</div><div class="stat-card-lbl">promedio pts</div></div>' +
      '<div class="stat-card green"><div class="stat-card-val">' + avgAcc + '%</div><div class="stat-card-lbl">precision media</div></div>';
    
    if (playersEl && players.length) {
      const byPlayer = {};
      scores.forEach(s => {
        const name = s.name || 'Sin nombre';
        if (!byPlayer[name]) byPlayer[name] = { name, complete: 0, incomplete: 0, best: 0, pts: [], acc: [] };
        const p = byPlayer[name];
        if (s.completed === false) {
          p.incomplete++;
        } else {
          p.complete++;
          p.pts.push(s.pts || 0);
          p.acc.push(s.accuracy || 0);
          p.best = Math.max(p.best, s.pts || 0);
        }
      });
      const playerRows = Object.values(byPlayer).sort((a, b) => b.best - a.best).slice(0, 50);
      playersEl.innerHTML = '<table><thead><tr><th>Jugador</th><th>Mejor</th><th>Prom.</th><th>Prec.</th><th>OK</th><th>Inc.</th></tr></thead><tbody>' +
        playerRows.map(p => '<tr><td><strong>' + p.name + '</strong></td><td style="color:var(--gold)">' + p.best + '</td><td>' + avg(p.pts) + '</td><td>' + avg(p.acc) + '%</td><td style="color:var(--green)">' + p.complete + '</td><td style="color:var(--red)">' + p.incomplete + '</td></tr>').join('') +
        '</tbody><tr>';
    } else if (playersEl) {
      playersEl.innerHTML = '<div class="no-data">Sin datos de jugadores.</div>';
    }
  } catch (e) {
    global.innerHTML = '<div class="no-data">Error: ' + e.message + '</div>';
    if (playersEl) playersEl.innerHTML = '<div class="no-data">Error: ' + e.message + '</div>';
  }
}

// ========== MAX PTS ==========
async function loadMaxPts() {
  try {
    const rows = await sbGet('/rest/v1/settings?key=in.(max_pts_5,max_pts_10,max_pts_20)');
    rows.forEach(r => {
      const q = parseInt(r.key.replace('max_pts_', ''));
      maxPtsConfig[q] = parseInt(r.value) || maxPtsConfig[q];
    });
    [5, 10, 20].forEach(q => {
      const el = document.getElementById('max-pts-' + q);
      if (el) el.value = maxPtsConfig[q];
    });
    if (typeof updateSetupChips === 'function') updateSetupChips();
  } catch (e) {
    console.error('loadMaxPts:', e);
  }
}

async function saveMaxPts() {
  const vals = {
    5: parseInt(document.getElementById('max-pts-5')?.value) || 1000,
    10: parseInt(document.getElementById('max-pts-10')?.value) || 1200,
    20: parseInt(document.getElementById('max-pts-20')?.value) || 1300
  };
  try {
    await Promise.all([5, 10, 20].map(q =>
      sbFetch('/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'max_pts_' + q, value: String(vals[q]) }) })
    ));
    maxPtsConfig = vals;
    if (typeof updateSetupChips === 'function') updateSetupChips();
    alert('Guardado.');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ========== RESET CONFIG ==========
async function loadResetConfig() {
  try {
    const rows = await sbGet('/rest/v1/settings?key=eq.prize');
    resetConfig.prize = rows[0]?.value || '';
    const pi = document.getElementById('prize-input');
    if (pi) pi.value = resetConfig.prize;
  } catch (e) {
    console.error('loadResetConfig:', e);
  }
}

// ========== PUBLIC UPLOAD ==========
function openPublicUpload() {
  publicUploadFiles = [];
  publicUploadMachineId = null;
  document.getElementById('public-uploader').value = '';
  document.getElementById('public-machine-search').value = '';
  document.getElementById('public-upload-preview').innerHTML = '<span>Sin fotos seleccionadas</span>';
  renderPublicMachineList();
  openModal('modal-public-upload');
}

function publicPickPhotos(input) {
  const files = Array.from(input.files || []).filter(f => f.type && f.type.startsWith('image/')).slice(0, 3);
  publicUploadFiles = files;
  const preview = document.getElementById('public-upload-preview');
  if (!files.length) {
    preview.innerHTML = '<span>Sin fotos seleccionadas</span>';
    return;
  }
  preview.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + files.map((f, i) => '<div style="background:var(--surface);padding:8px;border-radius:8px;font-size:0.72rem;">Foto ' + (i + 1) + '</div>').join('') + '</div>';
  if (input.files.length > 3) alert('Solo se cargarán las primeras 3 fotos.');
}

function renderPublicMachineList() {
  const list = document.getElementById('public-machine-list');
  if (!list) return;
  const q = (document.getElementById('public-machine-search')?.value || '').toLowerCase();
  const rows = MACHINES.filter(m => m.name.toLowerCase().includes(q)).slice(0, 80);
  if (!rows.length) {
    list.innerHTML = '<div class="no-data">Sin modelos.</div>';
    return;
  }
  list.innerHTML = '';
  rows.forEach(m => {
    const row = document.createElement('div');
    row.className = 'player-header';
    row.style.padding = '9px 12px';
    row.innerHTML = '<span style="font-weight:800;">' + m.name + '</span>';
    row.onclick = () => {
      publicUploadMachineId = m.id;
      document.querySelectorAll('#public-machine-list .player-header').forEach(x => x.style.background = '');
      row.style.background = 'rgba(6,182,212,0.16)';
    };
    list.appendChild(row);
  });
}

async function savePublicUpload() {
  const by = document.getElementById('public-uploader')?.value.trim();
  if (!by) {
    alert('Escribe quien sube la foto.');
    return;
  }
  if (!publicUploadFiles.length) {
    alert('Selecciona al menos una foto.');
    return;
  }
  const m = MACHINES.find(x => x.id === publicUploadMachineId);
  if (!m) {
    alert('Selecciona la maquina correspondiente.');
    return;
  }
  if (!m.photo_urls) m.photo_urls = [];
  const prog = document.getElementById('public-upload-progress');
  prog.style.display = 'block';
  try {
    for (let i = 0; i < publicUploadFiles.length; i++) {
      prog.textContent = 'Subiendo foto ' + (i + 1) + ' de ' + publicUploadFiles.length + '...';
      const filename = makeFilename(m.id, 'public_' + i + '_' + Date.now());
      const url = await uploadPhoto(publicUploadFiles[i], filename);
      const entry = makePhotoEntry(url, by);
      if (!m.photo_url) {
        m.photo_url = url;
        m.photo_urls.push(entry);
        await sbPatch('/rest/v1/machines?id=eq.' + m.id, { photo_url: url, photo_urls: JSON.stringify(m.photo_urls) });
      } else {
        m.photo_urls.push(entry);
        await sbPatch('/rest/v1/machines?id=eq.' + m.id, { photo_urls: JSON.stringify(m.photo_urls) });
      }
    }
    prog.textContent = 'Fotos guardadas. Subidas por ' + by + '.';
    await loadMachines();
    setTimeout(() => closeModal('modal-public-upload'), 700);
  } catch (e) {
    alert('Error al subir: ' + e.message);
  } finally {
    setTimeout(() => { prog.style.display = 'none'; }, 900);
  }
}

// ========== SEASONS & WINNERS MGMT ==========
async function loadSeasonList() {
  try {
    const rows = await sbGet('/rest/v1/winners_history?rank=eq.1&order=id.desc&limit=200');
    const sel = document.getElementById('season-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar período --</option>';
    const winners = rows.map(w => ({ season: w.season_ref || (w.reset_date || '').replace(/\//g, '-'), label: w.reset_date || w.period_label || '' }));
    winners.forEach(w => {
      if (w.season) {
        const opt = document.createElement('option');
        opt.value = w.season;
        opt.textContent = w.label || w.season;
        sel.appendChild(opt);
      }
    });
  } catch (e) {
    console.error('loadSeasonList:', e);
  }
}

async function loadSeasonData() {
  const season = document.getElementById('season-select')?.value;
  const body = document.getElementById('season-data');
  if (!season) {
    body.innerHTML = '<div class="no-data">Selecciona un período.</div>';
    return;
  }
  body.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    const scores = await sbGet('/rest/v1/scores?season=eq.' + encodeURIComponent(season) + '&order=pts.desc&limit=500');
    if (!scores.length) {
      body.innerHTML = '<div class="no-data">Sin datos.</div>';
      return;
    }
    const completeScores = scores.filter(s => s.completed !== false);
    const best = {};
    completeScores.forEach(x => { if (!best[x.name] || x.pts > best[x.name].pts) best[x.name] = x; });
    const top = Object.values(best).sort((a, b) => b.pts - a.pts);
    const M = ['🥇', '🥈', '🥉'];
    body.innerHTML = '<table><thead><tr><th>#</th><th>Jugador</th><th>Mejor puntaje</th><th>Preguntas</th><th>Prec.</th><th>Seg.</th><th>Fecha</th></tr></thead><tbody>' +
      top.map((x, i) => {
        const f = new Date(x.created_at).toLocaleDateString('es-CL');
        return '<tr class="rank-' + (i + 1) + '"><td>' + (M[i] || i + 1) + '</td><td><strong>' + x.name + '</strong></td><td style="color:var(--gold);font-weight:800">' + x.pts + '</td><td style="color:var(--accent2);font-size:0.78rem;">' + (x.total || '?') + '</td><td>' + (x.accuracy || 0) + '%</td><td>' + (x.timer_sec || '?') + 's</td><td style="color:var(--muted)">' + f + '</td></tr>';
      }).join('') + '</tbody></table>';
  } catch (e) {
    body.innerHTML = '<div class="no-data">Error: ' + e.message + '</div>';
  }
}

async function loadWinnersMgmt() {
  const list = document.getElementById('winners-mgmt-list');
  if (!list) return;
  list.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    allWinnersMgmt = await sbGet('/rest/v1/winners_history?order=id.desc&limit=200');
    const winners = allWinnersMgmt.filter(w => w.rank === 1);
    if (!winners.length) {
      list.innerHTML = '<div class="no-data">Sin ganadores.</div>';
      return;
    }
    list.innerHTML = '<table><thead><tr><th>Fecha</th><th>Ganador</th><th>Puntaje</th><th>Premio</th><th></th></tr></thead><tbody>' +
      winners.map(w => '<tr><td>' + w.reset_date + '</td><td><strong>' + w.player_name + '</strong></td><td style="color:var(--gold);font-weight:800">' + w.pts + '</td><td>' + (w.prize || '-') + '</td><td><button class="btn btn-danger btn-sm" onclick="deleteWinner(' + w.id + ')">🗑️</button></td></tr>').join('') +
      '</tbody></table>';
  } catch (e) {
    list.innerHTML = '<div class="no-data">Error: ' + e.message + '</div>';
  }
}

async function deleteWinner(id) {
  const w = allWinnersMgmt.find(x => x.id === id);
  if (!confirm('Eliminar del historial: ' + w?.player_name + ' (' + w?.reset_date + ')?')) return;
  try {
    const r = await sbDelete('/rest/v1/winners_history?id=eq.' + id);
    if (!r.ok && r.status !== 204) {
      const e = await r.text();
      alert('Error: ' + e);
      return;
    }
    await loadWinnersMgmt();
    loadWinnersHistory();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function loadNotesMgmt() {
  const list = document.getElementById('notes-mgmt-list');
  if (!list) return;
  list.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    allNotesMgmt = await sbGet('/rest/v1/machine_notes?order=created_at.desc&limit=500');
    renderNotesMgmt();
  } catch (e) {
    list.innerHTML = '<div class="no-data">Error: ' + e.message + '</div>';
  }
}

function renderNotesMgmt() {
  const list = document.getElementById('notes-mgmt-list');
  if (!list) return;
  const q = (document.getElementById('notes-search')?.value || '').toLowerCase();
  const filtered = allNotesMgmt.filter(n => {
    const mName = (MACHINES.find(m => m.id === n.machine_id)?.name || '').toLowerCase();
    return mName.includes(q) || n.author.toLowerCase().includes(q) || n.note.toLowerCase().includes(q);
  });
  if (!filtered.length) {
    list.innerHTML = '<div class="no-data">Sin notas.</div>';
    return;
  }
  list.innerHTML = '<table><thead><tr><th>Máquina</th><th>Autor</th><th>Nota</th><th>Fecha</th><th></th></tr></thead><tbody>' +
    filtered.map(n => {
      const mName = MACHINES.find(m => m.id === n.machine_id)?.name || 'ID ' + n.machine_id;
      const d = new Date(n.created_at).toLocaleDateString('es-CL');
      const noteShort = n.note.length > 80 ? n.note.slice(0, 80) + '...' : n.note;
      return '<tr><td style="color:var(--accent2);font-weight:700;">' + mName + '</td><td>' + n.author + '</td><td>' + noteShort.replace(/</g, '&lt;') + '</td><td>' + d + '</td><td><button class="btn btn-danger btn-sm" onclick="deleteNote(' + n.id + ')">🗑️</button></td></tr>';
    }).join('') + '</tbody></table>';
}

async function deleteNote(id) {
  const n = allNotesMgmt.find(x => x.id === id);
  const mName = MACHINES.find(m => m.id === n?.machine_id)?.name || 'desconocida';
  if (!confirm('¿Eliminar nota de ' + n?.author + ' en ' + mName + '?')) return;
  try {
    const r = await sbDelete('/rest/v1/machine_notes?id=eq.' + id);
    if (!r.ok && r.status !== 204) {
      const e = await r.text();
      alert('Error: ' + e);
      return;
    }
    allNotesMgmt = allNotesMgmt.filter(x => x.id !== id);
    renderNotesMgmt();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ========== EDITAR PUNTAJES ==========
let scoresMgmt = [];

async function loadScoresMgmt() {
  const list = document.getElementById('scores-mgmt-list');
  if (!list) return;
  list.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    const season = currentSeason();
    scoresMgmt = await sbGet('/rest/v1/scores?season=eq.' + encodeURIComponent(season) + '&order=pts.desc&limit=500');
    renderScoresMgmt();
  } catch (e) {
    list.innerHTML = '<div class="no-data">Error: ' + e.message + '</div>';
  }
}

function renderScoresMgmt() {
  const list = document.getElementById('scores-mgmt-list');
  if (!list) return;
  const q = (document.getElementById('scores-search')?.value || '').toLowerCase();
  const filtered = scoresMgmt.filter(s => (s.name || '').toLowerCase().includes(q));
  if (!filtered.length) {
    list.innerHTML = '<div class="no-data">Sin puntajes.</div>';
    return;
  }
  list.innerHTML = '<table><thead><tr><th>Jugador</th><th>Puntaje</th><th>Prec.</th><th>Preguntas</th><th>Seg.</th><th>Fecha</th><th></th></tr></thead><tbody>' +
    filtered.slice(0, 100).map(s => {
      const d = new Date(s.created_at).toLocaleDateString('es-CL');
      return '<tr><td><strong>' + s.name + '</strong></td>' +
        '<td style="color:var(--gold);font-weight:800">' + s.pts + '</td>' +
        '<td>' + (s.accuracy || 0) + '%</td>' +
        '<td style="color:var(--accent2)">' + (s.total || '?') + '</td>' +
        '<td>' + (s.timer_sec || '?') + 's</td>' +
        '<td style="color:var(--muted)">' + d + '</td>' +
        '<td style="white-space:nowrap"><button class="btn btn-secondary btn-sm" onclick="openEditScore(' + s.id + ',' + s.pts + ')">✏️</button> <button class="btn btn-danger btn-sm" onclick="deleteScore(' + s.id + ')">🗑️</button></td></tr>';
    }).join('') +
    '</tbody></table>';
}

async function openEditScore(id, currentPts) {
  const newVal = prompt('Nuevo puntaje para esta partida:', currentPts);
  if (newVal === null) return;
  const pts = parseInt(newVal);
  if (isNaN(pts) || pts < 0) { alert('Puntaje inválido.'); return; }
  try {
    const r = await sbPatch('/rest/v1/scores?id=eq.' + id, { pts });
    if (!r.ok) { const e = await r.text(); alert('Error: ' + e); return; }
    const s = scoresMgmt.find(x => x.id === id);
    if (s) s.pts = pts;
    renderScoresMgmt();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function deleteScore(id) {
  const s = scoresMgmt.find(x => x.id === id);
  if (!confirm('¿Eliminar partida de ' + (s?.name || '?') + ' (' + s?.pts + ' pts)?')) return;
  try {
    const r = await sbDelete('/rest/v1/scores?id=eq.' + id);
    if (!r.ok && r.status !== 204) { const e = await r.text(); alert('Error: ' + e); return; }
    scoresMgmt = scoresMgmt.filter(x => x.id !== id);
    renderScoresMgmt();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}