/**
 * sesion.js - Sesiones, nivelación y evolución del nivel.
 * Las preguntas de una sesión se guardan como referencias (tipo, nivel, semilla, versión):
 * al reanudar se regeneran idénticas, así que no hace falta guardar los ejercicios completos.
 * Objeto global: App.Sesion
 */

window.App = window.App || {};

App.Sesion = (function () {
  const cache = {};

  function versionesArea(areaId) {
    const versiones = {};
    App.Registro.obtenerTiposPorArea(areaId).forEach(function (tipo) { versiones[tipo.id] = App.CONFIG.VERSIONES_GENERADOR[tipo.id] || 1; });
    return versiones;
  }

  function crearReferencia(seleccion) {
    const ej = seleccion.ejercicio;
    cache[ej.tipoId + '|' + ej.nivel + '|' + ej.semilla] = ej;
    return { tipoId: ej.tipoId, nivel: ej.nivel, semilla: ej.semilla, version: ej.version, idCanonico: ej.idCanonico, esRepeticion: !!seleccion.esRepeticion };
  }

  /** Regenera (o recupera de memoria) el ejercicio de una referencia. */
  function obtenerEjercicio(ref) {
    const clave = ref.tipoId + '|' + ref.nivel + '|' + ref.semilla;
    if (cache[clave]) return cache[clave];
    const tipo = App.Registro.obtenerTipo(ref.tipoId);
    if (!tipo) throw new Error('Tipo desconocido: ' + ref.tipoId);
    const ej = tipo.generadorFn(ref.nivel, ref.semilla);
    cache[clave] = ej;
    return ej;
  }

  /** Una sesión guardada sigue siendo válida si los generadores no han cambiado de versión. */
  function esCompatible(sesion) {
    if (!sesion) return false;
    const refs = sesion.esNivelacion ? (sesion.bloqueActualPreguntas || []) : (sesion.preguntas || []);
    return refs.every(function (r) { return (App.CONFIG.VERSIONES_GENERADOR[r.tipoId] || 1) === r.version; });
  }

  /** Ordena por rondas: cada ronda tiene un ejercicio de cada tipo y nunca se repite tipo seguido. */
  function ordenarPorRondas(porTipo, azar) {
    const tipos = Object.keys(porTipo);
    const rondas = Math.max.apply(null, tipos.map(function (t) { return porTipo[t].length; }));
    const salida = [];
    let ultimo = null;
    for (let r = 0; r < rondas; r++) {
      let orden = azar.mezclar(tipos.filter(function (t) { return porTipo[t][r]; }));
      if (orden.length > 1 && orden[0] === ultimo) orden = orden.slice(1).concat(orden[0]);
      orden.forEach(function (t) { salida.push(porTipo[t][r]); });
      ultimo = orden[orden.length - 1];
    }
    return salida;
  }

  function crearSesion(areaId, nivel, historialPreguntas) {
    const tipos = App.Registro.obtenerTiposPorArea(areaId);
    if (!tipos.length) throw new Error('No hay tipos para el área ' + areaId + '.');
    const porTipo = {};
    const avisos = [];
    tipos.forEach(function (tipo) {
      const vistos = App.Seleccion.obtenerIdsVistos(historialPreguntas, tipo.id, nivel);
      porTipo[tipo.id] = [];
      for (let i = 0; i < App.CONFIG.PREGUNTAS_POR_TIPO_SESION; i++) {
        const sel = App.Seleccion.seleccionarEjercicio(tipo.id, nivel, vistos);
        vistos.add(sel.ejercicio.idCanonico);
        porTipo[tipo.id].push(crearReferencia(sel));
        if (sel.warningPocos && avisos.indexOf(tipo.nombre) < 0) avisos.push(tipo.nombre);
      }
    });
    const azar = App.Azar.CrearInstancia(App.Azar.generarSemillaAleatoria());
    const preguntas = ordenarPorRondas(porTipo, azar);
    return {
      idSesion: 'sesion_' + Date.now() + '_' + App.Azar.generarSemillaAleatoria(),
      areaId: areaId,
      nivel: nivel,
      versionGeneradores: versionesArea(areaId),
      numeroPreguntas: preguntas.length,
      esNivelacion: false,
      preguntas: preguntas,
      respuestas: [],
      indicePreguntaActual: 0,
      tiempoPreguntaAcumuladoMs: 0,
      timestampInicio: Date.now(),
      ultimaActividadTimestamp: Date.now(),
      completada: false,
      avisosPocos: avisos
    };
  }

  /** Tres preguntas (una de cada tipo, en orden aleatorio) del nivel indicado. */
  function generarBloqueNivelacion(areaId, nivel, historialPreguntas) {
    const tipos = App.Azar.CrearInstancia(App.Azar.generarSemillaAleatoria()).mezclar(App.Registro.obtenerTiposPorArea(areaId));
    const refs = [];
    for (let p = 0; p < App.CONFIG.NIVELACION.PREGUNTAS_POR_BLOQUE; p++) {
      const tipo = tipos[p % tipos.length];
      refs.push(crearReferencia(App.Seleccion.seleccionarEjercicio(tipo.id, nivel, historialPreguntas)));
    }
    return refs;
  }

  function crearSesionNivelacion(areaId, historialPreguntas) {
    const nivel = App.CONFIG.NIVELACION.NIVEL_INICIAL;
    return {
      idSesion: 'nivelacion_' + Date.now() + '_' + App.Azar.generarSemillaAleatoria(),
      areaId: areaId,
      nivel: nivel,
      nivelActualProcesado: nivel,
      versionGeneradores: versionesArea(areaId),
      numeroPreguntas: App.CONFIG.NIVELACION.TOTAL_BLOQUES * App.CONFIG.NIVELACION.PREGUNTAS_POR_BLOQUE,
      esNivelacion: true,
      bloqueActual: 0,
      preguntaEnBloque: 0,
      bloqueActualPreguntas: generarBloqueNivelacion(areaId, nivel, historialPreguntas),
      respuestasBloqueActual: [],
      historialAjustes: [],
      timestampInicio: Date.now(),
      ultimaActividadTimestamp: Date.now(),
      completada: false
    };
  }

  function calcularAjusteNivelacion(aciertosBloque, nivelActual) {
    const tabla = App.CONFIG.NIVELACION.AJUSTE_POR_ACIERTOS;
    const delta = tabla[Math.max(0, Math.min(tabla.length - 1, aciertosBloque))];
    return { delta: delta, nuevoNivel: Math.max(0, Math.min(10, nivelActual + delta)) };
  }

  /**
   * Registra la respuesta de la pregunta actual de la nivelación.
   * Devuelve { terminada, nivelFinal } y deja la sesión lista para la siguiente pregunta.
   */
  function responderNivelacion(sesion, esAcierto, historialPreguntas) {
    sesion.respuestasBloqueActual.push({ esAcierto: !!esAcierto });
    sesion.ultimaActividadTimestamp = Date.now();
    if (sesion.preguntaEnBloque < App.CONFIG.NIVELACION.PREGUNTAS_POR_BLOQUE - 1) {
      sesion.preguntaEnBloque++;
      return { terminada: false };
    }
    const aciertos = sesion.respuestasBloqueActual.filter(function (r) { return r.esAcierto; }).length;
    const ajuste = calcularAjusteNivelacion(aciertos, sesion.nivelActualProcesado);
    sesion.historialAjustes.push({ bloque: sesion.bloqueActual + 1, nivel: sesion.nivelActualProcesado, aciertos: aciertos, nuevoNivel: ajuste.nuevoNivel });
    sesion.nivelActualProcesado = ajuste.nuevoNivel;
    sesion.respuestasBloqueActual = [];
    if (sesion.bloqueActual < App.CONFIG.NIVELACION.TOTAL_BLOQUES - 1) {
      sesion.bloqueActual++;
      sesion.preguntaEnBloque = 0;
      sesion.bloqueActualPreguntas = generarBloqueNivelacion(sesion.areaId, ajuste.nuevoNivel, historialPreguntas);
      return { terminada: false };
    }
    sesion.completada = true;
    return { terminada: true, nivelFinal: ajuste.nuevoNivel };
  }

  function finalizarNivelacion(estado, sesion) {
    const aciertos = sesion.historialAjustes.reduce(function (s, b) { return s + b.aciertos; }, 0);
    const total = App.CONFIG.NIVELACION.TOTAL_BLOQUES * App.CONFIG.NIVELACION.PREGUNTAS_POR_BLOQUE;
    const prog = estado.progresoAreas[sesion.areaId];
    prog.nivelActual = sesion.nivelActualProcesado;
    prog.nivelInicialEstimado = sesion.nivelActualProcesado;
    prog.sesionEnCurso = null;
    estado.historialSesiones.push({
      idSesion: sesion.idSesion, areaId: sesion.areaId, nivel: sesion.nivelActualProcesado,
      numeroPreguntas: total, versionGeneradores: sesion.versionGeneradores,
      aciertos: aciertos, errores: total - aciertos, omitidas: 0, tiemposAgotados: 0, tiempoTotalMs: 0,
      completada: true, esNivelacion: true, timestamp: Date.now()
    });
    return estado;
  }

  function evaluarEvolucionNivel(historialSesionesArea, nivelActual) {
    if (!Array.isArray(historialSesionesArea)) return { nuevoNivel: nivelActual, cambio: 'mantiene' };
    const completas = historialSesionesArea.filter(function (s) { return s.completada && !s.esNivelacion; });
    const n = App.CONFIG.EVOLUCION.SESIONES_CONSECUTIVAS;
    if (completas.length < n) return { nuevoNivel: nivelActual, cambio: 'mantiene' };
    const ultimas = completas.slice(-n);
    if (!ultimas.every(function (s) { return s.nivel === nivelActual; })) return { nuevoNivel: nivelActual, cambio: 'mantiene' };
    if (ultimas.every(function (s) { return s.aciertos >= App.CONFIG.EVOLUCION.UMBRAL_SUBIR; })) {
      const nuevo = Math.min(10, nivelActual + 1);
      return { nuevoNivel: nuevo, cambio: nuevo > nivelActual ? 'sube' : 'mantiene' };
    }
    if (ultimas.every(function (s) { return s.aciertos <= App.CONFIG.EVOLUCION.UMBRAL_BAJAR; })) {
      const nuevo = Math.max(0, nivelActual - 1);
      return { nuevoNivel: nuevo, cambio: nuevo < nivelActual ? 'baja' : 'mantiene' };
    }
    return { nuevoNivel: nivelActual, cambio: 'mantiene' };
  }

  /** Cierra una sesión completa: guarda resumen, detalle por pregunta y nuevo nivel. */
  function finalizarSesion(estado, sesion) {
    const stats = App.Resultados.calcularResultadosSesion(sesion);
    sesion.completada = true;
    estado.historialSesiones.push({
      idSesion: sesion.idSesion, areaId: sesion.areaId, nivel: sesion.nivel, numeroPreguntas: sesion.preguntas.length,
      versionGeneradores: sesion.versionGeneradores, aciertos: stats.aciertos, errores: stats.errores,
      omitidas: stats.omitidas, tiemposAgotados: stats.tiemposAgotados, tiempoTotalMs: Math.round(stats.tiempoTotalMs),
      completada: true, esNivelacion: false, timestamp: Date.now()
    });
    sesion.respuestas.forEach(function (r) {
      estado.historialPreguntas.push({ idCanonico: r.idCanonico, tipoId: r.tipoId, nivel: r.nivel, esAcierto: r.esAcierto, tiempoMs: Math.round(r.tiempoMs || 0), timestamp: Date.now() });
    });
    App.Almacen.podarHistorialPreguntas(estado);
    const historialArea = estado.historialSesiones.filter(function (s) { return s.areaId === sesion.areaId; });
    const evo = evaluarEvolucionNivel(historialArea, estado.progresoAreas[sesion.areaId].nivelActual);
    estado.progresoAreas[sesion.areaId].nivelActual = evo.nuevoNivel;
    estado.progresoAreas[sesion.areaId].sesionEnCurso = null;
    return { stats: stats, evolucion: evo };
  }

  function estaCaducada(sesion, ahora) {
    if (!sesion || !sesion.ultimaActividadTimestamp) return false;
    return ((ahora || Date.now()) - sesion.ultimaActividadTimestamp) > App.CONFIG.PAUSA_INACTIVIDAD_HORAS * 3600 * 1000;
  }

  /** Archiva como incompletas las sesiones caducadas o creadas con generadores de otra versión. */
  function archivarSesionesPendientes(estado, ahora) {
    let cambios = false;
    Object.keys(estado.progresoAreas).forEach(function (areaId) {
      const pendiente = estado.progresoAreas[areaId].sesionEnCurso;
      if (!pendiente) return;
      const caducada = estaCaducada(pendiente, ahora);
      const incompatible = !esCompatible(pendiente);
      if (!caducada && !incompatible) return;
      const respondidas = pendiente.esNivelacion ? 0 : (pendiente.respuestas || []).length;
      estado.historialSesiones.push({
        idSesion: pendiente.idSesion, areaId: areaId, nivel: pendiente.nivel,
        numeroPreguntas: pendiente.numeroPreguntas, versionGeneradores: pendiente.versionGeneradores || {},
        aciertos: pendiente.esNivelacion ? 0 : (pendiente.respuestas || []).filter(function (r) { return r.esAcierto; }).length,
        errores: 0, omitidas: 0, tiemposAgotados: 0, tiempoTotalMs: 0,
        completada: false, esNivelacion: !!pendiente.esNivelacion, timestamp: Date.now(),
        motivoIncompleta: caducada ? 'Sin actividad durante más de ' + App.CONFIG.PAUSA_INACTIVIDAD_HORAS + ' horas (' + respondidas + ' respuestas).' : 'La app se actualizó y los ejercicios cambiaron.'
      });
      estado.progresoAreas[areaId].sesionEnCurso = null;
      cambios = true;
    });
    return cambios;
  }

  function guardarSesionEnCurso(areaId, sesion) {
    const estado = App.Almacen.cargarEstado();
    if (!estado.progresoAreas[areaId]) return false;
    sesion.ultimaActividadTimestamp = Date.now();
    estado.progresoAreas[areaId].sesionEnCurso = sesion;
    return App.Almacen.guardarEstado(estado);
  }

  function limpiarSesionEnCurso(areaId) {
    const estado = App.Almacen.cargarEstado();
    if (!estado.progresoAreas[areaId]) return false;
    estado.progresoAreas[areaId].sesionEnCurso = null;
    return App.Almacen.guardarEstado(estado);
  }

  /** Simulación de la nivelación con respuestas al azar (p = 0,25) o perfectas. */
  function simularNivelacion(modo, generadorAzar) {
    let nivel = App.CONFIG.NIVELACION.NIVEL_INICIAL;
    const azar = typeof generadorAzar === 'function' ? generadorAzar : Math.random;
    for (let b = 0; b < App.CONFIG.NIVELACION.TOTAL_BLOQUES; b++) {
      let aciertos = 0;
      for (let p = 0; p < App.CONFIG.NIVELACION.PREGUNTAS_POR_BLOQUE; p++) if (modo === 'perfecto' || azar() < 0.25) aciertos++;
      nivel = calcularAjusteNivelacion(aciertos, nivel).nuevoNivel;
    }
    return nivel;
  }

  return {
    crearSesion: crearSesion,
    crearSesionNivelacion: crearSesionNivelacion,
    generarBloqueNivelacion: generarBloqueNivelacion,
    responderNivelacion: responderNivelacion,
    finalizarNivelacion: finalizarNivelacion,
    finalizarSesion: finalizarSesion,
    calcularAjusteNivelacion: calcularAjusteNivelacion,
    evaluarEvolucionNivel: evaluarEvolucionNivel,
    obtenerEjercicio: obtenerEjercicio,
    esCompatible: esCompatible,
    archivarSesionesPendientes: archivarSesionesPendientes,
    simularNivelacion: simularNivelacion,
    versionesArea: versionesArea,
    guardarSesionEnCurso: guardarSesionEnCurso,
    limpiarSesionEnCurso: limpiarSesionEnCurso,
    estaCaducada: estaCaducada,
    ordenarPorRondas: ordenarPorRondas
  };
})();
