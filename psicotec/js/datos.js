/**
 * datos.js - Exportar, importar, deshacer la importación y borrar.
 * Un archivo importado se trata siempre como datos: se valida campo a campo,
 * nunca se ejecuta ni se inserta como HTML, y las sesiones en curso no se importan.
 * Objeto global: App.Datos
 */

window.App = window.App || {};

App.Datos = (function () {
  const AREAS = ['logico', 'numerico'];

  function nombreArchivo() {
    return 'psicotec_copia_' + new Date().toISOString().slice(0, 10) + '.json';
  }

  /** Contenido de la copia (sin sesiones en curso ni copia de deshacer). No guarda ni descarga nada. */
  function prepararCopia(estado) {
    const copia = JSON.parse(JSON.stringify(estado));
    AREAS.forEach(function (a) { if (copia.progresoAreas[a]) copia.progresoAreas[a].sesionEnCurso = null; });
    copia.copiaSeguridadDeshacer = null;
    copia.ultimaExportacionTimestamp = Date.now();
    copia.numSesionesEnUltimaExportacion = copia.historialSesiones.filter(function (s) { return s.completada; }).length;
    return { copia: copia, contenido: JSON.stringify(copia, null, 2) };
  }

  /** Prepara la copia, registra la fecha de exportación y lanza la descarga. */
  function exportarDatos() {
    const estado = App.Almacen.cargarEstado();
    const preparada = prepararCopia(estado);
    const copia = preparada.copia;
    const contenido = preparada.contenido;
    estado.ultimaExportacionTimestamp = copia.ultimaExportacionTimestamp;
    estado.numSesionesEnUltimaExportacion = copia.numSesionesEnUltimaExportacion;
    App.Almacen.guardarEstado(estado);
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([contenido], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreArchivo();
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    return { exito: true, contenido: contenido, nombre: nombreArchivo(), mensaje: 'Copia descargada (' + nombreArchivo() + '). Guárdala en un lugar seguro, por ejemplo en iCloud Drive.' };
  }

  function esEnteroEntre(v, min, max) { return Number.isInteger(v) && v >= min && v <= max; }

  function validarObjetoImportado(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { valido: false, mensaje: 'El archivo no contiene una copia de PsicoTec.' };
    if (obj.formato === undefined && obj.progresoAreas) obj.formato = 1;
    if (obj.formato !== App.CONFIG.VERSION_FORMATO_STORAGE) return { valido: false, mensaje: 'El archivo es de un formato no compatible (' + obj.formato + '). Esta versión admite el formato ' + App.CONFIG.VERSION_FORMATO_STORAGE + '.' };
    if (!obj.progresoAreas || typeof obj.progresoAreas !== 'object' || Array.isArray(obj.progresoAreas)) return { valido: false, mensaje: 'El archivo está incompleto: falta el progreso de las áreas.' };
    if (!Array.isArray(obj.historialSesiones) || !Array.isArray(obj.historialPreguntas)) return { valido: false, mensaje: 'El archivo está incompleto: falta el historial.' };
    if (obj.modoTiempo !== undefined && obj.modoTiempo !== 'practica' && obj.modoTiempo !== 'contrarreloj') return { valido: false, mensaje: 'El modo de tiempo del archivo no es válido.' };
    if (obj.historialSesiones.length > 20000 || obj.historialPreguntas.length > App.CONFIG.MAX_HISTORIAL_PREGUNTAS) return { valido: false, mensaje: 'El archivo tiene más datos de los admitidos.' };

    const limpio = App.Almacen.obtenerEstadoInicial();
    limpio.modoTiempo = obj.modoTiempo === 'contrarreloj' ? 'contrarreloj' : 'practica';
    for (let i = 0; i < AREAS.length; i++) {
      const a = AREAS[i];
      const p = obj.progresoAreas[a];
      if (!p || typeof p !== 'object' || !esEnteroEntre(p.nivelActual, 0, 10)) return { valido: false, mensaje: 'El progreso del área «' + a + '» no es válido.' };
      if (p.nivelInicialEstimado !== null && p.nivelInicialEstimado !== undefined && !esEnteroEntre(p.nivelInicialEstimado, 0, 10)) return { valido: false, mensaje: 'El nivel inicial del área «' + a + '» no es válido.' };
      limpio.progresoAreas[a] = { nivelActual: p.nivelActual, nivelInicialEstimado: p.nivelInicialEstimado === undefined ? null : p.nivelInicialEstimado, sesionEnCurso: null };
    }
    const tiposValidos = {};
    App.Registro.obtenerAreas().forEach(function (area) { App.Registro.obtenerTiposPorArea(area.id).forEach(function (t) { tiposValidos[t.id] = true; }); });

    try {
      limpio.historialSesiones = obj.historialSesiones.map(function (s) {
        if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('sesion');
        if (AREAS.indexOf(s.areaId) < 0) throw new Error('area');
        if (!esEnteroEntre(s.nivel, 0, 10)) throw new Error('nivel');
        if (!esEnteroEntre(s.numeroPreguntas, 0, 100)) throw new Error('numeroPreguntas');
        ['aciertos', 'errores', 'omitidas'].forEach(function (c) { if (!esEnteroEntre(s[c], 0, s.numeroPreguntas)) throw new Error(c); });
        if (s.tiemposAgotados !== undefined && !esEnteroEntre(s.tiemposAgotados, 0, s.numeroPreguntas)) throw new Error('tiemposAgotados');
        if (typeof s.completada !== 'boolean' || typeof s.esNivelacion !== 'boolean') throw new Error('banderas');
        if (!Number.isFinite(s.timestamp) || s.timestamp < 0) throw new Error('timestamp');
        const versiones = {};
        Object.keys(s.versionGeneradores || {}).forEach(function (t) {
          if (!tiposValidos[t]) return;
          const v = Number(s.versionGeneradores[t]);
          if (!Number.isInteger(v) || v < 0) throw new Error('version');
          versiones[t] = v;
        });
        return {
          idSesion: typeof s.idSesion === 'string' ? s.idSesion.slice(0, 200) : '',
          areaId: s.areaId, nivel: s.nivel, numeroPreguntas: s.numeroPreguntas, versionGeneradores: versiones,
          aciertos: s.aciertos, errores: s.errores, omitidas: s.omitidas, tiemposAgotados: s.tiemposAgotados || 0,
          tiempoTotalMs: Number.isFinite(s.tiempoTotalMs) && s.tiempoTotalMs >= 0 ? Math.round(s.tiempoTotalMs) : 0,
          completada: s.completada, esNivelacion: s.esNivelacion, timestamp: s.timestamp,
          motivoIncompleta: typeof s.motivoIncompleta === 'string' ? s.motivoIncompleta.slice(0, 300) : undefined
        };
      });
      limpio.historialPreguntas = obj.historialPreguntas.map(function (p) {
        if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('pregunta');
        if (typeof p.idCanonico !== 'string' || !p.idCanonico || p.idCanonico.length > 2000) throw new Error('idCanonico');
        if (!tiposValidos[p.tipoId]) throw new Error('tipoId');
        if (!esEnteroEntre(p.nivel, 0, 10)) throw new Error('nivel');
        if (typeof p.esAcierto !== 'boolean') throw new Error('acierto');
        if (!Number.isFinite(Number(p.tiempoMs)) || Number(p.tiempoMs) < 0) throw new Error('tiempo');
        return { idCanonico: p.idCanonico, tipoId: p.tipoId, nivel: p.nivel, esAcierto: p.esAcierto, tiempoMs: Math.round(Number(p.tiempoMs)), timestamp: Number.isFinite(Number(p.timestamp)) ? Number(p.timestamp) : 0 };
      });
    } catch (e) {
      return { valido: false, mensaje: 'El archivo tiene datos de historial incompletos o no válidos.' };
    }
    if (obj.ultimaExportacionTimestamp !== null && obj.ultimaExportacionTimestamp !== undefined && (!Number.isFinite(obj.ultimaExportacionTimestamp) || obj.ultimaExportacionTimestamp < 0)) return { valido: false, mensaje: 'La fecha de exportación no es válida.' };
    limpio.ultimaExportacionTimestamp = obj.ultimaExportacionTimestamp || null;
    limpio.numSesionesEnUltimaExportacion = esEnteroEntre(obj.numSesionesEnUltimaExportacion, 0, 1e6) ? obj.numSesionesEnUltimaExportacion : 0;
    return { valido: true, objeto: limpio };
  }

  /** Valida todo; si es correcto, sustituye el progreso guardando antes una copia para «Deshacer». */
  function importarDatos(jsonTexto) {
    let objeto;
    try { objeto = JSON.parse(jsonTexto); } catch (e) { return { exito: false, mensaje: 'Archivo dañado: no es un JSON válido. Tu progreso no ha cambiado.' }; }
    const v = validarObjetoImportado(objeto);
    if (!v.valido) return { exito: false, mensaje: v.mensaje + ' Tu progreso no ha cambiado.' };
    const actual = App.Almacen.cargarEstado();
    actual.copiaSeguridadDeshacer = null;
    const nuevo = v.objeto;
    nuevo.copiaSeguridadDeshacer = actual;
    if (!App.Almacen.guardarEstado(nuevo)) return { exito: false, mensaje: 'No hay espacio para importar el archivo. Tu progreso no ha cambiado.' };
    return { exito: true, mensaje: 'Progreso importado. Si no era lo que querías, pulsa «Deshacer importación».' };
  }

  function deshacerImportacion() {
    return App.Almacen.restaurarCopiaDeshacer()
      ? { exito: true, mensaje: 'Se ha recuperado el progreso que tenías antes de importar.' }
      : { exito: false, mensaje: 'No hay ninguna importación que deshacer.' };
  }

  /** Verdadero si conviene exportar: más de N sesiones o de N días desde la última copia. */
  function verificarRecomendacionExportar(estado) {
    if (!estado) return false;
    const completas = estado.historialSesiones.filter(function (s) { return s.completada; }).length;
    if (completas === 0) return false;
    const desde = completas - Number(estado.numSesionesEnUltimaExportacion || 0);
    if (!estado.ultimaExportacionTimestamp) return true;
    const dias = (Date.now() - estado.ultimaExportacionTimestamp) / 86400000;
    return desde >= App.CONFIG.RECORDAR_EXPORTAR_SESIONES || (dias >= App.CONFIG.RECORDAR_EXPORTAR_DIAS && desde > 0);
  }

  function solicitarPersistenciaAlmacenamiento() {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
        navigator.storage.persist().catch(function () {});
      }
    } catch (e) { /* sin efecto: la exportación sigue siendo la copia principal */ }
  }

  return {
    prepararCopia: prepararCopia,
    exportarDatos: exportarDatos,
    validarObjetoImportado: validarObjetoImportado,
    importarDatos: importarDatos,
    deshacerImportacion: deshacerImportacion,
    verificarRecomendacionExportar: verificarRecomendacionExportar,
    solicitarPersistenciaAlmacenamiento: solicitarPersistenciaAlmacenamiento
  };
})();
