/**
 * pruebas/ejecutar.js - Comprobaciones automáticas de PsicoTec en Node (no hace falta para usar la app).
 *
 * Uso:
 *   node pruebas/ejecutar.js                 comprobaciones estáticas + batería completa
 *   node pruebas/ejecutar.js --muestras=500  más ejercicios por tipo y nivel (por defecto 200)
 *   node pruebas/ejecutar.js --regresiones   vuelve a crear pruebas/regresiones.js
 *   node pruebas/ejecutar.js --espacio       estima cuántos ejercicios distintos hay y lo escribe en js/config.js
 *
 * La misma batería se ejecuta en el navegador abriendo la app con ?test=1.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opcion = function (nombre) { return args.some(function (a) { return a === '--' + nombre || a.indexOf('--' + nombre + '=') === 0; }); };
const valor = function (nombre, porDefecto) {
  const a = args.find(function (x) { return x.indexOf('--' + nombre + '=') === 0; });
  return a ? Number(a.split('=')[1]) : porDefecto;
};

let fallos = 0;
function informar(ok, nombre, detalle) {
  if (!ok) fallos++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + nombre + (detalle ? ' — ' + detalle : ''));
}

function todosLosArchivos(dir) {
  let lista = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.name === '.git' || e.name === 'node_modules') return;
    const p = path.join(dir, e.name);
    lista.push(p);
    if (e.isDirectory()) lista = lista.concat(todosLosArchivos(p));
  });
  return lista;
}

// ------------------------------------------------------------ 1. comprobaciones estáticas

console.log('\n1. Comprobaciones estáticas');
const archivos = todosLosArchivos(RAIZ);
const relativos = archivos.map(function (p) { return path.relative(RAIZ, p); });
const js = relativos.filter(function (r) { return r.endsWith('.js'); });

const sintaxisMal = [];
js.forEach(function (r) {
  try { execFileSync(process.execPath, ['--check', path.join(RAIZ, r)], { stdio: 'pipe' }); } catch (e) { sintaxisMal.push(r + ': ' + String(e.stderr).split('\n').slice(0, 3).join(' ')); }
});
informar(sintaxisMal.length === 0, 'Sintaxis de ' + js.length + ' archivos .js (node --check)', sintaxisMal.join(' | '));

const conGuion = relativos.filter(function (r) { return r.split(path.sep).some(function (p) { return p.charAt(0) === '_'; }); });
informar(conGuion.length === 0, 'Ningún archivo o carpeta empieza por «_» (GitHub Pages los ocultaría)', conGuion.join(', '));

const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const scripts = [];
html.replace(/<script\b([^>]*)>/g, function (m, attrs) {
  const src = /src="([^"]+)"/.exec(attrs);
  if (src) scripts.push({ src: src[1], attrs: attrs });
  return m;
});
informar(scripts.length > 0 && scripts.every(function (s) { return !/type\s*=\s*"module"/.test(s.attrs); }), 'Scripts clásicos, sin type="module" (funciona también abriendo el archivo)');
informar(scripts.every(function (s) { return fs.existsSync(path.join(RAIZ, s.src)); }), 'Todos los scripts de index.html existen', scripts.filter(function (s) { return !fs.existsSync(path.join(RAIZ, s.src)); }).map(function (s) { return s.src; }).join(', '));

const recursos = [];
html.replace(/(?:src|href)="([^"]+)"/g, function (m, u) { recursos.push(u); return m; });
informar(recursos.every(function (u) { return !/^(\/|https?:|\/\/)/.test(u); }), 'Rutas relativas y sin recursos externos en index.html', recursos.filter(function (u) { return /^(\/|https?:|\/\/)/.test(u); }).join(', '));
informar(recursos.every(function (u) { return fs.existsSync(path.join(RAIZ, u.split('?')[0])); }), 'Todos los recursos enlazados existen', recursos.filter(function (u) { return !fs.existsSync(path.join(RAIZ, u.split('?')[0])); }).join(', '));

const codigo = js.filter(function (r) { return r.indexOf('pruebas') !== 0; }).map(function (r) { return { r: r, t: fs.readFileSync(path.join(RAIZ, r), 'utf8') }; });
const css = fs.readFileSync(path.join(RAIZ, 'css', 'estilos.css'), 'utf8');
const externos = codigo.filter(function (c) { return /https?:\/\//.test(c.t.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '')); }).map(function (c) { return c.r; });
if (/https?:\/\/|@import/.test(css)) externos.push('css/estilos.css');
informar(externos.length === 0, 'Sin dependencias ni recursos de terceros en el código', externos.join(', '));
informar(!codigo.some(function (c) { return /\bfetch\s*\(|XMLHttpRequest|import\s*\(/.test(c.t); }), 'Sin fetch ni carga dinámica de JSON');
informar(!codigo.some(function (c) { return /localStorage\.clear\s*\(/.test(c.t); }), 'Nunca se llama a localStorage.clear()');
const innerMal = [];
codigo.forEach(function (c) {
  c.t.split('\n').forEach(function (linea, i) {
    if (/\.innerHTML\s*=/.test(linea) && !/\.innerHTML\s*=\s*(''|svgFigura\(|g\.svg)/.test(linea)) innerMal.push(c.r + ':' + (i + 1));
  });
});
informar(innerMal.length === 0, 'innerHTML solo con SVG generado internamente (nunca con datos importados)', innerMal.join(', '));

function cabeceraPng(ruta) {
  const b = fs.readFileSync(ruta);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20), tipoColor: b[25] };
}
const iconoApple = path.join(RAIZ, 'icons', 'apple-touch-icon.png');
const png = fs.existsSync(iconoApple) ? cabeceraPng(iconoApple) : null;
informar(!!png && png.ancho === 180 && png.alto === 180 && png.tipoColor === 2, 'Icono del iPhone: PNG de 180 × 180 opaco (fondo blanco, sin transparencia)', png ? png.ancho + '×' + png.alto + ', tipo de color ' + png.tipoColor : 'no existe');
informar(/<link rel="apple-touch-icon" href="icons\/apple-touch-icon\.png">/.test(html), 'index.html enlaza el icono del iPhone');
informar(/name="apple-mobile-web-app-title" content="PsicoTec"/.test(html), 'Nombre corto bajo el icono: «PsicoTec»');

// ------------------------------------------------------------ 2. carga de la app en un contexto aislado

function cargarApp() {
  const ctx = { console: { log: function () {}, warn: console.warn, error: console.error }, setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval, performance: performance };
  ctx.window = ctx;
  vm.createContext(ctx);
  scripts.forEach(function (s) { vm.runInContext(fs.readFileSync(path.join(RAIZ, s.src), 'utf8'), ctx, { filename: s.src }); });
  return ctx;
}

console.log('\n2. Carga de los scripts en el orden de index.html');
let ctx;
try { ctx = cargarApp(); informar(true, 'Los ' + scripts.length + ' scripts se cargan sin errores'); } catch (e) { informar(false, 'Carga de scripts', e.stack); process.exit(1); }
const App = ctx.App;

// ------------------------------------------------------------ 3. opciones de mantenimiento

if (opcion('espacio')) {
  const M = valor('espacio', 0) || 4000;
  console.log('\n3a. Estimación del número de ejercicios distintos (' + M + ' muestras por tipo y nivel, estimador Chao1)');
  const tabla = {};
  Object.keys(App.CONFIG.ESPACIO_ESTIMADO).forEach(function (tipoId) {
    const tipo = App.Registro.obtenerTipo(tipoId);
    tabla[tipoId] = [];
    for (let nivel = 0; nivel <= 10; nivel++) {
      const frec = new Map();
      for (let i = 0; i < M; i++) {
        const id = tipo.generadorFn(nivel, 'esp-' + tipoId + '-' + nivel + '-' + i).idCanonico;
        frec.set(id, (frec.get(id) || 0) + 1);
      }
      let f1 = 0;
      let f2 = 0;
      frec.forEach(function (n) { if (n === 1) f1++; if (n === 2) f2++; });
      const D = frec.size;
      const chao = D + (f1 * (f1 - 1)) / (2 * (f2 + 1));
      tabla[tipoId].push(Math.min(99999, Math.floor(chao)));
    }
    console.log('  ' + tipoId.padEnd(18) + tabla[tipoId].map(function (x) { return String(x).padStart(6); }).join(''));
  });
  const rutaConfig = path.join(RAIZ, 'js', 'config.js');
  const config = fs.readFileSync(rutaConfig, 'utf8');
  const bloque = '  ESPACIO_ESTIMADO: {\n' + Object.keys(tabla).map(function (t) { return '    ' + t + ': [' + tabla[t].join(', ') + ']'; }).join(',\n') + '\n  },';
  const nuevo = config.replace(/  ESPACIO_ESTIMADO: \{[\s\S]*?\n  \},/, bloque);
  fs.writeFileSync(rutaConfig, nuevo);
  console.log('  Escrito en js/config.js (99999 = más de 99.999).');
  ctx = cargarApp();
}

if (opcion('regresiones')) {
  console.log('\n3b. Regenerando pruebas/regresiones.js');
  const tabla = ctx.App.Autodiagnostico.crearRegresiones(3);
  const contenido = '/**\n * pruebas/regresiones.js - Ejercicios esperados para semillas fijas (3 por tipo y nivel).\n' +
    ' * Generado con: node pruebas/ejecutar.js --regresiones. Si un generador cambia a propósito, sube su versión en config.js y regenera.\n */\n' +
    'window.App = window.App || {};\nApp.REGRESIONES = ' + JSON.stringify(tabla, null, 1) + ';\n';
  fs.writeFileSync(path.join(__dirname, 'regresiones.js'), contenido);
  console.log('  ' + Object.keys(tabla).length + ' combinaciones de tipo y nivel guardadas.');
}

// ------------------------------------------------------------ 4. batería compartida con ?test=1

const rutaReg = path.join(__dirname, 'regresiones.js');
if (fs.existsSync(rutaReg)) vm.runInContext(fs.readFileSync(rutaReg, 'utf8'), ctx, { filename: 'pruebas/regresiones.js' });

const muestras = valor('muestras', 200);
console.log('\n4. Batería de autodiagnóstico (' + muestras + ' ejercicios por tipo y nivel)');
const t0 = Date.now();
const informe = ctx.App.Autodiagnostico.ejecutar({ muestras: muestras });
informe.resultados.forEach(function (r) { informar(r.ok, r.nombre, r.detalle); });
console.log('\n' + informe.tabla.split('\n').map(function (l) { return '  ' + l; }).join('\n'));
console.log('\nTiempo de la batería: ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');

console.log(fallos === 0 ? '\nRESULTADO: todo correcto.\n' : '\nRESULTADO: ' + fallos + ' comprobaciones fallidas.\n');
process.exit(fallos === 0 ? 0 : 1);
