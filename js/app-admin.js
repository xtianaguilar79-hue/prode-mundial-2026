import { supabase, obtenerUsuario } from "./auth-guard.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, SELECCIONES
} from "../datos-partidos.js";
import { actualizarEquiposEliminatorias, obtenerPartidosConEquiposReales } from "./clasificaciones.js";

let faseActiva = "j1";
let resultados = {};
let partidosConEquiposReales = TODOS_PARTIDOS;

async function cargarResultados() {
  try {
    const { data, error } = await supabase
      .from('resultados')
      .select('*');

    if (error) throw error;

    resultados = {};
    data.forEach(r => { resultados[r.partido_id] = r; });
    console.log("✅ Resultados cargados:", Object.keys(resultados).length);
  } catch (err) {
    console.error("Error al cargar resultados:", err);
  }
}

async function cargarEquiposReales() {
  try {
    partidosConEquiposReales = await obtenerPartidosConEquiposReales();
    console.log("✅ Equipos reales cargados en admin");
  } catch (err) {
    console.error("Error al cargar equipos reales:", err);
    partidosConEquiposReales = TODOS_PARTIDOS;
  }
}

function renderTabs() {
  const tabs = [
    { id: "j1", label: "Fecha 1" },
    { id: "j2", label: "Fecha 2" },
    { id: "j3", label: "Fecha 3" },
    { id: "16avos", label: "16avos" },
    { id: "octavos", label: "Octavos" },
    { id: "cuartos", label: "Cuartos" },
    { id: "semis", label: "Semis" },
    { id: "3er", label: "3er Puesto" },
    { id: "final", label: "Final " },
  ];

  document.getElementById("faseTabs").innerHTML = tabs.map(t => `
    <button class="fase-btn ${faseActiva === t.id ? "active" : ""}" data-fase="${t.id}">
      ${t.label}
    </button>
  `).join("");

  document.querySelectorAll(".fase-btn").forEach(btn => {
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
  const cont = document.getElementById("partidosAdmin");
  const partidos = getPartidosFase();
  
  console.log(`📋 Renderizando fase ${faseActiva}: ${partidos.length} partidos`);
  
  cont.innerHTML = partidos.map(p => {
    const partidoReal = partidosConEquiposReales.find(x => x.id === p.id) || p;
    const flagL = FLAGS[partidoReal.local] || "🏳️";
    const flagV = FLAGS[partidoReal.visit] || "️";
    const res = resultados[p.id];
    const esElim = !p.j || p.fase;
    
    let showAlargue = false;
    let showPenales = false;
    
    if (res) {
      if (res.local !== undefined && res.visit !== undefined && parseInt(res.local) === parseInt(res.visit)) {
        showAlargue = true;
        if (res.alargue_local !== null && res.alargue_visit !== null && 
            parseInt(res.alargue_local) === parseInt(res.alargue_visit)) {
          showPenales = true;
        }
      }
    }
    
    return `
      <div class="partido-card admin">
        <div class="partido-meta">
          <span class="badge badge-id">${p.id}</span>
          ${p.grupo ? `<span class="badge badge-grupo">Grupo ${p.grupo}</span>` : ""}
          ${p.fase ? `<span class="badge badge-grupo">${p.fase.toUpperCase()}</span>` : ""}
          <span class="badge badge-fecha">${p.fecha} · ${p.hora} ARG</span>
        </div>

        <div class="partido-equipos">
          <div class="equipo">
            <span class="flag">${flagL}</span>
            <span>${partidoReal.local}</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
            <div class="marcador">
              <input type="number" min="0" max="20" class="score-in" id="gL-${p.id}" value="${res?.local ?? ''}" placeholder="0">
              <span class="sep">–</span>
              <input type="number" min="0" max="20" class="score-in" id="gV-${p.id}" value="${res?.visit ?? ''}" placeholder="0">
            </div>
            ${esElim ? `
              <div class="ext-inputs" id="ext-${p.id}" style="display:${showAlargue ? 'flex' : 'none'}; flex-direction:column; gap:6px; margin-top:8px; width:100%;">
                <div style="display:flex; gap:6px; align-items:center;">
                  <label style="font-size:11px; color:var(--text2); min-width:80px;">Alargue:</label>
                  <input type="number" min="0" max="20" class="score-in" id="alL-${p.id}" value="${res?.alargue_local ?? ''}" placeholder="0" style="width:60px;">
                  <span>–</span>
                  <input type="number" min="0" max="20" class="score-in" id="alV-${p.id}" value="${res?.alargue_visit ?? ''}" placeholder="0" style="width:60px;">
                </div>
                <div id="pen-${p.id}" style="display:${showPenales ? 'flex' : 'none'}; gap:6px; align-items:center;">
                  <label style="font-size:11px; color:var(--text2); min-width:80px;">Penales:</label>
                  <input type="number" min="0" max="20" class="score-in" id="penL-${p.id}" value="${res?.penales_local ?? ''}" placeholder="0" style="width:60px;">
                  <span>–</span>
                  <input type="number" min="0" max="20" class="score-in" id="penV-${p.id}" value="${res?.penales_visit ?? ''}" placeholder="0" style="width:60px;">
                </div>
              </div>
            ` : ""}
          </div>
          <div class="equipo visitante">
            <span>${partidoReal.visit}</span>
            <span class="flag">${flagV}</span>
          </div>
        </div>

        <div class="partido-footer">
          <button class="btn-guardar btn-res" data-id="${p.id}" style="padding:8px 16px;">
            ${res ? "✓ Actualizar" : " Cargar resultado"}
          </button>
          ${res ? `<button class="btn-guardar btn-limpiar" data-borrar="${p.id}" style="padding:8px 16px; margin-left:8px;">🗑️ Borrar</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  setupEventListeners();

  cont.querySelectorAll(".btn-res").forEach(btn => {
    btn.onclick = () => guardarResultado(btn.dataset.id);
  });
  
  cont.querySelectorAll("[data-borrar]").forEach(btn => {
    btn.onclick = () => borrarResultado(btn.dataset.borrar);
  });
}

function setupEventListeners() {
  document.querySelectorAll(".score-in").forEach(input => {
    input.addEventListener("input", (e) => {
      const id = e.target.id.replace("gL-", "").replace("gV-", "").replace("alL-", "").replace("alV-", "");
      
      const gL = document.getElementById("gL-" + id)?.value;
      const gV = document.getElementById("gV-" + id)?.value;
      const alL = document.getElementById("alL-" + id)?.value;
      const alV = document.getElementById("alV-" + id)?.value;
      
      const extDiv = document.getElementById("ext-" + id);
      const penDiv = document.getElementById("pen-" + id);
      
      if (extDiv) {
        if (gL !== "" && gV !== "" && parseInt(gL) === parseInt(gV)) {
          extDiv.style.display = "flex";
        } else {
          extDiv.style.display = "none";
          if (penDiv) penDiv.style.display = "none";
        }
      }
      
      if (penDiv && extDiv && extDiv.style.display === "flex") {
        if (alL !== "" && alV !== "" && parseInt(alL) === parseInt(alV)) {
          penDiv.style.display = "flex";
        } else {
          penDiv.style.display = "none";
        }
      }
    });
  });
}

async function guardarResultado(id) {
  const p = TODOS_PARTIDOS.find(x => x.id === id);
  if (!p) return;

  const gL = document.getElementById("gL-" + id).value;
  const gV = document.getElementById("gV-" + id).value;

  if (gL === "" || gV === "") {
    mostrarMensaje("⚠️ Completá ambos marcadores", "error");
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
      mostrarMensaje("⚠️ Completá el marcador del alargue", "error");
      return;
    }
    
    alargueLocal = parseInt(alL);
    alargueVisit = parseInt(alV);
    
    if (alargueLocal === alargueVisit) {
      const penL = document.getElementById("penL-" + id)?.value;
      const penV = document.getElementById("penV-" + id)?.value;
      
      if (penL === "" || penV === "") {
        mostrarMensaje("⚠️ Completá el marcador de penales", "error");
        return;
      }
      
      if (parseInt(penL) === parseInt(penV)) {
        mostrarMensaje("⚠️ En penales NO puede haber empate", "error");
        return;
      }
      
      penalesLocal = parseInt(penL);
      penalesVisit = parseInt(penV);
    }
  }

  const datos = {
    id: id,
    partido_id: id,
    local: parseInt(gL),
    visit: parseInt(gV),
    alargue_local: alargueLocal,
    alargue_visit: alargueVisit,
    penales_local: penalesLocal,
    penales_visit: penalesVisit,
    es_prueba: false
  };

  try {
    const { error } = await supabase
      .from('resultados')
      .upsert(datos, { onConflict: 'id' });

    if (error) throw error;

    mostrarMensaje("✅ Resultado guardado correctamente", "ok");
    await cargarResultados();
    await cargarEquiposReales();
    renderPartidos();
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
}

async function borrarResultado(id) {
  if (!confirm(`¿Borrar el resultado del partido ${id}?`)) return;

  try {
    const { error } = await supabase
      .from('resultados')
      .delete()
      .eq('id', id);

    if (error) throw error;

    mostrarMensaje("🗑️ Resultado borrado", "ok");
    await cargarResultados();
    await cargarEquiposReales();
    renderPartidos();
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
}

window.generarPrueba = async () => {
  if (!confirm("¿Generar resultados de PRUEBA para todos los partidos?\n\nEsto es solo para testing.")) return;

  try {
    const pruebas = TODOS_PARTIDOS.map(p => ({
      id: p.id,
      partido_id: p.id,
      local: Math.floor(Math.random() * 4),
      visit: Math.floor(Math.random() * 4),
      alargue_local: null,
      alargue_visit: null,
      penales_local: null,
      penales_visit: null,
      es_prueba: true
    }));

    const { error } = await supabase
      .from('resultados')
      .upsert(pruebas, { onConflict: 'id' });

    if (error) throw error;

    mostrarMensaje("🧪 Resultados de prueba generados", "ok");
    await cargarResultados();
    await cargarEquiposReales();
    renderPartidos();
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
};

window.limpiarPrueba = async () => {
  if (!confirm("¿Borrar SOLO los resultados de PRUEBA?")) return;

  try {
    const { error } = await supabase
      .from('resultados')
      .delete()
      .eq('es_prueba', true);

    if (error) throw error;

    mostrarMensaje("🧹 Pruebas limpiadas", "ok");
    await cargarResultados();
    await cargarEquiposReales();
    renderPartidos();
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
};

window.reiniciar = async () => {
  if (!confirm("⚠️ ¿REINICIAR TODO EL PRODE?\n\nSe borrarán:\n- Todos los resultados\n- Todas las predicciones\n- Todos los campeones\n- Todos los clasificados\n\nEsta acción NO se puede deshacer.")) return;

  if (!confirm("⚠️ ¿ESTÁS SEGURO? Esta es la última confirmación.")) return;

  try {
    await supabase.from('resultados').delete().neq('id', '');
    await supabase.from('predicciones').delete().neq('id', '');
    await supabase.from('campeones').delete().neq('id', '');
    await supabase.from('config').delete().neq('id', '');
    await supabase.from('clasificados').delete().neq('posicion', '');

    mostrarMensaje("⚠️ Prode reiniciado completamente", "ok");
    await cargarResultados();
    await cargarEquiposReales();
    renderPartidos();
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
};

window.guardarCampeonReal = async () => {
  const campeon = document.getElementById("realCampeon").value;
  if (!campeon) {
    alert("Seleccioná un campeón");
    return;
  }

  if (!confirm(`¿Confirmás que ${campeon} es el campeón del Mundial?\n\nEsta acción calculará los puntos de todos los usuarios.`)) return;

  try {
    const { error } = await supabase
      .from('config')
      .upsert({
        id: 'final',
        campeon: campeon
      }, { onConflict: 'id' });

    if (error) throw error;

    mostrarMensaje(`🏆 Campeón guardado: ${campeon}`, "ok");
    cargarCampeonReal();
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
};

window.actualizarEquipos = async () => {
  if (!confirm("¿Actualizar los equipos de las fases eliminatorias?\n\nSe calcularán los clasificados y se actualizarán los cruces.")) return;

  try {
    const resultado = await actualizarEquiposEliminatorias();
    mostrarMensaje(`✅ Equipos actualizados. Fase: ${resultado.fase}. Partidos actualizados: ${Object.keys(resultado.partidosActualizados).length}`, "ok");
    await cargarEquiposReales();
    renderPartidos();
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
};

async function cargarCampeonReal() {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('*')
      .eq('id', 'final')
      .single();

    if (!error && data) {
      document.getElementById("realCampeon").value = data.campeon;
      document.getElementById("campeonRealActual").textContent = 
        `🏆 Campeón actual: ${FLAGS[data.campeon] || "🏳️"} ${data.campeon}`;
    }
  } catch (err) {
    console.error(err);
  }
}

function mostrarMensaje(msg, tipo) {
  const el = document.getElementById("mensaje");
  el.textContent = msg;
  el.style.background = tipo === "ok" ? "var(--green-soft)" : "var(--red-soft)";
  el.style.border = tipo === "ok" ? "1px solid var(--green)" : "1px solid var(--red)";
  el.style.color = tipo === "ok" ? "var(--green)" : "var(--red)";
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 4000);
}

async function init() {
  console.log(" Iniciando admin...");
  await cargarResultados();
  await cargarEquiposReales();
  await cargarCampeonReal();
  renderTabs();
  renderPartidos();

  const select = document.getElementById("realCampeon");
  if (select) {
    select.innerHTML = '<option value="">-- Seleccionar campeón --</option>' +
      SELECCIONES.sort((a, b) => a.localeCompare(b))
        .map(s => `<option value="${s}">${FLAGS[s] || "🏳️"} ${s}</option>`)
        .join("");
  }
}

// INICIALIZACIÓN DIRECTA - sin esperar eventos
(async () => {
  try {
    await protegerPagina(true);
    await init();
  } catch (err) {
    console.error("Error en init:", err);
  }
})();