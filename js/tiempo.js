/**
 * tiempo.js - Cronómetro acumulable con performance.now() y pausas de pestaña.
 */

window.App = window.App || {};

App.Tiempo = (function () {
  let tInicio = 0;
  let tiempoAcumuladoPrevio = 0;
  let corriendo = false;
  let callbackTick = null;
  let callbackExpirado = null;
  let limiteMs = 0;
  let intervalId = null;

  function iniciar(tiempoAcumuladoInicialMs, limiteSegundos, onTick, onExpirado) {
    detener();
    tiempoAcumuladoPrevio = Math.max(0, Number(tiempoAcumuladoInicialMs) || 0);
    limiteMs = Math.max(0, Number(limiteSegundos) || 0) * 1000;
    callbackTick = onTick || null;
    callbackExpirado = onExpirado || null;
    tInicio = performance.now();
    corriendo = true;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', manejarCambioVisibilidad);
      document.addEventListener('visibilitychange', manejarCambioVisibilidad);
    }
    intervalId = setInterval(actualizar, 100);
    actualizar();
  }

  function manejarCambioVisibilidad() {
    if (document.hidden) pausar();
    else reanudar();
  }

  function pausar() {
    if (!corriendo) return;
    tiempoAcumuladoPrevio = obtenerTiempoTranscurridoMs();
    corriendo = false;
  }

  function reanudar() {
    if (corriendo) return;
    tInicio = performance.now();
    corriendo = true;
  }

  function obtenerTiempoTranscurridoMs() {
    const ahora = performance.now();
    const total = corriendo ? tiempoAcumuladoPrevio + (ahora - tInicio) : tiempoAcumuladoPrevio;
    const maximo = (App.CONFIG && App.CONFIG.TOPE_PREGUNTA_PRACTICA_MS) || 10 * 60 * 1000;
    return Math.min(Math.max(0, total), maximo);
  }

  function actualizar() {
    if (!corriendo) return;
    const transcurrido = obtenerTiempoTranscurridoMs();
    if (callbackTick) callbackTick(transcurrido, limiteMs);
    if (limiteMs > 0 && transcurrido >= limiteMs) {
      const final = detener();
      if (callbackExpirado) callbackExpirado(final);
    }
  }

  function detener() {
    const finalMs = obtenerTiempoTranscurridoMs();
    corriendo = false;
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', manejarCambioVisibilidad);
    tiempoAcumuladoPrevio = 0;
    tInicio = 0;
    return finalMs;
  }

  function estaCorriendo() { return corriendo; }

  return {
    iniciar: iniciar,
    pausar: pausar,
    reanudar: reanudar,
    detener: detener,
    obtenerTiempoTranscurridoMs: obtenerTiempoTranscurridoMs,
    estaCorriendo: estaCorriendo
  };
})();
