for (const pred of predsData) {
  const { data: resultadoData } = await supabase
    .from('resultados')
    .select('*')
    .eq('partido_id', pred.partido_id)
    .eq('es_prueba', false)
    .single();

  if (!resultadoData || resultadoData.local === null) {
    continue; // Saltar si no hay resultado
  }

  // Calcular puntos y agregar al ranking
  const pts = calcularPuntos(pred, resultadoData);
  // ...
}