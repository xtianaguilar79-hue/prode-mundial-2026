async function cargarDatos() {
  try {
    console.log("📥 Cargando predicciones...");
    const { data: predsData, error: predsError } = await supabase
      .from('predicciones')
      .select('*')
      .eq('user_id', usuarioId);

    if (predsError) {
      console.error("❌ Error cargando predicciones:", predsError);
      return;
    }

    predicciones = {};
    if (predsData) {
      predsData.forEach(p => { predicciones[p.partido_id] = p; });
      console.log(`✅ ${predsData.length} predicciones cargadas`);
    }

    console.log("📥 Cargando resultados...");
    const { data: resData, error: resError } = await supabase
      .from('resultados')
      .select('*')
      .eq('es_prueba', false);

    if (resError) {
      console.error("❌ Error cargando resultados:", resError);
      return;
    }

    resultados = {};
    if (resData) {
      resData.forEach(r => { resultados[r.partido_id] = r; });
      console.log(`✅ ${resData.length} resultados cargados`);
    }

    // Recargar equipos reales si hay resultados nuevos
    if (clasificacionesModule && resData && resData.length > 0) {
      try {
        partidosConEquiposReales = await clasificacionesModule.obtenerPartidosConEquiposReales();
        console.log("✅ Equipos reales actualizados");
      } catch (clasErr) {
        console.warn("⚠️ No se pudo actualizar equipos:", clasErr.message);
      }
    }

    actualizarStats();
  } catch (err) {
    console.error("❌ Error en cargarDatos:", err);
  }
}