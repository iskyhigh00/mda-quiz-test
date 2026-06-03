// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

// Aplicar paleta guardada antes de renderizar
loadSavedPalette();
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