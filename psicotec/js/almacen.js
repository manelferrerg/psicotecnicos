/**
 * almacen.js - Persistencia en localStorage usando una única clave: «psicotec».
 * Nunca toca otras claves del dominio (otras webs de usuario.github.io comparten almacenamiento).
 * Objeto global: App.Almacen
 */

window.App = window.App || {};

App.Almacen = (function () {
  const CLAVE = App.CONFIG.CLAVE_STORAGE;
  const MAX_PREGUNTAS = App.CONFIG.MAX_HISTORIAL_PREGUNTAS;
  const FORMATO = App.CONFIG.VERSION_FORMATO_STORAGE;
  const AREAS = ['logico', 'numerico'];

  let storageLocal = null;
  let disponible = true;
  let ultimoError = null;

  function crearStorageMemoria() {
    const store = Object.create(null);
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    };
  }

  function detectarStorage() {
    try {
      const ls = typeof window !== 'undefined' ? window.localStorage : null;
      if (!ls) throw new Error('Sin localStorage');
      ls.getItem(CLAVE);
      storageLocal = ls;
      disponible = true;
    } catch (e) {
      storageLocal = crearStorageMemoria();
      disponible = false;
    }
  }
  detectarStorage();

  function obtenerEstadoInicial() {
    const progreso = {};
    AREAS.forEach(function (a) { progreso[a] = { nivelActual: App.CONFIG.NIVEL_POR_DEFECTO, nivelInicialEstimado: null, sesionEnCurso: null }; });
    return {
      formato: FORMATO,
      versionApp: App.CONFIG.VERSION_APP,
      modoTiempo: 'practica',
      progresoAreas: progreso,
      historialSesiones: [],
      historialPreguntas: [],
      ultimaExportacionTimestamp: null,
      numSesionesEnUltimaExportacion: 0,
      copiaSeguridadDeshacer: null
    };
  }

  function clonar(v) { return JSON.parse(JSON.stringify(v)); }

  function podarHistorialPreguntas(estado) {
    if (!Array.isArray(estado.historialPreguntas)) estado.historialPreguntas = [];
    if (estado.historialPreguntas.length > MAX_PREGUNTAS) estado.historialPreguntas = estado.historialPreguntas.slice(-MAX_PREGUNTAS);
    return estado;
  }

  /** Migraciones de formatos antiguos. Hoy solo existe el formato 1. */
  function migrar(obj) {
    if (obj && obj.formato === undefined && obj.progresoAreas) obj.formato = 1;
    return obj;
  }

  function normalizarEstado(estado) {
    const base = obtenerEstadoInicial();
    if (!estado || typeof estado !== 'object') return base;
    const n = Object.assign(base, estado);
    n.formato = FORMATO;
    n.versionApp = App.CONFIG.VERSION_APP;
    if (n.modoTiempo !== 'contrarreloj') n.modoTiempo = 'practica';
    n.progresoAreas = Object.assign(obtenerEstadoInicial().progresoAreas, estado.progresoAreas || {});
    AREAS.forEach(function (a) {
      const p = Object.assign({ nivelActual: App.CONFIG.NIVEL_POR_DEFECTO, nivelInicialEstimado: null, sesionEnCurso: null }, n.progresoAreas[a] || {});
      if (!Number.isInteger(p.nivelActual)) p.nivelActual = App.CONFIG.NIVEL_POR_DEFECTO;
      p.nivelActual = Math.max(0, Math.min(10, p.nivelActual));
      n.progresoAreas[a] = p;
    });
    if (!Array.isArray(n.historialSesiones)) n.historialSesiones = [];
    podarHistorialPreguntas(n);
    if (n.copiaSeguridadDeshacer === undefined) n.copiaSeguridadDeshacer = null;
    return n;
  }

  function leerCrudo() {
    try { return storageLocal.getItem(CLAVE); } catch (e) { return null; }
  }

  /** Formato guardado si es distinto del actual (por ejemplo, de una versión futura); si no, null. */
  function formatoIncompatible() {
    const json = leerCrudo();
    if (!json) return null;
    try {
      const obj = migrar(JSON.parse(json));
      return obj && obj.formato !== FORMATO ? obj.formato : null;
    } catch (e) { return null; }
  }

  function cargarEstado() {
    const json = leerCrudo();
    if (!json) return obtenerEstadoInicial();
    try {
      const obj = migrar(JSON.parse(json));
      if (!obj || typeof obj !== 'object') throw new Error('Estado no válido');
      if (obj.formato !== FORMATO) return obtenerEstadoInicial();
      return normalizarEstado(obj);
    } catch (e) {
      ultimoError = 'Los datos guardados están dañados.';
      return obtenerEstadoInicial();
    }
  }

  /** Guarda el estado completo. Si algo falla, el estado anterior queda intacto. */
  function guardarEstado(estado) {
    if (!estado || typeof estado !== 'object') return false;
    if (formatoIncompatible() !== null) {
      ultimoError = 'Hay datos de otra versión de la app; no se sobrescriben. Exporta o borra desde «Datos».';
      return false;
    }
    let json;
    try { json = JSON.stringify(normalizarEstado(clonar(estado))); } catch (e) { ultimoError = 'No se pudo preparar el guardado.'; return false; }
    try {
      storageLocal.setItem(CLAVE, json);
      ultimoError = null;
      return true;
    } catch (e) {
      ultimoError = 'No hay espacio o el navegador no permite guardar. Se conserva el estado anterior.';
      return false;
    }
  }

  /** Borra solo la clave de la app. */
  function borrarEstado() {
    try { storageLocal.removeItem(CLAVE); return true; } catch (e) { ultimoError = 'No se pudo borrar.'; return false; }
  }

  function restaurarCopiaDeshacer() {
    const estado = cargarEstado();
    if (!estado.copiaSeguridadDeshacer || typeof estado.copiaSeguridadDeshacer !== 'object') return null;
    const copia = clonar(estado.copiaSeguridadDeshacer);
    copia.copiaSeguridadDeshacer = null;
    return guardarEstado(copia) ? copia : null;
  }

  function establecerStorageMock(mock) {
    if (mock && typeof mock.getItem === 'function' && typeof mock.setItem === 'function') { storageLocal = mock; disponible = true; }
  }

  function crearStorageMock(opciones) {
    const cfg = opciones || {};
    const store = Object.create(null);
    if (cfg.inicial) Object.keys(cfg.inicial).forEach(function (k) { store[k] = cfg.inicial[k]; });
    return {
      getItem: function (k) { if (cfg.noDisponible) throw new Error('SecurityError'); return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) {
        if (cfg.noDisponible || cfg.fallaAlGuardar) throw new Error('QuotaExceededError');
        const s = String(v);
        if (Number.isFinite(cfg.cuotaBytes) && s.length > cfg.cuotaBytes) throw new Error('QuotaExceededError');
        store[k] = s;
      },
      removeItem: function (k) { delete store[k]; },
      claves: function () { return Object.keys(store); },
      leer: function (k) { return store[k]; }
    };
  }

  function tamanoBytes(estado) {
    try { return unescape(encodeURIComponent(JSON.stringify(estado))).length; } catch (e) { return 0; }
  }

  return {
    CLAVE: CLAVE,
    cargarEstado: cargarEstado,
    guardarEstado: guardarEstado,
    borrarEstado: borrarEstado,
    podarHistorialPreguntas: podarHistorialPreguntas,
    obtenerEstadoInicial: obtenerEstadoInicial,
    restaurarCopiaDeshacer: restaurarCopiaDeshacer,
    formatoIncompatible: formatoIncompatible,
    establecerStorageMock: establecerStorageMock,
    crearStorageMock: crearStorageMock,
    reiniciarDeteccion: detectarStorage,
    estaDisponible: function () { return disponible; },
    ultimoError: function () { return ultimoError; },
    tamanoBytes: tamanoBytes
  };
})();
