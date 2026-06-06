// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

// PWA: instalación
let _installPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  document.getElementById('install-btn-welcome')?.style.setProperty('display', 'block');
  document.getElementById('install-btn-nav')?.style.setProperty('display', 'flex');
});

window.addEventListener('appinstalled', () => {
  _installPrompt = null;
  document.getElementById('install-btn-welcome')?.style.setProperty('display', 'none');
  document.getElementById('install-btn-nav')?.style.setProperty('display', 'none');
});

async function triggerInstall() {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  if (outcome === 'accepted') _installPrompt = null;
}

// Aplicar paleta guardada antes de renderizar
loadSavedPalette();
const _vEl = document.getElementById('app-version');
if (_vEl) _vEl.textContent = 'v' + APP_VERSION;
// Cargar todos los datos y arrancar la app
loadMachines();
loadResetConfig();
loadCompetition();
loadMaxPts();
initApp();

function showUpdateBanner() {
  const b = document.getElementById('update-banner');
  if (b) b.style.display = 'flex';
}

async function checkVersion() {
  try {
    const r = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const { version } = await r.json();
    if (version && version !== APP_VERSION) showUpdateBanner();
  } catch(e) {}
}

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) showUpdateBanner();
  });
  // Verificar actualizaciones del SW cada 5 minutos
  setInterval(() => navigator.serviceWorker.ready.then(r => r.update()), 300000);
}

// Chequear version.json al cargar y cada 5 minutos
checkVersion();
setInterval(checkVersion, 300000);

// Polling de estado de competencia cada 2 minutos
setInterval(loadCompetition, 120000);