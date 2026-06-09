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
    estado: "finalizado",
    es_prueba: false
  };

  try {
    const { error } = await supabase.from('resultados').upsert(datos, { onConflict: 'id' });
    if (error) throw error;

    mostrarMensaje("✅ Resultado guardado", "ok");
    await cargarResultados();
    renderPartidos();
    
    // Mostrar mensaje si se completó un grupo
    const partidosJugados = PARTIDOS_GRUPOS.filter(pid => resultados[pid.id]).length;
    if (partidosJugados % 6 === 0 && partidosJugados > 0) {
      const gruposCompletados = Math.floor(partidosJugados / 6);
      mostrarMensaje(`✅ Resultado guardado. Grupos completados: ${gruposCompletados}/12`, "ok");
    }
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error: " + err.message, "error");
  }
}