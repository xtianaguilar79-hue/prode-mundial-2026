import { supabase } from "./supabase-config.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, PUNTOS, 
  calcularPuntos, SELECCIONES, obtenerPuntosCampeonDisponibles,
  calcularPuntosCampeon, msHastaBloqueo, formatearTiempo, partidoBloqueado,
  sincronizarHoraServidor
} from "../datos-partidos.js";

console.log("📋 app-prode.js cargado");

let usuarioId = null;
let predicciones = {};
let resultados = {};
let prediccionCampeon = null;
let resultadoFinal = null;
let faseActiva = "j1";
let intervalosCrono = [];
let misGrupos = [];

// ═══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════

async function init() {
  console.log("🚀 Iniciando prode...");
  
  try {
    await sincronizarHoraServidor(supabase);
    console.log("✅ Hora sincronizada con el servidor");
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log("⚠️ No hay sesión, redirigiendo a login");
      window.location.href = "login.html";
      return;
    }

    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userError || !usuario) {
      console.error("❌ No se encontró el perfil:", userError);
      window.location.href = "login.html";
      return;
    }
    
    usuarioId = usuario.id;
    misGrupos = usuario.grupos || [];
    console.log("✅ Autenticado como:", usuario.nombre);
    
    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.textContent = usuario.nombre;

    if (usuario.es_admin) {
      const adminTag = document.getElementById("adminTag");
      if (adminTag) adminTag.style.display = "inline";
      const linkAdmin = document.getElementById("linkAdmin");
      if (linkAdmin) linkAdmin.style.display = "inline-block";
    }

    if (misGrupos.includes("Cardio-Fitness")) {
      const linkSalaCardio = document.getElementById("linkSalaCardio");
      if (linkSalaCardio) {
        linkSalaCardio.style.display = "inline";
        console.log("✅ Usuario pertenece a Cardio-Fitness, mostrando link");
      }
    }

    await cargarDatos();
    await cargarCampeon();
    renderMisGrupos();
    renderTabs();
    renderPartidos();
    renderCampeon();
    configurarSeccionGrupos();
    
    console.log("✅ Prode iniciado correctamente");
  } catch (err) {
    console.error("❌ Error en init:", err);
  }
}

// ═══════════════════════════════════════════════════════
// GESTIÓN DE GRUPOS
// ═══════════════════════════════════════════════════════

function renderMisGrupos() {
  const container = document.getElementById("misGruposContainer");
  const list = document.getElementById("misGruposList");
  
  if (!container || !list) return;
  
  if (misGrupos.length === 0) {
    container.style.display = "none";
    return;
  }
  
  container.style.display = "block";
  list.innerHTML = misGrupos.map((grupo, index) => `
    <div style="background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:8px 12px; display:flex; align-items:center; gap:10px;">
      <span style="font-weight:600; color:var(--text); font-size:13px;">👥 ${grupo}</span>
      <button onclick="window.salirDeGrupo(${index})" 
              style="background:var(--red); color:#fff; border:none; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:11px; font-weight:600; font-family:inherit;">
        Salir
      </button>
    </div>
  `).join("");
}

function configurarSeccionGrupos() {
  const btnUnirse = document.getElementById("btnUnirseGrupo");
  if (btnUnirse) {
    btnUnirse.onclick = unirseAGrupo;
  }
  
  const input = document.getElementById("nuevoGrupoInput");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        unirseAGrupo();
      }
    });
  }
}

async function unirseAGrupo() {
  const input = document.getElementById("nuevoGrupoInput");
  const msg = document.getElementById("msgGrupo");
  
  if (!input || !msg) return;
  
  const nombre = input.value.trim();
  
  if (!nombre) {
    mostrarMsgGrupo("⚠️ Escribí el nombre del grupo", "error");
    return;
  }
  
  if (misGrupos.includes(nombre)) {
    mostrarMsgGrupo("⚠️ Ya estás en ese grupo", "error");
    return;
  }
  
  if (misGrupos.length >= 10) {
    mostrarMsgGrupo("⚠️ Máximo 10 grupos permitidos", "error");
    return;
  }
  
  try {
    const nuevosGrupos = [...misGrupos, nombre];
    
    const { error } = await supabase
      .from('usuarios')
      .update({ grupos: nuevosGrupos })
      .eq('id', usuarioId);
    
    if (error) throw error;
    
    misGrupos = nuevosGrupos;
    input.value = "";
    mostrarMsgGrupo(`✅ Te uniste al grupo "${nombre}"`, "ok");
    renderMisGrupos();
    
    if (nombre === "Cardio-Fitness") {
      const linkSalaCardio = document.getElementById("linkSalaCardio");
      if (linkSalaCardio) {
        linkSalaCardio.style.display = "inline";
      }
    }
  } catch (err) {
    console.error(err);
    mostrarMsgGrupo("❌ Error: " + err.message, "error");
  }
}

window.salirDeGrupo = async (index) => {
  const nombre = misGrupos[index];
  if (!nombre) return;
  
  if (!confirm(`¿Seguro que querés salirte del grupo "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }
  
  try {
    const nuevosGrupos = misGrupos.filter((_, i) => i !== index);
    
    const { error } = await supabase
      .from('usuarios')
      .update({ grupos: nuevosGrupos })
      .eq('id', usuarioId);
    
    if (error) throw error;
    
    misGrupos = nuevosGrupos;
    mostrarMsgGrupo(`✅ Te saliste del grupo "${nombre}"`, "ok");
    renderMisGrupos();
    
    if (nombre === "Cardio-Fitness") {
      const linkSalaCardio = document.getElementById("linkSalaCardio");
      if (linkSalaCardio) {
        linkSalaCardio.style.display = "none";
      }
    }
  } catch (err) {
    console.error(err);
    mostrarMsgGrupo("❌ Error: " + err.message, "error");
  }
};

function mostrarMsgGrupo(texto, tipo) {
  const msg = document.getElementById("msgGrupo");
  if (!msg) return;
  
  msg.textContent = texto;
  msg.style.display = "block";
  
  if (tipo === "error") {
    msg.style.background = "var(--red-soft)";
    msg.style.border = "1px solid var(--red)";
    msg.style.color = "var(--red)";
  } else {
    msg.style.background = "var(--green-soft)";
    msg.style.border = "1px solid var(--green)";
    msg.style.color = "var(--green)";
  }
  
  setTimeout(() => { msg.style.display = "none"; }, 4000);
}

// ═══════════════════════════════════════════════════════
// CARGA DE DATOS
// ═══════════════════════════════════════════════════════
async function cargarDatos() {
  try {
    const { data: predsData, error: predsError } = await supabase
      .from('predicciones')
      .select('*')
      .eq('user_id', usuarioId);

    if (predsError) {
      console.error("❌ Error cargando predicciones:", predsError);
    }

    predicciones = {};
    if (predsData) {
      predsData.forEach(p => { 
        predicciones[p.partido_id] = p; 
      });
    }
    
    console.log(`🎯 Predicciones cargadas para el usuario: ${Object.keys(predicciones).length}`);

    const { data: resData, error: resError } = await supabase
      .from('resultados')
      .select('*')
      .eq('es_prueba', false);

    if (resError) {
      console.error("❌ Error cargando resultados:", resError);
    }

    resultados = {};
    if (resData) {
      resData.forEach(r => { 
        resultados[r.partido_id] = r; 
      });
    }

    console.log(`📊 Resultados oficiales cargados: ${Object.keys(resultados).length}`);

    actualizarStats();
  } catch (err) {
    console.error("Error cargando datos:", err);
  }
}

async function cargarCampeon() {
  try {
    const { data: campData } = await supabase
      .from('campeones')
      .select('*')
      .eq('user_id', usuarioId)
      .single();

    if (campData) prediccionCampeon = campData;

    const { data: finalData } = await supabase
      .from('config')
      .select('*')
      .eq('id', 'final')
      .single();

    if (finalData) resultadoFinal = finalData;
  } catch (err) {
    console.error("Error cargando campeón:", err);
  }
}

function actualizarStats() {
  let total = 0;
  let partidosConPuntos = 0;
  
  Object.values(predicciones).forEach(pred => {
    const res = resultados[pred.partido_id];
    if (res) {
      const pts = calcularPuntos(pred, res);
      total += pts;
      if (pts > 0) partidosConPuntos++;
    }
  });

  if (prediccionCampeon && resultadoFinal?.campeon) {
    total += calcularPuntosCampeon(prediccionCampeon, resultadoFinal.campeon);
  }

  const bonus = Object.keys(predicciones).length >= 104 ? 100 : 0;
  total += bonus;

  console.log(`📊 Total de puntos calculado: ${total} (con ${partidosConPuntos} partidos acertados)`);

  const statPts = document.getElementById("statPts");
  const statPred = document.getElementById("statPred");
  const statFidelidad = document.getElementById("statFidelidad");
  
  if (statPts) statPts.textContent = total;
  if (statPred) statPred.textContent = `${Object.keys(predicciones).length}/104`;
  if (statFidelidad) {
    statFidelidad.textContent = bonus > 0 ? "✓" : "";
    statFidelidad.style.color = bonus > 0 ? "var(--green)" : "var(--accent)";
  }
}

function renderTabs() {
  const tabsContainer = document.getElementById("faseTabs");
  if (!tabsContainer) return;

  const tabs = [
    { id: "j1", label: "Fecha 1" },
    { id: "j2", label: "Fecha 2" },
    { id: "j3", label: "Fecha 3" },
    { id: "16avos", label: "16avos" },
    { id: "octavos", label: "Octavos" },
    { id: "cuartos", label: "Cuartos" },
    { id: "semis", label: "Semis" },
    { id: "3er", label: "3er Puesto" },
    { id: "final", label: "Final 🏆" },
  ];

  tabsContainer.innerHTML = tabs.map(t => `
    <button class="fase-btn ${faseActiva === t.id ? "active" : ""}" data-fase="${t.id}">
      ${t.label}
    </button>
  `).join("");

  tabsContainer.querySelectorAll(".fase-btn").forEach(btn => {
    btn.onclick = () => {
      faseActiva = btn.dataset.fase;
      renderTabs();
      renderPartidos();
    };
  });
}

function getPartidosFase() {
  if (faseActiva.startsWith("j")) {
    const j = parseInt(faseActiva[1]);
    return PARTIDOS_GRUPOS.filter(p => p.j === j);
  }
  return PARTIDOS_ELIM.filter(p => p.fase === faseActiva);
}

// ═══════════════════════════════════════════════════════
// FUNCIÓN AUXILIAR: FORMATEAR FECHA
// ═══════════════════════════════════════════════════════
function formatearFecha(fechaStr) {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  
  if (!fechaStr || typeof fechaStr !== 'string') return fechaStr;
  
  const partes = fechaStr.split('/');
  if (partes.length !== 2) return fechaStr;
  
  const dia = parseInt(partes[0]);
  const mesIndex = parseInt(partes[1]) - 1;
  
  if (isNaN(dia) || isNaN(mesIndex) || mesIndex < 0 || mesIndex > 11) {
    return fechaStr;
  }
  
  return `📅 ${dia} de ${meses[mesIndex]}`;
}

// ═══════════════════════════════════════════════════════
// FUNCIÓN AUXILIAR: ORDENAR FECHAS (ASCENDENTE)
// ═══════════════════════════════════════════════════════
// ORDEN: Del más antiguo al más reciente
// Ejemplo: 24/06 → 25/06 → 26/06 → 27/06
// ═══════════════════════════════════════════════════════
function ordenarFechas(fechas) {
  return fechas.sort((a, b) => {
    const [diaA, mesA] = a.split('/').map(Number);
    const [diaB, mesB] = b.split('/').map(Number);
    
    // Primero por mes (ASCENDENTE - más antiguo primero)
    if (mesA !== mesB) return mesA - mesB;
    // Luego por día (ASCENDENTE)
    return diaA - diaB;
  });
}

// ═══════════════════════════════════════════════════════
// RENDERIZAR PARTIDOS AGRUPADOS POR FECHA
// ═══════════════════════════════════════════════════════
function renderPartidos() {
  console.log(`⚽ Renderizando partidos, fase: ${faseActiva}`);
  
  intervalosCrono.forEach(interval => clearInterval(interval));
  intervalosCrono = [];
  
  const loader = document.getElementById("partidosLoader");
  const grid = document.getElementById("partidosGrid");
  
  if (!loader || !grid) {
    console.error("❌ No se encontró loader o grid");
    return;
  }

  loader.style.display = "none";
  grid.style.display = "grid";

  const partidos = getPartidosFase();
  console.log(`📋 Partidos en fase ${faseActiva}:`, partidos.length);

  if (partidos.length === 0) {
    grid.innerHTML = '<p style="text-align:center; color:var(--text2); padding:40px; grid-column:1/-1;">No hay partidos</p>';
    return;
  }

  // ══════════════════════════════════════════════════════
  // AGRUPAR PARTIDOS POR FECHA
  // ══════════════════════════════════════════════════════
  const partidosPorFecha = {};
  partidos.forEach(p => {
    const fecha = p.fecha || "Sin fecha";
    if (!partidosPorFecha[fecha]) {
      partidosPorFecha[fecha] = [];
    }
    partidosPorFecha[fecha].push(p);
  });

  // ══════════════════════════════════════════════════════
  // ORDENAR FECHAS: MÁS ANTIGUAS PRIMERO (ASCENDENTE)
  // ══════════════════════════════════════════════════════
  const fechasOrdenadas = ordenarFechas(Object.keys(partidosPorFecha));

  // ══════════════════════════════════════════════════════
  // GENERAR HTML CON SUBTÍTULOS POR FECHA
  // ══════════════════════════════════════════════════════
  let html = "";
  
  fechasOrdenadas.forEach(fecha => {
    const partidosDeFecha = partidosPorFecha[fecha];
    const fechaFormateada = formatearFecha(fecha);
    
    // Subtítulo de la fecha
    html += `
      <div style="grid-column: 1/-1; margin: 20px 0 10px 0; padding: 12px 16px; background: linear-gradient(135deg, var(--gold) 0%, rgba(255,201,60,0.3) 100%); border-radius: var(--r); border-left: 4px solid var(--gold);">
        <h3 style="margin: 0; font-family: 'Anton', sans-serif; font-size: 22px; color: var(--text); letter-spacing: 1px;">
          ${fechaFormateada}
          <span style="font-size: 13px; color: var(--text2); font-family: inherit; margin-left: 10px; font-weight: normal;">
            (${partidosDeFecha.length} partido${partidosDeFecha.length !== 1 ? 's' : ''})
          </span>
        </h3>
      </div>
    `;
    
    // Partidos de esa fecha
    partidosDeFecha.forEach(p => {
      html += renderTarjeta(p);
    });
  });

  grid.innerHTML = html;

  grid.querySelectorAll(".btn-guardar").forEach(btn => {
    btn.onclick = () => guardarPrediccion(btn.dataset.id);
  });

  partidos.forEach(p => {
    if (!partidoBloqueado(p)) {
      iniciarCronometro(p);
    }
  });
  
  console.log("✅ Partidos renderizados");
}

function iniciarCronometro(partido) {
  const el = document.getElementById("crono-" + partido.id);
  if (!el) return;

  const actualizar = () => {
    const ms = msHastaBloqueo(partido);
    if (ms <= 0) {
      el.textContent = "🔒 BLOQUEADO";
      el.style.color = "var(--red)";
      el.style.fontWeight = "700";
      return;
    }
    el.textContent = "⏱️ " + formatearTiempo(ms);
  };

  actualizar();
  const interval = setInterval(actualizar, 1000);
  intervalosCrono.push(interval);
}

// ═══════════════════════════════════════════════════════
// RENDERIZAR TARJETA
// ═══════════════════════════════════════════════════════

function renderTarjeta(p) {
  const pred = predicciones[p.id];
  const res = resultados[p.id];
  const guardado = !!pred;
  const esElim = !p.j || p.fase;
  const bloqueado = partidoBloqueado(p);
  
  const editable = guardado && !bloqueado;

  const flagL = FLAGS[p.local] || "🏳️";
  const flagV = FLAGS[p.visit] || "🏳️";
  const pts = guardado && res ? calcularPuntos(pred, res) : null;

  let marcadorHTML;
  
  if (guardado && !editable) {
    marcadorHTML = `
      <div class="score-saved">
        <span>${pred.local}</span>
        <span class="sep">–</span>
        <span>${pred.visit}</span>
      </div>
      ${esElim && pred.alargue_local !== null ? `
        <div style="font-size:10px; color:var(--text2); margin-top:4px; text-align:center;">
          Alargue: <strong>${pred.alargue_local} - ${pred.alargue_visit}</strong>
          ${pred.penales_local !== null ? ` · Penales: <strong>${pred.penales_local} - ${pred.penales_visit}</strong>` : ''}
        </div>
      ` : ''}
    `;
  } else {
    const valL = guardado ? pred.local : "";
    const valV = guardado ? pred.visit : "";
    const valAlL = guardado && pred.alargue_local !== null ? pred.alargue_local : "";
    const valAlV = guardado && pred.alargue_visit !== null ? pred.alargue_visit : "";
    const valPenL = guardado && pred.penales_local !== null ? pred.penales_local : "";
    const valPenV = guardado && pred.penales_visit !== null ? pred.penales_visit : "";
    
    const mostrarAlargue = esElim && (valAlL !== "" || (valL !== "" && valV !== "" && parseInt(valL) === parseInt(valV)));
    const mostrarPenales = esElim && (valPenL !== "" || (valAlL !== "" && valAlV !== "" && parseInt(valAlL) === parseInt(valAlV)));
    
    marcadorHTML = `
      <div class="marcador">
        <input type="number" min="0" max="20" class="score-in" id="gL-${p.id}" placeholder="0" value="${valL}" ${bloqueado ? "disabled" : ""}>
        <span class="sep">–</span>
        <input type="number" min="0" max="20" class="score-in" id="gV-${p.id}" placeholder="0" value="${valV}" ${bloqueado ? "disabled" : ""}>
      </div>
      ${esElim ? `
        <div class="ext-inputs" id="ext-${p.id}" style="display:${mostrarAlargue ? 'flex' : 'none'}; flex-direction:column; gap:6px; margin-top:8px; width:100%;">
          <div style="display:flex; gap:6px; align-items:center; justify-content:center;">
            <label style="font-size:11px; color:var(--text2);">Alargue:</label>
            <input type="number" min="0" max="20" class="score-in" id="alL-${p.id}" placeholder="0" value="${valAlL}" style="width:60px;">
            <span>–</span>
            <input type="number" min="0" max="20" class="score-in" id="alV-${p.id}" placeholder="0" value="${valAlV}" style="width:60px;">
          </div>
          <div id="pen-${p.id}" style="display:${mostrarPenales ? 'flex' : 'none'}; gap:6px; align-items:center; justify-content:center;">
            <label style="font-size:11px; color:var(--text2);">Penales:</label>
            <input type="number" min="0" max="20" class="score-in" id="penL-${p.id}" placeholder="0" value="${valPenL}" style="width:60px;">
            <span>–</span>
            <input type="number" min="0" max="20" class="score-in" id="penV-${p.id}" placeholder="0" value="${valPenV}" style="width:60px;">
          </div>
        </div>
      ` : ""}
    `;
  }

  let footerHTML = "";
  
  if (res && res.local !== null && res.local !== undefined) {
    footerHTML += `
      <div class="resultado-real">
        Resultado: <strong>${res.local} – ${res.visit}</strong>
        ${pts !== null ? `<span class="pts-badge">+${pts} pts</span>` : ""}
      </div>
    `;
  }
  
  if (bloqueado) {
    if (guardado) {
      footerHTML += `<span class="tag-bloqueado">🔒 Pronóstico definitivo</span>`;
    } else {
      footerHTML += `<span class="tag-bloqueado" style="color:var(--red);">🔒 No se pudo pronosticar</span>`;
    }
  } else if (editable) {
    footerHTML += `<button class="btn-guardar" data-id="${p.id}" style="background:var(--green);">🔄 Actualizar pronóstico</button>`;
  } else {
    footerHTML += `<button class="btn-guardar" data-id="${p.id}">💾 Guardar pronóstico</button>`;
  }

  let cronoHTML = "";
  if (!bloqueado) {
    cronoHTML = `
      <div class="crono-box">
        <span style="font-size:11px;">Se bloquea en: </span>
        <span id="crono-${p.id}" style="font-family:'Anton'; font-size:14px; color:var(--gold);">--:--:--</span>
      </div>
    `;
  }
  
  let estadoBadge = "";
  if (editable) {
    estadoBadge = `<span style="background:var(--green-soft); color:var(--green); padding:3px 10px; border-radius:10px; font-size:10px; font-weight:700;">✏️ EDITABLE</span>`;
  } else if (guardado && bloqueado) {
    estadoBadge = `<span style="background:var(--bg2); color:var(--text2); padding:3px 10px; border-radius:10px; font-size:10px; font-weight:700;">🔒 DEFINITIVO</span>`;
  }

  return `
    <div class="partido-card ${guardado ? "guardado" : ""} ${bloqueado && !guardado ? "bloqueado" : ""} ${editable ? "editable" : ""}">
      <div class="partido-meta">
        <span class="badge badge-id">${p.id}</span>
        ${p.grupo ? `<span class="badge badge-grupo">Grupo ${p.grupo}</span>` : ""}
        ${p.fase ? `<span class="badge badge-grupo">${p.fase.toUpperCase()}</span>` : ""}
        ${estadoBadge}
        <span class="badge badge-fecha">${p.fecha} · ${p.hora} ARG</span>
      </div>

      <div class="partido-equipos">
        <div class="equipo">
          <span class="flag">${flagL}</span>
          <span>${p.local}</span>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
          ${marcadorHTML}
        </div>
        <div class="equipo visitante">
          <span>${p.visit}</span>
          <span class="flag">${flagV}</span>
        </div>
      </div>

      ${cronoHTML}

      <div class="partido-footer">
        ${footerHTML}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// EVENTO INPUT
// ═══════════════════════════════════════════════════════

document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("score-in")) return;
  const id = e.target.id.replace("gL-", "").replace("gV-", "").replace("alL-", "").replace("alV-", "").replace("penL-", "").replace("penV-", "");
  const gL = document.getElementById("gL-" + id)?.value;
  const gV = document.getElementById("gV-" + id)?.value;
  const extDiv = document.getElementById("ext-" + id);
  const penDiv = document.getElementById("pen-" + id);
  
  if (!extDiv) return;

  if (gL !== "" && gV !== "" && parseInt(gL) === parseInt(gV)) {
    extDiv.style.display = "flex";
  } else {
    extDiv.style.display = "none";
    if (penDiv) penDiv.style.display = "none";
  }

  if (penDiv && extDiv.style.display === "flex") {
    const alL = document.getElementById("alL-" + id)?.value;
    const alV = document.getElementById("alV-" + id)?.value;
    if (alL !== "" && alV !== "" && parseInt(alL) === parseInt(alV)) {
      penDiv.style.display = "flex";
    } else {
      penDiv.style.display = "none";
    }
  }
});

// ═══════════════════════════════════════════════════════
// GUARDAR/ACTUALIZAR PREDICCIÓN
// ═══════════════════════════════════════════════════════

async function guardarPrediccion(id) {
  const p = TODOS_PARTIDOS.find(x => x.id === id);
  if (!p) return;

  if (partidoBloqueado(p)) {
    alert("🔒 Este partido ya está bloqueado. No se puede modificar.");
    return;
  }

  const gL = document.getElementById("gL-" + id).value;
  const gV = document.getElementById("gV-" + id).value;

  if (gL === "" || gV === "") {
    alert("⚠️ Completá ambos marcadores");
    return;
  }

  const esElim = !p.j || p.fase;
  let alargueLocal = null;
  let alargueVisit = null;
  let penalesLocal = null;
  let penalesVisit = null;

  if (esElim && parseInt(gL) === parseInt(gV)) {
    const alL = document.getElementById("alL-" + id)?.value;
    const alV = document.getElementById("alV-" + id)?.value;
    
    if (alL === "" || alV === "") {
      alert("⚠️ Elegí el marcador del alargue");
      return;
    }
    
    alargueLocal = parseInt(alL);
    alargueVisit = parseInt(alV);
    
    if (alargueLocal === alargueVisit) {
      const penL = document.getElementById("penL-" + id)?.value;
      const penV = document.getElementById("penV-" + id)?.value;
      
      if (penL === "" || penV === "") {
        alert("⚠️ Elegí el marcador de penales");
        return;
      }
      
      if (parseInt(penL) === parseInt(penV)) {
        alert("⚠️ En penales NO puede haber empate");
        return;
      }
      
      penalesLocal = parseInt(penL);
      penalesVisit = parseInt(penV);
    }
  }

  const esNueva = !predicciones[id];
  const mensajeConfirm = esNueva
    ? `¿Confirmás tu pronóstico?\n\n🏳️ ${p.local} ${gL} - ${gV} ${p.visit} 🏳️\n\nPodrás modificarlo hasta 5 minutos antes del inicio.`
    : `¿Confirmás la MODIFICACIÓN?\n\n🏳️ ${p.local} ${gL} - ${gV} ${p.visit} 🏳️\n\nReemplazará tu pronóstico anterior.\nPodrás seguir modificándolo hasta 5 minutos antes del inicio.`;

  if (!confirm(mensajeConfirm)) {
    return;
  }

  const datos = {
    user_id: usuarioId,
    partido_id: id,
    local: parseInt(gL),
    visit: parseInt(gV),
    alargue_local: alargueLocal,
    alargue_visit: alargueVisit,
    penales_local: penalesLocal,
    penales_visit: penalesVisit,
    fase: p.j ? "grupos" : p.fase,
    bloqueado: false
  };

  try {
    const { error } = await supabase
      .from('predicciones')
      .upsert(datos, { onConflict: 'user_id,partido_id' });

    if (error) throw error;

    predicciones[id] = datos;
    
    if (esNueva) {
      alert("✅ Pronóstico guardado. Podés modificarlo cuando quieras hasta 5 minutos antes del partido.");
    } else {
      alert("✅ Pronóstico actualizado correctamente.");
    }
    
    await cargarDatos();
    renderPartidos();
  } catch (err) {
    console.error(err);
    alert("❌ Error al guardar: " + err.message);
  }
}

// ═══════════════════════════════════════════════════════
// CAMPEÓN
// ═══════════════════════════════════════════════════════

function renderCampeon() {
  const loader = document.getElementById("campeonLoader");
  if (loader) loader.style.display = "none";

  const info = obtenerPuntosCampeonDisponibles();
  
  const ptsOp1 = document.getElementById("ptsOp1");
  const ptsOp2 = document.getElementById("ptsOp2");
  const ptsOp3 = document.getElementById("ptsOp3");
  
  if (ptsOp1) ptsOp1.textContent = info.puntos[0];
  if (ptsOp2) ptsOp2.textContent = info.puntos[1];
  if (ptsOp3) ptsOp3.textContent = info.puntos[2];

  const campeonFaseActual = document.getElementById("campeonFaseActual");
  if (campeonFaseActual) {
    const nombresFase = {
      "pre-inicio": "ANTES DEL PARTIDO INAUGURAL",
      "pre-fecha2": "ANTES DE FECHA 2 (jugando Fecha 1)",
      "pre-fecha3": "ANTES DE FECHA 3 (jugando Fecha 2)",
      "pre-16avos": "ANTES DE 16avos (jugando Fecha 3)",
      "pre-octavos": "ANTES DE OCTAVOS (jugando 16avos)",
      "pre-cuartos": "ANTES DE CUARTOS (jugando Octavos)",
      "pre-semis": "ANTES DE SEMIS (jugando Cuartos)",
      "pre-final": "ANTES DE LA FINAL (jugando Semis)",
      "cerrado": "CERRADO"
    };
    campeonFaseActual.textContent = "📍 Estado actual: " + (nombresFase[info.fase] || info.fase);
  }

  if (prediccionCampeon && prediccionCampeon.bloqueado) {
    const form = document.getElementById("campeonForm");
    const cerrado = document.getElementById("campeonCerrado");
    const guardado = document.getElementById("campeonGuardado");
    
    if (form) form.style.display = "none";
    if (cerrado) cerrado.style.display = "none";
    if (guardado) guardado.style.display = "block";

    const verCamp1 = document.getElementById("verCamp1");
    const verCamp2 = document.getElementById("verCamp2");
    const verCamp3 = document.getElementById("verCamp3");
    const verCamp1Pts = document.getElementById("verCamp1Pts");
    const verCamp2Pts = document.getElementById("verCamp2Pts");
    const verCamp3Pts = document.getElementById("verCamp3Pts");
    
    if (verCamp1) verCamp1.textContent = `${FLAGS[prediccionCampeon.opcion1] || "🏳️"} ${prediccionCampeon.opcion1}`;
    if (verCamp2) verCamp2.textContent = `${FLAGS[prediccionCampeon.opcion2] || "🏳️"} ${prediccionCampeon.opcion2}`;
    if (verCamp3) verCamp3.textContent = `${FLAGS[prediccionCampeon.opcion3] || "🏳️"} ${prediccionCampeon.opcion3}`;
    
    const pts = prediccionCampeon.puntos_otorgados || [100, 80, 60];
    if (verCamp1Pts) verCamp1Pts.textContent = `+${pts[0]} pts si es campeón`;
    if (verCamp2Pts) verCamp2Pts.textContent = `+${pts[1]} pts si es campeón`;
    if (verCamp3Pts) verCamp3Pts.textContent = `+${pts[2]} pts si es campeón`;
    
  } else if (info.cerrado) {
    const form = document.getElementById("campeonForm");
    const cerrado = document.getElementById("campeonCerrado");
    const guardado = document.getElementById("campeonGuardado");
    
    if (form) form.style.display = "none";
    if (cerrado) cerrado.style.display = "block";
    if (guardado) guardado.style.display = "none";
    
  } else {
    const form = document.getElementById("campeonForm");
    const cerrado = document.getElementById("campeonCerrado");
    const guardado = document.getElementById("campeonGuardado");
    
    if (form) form.style.display = "block";
    if (cerrado) cerrado.style.display = "none";
    if (guardado) guardado.style.display = "none";

    const opciones = SELECCIONES
      .sort((a, b) => a.localeCompare(b))
      .map(s => `<option value="${s}">${FLAGS[s] || "🏳️"} ${s}</option>`)
      .join("");

    const camp1 = document.getElementById("camp1");
    const camp2 = document.getElementById("camp2");
    const camp3 = document.getElementById("camp3");
    
    if (camp1) camp1.innerHTML = '<option value="">-- Seleccionar --</option>' + opciones;
    if (camp2) camp2.innerHTML = '<option value="">-- Seleccionar --</option>' + opciones;
    if (camp3) camp3.innerHTML = '<option value="">-- Seleccionar --</option>' + opciones;

    const btnGuardar = document.getElementById("btnGuardarCampeon");
    if (btnGuardar) btnGuardar.onclick = guardarCampeon;
    
    ["camp1", "camp2", "camp3"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.onchange = validarCampeon;
    });
  }
}

function validarCampeon() {
  const v1 = document.getElementById("camp1")?.value;
  const v2 = document.getElementById("camp2")?.value;
  const v3 = document.getElementById("camp3")?.value;

  const msg = document.getElementById("campeonMsg");
  if (!msg) return true;

  if (v1 && v2 && v1 === v2) {
    msg.textContent = "⚠️ No podés repetir selecciones";
    msg.style.background = "var(--red-soft)";
    msg.style.border = "1px solid var(--red)";
    msg.style.color = "var(--red)";
    msg.style.display = "block";
    return false;
  }
  if (v1 && v3 && v1 === v3) {
    msg.textContent = "⚠️ No podés repetir selecciones";
    msg.style.background = "var(--red-soft)";
    msg.style.border = "1px solid var(--red)";
    msg.style.color = "var(--red)";
    msg.style.display = "block";
    return false;
  }
  if (v2 && v3 && v2 === v3) {
    msg.textContent = "⚠️ No podés repetir selecciones";
    msg.style.background = "var(--red-soft)";
    msg.style.border = "1px solid var(--red)";
    msg.style.color = "var(--red)";
    msg.style.display = "block";
    return false;
  }

  msg.style.display = "none";
  return true;
}

async function guardarCampeon() {
  const v1 = document.getElementById("camp1")?.value;
  const v2 = document.getElementById("camp2")?.value;
  const v3 = document.getElementById("camp3")?.value;

  if (!v1 || !v2 || !v3) {
    alert("Debés elegir las 3 opciones");
    return;
  }

  if (!validarCampeon()) return;

  const info = obtenerPuntosCampeonDisponibles();
  if (info.cerrado) {
    alert("🔒 El pronóstico del campeón está cerrado");
    renderCampeon();
    return;
  }

  const pts = info.puntos;

  if (!confirm(`¿Confirmás tu pronóstico del campeón?\n\n🥇 Opción 1: ${v1} (+${pts[0]} pts)\n🥈 Opción 2: ${v2} (+${pts[1]} pts)\n🥉 Opción 3: ${v3} (+${pts[2]} pts)\n\n⚠️ NO PODRÁS MODIFICARLO`)) {
    return;
  }

  try {
    const { error } = await supabase
      .from('campeones')
      .upsert({
        user_id: usuarioId,
        opcion1: v1,
        opcion2: v2,
        opcion3: v3,
        fase_al_pronunciar: info.fase,
        puntos_otorgados: pts,
        bloqueado: true
      }, { onConflict: 'user_id' });

    if (error) throw error;

    prediccionCampeon = { 
      opcion1: v1, 
      opcion2: v2, 
      opcion3: v3, 
      bloqueado: true, 
      puntos_otorgados: pts,
      fase_al_pronunciar: info.fase
    };
    
    alert("✅ Pronóstico del campeón guardado");
    await cargarCampeon();
    renderCampeon();
    actualizarStats();
  } catch (err) {
    console.error(err);
    alert("❌ Error al guardar: " + err.message);
  }
}

// INICIAR
init();
