// ═══════════════════════════════════════════════════════
// SISTEMA DE CLASIFICACIÓN AUTOMÁTICA
// ═══════════════════════════════════════════════════════

import { supabase } from "./supabase-config.js";
import { PARTIDOS_GRUPOS, PARTIDOS_ELIM, TODOS_PARTIDOS } from "../datos-partidos.js";

// Grupos del Mundial 2026
const GRUPOS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// Cruces predefinidos de 16avos (según FIFA)
export const CRUCES_16AVOS = [
  { id: "M073", local: "2°A", visit: "2°B" },
  { id: "M074", local: "1°E", visit: "3°mejor" },
  { id: "M075", local: "1°F", visit: "2°C" },
  { id: "M076", local: "1°C", visit: "2°F" },
  { id: "M077", local: "1°I", visit: "3°mejor" },
  { id: "M078", local: "2°E", visit: "2°I" },
  { id: "M079", local: "1°A", visit: "3°mejor" },
  { id: "M080", local: "1°L", visit: "3°mejor" },
  { id: "M081", local: "1°D", visit: "3°mejor" },
  { id: "M082", local: "1°G", visit: "3°mejor" },
  { id: "M083", local: "2°K", visit: "2°L" },
  { id: "M084", local: "1°H", visit: "2°J" },
  { id: "M085", local: "1°B", visit: "3°mejor" },
  { id: "M086", local: "1°J", visit: "2°H" },
  { id: "M087", local: "1°K", visit: "3°mejor" },
  { id: "M088", local: "2°D", visit: "2°G" },
];

// ═══════════════════════════════════════════════════════
// CALCULAR TABLA DE POSICIONES DE UN GRUPO
// ═══════════════════════════════════════════════════════

export function calcularTablaGrupo(grupo, resultados) {
  const partidosGrupo = PARTIDOS_GRUPOS.filter(p => p.grupo === grupo);
  const tabla = {};

  // Inicializar equipos
  partidosGrupo.forEach(p => {
    if (!tabla[p.local]) {
      tabla[p.local] = { equipo: p.local, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
    }
    if (!tabla[p.visit]) {
      tabla[p.visit] = { equipo: p.visit, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
    }
  });

  // Procesar resultados
  partidosGrupo.forEach(p => {
    const res = resultados[p.id];
    if (!res) return; // Partido no jugado aún

    const l = tabla[p.local];
    const v = tabla[p.visit];
    const gL = parseInt(res.local);
    const gV = parseInt(res.visit);

    l.pj++; v.pj++;
    l.gf += gL; l.gc += gV;
    v.gf += gV; v.gc += gL;

    if (gL > gV) {
      l.pg++; l.pts += 3;
      v.pp++;
    } else if (gL < gV) {
      v.pg++; v.pts += 3;
      l.pp++;
    } else {
      l.pe++; v.pe++;
      l.pts += 1; v.pts += 1;
    }
  });

  // Calcular diferencia de gol
  Object.values(tabla).forEach(t => { t.dg = t.gf - t.gc; });

  // Ordenar: pts > dg > gf
  return Object.values(tabla).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.equipo.localeCompare(b.equipo);
  });
}

// ═══════════════════════════════════════════════════════
// VERIFICAR SI LA FASE DE GRUPOS ESTÁ COMPLETA
// ═══════════════════════════════════════════════════════

export function faseGruposCompleta(resultados) {
  const partidosJugados = PARTIDOS_GRUPOS.filter(p => resultados[p.id]).length;
  return partidosJugados === PARTIDOS_GRUPOS.length;
}

// ═══════════════════════════════════════════════════════
// CALCULAR LOS 8 MEJORES TERCEROS
// ═══════════════════════════════════════════════════════

export function calcularMejoresTerceros(resultados) {
  const terceros = [];

  GRUPOS.forEach(grupo => {
    const tabla = calcularTablaGrupo(grupo, resultados);
    if (tabla.length >= 3) {
      terceros.push({ ...tabla[2], grupo });
    }
  });

  // Ordenar y tomar los 8 mejores
  return terceros.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.equipo.localeCompare(b.equipo);
  }).slice(0, 8);
}

// ═══════════════════════════════════════════════════════
// CALCULAR TODOS LOS CLASIFICADOS A 16AVOS
// ═══════════════════════════════════════════════════════

export function calcularClasificados16avos(resultados) {
  if (!faseGruposCompleta(resultados)) {
    return { completo: false, clasificados: [] };
  }

  const clasificados = {};

  // 1° y 2° de cada grupo
  GRUPOS.forEach(grupo => {
    const tabla = calcularTablaGrupo(grupo, resultados);
    clasificados[`1°${grupo}`] = tabla[0].equipo;
    clasificados[`2°${grupo}`] = tabla[1].equipo;
  });

  // 8 mejores terceros
  const mejoresTerceros = calcularMejoresTerceros(resultados);
  
  // Asignar posiciones "3°mejor" según el ranking
  // Según FIFA, los cruces dependen de qué grupos vienen los mejores 3°
  // Simplificación: asignar en orden de ranking
  mejoresTerceros.forEach((tercero, idx) => {
    clasificados[`3°mejor-${idx}`] = tercero.equipo;
    clasificados[`3°mejor-${idx}-grupo`] = tercero.grupo;
  });

  return { completo: true, clasificados };
}

// ═══════════════════════════════════════════════════════
// RESOLVER CRUCES DE 16AVOS CON EQUIPOS REALES
// ═══════════════════════════════════════════════════════

export function resolverCruces16avos(clasificados) {
  // Mapeo simplificado de cruces (según reglamento FIFA)
  // Los "3°mejor" se asignan según los grupos de donde vienen
  const mejoresTerceros = Object.entries(clasificados)
    .filter(([k]) => k.startsWith("3°mejor-") && !k.endsWith("-grupo"))
    .map(([k, equipo]) => ({
      equipo,
      grupo: clasificados[`${k}-grupo`]
    }));

  const partidos16 = CRUCES_16AVOS.map(cruce => {
    let local = cruce.local;
    let visit = cruce.visit;

    // Resolver "3°mejor"
    if (local === "3°mejor" && mejoresTerceros.length > 0) {
      local = mejoresTerceros.shift().equipo;
    }
    if (visit === "3°mejor" && mejoresTerceros.length > 0) {
      visit = mejoresTerceros.shift().equipo;
    }

    // Resolver posiciones directas (1°A, 2°B, etc.)
    if (clasificados[local]) local = clasificados[local];
    if (clasificados[visit]) visit = clasificados[visit];

    return {
      id: cruce.id,
      local,
      visit
    };
  });

  return partidos16;
}

// ═══════════════════════════════════════════════════════
// RESOLVER GANADORES DE PARTIDOS ANTERIORES
// ═══════════════════════════════════════════════════════

export function resolverGanador(partidoId, resultados) {
  const res = resultados[partidoId];
  if (!res) return null;

  const gL = parseInt(res.local);
  const gV = parseInt(res.visit);

  // Si es eliminatoria y hay empate, verificar alargue/penales
  if (gL === gV) {
    if (res.alargue_local !== null && res.alargue_visit !== null) {
      const alL = parseInt(res.alargue_local);
      const alV = parseInt(res.alargue_visit);
      if (alL > alV) return "local";
      if (alV > alL) return "visit";
      
      // Si también empate en alargue, ver penales
      if (res.penales_local !== null && res.penales_visit !== null) {
        const penL = parseInt(res.penales_local);
        const penV = parseInt(res.penales_visit);
        if (penL > penV) return "local";
        if (penV > penL) return "visit";
      }
    }
    return null; // No se puede determinar
  }

  return gL > gV ? "local" : "visit";
}

// ═══════════════════════════════════════════════════════
// RESOLVER CRUCES DE OCTAVOS EN ADELANTE
// ═══════════════════════════════════════════════════════

export function resolverCrucesEliminatorios(resultados) {
  const partidosActualizados = {};

  // Octavos (dependen de 16avos)
  PARTIDOS_ELIM.filter(p => p.fase === "octavos").forEach(p => {
    const ganLocal = resolverGanador(p.local.replace("G", ""), resultados);
    const ganVisit = resolverGanador(p.visit.replace("G", ""), resultados);
    
    if (ganLocal && ganVisit) {
      const partidoOrigLocal = TODOS_PARTIDOS.find(x => x.id === p.local.replace("G", ""));
      const partidoOrigVisit = TODOS_PARTIDOS.find(x => x.id === p.visit.replace("G", ""));
      
      if (partidoOrigLocal && partidoOrigVisit) {
        const equipoLocal = ganLocal === "local" ? partidoOrigLocal.local : partidoOrigLocal.visit;
        const equipoVisit = ganVisit === "local" ? partidoOrigVisit.local : partidoOrigVisit.visit;
        partidosActualizados[p.id] = { local: equipoLocal, visit: equipoVisit };
      }
    }
  });

  // Cuartos (dependen de octavos)
  PARTIDOS_ELIM.filter(p => p.fase === "cuartos").forEach(p => {
    const ganLocal = resolverGanador(p.local.replace("G", ""), resultados);
    const ganVisit = resolverGanador(p.visit.replace("G", ""), resultados);
    
    if (ganLocal && ganVisit) {
      const origLocal = partidosActualizados[p.local.replace("G", "")] || 
                       TODOS_PARTIDOS.find(x => x.id === p.local.replace("G", ""));
      const origVisit = partidosActualizados[p.visit.replace("G", "")] || 
                       TODOS_PARTIDOS.find(x => x.id === p.visit.replace("G", ""));
      
      if (origLocal && origVisit) {
        const equipoLocal = ganLocal === "local" ? origLocal.local : origLocal.visit;
        const equipoVisit = ganVisit === "local" ? origVisit.local : origVisit.visit;
        partidosActualizados[p.id] = { local: equipoLocal, visit: equipoVisit };
      }
    }
  });

  // Semis (dependen de cuartos)
  PARTIDOS_ELIM.filter(p => p.fase === "semis").forEach(p => {
    const ganLocal = resolverGanador(p.local.replace("G", ""), resultados);
    const ganVisit = resolverGanador(p.visit.replace("G", ""), resultados);
    
    if (ganLocal && ganVisit) {
      const origLocal = partidosActualizados[p.local.replace("G", "")] || 
                       TODOS_PARTIDOS.find(x => x.id === p.local.replace("G", ""));
      const origVisit = partidosActualizados[p.visit.replace("G", "")] || 
                       TODOS_PARTIDOS.find(x => x.id === p.visit.replace("G", ""));
      
      if (origLocal && origVisit) {
        const equipoLocal = ganLocal === "local" ? origLocal.local : origLocal.visit;
        const equipoVisit = ganVisit === "local" ? origVisit.local : origVisit.visit;
        partidosActualizados[p.id] = { local: equipoLocal, visit: equipoVisit };
      }
    }
  });

  // Final (depende de semis)
  const final = PARTIDOS_ELIM.find(p => p.fase === "final");
  if (final) {
    const ganLocal = resolverGanador(final.local.replace("G", ""), resultados);
    const ganVisit = resolverGanador(final.visit.replace("G", ""), resultados);
    
    if (ganLocal && ganVisit) {
      const origLocal = partidosActualizados[final.local.replace("G", "")] || 
                       TODOS_PARTIDOS.find(x => x.id === final.local.replace("G", ""));
      const origVisit = partidosActualizados[final.visit.replace("G", "")] || 
                       TODOS_PARTIDOS.find(x => x.id === final.visit.replace("G", ""));
      
      if (origLocal && origVisit) {
        const equipoLocal = ganLocal === "local" ? origLocal.local : origLocal.visit;
        const equipoVisit = ganVisit === "local" ? origVisit.local : origVisit.visit;
        partidosActualizados[final.id] = { local: equipoLocal, visit: equipoVisit };
      }
    }
  }

  // 3er puesto (perdedores de semis)
  const tercerPuesto = PARTIDOS_ELIM.find(p => p.fase === "3er");
  if (tercerPuesto) {
    const semis = PARTIDOS_ELIM.filter(p => p.fase === "semis");
    const perdedores = [];
    
    semis.forEach(semi => {
      const ganador = resolverGanador(semi.id, resultados);
      if (ganador) {
        const perdedor = ganador === "local" ? semi.visit : semi.local;
        // Resolver el equipo real del perdedor
        const origSemi = partidosActualizados[semi.id] || semi;
        const equipoPerdedor = ganador === "local" ? origSemi.visit : origSemi.local;
        if (equipoPerdedor) perdedores.push(equipoPerdedor);
      }
    });
    
    if (perdedores.length === 2) {
      partidosActualizados[tercerPuesto.id] = { local: perdedores[0], visit: perdedores[1] };
    }
  }

  return partidosActualizados;
}

// ═══════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: ACTUALIZAR TODOS LOS EQUIPOS
// ═══════════════════════════════════════════════════════

export async function actualizarEquiposEliminatorias() {
  try {
    // Cargar resultados
    const { data: resData, error } = await supabase
      .from('resultados')
      .select('*');

    if (error) throw error;

    const resultados = {};
    resData.forEach(r => { resultados[r.partido_id] = r; });

    // 1. Si fase de grupos está completa, calcular clasificados a 16avos
    if (faseGruposCompleta(resultados)) {
      const { completo, clasificados } = calcularClasificados16avos(resultados);
      
      if (completo) {
        // Guardar en tabla clasificados
        const registros = Object.entries(clasificados)
          .filter(([k]) => !k.endsWith("-grupo"))
          .map(([posicion, equipo]) => ({
            posicion,
            equipo,
            grupo: clasificados[`${posicion}-grupo`] || posicion.slice(-1)
          }));

        if (registros.length > 0) {
          await supabase.from('clasificados').upsert(registros, { onConflict: 'posicion' });
        }

        // Resolver cruces de 16avos
        const cruces16 = resolverCruces16avos(clasificados);
        console.log("✅ Cruces de 16avos resueltos:", cruces16);
        
        return {
          fase: "16avos",
          partidosActualizados: Object.fromEntries(cruces16.map(p => [p.id, { local: p.local, visit: p.visit }]))
        };
      }
    }

    // 2. Resolver cruces de octavos en adelante
    const partidosElim = resolverCrucesEliminatorios(resultados);
    console.log("✅ Partidos eliminatorios actualizados:", partidosElim);
    
    return {
      fase: "eliminatorias",
      partidosActualizados: partidosElim
    };

  } catch (err) {
    console.error("❌ Error al actualizar equipos:", err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════
// OBTENER PARTIDOS CON EQUIPOS REALES
// ═══════════════════════════════════════════════════════

export async function obtenerPartidosConEquiposReales() {
  try {
    const { partidosActualizados } = await actualizarEquiposEliminatorias();
    
    // Reemplazar en TODOS_PARTIDOS
    return TODOS_PARTIDOS.map(p => {
      if (partidosActualizados[p.id]) {
        return { ...p, ...partidosActualizados[p.id] };
      }
      return p;
    });
  } catch (err) {
    console.error(err);
    return TODOS_PARTIDOS;
  }
}