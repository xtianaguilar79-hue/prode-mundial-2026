import { supabase } from "./supabase-config.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, SELECCIONES
} from "../datos-partidos.js";

console.log("📋 app-admin.js cargado");

let faseActiva = "j1";
let resultados = {};

window.addEventListener("usuarioListo", async () => {
  console.log("✅ Admin iniciado");
  await cargarResultados();
  renderTabs();
  renderPartidos();
  cargarCampeonReal();
});

async function cargarResultados() {
  const { data } = await supabase.from('resultados').select('*');
  resultados = {};
  if (data) data.forEach(r => { resultados[r.partido_id] = r; });
  console.log("✅ Resultados cargados:", Object.keys(resultados).length);
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
  const cont = document.getElementById("partidosAdmin");
  if (!cont) return;
  
  const partidos = getPartidosFase();
  console.log(`📋 Renderizando ${partidos.length} partidos`);
  
  if (partidos.length === 0) {
    cont.innerHTML = '<p style="text-align:center; color:var(--text2); padding:40px;">No hay partidos</p>';
    return;
  }
  
  cont.innerHTML = partidos.map(p => {
    const res = resultados[p.id];
    const flagL = FLAGS[p.local] || "🏳️";
    const flagV = FLAGS[p.visit] || "🏳️";
    const esElim = !p.j || p.fase;
    
    let showAlargue = false;
    let showPenales = false;
    
    if (res && res.local !== undefined && res.visit !== undefined) {
      if (parseInt(res.local) === parseInt(res.visit)) {
        showAlargue = true;
        if (res.alargue_local !== null && parseInt(res.alargue_local) === parseInt(res.alargue_visit)) {
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
            <span>${p.local}</span>
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
            <span>${p.visit}</span>
            <span class="flag">${flagV}</span>
          </div>
        </div>

        <div class="partido-footer">
          <button class="btn-guardar btn-res" data-id="${p.id}" style="padding:8px 16px;">
            ${res ? "✓ Actualizar" : "💾 Cargar resultado"}
          </button>
          ${res ? `<button class="btn-guardar btn-limpiar" data-borrar="${p.id}" style="padding:8px 16px; margin-left:8px;">🗑️ Borrar</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  cont.querySelectorAll(".btn-res").forEach(btn => {
    btn.onclick = () => guardarResultado(btn.dataset.id);
  });
  
  cont.querySelectorAll("[data-borrar]").forEach(btn => {
    btn.onclick = () => borrarResultado(btn.dataset.borrar);
  });

  cont.querySelectorAll(".score-in").forEach(input => {
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
      mostrarMensaje("⚠️ Completá el alargue", "error");
      return;
    }
    
    alargueLocal = parseInt(alL);
    alargueVisit = parseInt(alV);
    
    if (alargueLocal === alargueVisit) {
      const penL = document.getElementById("penL-" + id)?.value;
      const penV = document.getElementById("penV-" + id)?.value;
      
      if (penL === "" || penV === "") {
        mostrarMensaje("⚠️ Completá los penales", "error");
        return;
      }
      
      if (parseInt(penL) === parseInt(penV)) {
        mostrarMensaje("⚠️ En penales NO hay empate", "error");
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
    const { error } = await supabase.from('resultados').upsert(datos, { onConflict: 'id' });
    if (error) throw error;

    mostrarMensaje("✅ Resultado guardado", "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
}

async function borrarResultado(id) {
  if (!confirm(`¿Borrar resultado ${id}?`)) return;

  try {
    await supabase.from('resultados').delete().eq('id', id);
    mostrarMensaje("🗑️ Resultado borrado", "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
}

window.generarPrueba = async () => {
  if (!confirm("¿Generar resultados de PRUEBA?\n\n⚠️ Los usuarios NO los verán")) return;

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

    await supabase.from('resultados').upsert(pruebas, { onConflict: 'id' });
    mostrarMensaje("🧪 Resultados de prueba generados", "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
};

window.limpiarPrueba = async () => {
  if (!confirm("¿Borrar SOLO resultados de PRUEBA?")) return;

  try {
    await supabase.from('resultados').delete().eq('es_prueba', true);
    mostrarMensaje("🧹 Pruebas limpiadas", "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
};

window.reiniciar = async () => {
  if (!confirm("⚠️ ¿REINICIAR TODO?")) return;
  if (!confirm("¿ESTÁS SEGURO?")) return;

  try {
    await supabase.from('resultados').delete().neq('id', '');
    await supabase.from('predicciones').delete().neq('id', '');
    await supabase.from('campeones').delete().neq('id', '');
    await supabase.from('config').delete().neq('id', '');
    await supabase.from('clasificados').delete().neq('posicion', '');

    mostrarMensaje("⚠️ Prode reiniciado", "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
};

window.guardarCampeonReal = async () => {
  const campeon = document.getElementById("realCampeon").value;
  if (!campeon) {
    alert("Seleccioná un campeón");
    return;
  }

  try {
    await supabase.from('config').upsert({ id: 'final', campeon }, { onConflict: 'id' });
    mostrarMensaje(`🏆 Campeón: ${campeon}`, "ok");
    cargarCampeonReal();
  } catch (err) {
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
};

window.actualizarEquipos = async () => {
  alert("Función temporalmente deshabilitada. Se implementará después del Mundial.");
};

async function cargarCampeonReal() {
  const { data } = await supabase.from('config').select('*').eq('id', 'final').single();
  if (data) {
    document.getElementById("realCampeon").value = data.campeon;
    document.getElementById("campeonRealActual").textContent = `🏆 ${FLAGS[data.campeon] || "🏳️"} ${data.campeon}`;
  }
}

function mostrarMensaje(msg, tipo) {
  const el = document.getElementById("mensaje");
  if (!el) return;
  el.textContent = msg;
  el.style.background = tipo === "ok" ? "var(--green-soft)" : "var(--red-soft)";
  el.style.border = tipo === "ok" ? "1px solid var(--green)" : "1px solid var(--red)";
  el.style.color = tipo === "ok" ? "var(--green)" : "var(--red)";
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 4000);
}