// ═══════════════════════════════════════════════════════
// 🏆 SISTEMA DE CLASIFICADOS Y CRUCES AUTOMÁTICOS
// ═══════════════════════════════════════════════════════

import { supabase } from "./supabase-config.js";
import { PARTIDOS_GRUPOS, PARTIDOS_ELIM, TODOS_PARTIDOS } from "../datos-partidos.js";

const GRUPOS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// ═══════════════════════════════════════════════════════
// 1. CALCULAR TABLA DE UN GRUPO
// ═══════════════════════════════════════════════════════

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
    if (!res || res.local === null || res.visit === null) return;

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

// ═══════════════════════════════════════════════════════
// 2. CALCULAR MEJORES TERCEROS
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// 3. OBTENER CLASIFICADOS DE FASE DE GRUPOS
// ═══════════════════════════════════════════════════════

export function obtenerClasificadosGrupos(resultados) {
  const clasificados = {};
  const mejoresTerceros = calcularMejoresTerceros(resultados);

  GRUPOS.forEach(grupo => {
    const tabla = calcularTablaGrupo(grupo, resultados);
    if (tabla[0]) clasificados[`1°${grupo}`] = tabla[0].equipo;
    if (tabla[1]) clasificados[`2°${grupo}`] = tabla[1].equipo;
  });

  mejoresTerceros.forEach((t, i) => {
    clasificados[`3°${i + 1}`] = t.equipo;
    clasificados[`3°${i + 1}-grupo`] = t.grupo;
  });

  return { clasificados, mejoresTerceros };
}

// ═══════════════════════════════════════════════════════
// 4. RESOLVER GANADOR DE UN PARTIDO
// ═══════════════════════════════════════════════════════

export function resolverGanador(partidoId, resultados) {
  const res = resultados[partidoId];
  if (!res || res.local === null || res.visit === null) return null;

  const gL = parseInt(res.local);
  const gV = parseInt(res.visit);

  if (gL > gV) return "local";
  if (gV > gL) return "visit";

  if (res.alargue_local !== null && res.alargue_visit !== null) {
    const alL = parseInt(res.alargue_local);
    const alV = parseInt(res.alargue_visit);
    if (alL > alV) return "local";
    if (alV > alL) return "visit";

    if (res.penales_local !== null && res.penales_visit !== null) {
      const penL = parseInt(res.penales_local);
      const penV = parseInt(res.penales_visit);
      if (penL > penV) return "local";
      if (penV > penL) return "visit";
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════
// 5. RESOLVER CRUCES DE 16AVOS
// ═══════════════════════════════════════════════════════

export function resolver16avos(clasificados) {
  const cruces = [
    { id: "M073", local: "2°A", visit: "2°B" },
    { id: "M074", local: "1°E", visit: "3°1" },
    { id: "M075", local: "1°F", visit: "2°C" },
    { id: "M076", local: "1°C", visit: "2°F" },
    { id: "M077", local: "1°I", visit: "3°2" },
    { id: "M078", local: "2°E", visit: "2°I" },
    { id: "M079", local: "1°A", visit: "3°3" },
    { id: "M080", local: "1°L", visit: "3°4" },
    { id: "M081", local: "1°D", visit: "3°5" },
    { id: "M082", local: "1°G", visit: "3°6" },
    { id: "M083", local: "2°K", visit: "2°L" },
    { id: "M084", local: "1°H", visit: "2°J" },
    { id: "M085", local: "1°B", visit: "3°7" },
    { id: "M086", local: "1°J", visit: "2°H" },
    { id: "M087", local: "1°K", visit: "3°8" },
    { id: "M088", local: "2°D", visit: "2°G" },
  ];

  return cruces.map(c => {
    let local = clasificados[c.local] || c.local;
    let visit = clasificados[c.visit] || c.visit;
    return { id: c.id, local, visit };
  });
}

// ═══════════════════════════════════════════════════════
// 6. RESOLVER TODAS LAS FASES ELIMINATORIAS
// ═══════════════════════════════════════════════════════

export function resolverEliminatorias(resultados, clasificadosGrupos) {
  const equipos = {};
  const partidosResueltos = {};

  // 16avos
  const cruces16 = resolver16avos(clasificadosGrupos);
  cruces16.forEach(c => {
    equipos[c.id] = { local: c.local, visit: c.visit };
    const ganador = resolverGanador(c.id, resultados);
    if (ganador) {
      partidosResueltos[c.id] = c[ganador === "local" ? "local" : "visit"];
    }
  });

  // Octavos
  const crucesOctavos = [
    { id: "M089", local: "M074", visit: "M077" },
    { id: "M090", local: "M073", visit: "M075" },
    { id: "M091", local: "M076", visit: "M078" },
    { id: "M092", local: "M079", visit: "M080" },
    { id: "M093", local: "M083", visit: "M084" },
    { id: "M094", local: "M081", visit: "M082" },
    { id: "M095", local: "M086", visit: "M088" },
    { id: "M096", local: "M085", visit: "M087" },
  ];

  crucesOctavos.forEach(c => {
    const local = partidosResueltos[c.local] || c.local;
    const visit = partidosResueltos[c.visit] || c.visit;
    equipos[c.id] = { local, visit };
    const ganador = resolverGanador(c.id, resultados);
    if (ganador) {
      partidosResueltos[c.id] = equipos[c.id][ganador === "local" ? "local" : "visit"];
    }
  });

  // Cuartos
  const crucesCuartos = [
    { id: "M097", local: "M089", visit: "M090" },
    { id: "M098", local: "M093", visit: "M094" },
    { id: "M099", local: "M091", visit: "M092" },
    { id: "M100", local: "M095", visit: "M096" },
  ];

  crucesCuartos.forEach(c => {
    const local = partidosResueltos[c.local] || c.local;
    const visit = partidosResueltos[c.visit] || c.visit;
    equipos[c.id] = { local, visit };
    const ganador = resolverGanador(c.id, resultados);
    if (ganador) {
      partidosResueltos[c.id] = equipos[c.id][ganador === "local" ? "local" : "visit"];
    }
  });

  // Semis
  const crucesSemis = [
    { id: "M101", local: "M097", visit: "M098" },
    { id: "M102", local: "M099", visit: "M100" },
  ];

  crucesSemis.forEach(c => {
    const local = partidosResueltos[c.local] || c.local;
    const visit = partidosResueltos[c.visit] || c.visit;
    equipos[c.id] = { local, visit };
    const ganador = resolverGanador(c.id, resultados);
    if (ganador) {
      partidosResueltos[c.id] = equipos[c.id][ganador === "local" ? "local" : "visit"];
    }
  });

  // 3er Puesto
  const perdedorSF1 = resolverGanador("M101", resultados) === "local" 
    ? equipos["M101"]?.visit : equipos["M101"]?.local;
  const perdedorSF2 = resolverGanador("M102", resultados) === "local"
    ? equipos["M102"]?.visit : equipos["M102"]?.local;
  
  equipos["M103"] = { 
    local: perdedorSF1 || "Perdedor SF1", 
    visit: perdedorSF2 || "Perdedor SF2" 
  };

  // Final
  const ganadorSF1 = partidosResueltos["M101"] || "Ganador SF1";
  const ganadorSF2 = partidosResueltos["M102"] || "Ganador SF2";
  equipos["M104"] = { local: ganadorSF1, visit: ganadorSF2 };

  return equipos;
}

// ═══════════════════════════════════════════════════════
// 7. FUNCIÓN PRINCIPAL: OBTENER PARTIDOS CON EQUIPOS REALES
// ═══════════════════════════════════════════════════════

export async function obtenerPartidosConEquiposReales() {
  try {
    const { data: resData } = await supabase
      .from('resultados')
      .select('*')
      .eq('es_prueba', false);

    const resultados = {};
    if (resData) resData.forEach(r => { resultados[r.partido_id] = r; });

    const partidosJugados = PARTIDOS_GRUPOS.filter(p => resultados[p.id]).length;
    const faseGruposCompleta = partidosJugados === PARTIDOS_GRUPOS.length;

    let equiposElim = {};

    if (faseGruposCompleta) {
      const { clasificados } = obtenerClasificadosGrupos(resultados);
      equiposElim = resolverEliminatorias(resultados, clasificados);
    } else {
      const { data: clasData } = await supabase
        .from('clasificados')
        .select('*');

      if (clasData && clasData.length > 0) {
        const clasificados = {};
        clasData.forEach(c => { clasificados[c.posicion] = c.equipo; });
        equiposElim = resolverEliminatorias(resultados, clasificados);
      }
    }

    return TODOS_PARTIDOS.map(p => {
      if (equiposElim[p.id]) {
        return {
          ...p,
          local: equiposElim[p.id].local || p.local,
          visit: equiposElim[p.id].visit || p.visit
        };
      }
      return p;
    });
  } catch (err) {
    console.error("❌ Error al obtener partidos con equipos reales:", err);
    return TODOS_PARTIDOS;
  }
}

// ═══════════════════════════════════════════════════════
// 8. VERIFICAR SI UN PARTIDO TIENE EQUIPOS REALES
// ═══════════════════════════════════════════════════════

export function tieneEquiposReales(partido) {
  if (partido.j) return true;
  
  const esPlaceholder = (equipo) => {
    return /°|G\d+|Ganador|Perdedor|Camp\.|3er|mejor|\d°/.test(equipo);
  };
  
  return !esPlaceholder(partido.local) && !esPlaceholder(partido.visit);
}