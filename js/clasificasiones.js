// ═══════════════════════════════════════════════════════
// SISTEMA DE CLASIFICACIÓN AUTOMÁTICA
// ═══════════════════════════════════════════════════════

import { supabase } from "./supabase-config.js";
import { PARTIDOS_GRUPOS, PARTIDOS_ELIM, TODOS_PARTIDOS } from "../datos-partidos.js";

const GRUPOS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export const CRUCES_16AVOS = [
  { id: "M073", local: "2°A", visit: "2°B" },
  { id: "M074", local: "1°E", visit: "3° mejor" },
  { id: "M075", local: "1°F", visit: "2°C" },
  { id: "M076", local: "1°C", visit: "2°F" },
  { id: "M077", local: "1°I", visit: "3° mejor" },
  { id: "M078", local: "2°E", visit: "2°I" },
  { id: "M079", local: "1°A", visit: "3° mejor" },
  { id: "M080", local: "1°L", visit: "3° mejor" },
  { id: "M081", local: "1°D", visit: "3° mejor" },
  { id: "M082", local: "1°G", visit: "3° mejor" },
  { id: "M083", local: "2°K", visit: "2°L" },
  { id: "M084", local: "1°H", visit: "2°J" },
  { id: "M085", local: "1°B", visit: "3° mejor" },
  { id: "M086", local: "1°J", visit: "2°H" },
  { id: "M087", local: "1°K", visit: "3° mejor" },
  { id: "M088", local: "2°D", visit: "2°G" },
];

export function calcularTablaGrupo(grupo, resultados) {
  const partidosGrupo = PARTIDOS_GRUPOS.filter(p => p.grupo === grupo);
  const tabla = {};

  partidosGrupo.forEach(p => {
    if (!tabla[p.local]) {
      tabla[p.local] = { equipo: p.local, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
    }
    if (!tabla[p.visit]) {
      tabla[p.visit] = { equipo: p.visit, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
    }
  });

  partidosGrupo.forEach(p => {
    const res = resultados[p.id];
    if (!res) return;

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

  Object.values(tabla).forEach(t => { t.dg = t.gf - t.gc; });

  return Object.values(tabla).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.equipo.localeCompare(b.equipo);
  });
}

export function faseGruposCompleta(resultados) {
  const partidosJugados = PARTIDOS_GRUPOS.filter(p => resultados[p.id]).length;
  return partidosJugados === PARTIDOS_GRUPOS.length;
}

export function calcularMejoresTerceros(resultados) {
  const terceros = [];

  GRUPOS.forEach(grupo => {
    const tabla = calcularTablaGrupo(grupo, resultados);
    if (tabla.length >= 3) {
      terceros.push({ ...tabla[2], grupo });
    }
  });

  return terceros.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.equipo.localeCompare(b.equipo);
  }).slice(0, 8);
}

export function calcularClasificados16avos(resultados) {
  if (!faseGruposCompleta(resultados)) {
    return { completo: false, clasificados: [] };
  }

  const clasificados = {};

  GRUPOS.forEach(grupo => {
    const tabla = calcularTablaGrupo(grupo, resultados);
    clasificados[`1°${grupo}`] = tabla[0].equipo;
    clasificados[`2°${grupo}`] = tabla[1].equipo;
  });

  const mejoresTerceros = calcularMejoresTerceros(resultados);
  
  mejoresTerceros.forEach((tercero, idx) => {
    clasificados[`3°mejor-${idx}`] = tercero.equipo;
    clasificados[`3°mejor-${idx}-grupo`] = tercero.grupo;
  });

  return { completo: true, clasificados };
}

export function resolverCruces16avos(clasificados) {
  const mejoresTerceros = Object.entries(clasificados)
    .filter(([k]) => k.startsWith("3°mejor-") && !k.endsWith("-grupo"))
    .map(([k, equipo]) => ({
      equipo,
      grupo: clasificados[`${k}-grupo`]
    }));

  const partidos16 = CRUCES_16AVOS.map(cruce => {
    let local = cruce.local;
    let visit = cruce.visit;

    if (local === "3° mejor" && mejoresTerceros.length > 0) {
      local = mejoresTerceros.shift().equipo;
    }
    if (visit === "3° mejor" && mejoresTerceros.length > 0) {
      visit = mejoresTerceros.shift().equipo;
    }

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

export function resolverGanador(partidoId, resultados) {
  const res = resultados[partidoId];
  if (!res) return null;

  const gL = parseInt(res.local);
  const gV = parseInt(res.visit);

  if (gL === gV) {
    if (res.alargue_local !== null && res.alargue_visit !== null && 
        res.alargue_local !== undefined && res.alargue_visit !== undefined) {
      const alL = parseInt(res.alargue_local);
      const alV = parseInt(res.alargue_visit);
      if (alL > alV) return "local";
      if (alV > alL) return "visit";
      
      if (res.penales_local !== null && res.penales_visit !== null &&
          res.penales_local !== undefined && res.penales_visit !== undefined) {
        const penL = parseInt(res.penales_local);
        const penV = parseInt(res.penales_visit);
        if (penL > penV) return "local";
        if (penV > penL) return "visit";
      }
    }
    return null;
  }

  return gL > gV ? "local" : "visit";
}

export function resolverCrucesEliminatorios(resultados) {
  const partidosActualizados = {};

  // Octavos
  PARTIDOS_ELIM.filter(p => p.fase === "octavos").forEach(p => {
    const idLocal = p.local.replace("G", "");
    const idVisit = p.visit.replace("G", "");
    const ganLocal = resolverGanador(idLocal, resultados);
    const ganVisit = resolverGanador(idVisit, resultados);
    
    if (ganLocal && ganVisit) {
      const partidoOrigLocal = TODOS_PARTIDOS.find(x => x.id === idLocal);
      const partidoOrigVisit = TODOS_PARTIDOS.find(x => x.id === idVisit);
      
      if (partidoOrigLocal && partidoOrigVisit) {
        const equipoLocal = ganLocal === "local" ? partidoOrigLocal.local : partidoOrigLocal.visit;
        const equipoVisit = ganVisit === "local" ? partidoOrigVisit.local : partidoOrigVisit.visit;
        partidosActualizados[p.id] = { local: equipoLocal, visit: equipoVisit };
      }
    }
  });

  // Cuartos
  PARTIDOS_ELIM.filter(p => p.fase === "cuartos").forEach(p => {
    const idLocal = p.local.replace("G", "");
    const idVisit = p.visit.replace("G", "");
    const ganLocal = resolverGanador(idLocal, resultados);
    const ganVisit = resolverGanador(idVisit, resultados);
    
    if (ganLocal && ganVisit) {
      const origLocal = partidosActualizados[idLocal] || 
                       TODOS_PARTIDOS.find(x => x.id === idLocal);
      const origVisit = partidosActualizados[idVisit] || 
                       TODOS_PARTIDOS.find(x => x.id === idVisit);
      
      if (origLocal && origVisit) {
        const equipoLocal = ganLocal === "local" ? origLocal.local : origLocal.visit;
        const equipoVisit = ganVisit === "local" ? origVisit.local : origVisit.visit;
        partidosActualizados[p.id] = { local: equipoLocal, visit: equipoVisit };
      }
    }
  });

  // Semis
  PARTIDOS_ELIM.filter(p => p.fase === "semis").forEach(p => {
    const idLocal = p.local.replace("G", "");
    const idVisit = p.visit.replace("G", "");
    const ganLocal = resolverGanador(idLocal, resultados);
    const ganVisit = resolverGanador(idVisit, resultados);
    
    if (ganLocal && ganVisit) {
      const origLocal = partidosActualizados[idLocal] || 
                       TODOS_PARTIDOS.find(x => x.id === idLocal);
      const origVisit = partidosActualizados[idVisit] || 
                       TODOS_PARTIDOS.find(x => x.id === idVisit);
      
      if (origLocal && origVisit) {
        const equipoLocal = ganLocal === "local" ? origLocal.local : origLocal.visit;
        const equipoVisit = ganVisit === "local" ? origVisit.local : origVisit.visit;
        partidosActualizados[p.id] = { local: equipoLocal, visit: equipoVisit };
      }
    }
  });

  // Final
  const final = PARTIDOS_ELIM.find(p => p.fase === "final");
  if (final) {
    const idLocal = final.local.replace("G", "");
    const idVisit = final.visit.replace("G", "");
    const ganLocal = resolverGanador(idLocal, resultados);
    const ganVisit = resolverGanador(idVisit, resultados);
    
    if (ganLocal && ganVisit) {
      const origLocal = partidosActualizados[idLocal] || 
                       TODOS_PARTIDOS.find(x => x.id === idLocal);
      const origVisit = partidosActualizados[idVisit] || 
                       TODOS_PARTIDOS.find(x => x.id === idVisit);
      
      if (origLocal && origVisit) {
        const equipoLocal = ganLocal === "local" ? origLocal.local : origLocal.visit;
        const equipoVisit = ganVisit === "local" ? origVisit.local : origVisit.visit;
        partidosActualizados[final.id] = { local: equipoLocal, visit: equipoVisit };
      }
    }
  }

  // 3er puesto
  const tercerPuesto = PARTIDOS_ELIM.find(p => p.fase === "3er");
  if (tercerPuesto) {
    const semis = PARTIDOS_ELIM.filter(p => p.fase === "semis");
    const perdedores = [];
    
    semis.forEach(semi => {
      const ganador = resolverGanador(semi.id, resultados);
      if (ganador) {
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
// FUNCIÓN PRINCIPAL: ACTUALIZAR Y GUARDAR EN SUPABASE
// ═══════════════════════════════════════════════════════

export async function actualizarEquiposEliminatorias() {
  try {
    const { data: resData, error } = await supabase
      .from('resultados')
      .select('*');

    if (error) throw error;

    const resultados = {};
    resData.forEach(r => { resultados[r.partido_id] = r; });

    let partidosActualizados = {};

    // Si fase de grupos está completa, calcular clasificados a 16avos
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
          const { error: upsertError } = await supabase
            .from('clasificados')
            .upsert(registros, { onConflict: 'posicion' });
          
          if (upsertError) {
            console.error("Error al guardar clasificados:", upsertError);
          } else {
            console.log("✅ Clasificados guardados en Supabase");
          }
        }

        // Resolver cruces de 16avos
        const cruces16 = resolverCruces16avos(clasificados);
        partidosActualizados = Object.fromEntries(
          cruces16.map(p => [p.id, { local: p.local, visit: p.visit }])
        );
        
        console.log("✅ Cruces de 16avos resueltos:", partidosActualizados);
      }
    }

    // Resolver cruces de octavos en adelante
    const partidosElim = resolverCrucesEliminatorios(resultados);
    partidosActualizados = { ...partidosActualizados, ...partidosElim };
    
    if (Object.keys(partidosElim).length > 0) {
      console.log("✅ Partidos eliminatorios actualizados:", partidosElim);
    }

    return {
      fase: faseGruposCompleta(resultados) ? "16avos" : "grupos",
      partidosActualizados
    };

  } catch (err) {
    console.error("❌ Error al actualizar equipos:", err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════
// LEER EQUIPOS DESDE SUPABASE (PARA VISTAS)
// ═══════════════════════════════════════════════════════

export async function obtenerPartidosConEquiposReales() {
  try {
    // Primero intentar leer desde la tabla clasificados
    const { data: clasificadosData, error: clasError } = await supabase
      .from('clasificados')
      .select('*');

    let clasificados = {};
    if (!clasError && clasificadosData && clasificadosData.length > 0) {
      clasificadosData.forEach(c => {
        clasificados[c.posicion] = c.equipo;
      });
      console.log("✅ Clasificados leídos desde Supabase:", clasificados);
    }

    // Cargar resultados
    const { data: resData, error: resError } = await supabase
      .from('resultados')
      .select('*');

    if (resError) throw resError;

    const resultados = {};
    resData.forEach(r => { resultados[r.partido_id] = r; });

    let partidosActualizados = {};

    // Si hay clasificados, resolver cruces de 16avos
    if (Object.keys(clasificados).length > 0) {
      const cruces16 = resolverCruces16avos(clasificados);
      partidosActualizados = Object.fromEntries(
        cruces16.map(p => [p.id, { local: p.local, visit: p.visit }])
      );
    }

    // Resolver cruces de octavos en adelante
    const partidosElim = resolverCrucesEliminatorios(resultados);
    partidosActualizados = { ...partidosActualizados, ...partidosElim };

    // Reemplazar en TODOS_PARTIDOS
    return TODOS_PARTIDOS.map(p => {
      if (partidosActualizados[p.id]) {
        return { ...p, ...partidosActualizados[p.id] };
      }
      return p;
    });
  } catch (err) {
    console.error("❌ Error al obtener partidos con equipos reales:", err);
    return TODOS_PARTIDOS;
  }
}