/**
 * ui.js - Vistas, accesibilidad, teclado y dibujo de figuras en SVG.
 * Todo el texto se inserta con textContent. Solo el SVG de las figuras se genera como cadena,
 * y únicamente a partir de números internos del generador (nunca de datos importados).
 * Objeto global: App.UI
 */

window.App = window.App || {};

App.UI = (function () {
  let sesionActiva = null;
  let ultimaSesionTerminada = null;
  let mensajePendiente = null;
  let contadorSvg = 0;
  let manejadorTeclado = null;

  // ------------------------------------------------------------ utilidades DOM

  function el(tag, opciones, hijos) {
    const nodo = document.createElement(tag);
    const o = opciones || {};
    if (o.clase) nodo.className = o.clase;
    if (o.texto !== undefined && o.texto !== null) nodo.textContent = o.texto;
    if (o.attrs) Object.keys(o.attrs).forEach(function (k) { nodo.setAttribute(k, o.attrs[k]); });
    if (o.onclick) nodo.addEventListener('click', o.onclick);
    (hijos || []).forEach(function (h) { if (h) nodo.appendChild(h); });
    return nodo;
  }

  function boton(texto, clase, onclick, attrs) {
    return el('button', { clase: clase || 'btn', texto: texto, onclick: onclick, attrs: Object.assign({ type: 'button' }, attrs || {}) });
  }

  function raiz() { return document.getElementById('app-root'); }

  function quitarTeclado() {
    if (manejadorTeclado) { window.removeEventListener('keydown', manejadorTeclado); manejadorTeclado = null; }
  }

  function ponerTeclado(fn) {
    quitarTeclado();
    manejadorTeclado = fn;
    window.addEventListener('keydown', fn);
  }

  function formatoTiempo(ms) {
    const s = Math.round((ms || 0) / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function formatoSegundos(ms) {
    const s = (ms || 0) / 1000;
    return (s < 10 ? s.toFixed(1) : String(Math.round(s))).replace('.', ',') + ' s';
  }

  function textoNota(v) { return String(v).replace('.', ','); }

  function avisar(texto, tipo) { mensajePendiente = { texto: texto, tipo: tipo || 'info' }; }

  // ------------------------------------------------------------ cabecera y estructura

  function cabecera(subtitulo) {
    const marca = el('button', { clase: 'marca', attrs: { type: 'button', 'aria-label': 'PsicoTec: ir al inicio' }, onclick: function () { navegarA('inicio'); } }, [
      el('img', { clase: 'marca-icono', attrs: { src: 'icons/cerebro.svg', alt: '', width: '28', height: '28' } }),
      el('span', { clase: 'marca-nombre', texto: App.CONFIG.NOMBRE_APP })
    ]);
    const nav = el('nav', { clase: 'nav-principal', attrs: { 'aria-label': 'Secciones' } }, [
      boton('Historial', 'btn-enlace', function () { navegarA('historial'); }),
      boton('Datos', 'btn-enlace', function () { navegarA('datos'); }),
      boton('Privacidad', 'btn-enlace', function () { navegarA('privacidad'); })
    ]);
    const cab = el('header', { clase: 'app-header' }, [el('div', { clase: 'app-header-fila' }, [marca, nav])]);
    if (subtitulo) cab.appendChild(el('p', { clase: 'subtitulo', texto: subtitulo }));
    return cab;
  }

  function regionMensajes() {
    const zona = el('div', { clase: 'mensajes', attrs: { role: 'status', 'aria-live': 'polite' } });
    if (mensajePendiente) {
      zona.appendChild(el('p', { clase: 'mensaje mensaje-' + mensajePendiente.tipo, texto: mensajePendiente.texto }));
      mensajePendiente = null;
    }
    return zona;
  }

  function pieAvisos() {
    return el('footer', { clase: 'pie-aviso' }, [
      el('p', { texto: App.CONFIG.TEXTOS.AVISO_RESULTADOS }),
      el('p', { texto: App.CONFIG.TEXTOS.AVISO_EFECTO_PRACTICA }),
      el('p', { texto: App.CONFIG.TEXTOS.AVISO_NIVELES }),
      el('p', { clase: 'pie-version', texto: App.CONFIG.NOMBRE_APP + ' ' + App.CONFIG.VERSION_APP })
    ]);
  }

  function navegarA(vista, datos) {
    quitarTeclado();
    if (vista !== 'sesion' && vista !== 'nivelacion') { App.Tiempo.detener(); sesionActiva = null; }
    const cont = raiz();
    if (!cont) return;
    cont.innerHTML = '';
    const vistas = {
      inicio: vistaInicio, nivelacion: vistaNivelacion, sesion: vistaSesion, resultados: vistaResultados,
      revision: vistaRevision, historial: vistaHistorial, datos: vistaDatos, privacidad: vistaPrivacidad, diagnostico: vistaDiagnostico
    };
    (vistas[vista] || vistaInicio)(cont, datos || {});
    window.scrollTo(0, 0);
    const foco = cont.querySelector('[data-foco]') || cont.querySelector('h1, h2');
    if (foco) { if (!foco.hasAttribute('tabindex') && foco.tagName !== 'BUTTON') foco.setAttribute('tabindex', '-1'); foco.focus({ preventScroll: true }); }
  }

  // ------------------------------------------------------------ figuras SVG

  const RADIO_TAMANO = [14, 20, 26];
  const TINTA = '#1f2937';

  function puntosPoligono(lados, cx, cy, r) {
    const inicio = lados === 4 ? -Math.PI / 4 : -Math.PI / 2;
    const p = [];
    for (let i = 0; i < lados; i++) {
      const a = inicio + (i * 2 * Math.PI) / lados;
      p.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return p.join(' ');
  }

  /** SVG de una figura. La banderita superior gira y se refleja con la figura. */
  function svgFigura(fig, etiqueta) {
    const id = 'r' + (++contadorSvg);
    const cx = 50;
    const cy = 46;
    const r = RADIO_TAMANO[fig.tamano] || 20;
    let relleno = 'none';
    let defs = '';
    if (fig.relleno === 2) relleno = TINTA;
    if (fig.relleno === 1) {
      relleno = 'url(#' + id + ')';
      defs = '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="' + TINTA + '" stroke-width="2"/></pattern></defs>';
    }
    let forma;
    if (fig.forma === 0) forma = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"';
    else forma = '<polygon points="' + puntosPoligono(fig.forma + 2, cx, cy, r) + '"';
    forma += ' fill="' + relleno + '" stroke="' + TINTA + '" stroke-width="2.6" stroke-linejoin="round"/>';
    const yb = cy - r;
    const bandera = '<line x1="' + cx + '" y1="' + yb + '" x2="' + cx + '" y2="' + (yb - 10) + '" stroke="' + TINTA + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<polygon points="' + cx + ',' + (yb - 10) + ' ' + (cx + 9) + ',' + (yb - 7) + ' ' + cx + ',' + (yb - 4) + '" fill="' + TINTA + '"/>';
    const transformacion = 'rotate(' + (fig.giro * 45) + ' ' + cx + ' ' + cy + ')' + (fig.espejo ? ' translate(' + (2 * cx) + ' 0) scale(-1 1)' : '');
    let puntos = '';
    const n = fig.elementos;
    for (let i = 0; i < n; i++) {
      const fila = i < 4 ? 0 : 1;
      const enFila = fila === 0 ? Math.min(n, 4) : n - 4;
      const col = fila === 0 ? i : i - 4;
      const x = cx + (col - (enFila - 1) / 2) * 12;
      const y = 99 + fila * 12;
      puntos += '<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="4.2" fill="' + TINTA + '"/>';
    }
    const texto = etiqueta || App.Logico.describirFigura(fig);
    return '<svg class="figura" viewBox="10 6 80 112" role="img" aria-label="' + texto.replace(/"/g, '') + '" focusable="false">' + defs +
      '<g transform="' + transformacion + '">' + forma + bandera + '</g>' + puntos + '</svg>';
  }

  function cajaFigura(fig, etiquetaCaja) {
    const caja = el('div', { clase: 'caja-figura' });
    caja.innerHTML = svgFigura(fig);
    if (etiquetaCaja) caja.insertBefore(el('span', { clase: 'etiqueta-figura', texto: etiquetaCaja, attrs: { 'aria-hidden': 'true' } }), caja.firstChild);
    return caja;
  }

  function cajaIncognita(texto) {
    return el('div', { clase: 'caja-figura incognita', attrs: { 'aria-label': 'Figura que falta' } }, [el('span', { texto: texto || '?' })]);
  }

  // ------------------------------------------------------------ estímulo y opciones

  function renderEstimulo(ej) {
    const est = ej.estimulo;
    const caja = el('div', { clase: 'estimulo' });
    if (est.tipo === 'serie_figuras') {
      const fila = el('div', { clase: 'fila-figuras', attrs: { role: 'group', 'aria-label': 'Serie de ' + est.figuras.length + ' figuras' } });
      est.figuras.forEach(function (f) { fila.appendChild(cajaFigura(f)); });
      fila.appendChild(cajaIncognita());
      caja.appendChild(fila);
    } else if (est.tipo === 'matriz') {
      const grid = el('div', { clase: 'matriz', attrs: { role: 'group', 'aria-label': 'Matriz de 3 por 3 con la última casilla vacía' } });
      est.celdas.forEach(function (c) { grid.appendChild(c ? cajaFigura(c) : cajaIncognita()); });
      caja.appendChild(grid);
    } else if (est.tipo === 'analogia') {
      const fila = el('div', { clase: 'analogia', attrs: { role: 'group', 'aria-label': 'Analogía' } }, [
        el('div', { clase: 'par' }, [cajaFigura(est.a, 'A'), el('span', { clase: 'flecha', texto: '→', attrs: { 'aria-hidden': 'true' } }), cajaFigura(est.b, 'B')]),
        el('div', { clase: 'par' }, [cajaFigura(est.c, 'C'), el('span', { clase: 'flecha', texto: '→', attrs: { 'aria-hidden': 'true' } }), cajaIncognita()])
      ]);
      caja.appendChild(fila);
    } else if (est.tipo === 'serie_numerica') {
      caja.appendChild(el('p', { clase: 'texto-grande', texto: est.terminos.join(', ') + ', ?' }));
    } else if (est.tipo === 'expresion') {
      caja.appendChild(el('p', { clase: 'texto-grande', texto: est.texto + ' = ?' }));
    } else if (est.tipo === 'problema') {
      caja.appendChild(el('p', { clase: 'texto-problema', texto: est.texto }));
    }
    return caja;
  }

  function contenidoOpcion(op) {
    const c = el('span', { clase: 'opcion-contenido' });
    if (op.fig) c.innerHTML = svgFigura(op.fig);
    else c.appendChild(el('span', { clase: 'opcion-texto', texto: op.texto }));
    return c;
  }

  function etiquetaOpcion(op, i) {
    return 'Opción ' + (i + 1) + ': ' + (op.fig ? App.Logico.describirFigura(op.fig) : op.texto);
  }

  /**
   * Pinta una pregunta con sus opciones. alResponder(indice | null, motivo) se llama una vez.
   * Devuelve { marcar(indiceElegido, indiceCorrecto) } para señalar la solución.
   */
  function renderPregunta(cont, ej, alResponder, opciones) {
    const op = opciones || {};
    const tarjeta = el('section', { clase: 'tarjeta tarjeta-pregunta', attrs: { 'aria-labelledby': 'enunciado' } });
    tarjeta.appendChild(el('h2', { clase: 'enunciado', texto: ej.enunciado, attrs: { id: 'enunciado' } }));
    tarjeta.appendChild(renderEstimulo(ej));
    const grid = el('div', { clase: 'opciones' + (ej.opciones[0].fig ? ' opciones-figura' : ''), attrs: { role: 'group', 'aria-label': 'Opciones de respuesta (teclas 1 a 4)' } });
    let respondida = false;
    const botones = ej.opciones.map(function (o, i) {
      const b = el('button', { clase: 'opcion', attrs: { type: 'button', 'aria-label': etiquetaOpcion(o, i) } }, [
        el('span', { clase: 'opcion-num', texto: String(i + 1), attrs: { 'aria-hidden': 'true' } }),
        contenidoOpcion(o),
        el('span', { clase: 'opcion-marca', attrs: { 'aria-hidden': 'true' } })
      ]);
      b.addEventListener('click', function () { responder(i); });
      grid.appendChild(b);
      return b;
    });
    tarjeta.appendChild(grid);
    const acciones = el('div', { clase: 'acciones-pregunta' });
    const btnOmitir = boton('Omitir', 'btn btn-secundario', function () { responder(null, 'omitida'); });
    acciones.appendChild(btnOmitir);
    tarjeta.appendChild(acciones);
    const feedback = el('div', { clase: 'feedback', attrs: { role: 'status', 'aria-live': 'assertive' } });
    tarjeta.appendChild(feedback);
    cont.appendChild(tarjeta);

    function responder(i, motivo) {
      if (respondida) return;
      respondida = true;
      quitarTeclado();
      botones.forEach(function (b) { b.disabled = true; });
      btnOmitir.disabled = true;
      alResponder(i, motivo || null);
    }

    if (!op.sinTeclado) {
      ponerTeclado(function (e) {
        if (respondida || e.altKey || e.ctrlKey || e.metaKey) return;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= ej.opciones.length) { e.preventDefault(); responder(n - 1); }
      });
    }

    return {
      responderPorTiempo: function () { responder(null, 'tiempo'); },
      marcar: function (elegida, correcta, textoFeedback, claseFeedback, siguienteTexto, alSiguiente) {
        botones.forEach(function (b, i) {
          const marca = b.querySelector('.opcion-marca');
          if (i === correcta) { b.classList.add('es-correcta'); marca.textContent = '✓ Correcta'; b.setAttribute('aria-label', etiquetaOpcion(ej.opciones[i], i) + '. Respuesta correcta.'); }
          else if (i === elegida) { b.classList.add('es-elegida'); marca.textContent = '✗ Tu respuesta'; b.setAttribute('aria-label', etiquetaOpcion(ej.opciones[i], i) + '. Tu respuesta.'); }
          else b.classList.add('atenuada');
        });
        feedback.className = 'feedback ' + claseFeedback;
        feedback.textContent = '';
        feedback.appendChild(el('p', { texto: textoFeedback }));
        const btn = boton(siguienteTexto, 'btn btn-principal', alSiguiente, { 'data-foco': '1' });
        feedback.appendChild(btn);
        btn.focus();
      }
    };
  }

  function textoResultadoRespuesta(elegida, correcta, motivo) {
    if (motivo === 'tiempo') return { texto: 'Tiempo agotado. La correcta es la opción ' + (correcta + 1) + '.', clase: 'feedback-error' };
    if (motivo === 'omitida') return { texto: 'Pregunta omitida. La correcta es la opción ' + (correcta + 1) + '.', clase: 'feedback-omitida' };
    if (elegida === correcta) return { texto: 'Correcto.', clase: 'feedback-acierto' };
    return { texto: 'Incorrecto. La correcta es la opción ' + (correcta + 1) + '.', clase: 'feedback-error' };
  }

  // ------------------------------------------------------------ INICIO

  function vistaInicio(cont) {
    const estado = App.Almacen.cargarEstado();
    if (App.Sesion.archivarSesionesPendientes(estado, Date.now())) App.Almacen.guardarEstado(estado);

    cont.appendChild(cabecera('Practica los formatos de las pruebas psicotécnicas de oposiciones y procesos de selección.'));
    cont.appendChild(regionMensajes());

    if (!App.Almacen.estaDisponible()) {
      cont.appendChild(el('p', { clase: 'mensaje mensaje-aviso', texto: 'Este navegador no permite guardar datos (quizá estás en navegación privada). Puedes practicar, pero tu progreso se perderá al cerrar la página.' }));
    }
    const incompatible = App.Almacen.formatoIncompatible();
    if (incompatible !== null) {
      cont.appendChild(el('p', { clase: 'mensaje mensaje-aviso', texto: 'Hay datos guardados por otra versión de la app (formato ' + incompatible + '). No se sobrescriben: ve a «Datos» para exportarlos o borrarlos.' }));
    }

    cont.appendChild(el('h1', { clase: 'titulo-vista', texto: 'Elige un área' }));

    const modo = estado.modoTiempo === 'contrarreloj' ? 'Contrarreloj (tiempo límite por pregunta)' : 'Práctica (sin límite de tiempo)';
    cont.appendChild(el('p', { clase: 'modo-actual' }, [
      el('span', { texto: 'Modo: ' + modo + '. ' }),
      boton('Cambiar', 'btn-enlace', function () { navegarA('datos'); })
    ]));

    const grid = el('div', { clase: 'grid-areas' });
    App.Registro.obtenerAreas().forEach(function (area) {
      const prog = estado.progresoAreas[area.id];
      const tarjeta = el('section', { clase: 'tarjeta tarjeta-area', attrs: { 'aria-labelledby': 'area-' + area.id } });
      tarjeta.appendChild(el('h2', { clase: 'nombre-area', texto: area.nombre, attrs: { id: 'area-' + area.id } }));
      tarjeta.appendChild(el('p', { clase: 'desc-area', texto: area.descripcion }));
      const sinNivel = prog.nivelInicialEstimado === null || prog.nivelInicialEstimado === undefined;
      tarjeta.appendChild(el('p', { clase: 'nivel-area', texto: sinNivel ? 'Aún sin nivel: empieza con la prueba de nivel (15 preguntas).' : 'Nivel actual: ' + prog.nivelActual + ' de 10' }));
      const acciones = el('div', { clase: 'acciones-area' });
      const pendiente = prog.sesionEnCurso;
      if (pendiente && pendiente.esNivelacion) {
        acciones.appendChild(boton('Continuar la prueba de nivel', 'btn btn-principal', function () { navegarA('nivelacion', { sesion: pendiente }); }));
      } else if (pendiente) {
        acciones.appendChild(boton('Continuar sesión (' + (pendiente.indicePreguntaActual + 1) + ' de ' + pendiente.numeroPreguntas + ')', 'btn btn-principal', function () { navegarA('sesion', { sesion: pendiente }); }));
      } else if (sinNivel) {
        acciones.appendChild(boton('Hacer la prueba de nivel', 'btn btn-principal', function () {
          const s = App.Sesion.crearSesionNivelacion(area.id, estado.historialPreguntas);
          App.Sesion.guardarSesionEnCurso(area.id, s);
          navegarA('nivelacion', { sesion: s });
        }));
      } else {
        acciones.appendChild(boton('Nueva sesión de 12 preguntas', 'btn btn-principal', function () {
          const s = App.Sesion.crearSesion(area.id, prog.nivelActual, estado.historialPreguntas);
          App.Sesion.guardarSesionEnCurso(area.id, s);
          navegarA('sesion', { sesion: s });
        }));
        acciones.appendChild(boton('Repetir la prueba de nivel', 'btn-enlace', function () {
          const s = App.Sesion.crearSesionNivelacion(area.id, estado.historialPreguntas);
          App.Sesion.guardarSesionEnCurso(area.id, s);
          navegarA('nivelacion', { sesion: s });
        }));
      }
      tarjeta.appendChild(acciones);
      grid.appendChild(tarjeta);
    });
    cont.appendChild(grid);

    cont.appendChild(el('section', { clase: 'tarjeta tarjeta-info' }, [
      el('h2', { texto: 'Cómo funciona' }),
      el('ul', {}, [
        el('li', { texto: 'La primera vez, una prueba de nivel de 15 preguntas sitúa tu punto de partida en cada área.' }),
        el('li', { texto: 'Cada sesión tiene 12 ejercicios nuevos de tu nivel. Con 9 o más aciertos en dos sesiones seguidas subes un nivel; con 6 o menos en dos seguidas, bajas uno.' }),
        el('li', { texto: 'Tu progreso se guarda solo en este navegador. Exporta una copia de vez en cuando desde «Datos».' })
      ])
    ]));
    cont.appendChild(pieAvisos());
  }

  // ------------------------------------------------------------ NIVELACIÓN

  function vistaNivelacion(cont, datos) {
    const sesion = datos.sesion;
    if (!sesion || sesion.completada) { navegarA('inicio'); return; }
    sesionActiva = null;
    const ref = sesion.bloqueActualPreguntas[sesion.preguntaEnBloque];
    const ej = App.Sesion.obtenerEjercicio(ref);
    const total = App.CONFIG.NIVELACION.TOTAL_BLOQUES * App.CONFIG.NIVELACION.PREGUNTAS_POR_BLOQUE;
    const numero = sesion.bloqueActual * App.CONFIG.NIVELACION.PREGUNTAS_POR_BLOQUE + sesion.preguntaEnBloque + 1;

    cont.appendChild(cabecera());
    cont.appendChild(el('div', { clase: 'barra-progreso-texto' }, [
      el('span', { texto: 'Prueba de nivel · pregunta ' + numero + ' de ' + total }),
      el('span', { texto: 'Nivel de esta pregunta: ' + ref.nivel })
    ]));
    cont.appendChild(barraProgreso(numero - 1, total));

    const pregunta = renderPregunta(cont, ej, function (elegida, motivo) {
      const acierto = elegida === ej.opcionCorrectaIndex;
      const estado = App.Almacen.cargarEstado();
      const res = App.Sesion.responderNivelacion(sesion, acierto, estado.historialPreguntas);
      const fb = textoResultadoRespuesta(elegida, ej.opcionCorrectaIndex, motivo);
      if (res.terminada) {
        App.Sesion.finalizarNivelacion(estado, sesion);
        App.Almacen.guardarEstado(estado);
        pregunta.marcar(elegida, ej.opcionCorrectaIndex, fb.texto, fb.clase, 'Ver mi nivel', function () { mostrarFinNivelacion(cont, sesion); });
      } else {
        App.Sesion.guardarSesionEnCurso(sesion.areaId, sesion);
        pregunta.marcar(elegida, ej.opcionCorrectaIndex, fb.texto, fb.clase, 'Siguiente pregunta', function () { navegarA('nivelacion', { sesion: sesion }); });
      }
    });
  }

  function mostrarFinNivelacion(cont, sesion) {
    quitarTeclado();
    cont.innerHTML = '';
    cont.appendChild(cabecera());
    const area = App.Registro.obtenerArea(sesion.areaId);
    const t = el('section', { clase: 'tarjeta tarjeta-resultado' }, [
      el('h1', { texto: 'Prueba de nivel completada', attrs: { 'data-foco': '1', tabindex: '-1' } }),
      el('p', { clase: 'resultado-destacado', texto: 'Nivel inicial estimado en ' + area.nombre.toLowerCase() + ': ' + sesion.nivelActualProcesado }),
      el('p', { texto: 'Es una referencia interna para empezar a practicar con ejercicios adecuados. No es una medida de capacidad ni permite compararte con otras personas.' }),
      el('ul', { clase: 'lista-ajustes' }, sesion.historialAjustes.map(function (b) {
        return el('li', { texto: 'Bloque ' + b.bloque + ' (nivel ' + b.nivel + '): ' + b.aciertos + ' de 3 aciertos → nivel ' + b.nuevoNivel });
      })),
      el('div', { clase: 'acciones' }, [boton('Ir al inicio', 'btn btn-principal', function () { navegarA('inicio'); })])
    ]);
    cont.appendChild(t);
    const h = t.querySelector('h1');
    if (h) h.focus();
  }

  function barraProgreso(hechas, total) {
    const pct = Math.round((hechas / total) * 100);
    return el('div', { clase: 'barra-progreso', attrs: { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(hechas), 'aria-label': 'Progreso' } }, [
      el('div', { clase: 'barra-progreso-relleno', attrs: { style: 'width:' + pct + '%' } })
    ]);
  }

  // ------------------------------------------------------------ SESIÓN

  function vistaSesion(cont, datos) {
    const sesion = datos.sesion;
    const idx = sesion.indicePreguntaActual;
    const ref = sesion.preguntas[idx];
    if (!ref) { App.Sesion.limpiarSesionEnCurso(sesion.areaId); navegarA('inicio'); return; }
    const ej = App.Sesion.obtenerEjercicio(ref);
    const estado = App.Almacen.cargarEstado();
    sesionActiva = sesion;
    App.Sesion.guardarSesionEnCurso(sesion.areaId, sesion);

    cont.appendChild(cabecera());
    if (idx === 0 && sesion.avisosPocos && sesion.avisosPocos.length) cont.appendChild(el('p', { clase: 'mensaje mensaje-aviso', texto: App.CONFIG.TEXTOS.AVISO_POCOS_EJERCICIOS }));

    const esContrarreloj = estado.modoTiempo === 'contrarreloj';
    const limite = esContrarreloj ? ((App.CONFIG.TIEMPOS_CONTRARRELOJ[ej.tipoId] || [])[ref.nivel] || 0) : 0;
    const reloj = el('span', { clase: 'reloj', attrs: { 'aria-live': 'off' } });
    cont.appendChild(el('div', { clase: 'barra-progreso-texto' }, [
      el('span', { texto: 'Pregunta ' + (idx + 1) + ' de ' + sesion.preguntas.length }),
      el('span', { texto: 'Nivel ' + sesion.nivel }),
      esContrarreloj ? reloj : null
    ]));
    cont.appendChild(barraProgreso(idx, sesion.preguntas.length));
    if (ref.esRepeticion) cont.appendChild(el('p', { clase: 'mensaje mensaje-info', texto: App.CONFIG.TEXTOS.AVISO_REPETICION }));

    let pregunta = null;
    App.Tiempo.iniciar(sesion.tiempoPreguntaAcumuladoMs || 0, limite, function (ms, limMs) {
      if (limMs > 0) {
        const quedan = Math.max(0, limMs - ms);
        reloj.textContent = 'Quedan ' + formatoTiempo(quedan);
        reloj.classList.toggle('reloj-urgente', quedan <= 10000);
      }
    }, function () { if (pregunta) pregunta.responderPorTiempo(); });

    pregunta = renderPregunta(cont, ej, function (elegida, motivo) {
      const tiempoMs = App.Tiempo.detener();
      sesion.tiempoPreguntaAcumuladoMs = 0;
      const acierto = motivo === null && elegida === ej.opcionCorrectaIndex;
      sesion.respuestas.push({
        idCanonico: ej.idCanonico, tipoId: ej.tipoId, nivel: ej.nivel, opcionElegida: elegida,
        esAcierto: acierto, esOmitida: motivo === 'omitida', esTiempoAgotado: motivo === 'tiempo', tiempoMs: Math.round(tiempoMs)
      });
      const fb = textoResultadoRespuesta(elegida, ej.opcionCorrectaIndex, motivo);
      const esUltima = idx >= sesion.preguntas.length - 1;
      if (esUltima) {
        const est = App.Almacen.cargarEstado();
        const fin = App.Sesion.finalizarSesion(est, sesion);
        const guardado = App.Almacen.guardarEstado(est);
        sesionActiva = null;
        ultimaSesionTerminada = sesion;
        if (!guardado) avisar(App.Almacen.ultimoError() || 'No se pudo guardar la sesión.', 'aviso');
        pregunta.marcar(elegida, ej.opcionCorrectaIndex, fb.texto, fb.clase, 'Ver resultados', function () { navegarA('resultados', { sesion: sesion, stats: fin.stats, evolucion: fin.evolucion }); });
      } else {
        sesion.indicePreguntaActual++;
        App.Sesion.guardarSesionEnCurso(sesion.areaId, sesion);
        pregunta.marcar(elegida, ej.opcionCorrectaIndex, fb.texto, fb.clase, 'Siguiente pregunta', function () { navegarA('sesion', { sesion: sesion }); });
      }
    });
    if (esContrarreloj) cont.appendChild(el('p', { clase: 'nota-pequena', texto: App.CONFIG.TEXTOS.EXPLICACION_CRONOMETRO }));
  }

  // ------------------------------------------------------------ RESULTADOS

  function dato(etiqueta, valor, ayuda) {
    return el('div', { clase: 'dato' }, [
      el('span', { clase: 'dato-etiqueta', texto: etiqueta }),
      el('span', { clase: 'dato-valor', texto: String(valor) }),
      ayuda ? el('span', { clase: 'dato-ayuda', texto: ayuda }) : null
    ]);
  }

  function vistaResultados(cont, datos) {
    const s = datos.stats;
    const evo = datos.evolucion;
    const sesion = datos.sesion;
    if (!s || !sesion) { navegarA('inicio'); return; }
    cont.appendChild(cabecera());
    cont.appendChild(regionMensajes());
    const area = App.Registro.obtenerArea(sesion.areaId);
    const t = el('section', { clase: 'tarjeta tarjeta-resultado' });
    t.appendChild(el('h1', { texto: 'Resultados · ' + area.nombre + ' · nivel ' + sesion.nivel, attrs: { 'data-foco': '1' } }));
    t.appendChild(el('h2', { clase: 'subtitulo-seccion', texto: 'Precisión' }));
    t.appendChild(el('div', { clase: 'grid-datos' }, [
      dato('Aciertos', s.aciertos + ' de ' + s.totalPreguntas),
      dato('Errores', s.errores),
      dato('Omitidas', s.omitidas),
      dato('Tiempo agotado', s.tiemposAgotados),
      dato('% de aciertos', String(s.porcentajeAciertos).replace('.', ',') + ' %')
    ]));
    t.appendChild(el('h2', { clase: 'subtitulo-seccion', texto: 'Velocidad' }));
    t.appendChild(el('div', { clase: 'grid-datos' }, [
      dato('Tiempo total', formatoTiempo(s.tiempoTotalMs)),
      dato('Tiempo medio por pregunta', formatoSegundos(s.tiempoMedioMs))
    ]));
    t.appendChild(el('p', { clase: 'nota-pequena', texto: 'La velocidad se muestra aparte: no compensa los errores ni cambia el nivel.' }));
    t.appendChild(el('h2', { clase: 'subtitulo-seccion', texto: 'Nota con penalización' }));
    t.appendChild(el('div', { clase: 'grid-datos' }, [dato('Aciertos − errores ÷ 3', textoNota(s.notaOposicion) + ' de ' + s.totalPreguntas)]));
    t.appendChild(el('p', { clase: 'nota-pequena', texto: App.CONFIG.TEXTOS.AVISO_NOTA }));

    t.appendChild(el('h2', { clase: 'subtitulo-seccion', texto: 'Por tipo de ejercicio' }));
    const lista = el('ul', { clase: 'lista-tipos' });
    Object.keys(s.rendimientoPorTipo).forEach(function (tipoId) {
      const r = s.rendimientoPorTipo[tipoId];
      const tipo = App.Registro.obtenerTipo(tipoId);
      const plural = function (n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); };
      lista.appendChild(el('li', { texto: (tipo ? tipo.nombre : tipoId) + ': ' + r.aciertos + ' de ' + r.total + ' aciertos' + (r.errores ? ', ' + plural(r.errores, 'error', 'errores') : '') + (r.omitidas ? ', ' + plural(r.omitidas, 'omitida', 'omitidas') : '') + (r.tiemposAgotados ? ', ' + r.tiemposAgotados + ' sin tiempo' : '') + '.' }));
    });
    t.appendChild(lista);

    const mensajeNivel = evo.cambio === 'sube' ? 'Subes al nivel ' + evo.nuevoNivel + ': has hecho 9 o más aciertos en dos sesiones seguidas.'
      : evo.cambio === 'baja' ? 'Bajas al nivel ' + evo.nuevoNivel + ' para consolidar: has hecho 6 o menos aciertos en dos sesiones seguidas.'
      : 'Sigues en el nivel ' + evo.nuevoNivel + '. Para subir necesitas 9 o más aciertos en dos sesiones seguidas de este nivel.';
    t.appendChild(el('p', { clase: 'mensaje mensaje-' + (evo.cambio === 'sube' ? 'exito' : 'info'), texto: mensajeNivel }));

    const estado = App.Almacen.cargarEstado();
    if (App.Datos.verificarRecomendacionExportar(estado)) {
      t.appendChild(el('div', { clase: 'tarjeta-recordatorio' }, [
        el('h2', { texto: 'Guarda una copia de tu progreso' }),
        el('p', { texto: 'Tu progreso solo está en este navegador. Safari puede borrar los datos de una web que no visitas en 7 días de uso del navegador. Además, cada navegador, cada dispositivo y el icono de la pantalla de inicio del iPhone guardan su propio progreso por separado.' }),
        boton('Exportar copia ahora', 'btn btn-principal', function () {
          const r = App.Datos.exportarDatos();
          avisar(r.mensaje, 'exito');
          navegarA('resultados', datos);
        })
      ]));
    }
    t.appendChild(el('div', { clase: 'acciones' }, [
      boton('Revisar las 12 preguntas', 'btn btn-principal', function () { navegarA('revision', { sesion: sesion }); }),
      boton('Nueva sesión', 'btn btn-secundario', function () {
        const est = App.Almacen.cargarEstado();
        const nueva = App.Sesion.crearSesion(sesion.areaId, est.progresoAreas[sesion.areaId].nivelActual, est.historialPreguntas);
        App.Sesion.guardarSesionEnCurso(sesion.areaId, nueva);
        navegarA('sesion', { sesion: nueva });
      }),
      boton('Inicio', 'btn btn-secundario', function () { navegarA('inicio'); })
    ]));
    cont.appendChild(t);
    cont.appendChild(pieAvisos());
  }

  // ------------------------------------------------------------ REVISIÓN

  function vistaRevision(cont, datos) {
    const sesion = datos.sesion || ultimaSesionTerminada;
    if (!sesion) { navegarA('inicio'); return; }
    cont.appendChild(cabecera());
    cont.appendChild(el('h1', { clase: 'titulo-vista', texto: 'Revisión de la sesión', attrs: { 'data-foco': '1' } }));
    sesion.preguntas.forEach(function (ref, i) {
      const ej = App.Sesion.obtenerEjercicio(ref);
      const r = sesion.respuestas[i] || {};
      const estadoTexto = r.esAcierto ? '✓ Correcta' : r.esTiempoAgotado ? '⏱ Tiempo agotado' : r.esOmitida ? '— Omitida' : '✗ Incorrecta';
      const t = el('section', { clase: 'tarjeta tarjeta-revision ' + (r.esAcierto ? 'rev-acierto' : 'rev-fallo') });
      t.appendChild(el('h2', { clase: 'rev-titulo', texto: 'Pregunta ' + (i + 1) + ' · ' + estadoTexto }));
      t.appendChild(el('p', { clase: 'enunciado', texto: ej.enunciado }));
      t.appendChild(renderEstimulo(ej));
      const grid = el('div', { clase: 'opciones opciones-revision' + (ej.opciones[0].fig ? ' opciones-figura' : '') });
      ej.opciones.forEach(function (o, k) {
        const esCorrecta = k === ej.opcionCorrectaIndex;
        const esElegida = k === r.opcionElegida;
        grid.appendChild(el('div', { clase: 'opcion ' + (esCorrecta ? 'es-correcta' : esElegida ? 'es-elegida' : 'atenuada'), attrs: { 'aria-label': etiquetaOpcion(o, k) + (esCorrecta ? '. Correcta.' : '') + (esElegida && !esCorrecta ? '. Tu respuesta.' : '') } }, [
          el('span', { clase: 'opcion-num', texto: String(k + 1), attrs: { 'aria-hidden': 'true' } }),
          contenidoOpcion(o),
          el('span', { clase: 'opcion-marca', texto: esCorrecta ? '✓ Correcta' : esElegida ? '✗ Tu respuesta' : '', attrs: { 'aria-hidden': 'true' } })
        ]));
      });
      t.appendChild(grid);
      const elegida = ej.opciones[r.opcionElegida];
      if (!r.esAcierto && elegida && elegida.errorEtiqueta) t.appendChild(el('p', { clase: 'error-distractor', texto: 'Por qué tu opción no es correcta — ' + elegida.errorEtiqueta }));
      t.appendChild(el('dl', { clase: 'explicacion' }, [
        el('dt', { texto: 'Datos' }), el('dd', { texto: ej.explicacion.datos }),
        el('dt', { texto: 'Regla' }), el('dd', { texto: ej.explicacion.regla }),
        el('dt', { texto: 'Pasos' }), el('dd', { texto: ej.explicacion.pasos }),
        el('dt', { texto: 'Respuesta' }), el('dd', { texto: ej.explicacion.respuesta })
      ]));
      t.appendChild(el('p', { clase: 'nota-pequena', texto: 'Tiempo: ' + formatoSegundos(r.tiempoMs) }));
      cont.appendChild(t);
    });
    cont.appendChild(el('div', { clase: 'acciones' }, [boton('Volver al inicio', 'btn btn-principal', function () { navegarA('inicio'); })]));
  }

  // ------------------------------------------------------------ HISTORIAL

  function vistaHistorial(cont) {
    const estado = App.Almacen.cargarEstado();
    cont.appendChild(cabecera());
    cont.appendChild(el('h1', { clase: 'titulo-vista', texto: 'Historial', attrs: { 'data-foco': '1' } }));
    App.Registro.obtenerAreas().forEach(function (area) {
      const prog = estado.progresoAreas[area.id];
      const t = el('section', { clase: 'tarjeta' });
      t.appendChild(el('h2', { texto: area.nombre }));
      t.appendChild(el('p', { texto: 'Nivel actual: ' + prog.nivelActual + (prog.nivelInicialEstimado !== null && prog.nivelInicialEstimado !== undefined ? ' · nivel inicial estimado: ' + prog.nivelInicialEstimado : ' · sin prueba de nivel') }));
      const g = App.Resultados.generarGraficoEvolucionSVG(estado.historialSesiones, area.id, prog.nivelActual);
      if (g.svg) { const c = el('div', { clase: 'grafico' }); c.innerHTML = g.svg; t.appendChild(c); }
      else t.appendChild(el('p', { clase: 'nota-pequena', texto: g.mensaje }));
      const sesiones = estado.historialSesiones.filter(function (s) { return s.areaId === area.id; }).slice(-20).reverse();
      if (!sesiones.length) t.appendChild(el('p', { texto: 'Aún no hay sesiones.' }));
      else {
        const lista = el('ul', { clase: 'lista-sesiones' });
        sesiones.forEach(function (s) {
          const fecha = new Date(s.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
          let texto;
          if (s.esNivelacion && s.completada) texto = 'Prueba de nivel: nivel inicial ' + s.nivel + ' (' + s.aciertos + ' de ' + s.numeroPreguntas + ' aciertos)';
          else if (!s.completada) texto = 'Incompleta (nivel ' + s.nivel + ')' + (s.motivoIncompleta ? ': ' + s.motivoIncompleta : '');
          else texto = 'Nivel ' + s.nivel + ': ' + s.aciertos + ' de ' + s.numeroPreguntas + ' aciertos' + (s.tiempoTotalMs ? ' · ' + formatoTiempo(s.tiempoTotalMs) : '');
          lista.appendChild(el('li', {}, [el('span', { clase: 'fecha', texto: fecha }), el('span', { texto: ' · ' + texto })]));
        });
        t.appendChild(lista);
      }
      cont.appendChild(t);
    });
    cont.appendChild(el('p', { clase: 'nota-pequena', texto: App.CONFIG.TEXTOS.AVISO_EFECTO_PRACTICA }));
  }

  // ------------------------------------------------------------ DATOS

  function vistaDatos(cont) {
    const estado = App.Almacen.cargarEstado();
    cont.appendChild(cabecera());
    cont.appendChild(regionMensajes());
    cont.appendChild(el('h1', { clase: 'titulo-vista', texto: 'Datos y ajustes', attrs: { 'data-foco': '1' } }));

    const tModo = el('section', { clase: 'tarjeta' }, [el('h2', { texto: 'Modo de tiempo' })]);
    const grupo = el('fieldset', { clase: 'grupo-radio' }, [el('legend', { clase: 'solo-lectores', texto: 'Modo de tiempo' })]);
    [['practica', 'Práctica: sin límite de tiempo'], ['contrarreloj', 'Contrarreloj: tiempo límite por pregunta según tipo y nivel']].forEach(function (par) {
      const input = el('input', { attrs: { type: 'radio', name: 'modo', id: 'modo-' + par[0], value: par[0] } });
      if (estado.modoTiempo === par[0]) input.checked = true;
      input.addEventListener('change', function () {
        const e = App.Almacen.cargarEstado();
        e.modoTiempo = par[0];
        App.Almacen.guardarEstado(e);
        avisar('Modo cambiado a ' + (par[0] === 'practica' ? 'Práctica.' : 'Contrarreloj.'), 'exito');
        navegarA('datos');
      });
      grupo.appendChild(el('div', { clase: 'opcion-radio' }, [input, el('label', { texto: par[1], attrs: { for: 'modo-' + par[0] } })]));
    });
    tModo.appendChild(grupo);
    tModo.appendChild(el('p', { clase: 'nota-pequena', texto: App.CONFIG.TEXTOS.EXPLICACION_CRONOMETRO }));
    cont.appendChild(tModo);

    const tExp = el('section', { clase: 'tarjeta' }, [
      el('h2', { texto: 'Exportar progreso' }),
      el('p', { texto: 'Descarga un archivo con tus niveles e historial. Es tu copia de seguridad y sirve para pasar el progreso a otro navegador o dispositivo.' }),
      el('p', { clase: 'nota-pequena', texto: estado.ultimaExportacionTimestamp ? 'Última copia: ' + new Date(estado.ultimaExportacionTimestamp).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) + '.' : 'Aún no has exportado ninguna copia.' }),
      boton('Descargar copia', 'btn btn-principal', function () { const r = App.Datos.exportarDatos(); avisar(r.mensaje, 'exito'); navegarA('datos'); })
    ]);
    cont.appendChild(tExp);

    const input = el('input', { clase: 'input-archivo', attrs: { type: 'file', id: 'archivo-importar', accept: 'application/json,.json' } });
    const tImp = el('section', { clase: 'tarjeta' }, [
      el('h2', { texto: 'Importar progreso' }),
      el('p', { texto: 'Elige un archivo exportado antes. Sustituirá tu progreso actual, pero se guarda una copia para poder deshacerlo.' }),
      el('label', { clase: 'etiqueta-archivo', texto: 'Archivo de copia (.json)', attrs: { for: 'archivo-importar' } }),
      input,
      boton('Importar archivo', 'btn btn-secundario', function () {
        if (!input.files || !input.files.length) { avisar('Primero elige un archivo.', 'aviso'); navegarA('datos'); return; }
        const lector = new FileReader();
        lector.onload = function (e) { const r = App.Datos.importarDatos(String(e.target.result)); avisar(r.mensaje, r.exito ? 'exito' : 'aviso'); navegarA('datos'); };
        lector.onerror = function () { avisar('No se pudo leer el archivo.', 'aviso'); navegarA('datos'); };
        lector.readAsText(input.files[0]);
      })
    ]);
    if (estado.copiaSeguridadDeshacer) tImp.appendChild(boton('Deshacer importación', 'btn-enlace', function () { const r = App.Datos.deshacerImportacion(); avisar(r.mensaje, r.exito ? 'exito' : 'aviso'); navegarA('datos'); }));
    cont.appendChild(tImp);

    const kb = Math.max(1, Math.round(App.Almacen.tamanoBytes(estado) / 1024));
    const tBorrar = el('section', { clase: 'tarjeta tarjeta-peligro' }, [
      el('h2', { texto: 'Borrar todo' }),
      el('p', { texto: 'Elimina tus niveles e historial de este navegador (unos ' + kb + ' KB). Solo se borra la clave «psicotec»: tus otras webs del mismo dominio no se tocan.' }),
      boton('Borrar mis datos', 'btn btn-peligro', function () {
        if (window.confirm('¿Seguro que quieres borrar todo tu progreso de PsicoTec en este navegador? No se puede deshacer. Si quieres conservarlo, exporta antes una copia.')) {
          App.Almacen.borrarEstado();
          avisar('Datos borrados.', 'exito');
          navegarA('inicio');
        }
      })
    ]);
    cont.appendChild(tBorrar);
  }

  // ------------------------------------------------------------ PRIVACIDAD

  function vistaPrivacidad(cont) {
    cont.appendChild(cabecera());
    cont.appendChild(el('section', { clase: 'tarjeta' }, [
      el('h1', { texto: 'Privacidad', attrs: { 'data-foco': '1' } }),
      el('h2', { texto: 'Qué se guarda' }),
      el('p', { texto: 'Tu nivel en cada área, el resumen de tus sesiones y el detalle de tus últimas 300 respuestas (qué ejercicio, si acertaste y cuánto tardaste), además del modo de tiempo elegido.' }),
      el('h2', { texto: 'Dónde' }),
      el('p', { texto: 'Solo en el almacenamiento local de este navegador, en una clave llamada «psicotec». La app no tiene registro, servidor, cookies, analítica ni recursos de terceros, y no envía tus resultados a ningún sitio.' }),
      el('h2', { texto: 'Alojamiento' }),
      el('p', { texto: 'La web está alojada en GitHub Pages. GitHub registra la dirección IP de quien visita la página por motivos de seguridad, aunque no haya iniciado sesión. Ese registro lo hace GitHub, no esta app.' }),
      el('h2', { texto: 'Cómo exportar o borrar' }),
      el('p', { texto: 'Desde «Datos» puedes descargar una copia, importarla en otro navegador o borrar todo. Borrar los datos del sitio en los ajustes del navegador también elimina el progreso.' }),
      el('div', { clase: 'acciones' }, [boton('Ir a Datos', 'btn btn-secundario', function () { navegarA('datos'); })])
    ]));
  }

  // ------------------------------------------------------------ DIAGNÓSTICO (?test=1)

  function vistaDiagnostico(cont) {
    cont.appendChild(cabecera());
    cont.appendChild(el('h1', { clase: 'titulo-vista', texto: 'Autodiagnóstico', attrs: { 'data-foco': '1' } }));
    cont.appendChild(el('p', { texto: 'Genera y comprueba ejercicios de todos los tipos y niveles, y prueba el almacenamiento con datos simulados (no toca tu progreso). Puede tardar un minuto.' }));
    const estadoTxt = el('p', { clase: 'mensaje mensaje-info', texto: 'Preparando…', attrs: { role: 'status', 'aria-live': 'polite' } });
    const salida = el('div', { clase: 'diagnostico-salida' });
    cont.appendChild(estadoTxt);
    cont.appendChild(salida);
    const muestras = Number(new URLSearchParams(window.location.search).get('muestras')) || 200;
    App.Autodiagnostico.cargarRegresiones(function () {
      App.Autodiagnostico.ejecutarAsincrono({ muestras: muestras }, function (progreso) {
        estadoTxt.textContent = 'Comprobando… ' + progreso + ' %';
      }, function (informe) {
        estadoTxt.className = 'mensaje ' + (informe.fallidas === 0 ? 'mensaje-exito' : 'mensaje-aviso');
        estadoTxt.textContent = informe.fallidas === 0 ? 'Todo correcto: ' + informe.superadas + ' de ' + informe.total + ' comprobaciones superadas.' : informe.fallidas + ' comprobaciones fallidas de ' + informe.total + '.';
        const lista = el('ul', { clase: 'lista-diagnostico' });
        informe.resultados.forEach(function (r) { lista.appendChild(el('li', { clase: r.ok ? 'ok' : 'fallo', texto: (r.ok ? '✓ ' : '✗ ') + r.nombre + (r.detalle ? ' — ' + r.detalle : '') })); });
        salida.appendChild(lista);
        if (informe.tabla) {
          const pre = el('pre', { clase: 'tabla-diagnostico', texto: informe.tabla });
          salida.appendChild(pre);
        }
      });
    });
  }

  // ------------------------------------------------------------ guardado al salir

  function guardarAntesDeSalir() {
    if (!sesionActiva || sesionActiva.completada || !App.Tiempo.estaCorriendo()) return;
    sesionActiva.tiempoPreguntaAcumuladoMs = App.Tiempo.obtenerTiempoTranscurridoMs();
    App.Sesion.guardarSesionEnCurso(sesionActiva.areaId, sesionActiva);
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('pagehide', guardarAntesDeSalir);
    document.addEventListener('visibilitychange', function () { if (document.hidden) guardarAntesDeSalir(); });
  }

  return { navegarA: navegarA, svgFigura: svgFigura };
})();
