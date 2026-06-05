// ============================================
// UI: NAVEGACIÓN, MODALES, WELCOME
// ============================================

// Seguimiento de historial para modales y diálogos
let _modalHistoryId = null;
let _skipNextPopstate = false;

function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id !== 'modal-dialog') {
    history.pushState({ modal: id }, '');
    _modalHistoryId = id;
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  if (id !== 'modal-dialog' && _modalHistoryId === id) {
    _modalHistoryId = null;
    _skipNextPopstate = true;
    history.back();
  }
}

function goTo(v, _historyOp = 'push') {
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
  if (currentView === 'view-catalog' && v !== 'catalog') {
    if (typeof stopCatalogSlideshow === 'function') stopCatalogSlideshow();
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

  if (v === 'catalog') {
    if (typeof startCatalogSlideshow === 'function') startCatalogSlideshow();
  }
  if (v === 'ranking') {
    loadRanking();
    loadCompetition();
    loadWinnersHistory();
    if (typeof loadMyHistory === 'function') loadMyHistory();
  }
  if (v === 'setup') {
    const pw = MACHINES.filter(m => m.photo_url).length;
    const w = document.getElementById('no-img-warn');
    if (w) w.style.display = pw < 4 ? 'block' : 'none';
    if (typeof loadApprovedQCounts === 'function') loadApprovedQCounts();
  }

  if (_historyOp === 'push') history.pushState({ view: v }, '');
  else if (_historyOp === 'replace') history.replaceState({ view: v }, '');
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
    _updateUserBar();
    goTo('catalog', 'replace');
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

  _updateUserBar();
  goTo('catalog', 'replace');
  requestNotifPermission();
}

function _updateUserBar() {
  const el = document.getElementById('user-bar-name');
  if (el) el.textContent = '👤 ' + (playerName || localStorage.getItem('mda_user_name') || '');
}

async function changeName() {
  const cur = localStorage.getItem('mda_user_name') || '';
  const v = await mdaPrompt('Tu nombre o apodo:', cur);
  if (v === null) return;
  const trimmed = v.trim();
  if (!trimmed) {
    await mdaAlert('El nombre no puede estar vacío.');
    return;
  }
  localStorage.setItem('mda_user_name', trimmed);
  playerName = trimmed;
  _updateUserBar();
}

function requestNotifPermission() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  Notification.requestPermission();
}

function showNotif(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: './icons/icon.svg' }); } catch (e) {}
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

// ===== CUSTOM DIALOGS =====
let _dlgResolve = null;
let _dlgType = null;
let _dlgHistoryPushed = false;

function _showDialog(type, message, def, destructive) {
  return new Promise(resolve => {
    _dlgResolve = resolve;
    _dlgType = type;
    document.getElementById('dialog-message').textContent = message;
    const inputWrap = document.getElementById('dialog-input-wrap');
    const input = document.getElementById('dialog-input');
    const btns = document.getElementById('dialog-btns');
    inputWrap.style.display = type === 'prompt' ? 'block' : 'none';
    if (type === 'prompt') { input.value = def || ''; setTimeout(() => input.focus(), 80); }
    btns.innerHTML = '';
    const done = val => {
      if (!_dlgResolve) return;
      _dlgResolve = null;
      _dlgType = null;
      document.getElementById('modal-dialog').classList.remove('open');
      if (_dlgHistoryPushed) {
        _dlgHistoryPushed = false;
        _skipNextPopstate = true;
        history.back();
      }
      resolve(val);
    };
    const mkBtn = (text, cls, val) => {
      const b = document.createElement('button');
      b.className = 'btn ' + cls;
      b.textContent = text;
      b.onclick = () => done(val);
      return b;
    };
    if (type === 'alert') {
      btns.appendChild(mkBtn('Aceptar', 'btn-primary', undefined));
    } else if (type === 'confirm') {
      btns.appendChild(mkBtn('Cancelar', 'btn-secondary', false));
      btns.appendChild(mkBtn('Confirmar', destructive === false ? 'btn-primary' : 'btn-danger', true));
    } else {
      btns.appendChild(mkBtn('Cancelar', 'btn-secondary', null));
      const ok = document.createElement('button');
      ok.className = 'btn btn-primary';
      ok.textContent = 'Aceptar';
      ok.onclick = () => done(input.value);
      input.onkeydown = ev => { if (ev.key === 'Enter') done(input.value); };
      btns.appendChild(ok);
    }
    history.pushState({ dialog: true }, '');
    _dlgHistoryPushed = true;
    document.getElementById('modal-dialog').classList.add('open');
  });
}

function mdaAlert(msg) { return _showDialog('alert', msg); }
function mdaConfirm(msg, destructive) { return _showDialog('confirm', msg, null, destructive); }
function mdaPrompt(msg, def) { return _showDialog('prompt', msg, def); }

// Tecla Escape
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (_dlgResolve) {
    const resolve = _dlgResolve;
    const type = _dlgType;
    _dlgResolve = null;
    _dlgType = null;
    document.getElementById('modal-dialog').classList.remove('open');
    if (_dlgHistoryPushed) {
      _dlgHistoryPushed = false;
      _skipNextPopstate = true;
      history.back();
    }
    resolve(type === 'alert' ? undefined : type === 'confirm' ? false : null);
  } else {
    if (typeof closeLb === 'function') closeLb();
    document.querySelectorAll('.modal.open').forEach(m => {
      if (m.id !== 'modal-dialog') closeModal(m.id);
    });
  }
});

// Botón retroceder del navegador — cerrar modales y diálogos sin navegar
window.addEventListener('popstate', e => {
  if (_skipNextPopstate) { _skipNextPopstate = false; return; }
  if (_dlgHistoryPushed && _dlgResolve) {
    _dlgHistoryPushed = false;
    const resolve = _dlgResolve;
    const type = _dlgType;
    _dlgResolve = null;
    _dlgType = null;
    document.getElementById('modal-dialog').classList.remove('open');
    resolve(type === 'alert' ? undefined : type === 'confirm' ? false : null);
    return;
  }
  if (_modalHistoryId) {
    const id = _modalHistoryId;
    _modalHistoryId = null;
    document.getElementById(id)?.classList.remove('open');
    return;
  }
  // Navigate views if lightbox is not open (catalog.js handles lightbox)
  if (document.getElementById('lightbox')?.classList.contains('open')) return;
  const NAVIGABLE = ['catalog', 'setup', 'quiz', 'results', 'ranking', 'admin'];
  if (e.state && e.state.view && NAVIGABLE.includes(e.state.view)) {
    goTo(e.state.view, 'none');
  }
});