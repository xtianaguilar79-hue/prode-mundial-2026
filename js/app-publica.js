import { supabase } from "./supabase-config.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, 
  calcularPuntos, calcularPuntosCampeon,
  getKickoffTimestamp
} from "../datos-partidos.js";

let todosLosUsuarios = {};
let filtroGrupoActual = "";

function partidoEnJuego(partido) {
  const kickoff = getKickoffTimestamp(partido);
  const ahora = Date.now();
  const inicio = kickoff - (5 * 60 * 1000);
  const fin = kickoff + (110 * 60 * 1000);
  return ahora >= inicio && ahora <= fin;
}

async function cargarDatosCompletos() {
  try {
    // Cargar usuarios
    const { data: usuariosData, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*');

    if (usuariosError) throw usuariosError;

    const usuarios = {};
    usuariosData.forEach(u => { usuarios[u.id] = u; });
    todosLosUsuarios = usuarios;

    // Cargar predicciones (SOLO las reales, no las de prueba)
    const { data: predsData, error: predsError } = await supabase
      .from('predicciones')
      .select('*');

    if (predsError) throw predsError;

    // Cargar resultados (SOLO los reales, NO los de prueba)
    const { data: resData, error: resError } = await supabase
      .from('resultados')
      .select('*')
      .eq('es_prueba', false);  // ← IMPORTANTE: Filtrar resultados de prueba

    if (resError) throw resError;

    const resultados = {};
    resData.forEach(r => { resultados[r.partido_id] = r; });

    // Cargar campeones
    const { data: campeonesData, error: campeonesError } = await supabase
      .from('campeones')
      .select('*');

    if (campeonesError) throw campeonesError;

    const campeones = {};
    campeonesData.forEach(c => { campeones[c.user_id] = c; });

    // Cargar campeón real
    const { data: finalData, error: finalError } = await supabase
      .from('config')
      .select('*')
      .eq('id', 'final')
      .single();

    const resultadoFinal = !finalError ? finalData : null;
    const campeonReal = resultadoFinal?.campeon;

    // Calcular ranking
    const ranking = {};

    predsData.forEach(pred => {
      const res = resultados[pred.partido_id];
      const pts = res ? calcularPuntos(pred, res) : 0;

      if (!ranking[pred.user_id]) {
        const u = usuarios[pred.user_id] || {};
        ranking[pred.user_id] = {
          uid: pred.user_id,
          nombre: u.nombre || "Jugador",
          apellido: u.apellido || "",
          apodo: u.apodo || null,
          grupos: u.grupos || [],
          puntos: 0,
          puntosCampeon: 0,
          partidosPronosticados: 0,
          partidosAcertados: 0
        };
      }
      ranking[pred.user_id].puntos += pts;
      ranking[pred.user_id].partidosPronosticados += 1;
      if (pts > 0) ranking[pred.user_id].partidosAcertados += 1;
    });

    Object.entries(campeones).forEach(([uid, pred]) => {
      if (!ranking[uid]) {
        const u = usuarios[uid] || {};
        ranking[uid] = {
          uid,
          nombre: u.nombre || "Jugador",
          apellido: u.apellido || "",
          apodo: u.apodo || null,
          grupos: u.grupos || [],
          puntos: 0,
          puntosCampeon: 0,
          partidosPronosticados: 0,
          partidosAcertados: 0
        };
      }
      if (campeonReal) {
        ranking[uid].puntosCampeon = calcularPuntosCampeon(pred, campeonReal);
      }
    });

    Object.values(usuarios).forEach(u => {
      if (!ranking[u.id]) {
        ranking[u.id] = {
          uid: u.id,
          nombre: u.nombre,
          apellido: u.apellido || "",
          apodo: u.apodo || null,
          grupos: u.grupos || [],
          puntos: 0,
          puntosCampeon: 0,
          partidosPronosticados: 0,
          partidosAcertados: 0
        };
      }
    });

    const lista = Object.values(ranking).map(u => {
      const bonus = u.partidosPronosticados >= 104 ? 100 : 0;
      return { ...u, bonus, total: u.puntos + u.puntosCampeon + bonus };
    });

    let listaFiltrada = lista;
    if (filtroGrupoActual) {
      listaFiltrada = lista.filter(u => 
        u.grupos && u.grupos.includes(filtroGrupoActual)
      );
    }

    listaFiltrada.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.partidosAcertados !== a.partidosAcertados) return b.partidosAcertados - a.partidosAcertados;
      return b.puntosCampeon - a.puntosCampeon;
    });

    listaFiltrada.forEach((u, i) => u.pos = i + 1);

    return { lista: listaFiltrada, resultados, todosLosUsuarios: usuarios, totalUsuarios: usuariosData.length };
  } catch (err) {
    console.error("Error al cargar datos:", err);
    throw err;
  }
}

function actualizarSelectorGrupos(usuarios) {
  const gruposSet = new Set();
  Object.values(usuarios).forEach(u => {
    if (u.grupos && Array.isArray(u.grupos)) {
      u.grupos.forEach(g => gruposSet.add(g));
    }
  });

  const select = document.getElementById("filtroGrupo");
  const valorActual = select.value;
  
  select.innerHTML = '<option value="">🌍 Ranking General (todos los jugadores)</option>';
  
  Array.from(gruposSet).sort().forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = `👥 ${g}`;
    select.appendChild(opt);
  });

  select.value = valorActual;
  
  select.onchange = () => {
    filtroGrupoActual = select.value;
    cargarYRenderizar();
  };
}

function renderRanking(lista, totalUsuarios) {
  document.getElementById("rankingLoader").style.display = "none";
  document.getElementById("actualizado").textContent = "Actualizado: " + new Date().toLocaleTimeString();

  const jugadoresActivos = lista.filter(u => u.partidosPronosticados > 0);
  const hayActivos = jugadoresActivos.length > 0;

  if (!hayActivos) {
    document.getElementById("rankingTabla").style.display = "none";
    document.getElementById("top3").innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:50px 20px; background:var(--card); border-radius:var(--r-lg); border:1.5px solid var(--gold); box-shadow: 0 4px 24px rgba(255, 201, 60, 0.08);">
        <div style="font-size:70px; margin-bottom:16px;">🏆</div>
        <h3 style="color:var(--gold); font-family:'Anton'; font-size:clamp(24px, 4vw, 36px); margin-bottom:12px; letter-spacing:1px;">¡MUY PRONTO ARRANCA EL TORNEO!</h3>
        <p style="color:var(--text2); font-size:15px; max-width:450px; margin:0 auto 20px; line-height:1.6;">
          ${totalUsuarios > 0 
            ? `Ya hay <strong style="color:var(--gold)">${totalUsuarios}</strong> jugador${totalUsuarios === 1 ? '' : 'es'} registrado${totalUsuarios === 1 ? '' : 's'}. El ranking se activará cuando comience el Mundial.`
            : `El ranking se activará una vez que comience el Mundial y los jugadores carguen sus pronósticos.`}
        </p>
        <a href="login.html" class="btn" style="display:inline-block; width:auto; padding:12px 32px; text-decoration:none; font-size:14px;">🔐 Registrarme y pronosticar</a>
      </div>
    `;
    return;
  }

  document.getElementById("rankingTabla").style.display = "block";

  const top3Div = document.getElementById("top3");
  if (lista.length >= 3) {
    const orden = [1, 0, 2];
    const colores = ["p2", "p1", "p3"];
    const emojis = ["", "🥇", ""];
    
    top3Div.innerHTML = orden.map((idx, i) => {
      const u = lista[idx];
      if (!u) return "";
      return `
        <div class="top3-card ${colores[i]}">
          <div class="emoji">${emojis[i]}</div>
          <div class="nombre">${u.nombre} ${u.apellido}</div>
          ${u.apodo ? `<div style="font-size:11px; color:var(--text2); margin-bottom:4px">"${u.apodo}"</div>` : ""}
          <div class="pts">${u.total}</div>
          <div class="meta">${u.partidosPronosticados} partidos · ${u.partidosAcertados} acertados</div>
        </div>
      `;
    }).join("");
  } else {
    top3Div.innerHTML = "";
  }

  const tbody = document.getElementById("rankingBody");
  tbody.innerHTML = lista.map(u => {
    const claseFila = u.pos === 1 ? "top1" : u.pos === 2 ? "top2" : u.pos === 3 ? "top3" : "";
    const posText = u.pos <= 3 ? `<span class="pos-${u.pos}">${["🥇","","🥉"][u.pos-1]}</span>` : u.pos;
    const gruposHTML = u.grupos && u.grupos.length > 0 
      ? u.grupos.map(g => `<span style="display:inline-block; background:var(--bg3); padding:2px 6px; border-radius:4px; font-size:10px; margin:1px;">${g}</span>`).join("")
      : '<span style="color:var(--text3); font-size:11px;">—</span>';
    
    return `
      <tr class="${claseFila}">
        <td>${posText}</td>
        <td class="left">
          <strong>${u.nombre} ${u.apellido}</strong>
          ${u.apodo ? `<div style="font-size:11px; color:var(--text2);">"${u.apodo}"</div>` : ""}
        </td>
        <td style="font-size:11px;">${gruposHTML}</td>
        <td>${u.partidosPronosticados}/104</td>
        <td>${u.partidosAcertados}</td>
        <td>${u.puntosCampeon > 0 ? `<span style="color:var(--gold)">+${u.puntosCampeon}</span>` : "—"}</td>
        <td>${u.bonus > 0 ? `<span style="color:var(--green)">+${u.bonus}</span>` : "—"}</td>
        <td class="pts-total">${u.total}</td>
      </tr>
    `;
  }).join("");
}

function renderCardPartido(p, resultado, estado) {
  const flagL = FLAGS[p.local] || "🏳️";
  const flagV = FLAGS[p.visit] || "🏳️";
  
  let claseCard = "resultado-card";
  if (estado === "vivo") claseCard += " en-vivo";
  if (estado === "proximo") claseCard += " proximo";

  let liveBadge = "";
  if (estado === "vivo") {
    liveBadge = `<span class="live-badge">🔴 EN VIVO</span>`;
  }

  let marcadorHTML;
  if (resultado) {
    marcadorHTML = `
      <div class="marcador-final">${resultado.local} - ${resultado.visit}</div>
      <div class="marcador-hora">Finalizado</div>
    `;
  } else if (estado === "vivo") {
    marcadorHTML = `
      <div class="marcador-vs">VS</div>
      <div class="marcador-hora">${p.hora} ARG</div>
    `;
  } else {
    marcadorHTML = `
      <div class="marcador-vs">VS</div>
      <div class="marcador-hora">${p.fecha} · ${p.hora} ARG</div>
    `;
  }

  return `
    <div class="${claseCard}">
      <div class="resultado-meta">
        <span class="badge badge-id">${p.id}</span>
        ${p.grupo ? `<span class="badge badge-grupo">Grupo ${p.grupo}</span>` : ""}
        ${p.fase ? `<span class="badge badge-grupo">${p.fase.toUpperCase()}</span>` : ""}
        ${liveBadge}
        <span class="badge badge-fecha" style="margin-left:auto;">📍 ${p.sede}</span>
      </div>
      <div class="resultado-equipos">
        <div class="resultado-equipo">
          <span style="font-size:22px;">${flagL}</span>
          <span>${p.local}</span>
        </div>
        <div class="resultado-marcador">
          ${marcadorHTML}
        </div>
        <div class="resultado-equipo visitante">
          <span style="font-size:22px;">${flagV}</span>
          <span>${p.visit}</span>
        </div>
      </div>
    </div>
  `;
}

function renderResultados(resultados) {
  const cont = document.getElementById("resultadosContenido");
  document.getElementById("resultadosLoader").style.display = "none";

  if (Object.keys(resultados).length === 0) {
    cont.innerHTML = `
      <div style="text-align:center; padding:50px 20px; background:var(--card); border-radius:var(--r-lg); border:1px solid var(--border);">
        <div style="font-size:60px; margin-bottom:16px;">⏳</div>
        <h3 style="color:var(--gold); font-family:'Anton'; font-size:24px; margin-bottom:12px;">Los resultados se publicarán durante el torneo</h3>
        <p style="color:var(--text2); font-size:14px; max-width:450px; margin:0 auto;">
          Los resultados oficiales se cargarán en tiempo real a medida que se disputen los partidos.
        </p>
      </div>
    `;
    return;
  }

  const secciones = [
    { label: "Fase de Grupos · Fecha 1", partidos: PARTIDOS_GRUPOS.filter(p => p.j === 1) },
    { label: "Fase de Grupos · Fecha 2", partidos: PARTIDOS_GRUPOS.filter(p => p.j === 2) },
    { label: "Fase de Grupos · Fecha 3", partidos: PARTIDOS_GRUPOS.filter(p => p.j === 3) },
    { label: "Dieciseisavos de Final", partidos: PARTIDOS_ELIM.filter(p => p.fase === "16avos") },
    { label: "Octavos de Final", partidos: PARTIDOS_ELIM.filter(p => p.fase === "octavos") },
    { label: "Cuartos de Final", partidos: PARTIDOS_ELIM.filter(p => p.fase === "cuartos") },
    { label: "Semifinales", partidos: PARTIDOS_ELIM.filter(p => p.fase === "semis") },
    { label: "3er Puesto", partidos: PARTIDOS_ELIM.filter(p => p.fase === "3er") },
    { label: "🏆 Final", partidos: PARTIDOS_ELIM.filter(p => p.fase === "final") },
  ];

  let html = "";

  secciones.forEach(sec => {
    if (sec.partidos.length === 0) return;

    const vivos = sec.partidos.filter(p => partidoEnJuego(p) && !resultados[p.id]);
    const finalizados = sec.partidos.filter(p => resultados[p.id]);
    const proximos = sec.partidos.filter(p => !resultados[p.id] && !partidoEnJuego(p));

    if (finalizados.length === 0 && vivos.length === 0) return;

    const ordenados = [...vivos, ...finalizados];

    html += `<h3 class="seccion-titulo">${sec.label} <span style="font-size:12px; color:var(--text2); font-family:'DM Sans'; font-weight:400;">(${finalizados.length} finalizado${finalizados.length === 1 ? '' : 's'})</span></h3>`;
    html += `<div class="resultados-grid">`;
    
    ordenados.forEach(p => {
      const resultado = resultados[p.id];
      let estado = "finalizado";
      if (partidoEnJuego(p) && !resultado) estado = "vivo";
      
      html += renderCardPartido(p, resultado, estado);
    });

    html += `</div>`;
  });

  if (html === "") {
    cont.innerHTML = `
      <div style="text-align:center; padding:50px 20px; background:var(--card); border-radius:var(--r-lg); border:1px solid var(--border);">
        <div style="font-size:60px; margin-bottom:16px;">⏳</div>
        <h3 style="color:var(--gold); font-family:'Anton'; font-size:24px; margin-bottom:12px;">Los resultados se publicarán durante el torneo</h3>
        <p style="color:var(--text2); font-size:14px; max-width:450px; margin:0 auto;">
          Los resultados oficiales se cargarán en tiempo real a medida que se disputen los partidos.
        </p>
      </div>
    `;
  } else {
    cont.innerHTML = html;
  }
}

async function cargarYRenderizar() {
  try {
    const { lista, resultados, todosLosUsuarios: usuarios, totalUsuarios } = await cargarDatosCompletos();
    actualizarSelectorGrupos(usuarios);
    renderRanking(lista, totalUsuarios);
    renderResultados(resultados);
  } catch (err) {
    console.error(err);
    document.getElementById("rankingLoader").innerHTML = "<p style='color:var(--red)'>Error al cargar los datos</p>";
    document.getElementById("resultadosLoader").style.display = "none";
    document.getElementById("resultadosContenido").innerHTML = "<p style='color:var(--red); text-align:center; padding:30px;'>Error al cargar resultados</p>";
  }
}

cargarYRenderizar();
setInterval(cargarYRenderizar, 60000);