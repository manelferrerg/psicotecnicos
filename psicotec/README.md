# PsicoTec · Práctica psicotécnica

Web gratuita para practicar los formatos de las pruebas psicotécnicas de oposiciones y procesos de selección:

- **Razonamiento lógico y abstracto**: series de figuras, matrices de 3 × 3 y analogías de transformación.
- **Capacidad numérica**: series numéricas, operaciones y problemas cotidianos.

Cada vez que entras recibes ejercicios nuevos de tu nivel (0–10), generados al momento. No hay registro, publicidad, cookies, analítica ni servidor propio. Tu progreso se guarda solo en tu navegador.

> Resultados orientativos para practicar formatos. No es una prueba clínica ni un test validado, no mide la inteligencia y no permite compararte con otras personas.

---

## 1. Publicar la web en GitHub Pages (una vez, sin terminal)

Necesitas un Mac con Chrome o Safari y tu cuenta de GitHub. En los pasos, `TU-USUARIO` es tu nombre de usuario de GitHub (por ejemplo, `manelfego`).

1. **Descomprime** `psicotec.zip` con doble clic. Aparece una carpeta `psicotec`.
2. Entra en **github.com** con tu cuenta. Arriba a la derecha pulsa **+** → **New repository**.
3. En **Repository name** escribe `psicotec`. Marca **Public**. No marques ninguna otra casilla. Pulsa **Create repository**.
   - Si ya tienes un repositorio `psicotec` de una prueba anterior, llama al nuevo `psicotec-v2`. En los pasos siguientes, la dirección cambia en consecuencia.
4. En la página del repositorio vacío, pulsa el enlace **uploading an existing file**.
5. Abre la carpeta `psicotec` en el Finder y pulsa **⌘A** para seleccionar **todo su contenido**: las carpetas `css`, `icons`, `js` y `pruebas` y los archivos `index.html`, `README.md` y `DECISIONES.md`. **Arrastra la selección** a la ventana de GitHub. No arrastres la carpeta `psicotec` en sí.
6. Espera a que termine la subida y comprueba que la lista muestra las cuatro carpetas y `index.html`. Si solo aparecen archivos sueltos y faltan las carpetas, repite el paso 5 con Chrome.
7. Pulsa **Commit changes**.
8. Ve a **Settings** (arriba, en el repositorio) → **Pages** (menú izquierdo).
9. En **Build and deployment** → **Source**, elige **Deploy from a branch**. En **Branch**, elige `main` y la carpeta `/ (root)`. Pulsa **Save**.
10. Espera 1 o 2 minutos y recarga la página de **Pages**. Aparecerá **Your site is live at** `https://TU-USUARIO.github.io/psicotec/`. Esa es la dirección de tu app.

## 2. Comprobar que todo funciona

Abre esta dirección (en el Mac o en el iPhone):

`https://TU-USUARIO.github.io/psicotec/?test=1`

Tras unos segundos debe aparecer en verde **«Todo correcto: 60 de 60 comprobaciones superadas»**. Esta comprobación genera y revisa miles de ejercicios y prueba el guardado con datos simulados. **No toca tu progreso.**

## 3. Poner el icono del cerebro en el iPhone

1. Abre `https://TU-USUARIO.github.io/psicotec/` en **Safari**.
2. Pulsa el botón **Compartir** (en iOS 26, si no lo ves, pulsa primero **···**). Elige **Añadir a pantalla de inicio**.
3. Comprueba que aparece el **cerebro azul sobre fondo blanco** con el nombre **PsicoTec**. Pulsa **Añadir**.
4. En iOS 26 hay una opción **Abrir como app web**, que viene activada. **Déjala activada** y practica **siempre desde el icono**.

**Importante:** el icono funciona como una app aparte y **tiene su propio progreso, separado del de Safari**. Apple lo documenta así: las apps web de la pantalla de inicio no comparten el almacenamiento con el navegador. Si ya practicaste en Safari y quieres conservar ese progreso, pasa una copia así:

- En Safari, ve a **Datos** → **Descargar copia** y guarda el archivo en **Archivos**.
- Desde el icono, ve a **Datos** → **Importar progreso**, elige ese archivo y pulsa **Importar archivo**.

Si añadiste el icono antes de subir esta versión y ves otro dibujo, borra el icono y vuelve a añadirlo.

## 4. Cómo se usa

- **La primera vez** que entras en cada área haces una **prueba de nivel** de 15 preguntas (5 bloques de 3). Empieza en el nivel 3 y sube o baja según tus aciertos.
- **Cada sesión** tiene 12 ejercicios nuevos de tu nivel: 4 de cada tipo, sin dos del mismo tipo seguidos.
- **Subes un nivel** con 9 o más aciertos en dos sesiones seguidas del mismo nivel. **Bajas uno** con 6 o menos en dos seguidas.
- **Respuestas**: toca una opción. En un ordenador también puedes pulsar las teclas 1 a 4. Puedes **omitir** una pregunta.
- **Modo de tiempo** (en **Datos**):
  - **Práctica**: sin límite de tiempo.
  - **Contrarreloj**: tiempo límite por pregunta según el tipo y el nivel.
- **Resultados**: aciertos, errores, omitidas, tiempo y la **nota con penalización** (aciertos − errores ÷ 3). Las omitidas y los tiempos agotados no restan.
- **Revisión**: después de cada sesión verás todas las preguntas con la solución explicada y el error concreto de la opción que elegiste.
- Si cierras la app a mitad de una sesión, puedes **continuarla** durante 24 horas.

## 5. Tu progreso: copia, cambio de dispositivo y borrado

El progreso está **solo en este navegador** (en una única clave llamada `psicotec`), así que:

- **Exporta una copia** de vez en cuando desde **Datos** → **Descargar copia**. Guárdala, por ejemplo, en iCloud Drive. La app te lo recuerda cada 5 sesiones o 5 días.
- **Safari puede borrar los datos** de una web que no visitas en 7 días de uso del navegador.
- **Cada navegador, cada dispositivo y el icono del iPhone guardan su progreso por separado.** Para pasar el progreso de uno a otro: exportas en uno e importas en el otro.
- **Importar** sustituye el progreso actual, pero siempre puedes pulsar **Deshacer importación**.
- **Borrar mis datos** elimina solo la clave `psicotec`. Tus otras webs de `TU-USUARIO.github.io` no se tocan.

Si antes probaste otra versión de PsicoTec en la misma cuenta de GitHub, la app aprovecha los niveles que encuentre y archiva como incompletas las sesiones a medias. Si ves algo raro, ve a **Datos** → **Borrar mis datos**.

## 6. Actualizar a una versión nueva

Repite los pasos 4 a 7 del apartado 1 en el mismo repositorio. GitHub sustituye los archivos que tienen el mismo nombre. Tu progreso no se pierde porque está en tu navegador, no en GitHub. Espera un par de minutos y recarga.

## 7. Privacidad

- La app no envía tus resultados a ningún sitio y no carga nada de terceros.
- GitHub, que aloja la web, registra la dirección IP de quien la visita por motivos de seguridad. Ese registro es de GitHub, no de la app.

---

## Para quien programe

- **Web estática**: HTML, CSS y JavaScript sin dependencias. Los scripts son clásicos (no son módulos) y comparten un único objeto global, `App`. Por eso la app funciona también abriendo `index.html` desde el disco, aunque entonces el progreso se guarda en otro sitio.
- **Estructura**:
  - `js/config.js`: niveles, tiempos, umbrales y textos.
  - `js/areas/logico.js` y `js/areas/numerico.js`: generadores y solucionadores.
  - `js/sesion.js`, `js/seleccion.js`, `js/resultados.js`, `js/almacen.js` y `js/datos.js`: lógica de la app.
  - `js/ui.js`: vistas.
  - `js/autodiagnostico.js`: batería de pruebas que se usa en `?test=1` y en Node.
- **Pruebas**: `node pruebas/ejecutar.js` ejecuta comprobaciones estáticas y la misma batería que `?test=1`, con 200 ejercicios por tipo y nivel. Otras opciones:
  - `--muestras=1000`: más ejercicios por tipo y nivel.
  - `--regresiones`: regenera `pruebas/regresiones.js`.
  - `--espacio`: recalcula cuántos ejercicios distintos hay en cada nivel.
- **Si cambias un generador**:
  1. Sube su número en `VERSIONES_GENERADOR` (config.js). Las sesiones antiguas se conservan, pero no se mezclan en la gráfica.
  2. Ejecuta `node pruebas/ejecutar.js --espacio --regresiones`.
- **Añadir un área nueva**:
  1. Crea `js/areas/nueva.js`. Debe registrar el área con `App.Registro.registrarArea` y cada tipo con `App.Registro.registrarTipo`, indicando `generadorFn(nivel, semilla)` y `solucionadorFn(ejercicio)`.
  2. El generador devuelve el mismo objeto que los existentes. El solucionador debe deducir la respuesta solo con lo que se ve.
  3. Añade sus filas en `PARAMETROS_NIVELES`, `TIEMPOS_CONTRARRELOJ`, `VERSIONES_GENERADOR` y `ESPACIO_ESTIMADO`.
  4. Incluye el `<script>` en `index.html` antes de `js/sesion.js`.
  5. Añade el id del área a la lista `AREAS` de `js/almacen.js` y `js/datos.js`.
- Las decisiones de diseño y sus motivos están en `DECISIONES.md`.
