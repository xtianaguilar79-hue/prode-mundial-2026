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

    // LLENAR LOS SELECT CON LAS SELECCIONES
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
    
    // Validación en tiempo real
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
    alert("Error al guardar: " + err.message);
  }
}