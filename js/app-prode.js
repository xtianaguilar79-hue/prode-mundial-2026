import { supabase } from "./supabase-config.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, PUNTOS, 
  calcularPuntos, SELECCIONES, obtenerPuntosCampeonDisponibles,
  calcularPuntosCampeon, msHastaBloqueo, formatearTiempo, partidoBloqueado
} from "../datos-partidos.js";

console.log("📋 app-prode.js cargado");

let usuarioId = null;
let predicciones = {};
let resultados = {};
let prediccionCampeon = null;
let resultadoFinal = null;
let faseActiva = "j1";
let intervalosCrono = [];

window.addEventListener("usuarioListo", async (e) => {
  console.log("✅ Usuario listo:", e.detail.perfil.nombre);
  usuarioId = e.detail.user.uid;
  
  await cargarDatos();
  await cargarCampeon();
  renderTabs();
  renderPartidos();
  renderCampeon();
});

async function cargarDatos() {
  try {
    const { data: predsData } = await supabase
      .from('predicciones')
      .select('*')
      .eq('user_id', usuarioId);

    predicciones = {};
    if (predsData) predsData.forEach(p => { predicciones[p.partido_id] = p; });

    const { data: resData } = await supabase
      .from('resultados')
      .select('*')
      .eq('es_prueba', false);

    resultados = {};
    if (resData) resData.forEach(r => { resultados[r.partido_id] = r; });

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
  Object.values(predicciones).forEach(pred => {
    const res = resultados[pred.partido_id];
    if (res) total += calcularPuntos(pred, res);
  });

  if (prediccionCampeon && resultadoFinal?.campeon) {
    total += calcularPuntosCampeon(prediccionCampeon, resultadoFinal.campeon);
  }

  const bonus = Object.keys(predicciones).length >= 104 ? 100 : 0;
  total += bonus;

  const statPts = document.getElementById("statPts");
  const statPred = document.getElementById("statPred");
  const statFidelidad = document.getElementById("statFidelidad");
  
  if (statPts) statPts.textContent = total;
  if (statPred) statPred.textContent = `${Object.keys(predicciones).length}/104`;
  if (statFidelidad) {
    statFidelidad.textContent = bonus > 0 ? "✓" : "✗";
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

function renderPartidos() {
  const loader = document.getElementById("partidosLoader");
  const grid = document.getElementById("partidosGrid");
  
  if (!loader || !grid) {
    console.error("❌ No se encontró loader o grid");
    return;
  }

  loader.style.display = "none";
  grid.style.display = "grid";

  const partidos = getPartidosFase();

  if (partidos.length === 0) {
    grid.innerHTML = '<p style="text-align:center; color:var(--text2); padding:40px; grid-column:1/-1;">No hay partidos</p>';
    return;
  }

  grid.innerHTML = partidos.map(p => renderTarjeta(p)).join("");

  grid.querySelectorAll(".btn-guardar").forEach(btn => {
    btn.onclick = () => guardarPrediccion(btn.dataset.id);
  });

  partidos.forEach(p => {
    if (!predicciones[p.id] && !partidoBloqueado(p)) {
      iniciarCronometro(p);
    }
  });
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
  intervalosCrono.push(setInterval(actualizar, 1000));
}

function renderTarjeta(p) {
  const pred = predicciones[p.id];
  const res = resultados[p.id];
  const guardado = !!pred;
  const esElim = !p.j || p.fase;
  const bloqueado = partidoBloqueado(p);

  const flagL = FLAGS[p.local] || "🏳️";
  const flagV = FLAGS[p.visit] || "🏳️";
  const pts = guardado && res ? calcularPuntos(pred, res) : null;

  let marcadorHTML;
  if (guardado) {
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
    marcadorHTML = `
      <div class="marcador">
        <input type="number" min="0" max="20" class="score-in" id="gL-${p.id}" placeholder="0" ${bloqueado ? "disabled" : ""}>
        <span class="sep">–</span>
        <input type="number" min="0" max="20" class="score-in" id="gV-${p.id}" placeholder="0" ${bloqueado ? "disabled" : ""}>
      </div>
      ${esElim ? `
        <div class="ext-inputs" id="ext-${p.id}" style="display:none; flex-direction:column; gap:6px; margin-top:8px; width:100%;">
          <div style="display:flex; gap:6px; align-items:center; justify-content:center;">
            <label style="font-size:11px; color:var(--text2);">Alargue:</label>
            <input type="number" min="0" max="20" class="score-in" id="alL-${p.id}" placeholder="0" style="width:60px;">
            <span>–</span>
            <input type="number" min="0" max="20" class="score-in" id="alV-${p.id}" placeholder="0" style="width:60px;">
          </div>
          <div id="pen-${p.id}" style="display:none; gap:6px; align-items:center; justify-content:center;">
            <label style="font-size:11px; color:var(--text2);">Penales:</label>
            <input type="number" min="0" max="20" class="score-in" id="penL-${p.id}" placeholder="0" style="width:60px;">
            <span>–</span>
            <input type="number" min="0" max="20" class="score-in" id="penV-${p.id}" placeholder="0" style="width:60px;">
          </div>
        </div>
      ` : ""}
    `;
  }

  return `
    <div class="partido-card ${guardado ? "guardado" : ""} ${bloqueado && !guardado ? "bloqueado" : ""}">
      <div class="partido-meta">
        <span class="badge badge-id">${p.id}</span>
        ${p.grupo ? `<span class="badge badge-grupo">Grupo ${p.grupo}</span>` : ""}
        ${p.fase ? `<span class="badge badge-grupo">${p.fase.toUpperCase()}</span>` : ""}
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

      ${!guardado && !bloqueado ? `
        <div class="crono-box">
          <span style="font-size:11px;">Se bloquea en: </span>
          <span id="crono-${p.id}" style="font-family:'Anton'; font-size:14px; color:var(--gold);">--:--:--</span>
        </div>
      ` : ""}

      <div class="partido-footer">
        ${res ? `
          <div class="resultado-real">
            Resultado: <strong>${res.local} – ${res.visit}</strong>
            ${pts !== null ? `<span class="pts-badge">+${pts} pts</span>` : ""}
          </div>
        ` : ""}
        ${guardado 
          ? `<span class="tag-bloqueado">🔒 Guardado</span>` 
          : bloqueado 
            ? `<span class="tag-bloqueado" style="color:var(--red);">🔒 Bloqueado</span>`
            : `<button class="btn-guardar" data-id="${p.id}">Guardar pronóstico</button>`
        }
      </div>
    </div>
  `;
}

document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("score-in")) return;
  const id = e.target.id.replace("gL-", "").replace("gV-", "").replace("alL-", "").replace("alV-", "");
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

async function guardarPrediccion(id) {
  const p = TODOS_PARTIDOS.find(x => x.id === id);
  if (!p) return;

  if (partidoBloqueado(p)) {
    alert("🔒 Este partido ya está bloqueado.");
    return;
  }

  const gL = document.getElementById("gL-" + id).value;
  const gV = document.getElementById("gV-" + id).value;

  if (gL === "" || gV === "") {
    alert("Completá ambos marcadores");
    return;
  }

  if (!confirm(`¿Confirmás tu pronóstico?\n\n${p.local} ${gL} - ${gV} ${p.visit}\n\n⚠️ NO PODRÁS MODIFICARLO`)) {
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
      alert("Elegí el marcador del alargue");
      return;
    }
    
    alargueLocal = parseInt(alL);
    alargueVisit = parseInt(alV);
    
    if (alargueLocal === alargueVisit) {
      const penL = document.getElementById("penL-" + id)?.value;
      const penV = document.getElementById("penV-" + id)?.value;
      
      if (penL === "" || penV === "") {
        alert("Elegí el marcador de penales");
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
    bloqueado: true
  };

  try {
    const { error } = await supabase
      .from('predicciones')
      .upsert(datos, { onConflict: 'user_id,partido_id' });

    if (error) throw error;

    predicciones[id] = datos;
    alert("✅ Pronóstico guardado");
    await cargarDatos();
    renderPartidos();
  } catch (err) {
    console.error(err);
    alert("Error al guardar: " + err.message);
  }
}

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
    campeonFaseActual.textContent = "📍 Estado actual: " + info.fase;
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
    
    if (verCamp1) verCamp1.textContent = `${FLAGS[prediccionCampeon.opcion1] || "🏳️"} ${prediccionCampeon.opcion1}`;
    if (verCamp2) verCamp2.textContent = `${FLAGS[prediccionCampeon.opcion2] || "🏳️"} ${prediccionCampeon.opcion2}`;
    if (verCamp3) verCamp3.textContent = `${FLAGS[prediccionCampeon.opcion3] || "🏳️"} ${prediccionCampeon.opcion3}`;
  }
}