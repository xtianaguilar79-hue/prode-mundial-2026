import { FLAGS } from "../datos-partidos.js";

export function renderBracketCircular(resultados, clasificacion) {
  const container = document.getElementById('bracketCircular');
  if (!container) {
    console.error("❌ No se encontró #bracketCircular");
    return;
  }

  console.log("🎨 Renderizando bracket circular...");

  const width = 1000;
  const height = 1000;
  const centerX = width / 2;
  const centerY = height / 2;

  // ═══════════════════════════════════════════════════════
  // ESTRUCTURA DE PARTIDOS CON CRUCES CORRECTOS
  // ═══════════════════════════════════════════════════════
  const partidos16avos = [
    { id: 'M073', local: 'Sudáfrica', visit: 'Canadá' },
    { id: 'M076', local: 'Brasil', visit: 'Japón' },
    { id: 'M074', local: 'Alemania', visit: 'Paraguay' },
    { id: 'M075', local: 'Países Bajos', visit: 'Marruecos' },
    { id: 'M078', local: 'Costa de Marfil', visit: 'Noruega' },
    { id: 'M077', local: 'Francia', visit: 'Suecia' },
    { id: 'M079', local: 'México', visit: 'Ecuador' },
    { id: 'M080', local: 'Inglaterra', visit: 'RD Congo' },
    { id: 'M082', local: 'Bélgica', visit: 'Senegal' },
    { id: 'M081', local: 'Estados Unidos', visit: 'Bosnia-Herzegovina' },
    { id: 'M084', local: 'España', visit: 'Austria' },
    { id: 'M083', local: 'Portugal', visit: 'Croacia' },
    { id: 'M085', local: 'Suiza', visit: 'Argelia' },
    { id: 'M088', local: 'Australia', visit: 'Egipto' },
    { id: 'M086', local: 'Argentina', visit: 'Cabo Verde' },
    { id: 'M087', local: 'Colombia', visit: 'Ghana' }
  ];

  // Cruces de octavos: cada octavo recibe ganadores de dos 16avos
  const partidosOctavos = [
    { id: 'M089', from1: 'M073', from2: 'M076' },  // Ganador Sudáfrica/Canadá vs Ganador Brasil/Japón
    { id: 'M090', from1: 'M074', from2: 'M075' },  // Ganador Alemania/Paraguay vs Ganador Países Bajos/Marruecos
    { id: 'M091', from1: 'M078', from2: 'M077' },  // Ganador Costa de Marfil/Noruega vs Ganador Francia/Suecia
    { id: 'M092', from1: 'M079', from2: 'M080' },  // Ganador México/Ecuador vs Ganador Inglaterra/RD Congo
    { id: 'M093', from1: 'M082', from2: 'M081' },  // Ganador Bélgica/Senegal vs Ganador Estados Unidos/Bosnia
    { id: 'M094', from1: 'M084', from2: 'M083' },  // Ganador España/Austria vs Ganador Portugal/Croacia
    { id: 'M095', from1: 'M085', from2: 'M088' },  // Ganador Suiza/Argelia vs Ganador Australia/Egipto
    { id: 'M096', from1: 'M086', from2: 'M087' }   // Ganador Argentina/Cabo Verde vs Ganador Colombia/Ghana
  ];

  const partidosCuartos = [
    { id: 'M097', from1: 'M089', from2: 'M090' },
    { id: 'M098', from1: 'M091', from2: 'M092' },
    { id: 'M099', from1: 'M093', from2: 'M094' },
    { id: 'M100', from1: 'M095', from2: 'M096' }
  ];

  const partidosSemis = [
    { id: 'M101', from1: 'M097', from2: 'M098' },
    { id: 'M102', from1: 'M099', from2: 'M100' }
  ];

  // ══════════════════════════════════════════════════════
  // FUNCIONES AUXILIARES
  // ═══════════════════════════════════════════════════════
  function resolverGanador(partidoId) {
    const res = resultados.find(r => r.partido_id === partidoId);
    if (!res || res.local === null || res.visit === null) return null;
    const gL = parseInt(res.local);
    const gV = parseInt(res.visit);
    if (gL > gV) return 'local';
    if (gV > gL) return 'visit';
    if (res.alargue_local !== null && res.alargue_visit !== null) {
      const alL = parseInt(res.alargue_local);
      const alV = parseInt(res.alargue_visit);
      if (alL > alV) return 'local';
      if (alV > alL) return 'visit';
      if (res.penales_local !== null && res.penales_visit !== null) {
        return parseInt(res.penales_local) > parseInt(res.penales_visit) ? 'local' : 'visit';
      }
    }
    return null;
  }

  function getGanadorDePartido(partidoId) {
    const ganador = resolverGanador(partidoId);
    if (!ganador) return null;
    const partido16 = partidos16avos.find(p => p.id === partidoId);
    if (partido16) return ganador === 'local' ? partido16.local : partido16.visit;
    return null;
  }

  function getPosicion(index, total, radius) {
    const angle = (index * (360 / total) - 90) * (Math.PI / 180);
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  }

  // ═══════════════════════════════════════════════════════
  // GENERAR SVG
  // ═══════════════════════════════════════════════════════
  let svg = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; min-height:1000px; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:rgba(255,201,60,0.5)" />
          <stop offset="100%" style="stop-color:transparent" />
        </radialGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
        </filter>
      </defs>
  `;

  // ═══════════════════════════════════════════════════════
  // CÍRCULOS GUÍA
  // ═══════════════════════════════════════════════════════
  svg += `<circle cx="${centerX}" cy="${centerY}" r="420" fill="none" stroke="rgba(255,201,60,0.2)" stroke-width="2" stroke-dasharray="5,5" />`;
  svg += `<circle cx="${centerX}" cy="${centerY}" r="320" fill="none" stroke="rgba(255,201,60,0.2)" stroke-width="2" stroke-dasharray="5,5" />`;
  svg += `<circle cx="${centerX}" cy="${centerY}" r="220" fill="none" stroke="rgba(255,201,60,0.2)" stroke-width="2" stroke-dasharray="5,5" />`;
  svg += `<circle cx="${centerX}" cy="${centerY}" r="120" fill="none" stroke="rgba(255,201,60,0.2)" stroke-width="2" stroke-dasharray="5,5" />`;

  // ═══════════════════════════════════════════════════════
  // CENTRO - TROFEO
  // ═══════════════════════════════════════════════════════
  svg += `<circle cx="${centerX}" cy="${centerY}" r="80" fill="url(#glow)" />`;
  svg += `<text x="${centerX}" y="${centerY - 10}" text-anchor="middle" font-size="65">🏆</text>`;
  svg += `<text x="${centerX}" y="${centerY + 50}" text-anchor="middle" font-family="Anton, sans-serif" font-size="18" fill="#FFC93C" letter-spacing="3">FINAL</text>`;

  // ═══════════════════════════════════════════════════════
  // LÍNEAS CONECTORAS
  // ═══════════════════════════════════════════════════════
  
  // 16avos → Octavos
  partidosOctavos.forEach((octavo, idx) => {
    const pos1 = getPosicion(partidos16avos.findIndex(p => p.id === octavo.from1), 16, 420);
    const pos2 = getPosicion(partidos16avos.findIndex(p => p.id === octavo.from2), 16, 420);
    const posOct = getPosicion(idx, 8, 320);
    
    const g1 = getGanadorDePartido(octavo.from1);
    const g2 = getGanadorDePartido(octavo.from2);
    const lineColor = (g1 && g2) ? 'rgba(255,201,60,0.6)' : 'rgba(255,255,255,0.15)';
    const lineWidth = (g1 && g2) ? '2.5' : '1.5';
    
    svg += `<line x1="${pos1.x}" y1="${pos1.y}" x2="${posOct.x}" y2="${posOct.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
    svg += `<line x1="${pos2.x}" y1="${pos2.y}" x2="${posOct.x}" y2="${posOct.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
  });

  // Octavos → Cuartos
  partidosCuartos.forEach((cuarto, idx) => {
    const pos1 = getPosicion(partidosOctavos.findIndex(p => p.id === cuarto.from1), 8, 320);
    const pos2 = getPosicion(partidosOctavos.findIndex(p => p.id === cuarto.from2), 8, 320);
    const posCua = getPosicion(idx, 4, 220);
    
    const g1 = getGanadorDePartido(cuarto.from1);
    const g2 = getGanadorDePartido(cuarto.from2);
    const lineColor = (g1 && g2) ? 'rgba(255,201,60,0.7)' : 'rgba(255,255,255,0.15)';
    const lineWidth = (g1 && g2) ? '2.5' : '1.5';
    
    svg += `<line x1="${pos1.x}" y1="${pos1.y}" x2="${posCua.x}" y2="${posCua.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
    svg += `<line x1="${pos2.x}" y1="${pos2.y}" x2="${posCua.x}" y2="${posCua.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
  });

  // Cuartos → Semis
  partidosSemis.forEach((semi, idx) => {
    const pos1 = getPosicion(partidosCuartos.findIndex(p => p.id === semi.from1), 4, 220);
    const pos2 = getPosicion(partidosCuartos.findIndex(p => p.id === semi.from2), 4, 220);
    const posSemi = getPosicion(idx, 2, 120);
    
    const g1 = getGanadorDePartido(semi.from1);
    const g2 = getGanadorDePartido(semi.from2);
    const lineColor = (g1 && g2) ? 'rgba(255,201,60,0.8)' : 'rgba(255,255,255,0.15)';
    const lineWidth = (g1 && g2) ? '2.5' : '1.5';
    
    svg += `<line x1="${pos1.x}" y1="${pos1.y}" x2="${posSemi.x}" y2="${posSemi.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
    svg += `<line x1="${pos2.x}" y1="${pos2.y}" x2="${posSemi.x}" y2="${posSemi.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
  });

  // Semis → Final
  const posSemi1 = getPosicion(0, 2, 120);
  const posSemi2 = getPosicion(1, 2, 120);
  const gSemi1 = getGanadorDePartido('M101');
  const gSemi2 = getGanadorDePartido('M102');
  const finalColor = (gSemi1 && gSemi2) ? 'rgba(255,201,60,1)' : 'rgba(255,255,255,0.15)';
  const finalWidth = (gSemi1 && gSemi2) ? '3' : '1.5';
  
  svg += `<line x1="${posSemi1.x}" y1="${posSemi1.y}" x2="${centerX}" y2="${centerY - 60}" stroke="${finalColor}" stroke-width="${finalWidth}" />`;
  svg += `<line x1="${posSemi2.x}" y1="${posSemi2.y}" x2="${centerX}" y2="${centerY - 60}" stroke="${finalColor}" stroke-width="${finalWidth}" />`;

  // ══════════════════════════════════════════════════════
  // 16AVOS - Círculo exterior (radio 420)
  // Mostrar AMBAS banderas
  // ═══════════════════════════════════════════════════════
  partidos16avos.forEach((partido, index) => {
    const pos = getPosicion(index, 16, 420);
    const ganador = resolverGanador(partido.id);
    
    const flagLocal = FLAGS[partido.local] || '🏳️';
    const flagVisit = FLAGS[partido.visit] || '️';
    
    // Círculo con borde dorado si hay ganador
    const circleColor = ganador ? '#FFC93C' : 'rgba(255,255,255,0.3)';
    const circleRadius = ganador ? '28' : '24';
    
    svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${circleRadius}" fill="#1a1a2e" stroke="${circleColor}" stroke-width="${ganador ? '3' : '2'}" filter="url(#shadow)" />`;
    
    // Mostrar ambas banderas
    svg += `<text x="${pos.x - 14}" y="${pos.y + 8}" text-anchor="middle" font-size="20">${flagLocal}</text>`;
    svg += `<text x="${pos.x + 14}" y="${pos.y + 8}" text-anchor="middle" font-size="20">${flagVisit}</text>`;
  });

  // ═══════════════════════════════════════════════════════
  // OCTAVOS - Círculo 2 (radio 320)
  // Mostrar ganadores de 16avos
  // ══════════════════════════════════════════════════════
  partidosOctavos.forEach((octavo, index) => {
    const pos = getPosicion(index, 8, 320);
    const g1 = getGanadorDePartido(octavo.from1);
    const g2 = getGanadorDePartido(octavo.from2);
    const ganador = resolverGanador(octavo.id);
    
    if (g1 && g2) {
      const equipoGanador = ganador ? (ganador === 'local' ? g1 : g2) : null;
      const circleColor = ganador ? '#FFC93C' : 'rgba(255,201,60,0.5)';
      const circleRadius = ganador ? '30' : '26';
      
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${circleRadius}" fill="#1a1a2e" stroke="${circleColor}" stroke-width="${ganador ? '3' : '2'}" filter="url(#shadow)" />`;
      
      if (equipoGanador) {
        const flagGanador = FLAGS[equipoGanador] || '🏳️';
        svg += `<text x="${pos.x}" y="${pos.y + 10}" text-anchor="middle" font-size="32">${flagGanador}</text>`;
      } else {
        const flag1 = FLAGS[g1] || '🏳️';
        const flag2 = FLAGS[g2] || '️';
        svg += `<text x="${pos.x - 14}" y="${pos.y + 8}" text-anchor="middle" font-size="22">${flag1}</text>`;
        svg += `<text x="${pos.x + 14}" y="${pos.y + 8}" text-anchor="middle" font-size="22">${flag2}</text>`;
      }
    } else {
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="22" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-dasharray="3,3" />`;
      svg += `<text x="${pos.x}" y="${pos.y + 6}" text-anchor="middle" font-size="16" fill="rgba(255,255,255,0.3)">?</text>`;
    }
  });

  // ═══════════════════════════════════════════════════════
  // CUARTOS - Círculo 3 (radio 220)
  // ═══════════════════════════════════════════════════════
  partidosCuartos.forEach((cuarto, index) => {
    const pos = getPosicion(index, 4, 220);
    const g1 = getGanadorDePartido(cuarto.from1);
    const g2 = getGanadorDePartido(cuarto.from2);
    const ganador = resolverGanador(cuarto.id);
    
    if (g1 && g2) {
      const equipoGanador = ganador ? (ganador === 'local' ? g1 : g2) : null;
      const circleColor = ganador ? '#FFC93C' : 'rgba(255,201,60,0.6)';
      const circleRadius = ganador ? '32' : '28';
      
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${circleRadius}" fill="#1a1a2e" stroke="${circleColor}" stroke-width="${ganador ? '3' : '2'}" filter="url(#shadow)" />`;
      
      if (equipoGanador) {
        const flagGanador = FLAGS[equipoGanador] || '🏳️';
        svg += `<text x="${pos.x}" y="${pos.y + 11}" text-anchor="middle" font-size="34">${flagGanador}</text>`;
      } else {
        const flag1 = FLAGS[g1] || '🏳️';
        const flag2 = FLAGS[g2] || '🏳️';
        svg += `<text x="${pos.x - 15}" y="${pos.y + 9}" text-anchor="middle" font-size="24">${flag1}</text>`;
        svg += `<text x="${pos.x + 15}" y="${pos.y + 9}" text-anchor="middle" font-size="24">${flag2}</text>`;
      }
    } else {
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="22" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-dasharray="3,3" />`;
      svg += `<text x="${pos.x}" y="${pos.y + 6}" text-anchor="middle" font-size="16" fill="rgba(255,255,255,0.3)">?</text>`;
    }
  });

  // ═══════════════════════════════════════════════════════
  // SEMIS - Círculo 4 (radio 120)
  // ══════════════════════════════════════════════════════
  partidosSemis.forEach((semi, index) => {
    const pos = getPosicion(index, 2, 120);
    const g1 = getGanadorDePartido(semi.from1);
    const g2 = getGanadorDePartido(semi.from2);
    const ganador = resolverGanador(semi.id);
    
    if (g1 && g2) {
      const equipoGanador = ganador ? (ganador === 'local' ? g1 : g2) : null;
      const circleColor = ganador ? '#FFC93C' : 'rgba(255,201,60,0.7)';
      const circleRadius = ganador ? '34' : '30';
      
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${circleRadius}" fill="#1a1a2e" stroke="${circleColor}" stroke-width="${ganador ? '3' : '2'}" filter="url(#shadow)" />`;
      
      if (equipoGanador) {
        const flagGanador = FLAGS[equipoGanador] || '🏳️';
        svg += `<text x="${pos.x}" y="${pos.y + 12}" text-anchor="middle" font-size="36">${flagGanador}</text>`;
      } else {
        const flag1 = FLAGS[g1] || '️';
        const flag2 = FLAGS[g2] || '🏳️';
        svg += `<text x="${pos.x - 16}" y="${pos.y + 10}" text-anchor="middle" font-size="26">${flag1}</text>`;
        svg += `<text x="${pos.x + 16}" y="${pos.y + 10}" text-anchor="middle" font-size="26">${flag2}</text>`;
      }
    } else {
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="22" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-dasharray="3,3" />`;
      svg += `<text x="${pos.x}" y="${pos.y + 6}" text-anchor="middle" font-size="16" fill="rgba(255,255,255,0.3)">?</text>`;
    }
  });

  svg += '</svg>';
  container.innerHTML = svg;
  console.log("✅ Bracket circular renderizado con éxito");
}
