// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

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

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) location.reload();
  });
}

// Polling de estado de competencia cada 2 minutos
setInterval(loadCompetition, 120000);