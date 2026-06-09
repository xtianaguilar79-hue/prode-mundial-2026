import { supabase } from "./supabase-config.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, SELECCIONES,
  getKickoffTimestamp
} from "../datos-partidos.js";

console.log("📋 app-admin.js cargado");

let faseActiva = "todos";
let resultados = {};

// ═══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════

async function init() {
  console.log("🚀 Iniciando admin...");
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log("⚠️ No hay sesión");
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

    if (!usuario.es_admin) {
      alert("No tenés permisos de administrador");
      window.location.href = "prode.html";
      return;
    }

    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.textContent = usuario.nombre;

    const adminTag = document.getElementById("adminTag");
    if (adminTag) adminTag.style.display = "inline";
    const linkAdmin = document.getElementById("linkAdmin");
    if (linkAdmin) linkAdmin.style.display = "inline-block";

    await cargarResultados();
    renderTabs();
    renderPartidos();
    cargarCampeonReal();
    cargarSelectCampeones();
    
    // Cargar tabla de clasificados manuales
    setTimeout(() => {
      renderTablaClasificados();
      cargarClasificadosExistentes();
    }, 1000);
    
    console.log("✅ Admin iniciado correctamente");
  } catch (err) {
    console.error("❌ Error en init:", err);
  }
}

async function cargarResultados() {
  try {
    const { data, error } = await supabase.from('resultados').select('*');
    if (error) throw error;
    
    resultados = {};
    if (data) data.forEach(r => { resultados[r.partido_id] = r; });
    console.log("✅ Resultados cargados:", Object.keys(resultados).length);
  } catch (err) {
    console.error("❌ Error cargando resultados:", err);
  }
}

// ═══════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════

function renderTabs() {
  const tabsContainer = document.getElementById("faseTabs");
  if (!tabsContainer) return;

  const tabs = [
    { id: "todos", label: "📋 Todos" },
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
  if (faseActiva === "todos") return TODOS_PARTIDOS;
  if (faseActiva.startsWith("j")) {
    const j = parseInt(faseActiva[1]);
    return PARTIDOS_GRUPOS.filter(p => p.j === j);
  }
  return PARTIDOS_ELIM.filter(p => p.fase === faseActiva);
}

// ═══════════════════════════════════════════════════════
// RENDER PARTIDOS
// ═══════════════════════════════════════════════════════

function renderPartidoCard(p) {
  const res = resultados[p.id];
  const flagL = FLAGS[p.local] || "🏳️";
  const flagV = FLAGS[p.visit] || "🏳️";
  const esElim = !p.j || p.fase;
  
  const estado = res?.estado || 'proximo';
  
  let showAlargue = false;
  let showPenales = false;
  
  if (res && res.local !== undefined && res.visit !== undefined) {
    if (parseInt(res.local) === parseInt(res.visit)) {
      showAlargue = true;
      if (res.alargue_local !== null && res.alargue_visit !== null && 
          parseInt(res.alargue_local) === parseInt(res.alargue_visit)) {
        showPenales = true;
      }
    }
  }
  
  let estadoBadge = "";
  let estiloCard = "";
  let botonesEstado = "";
  
  if (estado === "vivo") {
    estadoBadge = `<span style="background:var(--gold); color:#000; padding:3px 10px; border-radius:10px; font-size:10px; font-weight:700;">🔴 EN JUEGO</span>`;
    estiloCard = "border: 2px solid var(--gold); box-shadow: 0 0 20px rgba(255, 201, 60, 0.3);";
    botonesEstado = `<button class="btn-estado btn-finalizar" data-id="${p.id}" style="padding:6px 12px; background:var(--green); color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:12px;">✅ Marcar FINALIZADO</button>`;
  } else if (estado === "finalizado") {
    estadoBadge = `<span style="background:var(--green-soft); color:var(--green); padding:3px 10px; border-radius:10px; font-size:10px; font-weight:700;">✅ FINALIZADO</span>`;
    botonesEstado = `<button class="btn-estado btn-vivo" data-id="${p.id}" style="padding:6px 12px; background:var(--gold); color:#000; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:12px;">🔄 Marcar EN JUEGO</button>`;
  } else {
    estadoBadge = `<span style="background:var(--bg2); color:var(--text2); padding:3px 10px; border-radius:10px; font-size:10px;">⏳ PRÓXIMO</span>`;
    botonesEstado = `<button class="btn-estado btn-vivo" data-id="${p.id}" style="padding:6px 12px; background:var(--gold); color:#000; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:12px;">▶️ Marcar EN JUEGO</button>`;
  }
  
  return `
    <div class="partido-card admin" style="${estiloCard}">
      <div class="partido-meta">
        <span class="badge badge-id">${p.id}</span>
        ${p.grupo ? `<span class="badge badge-grupo">Grupo ${p.grupo}</span>` : ""}
        ${p.fase ? `<span class="badge badge-grupo">${p.fase.toUpperCase()}</span>` : ""}
        ${estadoBadge}
        <span class="badge badge-fecha">${p.fecha} · ${p.hora} ARG · 📍 ${p.sede}</span>
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

      <div class="partido-footer" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button class="btn-guardar btn-res" data-id="${p.id}" style="padding:8px 16px;">
          ${res ? "✓ Actualizar resultado" : "💾 Cargar resultado"}
        </button>
        ${res ? `<button class="btn-guardar btn-limpiar" data-borrar="${p.id}" style="padding:8px 16px;">️ Borrar</button>` : ""}
        <div style="margin-left:auto; display:flex; gap:6px;">
          ${botonesEstado}
        </div>
      </div>
    </div>
  `;
}

function renderPartidos() {
  const cont = document.getElementById("partidosAdmin");
  if (!cont) {
    console.error("❌ No se encontró #partidosAdmin");
    return;
  }
  
  const partidos = getPartidosFase();
  console.log(`📋 Renderizando ${partidos.length} partidos, fase: ${faseActiva}`);
  
  if (partidos.length === 0) {
    cont.innerHTML = '<p style="text-align:center; color:var(--text2); padding:40px;">No hay partidos</p>';
    return;
  }
  
  if (faseActiva === "todos") {
    const porFecha = {};
    partidos.forEach(p => {
      const key = `${p.fecha} - ${p.hora}`;
      if (!porFecha[key]) porFecha[key] = [];
      porFecha[key].push(p);
    });
    
    const fechasOrdenadas = Object.keys(porFecha).sort((a, b) => {
      const [fechaA, horaA] = a.split(" - ");
      const [fechaB, horaB] = b.split(" - ");
      const [diaA, mesA] = fechaA.split("/");
      const [diaB, mesB] = fechaB.split("/");
      if (mesA !== mesB) return parseInt(mesA) - parseInt(mesB);
      if (diaA !== diaB) return parseInt(diaA) - parseInt(diaB);
      return horaA.localeCompare(horaB);
    });
    
    let html = "";
    fechasOrdenadas.forEach(fecha => {
      const partidosDeFecha = porFecha[fecha];
      html += `<h3 style="color:var(--gold); margin:24px 0 16px; font-family:'Anton'; font-size:18px;">📅 ${fecha} (${partidosDeFecha.length} partidos)</h3>`;
      html += `<div style="display:grid; gap:12px;">`;
      partidosDeFecha.forEach(p => { html += renderPartidoCard(p); });
      html += `</div>`;
    });
    
    cont.innerHTML = html;
  } else {
    cont.innerHTML = `<div style="display:grid; gap:12px;">` + 
      partidos.map(p => renderPartidoCard(p)).join("") + 
      `</div>`;
  }

  cont.querySelectorAll(".btn-res").forEach(btn => {
    btn.onclick = () => guardarResultado(btn.dataset.id);
  });
  
  cont.querySelectorAll("[data-borrar]").forEach(btn => {
    btn.onclick = () => borrarResultado(btn.dataset.borrar);
  });

  cont.querySelectorAll(".btn-vivo").forEach(btn => {
    btn.onclick = () => cambiarEstado(btn.dataset.id, "vivo");
  });
  
  cont.querySelectorAll(".btn-finalizar").forEach(btn => {
    btn.onclick = () => cambiarEstado(btn.dataset.id, "finalizado");
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

// ═══════════════════════════════════════════════════════
// ACCIONES DE BASE DE DATOS
// ═══════════════════════════════════════════════════════

async function cambiarEstado(id, nuevoEstado) {
  const p = TODOS_PARTIDOS.find(x => x.id === id);
  if (!p) return;

  try {
    if (!resultados[id]) {
      const { error } = await supabase.from('resultados').insert({
        id: id,
        partido_id: id,
        local: null,
        visit: null,
        estado: nuevoEstado,
        es_prueba: false
      });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('resultados')
        .update({ estado: nuevoEstado })
        .eq('id', id);
      if (error) throw error;
    }

    const mensaje = nuevoEstado === "vivo" ? "🔴 Partido marcado como EN JUEGO" : "✅ Partido marcado como FINALIZADO";
    mostrarMensaje(mensaje, "ok");
    
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
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
  let alargueLocal = null, alargueVisit = null, penalesLocal = null, penalesVisit = null;

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
        mostrarMensaje("️ En penales NO hay empate", "error");
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
    estado: "finalizado",
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
    mostrarMensaje("️ Resultado borrado", "ok");
    await cargarResultados();
    renderPartidos();
  } catch (err) {
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
}

// ═══════════════════════════════════════════════════════
// BOTONES DE ACCIÓN
// ═══════════════════════════════════════════════════════

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
      estado: "finalizado",
      es_prueba: true
    }));

    await supabase.from('resultados').upsert(pruebas, { onConflict: 'id' });
    mostrarMensaje(" Resultados de prueba generados", "ok");
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
    mostrarMensaje(" Error: " + err.message, "error");
  }
};

window.borrarMisPronosticos = async () => {
  if (!confirm("¿Borrar TODOS tus pronósticos?")) return;
  if (!confirm("¿ESTÁS SEGURO?")) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from('predicciones')
      .delete()
      .eq('user_id', session.user.id);

    if (error) throw error;

    mostrarMensaje("🗑️ Pronósticos borrados", "ok");
    setTimeout(() => location.reload(), 1500);
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
  alert("Usá la sección 'Cargar Clasificados Manualmente' al final de la página para definir los equipos de 16avos en adelante.");
};

async function cargarCampeonReal() {
  try {
    const { data } = await supabase.from('config').select('*').eq('id', 'final').single();
    if (data) {
      document.getElementById("realCampeon").value = data.campeon;
      document.getElementById("campeonRealActual").textContent = ` ${FLAGS[data.campeon] || "🏳️"} ${data.campeon}`;
    }
  } catch (err) {
    console.error(err);
  }
}

function cargarSelectCampeones() {
  const select = document.getElementById("realCampeon");
  if (!select) return;
  
  // Limpiar opciones excepto la primera
  while (select.options.length > 1) {
    select.remove(1);
  }
  
  SELECCIONES.sort((a, b) => a.localeCompare(b)).forEach(sel => {
    const opt = document.createElement("option");
    opt.value = sel;
    opt.textContent = `${FLAGS[sel] || "🏳️"} ${sel}`;
    select.appendChild(opt);
  });
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

// ═══════════════════════════════════════════════════════
// CARGA MANUAL DE CLASIFICADOS
// ═══════════════════════════════════════════════════════

const GRUPOS_MANUAL = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function renderTablaClasificados() {
  const cont = document.getElementById("tablaClasificados");
  if (!cont) return;

  let html = '<div style="display:grid; grid-template-columns: 60px 1fr 1fr 1fr; gap:8px; font-size:12px; font-weight:700; color:var(--gold); margin-bottom:8px;">';
  html += '<div>Grupo</div><div>1° Lugar</div><div>2° Lugar</div><div>3° Lugar</div>';
  html += '</div>';

  GRUPOS_MANUAL.forEach(grupo => {
    html += `<div style="display:grid; grid-template-columns: 60px 1fr 1fr 1fr; gap:8px; align-items:center;">`;
    html += `<div style="font-weight:700; color:var(--gold);">Grupo ${grupo}</div>`;
    html += `<input type="text" id="g1-${grupo}" placeholder="1° del grupo" style="padding:8px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:13px;">`;
    html += `<input type="text" id="g2-${grupo}" placeholder="2° del grupo" style="padding:8px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:13px;">`;
    html += `<input type="text" id="g3-${grupo}" placeholder="3° del grupo" style="padding:8px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:13px;">`;
    html += `</div>`;
  });

  cont.innerHTML = html;
}

async function cargarClasificadosExistentes() {
  try {
    const { data, error } = await supabase.from('clasificados').select('*');
    if (error) {
      mostrarMsgClasificados("❌ Error: " + error.message, "error");
      return;
    }

    const clasificados = {};
    if (data) {
      data.forEach(c => { clasificados[c.posicion] = c.equipo; });
    }

    GRUPOS_MANUAL.forEach(grupo => {
      const g1 = document.getElementById(`g1-${grupo}`);
      const g2 = document.getElementById(`g2-${grupo}`);
      const g3 = document.getElementById(`g3-${grupo}`);
      
      if (g1) g1.value = clasificados[`1°${grupo}`] || '';
      if (g2) g2.value = clasificados[`2°${grupo}`] || '';
      if (g3) g3.value = clasificados[`3°${grupo}`] || '';
    });

    mostrarMsgClasificados("✅ Datos cargados desde la base de datos", "ok");
  } catch (err) {
    mostrarMsgClasificados("❌ Error: " + err.message, "error");
  }
}

async function guardarClasificados() {
  const registros = [];

  GRUPOS_MANUAL.forEach(grupo => {
    const g1 = document.getElementById(`g1-${grupo}`)?.value.trim();
    const g2 = document.getElementById(`g2-${grupo}`)?.value.trim();
    const g3 = document.getElementById(`g3-${grupo}`)?.value.trim();

    if (g1) registros.push({ posicion: `1°${grupo}`, equipo: g1, grupo });
    if (g2) registros.push({ posicion: `2°${grupo}`, equipo: g2, grupo });
    if (g3) registros.push({ posicion: `3°${grupo}`, equipo: g3, grupo });
  });

  if (registros.length === 0) {
    mostrarMsgClasificados("⚠️ Completá al menos un clasificado", "error");
    return;
  }

  if (!confirm(`¿Guardar ${registros.length} clasificados y actualizar los cruces de 16avos?`)) {
    return;
  }

  try {
    // Borrar clasificados existentes
    await supabase.from('clasificados').delete().neq('posicion', '');

    // Insertar nuevos
    const { error } = await supabase.from('clasificados').insert(registros);
    if (error) throw error;

    mostrarMsgClasificados(`✅ ${registros.length} clasificados guardados. Los cruces se actualizarán automáticamente en prode.html`, "ok");
  } catch (err) {
    mostrarMsgClasificados("❌ Error: " + err.message, "error");
  }
}

function mostrarMsgClasificados(msg, tipo) {
  const el = document.getElementById("msgClasificados");
  if (!el) return;
  el.textContent = msg;
  el.style.color = tipo === "ok" ? "var(--green)" : "var(--red)";
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 5000);
}

// ═══════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════

init();