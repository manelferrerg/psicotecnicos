/**
 * seleccion.js - Elige ejercicios no vistos y estima cuántos quedan.
 * Objeto global: App.Seleccion
 */

window.App = window.App || {};

App.Seleccion = (function () {
  /** Identificadores ya vistos de un tipo y nivel, según el detalle guardado (últimas 300 preguntas). */
  function obtenerIdsVistos(historialPreguntas, tipoId, nivel) {
    const vistos = new Set();
    if (!Array.isArray(historialPreguntas)) return vistos;
    historialPreguntas.forEach(function (p) {
      if (p && p.tipoId === tipoId && p.nivel === nivel && p.idCanonico) vistos.add(p.idCanonico);
    });
    return vistos;
  }

  /** Ejercicios nuevos estimados = espacio estimado del tipo y nivel − vistos. */
  function estimarNuevos(tipoId, nivel, vistos) {
    const tabla = (App.CONFIG.ESPACIO_ESTIMADO || {})[tipoId];
    const espacio = tabla ? tabla[nivel] : 0;
    return Math.max(0, (espacio || 0) - vistos.size);
  }

  /**
   * Devuelve { ejercicio, esRepeticion, warningPocos, nuevosEstimados }.
   * Prueba semillas nuevas hasta encontrar un ejercicio no visto; si no lo encuentra, repite y lo marca.
   */
  function seleccionarEjercicio(tipoId, nivel, historialPreguntas, semillaFija) {
    const tipo = App.Registro.obtenerTipo(tipoId);
    if (!tipo || typeof tipo.generadorFn !== 'function') throw new Error('Tipo de ejercicio no registrado: ' + tipoId);
    const vistos = historialPreguntas instanceof Set ? historialPreguntas : obtenerIdsVistos(historialPreguntas, tipoId, nivel);

    if (semillaFija !== undefined && semillaFija !== null) {
      const fijo = tipo.generadorFn(nivel, semillaFija);
      return { ejercicio: fijo, esRepeticion: vistos.has(fijo.idCanonico), warningPocos: false, nuevosEstimados: estimarNuevos(tipoId, nivel, vistos) };
    }

    let candidato = null;
    for (let intento = 0; intento < 60; intento++) {
      const ejercicio = tipo.generadorFn(nivel, App.Azar.generarSemillaAleatoria());
      candidato = ejercicio;
      if (!vistos.has(ejercicio.idCanonico)) break;
    }
    const nuevos = estimarNuevos(tipoId, nivel, vistos);
    return {
      ejercicio: candidato,
      esRepeticion: vistos.has(candidato.idCanonico),
      warningPocos: nuevos < App.CONFIG.UMBRAL_ADVERTENCIA_POCOS_EJERCICIOS,
      nuevosEstimados: nuevos
    };
  }

  return { seleccionarEjercicio: seleccionarEjercicio, obtenerIdsVistos: obtenerIdsVistos, estimarNuevos: estimarNuevos };
})();
