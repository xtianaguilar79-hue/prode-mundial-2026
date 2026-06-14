import { supabase } from "./supabase-config.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, 
  calcularPuntos, calcularPuntosCampeon,
  getKickoffTimestamp
} from "../datos-partidos.js";

console.log("📊 app-publica.js cargado");

let filtroGrupoActual = "";

// ══════════════════════════════════════════════════════
// DETECTAR ESTADO DEL PARTIDO
// ══════════════════════════════════════════════════════

function getEstadoPartido(partido, resultado) {
  if (resultado && resultado.estado) {
    if (resultado.estado === "vivo") {
      return { estado: "vivo", texto: "🔴 EN JUEGO" };
    }
    if (resultado.estado === "finalizado") {
      return { estado: "finalizado", texto: "Finalizado" };
    }
  }
  
  if (resultado && resultado.local !== null && resultado.local !== undefined) {
    return { estado: "finalizado", texto: "Finalizado" };
  }
  
  const kickoff = getKickoffTimestamp(partido);
  const ahora = Date.now();
  const finPartido = kickoff + (120 * 60 * 1000);
  
  if (ahora < kickoff) {
    return { estado: "proximo", texto: `${partido.fecha} · ${partido.hora} ARG` };
  }
  
  if (ahora < finPartido) {
    return { estado: "vivo", texto: "🔴 EN JUEGO" };
  }
  
  return { estado: "pendiente", texto: "⏳ Pendiente resultado oficial" };
}

// ══════════════════════════════════════════════════════
// CARGA DE DATOS
// ══════════════════════════════════════════════════════
async function cargarDatosCompletos() {
  try {
    const { data: usuariosData, error: usuariosError } = await supabase      .from('usuarios')
      .select('*');
    if (usuariosError) throw usuariosError;

    const usuarios = {};
    if (usuariosData) usuariosData.forEach(u => { usuarios[u.id] = u; });

    const { data: predsData, error: predsError } = await supabase
      .from('predicciones')
      .select('*');
    if (predsError) throw predsError;

    const { data: resData, error: resError } = await supabase
      .from('resultados')
      .select('*')
      .eq('es_prueba', false);
    if (resError) throw resError;

    const resultados = {};
    if (resData) resData.forEach(r => { resultados[r.partido_id] = r; });

    const { data: campeonesData, error: campeonesError } = await supabase
      .from('campeones')
      .select('*');
    if (campeonesError) throw campeonesError;

    const campeones = {};
    if (campeonesData) campeonesData.forEach(c => { campeones[c.user_id] = c; });

    const { data: finalData, error: finalError } = await supabase
      .from('config')
      .select('*')
      .eq('id', 'final')
      .single();
    const campeonReal = !finalError && finalData ? finalData.campeon : null;

    const ranking = {};

    if (predsData) {
      predsData.forEach(pred => {
        const res = resultados[pred.partido_id];
        const pts = res ? calcularPuntos(pred, res) : 0;

        if (!ranking[pred.user_id]) {
          const u = usuarios[pred.user_id] || {};
          ranking[pred.user_id] = {
            uid: pred.user_id,
            nombre: u.nombre || "Jugador",
            apellido: u.apellido || "",
            apodo: u.apodo || null,            grupos: u.grupos || [],
            puntos: 0,
            puntosCampeon: 0,
            partidosPronosticados: 0,
            partidosAcertados: 0,
            detallePartidos: []
          };
        }
        ranking[pred.user_id].puntos += pts;
        ranking[pred.user_id].partidosPronosticados += 1;
        if (pts > 0) ranking[pred.user_id].partidosAcertados += 1;
        
        if (res && res.local !== null && res.local !== undefined) {
          const partido = TODOS_PARTIDOS.find(p => p.id === pred.partido_id);
          if (partido) {
            ranking[pred.user_id].detallePartidos.push({
              partido: partido,
              prediccion: pred,
              resultado: res,
              puntos: pts
            });
          }
        }
      });
    }

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
          partidosAcertados: 0,
          detallePartidos: []
        };
      }
      if (campeonReal) {
        ranking[uid].puntosCampeon = calcularPuntosCampeon(pred, campeonReal);
      }
    });

    Object.values(usuarios).forEach(u => {
      if (!ranking[u.id]) {
        ranking[u.id] = {          uid: u.id,
          nombre: u.nombre,
          apellido: u.apellido || "",
          apodo: u.apodo || null,
          grupos: u.grupos || [],
          puntos: 0,
          puntosCampeon: 0,
          partidosPronosticados: 0,
          partidosAcertados: 0,
          detallePartidos: []
        };
      }
    });

    const lista = Object.values(ranking).map(u => {
      const bonus = u.partidosPronosticados >= 104 ? 100 : 0;
      return { ...u, bonus, total: u.puntos + u.puntosCampeon + bonus };
    });

    let listaFiltrada = lista;
    if (filtroGrupoActual) {
      listaFiltrada = lista.filter(u => u.grupos && u.grupos.includes(filtroGrupoActual));
    }

    listaFiltrada.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.partidosAcertados !== a.partidosAcertados) return b.partidosAcertados - a.partidosAcertados;
      return b.puntosCampeon - a.puntosCampeon;
    });

    listaFiltrada.forEach((u, i) => u.pos = i + 1);

    return { lista: listaFiltrada, resultados, usuarios, totalUsuarios: usuariosData?.length || 0 };
  } catch (err) {
    console.error("❌ Error al cargar datos:", err);
    throw err;
  }
}

// ══════════════════════════════════════════════════════
// SELECTOR DE GRUPOS
// ══════════════════════════════════════════════════════

function actualizarSelectorGrupos(usuarios) {
  const gruposSet = new Set();
  Object.values(usuarios).forEach(u => {
    if (u.grupos && Array.isArray(u.grupos)) {
      u.grupos.forEach(g => gruposSet.add(g));
    }
  });
  const select = document.getElementById("filtroGrupo");
  if (!select) return;
  
  const valorActual = select.value;
  select.innerHTML = '<option value="">🌍 Ranking General (todos los jugadores)</option>';
  
  Array.from(gruposSet).sort().forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = ` ${g}`;
    select.appendChild(opt);
  });

  select.value = valorActual;
  select.onchange = () => {
    filtroGrupoActual = select.value;
    cargarYRenderizar();
  };
}

// ══════════════════════════════════════════════════════
// RANKING
// ══════════════════════════════════════════════════════

function renderRanking(lista, totalUsuarios) {
  const rankingLoader = document.getElementById("rankingLoader");
  const actualizado = document.getElementById("actualizado");
  
  if (rankingLoader) rankingLoader.style.display = "none";
  if (actualizado) actualizado.textContent = "Actualizado: " + new Date().toLocaleTimeString();

  const jugadoresActivos = lista.filter(u => u.partidosPronosticados > 0);

  if (jugadoresActivos.length === 0) {
    const rankingTabla = document.getElementById("rankingTabla");
    if (rankingTabla) rankingTabla.style.display = "none";
    
    const top3 = document.getElementById("top3");
    if (top3) {
      top3.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding:50px 20px; background:var(--card); border-radius:var(--r-lg); border:1.5px solid var(--gold);">
          <div style="font-size:70px; margin-bottom:16px;">🏆</div>
          <h3 style="color:var(--gold); font-family:'Anton'; font-size:clamp(24px, 4vw, 36px); margin-bottom:12px;">¡MUY PRONTO ARRANCA EL TORNEO!</h3>
          <p style="color:var(--text2); font-size:15px; max-width:450px; margin:0 auto 20px;">
            ${totalUsuarios > 0 
              ? `Ya hay <strong style="color:var(--gold)">${totalUsuarios}</strong> jugador${totalUsuarios === 1 ? '' : 'es'} registrado${totalUsuarios === 1 ? '' : 's'}.`
              : 'El ranking se activará cuando comience el Mundial.'}
          </p>
          <a href="login.html" class="btn" style="display:inline-block; width:auto; padding:12px 32px; text-decoration:none;">🔐 Registrarme</a>        </div>
      `;
    }
    return;
  }

  const rankingTabla = document.getElementById("rankingTabla");
  if (rankingTabla) rankingTabla.style.display = "block";

  const top3Div = document.getElementById("top3");
  if (top3Div && lista.length >= 3) {
    const orden = [1, 0, 2];
    const colores = ["p2", "p1", "p3"];
    const emojis = ["🥈", "🥇", "🥉"];
    
    top3Div.innerHTML = orden.map((idx, i) => {
      const u = lista[idx];
      if (!u) return "";
      return `
        <div class="top3-card ${colores[i]}" onclick="window.mostrarDetalleJugador('${u.uid}')" style="cursor:pointer;" title="Ver detalle de ${u.nombre}">
          <div class="emoji">${emojis[i]}</div>
          <div class="nombre">${u.nombre} ${u.apellido}</div>
          ${u.apodo ? `<div style="font-size:11px; color:var(--text2); margin-bottom:4px;">"${u.apodo}"</div>` : ""}
          <div class="pts">${u.total}</div>
          <div class="meta">${u.partidosPronosticados} partidos · ${u.partidosAcertados} acertados</div>
        </div>
      `;
    }).join("");
  } else if (top3Div) {
    top3Div.innerHTML = "";
  }

  const tbody = document.getElementById("rankingBody");
  if (tbody) {
    tbody.innerHTML = lista.map(u => {
      const claseFila = u.pos === 1 ? "top1" : u.pos === 2 ? "top2" : u.pos === 3 ? "top3" : "";
      const posText = u.pos <= 3 ? `<span class="pos-${u.pos}">${["🥇","🥈","🥉"][u.pos-1]}</span>` : u.pos;
      const gruposHTML = u.grupos && u.grupos.length > 0 
        ? u.grupos.map(g => `<span style="display:inline-block; background:var(--bg3); padding:2px 6px; border-radius:4px; font-size:10px; margin:1px;">${g}</span>`).join("")
        : '<span style="color:var(--text3); font-size:11px;">—</span>';
      
      return `
        <tr class="${claseFila}" onclick="window.mostrarDetalleJugador('${u.uid}')" style="cursor:pointer;" title="Ver detalle de ${u.nombre}">
          <td>${posText}</td>
          <td class="left">
            <strong>${u.nombre} ${u.apellido}</strong>
            ${u.apodo ? `<div style="font-size:11px; color:var(--text2);">"${u.apodo}"</div>` : ""}
          </td>
          <td style="font-size:11px;">${gruposHTML}</td>
          <td>${u.partidosPronosticados}/104</td>          <td>${u.partidosAcertados}</td>
          <td>${u.puntosCampeon > 0 ? `<span style="color:var(--gold)">+${u.puntosCampeon}</span>` : "—"}</td>
          <td>${u.bonus > 0 ? `<span style="color:var(--green)">+${u.bonus}</span>` : "—"}</td>
          <td class="pts-total">${u.total}</td>
        </tr>
      `;
    }).join("");
  }
}

// ══════════════════════════════════════════════════════
// MODAL DE DETALLE DE JUGADOR
// ══════════════════════════════════════════════════════

window.mostrarDetalleJugador = async function(uid) {
  try {
    const { lista } = await cargarDatosCompletos();
    const jugador = lista.find(u => u.uid === uid);
    
    if (!jugador) {
      alert("Jugador no encontrado");
      return;
    }

    const modal = document.getElementById("modalDetalle");
    const modalContent = document.getElementById("modalContent");
    
    if (!modal || !modalContent) {
      console.error("Modal no encontrado en el DOM");
      return;
    }

    const partidosPorFase = {
      "Fase de Grupos": [],
      "Dieciseisavos": [],
      "Octavos": [],
      "Cuartos": [],
      "Semifinales": [],
      "3er Puesto": [],
      "Final": []
    };

    jugador.detallePartidos.forEach(det => {
      const fase = det.partido.fase || "grupos";
      if (fase === "grupos") partidosPorFase["Fase de Grupos"].push(det);
      else if (fase === "16avos") partidosPorFase["Dieciseisavos"].push(det);
      else if (fase === "octavos") partidosPorFase["Octavos"].push(det);
      else if (fase === "cuartos") partidosPorFase["Cuartos"].push(det);
      else if (fase === "semis") partidosPorFase["Semifinales"].push(det);
      else if (fase === "3er") partidosPorFase["3er Puesto"].push(det);      else if (fase === "final") partidosPorFase["Final"].push(det);
    });

    let html = `
      <div style="text-align:center; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid var(--border);">
        <h2 style="font-family:'Anton'; font-size:32px; color:var(--gold); margin-bottom:8px;">${jugador.nombre} ${jugador.apellido}</h2>
        ${jugador.apodo ? `<p style="color:var(--text2); font-size:14px; margin-bottom:12px;">"${jugador.apodo}"</p>` : ""}
        <div style="display:flex; justify-content:center; gap:32px;">
          <div>
            <div style="font-family:'Anton'; font-size:42px; color:var(--gold); line-height:1;">${jugador.pos}</div>
            <div style="font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:1px;">Posición</div>
          </div>
          <div>
            <div style="font-family:'Anton'; font-size:42px; color:var(--gold); line-height:1;">${jugador.total}</div>
            <div style="font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:1px;">Puntos Totales</div>
          </div>
        </div>
      </div>
    `;

    if (jugador.detallePartidos.length === 0) {
      html += `
        <div style="text-align:center; padding:40px 20px; background:var(--bg2); border-radius:var(--r);">
          <div style="font-size:50px; margin-bottom:12px;">⏳</div>
          <p style="color:var(--text2); font-size:14px;">Aún no hay resultados oficiales cargados para este jugador.</p>
          <p style="color:var(--text3); font-size:12px; margin-top:8px;">Los detalles aparecerán cuando se carguen los resultados oficiales.</p>
        </div>
      `;
    } else {
      Object.entries(partidosPorFase).forEach(([fase, partidos]) => {
        if (partidos.length === 0) return;

        const puntosFase = partidos.reduce((sum, det) => sum + det.puntos, 0);

        html += `
          <div style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:8px 12px; background:var(--bg2); border-radius:6px;">
              <h3 style="color:var(--gold); font-size:16px; margin:0; font-family:'Anton';">${fase}</h3>
              <span style="font-family:'Anton'; font-size:20px; color:var(--gold);">${puntosFase} pts</span>
            </div>
        `;

        partidos.forEach(det => {
          const flagL = FLAGS[det.partido.local] || "🏳️";
          const flagV = FLAGS[det.partido.visit] || "🏳️";
          const predL = det.prediccion.local !== null && det.prediccion.local !== undefined ? det.prediccion.local : "-";
          const predV = det.prediccion.visit !== null && det.prediccion.visit !== undefined ? det.prediccion.visit : "-";
          const resL = det.resultado.local !== null && det.resultado.local !== undefined ? det.resultado.local : "-";
          const resV = det.resultado.visit !== null && det.resultado.visit !== undefined ? det.resultado.visit : "-";
          html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--card); border:1px solid var(--border); border-radius:6px; margin-bottom:8px; border-left:3px solid ${det.puntos > 0 ? 'var(--gold)' : 'var(--border)'};">
              <div style="flex:1;">
                <div style="font-weight:600; color:var(--text); font-size:14px; margin-bottom:4px;">
                  ${flagL} ${det.partido.local} <span style="color:var(--gold); font-weight:700;">(${resL})</span> vs ${det.partido.visit} <span style="color:var(--gold); font-weight:700;">(${resV})</span> ${flagV}
                </div>
                <div style="font-size:12px; color:var(--text2);">
                  Tu predicción: <strong>${predL} - ${predV}</strong>
                </div>
              </div>
              <div style="text-align:right; margin-left:16px; padding:8px 12px; background:${det.puntos > 0 ? 'var(--gold-soft)' : 'var(--bg2)'}; border-radius:6px; min-width:60px;">
                <div style="font-family:'Anton'; font-size:24px; color:${det.puntos > 0 ? 'var(--gold)' : 'var(--text3)'}; line-height:1;">+${det.puntos}</div>
              </div>
            </div>
          `;
        });

        html += `</div>`;
      });
    }

    modalContent.innerHTML = html;
    modal.style.display = "flex";
  } catch (err) {
    console.error("Error en mostrarDetalleJugador:", err);
    alert("Error al cargar el detalle: " + err.message);
  }
};

window.cerrarModalDetalle = function() {
  const modal = document.getElementById("modalDetalle");
  if (modal) modal.style.display = "none";
};

// ══════════════════════════════════════════════════════
// RESULTADOS CON ESTADOS EN VIVO
// ══════════════════════════════════════════════════════

function renderCardPartido(p, resultado) {
  const flagL = FLAGS[p.local] || "🏳️";
  const flagV = FLAGS[p.visit] || "🏳️";
  const { estado, texto } = getEstadoPartido(p, resultado);
  
  let claseCard = "resultado-card";
  if (estado === "vivo") claseCard += " en-vivo";
  if (estado === "proximo") claseCard += " proximo";

  let liveBadge = "";
  if (estado === "vivo") {
    liveBadge = `<span class="live-badge">🔴 EN JUEGO</span>`;  }

  let marcadorHTML;
  if (estado === "finalizado" && resultado && resultado.local !== null) {
    marcadorHTML = `
      <div class="marcador-final">${resultado.local} - ${resultado.visit}</div>
      <div class="marcador-hora">${texto}</div>
    `;
  } else if (estado === "vivo") {
    marcadorHTML = `
      <div class="marcador-vs" style="font-size:16px; font-weight:700; color:var(--gold);">VS</div>
      <div class="marcador-hora" style="color:var(--gold); font-weight:600;">${texto}</div>
    `;
  } else if (estado === "pendiente") {
    marcadorHTML = `
      <div class="marcador-vs">VS</div>
      <div class="marcador-hora">${texto}</div>
    `;
  } else {
    marcadorHTML = `
      <div class="marcador-vs">VS</div>
      <div class="marcador-hora">${texto}</div>
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
  const loader = document.getElementById("resultadosLoader");
  
  if (loader) loader.style.display = "none";
  if (!cont) return;

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
  let hayContenido = false;

  secciones.forEach(sec => {
    if (sec.partidos.length === 0) return;

    const enJuego = sec.partidos.filter(p => getEstadoPartido(p, resultados[p.id]).estado === "vivo");
    const finalizados = sec.partidos.filter(p => getEstadoPartido(p, resultados[p.id]).estado === "finalizado");
    const pendientes = sec.partidos.filter(p => getEstadoPartido(p, resultados[p.id]).estado === "pendiente");

    if (enJuego.length === 0 && finalizados.length === 0 && pendientes.length === 0) return;

    hayContenido = true;
    const ordenados = [...enJuego, ...finalizados, ...pendientes];

    html += `<h3 class="seccion-titulo">${sec.label}</h3>`;
    html += `<div class="resultados-grid">`;
    
    ordenados.forEach(p => {
      html += renderCardPartido(p, resultados[p.id]);
    });

    html += `</div>`;
  });

  if (!hayContenido) {
    cont.innerHTML = `
      <div style="text-align:center; padding:50px 20px; background:var(--card); border-radius:var(--r-lg); border:1px solid var(--border);">
        <div style="font-size:60px; margin-bottom:16px;">⏳</div>
        <h3 style="color:var(--gold); font-family:'Anton'; font-size:24px; margin-bottom:12px;">Los resultados se publicarán durante el torneo</h3>        <p style="color:var(--text2); font-size:14px; max-width:450px; margin:0 auto;">
          Los partidos en juego aparecerán en vivo. Los resultados oficiales se cargarán al finalizar cada partido.
        </p>
      </div>
    `;
  } else {
    cont.innerHTML = html;
  }
}

// ══════════════════════════════════════════════════════
// CARGAR Y RENDERIZAR
// ══════════════════════════════════════════════════════

async function cargarYRenderizar() {
  try {
    const { lista, resultados, usuarios, totalUsuarios } = await cargarDatosCompletos();
    actualizarSelectorGrupos(usuarios);
    renderRanking(lista, totalUsuarios);
    renderResultados(resultados);
  } catch (err) {
    console.error(err);
    const rankingLoader = document.getElementById("rankingLoader");
    if (rankingLoader) rankingLoader.innerHTML = "<p style='color:var(--red)'>Error al cargar los datos</p>";
    
    const resultadosLoader = document.getElementById("resultadosLoader");
    if (resultadosLoader) resultadosLoader.style.display = "none";
    
    const resultadosContenido = document.getElementById("resultadosContenido");
    if (resultadosContenido) resultadosContenido.innerHTML = "<p style='color:var(--red); text-align:center; padding:30px;'>Error al cargar resultados</p>";
  }
}

cargarYRenderizar();
setInterval(cargarYRenderizar, 30000);
