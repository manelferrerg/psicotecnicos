/**
 * autodiagnostico.js - Batería de comprobaciones compartida por el navegador (?test=1) y Node (pruebas/ejecutar.js).
 *
 * Comprueba, sin tocar el progreso real:
 *  1. Ejercicios de todos los tipos y niveles: solución única deducida solo con lo visible, 4 opciones distintas,
 *     parámetros iguales a la tabla de niveles, explicación coherente y sin pistas en los atributos fijos.
 *  2. Que los atajos sin razonar (elegir la mayor, la menor, la más repetida…) no superen el 35 %.
 *  3. Posición de la correcta uniforme, determinismo e identificadores canónicos.
 *  4. Regresiones: semillas fijas que deben dar siempre el mismo ejercicio.
 *  5. Prueba de nivel simulada con respuestas al azar y perfectas.
 *  6. Almacenamiento con datos simulados: guardar, podar, cuota llena, importar, deshacer y borrar.
 *  7. Casos límite de sesiones y evolución del nivel.
 *
 * Objeto global: App.Autodiagnostico
 */

window.App = window.App || {};

App.Autodiagnostico = (function () {
  const ATRS_FIGURA = ['forma', 'relleno', 'giro', 'espejo', 'elementos', 'tamano'];
  const ATRS_NUMERICOS = ['forma', 'relleno', 'giro', 'elementos', 'tamano'];
  const UMBRAL_ATAJO_TIPO = 0.35;

  // ------------------------------------------------------------ utilidades

  function listaTipos() {
    const lista = [];
    App.Registro.obtenerAreas().forEach(function (a) {
      App.Registro.obtenerTiposPorArea(a.id).forEach(function (t) { lista.push(t); });
    });
    return lista;
  }

  function cfg(tipoId, nivel) { return App.CONFIG.PARAMETROS_NIVELES[tipoId][nivel]; }
  function pct(x) { return (Math.round(x * 1000) / 10).toString().replace('.', ',') + ' %'; }
  function esEntero(v) { return Math.abs(v - Math.round(v)) < 1e-9; }
  function dosDecimales(v) { return Math.abs(v * 100 - Math.round(v * 100)) < 1e-6; }
  function vf(f, a) { return a === 'espejo' ? (f.espejo ? 1 : 0) : f[a]; }

  function clave(op) { return op.fig ? App.Logico.firma(op.fig) : String(op.texto).trim(); }

  /** Crédito esperado de un atajo que elige al azar entre los índices dados. */
  function credito(indices, correcta) {
    if (!indices.length) return 0.25;
    return indices.indexOf(correcta) >= 0 ? 1 / indices.length : 0;
  }

  function argExtremo(valores, mayor) {
    let mejor = mayor ? -Infinity : Infinity;
    valores.forEach(function (v) { if (mayor ? v > mejor : v < mejor) mejor = v; });
    const idx = [];
    valores.forEach(function (v, i) { if (Math.abs(v - mejor) < 1e-9) idx.push(i); });
    return idx;
  }

  /** Coincidencia de multiconjuntos admitiendo alternativas «a|b». */
  function coincideMulticonjunto(esperado, real) {
    if (esperado.length !== real.length) return false;
    const libres = real.slice();
    const orden = esperado.slice().sort(function (a, b) { return (a.indexOf('|') >= 0) - (b.indexOf('|') >= 0); });
    for (let i = 0; i < orden.length; i++) {
      const alternativas = orden[i].split('|');
      const k = libres.findIndex(function (r) { return alternativas.indexOf(r) >= 0; });
      if (k < 0) return false;
      libres.splice(k, 1);
    }
    return true;
  }

  // ------------------------------------------------------------ 1. comprobación de un ejercicio

  function comprobarParametros(tipoId, nivel, ej) {
    const c = cfg(tipoId, nivel);
    const p = ej.parametrosNivel || {};
    if (tipoId === 'figuras_series') {
      if (p.visibles !== c.visibles || ej.estimulo.figuras.length !== c.visibles) return 'figuras visibles ' + p.visibles + ' (tabla: ' + c.visibles + ')';
      if (!coincideMulticonjunto(c.reglas, p.tiposRegla || [])) return 'reglas ' + (p.tiposRegla || []).join('+') + ' (tabla: ' + c.reglas.join('+') + ')';
    } else if (tipoId === 'figuras_matrices') {
      const esperado = c.reglas.concat(c.aritmetica ? ['aritmetica'] : []);
      if (!coincideMulticonjunto(esperado, p.tiposRegla || [])) return 'reglas ' + (p.tiposRegla || []).join('+') + ' (tabla: ' + esperado.join('+') + ')';
    } else if (tipoId === 'figuras_analogias') {
      const t = p.transformaciones || [];
      if (t.length !== c.transformaciones) return t.length + ' transformaciones (tabla: ' + c.transformaciones + ')';
      if (!t.every(function (x) { return c.pool.indexOf(x) >= 0; })) return 'transformación fuera de la tabla: ' + t.join('+');
      const giros = t.filter(function (x) { return x === 'giro90' || x === 'giro180'; }).length;
      const reflejo = t.indexOf('reflejo') >= 0;
      if (c.ordenImporta === true && !(reflejo && giros === 1)) return 'el nivel exige giro y reflejo combinados';
      if (c.ordenImporta === false && reflejo && giros === 1) return 'giro y reflejo combinados donde el orden no debe importar';
      if (c.transformaciones === 1 && t[0] === 'relleno') return 'el relleno no puede ser la única transformación';
    } else if (tipoId === 'num_series') {
      if (c.reglas.indexOf(p.regla) < 0) return 'regla ' + p.regla + ' fuera de la tabla';
      const esperados = p.regla === 'intercalada_segundo_orden' ? Math.max(c.visibles, 8) : (c.visibles === 8 ? 7 : c.visibles);
      if (ej.estimulo.terminos.length !== esperados) return ej.estimulo.terminos.length + ' términos (esperados: ' + esperados + ')';
    } else if (tipoId === 'num_operaciones' || tipoId === 'num_problemas') {
      if (c.plantillas.indexOf(p.plantilla) < 0) return 'plantilla ' + p.plantilla + ' fuera de la tabla';
    }
    return null;
  }

  function figurasDelEstimulo(est) {
    if (est.tipo === 'serie_figuras') return est.figuras;
    if (est.tipo === 'matriz') return est.celdas.filter(Boolean);
    if (est.tipo === 'analogia') return [est.a, est.b, est.c];
    return [];
  }

  function figuraEnDominio(f) {
    return f && App.Logico.ATRIBUTOS.every(function (a) { return App.Logico.DOMINIO[a].indexOf(f[a]) >= 0; }) && typeof f.espejo === 'boolean';
  }

  /** Atributos que el enunciado muestra fijos y que, por tanto, deben ser iguales en las cuatro opciones. */
  function atributosFijos(est) {
    if (est.tipo === 'analogia') {
      const fijos = ['forma', 'tamano'];
      if (est.a.relleno === est.b.relleno) fijos.push('relleno');
      if (est.a.elementos === est.b.elementos) fijos.push('elementos');
      if (est.a.giro === est.b.giro && est.a.espejo === est.b.espejo) fijos.push('giro', 'espejo');
      return { atributos: fijos, referencia: est.c };
    }
    const figs = figurasDelEstimulo(est);
    return { atributos: ATRS_FIGURA.filter(function (a) { return figs.every(function (f) { return vf(f, a) === vf(figs[0], a); }); }), referencia: figs[0] };
  }

  /** Devuelve la lista de problemas encontrados en un ejercicio (vacía si está bien). */
  function comprobarEjercicio(tipo, nivel, ej) {
    const errs = [];
    if (!ej || typeof ej !== 'object') return ['no se generó el ejercicio'];
    if (ej.tipoId !== tipo.id || ej.nivel !== nivel || ej.areaId !== tipo.areaId) errs.push('tipo, área o nivel incorrectos');
    if (ej.version !== App.CONFIG.VERSIONES_GENERADOR[tipo.id]) errs.push('versión distinta de la configurada');
    if (typeof ej.idCanonico !== 'string' || !ej.idCanonico || ej.idCanonico.length > 2000) errs.push('identificador no válido');
    if (!ej.enunciado || !ej.estimulo) errs.push('falta el enunciado o el estímulo');
    if (!Array.isArray(ej.opciones) || ej.opciones.length !== 4) return errs.concat('no hay 4 opciones');
    const idx = ej.opcionCorrectaIndex;
    if (!(idx >= 0 && idx < 4) || !ej.opciones[idx].esCorrecta || ej.opciones.filter(function (o) { return o.esCorrecta; }).length !== 1) errs.push('la correcta no está bien marcada');
    const claves = ej.opciones.map(clave);
    if (claves.some(function (k) { return !k; })) errs.push('opción vacía');
    if (new Set(claves).size !== 4) errs.push('opciones repetidas');
    if (ej.opciones.some(function (o, i) { return i !== idx && (typeof o.errorEtiqueta !== 'string' || !o.errorEtiqueta); })) errs.push('distractora sin explicación del error');

    // El solucionador recibe una copia sin marcas: solo lo que ve la persona.
    const limpio = {
      estimulo: JSON.parse(JSON.stringify(ej.estimulo)),
      opciones: ej.opciones.map(function (o) { return o.fig ? { fig: JSON.parse(JSON.stringify(o.fig)) } : { texto: o.texto }; }),
      opcionCorrectaIndex: idx
    };
    let r;
    try { r = tipo.solucionadorFn(limpio); } catch (e) { r = { valido: false, motivo: 'el solucionador falló: ' + e.message }; }
    if (!r || !r.valido) errs.push('solución no única o distinta de la marcada: ' + (r && r.motivo));

    const ex = ej.explicacion || {};
    if (['datos', 'regla', 'pasos', 'respuesta'].some(function (k) { return typeof ex[k] !== 'string' || !ex[k].trim(); })) errs.push('explicación incompleta');
    else if (ex.respuesta.indexOf('Opción ' + (idx + 1) + ':') !== 0) errs.push('la explicación no cita la opción correcta');

    const param = comprobarParametros(tipo.id, nivel, ej);
    if (param) errs.push('parámetros: ' + param);

    if (ej.opciones[0].fig) {
      const figs = figurasDelEstimulo(ej.estimulo).concat(ej.opciones.map(function (o) { return o.fig; }));
      if (!figs.every(figuraEnDominio)) errs.push('figura con valores fuera de rango');
      const fijos = atributosFijos(ej.estimulo);
      const pista = fijos.atributos.filter(function (a) { return ej.opciones.some(function (o) { return vf(o.fig, a) !== vf(fijos.referencia, a); }); });
      if (pista.length) errs.push('una opción cambia un atributo que el enunciado muestra fijo (' + pista.join(', ') + ')');
    } else {
      const valores = ej.opciones.map(function (o) { return o.valor; });
      const correcto = valores[idx];
      if (!valores.every(function (v) { return Number.isFinite(v) && dosDecimales(v); })) errs.push('valor no finito o con más de 2 decimales');
      if (esEntero(correcto) && !valores.every(esEntero)) errs.push('respuesta entera con distractoras decimales');
      if (correcto > 0 && !valores.every(function (v) { return v > 0; })) errs.push('distractora negativa o cero');
    }
    return errs;
  }

  // ------------------------------------------------------------ 2. atajos sin razonar

  function atajosFiguras(ej) {
    const ops = ej.opciones.map(function (o) { return o.fig; });
    const c = ej.opcionCorrectaIndex;
    const res = {};
    const puntos = ops.map(function (f) {
      return ATRS_FIGURA.reduce(function (s, a) { return s + ops.filter(function (g) { return vf(g, a) === vf(f, a); }).length; }, 0);
    });
    res['votar el valor más repetido'] = credito(argExtremo(puntos, true), c);
    res['elegir la figura más distinta'] = credito(argExtremo(puntos, false), c);
    ATRS_NUMERICOS.forEach(function (a) {
      const v = ops.map(function (f) { return f[a]; });
      res['mayor ' + a] = credito(argExtremo(v, true), c);
      res['menor ' + a] = credito(argExtremo(v, false), c);
    });
    const delEstimulo = {};
    figurasDelEstimulo(ej.estimulo).forEach(function (f) { delEstimulo[App.Logico.firma(f)] = true; });
    const noCopias = [];
    ops.forEach(function (f, i) { if (!delEstimulo[App.Logico.firma(f)]) noCopias.push(i); });
    res['descartar copias de figuras del enunciado'] = credito(noCopias.length ? noCopias : [0, 1, 2, 3], c);
    return res;
  }

  function atajosNumericos(ej) {
    const v = ej.opciones.map(function (o) { return o.valor; });
    const c = ej.opcionCorrectaIndex;
    const orden = v.map(function (x, i) { return i; }).sort(function (a, b) { return v[a] - v[b]; });
    const media = v.reduce(function (s, x) { return s + x; }, 0) / 4;
    const res = {};
    res['la menor'] = credito([orden[0]], c);
    res['la segunda menor'] = credito([orden[1]], c);
    res['la segunda mayor'] = credito([orden[2]], c);
    res['la mayor'] = credito([orden[3]], c);
    res['la más cercana a la media'] = credito(argExtremo(v.map(function (x) { return -Math.abs(x - media); }), true), c);
    function unica(pred) {
      const si = [];
      const no = [];
      v.forEach(function (x, i) { (pred(x) ? si : no).push(i); });
      if (si.length === 1) return si;
      if (no.length === 1) return no;
      return [0, 1, 2, 3];
    }
    res['la única con distinta paridad'] = credito(v.every(esEntero) ? unica(function (x) { return Math.round(x) % 2 === 0; }) : [0, 1, 2, 3], c);
    res['la única entera o decimal'] = credito(unica(esEntero), c);
    const redondas = [];
    v.forEach(function (x, i) { if (esEntero(x / 5)) redondas.push(i); });
    res['las redondas (múltiplos de 5)'] = credito(redondas.length && redondas.length < 4 ? redondas : [0, 1, 2, 3], c);
    return res;
  }

  // ------------------------------------------------------------ claves para identificadores canónicos

  function claveEstimulo(ej) {
    const e = ej.estimulo;
    const f = App.Logico.firma;
    if (e.tipo === 'serie_figuras') return e.figuras.map(f).join(';');
    if (e.tipo === 'matriz') return e.celdas.map(function (x) { return x ? f(x) : '?'; }).join(';');
    if (e.tipo === 'analogia') return [e.a, e.b, e.c].map(f).join(';');
    if (e.tipo === 'serie_numerica') return e.terminos.join(',');
    return e.texto;
  }

  // ------------------------------------------------------------ construcción de la batería

  function crearInforme() { return { total: 0, superadas: 0, fallidas: 0, resultados: [], tabla: '', datos: {} }; }

  function registrar(inf, nombre, ok, detalle) {
    inf.total++;
    if (ok) inf.superadas++; else inf.fallidas++;
    inf.resultados.push({ nombre: nombre, ok: !!ok, detalle: detalle || '' });
  }

  /** Analiza N ejercicios de un tipo y nivel y acumula los datos. */
  function analizarTipoNivel(inf, tipo, nivel, N) {
    const d = inf.datos[tipo.id] || (inf.datos[tipo.id] = { niveles: [], fallos: [], idAClave: {}, claveAId: {}, conflictosId: [], posiciones: [0, 0, 0, 0], atajos: {}, n: 0, deterministas: true, errorDeterminismo: '' });
    const nd = { ids: new Set(), atajos: {}, n: 0, fallos: 0 };
    d.niveles[nivel] = nd;
    for (let s = 1; s <= N; s++) {
      const semilla = 'diag-' + tipo.id + '-' + nivel + '-' + s;
      let ej;
      try { ej = tipo.generadorFn(nivel, semilla); } catch (e) { nd.fallos++; if (d.fallos.length < 5) d.fallos.push('nivel ' + nivel + ', semilla ' + semilla + ': ' + e.message); continue; }
      const errs = comprobarEjercicio(tipo, nivel, ej);
      if (errs.length) { nd.fallos++; if (d.fallos.length < 5) d.fallos.push('nivel ' + nivel + ', semilla ' + semilla + ': ' + errs.join('; ')); }
      nd.n++; d.n++;
      nd.ids.add(ej.idCanonico);
      d.posiciones[ej.opcionCorrectaIndex]++;
      const at = ej.opciones[0].fig ? atajosFiguras(ej) : atajosNumericos(ej);
      Object.keys(at).forEach(function (k) { nd.atajos[k] = (nd.atajos[k] || 0) + at[k]; d.atajos[k] = (d.atajos[k] || 0) + at[k]; });
      const ce = claveEstimulo(ej);
      const correcta = clave(ej.opciones[ej.opcionCorrectaIndex]);
      const prev = d.idAClave[ej.idCanonico];
      if (prev === undefined) d.idAClave[ej.idCanonico] = ce + '=>' + correcta;
      else if (prev !== ce + '=>' + correcta && d.conflictosId.length < 3) d.conflictosId.push('mismo identificador para ejercicios distintos: ' + ej.idCanonico);
      // El nivel forma parte del identificador (lo ya visto se cuenta por tipo y nivel).
      const prevId = d.claveAId[nivel + '#' + ce];
      if (prevId === undefined) d.claveAId[nivel + '#' + ce] = ej.idCanonico;
      else if (prevId !== ej.idCanonico && d.conflictosId.length < 3) d.conflictosId.push('el mismo ejercicio con dos identificadores: ' + prevId + ' / ' + ej.idCanonico);
      if (s <= 5) {
        let otro;
        try { otro = tipo.generadorFn(nivel, semilla); } catch (e) { otro = null; }
        if (!otro || JSON.stringify(otro) !== JSON.stringify(ej)) { d.deterministas = false; d.errorDeterminismo = 'nivel ' + nivel + ', semilla ' + semilla; }
      }
    }
  }

  function resumirTipo(inf, tipo, N) {
    const d = inf.datos[tipo.id];
    const total = d.niveles.reduce(function (s, nd) { return s + nd.n + nd.fallos; }, 0);
    const conFallo = d.niveles.reduce(function (s, nd) { return s + nd.fallos; }, 0);
    registrar(inf, tipo.nombre + ': ejercicios correctos', conFallo === 0, conFallo === 0 ? total + ' ejercicios de los niveles 0–10 con solución única y parámetros de la tabla' : conFallo + ' de ' + total + ' con problemas. ' + d.fallos.join(' | '));

    // Atajos: por tipo (todos los niveles) y por nivel con margen para el ruido del muestreo.
    const umbralNivel = Math.max(0.40, 0.25 + 4 * Math.sqrt(0.1875 / Math.max(1, N)));
    let peorTipo = { k: '', v: 0 };
    Object.keys(d.atajos).forEach(function (k) { const v = d.atajos[k] / d.n; if (v > peorTipo.v) peorTipo = { k: k, v: v }; });
    let peorNivel = { k: '', v: 0, nivel: -1 };
    d.niveles.forEach(function (nd, nivel) {
      Object.keys(nd.atajos).forEach(function (k) { const v = nd.atajos[k] / Math.max(1, nd.n); if (v > peorNivel.v) peorNivel = { k: k, v: v, nivel: nivel }; });
    });
    const okAtajos = peorTipo.v <= UMBRAL_ATAJO_TIPO && peorNivel.v <= umbralNivel;
    registrar(inf, tipo.nombre + ': los atajos sin razonar no funcionan', okAtajos,
      'Mejor atajo en conjunto: «' + peorTipo.k + '» acierta el ' + pct(peorTipo.v) + ' (máximo ' + pct(UMBRAL_ATAJO_TIPO) + '; al azar, 25 %). Peor nivel: ' + peorNivel.nivel + ', «' + peorNivel.k + '» ' + pct(peorNivel.v) + ' (máximo ' + pct(umbralNivel) + ').');

    const margen = Math.max(0.04, 4 * Math.sqrt(0.1875 / Math.max(1, d.n)));
    const reparto = d.posiciones.map(function (p) { return p / Math.max(1, d.n); });
    registrar(inf, tipo.nombre + ': la correcta aparece en cualquier posición', reparto.every(function (p) { return Math.abs(p - 0.25) <= margen; }),
      'Posiciones 1–4: ' + reparto.map(pct).join(', ') + '.');
    registrar(inf, tipo.nombre + ': misma semilla, mismo ejercicio', d.deterministas, d.deterministas ? '' : 'Difiere en ' + d.errorDeterminismo);
    registrar(inf, tipo.nombre + ': identificadores canónicos', d.conflictosId.length === 0, d.conflictosId.join(' | '));
  }

  function tablaResumen(inf, tipos, N) {
    const lineas = ['Ejercicios distintos por cada ' + N + ' generados (niveles 0–10) y mejor atajo por nivel:', ''];
    tipos.forEach(function (tipo) {
      const d = inf.datos[tipo.id];
      if (!d) return;
      lineas.push(tipo.nombre);
      lineas.push('  distintos: ' + d.niveles.map(function (nd) { return nd.ids.size; }).join(' · '));
      lineas.push('  atajo máx.: ' + d.niveles.map(function (nd) {
        let m = 0;
        Object.keys(nd.atajos).forEach(function (k) { m = Math.max(m, nd.atajos[k] / Math.max(1, nd.n)); });
        return Math.round(m * 100) + '%';
      }).join(' · '));
    });
    return lineas.join('\n');
  }

  // ------------------------------------------------------------ 4. regresiones

  function claveCorrecta(ej) { return clave(ej.opciones[ej.opcionCorrectaIndex]); }

  /** Genera la tabla de regresiones (la usa pruebas/ejecutar.js --regresiones). */
  function crearRegresiones(porNivel) {
    const tabla = {};
    listaTipos().forEach(function (tipo) {
      for (let nivel = 0; nivel <= 10; nivel++) {
        const lista = [];
        for (let k = 1; k <= (porNivel || 3); k++) {
          const semilla = 'reg-' + tipo.id + '-' + nivel + '-' + k;
          const ej = tipo.generadorFn(nivel, semilla);
          lista.push({ semilla: semilla, idCanonico: ej.idCanonico, opcionCorrectaIndex: ej.opcionCorrectaIndex, correcta: claveCorrecta(ej) });
        }
        tabla[tipo.id + '|' + nivel] = lista;
      }
    });
    return tabla;
  }

  function pruebaRegresiones(inf) {
    const tabla = App.REGRESIONES;
    if (!tabla || typeof tabla !== 'object') { registrar(inf, 'Regresiones (semillas fijas)', false, 'No se encontró pruebas/regresiones.js.'); return; }
    let total = 0;
    const fallos = [];
    Object.keys(tabla).forEach(function (k) {
      const partes = k.split('|');
      const tipo = App.Registro.obtenerTipo(partes[0]);
      const nivel = Number(partes[1]);
      tabla[k].forEach(function (r) {
        total++;
        if (!tipo) { fallos.push(k + ': tipo desconocido'); return; }
        try {
          const ej = tipo.generadorFn(nivel, r.semilla);
          if (ej.idCanonico !== r.idCanonico || ej.opcionCorrectaIndex !== r.opcionCorrectaIndex || claveCorrecta(ej) !== r.correcta) fallos.push(k + ' semilla ' + r.semilla);
        } catch (e) { fallos.push(k + ': ' + e.message); }
      });
    });
    registrar(inf, 'Regresiones (semillas fijas)', fallos.length === 0 && total > 0,
      fallos.length ? fallos.length + ' de ' + total + ' han cambiado (si cambiaste un generador a propósito, sube su versión y regenera el archivo): ' + fallos.slice(0, 3).join(' | ') : total + ' ejercicios idénticos a los guardados.');
  }

  // ------------------------------------------------------------ 5. prueba de nivel simulada

  function pruebaNivelacion(inf) {
    const azar = App.Azar.CrearInstancia('simulacion-nivelacion');
    const N = 10000;
    let bajos = 0;
    let suma = 0;
    for (let i = 0; i < N; i++) {
      const nivel = App.Sesion.simularNivelacion('azar', azar.siguiente);
      if (nivel <= 1) bajos++;
      suma += nivel;
    }
    let perfectos = 0;
    for (let j = 0; j < N; j++) if (App.Sesion.simularNivelacion('perfecto') === 10) perfectos++;
    registrar(inf, 'Prueba de nivel: quien responde al azar acaba abajo', bajos / N >= 0.9,
      pct(bajos / N) + ' de ' + N + ' simulaciones acaban en nivel 0 o 1 (nivel medio ' + (suma / N).toFixed(2).replace('.', ',') + ').');
    registrar(inf, 'Prueba de nivel: quien acierta todo llega al 10', perfectos === N, pct(perfectos / N) + ' de ' + N + ' simulaciones.');
    // Recorrido real con la sesión: 15 aciertos.
    const s = App.Sesion.crearSesionNivelacion('numerico', []);
    let fin = null;
    for (let k = 0; k < 15 && !fin; k++) { const r = App.Sesion.responderNivelacion(s, true, []); if (r.terminada) fin = r; }
    registrar(inf, 'Prueba de nivel: 5 bloques de 3 preguntas', !!fin && s.historialAjustes.length === 5 && s.nivelActualProcesado === 10, fin ? 'Nivel final ' + s.nivelActualProcesado + ' tras ' + s.historialAjustes.length + ' bloques.' : 'No terminó en 15 respuestas.');
  }

  // ------------------------------------------------------------ 6. almacenamiento con datos simulados

  function estadoDePrueba(nPreguntas) {
    const e = App.Almacen.obtenerEstadoInicial();
    e.progresoAreas.logico.nivelActual = 6;
    e.progresoAreas.logico.nivelInicialEstimado = 4;
    e.historialSesiones.push({ idSesion: 's1', areaId: 'logico', nivel: 6, numeroPreguntas: 12, versionGeneradores: App.Sesion.versionesArea('logico'), aciertos: 9, errores: 2, omitidas: 1, tiemposAgotados: 0, tiempoTotalMs: 300000, completada: true, esNivelacion: false, timestamp: 1700000000000 });
    for (let i = 0; i < nPreguntas; i++) e.historialPreguntas.push({ idCanonico: 'figuras_series|v3|n6|prueba' + i, tipoId: 'figuras_series', nivel: 6, esAcierto: i % 2 === 0, tiempoMs: 1000 + i, timestamp: 1700000000000 + i });
    return e;
  }

  function pruebasAlmacen(inf) {
    const A = App.Almacen;
    const CLAVE = A.CLAVE;
    function caso(nombre, fn) {
      let ok = false;
      let detalle = '';
      try { const r = fn(); ok = r === true || (r && r.ok); detalle = r && r.detalle ? r.detalle : ''; } catch (e) { ok = false; detalle = 'Excepción: ' + e.message; }
      registrar(inf, 'Almacenamiento: ' + nombre, ok, detalle);
    }
    try {
      caso('guardar y recuperar', function () {
        A.establecerStorageMock(A.crearStorageMock());
        const e = estadoDePrueba(10);
        if (!A.guardarEstado(e)) return false;
        const l = A.cargarEstado();
        return l.progresoAreas.logico.nivelActual === 6 && l.historialPreguntas.length === 10 && l.historialSesiones.length === 1;
      });
      caso('conserva solo las últimas ' + App.CONFIG.MAX_HISTORIAL_PREGUNTAS + ' respuestas', function () {
        A.establecerStorageMock(A.crearStorageMock());
        A.guardarEstado(estadoDePrueba(App.CONFIG.MAX_HISTORIAL_PREGUNTAS + 50));
        const l = A.cargarEstado();
        return l.historialPreguntas.length === App.CONFIG.MAX_HISTORIAL_PREGUNTAS && l.historialPreguntas[0].idCanonico === 'figuras_series|v3|n6|prueba50';
      });
      caso('cuota llena: se conserva el estado anterior', function () {
        const pequeno = JSON.stringify(A.obtenerEstadoInicial()).length;
        const mock = A.crearStorageMock({ cuotaBytes: pequeno + 2000 });
        A.establecerStorageMock(mock);
        if (!A.guardarEstado(A.obtenerEstadoInicial())) return { ok: false, detalle: 'No guardó el estado pequeño.' };
        const antes = mock.leer(CLAVE);
        const r = A.guardarEstado(estadoDePrueba(250));
        return { ok: r === false && mock.leer(CLAVE) === antes && !!A.ultimoError(), detalle: r ? 'Guardó por encima de la cuota.' : '' };
      });
      caso('el navegador rechaza guardar', function () {
        const mock = A.crearStorageMock({ inicial: { psicotec: JSON.stringify(estadoDePrueba(3)) }, fallaAlGuardar: true });
        A.establecerStorageMock(mock);
        const antes = mock.leer(CLAVE);
        return A.guardarEstado(estadoDePrueba(4)) === false && mock.leer(CLAVE) === antes;
      });
      caso('almacenamiento no disponible', function () {
        A.establecerStorageMock(A.crearStorageMock({ noDisponible: true }));
        const l = A.cargarEstado();
        return l.historialSesiones.length === 0 && A.guardarEstado(l) === false;
      });
      caso('datos dañados no bloquean la app', function () {
        A.establecerStorageMock(A.crearStorageMock({ inicial: { psicotec: '{esto no es json' } }));
        const l = A.cargarEstado();
        return l.formato === App.CONFIG.VERSION_FORMATO_STORAGE && l.historialSesiones.length === 0;
      });
      caso('datos de otra versión: no se sobrescriben', function () {
        const crudo = JSON.stringify({ formato: 99, progresoAreas: {} });
        const mock = A.crearStorageMock({ inicial: { psicotec: crudo } });
        A.establecerStorageMock(mock);
        return A.formatoIncompatible() === 99 && A.guardarEstado(A.obtenerEstadoInicial()) === false && mock.leer(CLAVE) === crudo;
      });
      caso('importar una copia válida y deshacer', function () {
        const origen = estadoDePrueba(20);
        const contenido = App.Datos.prepararCopia(origen).contenido;
        const actual = A.obtenerEstadoInicial();
        actual.progresoAreas.numerico.nivelActual = 2;
        A.establecerStorageMock(A.crearStorageMock({ inicial: { psicotec: JSON.stringify(actual) } }));
        const r = App.Datos.importarDatos(contenido);
        const tras = A.cargarEstado();
        if (!r.exito || tras.progresoAreas.logico.nivelActual !== 6 || tras.historialPreguntas.length !== 20 || !tras.copiaSeguridadDeshacer) return { ok: false, detalle: r.mensaje };
        const d = App.Datos.deshacerImportacion();
        const vuelta = A.cargarEstado();
        return { ok: d.exito && vuelta.progresoAreas.numerico.nivelActual === 2 && vuelta.historialPreguntas.length === 0 && !vuelta.copiaSeguridadDeshacer, detalle: d.mensaje };
      });
      caso('importar un archivo dañado no cambia nada', function () {
        const mock = A.crearStorageMock({ inicial: { psicotec: JSON.stringify(estadoDePrueba(5)) } });
        A.establecerStorageMock(mock);
        const antes = mock.leer(CLAVE);
        const r1 = App.Datos.importarDatos('{"formato": 1, "progresoAreas": ');
        const r2 = App.Datos.importarDatos(JSON.stringify({ formato: 7, progresoAreas: {}, historialSesiones: [], historialPreguntas: [] }));
        const malo = JSON.parse(App.Datos.prepararCopia(estadoDePrueba(2)).contenido);
        malo.progresoAreas.logico.nivelActual = 11;
        const r3 = App.Datos.importarDatos(JSON.stringify(malo));
        const malo2 = JSON.parse(App.Datos.prepararCopia(estadoDePrueba(2)).contenido);
        malo2.historialPreguntas[0].tipoId = '<img src=x onerror=alert(1)>';
        const r4 = App.Datos.importarDatos(JSON.stringify(malo2));
        return { ok: !r1.exito && !r2.exito && !r3.exito && !r4.exito && mock.leer(CLAVE) === antes, detalle: [r1, r2, r3, r4].filter(function (r) { return r.exito; }).length + ' archivos no válidos aceptados.' };
      });
      caso('nunca importa una sesión a medias', function () {
        const e = estadoDePrueba(2);
        const copia = JSON.parse(JSON.stringify(e));
        copia.progresoAreas.logico.sesionEnCurso = { idSesion: 'x', preguntas: [] };
        A.establecerStorageMock(A.crearStorageMock());
        const r = App.Datos.importarDatos(JSON.stringify(copia));
        return r.exito && A.cargarEstado().progresoAreas.logico.sesionEnCurso === null;
      });
      caso('borrar solo elimina la clave «psicotec»', function () {
        const mock = A.crearStorageMock({ inicial: { 'otra-web': 'sus datos', psicotec: JSON.stringify(estadoDePrueba(1)) } });
        A.establecerStorageMock(mock);
        A.borrarEstado();
        return mock.leer(CLAVE) === undefined && mock.leer('otra-web') === 'sus datos';
      });
      caso('la copia exportada no incluye sesiones a medias ni la copia de deshacer', function () {
        const e = estadoDePrueba(2);
        e.progresoAreas.numerico.sesionEnCurso = { idSesion: 'y' };
        e.copiaSeguridadDeshacer = estadoDePrueba(1);
        const c = JSON.parse(App.Datos.prepararCopia(e).contenido);
        return c.progresoAreas.numerico.sesionEnCurso === null && c.copiaSeguridadDeshacer === null && App.Datos.validarObjetoImportado(c).valido;
      });
      caso('recordatorio de exportar', function () {
        const e = A.obtenerEstadoInicial();
        const sinSesiones = App.Datos.verificarRecomendacionExportar(e);
        e.historialSesiones.push(estadoDePrueba(0).historialSesiones[0]);
        const unaSinCopia = App.Datos.verificarRecomendacionExportar(e);
        e.ultimaExportacionTimestamp = Date.now();
        e.numSesionesEnUltimaExportacion = 1;
        const recienExportado = App.Datos.verificarRecomendacionExportar(e);
        return sinSesiones === false && unaSinCopia === true && recienExportado === false;
      });
    } finally {
      // Vuelve al almacenamiento real del navegador (o a la memoria en Node).
      A.reiniciarDeteccion();
    }
  }

  // ------------------------------------------------------------ 7. casos límite

  function pruebasLimite(inf) {
    const A = App.Almacen;
    function caso(nombre, fn) {
      let ok = false;
      let detalle = '';
      try { const r = fn(); ok = r === true || (r && r.ok); detalle = r && r.detalle ? r.detalle : ''; } catch (e) { detalle = 'Excepción: ' + e.message; }
      registrar(inf, 'Casos límite: ' + nombre, ok, detalle);
    }
    function sesionRespondida(areaId, nivel, modo) {
      const s = App.Sesion.crearSesion(areaId, nivel, []);
      s.preguntas.forEach(function (ref) {
        const ej = App.Sesion.obtenerEjercicio(ref);
        const elegida = modo === 'acierta' ? ej.opcionCorrectaIndex : modo === 'falla' ? (ej.opcionCorrectaIndex + 1) % 4 : null;
        s.respuestas.push({ idCanonico: ej.idCanonico, tipoId: ej.tipoId, nivel: ej.nivel, opcionElegida: elegida, esAcierto: modo === 'acierta', esOmitida: modo === 'omite', esTiempoAgotado: modo === 'tiempo', tiempoMs: 5000 });
      });
      return s;
    }
    try {
      A.establecerStorageMock(A.crearStorageMock());
      caso('sesión de 12 preguntas sin repetir tipo seguido (niveles 0 y 10)', function () {
        let ok = true;
        [0, 10].forEach(function (nivel) {
          ['logico', 'numerico'].forEach(function (area) {
            const s = App.Sesion.crearSesion(area, nivel, []);
            if (s.preguntas.length !== 12) ok = false;
            for (let i = 1; i < s.preguntas.length; i++) if (s.preguntas[i].tipoId === s.preguntas[i - 1].tipoId) ok = false;
            const ids = new Set(s.preguntas.map(function (r) { return r.idCanonico; }));
            if (ids.size !== 12) ok = false;
          });
        });
        return ok;
      });
      caso('orden por rondas en 1.000 sesiones', function () {
        const azar = App.Azar.CrearInstancia('rondas');
        for (let k = 0; k < 1000; k++) {
          const porTipo = { a: [1, 2, 3, 4], b: [5, 6, 7, 8], c: [9, 10, 11, 12] };
          const orden = App.Sesion.ordenarPorRondas({ a: porTipo.a.map(function (x) { return { t: 'a', x: x }; }), b: porTipo.b.map(function (x) { return { t: 'b', x: x }; }), c: porTipo.c.map(function (x) { return { t: 'c', x: x }; }) }, azar);
          for (let i = 1; i < orden.length; i++) if (orden[i].t === orden[i - 1].t) return false;
          if (orden.length !== 12) return false;
        }
        return true;
      });
      caso('todo omitido: 0 aciertos, nota 0', function () {
        const st = App.Resultados.calcularResultadosSesion(sesionRespondida('logico', 3, 'omite'));
        return st.aciertos === 0 && st.errores === 0 && st.omitidas === 12 && st.notaOposicion === 0;
      });
      caso('tiempo agotado en todas: no resta', function () {
        const st = App.Resultados.calcularResultadosSesion(sesionRespondida('numerico', 3, 'tiempo'));
        return st.tiemposAgotados === 12 && st.errores === 0 && st.notaOposicion === 0;
      });
      caso('todo fallado: nota −4', function () {
        const st = App.Resultados.calcularResultadosSesion(sesionRespondida('numerico', 5, 'falla'));
        return st.errores === 12 && st.notaOposicion === -4;
      });
      caso('todo acertado: 12 de 12', function () {
        const st = App.Resultados.calcularResultadosSesion(sesionRespondida('logico', 10, 'acierta'));
        return st.aciertos === 12 && st.notaOposicion === 12 && st.porcentajeAciertos === 100;
      });
      caso('sube con 9 o más en dos sesiones seguidas del mismo nivel', function () {
        const ses = function (nivel, aciertos) { return { completada: true, esNivelacion: false, nivel: nivel, aciertos: aciertos }; };
        const E = App.Sesion.evaluarEvolucionNivel;
        const sube = E([ses(4, 9), ses(4, 11)], 4);
        const baja = E([ses(4, 6), ses(4, 2)], 4);
        const mantiene = E([ses(4, 9), ses(4, 8)], 4);
        const otroNivel = E([ses(3, 12), ses(4, 12)], 4);
        const techo = E([ses(10, 12), ses(10, 12)], 10);
        const suelo = E([ses(0, 0), ses(0, 0)], 0);
        const una = E([ses(4, 12)], 4);
        const ok = sube.cambio === 'sube' && sube.nuevoNivel === 5 && baja.cambio === 'baja' && baja.nuevoNivel === 3 && mantiene.cambio === 'mantiene' &&
          otroNivel.cambio === 'mantiene' && techo.nuevoNivel === 10 && suelo.nuevoNivel === 0 && una.cambio === 'mantiene';
        return { ok: ok, detalle: ok ? 'Sube, baja y se mantiene según la regla (también en los niveles 0 y 10).' : 'La regla de evolución no se cumple.' };
      });
      caso('fin de sesión: guarda resumen, respuestas y nivel', function () {
        const e = A.obtenerEstadoInicial();
        e.progresoAreas.logico.nivelActual = 4;
        e.historialSesiones.push({ idSesion: 'p', areaId: 'logico', nivel: 4, numeroPreguntas: 12, versionGeneradores: {}, aciertos: 10, errores: 2, omitidas: 0, tiemposAgotados: 0, tiempoTotalMs: 1, completada: true, esNivelacion: false, timestamp: 1 });
        const s = sesionRespondida('logico', 4, 'acierta');
        const fin = App.Sesion.finalizarSesion(e, s);
        return fin.evolucion.cambio === 'sube' && e.progresoAreas.logico.nivelActual === 5 && e.historialPreguntas.length === 12 && e.progresoAreas.logico.sesionEnCurso === null;
      });
      caso('ejercicios agotados: se repite y se avisa', function () {
        const tipo = App.Registro.obtenerTipo('num_operaciones');
        const original = tipo.generadorFn;
        const fijo = original(0, 'unico');
        tipo.generadorFn = function (nivel) { return original(nivel, 'unico'); };
        try {
          const sel = App.Seleccion.seleccionarEjercicio('num_operaciones', 0, new Set([fijo.idCanonico]));
          return sel.esRepeticion === true && sel.ejercicio.idCanonico === fijo.idCanonico;
        } finally { tipo.generadorFn = original; }
      });
      caso('evita ejercicios ya vistos', function () {
        const vistos = new Set();
        for (let i = 0; i < 30; i++) {
          const sel = App.Seleccion.seleccionarEjercicio('figuras_series', 5, vistos);
          if (sel.esRepeticion) return { ok: false, detalle: 'Repitió en el intento ' + (i + 1) + '.' };
          vistos.add(sel.ejercicio.idCanonico);
        }
        return true;
      });
      caso('sesión abandonada más de 24 h: se archiva como incompleta', function () {
        const e = A.obtenerEstadoInicial();
        const s = App.Sesion.crearSesion('numerico', 2, []);
        s.ultimaActividadTimestamp = Date.now() - 25 * 3600 * 1000;
        e.progresoAreas.numerico.sesionEnCurso = s;
        const cambio = App.Sesion.archivarSesionesPendientes(e, Date.now());
        const ultima = e.historialSesiones[e.historialSesiones.length - 1];
        return cambio && e.progresoAreas.numerico.sesionEnCurso === null && ultima.completada === false;
      });
      caso('sesión creada con otra versión de los ejercicios: se archiva', function () {
        const e = A.obtenerEstadoInicial();
        const s = App.Sesion.crearSesion('logico', 2, []);
        s.preguntas[0].version = 1;
        e.progresoAreas.logico.sesionEnCurso = s;
        return App.Sesion.archivarSesionesPendientes(e, Date.now()) && e.progresoAreas.logico.sesionEnCurso === null;
      });
      caso('la gráfica solo une sesiones comparables', function () {
        const v = App.Sesion.versionesArea('logico');
        const ses = function (nivel, n, ver) { return { completada: true, esNivelacion: false, areaId: 'logico', nivel: nivel, numeroPreguntas: n, versionGeneradores: ver, aciertos: 8, timestamp: 1 }; };
        const lista = [ses(4, 12, v), ses(4, 12, v), ses(5, 12, v), ses(4, 10, v), ses(4, 12, { figuras_series: 1 })];
        return App.Resultados.sesionesComparables(lista, 'logico', 4).length === 2 && App.Resultados.generarGraficoEvolucionSVG(lista, 'logico', 4).svg !== null && App.Resultados.generarGraficoEvolucionSVG(lista, 'logico', 5).svg === null;
      });
    } finally {
      A.reiniciarDeteccion();
    }
  }

  // ------------------------------------------------------------ ejecución

  function construirTareas(opts) {
    const N = Math.max(10, Math.min(2000, Number(opts && opts.muestras) || 200));
    const tipos = listaTipos();
    const tareas = [];
    tipos.forEach(function (tipo) {
      for (let nivel = 0; nivel <= 10; nivel++) {
        tareas.push((function (t, n) { return function (inf) { analizarTipoNivel(inf, t, n, N); }; })(tipo, nivel));
      }
      tareas.push(function (inf) { resumirTipo(inf, tipo, N); });
    });
    tareas.push(pruebaRegresiones);
    tareas.push(pruebaNivelacion);
    tareas.push(pruebasAlmacen);
    tareas.push(pruebasLimite);
    tareas.push(function (inf) { inf.tabla = tablaResumen(inf, tipos, N); });
    return tareas;
  }

  function limpiarInforme(inf) { delete inf.datos; return inf; }

  /** Ejecución síncrona (Node). */
  function ejecutar(opts) {
    const inf = crearInforme();
    construirTareas(opts).forEach(function (t) { t(inf); });
    if (opts && opts.conDatos) return inf;
    return limpiarInforme(inf);
  }

  /** Ejecución por partes para no bloquear el navegador. */
  function ejecutarAsincrono(opts, onProgreso, onFin) {
    const inf = crearInforme();
    const tareas = construirTareas(opts);
    let i = 0;
    function paso() {
      const limite = Date.now() + 40;
      while (i < tareas.length && Date.now() < limite) {
        try { tareas[i](inf); } catch (e) { registrar(inf, 'Tarea ' + (i + 1), false, 'Excepción: ' + e.message); }
        i++;
      }
      if (onProgreso) onProgreso(Math.round((i / tareas.length) * 100));
      if (i < tareas.length) setTimeout(paso, 0);
      else if (onFin) onFin(limpiarInforme(inf));
    }
    setTimeout(paso, 0);
  }

  /** Carga pruebas/regresiones.js en el navegador; llama a cb aunque falle. */
  function cargarRegresiones(cb) {
    if (App.REGRESIONES || typeof document === 'undefined') { cb(); return; }
    const s = document.createElement('script');
    s.src = 'pruebas/regresiones.js';
    s.onload = function () { cb(); };
    s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }

  return {
    ejecutar: ejecutar,
    ejecutarAsincrono: ejecutarAsincrono,
    cargarRegresiones: cargarRegresiones,
    crearRegresiones: crearRegresiones,
    comprobarEjercicio: comprobarEjercicio
  };
})();
