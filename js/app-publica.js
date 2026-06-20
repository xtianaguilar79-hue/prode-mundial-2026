import { supabase } from "./supabase-config.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, 
  calcularPuntos, calcularPuntosCampeon,
  getKickoffTimestamp,
  sincronizarHoraServidor, horaReal
} from "../datos-partidos.js";

console.log("📊 app-publica.js cargado");

const SALA_PRIVADA = "Cardio-Fitness";
const MODO_SALA = window.location.pathname.includes("sala-cardio");
const NOMBRE_SALA = "Cardio-Fitness";

let filtroGrupoActual = "";

function estaEnSalaPrivada(usuario) {
  try {
    if (!usuario) return false;
    const grupos = usuario.grupos;
    if (!grupos) return false;
    if (typeof grupos === 'string') return grupos === SALA_PRIVADA;
    if (Array.isArray(grupos)) return grupos.includes(SALA_PRIVADA);
    return false;
  } catch (err) {
    console.error("⚠️ Error verificando sala:", err);
    return false;
  }
}

function getEstadoPartido(partido, resultado) {
  if (resultado && resultado.estado) {
    if (resultado.estado === "vivo") return { estado: "vivo", texto: "🔴 EN JUEGO" };
    if (resultado.estado === "finalizado") return { estado: "finalizado", texto: "Finalizado" };
  }
  
  if (resultado && resultado.local !== null && resultado.local !== undefined) {
    return { estado: "finalizado", texto: "Finalizado" };
  }
  
  const kickoff = getKickoffTimestamp(partido);
  const ahora = horaReal();
  const finPartido = kickoff + (120 * 60 * 1000);
  
  if (ahora < kickoff) return { estado: "proximo", texto: `${partido.fecha} · ${partido.hora} ARG` };
  if (ahora < finPartido) return { estado: "vivo", texto: "🔴 EN JUEGO" };
  
  return { estado: "pendiente", texto: "⏳ Pendiente resultado oficial" };
}

async function cargarDatosCompletos() {
  try {
    console.log(`📍 Modo: ${MODO_SALA ? 'SALA PRIVADA' : 'GENERAL'}`);
    
    const { data: usuariosData, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*');
    if (usuariosError) throw usuariosError;

    console.log(`👥 Usuarios cargados: ${usuariosData?.length || 0}`);

    const usuarios = {};
    if (usuariosData) usuariosData.forEach(u => { usuarios[u.id] = u; });

    // ══════════════════════════════════════════════════════
    // Cargar predicciones con paginación (sin límite de 1000)
    // ══════════════════════════════════════════════════════
    const predsData = [];
    let desde = 0;
    const limite = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('predicciones')
        .select('*')
        .range(desde, desde + limite - 1);
      
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      predsData.push(...data);
      
      if (data.length < limite) break;
      desde += limite;
    }

    console.log(`🎯 Predicciones cargadas: ${predsData?.length || 0}`);

    const { data: resData, error: resError } = await supabase
      .from('resultados')
      .select('*');
    if (resError) throw resError;

    console.log(`📊 Total de resultados en BD: ${resData?.length || 0}`);

    const resultados = {};
    if (resData) {
      resData.forEach(r => {
        if (r.es_prueba !== true && r.local !== null && r.local !== undefined) {
          resultados[r.partido_id] = r;
        }
      });
    }

    console.log(`📊 Resultados oficiales cargados: ${Object.keys(resultados).length}`);

    const { data: campeonesData } = await supabase.from('campeones').select('*');
    const campeones = {};
    if (campeonesData) campeonesData.forEach(c => { campeones[c.user_id] = c; });

    const { data: finalData } = await supabase.from('config').select('*').eq('id', 'final').single();
    const campeonReal = finalData?.campeon || null;

    const ranking = {};
    let usuariosIncluidosSet = new Set();
    let totalPuntosCalculados = 0;
    let prediccionesConResultado = 0;

    if (predsData) {
      predsData.forEach(pred => {
        const res = resultados[pred.partido_id];
        const u = usuarios[pred.user_id];
        
        if (!u) return;

        const enSala = estaEnSalaPrivada(u);
        if (!MODO_SALA && enSala) return;
        if (MODO_SALA && !enSala) return;
        
        usuariosIncluidosSet.add(pred.user_id);

        if (!ranking[pred.user_id]) {
          ranking[pred.user_id] = {
            uid: pred.user_id,
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
        
        if (res) {
          const pts = calcularPuntos(pred, res);
          ranking[pred.user_id].puntos += pts;
          ranking[pred.user_id].partidosPronosticados += 1;
          if (pts > 0) ranking[pred.user_id].partidosAcertados += 1;
          totalPuntosCalculados += pts;
          prediccionesConResultado++;
          
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

    console.log(`📊 Usuarios únicos incluidos: ${usuariosIncluidosSet.size}`);
    console.log(`📊 Total de jugadores en ranking: ${Object.keys(ranking).length}`);
    console.log(`📊 Predicciones con resultado: ${prediccionesConResultado}`);
    console.log(`📊 Total de puntos calculados: ${totalPuntosCalculados}`);

    Object.entries(campeones).forEach(([uid, pred]) => {
      const u = usuarios[uid];
      if (!u) return;
      const enSala = estaEnSalaPrivada(u);
      if (!MODO_SALA && enSala) return;
      if (MODO_SALA && !enSala) return;

      if (!ranking[uid]) {
        ranking[uid] = {
          uid, nombre: u.nombre || "Jugador", apellido: u.apellido || "",
          apodo: u.apodo || null, grupos: u.grupos || [],
          puntos: 0, puntosCampeon: 0, partidosPronosticados: 0,
          partidosAcertados: 0, detallePartidos: []
        };
      }
      if (campeonReal) {
        ranking[uid].puntosCampeon = calcularPuntosCampeon(pred, campeonReal);
      }
    });

    Object.values(usuarios).forEach(u => {
      const enSala = estaEnSalaPrivada(u);
      if (!MODO_SALA && enSala) return;
      if (MODO_SALA && !enSala) return;
      if (!ranking[u.id]) {
        ranking[u.id] = {
          uid: u.id, nombre: u.nombre, apellido: u.apellido || "",
          apodo: u.apodo || null, grupos: u.grupos || [],
          puntos: 0, puntosCampeon: 0, partidosPronosticados: 0,
          partidosAcertados: 0, detallePartidos: []
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

    return { lista: listaFiltrada, resultados, usuarios, predicciones: predsData || [], totalUsuarios: usuariosData?.length || 0 };
  } catch (err) {
    console.error("❌ Error al cargar datos:", err);
    throw err;
  }
}

function actualizarSelectorGrupos(usuarios) {
  const gruposSet = new Set();
  Object.values(usuarios).forEach(u => {
    if (u.grupos && Array.isArray(u.grupos)) {
      u.grupos.forEach(g => {
        if (!MODO_SALA && g === SALA_PRIVADA) return;
        gruposSet.add(g);
      });
    }
  });

  const select = document.getElementById("filtroGrupo");
  if (!select) return;
  
  const valorActual = select.value;
  const tituloGeneral = MODO_SALA 
    ? `🏢 Ranking de ${NOMBRE_SALA}` 
    : '🌍 Ranking General (todos los jugadores)';
  
  select.innerHTML = `<option value="">${tituloGeneral}</option>`;
  
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
  const rankingLoader = document.getElementById("rankingLoader");
  const actualizado = document.getElementById("actualizado");
  
  if (rankingLoader) rankingLoader.style.display = "none";
  if (actualizado) actualizado.textContent = "Actualizado: " + new Date(horaReal()).toLocaleTimeString();

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
          <a href="login.html" class="btn" style="display:inline-block; width:auto; padding:12px 32px; text-decoration:none;">🔐 Registrarme</a>
        </div>
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
      const posText = u.pos <= 3 ? `<span class="pos-${u.pos}">${["🥇","","🥉"][u.pos-1]}</span>` : u.pos;
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
          <td>${u.partidosPronosticados}/104</td>
          <td>${u.partidosAcertados}</td>
          <td>${u.puntosCampeon > 0 ? `<span style="color:var(--gold)">+${u.puntosCampeon}</span>` : "—"}</td>
          <td>${u.bonus > 0 ? `<span style="color:var(--green)">+${u.bonus}</span>` : "—"}</td>
          <td class="pts-total">${u.total}</td>
        </tr>
      `;
    }).join("");
  }
}

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
      else if (fase === "3er") partidosPorFase["3er Puesto"].push(det);
      else if (fase === "final") partidosPorFase["Final"].push(det);
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

window.mostrarDetallePartido = async function(partidoId) {
  try {
    const { data: todasPredicciones, error: predsError } = await supabase
      .from('predicciones')
      .select('*')
      .eq('partido_id', partidoId);
    
    if (predsError) throw predsError;
    
    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('*');
    
    const usuariosMap = {};
    if (usuariosData) usuariosData.forEach(u => { usuariosMap[u.id] = u; });
    
    const prediccionesFiltradas = todasPredicciones.filter(pred => {
      const u = usuariosMap[pred.user_id];
      if (!u) return false;
      
      const enSala = u.grupos && Array.isArray(u.grupos) && u.grupos.includes("Cardio-Fitness");
      
      return !enSala;
    });
    
    const { data: resultadoData } = await supabase
      .from('resultados')
      .select('*')
      .eq('partido_id', partidoId)
      .single();
    
    if (!resultadoData || resultadoData.local === null) {
      alert("Este partido aún no tiene resultado oficial");
      return;
    }
    
    const prediccionesConPuntos = prediccionesFiltradas.map(pred => {
      const u = usuariosMap[pred.user_id];
      const pts = calcularPuntos(pred, resultadoData);
      
      return {
        nombre: u.nombre || "Jugador",
        apellido: u.apellido || "",
        apodo: u.apodo || null,
        prediccion: pred,
        puntos: pts
      };
    }).sort((a, b) => b.puntos - a.puntos);

    const modal = document.getElementById("modalDetalle");
    const modalContent = document.getElementById("modalContent");
    
    if (!modal || !modalContent) {
      console.error("Modal no encontrado en el DOM");
      return;
    }

    const partido = TODOS_PARTIDOS.find(p => p.id === partidoId);
    const flagL = partido ? (FLAGS[partido.local] || "🏳️") : "🏳️";
    const flagV = partido ? (FLAGS[partido.visit] || "🏳️") : "🏳️";

    let html = `
      <div style="text-align:center; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid var(--border);">
        <div style="font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
          ${partido?.grupo ? `Grupo ${partido.grupo}` : partido?.fase ? partido.fase.toUpperCase() : ''} · ${partido?.fecha || ''} · ${partido?.hora || ''} ARG
        </div>
        <h2 style="font-family:'Anton'; font-size:28px; color:var(--gold); margin-bottom:12px;">
          ${flagL} ${partido?.local || ''} <span style="color:var(--text);">vs</span> ${partido?.visit || ''} ${flagV}
        </h2>
        <div style="font-family:'Anton'; font-size:48px; color:var(--gold); letter-spacing:3px;">
          ${resultadoData.local} - ${resultadoData.visit}
        </div>
        <div style="font-size:12px; color:var(--text2); margin-top:8px;">
          ${prediccionesConPuntos.length} jugador${prediccionesConPuntos.length === 1 ? '' : 'es'} pronosticaron este partido
        </div>
      </div>
    `;

    if (prediccionesConPuntos.length === 0) {
      html += `
        <div style="text-align:center; padding:40px 20px; background:var(--bg2); border-radius:var(--r);">
          <div style="font-size:50px; margin-bottom:12px;">🤷</div>
          <p style="color:var(--text2); font-size:14px;">Ningún jugador pronosticó este partido.</p>
        </div>
      `;
    } else {
      const totalPuntos = prediccionesConPuntos.reduce((sum, j) => sum + j.puntos, 0);
      const promedio = (totalPuntos / prediccionesConPuntos.length).toFixed(1);
      const maxPuntos = prediccionesConPuntos[0].puntos;
      const acertaron = prediccionesConPuntos.filter(j => j.puntos > 0).length;

      html += `
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:20px;">
          <div style="background:var(--bg2); padding:12px; border-radius:6px; text-align:center;">
            <div style="font-family:'Anton'; font-size:24px; color:var(--gold);">${maxPuntos}</div>
            <div style="font-size:10px; color:var(--text2); text-transform:uppercase;">Máximo</div>
          </div>
          <div style="background:var(--bg2); padding:12px; border-radius:6px; text-align:center;">
            <div style="font-family:'Anton'; font-size:24px; color:var(--gold);">${promedio}</div>
            <div style="font-size:10px; color:var(--text2); text-transform:uppercase;">Promedio</div>
          </div>
          <div style="background:var(--bg2); padding:12px; border-radius:6px; text-align:center;">
            <div style="font-family:'Anton'; font-size:24px; color:var(--gold);">${acertaron}/${prediccionesConPuntos.length}</div>
            <div style="font-size:10px; color:var(--text2); text-transform:uppercase;">Acertaron</div>
          </div>
        </div>
      `;

      html += `
        <div style="font-size:11px; color:var(--text2); margin-bottom:8px; display:flex; justify-content:space-between; padding:0 4px;">
          <span>Jugador · Predicción</span>
          <span>Pts</span>
        </div>
      `;

      prediccionesConPuntos.forEach((j, index) => {
        const predL = j.prediccion.local !== null && j.prediccion.local !== undefined ? j.prediccion.local : "-";
        const predV = j.prediccion.visit !== null && j.prediccion.visit !== undefined ? j.prediccion.visit : "-";
        
        let medalla = "";
        if (index === 0 && j.puntos > 0) medalla = "🥇";
        else if (index === 1 && j.puntos > 0) medalla = "🥈";
        else if (index === 2 && j.puntos > 0) medalla = "🥉";

        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--card); border:1px solid var(--border); border-radius:6px; margin-bottom:6px; border-left:3px solid ${j.puntos > 0 ? 'var(--gold)' : 'var(--border)'};">
            <div style="flex:1; display:flex; align-items:center; gap:8px;">
              <span style="font-size:14px; min-width:24px;">${medalla || (index + 1)}</span>
              <div>
                <div style="font-weight:600; color:var(--text); font-size:14px;">
                  ${j.nombre} ${j.apellido}
                </div>
                ${j.apodo ? `<div style="font-size:11px; color:var(--text2);">"${j.apodo}"</div>` : ""}
                <div style="font-size:12px; color:var(--text3); margin-top:2px;">
                  Pronóstico: <strong style="color:var(--text);">${predL} - ${predV}</strong>
                </div>
              </div>
            </div>
            <div style="text-align:right; margin-left:12px; padding:6px 10px; background:${j.puntos > 0 ? 'var(--gold-soft)' : 'var(--bg2)'}; border-radius:6px; min-width:50px;">
              <div style="font-family:'Anton'; font-size:20px; color:${j.puntos > 0 ? 'var(--gold)' : 'var(--text3)'}; line-height:1;">
                ${j.puntos > 0 ? '+' + j.puntos : '0'}
              </div>
            </div>
          </div>
        `;
      });
    }

    modalContent.innerHTML = html;
    modal.style.display = "flex";
  } catch (err) {
    console.error("Error en mostrarDetallePartido:", err);
    alert("Error al cargar el detalle del partido: " + err.message);
  }
};

function renderCardPartido(p, resultado) {
  const flagL = FLAGS[p.local] || "🏳️";
  const flagV = FLAGS[p.visit] || "🏳️";
  const { estado, texto } = getEstadoPartido(p, resultado);
  
  let claseCard = "resultado-card";
  if (estado === "vivo") claseCard += " en-vivo";
  if (estado === "proximo") claseCard += " proximo";

  let liveBadge = "";
  if (estado === "vivo") {
    liveBadge = `<span class="live-badge">🔴 EN JUEGO</span>`;
  }

  let marcadorHTML;
  if (estado === "finalizado" && resultado && resultado.local !== null) {
    marcadorHTML = `
      <div class="marcador-final" onclick="window.mostrarDetallePartido('${p.id}')" style="cursor:pointer; text-decoration:underline; text-decoration-color:var(--gold);" title="Ver pronósticos de los jugadores">
        ${resultado.local} - ${resultado.visit}
      </div>
      <div class="marcador-hora" style="font-size:9px; color:var(--text3);">👆 Tocá para ver pronósticos</div>
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
        <h3 style="color:var(--gold); font-family:'Anton'; font-size:24px; margin-bottom:12px;">Los resultados se publicarán durante el torneo</h3>
        <p style="color:var(--text2); font-size:14px; max-width:450px; margin:0 auto;">
          Los partidos en juego aparecerán en vivo. Los resultados oficiales se cargarán al finalizar cada partido.
        </p>
      </div>
    `;
  } else {
    cont.innerHTML = html;
  }
}

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

(async () => {
  console.log("🕐 Sincronizando hora con el servidor...");
  console.log(`📍 Modo: ${MODO_SALA ? 'SALA PRIVADA (' + NOMBRE_SALA + ')' : 'GENERAL'}`);
  await sincronizarHoraServidor(supabase);
  console.log("✅ Hora sincronizada. Iniciando carga de datos...");
  
  await cargarYRenderizar();
  setInterval(cargarYRenderizar, 30000);
})();