/**
 * registro.js - Registro extensible de áreas y tipos de ejercicios psicotécnicos.
 * Objeto global: App.Registro
 */

window.App = window.App || {};

App.Registro = (function () {
  const areasMap = {};
  const tiposMap = {};
  const tiposPorAreaMap = {};

  /**
   * Registra una nueva área psicotécnica en el sistema.
   * @param {Object} area - Objeto con { id, nombre, descripcion, icono }
   */
  function registrarArea(area) {
    if (!area || !area.id) {
      throw new Error('El área debe incluir un identificador (id).');
    }
    areasMap[area.id] = {
      id: area.id,
      nombre: area.nombre || area.id,
      descripcion: area.descripcion || '',
      icono: area.icono || '📊'
    };
    if (!tiposPorAreaMap[area.id]) {
      tiposPorAreaMap[area.id] = [];
    }
  }

  /**
   * Registra un nuevo tipo de ejercicio para un área existente.
   * @param {Object} tipo - Objeto con { id, areaId, nombre, descripcion, generadorFn, solucionadorFn }
   */
  function registrarTipo(tipo) {
    if (!tipo || !tipo.id || !tipo.areaId) {
      throw new Error('El tipo debe incluir id y areaId.');
    }
    if (!areasMap[tipo.areaId]) {
      // Si el área no existe aún, se inicializa automáticamente
      registrarArea({ id: tipo.areaId, nombre: tipo.areaId });
    }
    tiposMap[tipo.id] = tipo;
    if (!tiposPorAreaMap[tipo.areaId].includes(tipo.id)) {
      tiposPorAreaMap[tipo.areaId].push(tipo.id);
    }
  }

  function obtenerAreas() {
    return Object.keys(areasMap).map(function (id) {
      return areasMap[id];
    });
  }

  function obtenerArea(areaId) {
    return areasMap[areaId] || null;
  }

  function obtenerTiposPorArea(areaId) {
    const ids = tiposPorAreaMap[areaId] || [];
    return ids.map(function (id) {
      return tiposMap[id];
    }).filter(Boolean);
  }

  function obtenerTipo(tipoId) {
    return tiposMap[tipoId] || null;
  }

  return {
    registrarArea: registrarArea,
    registrarTipo: registrarTipo,
    obtenerAreas: obtenerAreas,
    obtenerArea: obtenerArea,
    obtenerTiposPorArea: obtenerTiposPorArea,
    obtenerTipo: obtenerTipo
  };
})();
