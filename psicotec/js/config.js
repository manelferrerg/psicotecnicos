/**
 * config.js - Parámetros editables de PsicoTec.
 * Todo lo que se puede ajustar sin tocar la lógica está aquí: niveles, umbrales, tiempos y textos.
 * Objeto global: App.CONFIG
 */

window.App = window.App || {};

App.CONFIG = {
  NOMBRE_APP: 'PsicoTec',
  NOMBRE_LARGO: 'PsicoTec · Práctica psicotécnica',
  VERSION_APP: '2.0.0',
  VERSION_FORMATO_STORAGE: 1,
  CLAVE_STORAGE: 'psicotec',
  MAX_HISTORIAL_PREGUNTAS: 300,
  PAUSA_INACTIVIDAD_HORAS: 24,
  TOPE_PREGUNTA_PRACTICA_MS: 10 * 60 * 1000,
  NIVEL_POR_DEFECTO: 3,

  PREGUNTAS_POR_SESION: 12,
  PREGUNTAS_POR_TIPO_SESION: 4,
  UMBRAL_ADVERTENCIA_POCOS_EJERCICIOS: 20,
  RECORDAR_EXPORTAR_SESIONES: 5,
  RECORDAR_EXPORTAR_DIAS: 5,

  NIVELACION: {
    TOTAL_BLOQUES: 5,
    PREGUNTAS_POR_BLOQUE: 3,
    NIVEL_INICIAL: 3,
    // Ajuste del nivel según los aciertos de cada bloque de 3 (índice = aciertos).
    AJUSTE_POR_ACIERTOS: [-2, -1, 0, 2]
  },

  EVOLUCION: {
    SESIONES_CONSECUTIVAS: 2,
    UMBRAL_SUBIR: 9,
    UMBRAL_BAJAR: 6
  },

  // Sube la versión de un generador cuando cambie de forma incompatible:
  // las sesiones antiguas se conservan, pero no se comparan con las nuevas.
  VERSIONES_GENERADOR: {
    figuras_series: 3,
    figuras_matrices: 3,
    figuras_analogias: 3,
    num_series: 3,
    num_operaciones: 3,
    num_problemas: 3
  },

  // Segundos por pregunta en el modo Contrarreloj (índice = nivel 0–10).
  TIEMPOS_CONTRARRELOJ: {
    figuras_series:    [45, 45, 45, 50, 55, 55, 60, 60, 65, 70, 70],
    figuras_matrices:  [45, 45, 50, 50, 60, 60, 70, 70, 80, 80, 90],
    figuras_analogias: [40, 40, 45, 45, 50, 50, 60, 60, 70, 70, 75],
    num_series:        [30, 30, 35, 40, 45, 50, 55, 55, 60, 65, 75],
    num_operaciones:   [20, 25, 30, 35, 45, 50, 55, 60, 70, 75, 90],
    num_problemas:     [40, 45, 60, 60, 75, 90, 90, 90, 100, 110, 120]
  },

  /*
   * Tabla de niveles de cada tipo. Cada fila es un nivel (0–10).
   * Las reglas «a|b» significan que se elige una de las dos al azar.
   */
  PARAMETROS_NIVELES: {
    // Series de figuras: reglas por atributo y número de figuras visibles.
    figuras_series: [
      { visibles: 5, reglas: ['progresion'], atributos: ['giro', 'elementos'], pasosGiro: [2, -2], pasosElementos: [1] },
      { visibles: 5, reglas: ['progresion'], atributos: ['giro', 'elementos'], pasosGiro: [1, -1], pasosElementos: [1, -1] },
      { visibles: 5, reglas: ['alternancia|ciclo3'], atributos: ['forma', 'giro', 'elementos'] },
      { visibles: 5, reglas: ['progresion', 'progresion'], atributos: ['giro', 'elementos'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { visibles: 5, reglas: ['progresion', 'alternancia|ciclo3'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { visibles: 4, reglas: ['progresion', 'alternancia|ciclo3'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { visibles: 5, reglas: ['ciclo3', 'progresion', 'alternancia'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { visibles: 4, reglas: ['ciclo3', 'progresion', 'alternancia'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { visibles: 5, reglas: ['progresion', 'alternancia', 'ciclo3'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 3, -3], pasosElementos: [1, -1] },
      { visibles: 5, reglas: ['progresion', 'progresion', 'alternancia', 'ciclo3'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 3, -3], pasosElementos: [1, -1] },
      { visibles: 4, reglas: ['progresion', 'progresion', 'alternancia', 'ciclo3'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 3, -3], pasosElementos: [1, -1] }
    ],

    // Matrices 3 × 3: reglas por filas. «aritmetica» añade una regla sobre el número de puntos.
    figuras_matrices: [
      { reglas: ['fila_constante'], atributos: ['forma', 'giro', 'elementos'] },
      { reglas: ['progresion'], atributos: ['giro', 'elementos'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { reglas: ['distribucion'], atributos: ['forma', 'elementos'] },
      { reglas: ['distribucion'], atributos: ['giro'] },
      { reglas: ['fila_constante', 'progresion'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { reglas: ['distribucion', 'progresion'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { reglas: ['fila_constante', 'progresion', 'distribucion'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { reglas: ['distribucion', 'distribucion', 'progresion'], atributos: ['forma', 'relleno', 'giro', 'elementos', 'tamano'], pasosGiro: [1, -1, 2, -2], pasosElementos: [1, -1] },
      { reglas: ['fila_constante', 'progresion', 'distribucion'], atributos: ['forma', 'relleno', 'giro', 'tamano'], pasosGiro: [1, -1, 2, -2], aritmetica: 'suma' },
      { reglas: ['fila_constante', 'progresion', 'distribucion'], atributos: ['forma', 'relleno', 'giro', 'tamano'], pasosGiro: [1, -1, 2, -2], aritmetica: 'resta' },
      { reglas: ['distribucion', 'distribucion', 'progresion'], atributos: ['forma', 'relleno', 'giro', 'tamano'], pasosGiro: [1, -1, 2, -2], aritmetica: 'suma|resta' }
    ],

    // Analogías: transformaciones que convierten A en B y que hay que aplicar a C.
    // cIgual: atributos en los que C coincide con A (cuantos menos, más difícil).
    figuras_analogias: [
      { transformaciones: 1, pool: ['giro90', 'giro180', 'elemento'], cIgual: ['giro', 'tamano', 'elementos'] },
      { transformaciones: 1, pool: ['giro90', 'giro180', 'elemento'], cIgual: ['tamano'] },
      { transformaciones: 1, pool: ['giro90', 'giro180', 'reflejo', 'elemento'], cIgual: ['tamano', 'elementos'] },
      { transformaciones: 1, pool: ['giro90', 'giro180', 'reflejo', 'elemento'], cIgual: [] },
      { transformaciones: 2, pool: ['giro90', 'giro180', 'reflejo', 'relleno', 'elemento'], cIgual: ['tamano'], ordenImporta: false },
      { transformaciones: 2, pool: ['giro90', 'giro180', 'reflejo', 'relleno', 'elemento'], cIgual: [], ordenImporta: false },
      { transformaciones: 2, pool: ['giro90', 'reflejo'], cIgual: ['tamano'], ordenImporta: true },
      { transformaciones: 2, pool: ['giro90', 'reflejo'], cIgual: [], ordenImporta: true, cGiroOpuesto: true },
      { transformaciones: 3, pool: ['giro90', 'giro180', 'reflejo', 'relleno', 'elemento'], cIgual: [], ordenImporta: false },
      { transformaciones: 3, pool: ['giro90', 'reflejo', 'relleno', 'elemento'], cIgual: [], ordenImporta: true },
      { transformaciones: 3, pool: ['giro90', 'reflejo', 'relleno', 'elemento'], cIgual: [], ordenImporta: true, cGiroOpuesto: true }
    ],

    // Series numéricas: reglas posibles en cada nivel y número de términos visibles.
    num_series: [
      { visibles: 5, reglas: ['aritmetica'], diferencia: [1, 5], creciente: true, maximo: 99 },
      { visibles: 5, reglas: ['aritmetica'], diferencia: [2, 10], creciente: true, maximo: 99 },
      { visibles: 5, reglas: ['aritmetica'], diferencia: [2, 12], creciente: false, maximo: 199 },
      { visibles: 5, reglas: ['geometrica'], razones: [2, 3, 4, 5], maximo: 9999 },
      { visibles: 6, reglas: ['segundo_orden'], maximo: 999 },
      { visibles: 6, reglas: ['intercalada'], maximo: 999 },
      { visibles: 6, reglas: ['geometrica_no_entera', 'lineal_ab'], maximo: 9999 },
      { visibles: 6, reglas: ['lineal_ab', 'intercalada_mixta'], maximo: 9999 },
      { visibles: 7, reglas: ['suma_dos_anteriores'], maximo: 9999 },
      { visibles: 6, reglas: ['suma_dos_anteriores', 'diferencias_geometricas'], maximo: 9999 },
      { visibles: 8, reglas: ['suma_dos_anteriores', 'diferencias_geometricas', 'intercalada_segundo_orden'], maximo: 9999 }
    ],

    // Operaciones: plantillas de expresión por nivel (ver numerico.js).
    num_operaciones: [
      { plantillas: ['suma_resta_1'], operaciones: 1 },
      { plantillas: ['suma_resta_2'], operaciones: 1 },
      { plantillas: ['prioridad_1'], operaciones: 2 },
      { plantillas: ['prioridad_2'], operaciones: 2 },
      { plantillas: ['parentesis_1'], operaciones: 3 },
      { plantillas: ['parentesis_division'], operaciones: 3 },
      { plantillas: ['porcentaje_simple', 'decimales_simple'], operaciones: 3 },
      { plantillas: ['porcentaje_decimales'], operaciones: 3 },
      { plantillas: ['fraccion_potencia'], operaciones: 4 },
      { plantillas: ['porcentajes_encadenados'], operaciones: 4 },
      { plantillas: ['fraccion_porcentajes'], operaciones: 4 }
    ],

    // Problemas: plantillas de enunciado por nivel (ver numerico.js).
    num_problemas: [
      { plantillas: ['compra_unitaria', 'receta_unitaria', 'trayecto_unitario'], pasos: 1, irrelevantes: 0 },
      { plantillas: ['compra_proporcion', 'receta_proporcion', 'impresora_proporcion'], pasos: 1, irrelevantes: 0 },
      { plantillas: ['descuento_envio', 'recargo_gestion'], pasos: 2, irrelevantes: 0 },
      { plantillas: ['dos_productos_descuento', 'menu_propina'], pasos: 2, irrelevantes: 0 },
      { plantillas: ['grifos_inversa', 'pintores_inversa'], pasos: 2, irrelevantes: 1 },
      { plantillas: ['operarios_incorporacion'], pasos: 3, irrelevantes: 1 },
      { plantillas: ['velocidad_media', 'mezcla_precio'], pasos: 3, irrelevantes: 0 },
      { plantillas: ['media_nueva_nota', 'media_tiempo_reparto'], pasos: 3, irrelevantes: 1 },
      { plantillas: ['rebajas_sucesivas'], pasos: 3, irrelevantes: 2 },
      { plantillas: ['subida_bajada_envio'], pasos: 4, irrelevantes: 2 },
      { plantillas: ['compra_lote_descuentos'], pasos: 4, irrelevantes: 2 }
    ]
  },

  /*
   * Número estimado de ejercicios distintos por tipo y nivel (0–10).
   * Lo calcula «pruebas/ejecutar.js --espacio» por muestreo; si se cambia un generador, se recalcula.
   */
  ESPACIO_ESTIMADO: {
    figuras_series: [6221, 6635, 99999, 8504, 99999, 99999, 99999, 99999, 99999, 99999, 99999],
    figuras_matrices: [99999, 99999, 99999, 99999, 99999, 99999, 99999, 99999, 99999, 99999, 99999],
    figuras_analogias: [81802, 99999, 99999, 99999, 99999, 99999, 99999, 99999, 99999, 99999, 99999],
    num_series: [250, 448, 657, 173, 480, 74136, 157, 1472, 500, 621, 9281],
    num_operaciones: [306, 8137, 2459, 20270, 65031, 14415, 5090, 1278, 5504, 324, 7766],
    num_problemas: [309, 685, 574, 1739, 3851, 6490, 1813, 30903, 952, 61648, 99999]
  },

  TEXTOS: {
    AVISO_RESULTADOS: 'Resultados orientativos para practicar formatos psicotécnicos. No es una prueba clínica, ni un diagnóstico, ni un test validado, ni una medida de inteligencia, y no permite compararte con otras personas.',
    AVISO_EFECTO_PRACTICA: 'Si mejoras con la práctica, lo normal es que se deba a que conoces mejor estos formatos y tienes más estrategia. No indica un cambio en tu inteligencia general.',
    AVISO_NIVELES: 'Los niveles 0–10 son una clasificación de diseño de esta app, no una escala calibrada con datos de personas.',
    AVISO_POCOS_EJERCICIOS: 'Quedan menos de 20 ejercicios nuevos estimados en este nivel para algún tipo. Pronto pueden aparecer repeticiones.',
    AVISO_REPETICION: 'Ya habías visto este ejercicio.',
    EXPLICACION_CRONOMETRO: 'El cronómetro es orientativo y se puede manipular. Se pausa al cambiar de pestaña o de aplicación.',
    AVISO_NOTA: 'Nota con la penalización habitual en muchas oposiciones: aciertos − errores ÷ 3. Las omitidas y los tiempos agotados no restan. Cada convocatoria fija su propia regla.'
  }
};
