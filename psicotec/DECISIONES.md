# DECISIONES.md

Qué se decidió en PsicoTec 2.0.0, por qué, y en qué se aparta de la especificación. También recoge qué fallos tenían las dos propuestas anteriores (A = `psicotec.zip`, B = `psicotec_revisado.zip`).

## 1. Por qué se rehicieron los generadores

Se midieron las dos propuestas con miles de ejercicios por tipo y nivel. El código base es el de B, por estar más completo, pero los seis generadores, los solucionadores y la batería de pruebas se escribieron de nuevo.

| Fallo medido | A | B |
|---|---|---|
| Analogías: se acierta eligiendo la única opción con la forma de C | — | 74,4 % |
| Series de figuras con tamaño fijo: solo una opción tiene ese tamaño | — | 100 % |
| Series de niveles 6–10: se resuelven mirando un solo atributo | 100 % | 89,1 % |
| Matrices de distribución (niveles 2–3): la respuesta repite una forma que ya está en la fila 3 | — | 64,3 % |
| Matrices de suma (niveles 8–9): filas sin regla coherente (p. ej., «1, 2, 2 · 2, 3, 4 · 3, 4, ?») | sí | sí |
| Problemas de niveles 4–5: el texto dice «el doble», pero el cálculo usa ×3 | — | 47,3 % |
| Problemas que anuncian «dato irrelevante» en el propio enunciado | — | sí |
| Operaciones que se anulan solas (× 4 ÷ 4) o con notación ambigua («(163 − 20 %) − 25 %») | — | sí |
| Series numéricas enteras con distractoras decimales (se descartan solas) | — | sí |
| Etiquetas de error que no corresponden al valor (p. ej., «desvío por defecto» en una opción mayor que la correcta) | sí | — |

«—» significa que el fallo no aparece o que la medida no es aplicable a esa propuesta.

## 2. Cómo se garantiza la calidad de cada ejercicio

- **Solución única deducida solo con lo visible.** Cada tipo tiene un solucionador que no conoce la regla con la que se generó el ejercicio:
  - **Figuras y series numéricas**: prueba una familia cerrada de reglas. Si alguna regla de la familia da otra respuesta, el ejercicio se descarta.
  - **Operaciones**: lee y calcula el texto que se muestra.
  - **Problemas**: extrae los números del enunciado y aplica el planteamiento.
  - En la batería, el solucionador recibe una copia sin marcas de opción correcta.
- **Pruebas mínimas en las series numéricas**:
  - Aritmética y geométrica: al menos 3 términos.
  - Segundo orden, «a·x + b», suma de los dos anteriores y diferencias geométricas: al menos 4 términos.
  - Intercaladas: cada subserie debe seguir por sí sola una regla simple.
- **Figuras con banderita.** Cada figura lleva una banderita asimétrica, así que cualquier giro o reflejo es visible, incluso en el círculo. El rayado gira con la figura, como ocurriría con un objeto real.
- **Distractoras de figuras sin pistas**:
  - Solo cambian atributos que la regla hace variar. Lo que el enunciado muestra fijo es igual en las cuatro opciones; la batería lo comprueba.
  - Con 2 a 4 atributos variables se usan **diseños equilibrados**: en cada atributo, el valor correcto aparece en dos opciones y el erróneo en otras dos. Así, «votar el valor más repetido» acierta solo el 25 %.
  - Con un solo atributo variable, el rango de la correcta (mayor, menor, intermedia) se reparte al azar.
  - Si la correcta no copia ninguna figura del enunciado, como mucho una distractora puede copiarla. Así, «descartar lo que ya aparece» deja de servir.
- **Distractoras numéricas**:
  - Cada una nace de un error concreto y lleva su etiqueta, que se muestra en la revisión.
  - Si la respuesta es entera, todas lo son. Si es positiva, todas lo son. Ninguna tiene más de 2 decimales.
  - El rango de la correcta se reparte al azar.
- **Atajos medidos.** La batería prueba atajos que no requieren razonar y exige que ninguno supere el 35 % en ningún tipo (con todos los niveles juntos), ni el 40 % en ningún nivel concreto (para absorber el ruido de muestreo con 200 ejercicios). El azar acierta el 25 %.
  - **En figuras**: votar, elegir la más distinta, la de mayor o menor valor en cada atributo, y descartar copias.
  - **En opciones numéricas**: la menor, la mayor, la segunda o tercera, la más cercana a la media, la de paridad distinta, la única entera o decimal, y los múltiplos de 5.
  - **Resultado con 1.000 ejercicios por tipo y nivel**: el peor atajo en un nivel concreto acierta el 34,9 %; con todos los niveles juntos, el peor acierta el 29,3 %.
- **Identificadores canónicos legibles.**
  - Figuras: se construyen con lo que se ve, no con los parámetros internos. Dos ejercicios visualmente iguales tienen el mismo identificador.
  - Series numéricas: los términos.
  - Operaciones: el texto.
  - Problemas: la plantilla y sus números.
  - El nivel forma parte del identificador porque lo ya visto se cuenta por tipo y nivel.

## 3. Desviaciones de la especificación

1. **Analogías: el relleno nunca es la única transformación.** Con un solo cambio de relleno, «el siguiente relleno» y «el relleno de B» pueden dar respuestas distintas. Cuando el relleno forma parte de una combinación, C tiene el mismo relleno que A, así que ambas lecturas coinciden.
2. **Analogías de niveles 0–1**: solo giro de 90°, giro de 180° o un punto más/menos. Son las transformaciones más fáciles de percibir.
3. **Analogías con reflejo**: C mantiene el giro de A o el opuesto (180°). Solo así el cambio «visto desde fuera» y «visto desde la propia figura» coinciden y no hay dos respuestas válidas.
4. **Series numéricas de nivel 10**: 8 términos visibles para «intercalada de segundo orden» (cada subserie necesita 4 términos de prueba) y 7 para el resto, para no superar 9.999.
5. **Puntos (elementos) de 1 a 8.** Con más de 8, contar en pantalla pequeña es una prueba de vista, no de razonamiento.
6. **Tiempo agotado no penaliza.** En la nota (aciertos − errores ÷ 3) cuenta como omitida: no hubo respuesta errónea.
7. **Memoria de ejercicios vistos: últimas 300 respuestas.** Mantiene el almacenamiento pequeño. Con 4 preguntas por tipo y sesión, son hasta 100 por tipo y nivel, menos que el espacio más pequeño medido (157).
8. **Sin manifest ni modo «pantalla completa» forzado.** El icono del iPhone se consigue con `apple-touch-icon` (PNG opaco de 180 × 180 px, fondo blanco) y el nombre con `apple-mobile-web-app-title`.
   - No se añadió un manifest para no imponer el modo app ni cambiar el comportamiento de almacenamiento.
   - Verificado en la documentación de Apple (WWDC23): las apps web de la pantalla de inicio tienen cookies y almacenamiento separados de Safari, y el almacenamiento local no se copia al crearlas.
   - En iOS 26 la opción «Abrir como app web» viene activada por defecto. El README lo explica y da un único camino: practicar siempre desde el icono y, si hace falta, exportar e importar.
9. **El icono de la cabecera** es el mismo cerebro a 28 px, junto al nombre, sin animaciones. Sirve además como botón para volver al inicio.
10. **Tiempos de Contrarreloj que crecen con el nivel.** Un ejercicio con más reglas necesita más tiempo de proceso. Reducir el tiempo a la vez que se sube la dificultad mezclaría dos variables. Son valores de diseño, no normativos:

| Tipo | Nivel 0 | Nivel 5 | Nivel 10 |
|---|---:|---:|---:|
| Series de figuras | 45 s | 55 s | 70 s |
| Matrices 3 × 3 | 45 s | 60 s | 90 s |
| Analogías | 40 s | 50 s | 75 s |
| Series numéricas | 30 s | 50 s | 75 s |
| Operaciones | 20 s | 50 s | 90 s |
| Problemas | 40 s | 90 s | 120 s |

## 4. Variedad: ejercicios distintos por tipo y nivel

El número se estimó con 4.000 muestras por tipo y nivel y el estimador Chao1, que es conservador. 99.999 significa «más de 99.999». La app usa esta tabla para avisar cuando quedan menos de 20 ejercicios nuevos estimados.

| Tipo | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Series de figuras | 6.221 | 6.635 | >99.999 | 8.504 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 |
| Matrices | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 |
| Analogías | 81.802 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 | >99.999 |
| Series numéricas | 250 | 448 | 657 | 173 | 480 | 74.136 | 157 | 1.472 | 500 | 621 | 9.281 |
| Operaciones | 306 | 8.137 | 2.459 | 20.270 | 65.031 | 14.415 | 5.090 | 1.278 | 5.504 | 324 | 7.766 |
| Problemas | 309 | 685 | 574 | 1.739 | 3.851 | 6.490 | 1.813 | 30.903 | 952 | 61.648 | >99.999 |

Los niveles con menos variedad son las series numéricas de los niveles 3 y 6 (157–173) y operaciones y problemas de nivel 0 (unos 300). Aun así, dan para más de 35 sesiones por nivel sin repetir.

**Futuro banco verbal**: si se añade comprensión verbal con 4 preguntas por sesión y unas 25 sesiones por nivel sin repetir, harían falta unas 100 preguntas por nivel, es decir, unas **1.100 preguntas redactadas** para los 11 niveles.

## 5. Almacenamiento

- **Una sola clave**: `localStorage['psicotec']`, con formato 1.
  - Todas las webs de `TU-USUARIO.github.io` comparten origen, así que comparten almacenamiento y su cuota (unos 5 MB por origen, según MDN).
  - Por eso la app nunca llama a `localStorage.clear()` y solo borra su propia clave.
- **Tamaño medido**:
  - Unos 55 KB con 300 respuestas.
  - Unos 330 bytes por sesión.
  - Unos 375 KB tras 1.000 sesiones, o el doble mientras exista la copia para deshacer una importación.
- **Guardado seguro**: si una escritura falla (cuota llena o el navegador lo impide), se conserva el estado anterior y se avisa.
  - Si el navegador no permite guardar (navegación privada estricta), la app funciona en memoria y lo advierte.
  - Si encuentra datos de un formato futuro, no los sobrescribe.
- **Importación estricta**:
  - Se valida campo a campo y nunca se inserta como HTML.
  - Las sesiones a medias no se importan ni se exportan.
  - Antes de sustituir, se guarda una copia para «Deshacer importación».
- **Datos de A o B en el mismo dominio**: usan la misma clave y el mismo formato. Se probó cargar datos de ambas propuestas: la app conserva niveles e historial, archiva como incompletas sus sesiones a medias (versión de generadores distinta) y no da errores.

## 6. Sesiones y niveles

- **Las sesiones guardan referencias** (tipo, nivel, semilla y versión), no ejercicios completos. Al reanudar se regenera exactamente la misma pregunta; la prueba en navegador lo comprobó.
- **Una sesión a medias caduca** a las 24 horas y queda archivada como incompleta, sin cambiar el nivel.
- **Si cambia la versión de un generador**, las sesiones a medias se archivan. Las completas se conservan, pero no se unen en la gráfica con las de la versión nueva.
- **Prueba de nivel**: empieza en el nivel 3, con 5 bloques de 3 preguntas. El ajuste por aciertos del bloque (0, 1, 2, 3) es −2, −1, 0, +2.
  - Simulación con 10.000 personas que responden al azar: el 97,3 % acaba en nivel 0 o 1.
  - Simulación con 10.000 personas que aciertan todo: el 100 % llega al nivel 10.
- **Evolución**: se sube con 9 o más aciertos en dos sesiones completas seguidas del mismo nivel y se baja con 6 o menos.
- **Orden de la sesión**: por rondas, con un ejercicio de cada tipo por ronda y nunca dos del mismo tipo seguidos.

## 7. Pruebas realizadas

- **Node (`node pruebas/ejecutar.js`)**: 74 de 74 comprobaciones superadas.
  - Sintaxis, rutas relativas, ausencia de recursos externos, ausencia de `fetch` y de `localStorage.clear()`.
  - `innerHTML` solo con SVG interno.
  - Icono de 180 × 180 opaco.
  - La batería completa (60 comprobaciones), con 13.200 ejercicios.
- **Navegador (Chromium sin pantalla, 360 px y 1.280 px)**: recorrido completo con prueba de nivel, sesión, resultados, revisión, historial, datos y privacidad en las dos áreas, más reanudación tras recargar y `?test=1`.
  - Sin errores de consola.
  - Sin desbordamiento horizontal.
  - Todos los botones de al menos 44 px de alto.
  - `localStorage` solo contiene `psicotec`.
- **No probado aquí**: Safari real en Mac y en iPhone. El README incluye las comprobaciones manuales.

## 8. Limitaciones conocidas

- El cronómetro es orientativo y se puede manipular.
- El progreso es independiente en cada navegador, cada dispositivo y el icono del iPhone. La copia exportada es la forma de moverlo y protegerlo.
- Safari puede borrar los datos de una web sin visitas durante 7 días de uso del navegador.
- Los niveles 0–10 son una clasificación de diseño, no una escala calibrada con datos de personas.
- La lista de áreas está escrita en `almacen.js` y `datos.js`. Añadir un área exige tocar esas dos líneas (ver README).
