import { db } from "./firebase-config.js";
import { 
  collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, PUNTOS, 
  calcularPuntos, SELECCIONES, obtenerPuntosCampeonDisponibles,
  calcularPuntosCampeon, msHastaBloqueo, formatearTiempo, partidoBloqueado
} from "../datos-partidos.js";

let usuario = null;
let perfil = null;
let predicciones = {};
let resultados = {};
let prediccionCampeon = null;
let resultadoFinal = null;
let faseActiva = "j1";
let intervalosCrono = [];

window.addEventListener("usuarioListo", async (e) => {
  usuario = e.detail.user;
  perfil = e.detail.perfil;

  document.getElementById("userName").textContent = perfil.nombre;
  if (perfil.esAdmin) {
    document.getElementById("adminTag").style.display = "inline";
    document.getElementById("linkAdmin").style.display = "inline-block";
  }

  await cargarDatos();
  await cargarCampeon();
  renderTabs();
  renderPartidos();
  renderCampeon();
});

async function cargarDatos() {
  const q = query(collection(db, "predicciones"), where("uid", "==", usuario.uid));
  const snap = await getDocs(q);
  predicciones = {};
  snap.forEach(d => {
    const data = d.data();
    predicciones[data.partidoId] = data;
  });

  const resSnap = await getDocs(collection(db, "resultados"));
  resultados = {};
  resSnap.forEach(d => { resultados[d.id] = d.data(); });

  actualizarStats();
}

async function cargarCampeon() {
  const ref = doc(db, "campeones", usuario.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    prediccionCampeon = snap.data();
  }

  const refFinal = doc(db, "config", "final");
  const snapFinal = await getDoc(refFinal);
  if (snapFinal.exists()) {
    resultadoFinal = snapFinal.data();
  }
}

function actualizarStats() {
  let totalPartidos = Object.values(predicciones).reduce((acc, pred) => {
    const res = resultados[pred.partidoId];
    return acc + (res ? calcularPuntos(pred, res) : 0);
  }, 0);

  let ptsCampeon = 0;
  if (prediccionCampeon && resultadoFinal?.campeon) {
    ptsCampeon = calcularPuntosCampeon(prediccionCampeon, resultadoFinal.campeon);
  }

  const bonus = Object.keys(predicciones).length >= 104 ? 100 : 0;
  const total = totalPartidos + ptsCampeon + bonus;

  document.getElementById("statPts").textContent = total;
  document.getElementById("statPred").textContent = `${Object.keys(predicciones).length}/104`;
  document.getElementById("statFidelidad").textContent = bonus > 0 ? "✓" : "✗";
  document.getElementById("statFidelidad").style.color = bonus > 0 ? "var(--green)" : "var(--accent)";
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
  intervalosCrono.forEach(i => clearInterval(i));
  intervalosCrono = [];

  document.getElementById("partidosLoader").style.display = "none";
  const grid = document.getElementById("partidosGrid");
  grid.style.display = "grid";

  const partidos = getPartidosFase();
  grid.innerHTML = partidos.map(p => renderTarjeta(p)).join("");

  grid.querySelectorAll(".btn-guardar").forEach(btn => {
    btn.onclick = () => guardarPrediccion(btn.dataset.id);
  });

  partidos.forEach(p => {
    if (!predicciones[p.id]) {
      iniciarCronometro(p);
    }
  });
}

function iniciarCronometro(partido) {
  const el = document.getElementById("crono-" + partido.id);
  if (!el) return;

  function actualizar() {
    const ms = msHastaBloqueo(partido);
    if (ms <= 0) {
      el.textContent = "🔒 BLOQUEADO";
      el.style.color = "var(--red)";
      el.style.fontWeight = "700";
      const gL = document.getElementById("gL-" + partido.id);
      const gV = document.getElementById("gV-" + partido.id);
      const btn = document.querySelector(`.btn-guardar[data-id="${partido.id}"]`);
      if (gL) gL.disabled = true;
      if (gV) gV.disabled = true;
      if (btn) {
        btn.disabled = true;
        btn.textContent = "🔒 Bloqueado";
      }
      return;
    }

    el.textContent = "⏱️ " + formatearTiempo(ms);
    
    if (ms < 5 * 60 * 1000) {
      el.style.color = "var(--red)";
      el.style.fontWeight = "700";
    } else if (ms < 60 * 60 * 1000) {
      el.style.color = "var(--accent)";
    } else if (ms < 24 * 60 * 60 * 1000) {
      el.style.color = "var(--gold)";
    } else {
      el.style.color = "var(--text2)";
    }
  }

  actualizar();
  const int = setInterval(actualizar, 1000);
  intervalosCrono.push(int);
}

function renderTarjeta(p) {
  const pred = predicciones[p.id];
  const res = resultados[p.id];
  const guardado = !!pred;
  const esElim = !p.j;
  const flagL = FLAGS[p.local] || "🏳️";
  const flagV = FLAGS[p.visit] || "🏳️";
  const pts = guardado && res ? calcularPuntos(pred, res) : null;
  const bloqueado = partidoBloqueado(p);

  let marcadorHTML;
  if (guardado) {
    marcadorHTML = `
      <div class="score-saved">
        <span>${pred.local}</span>
        <span class="sep">–</span>
        <span>${pred.visit}</span>
      </div>
      ${pred.alargue ? `<div style="font-size:10px; color:var(--text2); margin-top:4px; text-align:center;">
        Alargue: <strong>${pred.alargue === "L" ? "Gana Local" : pred.alargue === "V" ? "Gana Visitante" : "Penales"}</strong>
        ${pred.penales ? ` · Penales: <strong>${pred.penales}</strong>` : ""}
      </div>` : ""}
    `;
  } else {
    marcadorHTML = `
      <div class="marcador">
        <input type="number" min="0" max="20" class="score-in" id="gL-${p.id}" placeholder="0" ${bloqueado ? "disabled" : ""}>
        <span class="sep">–</span>
        <input type="number" min="0" max="20" class="score-in" id="gV-${p.id}" placeholder="0" ${bloqueado ? "disabled" : ""}>
      </div>
      ${esElim ? `<div class="ext-selects" id="ext-${p.id}" style="display:none;">
        <label>Alargue:</label>
        <select class="sel" id="al-${p.id}" ${bloqueado ? "disabled" : ""}>
          <option value="">-- elegir --</option>
          <option value="L">Gana Local</option>
          <option value="E">Empate → Penales</option>
          <option value="V">Gana Visitante</option>
        </select>
        <div id="pen-${p.id}" style="display:none;">
          <label>Ganador Penales:</label>
          <select class="sel" id="penSel-${p.id}" ${bloqueado ? "disabled" : ""}>
            <option value="">-- elegir --</option>
            <option value="L">${flagL} ${p.local}</option>
            <option value="V">${flagV} ${p.visit}</option>
          </select>
        </div>
      </div>` : ""}
    `;
  }

  const cronoHTML = !guardado ? `
    <div class="crono-box">
      <span style="color:var(--text2); font-size:11px;">Se bloquea en: </span>
      <span id="crono-${p.id}" style="font-family:'Anton'; font-size:14px; color:var(--gold);">--:--:--</span>
    </div>
  ` : "";

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

      ${cronoHTML}

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
  const id = e.target.id.replace("gL-", "").replace("gV-", "");
  const gL = document.getElementById("gL-" + id)?.value;
  const gV = document.getElementById("gV-" + id)?.value;
  const extDiv = document.getElementById("ext-" + id);
  if (!extDiv) return;

  if (gL !== "" && gV !== "" && parseInt(gL) === parseInt(gV)) {
    extDiv.style.display = "flex";
  } else {
    extDiv.style.display = "none";
  }

  const al = document.getElementById("al-" + id)?.value;
  const penDiv = document.getElementById("pen-" + id);
  if (penDiv) penDiv.style.display = al === "E" ? "block" : "none";
});

async function guardarPrediccion(id) {
  const p = TODOS_PARTIDOS.find(x => x.id === id);
  if (!p) return;

  if (partidoBloqueado(p)) {
    alert("🔒 Este partido ya está bloqueado. No se puede pronosticar.");
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

  let alargue = "";
  let penales = "";
  if (!p.j && parseInt(gL) === parseInt(gV)) {
    alargue = document.getElementById("al-" + id)?.value || "";
    if (!alargue) {
      alert("Elegí qué pasa en el alargue (empate al 90')");
      return;
    }
    if (alargue === "E") {
      penales = document.getElementById("penSel-" + id)?.value || "";
      if (!penales) {
        alert("Elegí el ganador por penales");
        return;
      }
    }
  }

  const datos = {
    uid: usuario.uid,
    partidoId: id,
    local: gL,
    visit: gV,
    alargue: alargue,
    penales: penales,
    fase: p.j ? "grupos" : p.fase,
    fechaGuardado: serverTimestamp(),
    bloqueado: true
  };

  try {
    await setDoc(doc(db, "predicciones", `${usuario.uid}_${id}`), datos);
    predicciones[id] = datos;
    alert("✅ Pronóstico guardado. ¡No se puede modificar!");
    await cargarDatos();
    renderPartidos();
  } catch (err) {
    console.error(err);
    if (err.code === "permission-denied" || err.message.includes("permission")) {
      alert("🔒 Este pronóstico ya fue guardado y no se puede modificar");
    } else {
      alert("Error al guardar: " + err.message);
    }
  }
}

function renderCampeon() {
  document.getElementById("campeonLoader").style.display = "none";

  const info = obtenerPuntosCampeonDisponibles();
  
  document.getElementById("ptsOp1").textContent = info.puntos[0];
  document.getElementById("ptsOp2").textContent = info.puntos[1];
  document.getElementById("ptsOp3").textContent = info.puntos[2];

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
  document.getElementById("campeonFaseActual").textContent = 
    "📍 Estado actual: " + nombresFase[info.fase];

  if (prediccionCampeon && prediccionCampeon.bloqueado) {
    document.getElementById("campeonForm").style.display = "none";
    document.getElementById("campeonCerrado").style.display = "none";
    document.getElementById("campeonGuardado").style.display = "block";

    document.getElementById("verCamp1").textContent = 
      `${FLAGS[prediccionCampeon.opcion1] || "🏳️"} ${prediccionCampeon.opcion1}`;
    document.getElementById("verCamp2").textContent = 
      `${FLAGS[prediccionCampeon.opcion2] || "🏳️"} ${prediccionCampeon.opcion2}`;
    document.getElementById("verCamp3").textContent = 
      `${FLAGS[prediccionCampeon.opcion3] || "🏳️"} ${prediccionCampeon.opcion3}`;

    const pts = prediccionCampeon.puntosOtorgados;
    document.getElementById("verCamp1Pts").textContent = `+${pts[0]} pts si es campeón`;
    document.getElementById("verCamp2Pts").textContent = `+${pts[1]} pts si es campeón`;
    document.getElementById("verCamp3Pts").textContent = `+${pts[2]} pts si es campeón`;

    if (resultadoFinal?.campeon) {
      const ptsObtenidos = calcularPuntosCampeon(prediccionCampeon, resultadoFinal.campeon);
      if (ptsObtenidos > 0) {
        document.getElementById("campeonPtsObtenidos").textContent = 
          `🎯 ¡Acertaste! Sumaste +${ptsObtenidos} puntos`;
        document.getElementById("campeonPtsObtenidos").style.color = "var(--green)";
        document.getElementById("campeonPtsObtenidos").style.background = "var(--green-soft)";
      } else {
        document.getElementById("campeonPtsObtenidos").textContent = 
          `Campeón real: ${FLAGS[resultadoFinal.campeon] || "🏳️"} ${resultadoFinal.campeon} · Sin aciertos`;
        document.getElementById("campeonPtsObtenidos").style.color = "var(--text2)";
        document.getElementById("campeonPtsObtenidos").style.background = "var(--bg)";
      }
    } else {
      document.getElementById("campeonPtsObtenidos").textContent = 
        "⏳ Pendiente de definición del campeón";
      document.getElementById("campeonPtsObtenidos").style.color = "var(--text2)";
      document.getElementById("campeonPtsObtenidos").style.background = "var(--bg)";
    }
  } else if (info.cerrado) {
    document.getElementById("campeonForm").style.display = "none";
    document.getElementById("campeonCerrado").style.display = "block";
    document.getElementById("campeonGuardado").style.display = "none";
  } else {
    document.getElementById("campeonForm").style.display = "block";
    document.getElementById("campeonCerrado").style.display = "none";
    document.getElementById("campeonGuardado").style.display = "none";

    const opciones = SELECCIONES
      .sort((a, b) => a.localeCompare(b))
      .map(s => `<option value="${s}">${FLAGS[s] || "🏳️"} ${s}</option>`)
      .join("");

    document.getElementById("camp1").innerHTML = 
      '<option value="">-- Seleccionar --</option>' + opciones;
    document.getElementById("camp2").innerHTML = 
      '<option value="">-- Seleccionar --</option>' + opciones;
    document.getElementById("camp3").innerHTML = 
      '<option value="">-- Seleccionar --</option>' + opciones;

    document.getElementById("btnGuardarCampeon").onclick = guardarCampeon;
    ["camp1", "camp2", "camp3"].forEach(id => {
      document.getElementById(id).onchange = validarCampeon;
    });
  }
}

function validarCampeon() {
  const v1 = document.getElementById("camp1").value;
  const v2 = document.getElementById("camp2").value;
  const v3 = document.getElementById("camp3").value;

  const msg = document.getElementById("campeonMsg");

  if (v1 && v2 && v1 === v2) {
    mostrarMsgCampeon("⚠️ No podés repetir selecciones", "error");
    return false;
  }
  if (v1 && v3 && v1 === v3) {
    mostrarMsgCampeon("⚠️ No podés repetir selecciones", "error");
    return false;
  }
  if (v2 && v3 && v2 === v3) {
    mostrarMsgCampeon("⚠️ No podés repetir selecciones", "error");
    return false;
  }

  msg.style.display = "none";
  return true;
}

function mostrarMsgCampeon(txt, tipo) {
  const msg = document.getElementById("campeonMsg");
  msg.textContent = txt;
  msg.style.background = tipo === "error" ? "var(--red-soft)" : "var(--green-soft)";
  msg.style.border = tipo === "error" ? "1px solid var(--red)" : "1px solid var(--green)";
  msg.style.color = tipo === "error" ? "var(--red)" : "var(--green)";
  msg.style.display = "block";
}

async function guardarCampeon() {
  const v1 = document.getElementById("camp1").value;
  const v2 = document.getElementById("camp2").value;
  const v3 = document.getElementById("camp3").value;

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

  if (!confirm(
    `¿Confirmás tu pronóstico del campeón?\n\n` +
    `🥇 Opción 1: ${v1} (+${pts[0]} pts si es campeón)\n` +
    `🥈 Opción 2: ${v2} (+${pts[1]} pts si es campeón)\n` +
    `🥉 Opción 3: ${v3} (+${pts[2]} pts si es campeón)\n\n` +
    `⚠️ NO PODRÁS MODIFICARLO`
  )) return;

  try {
    await setDoc(doc(db, "campeones", usuario.uid), {
      uid: usuario.uid,
      opcion1: v1,
      opcion2: v2,
      opcion3: v3,
      faseAlPronunciar: info.fase,
      puntosOtorgados: pts,
      bloqueado: true,
      fechaGuardado: serverTimestamp()
    });

    prediccionCampeon = { 
      opcion1: v1, opcion2: v2, opcion3: v3, 
      bloqueado: true, puntosOtorgados: pts, faseAlPronunciar: info.fase
    };
    alert("✅ Pronóstico del campeón guardado");
    renderCampeon();
    actualizarStats();
  } catch (err) {
    alert("Error: " + err.message);
  }
}