// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

// PWA: instalación (el listener está en el <head> para capturarlo a tiempo)
let _installPrompt = null;

async function triggerInstall() {
  const prompt = window._installPrompt || _installPrompt;
  if (!prompt) return;
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  if (outcome === 'accepted') {
    window._installPrompt = null;
    _installPrompt = null;
  }
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