// ============================================
// UI: NAVEGACIÓN, MODALES, WELCOME
// ============================================

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function goTo(v) {
  if (v === 'setup') {
    const saved = localStorage.getItem('mda_user_name') || '';
    if (saved && !playerName) playerName = saved;
  }
  
  const currentView = document.querySelector('.view.active')?.id;
  if (currentView === 'view-quiz' && v !== 'quiz' && v !== 'results') {
    clearTimers();
    const overlay = document.getElementById('countdown-overlay');
    if (overlay) overlay.style.display = 'none';
    if (qNum > 0) saveIncompleteGame();
    qNum = 0;
    qTotal = 0;
    qQueue = [];
  }
  
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  
  document.querySelectorAll('.nav-tab').forEach((t, i) => {
    t.classList.toggle('active',
      (v === 'catalog' && i === 0) ||
      ((v === 'setup' || v === 'quiz' || v === 'results') && i === 1) ||
      (v === 'ranking' && i === 2) ||
      (v === 'admin' && i === 3)
    );
  });
  
  if (v === 'ranking') {
    loadRanking();
    loadCompetition();
    loadWinnersHistory();
  }
  if (v === 'setup') {
    const pw = MACHINES.filter(m => m.photo_url).length;
    const w = document.getElementById('no-img-warn');
    if (w) w.style.display = pw < 4 ? 'block' : 'none';
  }
}

function initApp() {
  const saved = localStorage.getItem('mda_user_name');
  const nav = document.querySelector('nav');
  const welcome = document.getElementById('view-welcome');
  const catalog = document.getElementById('view-catalog');
  
  if (saved && saved.trim()) {
    playerName = saved.trim();
    if (nav) nav.style.display = 'flex';
    if (welcome) welcome.classList.remove('active');
    if (catalog) catalog.classList.add('active');
    goTo('catalog');
  } else {
    if (nav) nav.style.display = 'none';
    if (welcome) welcome.classList.add('active');
    document.querySelectorAll('.view').forEach(view => {
      if (view.id !== 'view-welcome') view.classList.remove('active');
    });
    setTimeout(() => document.getElementById('welcome-name-input')?.focus(), 200);
  }
}

function confirmWelcome() {
  const v = document.getElementById('welcome-name-input')?.value.trim();
  if (!v) {
    document.getElementById('welcome-name-input').style.borderColor = 'var(--red)';
    return;
  }
  localStorage.setItem('mda_user_name', v);
  playerName = v;
  
  const nav = document.querySelector('nav');
  if (nav) nav.style.display = 'flex';
  
  const welcome = document.getElementById('view-welcome');
  if (welcome) welcome.classList.remove('active');
  
  goTo('catalog');
}

function changeName() {
  const cur = localStorage.getItem('mda_user_name') || '';
  const v = prompt('Tu nombre o apodo:', cur);
  if (v === null) return;
  const trimmed = v.trim();
  if (!trimmed) {
    alert('El nombre no puede estar vacío.');
    return;
  }
  localStorage.setItem('mda_user_name', trimmed);
  playerName = trimmed;
  alert('Nombre actualizado a: ' + trimmed);
}

function toggleSection(wrapId, btnId) {
  const wrap = document.getElementById(wrapId);
  const btn = document.getElementById(btnId);
  if (!wrap || !btn) return;
  if (wrap.style.display === 'none') {
    wrap.style.display = '';
    btn.innerHTML = '▲ ocultar';
  } else {
    wrap.style.display = 'none';
    btn.innerHTML = '▼ mostrar';
  }
}

function setSyncBadge(s) {
  const el = document.getElementById('sync-badge');
  if (!el) return;
  if (s === 'ok') {
    el.className = 'sync-badge sync-ok';
    el.textContent = 'OK';
  } else if (s === 'err') {
    el.className = 'sync-badge sync-err';
    el.textContent = 'Sin conexion';
  } else {
    el.className = 'sync-badge sync-loading';
    el.textContent = '...';
  }
}

// Evento Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (typeof closeLb === 'function') closeLb();
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
  }
});