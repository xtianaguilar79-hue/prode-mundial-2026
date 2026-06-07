import { db } from "./firebase-config.js";
import { 
  collection, getDocs, doc, setDoc, query, where, 
  writeBatch, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, SELECCIONES
} from "../datos-partidos.js";

let usuario = null;
let faseActiva = "j1";
let resultados = {};

window.addEventListener("usuarioListo", async (e) => {
  usuario = e.detail.user;
  document.getElementById("userName").textContent = e.detail.perfil.nombre;
  await cargarResultados();
  inicializarCampeonReal();
  renderTabs();
  renderPartidos();
});

async function cargarResultados() {
  const snap = await getDocs(collection(db, "resultados"));
  resultados = {};
  snap.forEach(d => { resultados[d.id] = d.data(); });
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
    { id: "final", label: "Final 🏆" },
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

  cont.innerHTML = `
    <div class="admin-section">
      <h3>${partidos.length} partidos</h3>
      ${partidos.map(p => {
        const r = resultados[p.id] || {};
        const esElim = !p.j;
        
        return `
          <div class="res-row" data-id="${p.id}">
            <span class="res-id">${p.id}</span>
            <span class="res-match">${p.local} vs ${p.visit}</span>
            
            <input type="number" min="0" max="20" class="res-in" id="rL-${p.id}" value="${r.local ?? ""}" placeholder="L">
            <span style="color:var(--text2);">–</span>
            <input type="number" min="0" max="20" class="res-in" id="rV-${p.id}" value="${r.visit ?? ""}" placeholder="V">
            
            ${esElim ? `
              <select class="sel" id="rAl-${p.id}" style="display:${r.local!==undefined && r.local===r.visit ? 'inline-block':'none'}; min-width:110px;">
                <option value="">Alargue...</option>
                <option value="L" ${r.alargue==='L'?'selected':''}>Gana Local</option>
                <option value="E" ${r.alargue==='E'?'selected':''}>→ Penales</option>
                <option value="V" ${r.alargue==='V'?'selected':''}>Gana Visit.</option>
              </select>
              <select class="sel" id="rPen-${p.id}" style="display:${r.alargue==='E' ? 'inline-block':'none'}; min-width:110px;">
                <option value="">Ganador Pen.</option>
                <option value="L" ${r.penales==='L'?'selected':''}>Local</option>
                <option value="V" ${r.penales==='V'?'selected':''}>Visitante</option>
              </select>
            ` : ''}

            <button class="btn-res" onclick="guardarResultado('${p.id}')">
              ${r.local !== undefined ? "✓ Actualizar" : "Cargar"}
            </button>
            ${r.esPrueba ? `<span style="color:var(--accent); font-size:10px; font-weight:700;">🧪 PRUEBA</span>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// Event listeners dinámicos para mostrar/ocultar selects de alargue/penales
document.addEventListener("change", (e) => {
  if (e.target.id && e.target.id.startsWith("rAl-")) {
    const id = e.target.id.replace("rAl-", "");
    const penSel = document.getElementById("rPen-" + id);
    if (penSel) {
      penSel.style.display = e.target.value === "E" ? "inline-block" : "none";
    }
  }
});

document.addEventListener("input", (e) => {
  if (e.target.classList.contains("res-in")) {
    const id = e.target.id.replace("rL-", "").replace("rV-", "");
    const rL = document.getElementById("rL-" + id)?.value;
    const rV = document.getElementById("rV-" + id)?.value;
    const alSel = document.getElementById("rAl-" + id);
    const penSel = document.getElementById("rPen-" + id);
    
    if (alSel && penSel) {
      if (rL !== "" && rV !== "" && rL === rV) {
        alSel.style.display = "inline-block";
      } else {
        alSel.style.display = "none";
        penSel.style.display = "none";
        alSel.value = "";
        penSel.value = "";
      }
    }
  }
});

window.guardarResultado = async (id) => {
  const rL = document.getElementById("rL-" + id).value;
  const rV = document.getElementById("rV-" + id).value;
  
  if (rL === "" || rV === "") {
    mostrarMensaje("Completá ambos marcadores", "error");
    return;
  }

  let alargue = "";
  let penales = "";
  const alSel = document.getElementById("rAl-" + id);
  const penSel = document.getElementById("rPen-" + id);

  if (alSel && alSel.style.display !== "none") {
    alargue = alSel.value;
    if (!alargue) {
      mostrarMensaje("⚠️ Al ser un empate en eliminatoria, debés indicar el resultado del alargue", "error");
      return;
    }
    if (alargue === "E" && penSel) {
      penales = penSel.value;
      if (!penales) {
        mostrarMensaje("️ Debés indicar el ganador por penales", "error");
        return;
      }
    }
  }

  try {
    await setDoc(doc(db, "resultados", id), {
      partidoId: id,
      local: rL,
      visit: rV,
      alargue: alargue,
      penales: penales,
      fechaCarga: serverTimestamp()
    });
    mostrarMensaje(`✓ Resultado de ${id} cargado correctamente. Puntos recalculados.`, "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    mostrarMensaje("Error: " + err.message, "error");
  }
};

window.generarPrueba = async () => {
  if (!confirm("¿Generar resultados aleatorios para TODOS los partidos? (modo prueba)")) return;

  try {
    const batch = writeBatch(db);
    TODOS_PARTIDOS.forEach(p => {
      const golesL = Math.floor(Math.random() * 5);
      const golesV = Math.floor(Math.random() * 5);
      batch.set(doc(db, "resultados", p.id), {
        partidoId: p.id,
        local: golesL.toString(),
        visit: golesV.toString(),
        fechaCarga: serverTimestamp(),
        esPrueba: true
      });
    });
    await batch.commit();
    mostrarMensaje(`🧪 ${TODOS_PARTIDOS.length} resultados de prueba generados`, "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    mostrarMensaje("Error: " + err.message, "error");
  }
};

window.limpiarPrueba = async () => {
  if (!confirm("¿Eliminar SOLO los resultados marcados como prueba?")) return;

  try {
    const q = query(collection(db, "resultados"), where("esPrueba", "==", true));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
    mostrarMensaje("🧹 Resultados de prueba eliminados", "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    mostrarMensaje("Error: " + err.message, "error");
  }
};

window.reiniciar = async () => {
  if (!confirm("⚠️ ¿BORRAR TODAS las predicciones y resultados?")) return;
  if (!confirm("¿ESTÁS SEGURO? Se perderá todo. Esta acción NO se puede deshacer.")) return;

  try {
    const predsSnap = await getDocs(collection(db, "predicciones"));
    const resSnap = await getDocs(collection(db, "resultados"));
    const campeonesSnap = await getDocs(collection(db, "campeones"));
    const batch = writeBatch(db);
    predsSnap.forEach(d => batch.delete(d.ref));
    resSnap.forEach(d => batch.delete(d.ref));
    campeonesSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
    mostrarMensaje("🔄 Prode reiniciado completamente", "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    mostrarMensaje("Error: " + err.message, "error");
  }
};

// ═══════════════════════════════════════════════════════
// CAMPEÓN REAL
// ═══════════════════════════════════════════════════════

function inicializarCampeonReal() {
  const opciones = SELECCIONES
    .sort((a, b) => a.localeCompare(b))
    .map(s => `<option value="${s}">${FLAGS[s] || "🏳️"} ${s}</option>`)
    .join("");
  
  const sel = document.getElementById("realCampeon");
  if (sel) {
    sel.innerHTML = '<option value="">-- Seleccionar campeón --</option>' + opciones;
  }
  
  cargarCampeonRealActual();
}

async function cargarCampeonRealActual() {
  try {
    const snap = await getDoc(doc(db, "config", "final"));
    if (snap.exists() && snap.data().campeon) {
      const campeon = snap.data().campeon;
      document.getElementById("campeonRealActual").innerHTML = 
        `✓ Campeón cargado: <strong>${FLAGS[campeon] || "🏳️"} ${campeon}</strong>`;
      document.getElementById("realCampeon").value = campeon;
    }
  } catch (err) {
    console.error(err);
  }
}

window.guardarCampeonReal = async () => {
  const campeon = document.getElementById("realCampeon").value;
  
  if (!campeon) {
    mostrarMensaje("Seleccioná el campeón", "error");
    return;
  }
  
  if (!confirm(
    `¿Confirmás el campeón del Mundial?\n\n` +
    ` ${campeon}\n\n` +
    `Esto calculará los puntos extra de todos los usuarios.\n` +
    `Podés cambiarlo más tarde si es necesario.`
  )) return;
  
  try {
    await setDoc(doc(db, "config", "final"), {
      campeon: campeon,
      fechaCarga: serverTimestamp()
    });
    mostrarMensaje(` Campeón guardado: ${campeon}. Puntos recalculados.`, "ok");
    cargarCampeonRealActual();
  } catch (err) {
    mostrarMensaje("Error: " + err.message, "error");
  }
};

function mostrarMensaje(msg, tipo) {
  const div = document.getElementById("mensaje");
  div.textContent = msg;
  div.style.background = tipo === "ok" ? "var(--green-soft)" : "var(--red-soft)";
  div.style.border = tipo === "ok" ? "1px solid var(--green)" : "1px solid var(--red)";
  div.style.color = tipo === "ok" ? "var(--green)" : "var(--red)";
  div.style.display = "block";
  setTimeout(() => div.style.display = "none", 4000);
}