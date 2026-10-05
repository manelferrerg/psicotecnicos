/**
 * azar.js - Azar determinista con semilla (mulberry32).
 * La misma semilla produce siempre la misma secuencia de números.
 * Objeto global: App.Azar
 */

window.App = window.App || {};

App.Azar = (function () {
  function crearMulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Convierte un número o un texto en un entero de 32 bits sin signo. */
  function normalizarSemilla(semilla) {
    if (typeof semilla === 'number' && Number.isFinite(semilla)) return (semilla | 0) >>> 0;
    const texto = String(semilla);
    let hash = 2166136261;
    for (let i = 0; i < texto.length; i++) {
      hash ^= texto.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function CrearInstancia(semillaInicial) {
    const semillaNorm = normalizarSemilla(semillaInicial);
    const prng = crearMulberry32(semillaNorm);
    for (let w = 0; w < 5; w++) prng();

    const api = {
      semillaOriginal: semillaInicial,
      semillaNormalizada: semillaNorm,

      /** Número real en [0, 1). */
      siguiente: function () { return prng(); },

      /** Entero en [min, max], ambos incluidos. */
      entero: function (min, max) {
        const a = Math.ceil(min);
        const b = Math.floor(max);
        if (b < a) return a;
        return Math.floor(prng() * (b - a + 1)) + a;
      },

      /** Un elemento al azar de la lista. */
      elemento: function (lista) {
        if (!lista || lista.length === 0) return null;
        return lista[Math.floor(prng() * lista.length)];
      },

      /** Copia mezclada de la lista (Fisher-Yates). */
      mezclar: function (lista) {
        const copia = lista.slice();
        for (let i = copia.length - 1; i > 0; i--) {
          const j = Math.floor(prng() * (i + 1));
          const tmp = copia[i];
          copia[i] = copia[j];
          copia[j] = tmp;
        }
        return copia;
      },

      /** n elementos distintos de la lista, en orden aleatorio. */
      elegirVarios: function (lista, n) {
        return api.mezclar(lista).slice(0, n);
      },

      /** Verdadero con probabilidad p. */
      probabilidad: function (p) { return prng() < p; },

      /**
       * Coloca la opción correcta (primera de la lista) en una posición uniforme 0–3
       * y mezcla las demás.
       */
      mezclarOpciones: function (opciones) {
        const correcta = opciones[0];
        const distractores = api.mezclar(opciones.slice(1));
        const pos = api.entero(0, opciones.length - 1);
        const resultado = [];
        let d = 0;
        for (let i = 0; i < opciones.length; i++) resultado.push(i === pos ? correcta : distractores[d++]);
        return { opciones: resultado, idxCorrecta: pos };
      }
    };
    return api;
  }

  /** Semilla nueva para un ejercicio nuevo (no necesita ser reproducible). */
  function generarSemillaAleatoria() {
    return Math.floor(Math.random() * 2147483647);
  }

  return {
    CrearInstancia: CrearInstancia,
    generarSemillaAleatoria: generarSemillaAleatoria,
    normalizarSemilla: normalizarSemilla
  };
})();
