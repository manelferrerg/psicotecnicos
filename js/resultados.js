/**
 * resultados.js - Cálculo de resultados, nota con penalización y gráfica de evolución en SVG.
 * Objeto global: App.Resultados
 */

window.App = window.App || {};

App.Resultados = (function () {
  /**
   * Desglose de una sesión. Errores = respuestas elegidas incorrectas.
   * Omitidas y tiempos agotados se cuentan aparte: no suman aciertos y no restan en la nota.
   */
  function calcularResultadosSesion(sesion) {
    if (!sesion || !Array.isArray(sesion.respuestas)) return null;
    let aciertos = 0;
    let errores = 0;
    let omitidas = 0;
    let tiemposAgotados = 0;
    let tiempoTotalMs = 0;
    const porTipo = {};
    sesion.respuestas.forEach(function (r) {
      tiempoTotalMs += r.tiempoMs || 0;
      const t = r.tipoId || 'desconocido';
      if (!porTipo[t]) porTipo[t] = { aciertos: 0, errores: 0, omitidas: 0, tiemposAgotados: 0, total: 0 };
      porTipo[t].total++;
      if (r.esTiempoAgotado) { tiemposAgotados++; porTipo[t].tiemposAgotados++; }
      else if (r.esOmitida) { omitidas++; porTipo[t].omitidas++; }
      else if (r.esAcierto) { aciertos++; porTipo[t].aciertos++; }
      else { errores++; porTipo[t].errores++; }
    });
    const total = sesion.respuestas.length;
    return {
      totalPreguntas: total,
      aciertos: aciertos,
      errores: errores,
      omitidas: omitidas,
      tiemposAgotados: tiemposAgotados,
      porcentajeAciertos: total ? Math.round((aciertos / total) * 1000) / 10 : 0,
      tiempoTotalMs: tiempoTotalMs,
      tiempoMedioMs: total ? Math.round(tiempoTotalMs / total) : 0,
      notaOposicion: Math.round((aciertos - errores / 3) * 100) / 100,
      rendimientoPorTipo: porTipo
    };
  }

  /** Sesiones comparables: misma área, nivel, número de preguntas y versión de los generadores actuales. */
  function sesionesComparables(historialSesiones, areaId, nivel) {
    const versiones = App.Sesion.versionesArea(areaId);
    const numero = App.CONFIG.PREGUNTAS_POR_SESION;
    return (historialSesiones || []).filter(function (s) {
      if (!s.completada || s.esNivelacion || s.areaId !== areaId || s.nivel !== nivel) return false;
      if (s.numeroPreguntas !== numero) return false;
      const v = s.versionGeneradores || {};
      return Object.keys(versiones).every(function (t) { return Number(v[t]) === Number(versiones[t]); });
    });
  }

  function generarGraficoEvolucionSVG(historialSesiones, areaId, nivel) {
    const comparables = sesionesComparables(historialSesiones, areaId, nivel).slice(-20);
    if (comparables.length < 2) {
      return { svg: null, mensaje: 'La gráfica aparece cuando hay al menos 2 sesiones completas comparables en tu nivel actual (' + nivel + '). Solo se unen sesiones del mismo nivel y la misma versión de los ejercicios.' };
    }
    const ancho = 560;
    const alto = 220;
    const izq = 40;
    const der = 16;
    const arriba = 16;
    const abajo = 30;
    const w = ancho - izq - der;
    const h = alto - arriba - abajo;
    const max = App.CONFIG.PREGUNTAS_POR_SESION;
    const x = function (i) { return izq + (comparables.length === 1 ? w / 2 : (i / (comparables.length - 1)) * w); };
    const y = function (v) { return arriba + h - (v / max) * h; };
    let svg = '<svg viewBox="0 0 ' + ancho + ' ' + alto + '" class="grafico-svg" role="img" aria-label="Aciertos en las últimas ' + comparables.length + ' sesiones comparables del nivel ' + nivel + ': ' + comparables.map(function (s) { return s.aciertos; }).join(', ') + ' de ' + max + '.">';
    [0, 3, 6, 9, 12].forEach(function (v) {
      svg += '<line x1="' + izq + '" y1="' + y(v) + '" x2="' + (ancho - der) + '" y2="' + y(v) + '" class="grafico-rejilla"/>';
      svg += '<text x="' + (izq - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="grafico-eje">' + v + '</text>';
    });
    svg += '<line x1="' + izq + '" y1="' + y(App.CONFIG.EVOLUCION.UMBRAL_SUBIR) + '" x2="' + (ancho - der) + '" y2="' + y(App.CONFIG.EVOLUCION.UMBRAL_SUBIR) + '" class="grafico-umbral"/>';
    svg += '<text x="' + (ancho - der) + '" y="' + (y(App.CONFIG.EVOLUCION.UMBRAL_SUBIR) - 6) + '" text-anchor="end" class="grafico-eje">' + App.CONFIG.EVOLUCION.UMBRAL_SUBIR + ' = umbral para subir</text>';
    let d = '';
    comparables.forEach(function (s, i) { d += (i ? ' L ' : 'M ') + x(i).toFixed(1) + ' ' + y(s.aciertos).toFixed(1); });
    svg += '<path d="' + d + '" class="grafico-linea"/>';
    comparables.forEach(function (s, i) {
      svg += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(s.aciertos).toFixed(1) + '" r="4.5" class="grafico-punto"/>';
      svg += '<text x="' + x(i).toFixed(1) + '" y="' + (y(s.aciertos) - 9).toFixed(1) + '" text-anchor="middle" class="grafico-valor">' + s.aciertos + '</text>';
    });
    svg += '<text x="' + (izq + w / 2) + '" y="' + (alto - 6) + '" text-anchor="middle" class="grafico-eje">Sesiones (de la más antigua a la más reciente)</text>';
    svg += '</svg>';
    return { svg: svg, mensaje: null };
  }

  return {
    calcularResultadosSesion: calcularResultadosSesion,
    sesionesComparables: sesionesComparables,
    generarGraficoEvolucionSVG: generarGraficoEvolucionSVG
  };
})();
