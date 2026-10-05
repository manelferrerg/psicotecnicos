/**
 * app.js - Arranque de PsicoTec.
 * Abre el inicio o, con ?test=1 en la dirección, el autodiagnóstico.
 */

window.App = window.App || {};

App.iniciar = function () {
  const raiz = document.getElementById('app-root');
  try {
    if (!App.CONFIG || !App.UI || !App.Almacen || !App.Sesion) throw new Error('Falta algún archivo de la app.');
    App.Datos.solicitarPersistenciaAlmacenamiento();
    const modoTest = new URLSearchParams(window.location.search).get('test') === '1';
    App.UI.navegarA(modoTest ? 'diagnostico' : 'inicio');
  } catch (e) {
    if (raiz) {
      raiz.textContent = '';
      const p = document.createElement('p');
      p.className = 'mensaje mensaje-aviso';
      p.textContent = 'La app no ha podido arrancar (' + e.message + '). Comprueba que subiste todas las carpetas (css, icons, js y pruebas) y vuelve a cargar la página.';
      raiz.appendChild(p);
    }
    if (window.console) console.error(e);
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.iniciar);
  else App.iniciar();
}
