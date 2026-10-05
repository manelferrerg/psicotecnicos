/**
 * logico.js - Razonamiento lógico y abstracto: series de figuras, matrices 3 × 3 y analogías.
 *
 * Principios:
 * - Cada ejercicio se genera con una regla conocida, pero el solucionador NO la usa:
 *   deduce la respuesta solo con lo que se ve, probando toda la familia cerrada de reglas.
 *   Si alguna regla de la familia lleva a otra respuesta, el ejercicio se descarta.
 * - Las distractoras solo cambian atributos que la regla hace variar (nunca los que se ven fijos)
 *   y se combinan de forma equilibrada para que no se pueda acertar «votando» el valor más frecuente.
 * - Todas las figuras llevan una banderita asimétrica, así que cualquier giro o reflejo es visible
 *   incluso en el círculo.
 *
 * Objeto global: App.Logico
 */

window.App = window.App || {};

App.Logico = (function () {
  const NOMBRE_FORMA = ['círculo', 'triángulo', 'cuadrado', 'pentágono', 'hexágono'];
  const NOMBRE_RELLENO = ['vacío', 'rayado', 'lleno'];
  const NOMBRE_TAMANO = ['pequeño', 'mediano', 'grande'];
  const ATRIBUTOS = ['forma', 'relleno', 'giro', 'elementos', 'tamano'];
  const NOMBRE_ATRIBUTO = { forma: 'Forma', relleno: 'Relleno', giro: 'Giro', elementos: 'Puntos', tamano: 'Tamaño', orientacion: 'Orientación' };
  const DOMINIO = {
    forma: [0, 1, 2, 3, 4],
    relleno: [0, 1, 2],
    giro: [0, 1, 2, 3, 4, 5, 6, 7],
    elementos: [1, 2, 3, 4, 5, 6, 7, 8],
    tamano: [0, 1, 2]
  };
  const PASOS_FAMILIA = { giro: [1, -1, 2, -2, 3, -3], elementos: [1, -1, 2, -2] };

  // Diseños equilibrados de distractoras: cada fila es una distractora; 1 = atributo con valor erróneo.
  // En cada columna hay exactamente dos 1 y dos 0 (contando la correcta), así que votar no sirve.
  const DISENOS = {
    2: [[1, 0], [0, 1], [1, 1]],
    3: [[1, 1, 0], [1, 0, 1], [0, 1, 1]],
    4: [[1, 1, 0, 1], [1, 0, 1, 1], [0, 1, 1, 0]]
  };

  // ---------------------------------------------------------------- utilidades

  function mod8(x) { return ((x % 8) + 8) % 8; }
  function difGiro(a, b) { let d = mod8(b - a); if (d > 4) d -= 8; return d; }
  function enDominio(atr, v) { return DOMINIO[atr].indexOf(v) >= 0; }
  function cfgNivel(tipo, nivel) {
    const tabla = App.CONFIG.PARAMETROS_NIVELES[tipo];
    return tabla[Math.max(0, Math.min(tabla.length - 1, nivel))];
  }
  function expandirAlternativas(lista, azar) {
    return lista.map(function (t) { return t.indexOf('|') >= 0 ? azar.elemento(t.split('|')) : t; });
  }

  function nombreValor(atr, v) {
    if (atr === 'forma') return NOMBRE_FORMA[v];
    if (atr === 'relleno') return NOMBRE_RELLENO[v];
    if (atr === 'giro') return (v * 45) + '°';
    if (atr === 'elementos') return v + (v === 1 ? ' punto' : ' puntos');
    if (atr === 'tamano') return NOMBRE_TAMANO[v];
    if (atr === 'orientacion') return (v.g * 45) + '°' + (v.e ? ' reflejado' : '');
    return String(v);
  }

  function describirFigura(f) {
    return NOMBRE_FORMA[f.forma] + ' ' + NOMBRE_RELLENO[f.relleno] + ', ' + NOMBRE_TAMANO[f.tamano] +
      ', girado ' + (f.giro * 45) + '°' + (f.espejo ? ', reflejado' : '') + ', ' + nombreValor('elementos', f.elementos);
  }

  /** Dos figuras con la misma firma se ven idénticas; con firmas distintas, se distinguen. */
  function firma(f) {
    return [f.forma, f.relleno, f.giro, f.espejo ? 1 : 0, f.elementos, f.tamano].join('.');
  }

  function clonarFigura(f) {
    return { forma: f.forma, relleno: f.relleno, giro: f.giro, espejo: !!f.espejo, elementos: f.elementos, tamano: f.tamano };
  }

  function claveValor(atr, v) { return atr === 'orientacion' ? v.g + '/' + v.e : String(v); }

  function leerValor(fig, atr) {
    if (atr === 'orientacion') return { g: fig.giro, e: fig.espejo ? 1 : 0 };
    return fig[atr];
  }

  function aplicarValor(fig, atr, valor) {
    const f = clonarFigura(fig);
    if (atr === 'orientacion') { f.giro = valor.g; f.espejo = !!valor.e; } else f[atr] = valor;
    return f;
  }

  function mayuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  // ---------------------------------------------------------------- distractoras

  /** Elige tres errores para un único atributo procurando que la correcta no sea siempre la mayor o la menor. */
  function elegirTresErrores(atr, correcto, candidatos, azar) {
    const vistos = {};
    vistos[claveValor(atr, correcto)] = true;
    const unicos = [];
    candidatos.forEach(function (c) {
      const k = claveValor(atr, c.valor);
      if (!vistos[k]) { vistos[k] = true; unicos.push(c); }
    });
    function ordenar(lista) {
      const prio1 = azar.mezclar(lista.filter(function (c) { return c.prioridad === 1; }));
      const prio2 = azar.mezclar(lista.filter(function (c) { return c.prioridad !== 1; }));
      return prio1.concat(prio2);
    }
    if (unicos.length < 3) return null;
    if (atr === 'giro' || atr === 'elementos') {
      const abajo = ordenar(unicos.filter(function (c) { return c.valor < correcto; }));
      const arriba = ordenar(unicos.filter(function (c) { return c.valor > correcto; }));
      const objetivos = azar.mezclar([0, 1, 2, 3]);
      for (let i = 0; i < objetivos.length; i++) {
        const r = objetivos[i];
        if (abajo.length >= r && arriba.length >= 3 - r) return abajo.slice(0, r).concat(arriba.slice(0, 3 - r));
      }
    }
    return ordenar(unicos).slice(0, 3);
  }

  /**
   * Construye las 4 opciones a partir de la figura correcta.
   * errores[atr] = lista de { valor, etiqueta, prioridad } para cada atributo que varía.
   */
  function construirOpciones(correcta, atributos, errores, azar, figurasEstimulo) {
    const k = atributos.length;
    const opciones = [{ fig: correcta, esCorrecta: true, errorEtiqueta: null }];
    // Copias exactas de figuras del enunciado: si la correcta no es una copia, se admite como mucho una
    // distractora copiada; así «descartar lo que ya aparece» no sirve como atajo.
    const delEstimulo = {};
    (figurasEstimulo || []).forEach(function (f) { delEstimulo[firma(f)] = true; });
    const correctaEsCopia = !!delEstimulo[firma(correcta)];
    if (k === 1) {
      const atr = atributos[0];
      let lista = errores[atr];
      if (!correctaEsCopia) {
        const esCopia = function (e) { return !!delEstimulo[firma(aplicarValor(correcta, atr, e.valor))]; };
        const copias = lista.filter(esCopia);
        lista = lista.filter(function (e) { return !esCopia(e); });
        if (copias.length && azar.probabilidad(0.5)) {
          const preferidas = copias.filter(function (e) { return e.prioridad === 1; });
          lista = lista.concat([azar.elemento(preferidas.length ? preferidas : copias)]);
        }
      }
      const tres = elegirTresErrores(atr, leerValor(correcta, atr), lista, azar);
      if (!tres) return null;
      tres.forEach(function (e) {
        opciones.push({ fig: aplicarValor(correcta, atr, e.valor), esCorrecta: false, errorEtiqueta: NOMBRE_ATRIBUTO[atr] + ': ' + e.etiqueta });
      });
    } else {
      const diseno = DISENOS[k];
      if (!diseno) return null;
      const columnas = azar.mezclar(atributos);
      const elegidos = {};
      for (let i = 0; i < columnas.length; i++) {
        const atr = columnas[i];
        const correcto = leerValor(correcta, atr);
        const validos = errores[atr].filter(function (e) { return claveValor(atr, e.valor) !== claveValor(atr, correcto); });
        if (!validos.length) return null;
        const preferidos = validos.filter(function (e) { return e.prioridad === 1; });
        elegidos[atr] = azar.elemento(preferidos.length ? preferidos : validos);
      }
      diseno.forEach(function (fila) {
        let fig = clonarFigura(correcta);
        const partes = [];
        fila.forEach(function (bit, i) {
          if (!bit) return;
          const atr = columnas[i];
          fig = aplicarValor(fig, atr, elegidos[atr].valor);
          partes.push(NOMBRE_ATRIBUTO[atr] + ': ' + elegidos[atr].etiqueta);
        });
        opciones.push({ fig: fig, esCorrecta: false, errorEtiqueta: partes.join(' ') });
      });
    }
    const firmas = {};
    let copiadas = 0;
    for (let i = 0; i < opciones.length; i++) {
      const f = firma(opciones[i].fig);
      if (firmas[f]) return null;
      firmas[f] = true;
      if (i > 0 && delEstimulo[f]) copiadas++;
    }
    if (!correctaEsCopia && copiadas > 1) return null;
    return opciones;
  }

  function rellenosGenericos(atr, etiqueta) {
    return DOMINIO[atr].map(function (v) { return { valor: v, etiqueta: etiqueta, prioridad: 2 }; });
  }

  // ---------------------------------------------------------------- SERIES DE FIGURAS

  function construirReglaSerie(tipo, atr, cfg, n, azar) {
    const dom = DOMINIO[atr];
    if (tipo === 'progresion') {
      if (atr === 'giro') return { tipo: tipo, paso: azar.elemento(cfg.pasosGiro || [1, -1]), inicio: azar.entero(0, 7) };
      const paso = azar.elemento(cfg.pasosElementos || [1, -1]);
      const min = paso > 0 ? 1 : 1 - paso * n;
      const max = paso > 0 ? 8 - paso * n : 8;
      if (min > max) return null;
      return { tipo: tipo, paso: paso, inicio: azar.entero(min, max) };
    }
    if (tipo === 'alternancia') { const ab = azar.elegirVarios(dom, 2); return { tipo: tipo, a: ab[0], b: ab[1] }; }
    if (tipo === 'ciclo3') return { tipo: tipo, valores: azar.elegirVarios(dom, 3) };
    return { tipo: 'constante', v: azar.elemento(dom) };
  }

  function valorSerie(atr, r, i) {
    if (r.tipo === 'constante') return r.v;
    if (r.tipo === 'progresion') return atr === 'giro' ? mod8(r.inicio + r.paso * i) : r.inicio + r.paso * i;
    if (r.tipo === 'alternancia') return i % 2 === 0 ? r.a : r.b;
    if (r.tipo === 'ciclo3') return r.valores[i % 3];
    return null;
  }

  /** Predicciones de todas las reglas de la familia que encajan con los valores visibles. */
  function predecirSerieAtributo(atr, v) {
    const n = v.length;
    const preds = [];
    if (v.every(function (x) { return x === v[0]; })) preds.push({ tipo: 'constante', pred: v[0] });
    if (PASOS_FAMILIA[atr] && n >= 3) {
      const paso = atr === 'giro' ? difGiro(v[0], v[1]) : v[1] - v[0];
      const encaja = paso !== 0 && PASOS_FAMILIA[atr].indexOf(paso) >= 0 && v.every(function (x, i) {
        return i === 0 || (atr === 'giro' ? difGiro(v[i - 1], x) === paso : x - v[i - 1] === paso);
      });
      if (encaja) {
        const p = atr === 'giro' ? mod8(v[n - 1] + paso) : v[n - 1] + paso;
        if (enDominio(atr, p)) preds.push({ tipo: 'progresion', paso: paso, pred: p });
      }
    }
    if (n >= 3 && v[0] !== v[1] && v.every(function (x, i) { return x === v[i % 2]; })) preds.push({ tipo: 'alternancia', pred: v[n % 2] });
    if (n >= 4 && v[0] !== v[1] && v[1] !== v[2] && v[0] !== v[2] && v.every(function (x, i) { return x === v[i % 3]; })) preds.push({ tipo: 'ciclo3', pred: v[n % 3] });
    return preds;
  }

  function prediccionUnica(preds) {
    const valores = {};
    preds.forEach(function (p) { valores[String(p.pred)] = p.pred; });
    const claves = Object.keys(valores);
    return claves.length === 1 ? valores[claves[0]] : null;
  }

  function erroresSerie(atr, r, visibles, pred) {
    const n = visibles.length;
    const ultimo = visibles[n - 1];
    const lista = [];
    function add(valor, etiqueta) {
      if (valor === null || valor === undefined) return;
      if (atr === 'giro') valor = mod8(valor);
      if (enDominio(atr, valor) && valor !== pred) lista.push({ valor: valor, etiqueta: etiqueta, prioridad: 1 });
    }
    if (r.tipo === 'progresion') {
      add(ultimo, 'repetiste el último valor.');
      add(pred + r.paso, 'aplicaste el cambio una vez de más.');
      add(ultimo - r.paso, 'cambiaste en sentido contrario.');
      add(pred + 2 * r.paso, 'te adelantaste dos pasos.');
      add(pred - 3 * r.paso, 'retrocediste en lugar de avanzar.');
    } else if (r.tipo === 'alternancia') {
      add(ultimo, 'repetiste el último valor y rompiste la alternancia.');
      DOMINIO[atr].forEach(function (v) { if (v !== r.a && v !== r.b) add(v, 'introdujiste un valor que no aparece en la alternancia.'); });
    } else if (r.tipo === 'ciclo3') {
      add(ultimo, 'repetiste el último valor.');
      add(r.valores[(n + 1) % 3], 'te saltaste un paso del ciclo.');
      DOMINIO[atr].forEach(function (v) { if (r.valores.indexOf(v) < 0) add(v, 'introdujiste un valor que no está en el ciclo.'); });
    }
    return lista.concat(rellenosGenericos(atr, 'elegiste un valor que no sigue la regla.'));
  }

  function textoReglaSerie(atr, r) {
    if (r.tipo === 'progresion') {
      if (atr === 'giro') {
        return 'Giro: gira ' + (Math.abs(r.paso) * 45) + '° ' + (r.paso > 0 ? 'en el sentido de las agujas del reloj' : 'en sentido contrario a las agujas del reloj') + ' en cada paso.';
      }
      return 'Puntos: ' + (r.paso > 0 ? 'aumenta' : 'disminuye') + ' ' + Math.abs(r.paso) + ' en cada paso.';
    }
    if (r.tipo === 'alternancia') return NOMBRE_ATRIBUTO[atr] + ': alterna entre ' + nombreValor(atr, r.a) + ' y ' + nombreValor(atr, r.b) + '.';
    if (r.tipo === 'ciclo3') return NOMBRE_ATRIBUTO[atr] + ': repite el ciclo ' + r.valores.map(function (v) { return nombreValor(atr, v); }).join(' → ') + '.';
    return '';
  }

  function asignarAtributos(tipos, pool, azar, excluirProgresion) {
    const asignados = {};
    const progresables = ['giro', 'elementos'].filter(function (a) { return pool.indexOf(a) >= 0 && excluirProgresion.indexOf(a) < 0; });
    const orden = tipos.filter(function (t) { return t === 'progresion'; }).concat(tipos.filter(function (t) { return t !== 'progresion'; }));
    for (let i = 0; i < orden.length; i++) {
      const t = orden[i];
      const libres = (t === 'progresion' ? progresables : pool).filter(function (a) { return !asignados[a]; });
      if (!libres.length) return null;
      asignados[azar.elemento(libres)] = t;
    }
    return asignados;
  }

  function generarSeriesFiguras(nivel, semilla) {
    const cfg = cfgNivel('figuras_series', nivel);
    const n = cfg.visibles;
    for (let intento = 0; intento < 60; intento++) {
      const azar = App.Azar.CrearInstancia(semilla + '|s|' + intento);
      const tipos = expandirAlternativas(cfg.reglas, azar);
      const asignados = asignarAtributos(tipos, cfg.atributos, azar, []);
      if (!asignados) continue;
      const reglas = {};
      let valida = true;
      ATRIBUTOS.forEach(function (atr) {
        const r = construirReglaSerie(asignados[atr] || 'constante', atr, cfg, n, azar);
        if (!r) valida = false;
        reglas[atr] = r;
      });
      if (!valida) continue;
      const figuras = [];
      for (let i = 0; i <= n; i++) {
        const f = { espejo: false };
        ATRIBUTOS.forEach(function (atr) { f[atr] = valorSerie(atr, reglas[atr], i); });
        figuras.push(f);
      }
      const visibles = figuras.slice(0, n);
      const correcta = figuras[n];
      // El solucionador debe deducir exactamente la misma respuesta solo con lo visible.
      const prediccion = resolverSecuencia(visibles);
      if (!prediccion || firma(prediccion) !== firma(correcta)) continue;
      const variables = ATRIBUTOS.filter(function (a) { return asignados[a]; });
      const errores = {};
      variables.forEach(function (atr) {
        errores[atr] = erroresSerie(atr, reglas[atr], visibles.map(function (f) { return f[atr]; }), correcta[atr]);
      });
      const opcionesBase = construirOpciones(correcta, variables, errores, azar, visibles);
      if (!opcionesBase) continue;
      const mez = azar.mezclarOpciones(opcionesBase);
      const fijos = ATRIBUTOS.filter(function (a) { return !asignados[a]; });
      const ultima = visibles[n - 1];
      // El identificador se basa en lo que se ve: dos ejercicios con las mismas figuras son el mismo ejercicio.
      const idCanonico = 'figuras_series|v' + App.CONFIG.VERSIONES_GENERADOR.figuras_series + '|n' + nivel + '|' + visibles.map(firma).join(';');
      return {
        idCanonico: idCanonico,
        tipoId: 'figuras_series', areaId: 'logico', nivel: nivel, semilla: semilla,
        version: App.CONFIG.VERSIONES_GENERADOR.figuras_series,
        reglaId: variables.map(function (a) { return a + ':' + reglas[a].tipo; }).join('+'),
        enunciado: '¿Qué figura continúa la serie?',
        estimulo: { tipo: 'serie_figuras', figuras: visibles },
        opciones: mez.opciones,
        opcionCorrectaIndex: mez.idxCorrecta,
        parametrosNivel: { visibles: n, numReglas: variables.length, tiposRegla: variables.map(function (a) { return reglas[a].tipo; }) },
        explicacion: {
          datos: 'Hay ' + n + ' figuras. Cambian: ' + variables.map(function (a) { return NOMBRE_ATRIBUTO[a].toLowerCase(); }).join(', ') + '.' +
            (fijos.length ? ' No cambian: ' + fijos.map(function (a) { return NOMBRE_ATRIBUTO[a].toLowerCase(); }).join(', ') + '.' : ''),
          regla: variables.map(function (a) { return textoReglaSerie(a, reglas[a]); }).join(' '),
          pasos: 'Última figura: ' + describirFigura(ultima) + '. Aplicando la regla: ' +
            variables.map(function (a) { return NOMBRE_ATRIBUTO[a].toLowerCase() + ' ' + nombreValor(a, ultima[a]) + ' → ' + nombreValor(a, correcta[a]); }).join('; ') + '.',
          respuesta: 'Opción ' + (mez.idxCorrecta + 1) + ': ' + describirFigura(correcta) + '.'
        }
      };
    }
    throw new Error('No se pudo generar una serie de figuras válida (nivel ' + nivel + ').');
  }

  /** Deduce la figura siguiente solo con las figuras visibles. Devuelve null si es ambigua. */
  function resolverSecuencia(visibles) {
    const pred = { espejo: false };
    for (let i = 0; i < ATRIBUTOS.length; i++) {
      const atr = ATRIBUTOS[i];
      const p = prediccionUnica(predecirSerieAtributo(atr, visibles.map(function (f) { return f[atr]; })));
      if (p === null) return null;
      pred[atr] = p;
    }
    if (visibles.some(function (f) { return f.espejo; })) return null;
    return pred;
  }

  function resolverSerieFiguras(ej) {
    if (!ej || !ej.estimulo || !Array.isArray(ej.estimulo.figuras)) return { valido: false, motivo: 'Faltan figuras.' };
    const pred = resolverSecuencia(ej.estimulo.figuras);
    if (!pred) return { valido: false, motivo: 'La serie admite más de una continuación o ninguna.' };
    return evaluarOpcionesFigura(ej, pred);
  }

  function evaluarOpcionesFigura(ej, pred) {
    const objetivo = firma(pred);
    const coincidencias = [];
    ej.opciones.forEach(function (o, i) { if (o && o.fig && firma(o.fig) === objetivo) coincidencias.push(i); });
    if (coincidencias.length !== 1) return { valido: false, motivo: coincidencias.length + ' opciones coinciden con la respuesta deducida.', prediccion: pred };
    return { valido: coincidencias[0] === ej.opcionCorrectaIndex, indice: coincidencias[0], prediccion: pred, motivo: coincidencias[0] === ej.opcionCorrectaIndex ? '' : 'La opción marcada no es la deducida.' };
  }

  // ---------------------------------------------------------------- MATRICES 3 × 3

  function construirReglaMatriz(tipo, atr, cfg, azar) {
    const dom = DOMINIO[atr];
    if (tipo === 'fila_constante') return { tipo: tipo, filas: azar.elegirVarios(dom, 3) };
    if (tipo === 'progresion') {
      const paso = atr === 'giro' ? azar.elemento(cfg.pasosGiro || [1, -1]) : azar.elemento(cfg.pasosElementos || [1, -1]);
      const inicios = [0, 1, 2].map(function () {
        if (atr === 'giro') return azar.entero(0, 7);
        return paso > 0 ? azar.entero(1, 8 - 2 * paso) : azar.entero(1 - 2 * paso, 8);
      });
      return { tipo: tipo, paso: paso, inicios: inicios };
    }
    if (tipo === 'distribucion') {
      return { tipo: tipo, valores: azar.elegirVarios(dom, 3), desplazamiento: azar.elemento([1, 2]), ordenFilas: azar.mezclar([0, 1, 2]) };
    }
    if (tipo === 'aritmetica') {
      const op = cfg.aritmetica.indexOf('|') >= 0 ? azar.elemento(cfg.aritmetica.split('|')) : cfg.aritmetica;
      const filas = [0, 1, 2].map(function () {
        if (op === 'suma') { const a = azar.entero(1, 6); return [a, azar.entero(1, 8 - a)]; }
        const a = azar.entero(3, 8); return [a, azar.entero(1, a - 1)];
      });
      return { tipo: tipo, op: op, filas: filas };
    }
    return { tipo: 'constante', v: azar.elemento(dom) };
  }

  function valorMatriz(atr, r, fila, col) {
    if (r.tipo === 'constante') return r.v;
    if (r.tipo === 'fila_constante') return r.filas[fila];
    if (r.tipo === 'progresion') return atr === 'giro' ? mod8(r.inicios[fila] + r.paso * col) : r.inicios[fila] + r.paso * col;
    if (r.tipo === 'distribucion') return r.valores[(col + r.ordenFilas[fila] * r.desplazamiento) % 3];
    if (r.tipo === 'aritmetica') {
      const a = r.filas[fila][0];
      const b = r.filas[fila][1];
      if (col === 0) return a;
      if (col === 1) return b;
      return r.op === 'suma' ? a + b : a - b;
    }
    return null;
  }

  function predecirMatrizAtributo(atr, celdas) {
    const v = celdas.map(function (c) { return c ? c[atr] : null; });
    const f0 = [v[0], v[1], v[2]];
    const f1 = [v[3], v[4], v[5]];
    const f2 = [v[6], v[7]];
    const preds = [];
    const visibles = v.slice(0, 8);
    if (visibles.every(function (x) { return x === v[0]; })) preds.push({ tipo: 'constante', pred: v[0] });
    if (f0[0] === f0[1] && f0[1] === f0[2] && f1[0] === f1[1] && f1[1] === f1[2] && f2[0] === f2[1]) preds.push({ tipo: 'fila_constante', pred: f2[0] });
    if (PASOS_FAMILIA[atr]) {
      const dif = function (a, b) { return atr === 'giro' ? difGiro(a, b) : b - a; };
      const p = dif(f0[0], f0[1]);
      if (p !== 0 && PASOS_FAMILIA[atr].indexOf(p) >= 0 && dif(f0[1], f0[2]) === p && dif(f1[0], f1[1]) === p && dif(f1[1], f1[2]) === p && dif(f2[0], f2[1]) === p) {
        const pred = atr === 'giro' ? mod8(f2[1] + p) : f2[1] + p;
        if (enDominio(atr, pred)) preds.push({ tipo: 'progresion', pred: pred });
      }
    }
    const s0 = f0.slice().sort().join(',');
    const s1 = f1.slice().sort().join(',');
    if (new Set(f0).size === 3 && s0 === s1 && f2[0] !== f2[1] && f0.indexOf(f2[0]) >= 0 && f0.indexOf(f2[1]) >= 0) {
      preds.push({ tipo: 'distribucion', pred: f0.filter(function (x) { return x !== f2[0] && x !== f2[1]; })[0] });
    }
    if (atr === 'elementos') {
      if (f0[0] + f0[1] === f0[2] && f1[0] + f1[1] === f1[2] && enDominio(atr, f2[0] + f2[1])) preds.push({ tipo: 'suma', pred: f2[0] + f2[1] });
      if (f0[0] - f0[1] === f0[2] && f1[0] - f1[1] === f1[2] && enDominio(atr, f2[0] - f2[1])) preds.push({ tipo: 'resta', pred: f2[0] - f2[1] });
    }
    return preds;
  }

  function resolverCeldas(celdas) {
    const pred = { espejo: false };
    for (let i = 0; i < ATRIBUTOS.length; i++) {
      const atr = ATRIBUTOS[i];
      const p = prediccionUnica(predecirMatrizAtributo(atr, celdas));
      if (p === null) return null;
      pred[atr] = p;
    }
    return pred;
  }

  function erroresMatriz(atr, r, celdas, pred) {
    const f2a = celdas[6][atr];
    const f2b = celdas[7][atr];
    const lista = [];
    function add(valor, etiqueta) {
      if (atr === 'giro') valor = mod8(valor);
      if (enDominio(atr, valor) && valor !== pred) lista.push({ valor: valor, etiqueta: etiqueta, prioridad: 1 });
    }
    if (r.tipo === 'fila_constante') {
      add(celdas[3][atr], 'copiaste el valor de la fila de arriba.');
      add(celdas[0][atr], 'copiaste el valor de la primera fila.');
    } else if (r.tipo === 'progresion') {
      add(f2b, 'repetiste el último valor de la fila.');
      add(pred + r.paso, 'aplicaste el cambio una vez de más.');
      add(f2a, 'volviste al primer valor de la fila.');
      add(pred - 3 * r.paso, 'cambiaste en sentido contrario.');
    } else if (r.tipo === 'distribucion') {
      add(f2a, 'repetiste un valor que ya está en la fila.');
      add(f2b, 'repetiste un valor que ya está en la fila.');
      DOMINIO[atr].forEach(function (v) { if (r.valores.indexOf(v) < 0) add(v, 'elegiste un valor que no forma parte del trío de la fila.'); });
    } else if (r.tipo === 'aritmetica') {
      if (r.op === 'suma') add(f2a - f2b, 'restaste en lugar de sumar.');
      else add(f2a + f2b, 'sumaste en lugar de restar.');
      add(pred + 1, 'contaste un punto de más.');
      add(pred - 1, 'contaste un punto de menos.');
    }
    return lista.concat(rellenosGenericos(atr, 'elegiste un valor que no sigue la regla de las filas.'));
  }

  function textoReglaMatriz(atr, r) {
    const nombre = NOMBRE_ATRIBUTO[atr];
    if (r.tipo === 'fila_constante') return nombre + ': cada fila mantiene el mismo valor.';
    if (r.tipo === 'progresion') {
      if (atr === 'giro') return 'Giro: en cada fila, cada casilla gira ' + (Math.abs(r.paso) * 45) + '° ' + (r.paso > 0 ? 'en el sentido de las agujas del reloj' : 'en sentido contrario a las agujas del reloj') + ' respecto a la anterior.';
      return 'Puntos: en cada fila ' + (r.paso > 0 ? 'aumentan' : 'disminuyen') + ' ' + Math.abs(r.paso) + ' de una casilla a la siguiente.';
    }
    if (r.tipo === 'distribucion') return nombre + ': cada fila contiene una vez cada valor del trío ' + r.valores.map(function (v) { return nombreValor(atr, v); }).join(', ') + '.';
    if (r.tipo === 'aritmetica') return 'Puntos: la tercera casilla de cada fila ' + (r.op === 'suma' ? 'suma' : 'resta') + ' los puntos de las dos primeras.';
    return '';
  }

  function generarMatricesFiguras(nivel, semilla) {
    const cfg = cfgNivel('figuras_matrices', nivel);
    for (let intento = 0; intento < 80; intento++) {
      const azar = App.Azar.CrearInstancia(semilla + '|m|' + intento);
      const tipos = expandirAlternativas(cfg.reglas, azar);
      const asignados = asignarAtributos(tipos, cfg.atributos, azar, cfg.aritmetica ? ['elementos'] : []);
      if (!asignados) continue;
      if (cfg.aritmetica) asignados.elementos = 'aritmetica';
      const reglas = {};
      ATRIBUTOS.forEach(function (atr) { reglas[atr] = construirReglaMatriz(asignados[atr] || 'constante', atr, cfg, azar); });
      const celdas = [];
      for (let fila = 0; fila < 3; fila++) {
        for (let col = 0; col < 3; col++) {
          const f = { espejo: false };
          ATRIBUTOS.forEach(function (atr) { f[atr] = valorMatriz(atr, reglas[atr], fila, col); });
          celdas.push(f);
        }
      }
      if (celdas.some(function (c) { return !enDominio('elementos', c.elementos); })) continue;
      const correcta = celdas[8];
      const visibles = celdas.slice(0, 8).concat([null]);
      const prediccion = resolverCeldas(visibles);
      if (!prediccion || firma(prediccion) !== firma(correcta)) continue;
      const variables = ATRIBUTOS.filter(function (a) { return asignados[a]; });
      const errores = {};
      variables.forEach(function (atr) { errores[atr] = erroresMatriz(atr, reglas[atr], celdas, correcta[atr]); });
      const opcionesBase = construirOpciones(correcta, variables, errores, azar, celdas.slice(0, 8));
      if (!opcionesBase) continue;
      const mez = azar.mezclarOpciones(opcionesBase);
      const idCanonico = 'figuras_matrices|v' + App.CONFIG.VERSIONES_GENERADOR.figuras_matrices + '|n' + nivel + '|' + celdas.slice(0, 8).map(firma).join(';');
      return {
        idCanonico: idCanonico,
        tipoId: 'figuras_matrices', areaId: 'logico', nivel: nivel, semilla: semilla,
        version: App.CONFIG.VERSIONES_GENERADOR.figuras_matrices,
        reglaId: variables.map(function (a) { return a + ':' + reglas[a].tipo; }).join('+'),
        enunciado: '¿Qué figura completa la casilla vacía? Las reglas se leen por filas.',
        estimulo: { tipo: 'matriz', celdas: visibles },
        opciones: mez.opciones,
        opcionCorrectaIndex: mez.idxCorrecta,
        parametrosNivel: { numReglas: variables.length, tiposRegla: variables.map(function (a) { return reglas[a].tipo; }) },
        explicacion: {
          datos: 'Matriz de 3 × 3 con la última casilla vacía. Cambian: ' + variables.map(function (a) { return NOMBRE_ATRIBUTO[a].toLowerCase(); }).join(', ') + '.',
          regla: variables.map(function (a) { return textoReglaMatriz(a, reglas[a]); }).join(' '),
          pasos: 'En la tercera fila: ' + variables.map(function (a) {
            if (reglas[a].tipo === 'aritmetica') return 'puntos ' + celdas[6].elementos + (reglas[a].op === 'suma' ? ' + ' : ' − ') + celdas[7].elementos + ' = ' + correcta.elementos;
            return NOMBRE_ATRIBUTO[a].toLowerCase() + ' → ' + nombreValor(a, correcta[a]);
          }).join('; ') + '.',
          respuesta: 'Opción ' + (mez.idxCorrecta + 1) + ': ' + describirFigura(correcta) + '.'
        }
      };
    }
    throw new Error('No se pudo generar una matriz válida (nivel ' + nivel + ').');
  }

  function resolverMatricesFiguras(ej) {
    if (!ej || !ej.estimulo || !Array.isArray(ej.estimulo.celdas) || ej.estimulo.celdas.length !== 9) return { valido: false, motivo: 'Faltan celdas.' };
    const pred = resolverCeldas(ej.estimulo.celdas);
    if (!pred) return { valido: false, motivo: 'La matriz admite más de una respuesta o ninguna.' };
    return evaluarOpcionesFigura(ej, pred);
  }

  // ---------------------------------------------------------------- ANALOGÍAS

  // Orientación como elemento del grupo diédrico: M = R(g)·S^e (g en pasos de 45°).
  function componer(a, b) { return { g: mod8(a.g + (a.e ? -b.g : b.g)), e: a.e ^ b.e }; }
  function inversa(a) { return a.e ? { g: a.g, e: 1 } : { g: mod8(-a.g), e: 0 }; }
  function orientacion(f) { return { g: f.giro, e: f.espejo ? 1 : 0 }; }
  function igualOrientacion(a, b) { return a.g === b.g && a.e === b.e; }
  const T_ORIENTACION = { giro90: { g: 2, e: 0 }, giro180: { g: 4, e: 0 }, reflejo: { g: 0, e: 1 } };

  function aplicarTransformacion(fig, t, delta) {
    const f = clonarFigura(fig);
    if (T_ORIENTACION[t]) {
      const o = componer(T_ORIENTACION[t], orientacion(f));
      f.giro = o.g; f.espejo = !!o.e;
    } else if (t === 'relleno') {
      f.relleno = (f.relleno + 1) % 3;
    } else if (t === 'elemento') {
      f.elementos = f.elementos + delta;
    }
    return f;
  }

  function textoTransformacion(t, delta) {
    if (t === 'giro90') return 'gira 90° en el sentido de las agujas del reloj';
    if (t === 'giro180') return 'gira 180°';
    if (t === 'reflejo') return 'se refleja como en un espejo (izquierda ↔ derecha)';
    if (t === 'relleno') return 'cambia de relleno';
    if (t === 'elemento') return delta > 0 ? 'gana un punto' : 'pierde un punto';
    return t;
  }

  function elegirTransformaciones(cfg, azar) {
    for (let k = 0; k < 50; k++) {
      const elegidas = azar.elegirVarios(cfg.pool, cfg.transformaciones);
      const giros = elegidas.filter(function (t) { return t === 'giro90' || t === 'giro180'; }).length;
      if (giros > 1) continue;
      const tieneReflejo = elegidas.indexOf('reflejo') >= 0;
      if (cfg.transformaciones === 1 && elegidas[0] === 'relleno') continue;
      if (cfg.ordenImporta && !(tieneReflejo && giros === 1)) continue;
      if (cfg.ordenImporta === false && tieneReflejo && giros === 1) continue;
      return elegidas;
    }
    return null;
  }

  /** Deduce D solo con A, B y C. Devuelve null si hay más de una interpretación. */
  function resolverTerna(A, B, C) {
    if (A.forma !== B.forma || A.tamano !== B.tamano) return null;
    const D = clonarFigura(C);
    // Relleno: si cambia, todas las interpretaciones razonables («siguiente», «el de B») deben coincidir.
    if (A.relleno !== B.relleno) {
      const pasos = (B.relleno - A.relleno + 3) % 3;
      const opcion1 = (C.relleno + pasos) % 3;
      const opcion2 = B.relleno;
      if (opcion1 !== opcion2) return null;
      D.relleno = opcion1;
    }
    // Puntos: el cambio es relacional (mismos puntos de más o de menos).
    const delta = B.elementos - A.elementos;
    D.elementos = C.elementos + delta;
    if (!enDominio('elementos', D.elementos)) return null;
    // Orientación: el cambio visto en el mundo y en el sistema propio de la figura debe coincidir.
    const oA = orientacion(A);
    const oB = orientacion(B);
    const oC = orientacion(C);
    const mundo = componer(componer(oB, inversa(oA)), oC);
    const propio = componer(oC, componer(inversa(oA), oB));
    if (!igualOrientacion(mundo, propio)) return null;
    D.giro = mundo.g; D.espejo = !!mundo.e;
    return D;
  }

  function generarAnalogiasFiguras(nivel, semilla) {
    const cfg = cfgNivel('figuras_analogias', nivel);
    for (let intento = 0; intento < 80; intento++) {
      const azar = App.Azar.CrearInstancia(semilla + '|a|' + intento);
      const trans = elegirTransformaciones(cfg, azar);
      if (!trans) continue;
      const secuencia = azar.mezclar(trans);
      const delta = trans.indexOf('elemento') >= 0 ? azar.elemento([1, -1]) : 0;
      const tieneReflejo = trans.indexOf('reflejo') >= 0;
      const A = { forma: azar.elemento(DOMINIO.forma), relleno: azar.elemento(DOMINIO.relleno), giro: azar.entero(0, 7), espejo: false, elementos: azar.entero(2, 7), tamano: azar.elemento(DOMINIO.tamano) };
      const C = { forma: azar.elemento(DOMINIO.forma.filter(function (x) { return x !== A.forma; })), relleno: azar.elemento(DOMINIO.relleno), giro: azar.entero(0, 7), espejo: false, elementos: azar.entero(2, 7), tamano: azar.elemento(DOMINIO.tamano) };
      (cfg.cIgual || []).forEach(function (atr) { C[atr] = A[atr]; });
      if (trans.indexOf('relleno') >= 0) C.relleno = A.relleno;
      if (tieneReflejo) C.giro = cfg.cGiroOpuesto ? mod8(A.giro + 4) : (azar.probabilidad(0.5) ? A.giro : mod8(A.giro + 4));
      else if (cfg.cGiroOpuesto) C.giro = mod8(A.giro + 4);
      let B = clonarFigura(A);
      let D = clonarFigura(C);
      secuencia.forEach(function (t) { B = aplicarTransformacion(B, t, delta); D = aplicarTransformacion(D, t, delta); });
      if (!enDominio('elementos', B.elementos) || !enDominio('elementos', D.elementos)) continue;
      if (firma(A) === firma(B) || firma(C) === firma(D)) continue;
      const pred = resolverTerna(A, B, C);
      if (!pred || firma(pred) !== firma(D)) continue;

      const grupos = [];
      const errores = {};
      if (trans.some(function (t) { return T_ORIENTACION[t]; })) {
        grupos.push('orientacion');
        const oC = orientacion(C);
        const oD = orientacion(D);
        const tGiro = trans.filter(function (t) { return t === 'giro90' || t === 'giro180'; })[0];
        const lista = [];
        const add = function (o, etiqueta) { if (!igualOrientacion(o, oD)) lista.push({ valor: o, etiqueta: etiqueta, prioridad: 1 }); };
        add(oC, 'no aplicaste el cambio de orientación.');
        if (tGiro) {
          let sinGiro = oC;
          let giroContrario = oC;
          secuencia.forEach(function (t) {
            if (t === tGiro) giroContrario = componer({ g: mod8(-T_ORIENTACION[t].g), e: 0 }, giroContrario);
            else if (T_ORIENTACION[t]) { sinGiro = componer(T_ORIENTACION[t], sinGiro); giroContrario = componer(T_ORIENTACION[t], giroContrario); }
          });
          add(giroContrario, 'giraste en sentido contrario.');
          add(sinGiro, 'olvidaste el giro.');
          add(componer({ g: 2, e: 0 }, oD), 'giraste 90° de más.');
        }
        if (tieneReflejo) {
          let sinReflejo = oC;
          secuencia.forEach(function (t) { if (t !== 'reflejo' && T_ORIENTACION[t]) sinReflejo = componer(T_ORIENTACION[t], sinReflejo); });
          add(sinReflejo, 'olvidaste el reflejo.');
          add(componer({ g: 4, e: 0 }, oD), 'reflejaste de arriba abajo en lugar de izquierda-derecha.');
        }
        DOMINIO.giro.forEach(function (g) { [0, 1].forEach(function (e) { lista.push({ valor: { g: g, e: e }, etiqueta: 'elegiste una orientación que no corresponde al cambio de A a B.', prioridad: 2 }); }); });
        errores.orientacion = lista.filter(function (x) { return !igualOrientacion(x.valor, oD); });
      }
      if (trans.indexOf('relleno') >= 0) {
        grupos.push('relleno');
        errores.relleno = [
          { valor: C.relleno, etiqueta: 'no cambiaste el relleno.', prioridad: 1 },
          { valor: (D.relleno + 1) % 3, etiqueta: 'cambiaste a un relleno distinto del que corresponde.', prioridad: 1 }
        ].filter(function (x) { return x.valor !== D.relleno; });
      }
      if (delta) {
        grupos.push('elementos');
        errores.elementos = [
          { valor: C.elementos, etiqueta: 'no cambiaste el número de puntos.', prioridad: 1 },
          { valor: C.elementos - delta, etiqueta: 'cambiaste los puntos en sentido contrario.', prioridad: 1 },
          { valor: C.elementos + 2 * delta, etiqueta: 'cambiaste un punto de más.', prioridad: 1 }
        ].concat(rellenosGenericos('elementos', 'elegiste un número de puntos que no corresponde al cambio de A a B.'))
          .filter(function (x) { return enDominio('elementos', x.valor) && x.valor !== D.elementos; });
      }
      const opcionesBase = construirOpciones(D, grupos, errores, azar, [A, B, C]);
      if (!opcionesBase) continue;
      const mez = azar.mezclarOpciones(opcionesBase);
      const idCanonico = 'figuras_analogias|v' + App.CONFIG.VERSIONES_GENERADOR.figuras_analogias + '|n' + nivel + '|A' + firma(A) + '|B' + firma(B) + '|C' + firma(C);
      const cambios = secuencia.map(function (t) { return textoTransformacion(t, delta); });
      return {
        idCanonico: idCanonico,
        tipoId: 'figuras_analogias', areaId: 'logico', nivel: nivel, semilla: semilla,
        version: App.CONFIG.VERSIONES_GENERADOR.figuras_analogias,
        reglaId: secuencia.slice().sort().join('+'),
        enunciado: 'A se transforma en B. Aplica a C exactamente los mismos cambios: ¿qué figura obtienes?',
        estimulo: { tipo: 'analogia', a: A, b: B, c: C },
        opciones: mez.opciones,
        opcionCorrectaIndex: mez.idxCorrecta,
        parametrosNivel: { numTransformaciones: trans.length, transformaciones: secuencia },
        explicacion: {
          datos: 'A: ' + describirFigura(A) + '. B: ' + describirFigura(B) + '. C: ' + describirFigura(C) + '.',
          regla: 'De A a B la figura ' + (cambios.length > 1 ? cambios.slice(0, -1).join(', ') + ' y ' + cambios[cambios.length - 1] : cambios[0]) + (cambios.length > 1 ? ' (en este orden)' : '') + '.',
          pasos: 'Aplicando los mismos cambios a C se obtiene: ' + describirFigura(D) + '.',
          respuesta: 'Opción ' + (mez.idxCorrecta + 1) + ': ' + describirFigura(D) + '.'
        }
      };
    }
    throw new Error('No se pudo generar una analogía válida (nivel ' + nivel + ').');
  }

  function resolverAnalogiasFiguras(ej) {
    if (!ej || !ej.estimulo || !ej.estimulo.a || !ej.estimulo.b || !ej.estimulo.c) return { valido: false, motivo: 'Faltan figuras.' };
    const pred = resolverTerna(ej.estimulo.a, ej.estimulo.b, ej.estimulo.c);
    if (!pred) return { valido: false, motivo: 'La analogía admite más de una interpretación.' };
    return evaluarOpcionesFigura(ej, pred);
  }

  // ---------------------------------------------------------------- registro

  function inicializar() {
    if (!App.Registro) return;
    App.Registro.registrarArea({ id: 'logico', nombre: 'Razonamiento lógico y abstracto', descripcion: 'Series de figuras, matrices de 3 × 3 y analogías de transformación.', icono: '◆' });
    App.Registro.registrarTipo({ id: 'figuras_series', areaId: 'logico', nombre: 'Series de figuras', generadorFn: generarSeriesFiguras, solucionadorFn: resolverSerieFiguras });
    App.Registro.registrarTipo({ id: 'figuras_matrices', areaId: 'logico', nombre: 'Matrices 3 × 3', generadorFn: generarMatricesFiguras, solucionadorFn: resolverMatricesFiguras });
    App.Registro.registrarTipo({ id: 'figuras_analogias', areaId: 'logico', nombre: 'Analogías de transformación', generadorFn: generarAnalogiasFiguras, solucionadorFn: resolverAnalogiasFiguras });
  }

  if (App.Registro) inicializar();

  return {
    inicializar: inicializar,
    ATRIBUTOS: ATRIBUTOS,
    DOMINIO: DOMINIO,
    firma: firma,
    describirFigura: describirFigura,
    nombreValor: nombreValor,
    generarSeriesFiguras: generarSeriesFiguras,
    generarMatricesFiguras: generarMatricesFiguras,
    generarAnalogiasFiguras: generarAnalogiasFiguras,
    resolverSerieFiguras: resolverSerieFiguras,
    resolverMatricesFiguras: resolverMatricesFiguras,
    resolverAnalogiasFiguras: resolverAnalogiasFiguras
  };
})();
