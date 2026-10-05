/**
 * numerico.js - Capacidad numérica: series numéricas, operaciones y problemas.
 *
 * Principios:
 * - Los solucionadores no usan la regla de generación: las series se resuelven probando una familia
 *   cerrada de reglas sobre los términos visibles; las operaciones, leyendo y calculando el texto que
 *   ve la persona; los problemas, extrayendo los números del enunciado y aplicando su planteamiento.
 * - Cada distractora nace de un error concreto y lleva su etiqueta. Si faltan errores plausibles,
 *   se completan con errores de cálculo cercanos, colocando la correcta en una posición de orden
 *   aleatoria para que elegir el mayor, el menor o el central no funcione.
 *
 * Objeto global: App.Numerico
 */

window.App = window.App || {};

App.Numerico = (function () {
  const EPS = 1e-9;

  function cfgNivel(tipo, nivel) {
    const tabla = App.CONFIG.PARAMETROS_NIVELES[tipo];
    return tabla[Math.max(0, Math.min(tabla.length - 1, nivel))];
  }

  function redondear(v, dec) {
    const f = Math.pow(10, dec === undefined ? 2 : dec);
    return Math.round((v + (v >= 0 ? EPS : -EPS)) * f) / f;
  }

  function esEntero(v) { return Math.abs(v - Math.round(v)) < 1e-9; }
  function tieneComoMucho2Decimales(v) { return Math.abs(v * 100 - Math.round(v * 100)) < 1e-6; }

  /** Formato español: coma decimal; con unidad monetaria, dos decimales si no es entero. */
  function formatear(v, unidad) {
    let texto;
    if (esEntero(v)) texto = String(Math.round(v));
    else if (unidad === '€' || unidad === '€/l') texto = redondear(v, 2).toFixed(2).replace('.', ',');
    else texto = String(redondear(v, 2)).replace('.', ',');
    return unidad ? texto + ' ' + unidad : texto;
  }

  function parsearNumero(texto) {
    return Number(String(texto).replace(/\s/g, '').replace(',', '.'));
  }

  /**
   * Elige tres distractoras. candidatos: [{ valor, etiqueta }]; relleno: función que propone
   * errores de cálculo cercanos. La correcta queda en una posición de orden uniforme.
   */
  function elegirDistractoras(correcto, candidatos, azar, opciones) {
    const op = opciones || {};
    const valido = function (v) {
      if (!Number.isFinite(v)) return false;
      if (Math.abs(v - correcto) < 1e-9) return false;
      if (op.soloEnteros && !esEntero(v)) return false;
      if (!tieneComoMucho2Decimales(v)) return false;
      if (op.positivo && v <= 0) return false;
      if (op.minimo !== undefined && v < op.minimo) return false;
      if (op.maximo !== undefined && v > op.maximo) return false;
      return true;
    };
    const vistos = {};
    vistos[redondear(correcto)] = true;
    const especificos = [];
    candidatos.forEach(function (c) {
      const v = redondear(c.valor);
      if (valido(v) && !vistos[v]) { vistos[v] = true; especificos.push({ valor: v, etiqueta: c.etiqueta, prioridad: 1 }); }
    });
    const paso = op.paso || Math.max(1, Math.round(Math.abs(correcto) * 0.1));
    const rellenos = [];
    function rellenar(salto, prioridad) {
      [1, 2, 3, 4, 5].forEach(function (k) {
        [correcto + k * salto, correcto - k * salto].forEach(function (v) {
          v = redondear(v);
          if (valido(v) && !vistos[v]) { vistos[v] = true; rellenos.push({ valor: v, etiqueta: 'Error de cálculo: el resultado se desvía de la operación correcta.', prioridad: prioridad }); }
        });
      });
    }
    rellenar(paso, 2);
    // Reserva con saltos de una unidad: solo se usa si hace falta para que la correcta no quede siempre en un extremo.
    if (esEntero(correcto) && paso > 1) rellenar(1, 3);
    const todos = especificos.concat(rellenos);
    function ordenar(lista) {
      return [1, 2, 3].reduce(function (acc, pr) {
        return acc.concat(azar.mezclar(lista.filter(function (c) { return c.prioridad === pr; })));
      }, []);
    }
    const abajo = ordenar(todos.filter(function (c) { return c.valor < correcto; }));
    const arriba = ordenar(todos.filter(function (c) { return c.valor > correcto; }));
    const objetivos = azar.mezclar([0, 1, 2, 3]);
    for (let i = 0; i < objetivos.length; i++) {
      const r = objetivos[i];
      if (abajo.length >= r && arriba.length >= 3 - r) return abajo.slice(0, r).concat(arriba.slice(0, 3 - r));
    }
    return todos.length >= 3 ? ordenar(todos).slice(0, 3) : null;
  }

  function construirOpcionesNumericas(correcto, distractoras, unidad, azar) {
    const base = [{ valor: redondear(correcto), texto: formatear(correcto, unidad), esCorrecta: true, errorEtiqueta: null }]
      .concat(distractoras.map(function (d) { return { valor: d.valor, texto: formatear(d.valor, unidad), esCorrecta: false, errorEtiqueta: d.etiqueta }; }));
    return azar.mezclarOpciones(base);
  }

  function evaluarOpcionesNumericas(ej, valor) {
    if (valor === null || !Number.isFinite(valor)) return { valido: false, motivo: 'No se pudo deducir un resultado.' };
    const coincidencias = [];
    ej.opciones.forEach(function (o, i) {
      const leido = parsearNumero(String(o.texto).replace(/[^\d,\-−]/g, '').replace('−', '-'));
      if (Math.abs(leido - valor) < 1e-6) coincidencias.push(i);
    });
    if (coincidencias.length !== 1) return { valido: false, motivo: coincidencias.length + ' opciones coinciden con el resultado deducido.', prediccion: valor };
    return { valido: coincidencias[0] === ej.opcionCorrectaIndex, indice: coincidencias[0], prediccion: valor, motivo: coincidencias[0] === ej.opcionCorrectaIndex ? '' : 'La opción marcada no es la deducida.' };
  }

  // ================================================================ SERIES NUMÉRICAS

  function dif(t) { const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]); return d; }
  function todosIguales(lista) { return lista.length > 0 && lista.every(function (x) { return Math.abs(x - lista[0]) < 1e-9; }); }

  /** Familia cerrada de reglas simples aplicable a una subserie. Exige pruebas suficientes. */
  function ajustesSimples(t, permitirSegundoOrden) {
    const n = t.length;
    const preds = [];
    const d = dif(t);
    if (n >= 3 && todosIguales(d) && Math.abs(d[0]) > 0) preds.push({ regla: 'aritmetica', pred: t[n - 1] + d[0] });
    if (n >= 3 && t.every(function (x) { return x !== 0; })) {
      const r = t[1] / t[0];
      if (Math.abs(r - 1) > 1e-9 && r > 0 && t.every(function (x, i) { return i === 0 || Math.abs(x - t[i - 1] * r) < 1e-6; })) preds.push({ regla: 'geometrica', pred: t[n - 1] * r });
    }
    if (permitirSegundoOrden && n >= 4) {
      const dd = dif(d);
      if (todosIguales(dd) && Math.abs(dd[0]) > 0) preds.push({ regla: 'segundo_orden', pred: t[n - 1] + d[d.length - 1] + dd[0] });
    }
    return preds;
  }

  /** Todas las predicciones de la familia que encajan con los términos visibles. */
  function prediccionesSerie(t) {
    const n = t.length;
    const preds = ajustesSimples(t, true);
    if (n >= 4 && t[1] !== t[0]) {
      const a = (t[2] - t[1]) / (t[1] - t[0]);
      const b = t[1] - a * t[0];
      if (Math.abs(a) > 1e-9 && t.every(function (x, i) { return i === 0 || Math.abs(x - (a * t[i - 1] + b)) < 1e-6; })) preds.push({ regla: 'lineal_ab', pred: a * t[n - 1] + b });
    }
    if (n >= 4 && t.every(function (x, i) { return i < 2 || Math.abs(x - (t[i - 1] + t[i - 2])) < 1e-9; })) preds.push({ regla: 'suma_dos_anteriores', pred: t[n - 1] + t[n - 2] });
    const d = dif(t);
    if (n >= 4 && d.every(function (x) { return x !== 0; })) {
      const r = d[1] / d[0];
      if (Math.abs(r - 1) > 1e-9 && d.every(function (x, i) { return i === 0 || Math.abs(x - d[i - 1] * r) < 1e-6; })) preds.push({ regla: 'diferencias_geometricas', pred: t[n - 1] + d[d.length - 1] * r });
    }
    // Intercaladas: cada subserie debe seguir por sí misma una regla simple con pruebas suficientes.
    const pares = t.filter(function (_, i) { return i % 2 === 0; });
    const impares = t.filter(function (_, i) { return i % 2 === 1; });
    const ajPares = ajustesSimples(pares, pares.length >= 4);
    const ajImpares = ajustesSimples(impares, impares.length >= 4);
    if (ajPares.length && ajImpares.length) {
      (n % 2 === 0 ? ajPares : ajImpares).forEach(function (p) { preds.push({ regla: 'intercalada:' + p.regla, pred: p.pred }); });
    }
    return preds;
  }

  function prediccionUnicaSerie(t) {
    const preds = prediccionesSerie(t);
    const valores = {};
    preds.forEach(function (p) { valores[redondear(p.pred, 6)] = true; });
    const claves = Object.keys(valores);
    return claves.length === 1 ? Number(claves[0]) : null;
  }

  function construirSerie(regla, cfg, n, azar) {
    const terminos = [];
    let texto = '';
    let params = {};
    let errores = [];
    if (regla === 'aritmetica') {
      const d = azar.entero(cfg.diferencia[0], cfg.diferencia[1]);
      if (cfg.creciente) {
        const inicio = azar.entero(1, Math.max(1, Math.min(50, cfg.maximo - d * n)));
        for (let i = 0; i <= n; i++) terminos.push(inicio + d * i);
        texto = 'Se suma ' + d + ' a cada término.';
        params = { inicio: inicio, d: d };
        errores = [
          { valor: terminos[n - 1] - d, etiqueta: 'Restaste la diferencia en lugar de sumarla.' },
          { valor: terminos[n - 1] + 2 * d, etiqueta: 'Sumaste la diferencia dos veces.' },
          { valor: terminos[n] + 1, etiqueta: 'Error de cálculo de una unidad.' },
          { valor: terminos[n] - 1, etiqueta: 'Error de cálculo de una unidad.' }
        ];
      } else {
        const inicio = azar.entero(d * n + 1, Math.min(cfg.maximo, d * n + 60));
        for (let i = 0; i <= n; i++) terminos.push(inicio - d * i);
        texto = 'Se resta ' + d + ' a cada término.';
        params = { inicio: inicio, d: -d };
        errores = [
          { valor: terminos[n - 1] + d, etiqueta: 'Sumaste la diferencia en lugar de restarla.' },
          { valor: terminos[n - 1] - 2 * d, etiqueta: 'Restaste la diferencia dos veces.' },
          { valor: terminos[n] + 1, etiqueta: 'Error de cálculo de una unidad.' },
          { valor: terminos[n] - 1, etiqueta: 'Error de cálculo de una unidad.' }
        ];
      }
    } else if (regla === 'geometrica') {
      const r = azar.elemento(cfg.razones);
      const maxInicio = Math.floor(cfg.maximo / Math.pow(r, n));
      if (maxInicio < 1) return null;
      const inicio = azar.entero(1, Math.min(120, maxInicio));
      for (let i = 0; i <= n; i++) terminos.push(inicio * Math.pow(r, i));
      texto = 'Cada término se multiplica por ' + r + '.';
      params = { inicio: inicio, r: r };
      errores = [
        { valor: terminos[n - 1] + (terminos[n - 1] - terminos[n - 2]), etiqueta: 'Sumaste la última diferencia en lugar de multiplicar.' },
        { valor: terminos[n - 1] * r * r, etiqueta: 'Multiplicaste dos veces.' },
        { valor: terminos[n - 1] * (r + 1), etiqueta: 'Multiplicaste por un número de más.' },
        { valor: terminos[n - 1] + r, etiqueta: 'Sumaste la razón en lugar de multiplicar.' }
      ];
    } else if (regla === 'segundo_orden') {
      const inicio = azar.entero(1, 20);
      const d0 = azar.entero(1, 6);
      const k = azar.entero(1, 4);
      let d = d0;
      terminos.push(inicio);
      for (let i = 1; i <= n; i++) { terminos.push(terminos[i - 1] + d); d += k; }
      const ultimaDif = terminos[n - 1] - terminos[n - 2];
      texto = 'Las diferencias entre términos aumentan ' + k + ' cada vez (' + dif(terminos.slice(0, n)).join(', ') + ', …).';
      params = { inicio: inicio, d0: d0, k: k };
      errores = [
        { valor: terminos[n - 1] + ultimaDif, etiqueta: 'Repetiste la última diferencia sin aumentarla.' },
        { valor: terminos[n - 1] + ultimaDif + 2 * k, etiqueta: 'Aumentaste la diferencia el doble.' },
        { valor: terminos[n - 1] + k, etiqueta: 'Sumaste solo el aumento de la diferencia.' }
      ];
    } else if (regla === 'intercalada') {
      const pequena = { i0: azar.entero(1, 20), d: azar.elemento([2, 3, 4, 5, 6]) };
      const grande = { i0: azar.entero(30, 70), d: azar.elemento([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7]) };
      if (grande.d === pequena.d) grande.d = pequena.d + 1;
      // La subserie pequeña puede ocupar las posiciones impares o las pares.
      const impar = azar.probabilidad(0.5) ? pequena : grande;
      const par = impar === pequena ? grande : pequena;
      const a0 = impar.i0; const da = impar.d; const b0 = par.i0; const db = par.d;
      for (let i = 0; i <= n; i++) terminos.push(i % 2 === 0 ? a0 + da * (i / 2) : b0 + db * ((i - 1) / 2));
      const propia = n % 2 === 0 ? da : db;
      const otra = n % 2 === 0 ? db : da;
      texto = 'Hay dos series intercaladas: la de las posiciones impares (1.ª, 3.ª, …) ' + (da > 0 ? 'suma ' + da : 'resta ' + (-da)) + ' y la de las pares ' + (db > 0 ? 'suma ' + db : 'resta ' + (-db)) + '.';
      params = { a0: a0, da: da, b0: b0, db: db };
      errores = [
        { valor: terminos[n - 1] + otra, etiqueta: 'Continuaste la otra serie intercalada.' },
        { valor: terminos[n - 2] + otra, etiqueta: 'Aplicaste la diferencia de la otra serie.' },
        { valor: terminos[n - 2] + 2 * propia, etiqueta: 'Sumaste la diferencia dos veces.' }
      ];
    } else if (regla === 'geometrica_no_entera') {
      const r = azar.elemento([1.5, 0.5, 1 / 3]);
      // Se parte de múltiplos de 2ⁿ o 3ⁿ para que todos los términos sean enteros; la respuesta nunca baja de 4.
      const tope = function (base) { return Math.max(1, Math.floor(cfg.maximo / (base * Math.pow(r === 1.5 ? 1.5 : 1, n)))); };
      const inicio = r === 1.5 ? Math.pow(2, n) * azar.entero(1, Math.min(13, tope(Math.pow(2, n)))) : r === 0.5 ? Math.pow(2, n) * azar.entero(4, Math.min(60, tope(Math.pow(2, n)))) : Math.pow(3, n) * azar.entero(4, Math.min(13, tope(Math.pow(3, n))));
      for (let i = 0; i <= n; i++) terminos.push(Math.round(inicio * Math.pow(r, i)));
      texto = r === 1.5 ? 'Cada término se multiplica por 1,5.' : r === 0.5 ? 'Cada término se divide entre 2 (se multiplica por 0,5).' : 'Cada término se divide entre 3.';
      params = { inicio: inicio, r: r };
      errores = [
        { valor: terminos[n - 1] + (terminos[n - 1] - terminos[n - 2]), etiqueta: 'Repetiste la última diferencia en lugar de multiplicar o dividir.' },
        { valor: terminos[n - 1] * r * r, etiqueta: 'Aplicaste la razón dos veces.' },
        { valor: r === 1.5 ? terminos[n - 1] * 2 : terminos[n - 1] - (r === 0.5 ? 2 : 3), etiqueta: r === 1.5 ? 'Multiplicaste por 2 en lugar de por 1,5.' : 'Restaste en lugar de dividir.' },
        { valor: r === 1.5 ? terminos[n - 1] + terminos[n - 1] / 3 : terminos[n - 1] * r + 1, etiqueta: 'Error al aplicar la razón.' }
      ];
    } else if (regla === 'lineal_ab') {
      const a = azar.elemento([2, 3]);
      const b = azar.elemento([-3, -2, -1, 1, 2, 3, 4, 5]);
      const inicio = azar.entero(2, 6);
      terminos.push(inicio);
      for (let i = 1; i <= n; i++) terminos.push(a * terminos[i - 1] + b);
      if (terminos.some(function (x) { return x <= 0; })) return null;
      texto = 'Cada término se multiplica por ' + a + ' y después ' + (b > 0 ? 'se le suma ' + b : 'se le resta ' + (-b)) + '.';
      params = { a: a, b: b, inicio: inicio };
      errores = [
        { valor: a * terminos[n - 1], etiqueta: 'Olvidaste ' + (b > 0 ? 'sumar ' + b : 'restar ' + (-b)) + ' tras multiplicar.' },
        { valor: a * (terminos[n - 1] + b), etiqueta: 'Sumaste antes de multiplicar.' },
        { valor: terminos[n - 1] + (terminos[n - 1] - terminos[n - 2]), etiqueta: 'Repetiste la última diferencia.' }
      ];
    } else if (regla === 'intercalada_mixta') {
      const a0 = azar.entero(1, 20); const da = azar.entero(2, 9);
      const r = azar.elemento([2, 3]); const b0 = azar.entero(1, r === 2 ? 6 : 3);
      for (let i = 0; i <= n; i++) terminos.push(i % 2 === 0 ? a0 + da * (i / 2) : b0 * Math.pow(r, (i - 1) / 2));
      texto = 'Hay dos series intercaladas: la de las posiciones impares suma ' + da + ' y la de las pares se multiplica por ' + r + '.';
      params = { a0: a0, da: da, b0: b0, r: r };
      errores = n % 2 === 0 ? [
        { valor: terminos[n - 1] * r, etiqueta: 'Continuaste la otra serie intercalada.' },
        { valor: terminos[n - 2] * r, etiqueta: 'Multiplicaste en lugar de sumar.' },
        { valor: terminos[n - 2] + 2 * da, etiqueta: 'Sumaste la diferencia dos veces.' }
      ] : [
        { valor: terminos[n - 1] + da, etiqueta: 'Continuaste la otra serie intercalada.' },
        { valor: terminos[n - 2] + da, etiqueta: 'Sumaste en lugar de multiplicar.' },
        { valor: terminos[n - 2] * r * r, etiqueta: 'Multiplicaste dos veces.' }
      ];
    } else if (regla === 'suma_dos_anteriores') {
      const a = azar.entero(1, 20); const b = azar.entero(1, 25);
      terminos.push(a, b);
      while (terminos.length <= n) terminos.push(terminos[terminos.length - 1] + terminos[terminos.length - 2]);
      texto = 'Cada término es la suma de los dos anteriores.';
      params = { a: a, b: b };
      errores = [
        { valor: 2 * terminos[n - 1], etiqueta: 'Sumaste el último término consigo mismo.' },
        { valor: terminos[n - 1] + terminos[n - 3], etiqueta: 'Sumaste términos que no son los dos anteriores.' },
        { valor: terminos[n - 1] + terminos[n - 2] + 1, etiqueta: 'Error de cálculo de una unidad.' }
      ];
    } else if (regla === 'diferencias_geometricas') {
      const inicio = azar.entero(1, 15); const d0 = azar.entero(1, 4); const r = azar.elemento(n >= 7 ? [2] : [2, 3]);
      terminos.push(inicio);
      let d = d0;
      for (let i = 1; i <= n; i++) { terminos.push(terminos[i - 1] + d); d *= r; }
      const ultimaDif = terminos[n - 1] - terminos[n - 2];
      texto = 'Las diferencias entre términos se multiplican por ' + r + ' cada vez (' + dif(terminos.slice(0, n)).join(', ') + ', …).';
      params = { inicio: inicio, d0: d0, r: r };
      errores = [
        { valor: terminos[n - 1] + ultimaDif, etiqueta: 'Repetiste la última diferencia sin multiplicarla.' },
        { valor: terminos[n - 1] + ultimaDif * r * r, etiqueta: 'Multiplicaste la diferencia dos veces.' },
        { valor: terminos[n - 1] * r, etiqueta: 'Multiplicaste el término en lugar de la diferencia.' }
      ];
    } else if (regla === 'intercalada_segundo_orden') {
      const a0 = azar.entero(1, 10); const da0 = azar.entero(1, 4); const ka = azar.entero(1, 3);
      const b0 = azar.entero(20, 50); const db0 = azar.entero(1, 5); const kb = azar.entero(1, 3);
      const sa = [a0]; const sb = [b0];
      let dA = da0; let dB = db0;
      while (sa.length + sb.length <= n + 2) { sa.push(sa[sa.length - 1] + dA); dA += ka; sb.push(sb[sb.length - 1] + dB); dB += kb; }
      for (let i = 0; i <= n; i++) terminos.push(i % 2 === 0 ? sa[i / 2] : sb[(i - 1) / 2]);
      const propia = n % 2 === 0 ? sa : sb;
      const idx = Math.floor(n / 2);
      const difPropia = propia[idx - 1] - propia[idx - 2];
      texto = 'Hay dos series intercaladas y en cada una las diferencias aumentan de forma constante (' + ka + ' en las posiciones impares y ' + kb + ' en las pares).';
      params = { a0: a0, da0: da0, ka: ka, b0: b0, db0: db0, kb: kb };
      errores = [
        { valor: propia[idx - 1] + difPropia, etiqueta: 'Repetiste la última diferencia sin aumentarla.' },
        { valor: terminos[n - 1] + (terminos[n - 1] - terminos[n - 3]), etiqueta: 'Continuaste la otra serie intercalada.' },
        { valor: propia[idx] + 1, etiqueta: 'Error de cálculo de una unidad.' }
      ];
    } else {
      return null;
    }
    if (terminos.some(function (x) { return !esEntero(x) || x <= 0 || x > cfg.maximo; })) return null;
    return { terminos: terminos, texto: texto, params: params, errores: errores };
  }

  function generarSeriesNumericas(nivel, semilla) {
    const cfg = cfgNivel('num_series', nivel);
    for (let intento = 0; intento < 80; intento++) {
      const azar = App.Azar.CrearInstancia(semilla + '|ns|' + intento);
      const regla = azar.elemento(cfg.reglas);
      const n = regla === 'intercalada_segundo_orden' ? Math.max(cfg.visibles, 8) : (cfg.visibles === 8 ? 7 : cfg.visibles);
      const serie = construirSerie(regla, cfg, n, azar);
      if (!serie) continue;
      const visibles = serie.terminos.slice(0, n);
      const correcto = serie.terminos[n];
      const pred = prediccionUnicaSerie(visibles);
      if (pred === null || Math.abs(pred - correcto) > 1e-6) continue;
      const salto = Math.min(Math.abs(correcto - visibles[n - 1]), Math.abs(correcto - visibles[n - 2]));
      const tres = elegirDistractoras(correcto, serie.errores, azar, { soloEnteros: true, positivo: true, paso: Math.max(1, Math.round(salto / 2)) });
      if (!tres) continue;
      const mez = construirOpcionesNumericas(correcto, tres, '', azar);
      return {
        idCanonico: 'num_series|v' + App.CONFIG.VERSIONES_GENERADOR.num_series + '|n' + nivel + '|' + visibles.join(','),
        tipoId: 'num_series', areaId: 'numerico', nivel: nivel, semilla: semilla,
        version: App.CONFIG.VERSIONES_GENERADOR.num_series,
        reglaId: regla,
        enunciado: '¿Qué número continúa la serie?',
        estimulo: { tipo: 'serie_numerica', terminos: visibles },
        opciones: mez.opciones,
        opcionCorrectaIndex: mez.idxCorrecta,
        parametrosNivel: { visibles: n, regla: regla },
        explicacion: {
          datos: 'Serie: ' + visibles.join(', ') + ', ?',
          regla: serie.texto,
          pasos: 'Aplicando la regla después de ' + visibles[n - 1] + ' se obtiene ' + correcto + '.',
          respuesta: 'Opción ' + (mez.idxCorrecta + 1) + ': ' + correcto + '.'
        }
      };
    }
    throw new Error('No se pudo generar una serie numérica válida (nivel ' + nivel + ').');
  }

  function resolverSeriesNumericas(ej) {
    if (!ej || !ej.estimulo || !Array.isArray(ej.estimulo.terminos)) return { valido: false, motivo: 'Faltan términos.' };
    const pred = prediccionUnicaSerie(ej.estimulo.terminos.map(Number));
    if (pred === null) return { valido: false, motivo: 'La serie admite más de una continuación o ninguna.' };
    return evaluarOpcionesNumericas(ej, pred);
  }

  // ================================================================ OPERACIONES

  /**
   * Lee y calcula una expresión tal como la ve la persona.
   * Admite: + − × ÷ paréntesis, decimales con coma, potencias ² y ³,
   * «20 % de», «el 20 % del», «3/4 de» y «2/5 del».
   */
  function evaluarExpresion(texto) {
    const tokens = String(texto).match(/\d+\/\d+|\d+(?:,\d+)?|del|de|el|[()+−×÷%²³]/g) || [];
    let pos = 0;
    function ver() { return tokens[pos]; }
    function tomar(esperado) {
      const t = tokens[pos];
      if (esperado !== undefined && t !== esperado) throw new Error('Se esperaba ' + esperado + ' y aparece ' + t);
      pos++;
      return t;
    }
    function potencia(base) {
      if (ver() === '²') { tomar(); return base * base; }
      if (ver() === '³') { tomar(); return base * base * base; }
      return base;
    }
    function primario() {
      if (ver() === 'el') tomar();
      const t = ver();
      if (t === '(') { tomar('('); const v = expresion(); tomar(')'); return potencia(v); }
      if (/^\d+\/\d+$/.test(t)) {
        tomar();
        const partes = t.split('/');
        const fraccion = Number(partes[0]) / Number(partes[1]);
        if (ver() === 'de' || ver() === 'del') { tomar(); return fraccion * primario(); }
        return fraccion;
      }
      if (/^\d+(,\d+)?$/.test(t)) {
        tomar();
        const num = parsearNumero(t);
        if (ver() === '%') {
          tomar('%');
          if (ver() !== 'de' && ver() !== 'del') throw new Error('Porcentaje sin «de».');
          tomar();
          return num / 100 * primario();
        }
        return potencia(num);
      }
      throw new Error('Expresión no válida cerca de «' + t + '».');
    }
    function termino() {
      let v = primario();
      while (ver() === '×' || ver() === '÷') {
        const op = tomar();
        const d = primario();
        v = op === '×' ? v * d : v / d;
      }
      return v;
    }
    function expresion() {
      let v = termino();
      while (ver() === '+' || ver() === '−') {
        const op = tomar();
        const d = termino();
        v = op === '+' ? v + d : v - d;
      }
      return v;
    }
    const resultado = expresion();
    if (pos !== tokens.length) throw new Error('Sobran símbolos en la expresión.');
    return resultado;
  }

  function fmt(v) { return formatear(v, ''); }

  const PLANTILLAS_OPERACIONES = {
    suma_resta_1: function (azar) {
      const suma = azar.probabilidad(0.5);
      let a = azar.entero(2, 20); let b = azar.entero(1, 9);
      if (!suma && b > a) { const t = a; a = b; b = t; }
      if (!suma && a === b) return null;
      const valor = suma ? a + b : a - b;
      return {
        texto: a + (suma ? ' + ' : ' − ') + b, valor: valor,
        pasos: a + (suma ? ' + ' : ' − ') + b + ' = ' + valor + '.',
        errores: [{ valor: suma ? a - b : a + b, etiqueta: 'Confundiste la suma con la resta.' }, { valor: valor + 1, etiqueta: 'Error de cálculo de una unidad.' }, { valor: valor - 1, etiqueta: 'Error de cálculo de una unidad.' }]
      };
    },
    suma_resta_2: function (azar) {
      const suma = azar.probabilidad(0.5);
      let a = azar.entero(12, 89); let b = azar.entero(11, 79);
      if (!suma && b > a) { const t = a; a = b; b = t; }
      if (!suma && a === b) a += 7;
      const valor = suma ? a + b : a - b;
      return {
        texto: a + (suma ? ' + ' : ' − ') + b, valor: valor,
        pasos: a + (suma ? ' + ' : ' − ') + b + ' = ' + valor + '.',
        errores: [{ valor: suma ? a - b : a + b, etiqueta: 'Confundiste la suma con la resta.' }, { valor: valor + 10, etiqueta: 'Error con la llevada (decenas).' }, { valor: valor - 10, etiqueta: 'Error con la llevada (decenas).' }, { valor: valor + 1, etiqueta: 'Error de cálculo de una unidad.' }]
      };
    },
    prioridad_1: function (azar) {
      const a = azar.entero(2, 9); const b = azar.entero(2, 9);
      const suma = azar.probabilidad(0.5);
      const c = suma ? azar.entero(2, 20) : azar.entero(a * b + 1, a * b + 20);
      const valor = suma ? c + a * b : c - a * b;
      return {
        texto: c + (suma ? ' + ' : ' − ') + a + ' × ' + b, valor: valor,
        pasos: 'Primero se multiplica: ' + a + ' × ' + b + ' = ' + (a * b) + '. Después: ' + c + (suma ? ' + ' : ' − ') + (a * b) + ' = ' + valor + '.',
        errores: [{ valor: suma ? (c + a) * b : (c - a) * b, etiqueta: 'Ignoraste la prioridad: operaste de izquierda a derecha.' }, { valor: suma ? c - a * b : c + a * b, etiqueta: 'Error de signo.' }, { valor: suma ? c + a + b : c - a - b, etiqueta: 'Sumaste en lugar de multiplicar.' }]
      };
    },
    prioridad_2: function (azar) {
      if (azar.probabilidad(0.5)) {
        const b = azar.entero(2, 9); const q = azar.entero(2, 12); const a = b * q;
        const c = azar.entero(10, 60);
        const suma = azar.probabilidad(0.5);
        const cc = suma ? c : c + q;
        const valor = suma ? cc + q : cc - q;
        return {
          texto: cc + (suma ? ' + ' : ' − ') + a + ' ÷ ' + b, valor: valor,
          pasos: 'Primero se divide: ' + a + ' ÷ ' + b + ' = ' + q + '. Después: ' + cc + (suma ? ' + ' : ' − ') + q + ' = ' + valor + '.',
          errores: [{ valor: suma ? (cc + a) / b : (cc - a) / b, etiqueta: 'Ignoraste la prioridad: operaste de izquierda a derecha.' }, { valor: suma ? cc - q : cc + q, etiqueta: 'Error de signo.' }, { valor: suma ? cc + a - b : cc - a + b, etiqueta: 'Restaste en lugar de dividir.' }]
        };
      }
      const a = azar.entero(2, 12); const b = azar.entero(2, 9);
      const suma = azar.probabilidad(0.5);
      const c = suma ? azar.entero(10, 90) : azar.entero(a * b + 10, a * b + 60);
      const valor = suma ? c + a * b : c - a * b;
      return {
        texto: c + (suma ? ' + ' : ' − ') + a + ' × ' + b, valor: valor,
        pasos: 'Primero se multiplica: ' + a + ' × ' + b + ' = ' + (a * b) + '. Después: ' + c + (suma ? ' + ' : ' − ') + (a * b) + ' = ' + valor + '.',
        errores: [{ valor: suma ? (c + a) * b : (c - a) * b, etiqueta: 'Ignoraste la prioridad: operaste de izquierda a derecha.' }, { valor: suma ? c - a * b : c + a * b, etiqueta: 'Error de signo.' }, { valor: valor + 10, etiqueta: 'Error de cálculo en las decenas.' }]
      };
    },
    parentesis_1: function (azar) {
      if (azar.probabilidad(0.5)) {
        const a = azar.entero(4, 25); const b = azar.entero(2, 15); const c = azar.entero(2, 6);
        const d = azar.entero(1, (a + b) * c - 1);
        const valor = (a + b) * c - d;
        return {
          texto: '(' + a + ' + ' + b + ') × ' + c + ' − ' + d, valor: valor,
          pasos: 'Paréntesis: ' + a + ' + ' + b + ' = ' + (a + b) + '. Después: ' + (a + b) + ' × ' + c + ' = ' + ((a + b) * c) + '. Por último: ' + ((a + b) * c) + ' − ' + d + ' = ' + valor + '.',
          errores: [{ valor: a + b * c - d, etiqueta: 'Olvidaste el paréntesis.' }, { valor: (a + b) * (c - d), etiqueta: 'Restaste antes de multiplicar.' }, { valor: (a + b) * c + d, etiqueta: 'Error de signo.' }]
        };
      }
      const b = azar.entero(8, 20); const c = azar.entero(1, b - 2); const a = azar.entero(2, 6); const d = azar.entero(2, 30);
      const valor = a * (b - c) + d;
      return {
        texto: a + ' × (' + b + ' − ' + c + ') + ' + d, valor: valor,
        pasos: 'Paréntesis: ' + b + ' − ' + c + ' = ' + (b - c) + '. Después: ' + a + ' × ' + (b - c) + ' = ' + (a * (b - c)) + '. Por último: + ' + d + ' = ' + valor + '.',
        errores: [{ valor: a * b - c + d, etiqueta: 'Olvidaste el paréntesis.' }, { valor: a * (b + c) + d, etiqueta: 'Error de signo dentro del paréntesis.' }, { valor: a * (b - c) - d, etiqueta: 'Error de signo al final.' }]
      };
    },
    parentesis_division: function (azar) {
      if (azar.probabilidad(0.5)) {
        const c = azar.entero(2, 8); const q = azar.entero(2, 12); const total = c * q;
        const a = azar.entero(1, total - 1); const b = total - a; const d = azar.entero(2, 6);
        const valor = q * d;
        return {
          texto: '(' + a + ' + ' + b + ') ÷ ' + c + ' × ' + d, valor: valor,
          pasos: 'Paréntesis: ' + a + ' + ' + b + ' = ' + total + '. Después, de izquierda a derecha: ' + total + ' ÷ ' + c + ' = ' + q + '; ' + q + ' × ' + d + ' = ' + valor + '.',
          errores: [{ valor: total / (c * d), etiqueta: 'Multiplicaste antes de dividir: × y ÷ se hacen de izquierda a derecha.' }, { valor: a + b / c * d, etiqueta: 'Olvidaste el paréntesis.' }, { valor: q + d, etiqueta: 'Sumaste en lugar de multiplicar.' }]
        };
      }
      const b = azar.entero(2, 9); const c = azar.entero(2, 9); const prod = b * c;
      const divisores = [2, 3, 4, 5, 6, 7, 8, 9].filter(function (x) { return prod % x === 0 && x !== b && x !== c; });
      if (!divisores.length) return null;
      const d = azar.elemento(divisores); const q = prod / d; const a = azar.entero(q + 5, q + 80);
      const valor = a - q;
      return {
        texto: a + ' − (' + b + ' × ' + c + ') ÷ ' + d, valor: valor,
        pasos: 'Paréntesis: ' + b + ' × ' + c + ' = ' + prod + '. Después: ' + prod + ' ÷ ' + d + ' = ' + q + '. Por último: ' + a + ' − ' + q + ' = ' + valor + '.',
        errores: [{ valor: (a - prod) / d, etiqueta: 'Restaste antes de dividir.' }, { valor: a - prod, etiqueta: 'Olvidaste dividir.' }, { valor: a + q, etiqueta: 'Error de signo.' }]
      };
    },
    porcentaje_simple: function (azar) {
      const p = azar.elemento([10, 20, 25, 50]);
      const base = azar.entero(2, 15) * 20;
      const parte = base * p / 100;
      const suma = azar.probabilidad(0.5);
      const m = suma ? azar.entero(3, 40) : azar.entero(1, parte - 1);
      const valor = suma ? parte + m : parte - m;
      return {
        texto: p + ' % de ' + base + (suma ? ' + ' : ' − ') + m, valor: valor,
        pasos: 'El ' + p + ' % de ' + base + ' es ' + base + ' × ' + p + ' ÷ 100 = ' + parte + '. Después: ' + parte + (suma ? ' + ' : ' − ') + m + ' = ' + valor + '.',
        errores: [{ valor: (suma ? base / p + m : base / p - m), etiqueta: 'Calculaste mal el porcentaje: dividiste entre el porcentaje.' }, { valor: suma ? parte * 10 + m : parte * 10 - m, etiqueta: 'Calculaste mal el porcentaje: te equivocaste de decimal.' }, { valor: suma ? base - parte + m : base - parte - m, etiqueta: 'Calculaste lo que queda tras restar el porcentaje.' }]
      };
    },
    decimales_simple: function (azar) {
      const a = azar.entero(1, 9) + 0.5; const b = azar.entero(2, 8);
      const c = azar.entero(1, 9) + azar.elemento([0.25, 0.5, 0.75]);
      const valor = a * b + c;
      return {
        texto: fmt(a) + ' × ' + b + ' + ' + fmt(c), valor: valor,
        pasos: 'Primero se multiplica: ' + fmt(a) + ' × ' + b + ' = ' + fmt(a * b) + '. Después: ' + fmt(a * b) + ' + ' + fmt(c) + ' = ' + fmt(valor) + '.',
        errores: [{ valor: a * (b + c), etiqueta: 'Ignoraste la prioridad: sumaste antes de multiplicar.' }, { valor: Math.floor(a) * b + c, etiqueta: 'Olvidaste la parte decimal al multiplicar.' }, { valor: a * b + Math.floor(c), etiqueta: 'Olvidaste la parte decimal al sumar.' }]
      };
    },
    porcentaje_decimales: function (azar) {
      const p = azar.elemento([10, 20, 25, 50]);
      const base = azar.entero(2, 10) * 20;
      const parte = base * p / 100;
      const a = azar.entero(1, 5) + 0.5; const b = azar.entero(2, 8);
      const valor = parte + a * b;
      return {
        texto: p + ' % de ' + base + ' + ' + fmt(a) + ' × ' + b, valor: valor,
        pasos: 'El ' + p + ' % de ' + base + ' es ' + parte + '. ' + fmt(a) + ' × ' + b + ' = ' + fmt(a * b) + '. Suma: ' + parte + ' + ' + fmt(a * b) + ' = ' + fmt(valor) + '.',
        errores: [{ valor: (parte + a) * b, etiqueta: 'Ignoraste la prioridad: sumaste antes de multiplicar.' }, { valor: base / p + a * b, etiqueta: 'Calculaste mal el porcentaje.' }, { valor: parte + Math.floor(a) * b, etiqueta: 'Olvidaste la parte decimal al multiplicar.' }]
      };
    },
    fraccion_potencia: function (azar) {
      const fr = azar.elemento([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]]);
      const base = fr[1] * azar.entero(3, 16);
      const parte = base * fr[0] / fr[1];
      const pb = azar.entero(2, 4); const pe = azar.elemento([2, 3]);
      const pot = Math.pow(pb, pe);
      const r = azar.entero(1, 9);
      const valor = parte + pot - r;
      const sup = pe === 2 ? '²' : '³';
      return {
        texto: fr[0] + '/' + fr[1] + ' de ' + base + ' + ' + pb + sup + ' − ' + r, valor: valor,
        pasos: fr[0] + '/' + fr[1] + ' de ' + base + ' = ' + base + ' ÷ ' + fr[1] + ' × ' + fr[0] + ' = ' + parte + '. ' + pb + sup + ' = ' + pot + '. Total: ' + parte + ' + ' + pot + ' − ' + r + ' = ' + valor + '.',
        errores: [{ valor: base * fr[1] / fr[0] + pot - r, etiqueta: 'Invertiste la fracción.' }, { valor: parte + pb * pe - r, etiqueta: 'Calculaste la potencia como una multiplicación (base × exponente).' }, { valor: parte + pot + r, etiqueta: 'Error de signo al final.' }]
      };
    },
    porcentajes_encadenados: function (azar) {
      const p1 = azar.elemento([10, 20, 25, 50]);
      const p2 = azar.elemento([20, 25, 50].filter(function (x) { return x !== p1; }));
      const base = azar.entero(2, 10) * 200;
      const parte = base * p2 / 100 * p1 / 100;
      const pb = azar.entero(2, 5);
      const valor = parte + pb * pb;
      return {
        texto: 'el ' + p1 + ' % del ' + p2 + ' % de ' + base + ' + ' + pb + '²', valor: valor,
        pasos: 'El ' + p2 + ' % de ' + base + ' es ' + (base * p2 / 100) + '. El ' + p1 + ' % de esa cantidad es ' + parte + '. ' + pb + '² = ' + (pb * pb) + '. Total: ' + parte + ' + ' + (pb * pb) + ' = ' + valor + '.',
        errores: [{ valor: base * (p1 + p2) / 100 + pb * pb, etiqueta: 'Sumaste los porcentajes en lugar de encadenarlos.' }, { valor: base * p1 / 100 + pb * pb, etiqueta: 'Aplicaste solo el primer porcentaje.' }, { valor: parte + 2 * pb, etiqueta: 'Calculaste la potencia como una multiplicación (base × 2).' }]
      };
    },
    fraccion_porcentajes: function (azar) {
      const fr = azar.elemento([[1, 2], [1, 4], [3, 4], [2, 5], [3, 5]]);
      const p = azar.elemento([20, 25, 50]);
      const base = azar.entero(2, 10) * 200;
      const tras = base * p / 100;
      const parte = tras * fr[0] / fr[1];
      if (!esEntero(parte)) return null;
      const pb = azar.entero(2, 5); const s = azar.entero(1, 15);
      const valor = parte - pb * pb + s;
      if (valor <= 0) return null;
      return {
        texto: fr[0] + '/' + fr[1] + ' del ' + p + ' % de ' + base + ' − ' + pb + '² + ' + s, valor: valor,
        pasos: 'El ' + p + ' % de ' + base + ' es ' + tras + '. ' + fr[0] + '/' + fr[1] + ' de ' + tras + ' es ' + parte + '. ' + pb + '² = ' + (pb * pb) + '. Total: ' + parte + ' − ' + (pb * pb) + ' + ' + s + ' = ' + valor + '.',
        errores: [{ valor: tras * fr[1] / fr[0] - pb * pb + s, etiqueta: 'Invertiste la fracción.' }, { valor: parte - (pb * pb + s), etiqueta: 'Restaste también el último número (error de signo).' }, { valor: parte - 2 * pb + s, etiqueta: 'Calculaste la potencia como una multiplicación (base × 2).' }]
      };
    }
  };

  function generarOperacionesAritmeticas(nivel, semilla) {
    const cfg = cfgNivel('num_operaciones', nivel);
    for (let intento = 0; intento < 80; intento++) {
      const azar = App.Azar.CrearInstancia(semilla + '|op|' + intento);
      const plantilla = azar.elemento(cfg.plantillas);
      const op = PLANTILLAS_OPERACIONES[plantilla](azar);
      if (!op || !tieneComoMucho2Decimales(op.valor) || op.valor < 0) continue;
      let leido;
      try { leido = evaluarExpresion(op.texto); } catch (e) { continue; }
      if (Math.abs(leido - op.valor) > 1e-6) continue;
      const tres = elegirDistractoras(op.valor, op.errores, azar, { minimo: 0, positivo: op.valor > 0, soloEnteros: esEntero(op.valor), paso: esEntero(op.valor) ? Math.max(1, Math.round(Math.abs(op.valor) * 0.1)) : 0.5 });
      if (!tres) continue;
      const mez = construirOpcionesNumericas(op.valor, tres, '', azar);
      return {
        idCanonico: 'num_operaciones|v' + App.CONFIG.VERSIONES_GENERADOR.num_operaciones + '|n' + nivel + '|' + plantilla + '|' + op.texto,
        tipoId: 'num_operaciones', areaId: 'numerico', nivel: nivel, semilla: semilla,
        version: App.CONFIG.VERSIONES_GENERADOR.num_operaciones,
        reglaId: plantilla,
        enunciado: 'Calcula el resultado.',
        estimulo: { tipo: 'expresion', texto: op.texto },
        opciones: mez.opciones,
        opcionCorrectaIndex: mez.idxCorrecta,
        parametrosNivel: { plantilla: plantilla },
        explicacion: {
          datos: 'Expresión: ' + op.texto + ' = ?',
          regla: 'Orden de las operaciones: paréntesis, potencias, porcentajes y fracciones «de», multiplicaciones y divisiones (de izquierda a derecha) y, por último, sumas y restas.',
          pasos: op.pasos,
          respuesta: 'Opción ' + (mez.idxCorrecta + 1) + ': ' + fmt(op.valor) + '.'
        }
      };
    }
    throw new Error('No se pudo generar una operación válida (nivel ' + nivel + ').');
  }

  function resolverOperacionesAritmeticas(ej) {
    if (!ej || !ej.estimulo || typeof ej.estimulo.texto !== 'string') return { valido: false, motivo: 'Falta la expresión.' };
    let valor;
    try { valor = evaluarExpresion(ej.estimulo.texto); } catch (e) { return { valido: false, motivo: e.message }; }
    return evaluarOpcionesNumericas(ej, redondear(valor, 6));
  }

  // ================================================================ PROBLEMAS

  /** Números del enunciado en orden de aparición. */
  function numerosDelTexto(texto) {
    return (String(texto).match(/\d+(?:,\d+)?/g) || []).map(parsearNumero);
  }

  function pct(p) { return p / 100; }

  /*
   * Cada plantilla define:
   *  - crear(azar): { datos, texto, valor, unidad, pasos, errores }
   *  - resolver(n): calcula el resultado a partir de los números del texto (n), sin usar «datos».
   */
  const PLANTILLAS_PROBLEMAS = {
    compra_unitaria: {
      crear: function (azar) {
        const p = azar.entero(2, 15); const k = azar.entero(2, 12);
        return { texto: 'Un kilo de naranjas cuesta ' + p + ' €. ¿Cuánto cuestan ' + k + ' kilos?', valor: p * k, unidad: '€', pasos: k + ' × ' + p + ' = ' + (p * k) + ' €.',
          errores: [{ valor: p + k, etiqueta: 'Sumaste en lugar de multiplicar.' }, { valor: p * (k - 1), etiqueta: 'Multiplicaste por un kilo de menos.' }, { valor: p * (k + 1), etiqueta: 'Multiplicaste por un kilo de más.' }] };
      },
      resolver: function (n) { return n[0] * n[1]; }
    },
    receta_unitaria: {
      crear: function (azar) {
        const g = azar.elemento([40, 50, 60, 75, 80, 100, 120, 125, 150, 200]); const k = azar.entero(2, 8);
        return { texto: 'Para un bizcocho se necesitan ' + g + ' g de azúcar. ¿Cuántos gramos hacen falta para ' + k + ' bizcochos?', valor: g * k, unidad: 'g', pasos: k + ' × ' + g + ' = ' + (g * k) + ' g.',
          errores: [{ valor: g + k, etiqueta: 'Sumaste en lugar de multiplicar.' }, { valor: g * (k - 1), etiqueta: 'Multiplicaste por un bizcocho de menos.' }, { valor: g * (k + 1), etiqueta: 'Multiplicaste por un bizcocho de más.' }] };
      },
      resolver: function (n) { return n[0] * n[1]; }
    },
    trayecto_unitario: {
      crear: function (azar) {
        const v = azar.entero(8, 24) * 5; const h = azar.entero(2, 6);
        return { texto: 'Un autobús recorre ' + v + ' km cada hora. ¿Cuántos kilómetros recorre en ' + h + ' horas?', valor: v * h, unidad: 'km', pasos: v + ' × ' + h + ' = ' + (v * h) + ' km.',
          errores: [{ valor: v + h, etiqueta: 'Sumaste en lugar de multiplicar.' }, { valor: v * (h - 1), etiqueta: 'Multiplicaste por una hora de menos.' }, { valor: v * (h + 1), etiqueta: 'Multiplicaste por una hora de más.' }] };
      },
      resolver: function (n) { return n[0] * n[1]; }
    },
    compra_proporcion: {
      crear: function (azar) {
        const a = azar.entero(2, 5); const u = azar.entero(2, 6); let b = azar.entero(3, 12); if (b === a) b++;
        const p = a * u;
        return { texto: a + ' cuadernos cuestan ' + p + ' €. ¿Cuánto cuestan ' + b + ' cuadernos?', valor: b * u, unidad: '€', pasos: 'Un cuaderno cuesta ' + p + ' ÷ ' + a + ' = ' + u + ' €. ' + b + ' cuadernos: ' + b + ' × ' + u + ' = ' + (b * u) + ' €.',
          errores: [{ valor: p * b, etiqueta: 'Multiplicaste el precio total por la cantidad sin calcular el precio por unidad.' }, { valor: p + (b - a), etiqueta: 'Sumaste la diferencia de unidades al precio.' }, { valor: (u + 1) * b, etiqueta: 'Calculaste mal el precio por unidad.' }] };
      },
      resolver: function (n) { return n[1] / n[0] * n[2]; }
    },
    receta_proporcion: {
      crear: function (azar) {
        const a = azar.entero(2, 4); const q = azar.elemento([60, 70, 75, 80, 90, 100]); let b = azar.entero(3, 10); if (b === a) b++;
        return { texto: 'Una receta para ' + a + ' personas lleva ' + (a * q) + ' g de arroz. ¿Cuántos gramos hacen falta para ' + b + ' personas?', valor: b * q, unidad: 'g', pasos: 'Por persona: ' + (a * q) + ' ÷ ' + a + ' = ' + q + ' g. Para ' + b + ': ' + b + ' × ' + q + ' = ' + (b * q) + ' g.',
          errores: [{ valor: a * q * b, etiqueta: 'Multiplicaste la cantidad total por las personas sin dividir primero.' }, { valor: a * q + (b - a) * 10, etiqueta: 'Sumaste en lugar de usar una proporción.' }, { valor: (b - 1) * q, etiqueta: 'Calculaste para una persona de menos.' }] };
      },
      resolver: function (n) { return n[1] / n[0] * n[2]; }
    },
    impresora_proporcion: {
      crear: function (azar) {
        const r = azar.entero(4, 12); const m = azar.entero(2, 5); let m2 = azar.entero(6, 15); if (m2 === m) m2++;
        return { texto: 'Una impresora imprime ' + (r * m) + ' páginas en ' + m + ' minutos. ¿Cuántas páginas imprime en ' + m2 + ' minutos?', valor: r * m2, unidad: 'páginas', pasos: 'Por minuto: ' + (r * m) + ' ÷ ' + m + ' = ' + r + '. En ' + m2 + ' minutos: ' + r + ' × ' + m2 + ' = ' + (r * m2) + ' páginas.',
          errores: [{ valor: r * m * m2, etiqueta: 'Multiplicaste sin calcular las páginas por minuto.' }, { valor: r * m + (m2 - m), etiqueta: 'Sumaste la diferencia de minutos.' }, { valor: r * (m2 - 1), etiqueta: 'Calculaste un minuto de menos.' }] };
      },
      resolver: function (n) { return n[0] / n[1] * n[2]; }
    },
    descuento_envio: {
      crear: function (azar) {
        const p = azar.entero(2, 9) * 20; const d = azar.elemento([10, 20, 25, 50]); const e = azar.entero(3, 9);
        const valor = p * (1 - pct(d)) + e;
        return { texto: 'Unas zapatillas cuestan ' + p + ' €. Tienen un descuento del ' + d + ' % y el envío cuesta ' + e + ' €. ¿Cuánto se paga en total?', valor: valor, unidad: '€',
          pasos: 'Descuento: ' + p + ' × ' + d + ' ÷ 100 = ' + (p * pct(d)) + ' €. Precio rebajado: ' + (p * (1 - pct(d))) + ' €. Con envío: ' + formatear(valor, '€') + '.',
          errores: [{ valor: p - d + e, etiqueta: 'Restaste el porcentaje como si fueran euros.' }, { valor: p * (1 - pct(d)), etiqueta: 'Olvidaste sumar el envío.' }, { valor: (p + e) * (1 - pct(d)), etiqueta: 'Aplicaste el descuento también al envío.' }] };
      },
      resolver: function (n) { return n[0] * (1 - n[1] / 100) + n[2]; }
    },
    recargo_gestion: {
      crear: function (azar) {
        const p = azar.entero(2, 12) * 20; const d = azar.elemento([5, 10, 20, 25]); const e = azar.entero(2, 9);
        const valor = p * (1 + pct(d)) + e;
        return { texto: 'Una factura de ' + p + ' € tiene un recargo del ' + d + ' % por pagar tarde y ' + e + ' € de gastos de gestión. ¿Cuánto hay que pagar?', valor: valor, unidad: '€',
          pasos: 'Recargo: ' + p + ' × ' + d + ' ÷ 100 = ' + (p * pct(d)) + ' €. Con recargo: ' + (p * (1 + pct(d))) + ' €. Con gestión: ' + formatear(valor, '€') + '.',
          errores: [{ valor: p + d + e, etiqueta: 'Sumaste el porcentaje como si fueran euros.' }, { valor: p * (1 + pct(d)), etiqueta: 'Olvidaste los gastos de gestión.' }, { valor: p * (1 - pct(d)) + e, etiqueta: 'Restaste el recargo en lugar de sumarlo.' }] };
      },
      resolver: function (n) { return n[0] * (1 + n[1] / 100) + n[2]; }
    },
    dos_productos_descuento: {
      crear: function (azar) {
        const total = azar.entero(3, 10) * 20; const a = azar.entero(2, total / 5 - 1) * 5; const b = total - a;
        const d = azar.elemento([10, 20, 25]); const e = azar.elemento([1, 2, 3]);
        const valor = total * (1 - pct(d)) + e;
        return { texto: 'Compras una camiseta de ' + a + ' € y un pantalón de ' + b + ' €. En caja te descuentan el ' + d + ' % del total y la bolsa cuesta ' + e + ' €. ¿Cuánto pagas?', valor: valor, unidad: '€',
          pasos: 'Total: ' + a + ' + ' + b + ' = ' + total + ' €. Descuento: ' + (total * pct(d)) + ' €. Rebajado: ' + (total * (1 - pct(d))) + ' €. Con bolsa: ' + formatear(valor, '€') + '.',
          errores: [{ valor: a * (1 - pct(d)) + b + e, etiqueta: 'Aplicaste el descuento solo a la camiseta.' }, { valor: total * (1 - pct(d)), etiqueta: 'Olvidaste la bolsa.' }, { valor: total - d + e, etiqueta: 'Restaste el porcentaje como si fueran euros.' }] };
      },
      resolver: function (n) { return (n[0] + n[1]) * (1 - n[2] / 100) + n[3]; }
    },
    menu_propina: {
      crear: function (azar) {
        const m = azar.elemento([10, 12, 15, 18, 20, 25]); const k = azar.entero(2, 6); const d = azar.elemento([5, 10]);
        const total = m * k; const valor = total * (1 + pct(d));
        return { texto: 'Un menú cuesta ' + m + ' € por persona. Coméis ' + k + ' personas y dejáis un ' + d + ' % de propina sobre el total. ¿Cuánto pagáis en total?', valor: valor, unidad: '€',
          pasos: 'Menús: ' + m + ' × ' + k + ' = ' + total + ' €. Propina: ' + formatear(total * pct(d), '€') + '. Total: ' + formatear(valor, '€') + '.',
          errores: [{ valor: total + d, etiqueta: 'Sumaste el porcentaje como si fueran euros.' }, { valor: total, etiqueta: 'Olvidaste la propina.' }, { valor: m * (1 + pct(d)) + (k - 1) * m, etiqueta: 'Aplicaste la propina solo a un menú.' }] };
      },
      resolver: function (n) { return n[0] * n[1] * (1 + n[2] / 100); }
    },
    grifos_inversa: {
      crear: function (azar) {
        const a = azar.entero(2, 6); let b = azar.entero(2, 8); if (b === a) b = a + 1;
        const h = b * azar.entero(1, 4); const cap = azar.elemento([600, 800, 1000, 1200, 1500]);
        const valor = a * h / b;
        return { texto: a + ' grifos iguales llenan un depósito de ' + cap + ' litros en ' + h + ' horas. ¿Cuántas horas tardarían ' + b + ' grifos iguales?', valor: valor, unidad: 'horas',
          pasos: 'Es una proporción inversa: más grifos, menos tiempo. ' + a + ' × ' + h + ' = ' + (a * h) + ' horas-grifo; ' + (a * h) + ' ÷ ' + b + ' = ' + fmt(valor) + ' horas. Los litros no influyen.',
          errores: [{ valor: h * b / a, etiqueta: 'Usaste una proporción directa en lugar de inversa.' }, { valor: a * h, etiqueta: 'Olvidaste repartir el trabajo entre los grifos.' }, { valor: cap / (b * 100), etiqueta: 'Usaste el dato de los litros, que no hace falta.' }] };
      },
      resolver: function (n) { return n[0] * n[2] / n[3]; }
    },
    pintores_inversa: {
      crear: function (azar) {
        const a = azar.entero(2, 6); let b = azar.entero(2, 9); if (b === a) b = a + 1;
        const d = b * azar.entero(1, 4); const m = azar.entero(4, 30) * 25;
        const valor = a * d / b;
        return { texto: a + ' pintores tardan ' + d + ' días en pintar una nave de ' + m + ' m². ¿Cuántos días tardarán ' + b + ' pintores trabajando al mismo ritmo?', valor: valor, unidad: 'días',
          pasos: 'Proporción inversa: ' + a + ' × ' + d + ' = ' + (a * d) + ' días-pintor; ' + (a * d) + ' ÷ ' + b + ' = ' + fmt(valor) + ' días. La superficie no influye.',
          errores: [{ valor: d * b / a, etiqueta: 'Usaste una proporción directa en lugar de inversa.' }, { valor: a * d, etiqueta: 'Olvidaste repartir el trabajo entre los pintores.' }, { valor: d + (a - b), etiqueta: 'Sumaste o restaste días en lugar de usar una proporción.' }] };
      },
      resolver: function (n) { return n[0] * n[1] / n[3]; }
    },
    operarios_incorporacion: {
      crear: function (azar) {
        const a = azar.entero(2, 6); const y = azar.entero(1, 6); const quedan = azar.entero(3, 9);
        const restante = quedan * (a + y);
        if (restante % a !== 0) return null;
        const diasRestantesOriginal = restante / a;
        const x = azar.entero(2, 10); const d = x + diasRestantesOriginal; const s = azar.entero(6, 12) * 10;
        return { texto: a + ' operarios iban a terminar una obra en ' + d + ' días. Después de ' + x + ' días de trabajo se incorporan ' + y + ' operarios más. Cada operario cobra ' + s + ' € al día. ¿Cuántos días más tardarán en terminar la obra?', valor: quedan, unidad: 'días',
          pasos: 'Quedaban ' + d + ' − ' + x + ' = ' + diasRestantesOriginal + ' días para ' + a + ' operarios: ' + restante + ' días-operario. Con ' + (a + y) + ' operarios: ' + restante + ' ÷ ' + (a + y) + ' = ' + quedan + ' días. El sueldo no influye.',
          errores: [{ valor: diasRestantesOriginal, etiqueta: 'No tuviste en cuenta a los operarios nuevos.' }, { valor: a * d / (a + y), etiqueta: 'Olvidaste descontar los días ya trabajados.' }, { valor: restante / y, etiqueta: 'Contaste solo a los operarios nuevos.' }] };
      },
      resolver: function (n) { return n[0] * (n[1] - n[2]) / (n[0] + n[3]); }
    },
    velocidad_media: {
      crear: function (azar) {
        const v1 = azar.entero(8, 24) * 5; const v2 = azar.entero(8, 24) * 5;
        const t1 = azar.elemento([1, 2, 3]); let t2 = azar.elemento([1, 2, 3]);
        if (t1 === t2) t2 = t1 === 3 ? 1 : t1 + 1;
        if (v1 === v2) return null;
        const d1 = v1 * t1; const d2 = v2 * t2; const valor = (d1 + d2) / (t1 + t2);
        if (!tieneComoMucho2Decimales(valor)) return null;
        return { texto: 'Un coche recorre ' + d1 + ' km a ' + v1 + ' km/h y después ' + d2 + ' km a ' + v2 + ' km/h. ¿Cuál es su velocidad media en todo el trayecto?', valor: valor, unidad: 'km/h',
          pasos: 'Tiempos: ' + d1 + ' ÷ ' + v1 + ' = ' + t1 + ' h y ' + d2 + ' ÷ ' + v2 + ' = ' + t2 + ' h. Distancia total ' + (d1 + d2) + ' km en ' + (t1 + t2) + ' h: ' + (d1 + d2) + ' ÷ ' + (t1 + t2) + ' = ' + fmt(valor) + ' km/h.',
          errores: [{ valor: (v1 + v2) / 2, etiqueta: 'Hiciste la media de las dos velocidades sin tener en cuenta el tiempo.' }, { valor: (d1 + d2) / 2, etiqueta: 'Dividiste la distancia total entre 2.' }, { valor: (d1 + d2) / (t1 + t2 + 1), etiqueta: 'Contaste una hora de más.' }] };
      },
      resolver: function (n) { return (n[0] + n[2]) / (n[0] / n[1] + n[2] / n[3]); }
    },
    mezcla_precio: {
      crear: function (azar) {
        const l1 = azar.entero(2, 8); let l2 = azar.entero(2, 8); if (l2 === l1) l2 = l1 + 1;
        const p1 = azar.entero(3, 9); let p2 = azar.entero(3, 9); if (p2 === p1) p2 = p1 + 2;
        const valor = (l1 * p1 + l2 * p2) / (l1 + l2);
        if (!tieneComoMucho2Decimales(valor)) return null;
        return { texto: 'Se mezclan ' + l1 + ' litros de un aceite de ' + p1 + ' €/l con ' + l2 + ' litros de otro aceite de ' + p2 + ' €/l. ¿A cuánto sale el litro de la mezcla?', valor: valor, unidad: '€/l',
          pasos: 'Coste total: ' + l1 + ' × ' + p1 + ' + ' + l2 + ' × ' + p2 + ' = ' + (l1 * p1 + l2 * p2) + ' €. Litros: ' + (l1 + l2) + '. Precio por litro: ' + formatear(valor, '€/l') + '.',
          errores: [{ valor: (p1 + p2) / 2, etiqueta: 'Hiciste la media de los precios sin tener en cuenta los litros.' }, { valor: (l1 * p1 + l2 * p2) / 2, etiqueta: 'Dividiste el coste total entre 2.' }, { valor: (l1 * p2 + l2 * p1) / (l1 + l2), etiqueta: 'Cruzaste litros y precios.' }] };
      },
      resolver: function (n) { return (n[0] * n[1] + n[2] * n[3]) / (n[0] + n[2]); }
    },
    media_nueva_nota: {
      crear: function (azar) {
        const k = azar.entero(18, 32); const n = azar.entero(3, 6);
        const m = azar.entero(50, 80) / 10;
        const nota = azar.entero(40, 100) / 10;
        const m2 = (m * n + nota) / (n + 1);
        if (!esEntero(m2 * 10)) return null;
        if (Math.abs(m2 - m) < 0.05) return null;
        return { texto: 'En una clase de ' + k + ' alumnos, llevas ' + n + ' exámenes con una media de ' + fmt(m) + '. Tras el siguiente examen, tu media pasa a ser ' + fmt(m2) + '. ¿Qué nota sacaste en ese examen?', valor: nota, unidad: 'puntos', maximo: 10,
          pasos: 'Suma de las ' + n + ' notas: ' + fmt(m) + ' × ' + n + ' = ' + fmt(m * n) + '. Suma de las ' + (n + 1) + ': ' + fmt(m2) + ' × ' + (n + 1) + ' = ' + fmt(m2 * (n + 1)) + '. Nota nueva: ' + fmt(m2 * (n + 1)) + ' − ' + fmt(m * n) + ' = ' + fmt(nota) + '. El número de alumnos no influye.',
          errores: [{ valor: m2, etiqueta: 'Tomaste la nueva media como si fuera la nota.' }, { valor: m2 + (m2 - m), etiqueta: 'Sumaste la diferencia de medias a la nueva media.' }, { valor: 2 * m2 - m, etiqueta: 'Supusiste que la media es de solo dos notas.' }] };
      },
      resolver: function (n) { return n[3] * (n[1] + 1) - n[2] * n[1]; }
    },
    media_tiempo_reparto: {
      crear: function (azar) {
        const n = azar.entero(4, 9); const m = azar.entero(10, 25); const k = azar.entero(2, 12);
        const t = azar.entero(5, 45);
        const m2 = (m * n + t) / (n + 1);
        if (!esEntero(m2 * 10)) return null;
        if (Math.abs(m2 - m) < 0.05) return null;
        return { texto: 'Un repartidor ha hecho ' + n + ' entregas con un tiempo medio de ' + m + ' minutos. Su furgoneta tiene ' + k + ' años. Tras una entrega más, el tiempo medio pasa a ser ' + fmt(m2) + ' minutos. ¿Cuántos minutos tardó en esa entrega?', valor: t, unidad: 'minutos',
          pasos: 'Total de las ' + n + ' entregas: ' + m + ' × ' + n + ' = ' + (m * n) + ' min. Total de las ' + (n + 1) + ': ' + fmt(m2) + ' × ' + (n + 1) + ' = ' + fmt(m2 * (n + 1)) + ' min. Última: ' + fmt(m2 * (n + 1)) + ' − ' + (m * n) + ' = ' + t + ' min. La antigüedad de la furgoneta no influye.',
          errores: [{ valor: m2, etiqueta: 'Tomaste el nuevo tiempo medio como si fuera el de la entrega.' }, { valor: m2 + (m2 - m), etiqueta: 'Sumaste la diferencia de medias.' }, { valor: 2 * m2 - m, etiqueta: 'Supusiste que la media es de solo dos entregas.' }] };
      },
      resolver: function (n) { return n[3] * (n[0] + 1) - n[1] * n[0]; }
    },
    rebajas_sucesivas: {
      crear: function (azar) {
        const p = azar.entero(3, 12) * 20; const d1 = azar.elemento([10, 20, 25, 50]); const d2 = azar.elemento([10, 20, 25]);
        const h = azar.entero(9, 10); const t = azar.entero(3, 6);
        const valor = p * (1 - pct(d1)) * (1 - pct(d2));
        return { texto: 'Un abrigo cuesta ' + p + ' €. En rebajas baja un ' + d1 + ' % y, días después, se aplica un ' + d2 + ' % adicional sobre el precio rebajado. La tienda abre a las ' + h + ' h y tiene ' + t + ' tallas de ese abrigo. ¿Cuál es el precio final?', valor: valor, unidad: '€',
          pasos: 'Primera rebaja: ' + p + ' × (1 − ' + d1 + '/100) = ' + formatear(p * (1 - pct(d1)), '€') + '. Segunda: × (1 − ' + d2 + '/100) = ' + formatear(valor, '€') + '. La hora y las tallas no influyen.',
          errores: [{ valor: p * (1 - pct(d1 + d2)), etiqueta: 'Sumaste los porcentajes en lugar de aplicarlos uno tras otro.' }, { valor: p * (1 - pct(d1)), etiqueta: 'Aplicaste solo la primera rebaja.' }, { valor: p * pct(d1) * pct(d2) * 10, etiqueta: 'Calculaste con los descuentos en lugar de con lo que se paga.' }] };
      },
      resolver: function (n) { return n[0] * (1 - n[1] / 100) * (1 - n[2] / 100); }
    },
    subida_bajada_envio: {
      crear: function (azar) {
        const p = azar.entero(5, 20) * 20; const a = azar.elemento([10, 20, 25]); const b = azar.elemento([10, 20, 25, 50]);
        if (a === b) return null;
        const e = azar.entero(5, 15); const dias = azar.entero(2, 7); const t = azar.entero(3, 9);
        const valor = p * (1 + pct(a)) * (1 - pct(b)) + e;
        return { texto: 'Una bicicleta costaba ' + p + ' €. Primero sube un ' + a + ' %, después baja un ' + b + ' % y, al comprarla en línea, se suman ' + e + ' € de envío. El pedido llega en ' + dias + ' días y la tienda tiene ' + t + ' bicicletas iguales. ¿Cuánto se paga?', valor: valor, unidad: '€',
          pasos: 'Tras la subida: ' + formatear(p * (1 + pct(a)), '€') + '. Tras la bajada: ' + formatear(p * (1 + pct(a)) * (1 - pct(b)), '€') + '. Con envío: ' + formatear(valor, '€') + '. Los días y las bicicletas en tienda no influyen.',
          errores: [{ valor: p * (1 + pct(a) - pct(b)) + e, etiqueta: 'Sumaste y restaste los porcentajes en lugar de encadenarlos.' }, { valor: p * (1 + pct(a)) * (1 - pct(b)), etiqueta: 'Olvidaste el envío.' }, { valor: p * (1 - pct(b)) + e, etiqueta: 'Olvidaste la subida inicial.' }] };
      },
      resolver: function (n) { return n[0] * (1 + n[1] / 100) * (1 - n[2] / 100) + n[3]; }
    },
    compra_lote_descuentos: {
      crear: function (azar) {
        const k = azar.entero(3, 12); const p = azar.entero(2, 10) * 5; const d1 = azar.elemento([10, 20, 25]); const d2 = azar.elemento([10, 20]);
        const e = azar.entero(5, 20); const peso = azar.entero(2, 15); const dias = azar.entero(2, 6);
        const valor = k * p * (1 - pct(d1)) * (1 - pct(d2)) + e;
        return { texto: 'Compras ' + k + ' cajas a ' + p + ' € cada una. Por la cantidad te hacen un ' + d1 + ' % de descuento y, con un cupón, un ' + d2 + ' % más sobre ese precio. El transporte cuesta ' + e + ' €. Cada caja pesa ' + peso + ' kg y el pedido tarda ' + dias + ' días. ¿Cuánto pagas en total?', valor: valor, unidad: '€',
          pasos: 'Precio de las cajas: ' + k + ' × ' + p + ' = ' + (k * p) + ' €. Tras el ' + d1 + ' %: ' + formatear(k * p * (1 - pct(d1)), '€') + '. Tras el ' + d2 + ' %: ' + formatear(k * p * (1 - pct(d1)) * (1 - pct(d2)), '€') + '. Con transporte: ' + formatear(valor, '€') + '. El peso y los días no influyen.',
          errores: [{ valor: k * p * (1 - pct(d1 + d2)) + e, etiqueta: 'Sumaste los descuentos en lugar de aplicarlos uno tras otro.' }, { valor: k * p * (1 - pct(d1)) * (1 - pct(d2)), etiqueta: 'Olvidaste el transporte.' }, { valor: p * (1 - pct(d1)) * (1 - pct(d2)) + e, etiqueta: 'Calculaste el precio de una sola caja.' }] };
      },
      resolver: function (n) { return n[0] * n[1] * (1 - n[2] / 100) * (1 - n[3] / 100) + n[4]; }
    }
  };

  function generarProblemasNumericos(nivel, semilla) {
    const cfg = cfgNivel('num_problemas', nivel);
    for (let intento = 0; intento < 100; intento++) {
      const azar = App.Azar.CrearInstancia(semilla + '|pr|' + intento);
      const plantilla = azar.elemento(cfg.plantillas);
      const def = PLANTILLAS_PROBLEMAS[plantilla];
      const p = def.crear(azar);
      if (!p || !Number.isFinite(p.valor) || p.valor <= 0 || !tieneComoMucho2Decimales(p.valor)) continue;
      const leido = def.resolver(numerosDelTexto(p.texto));
      if (Math.abs(leido - p.valor) > 1e-6) continue;
      const tres = elegirDistractoras(p.valor, p.errores, azar, { positivo: true, maximo: p.maximo, soloEnteros: esEntero(p.valor), paso: esEntero(p.valor) ? Math.max(1, Math.round(p.valor * 0.1)) : Math.max(0.5, redondear(p.valor * 0.1, 1)) });
      if (!tres) continue;
      const mez = construirOpcionesNumericas(p.valor, tres, p.unidad, azar);
      return {
        idCanonico: 'num_problemas|v' + App.CONFIG.VERSIONES_GENERADOR.num_problemas + '|n' + nivel + '|' + plantilla + '|' + numerosDelTexto(p.texto).join(','),
        tipoId: 'num_problemas', areaId: 'numerico', nivel: nivel, semilla: semilla,
        version: App.CONFIG.VERSIONES_GENERADOR.num_problemas,
        reglaId: plantilla,
        enunciado: 'Resuelve el problema.',
        estimulo: { tipo: 'problema', texto: p.texto, plantilla: plantilla },
        opciones: mez.opciones,
        opcionCorrectaIndex: mez.idxCorrecta,
        parametrosNivel: { plantilla: plantilla },
        explicacion: {
          datos: p.texto,
          regla: 'Identifica qué datos intervienen y qué relación hay entre ellos (proporción, porcentaje o media).',
          pasos: p.pasos,
          respuesta: 'Opción ' + (mez.idxCorrecta + 1) + ': ' + formatear(p.valor, p.unidad) + '.'
        }
      };
    }
    throw new Error('No se pudo generar un problema válido (nivel ' + nivel + ').');
  }

  function resolverProblemasNumericos(ej) {
    if (!ej || !ej.estimulo || !PLANTILLAS_PROBLEMAS[ej.estimulo.plantilla]) return { valido: false, motivo: 'Plantilla desconocida.' };
    const valor = PLANTILLAS_PROBLEMAS[ej.estimulo.plantilla].resolver(numerosDelTexto(ej.estimulo.texto));
    return evaluarOpcionesNumericas(ej, redondear(valor, 6));
  }

  // ================================================================ registro

  function inicializar() {
    if (!App.Registro) return;
    App.Registro.registrarArea({ id: 'numerico', nombre: 'Capacidad numérica', descripcion: 'Series numéricas, operaciones y problemas cotidianos.', icono: '#' });
    App.Registro.registrarTipo({ id: 'num_series', areaId: 'numerico', nombre: 'Series numéricas', generadorFn: generarSeriesNumericas, solucionadorFn: resolverSeriesNumericas });
    App.Registro.registrarTipo({ id: 'num_operaciones', areaId: 'numerico', nombre: 'Operaciones', generadorFn: generarOperacionesAritmeticas, solucionadorFn: resolverOperacionesAritmeticas });
    App.Registro.registrarTipo({ id: 'num_problemas', areaId: 'numerico', nombre: 'Problemas', generadorFn: generarProblemasNumericos, solucionadorFn: resolverProblemasNumericos });
  }

  if (App.Registro) inicializar();

  return {
    inicializar: inicializar,
    formatear: formatear,
    evaluarExpresion: evaluarExpresion,
    prediccionesSerie: prediccionesSerie,
    generarSeriesNumericas: generarSeriesNumericas,
    generarOperacionesAritmeticas: generarOperacionesAritmeticas,
    generarProblemasNumericos: generarProblemasNumericos,
    resolverSeriesNumericas: resolverSeriesNumericas,
    resolverOperacionesAritmeticas: resolverOperacionesAritmeticas,
    resolverProblemasNumericos: resolverProblemasNumericos,
    PLANTILLAS_OPERACIONES: Object.keys(PLANTILLAS_OPERACIONES),
    PLANTILLAS_PROBLEMAS: Object.keys(PLANTILLAS_PROBLEMAS)
  };
})();
