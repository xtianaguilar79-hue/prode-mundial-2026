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
  // ORDEN CORRECTO: los que se cruzan en octavos quedan juntos
  // ═══════════════════════════════════════════════════════
  const partidos16avos = [
    { id: 'M073', local: 'Sudáfrica', visit: 'Canadá' },
    { id: 'M075', local: 'Países Bajos', visit: 'Marruecos' },
    { id: 'M074', local: 'Alemania', visit: 'Paraguay' },
    { id: 'M077', local: 'Francia', visit: 'Suecia' },
    { id: 'M076', local: 'Brasil', visit: 'Japón' },
    { id: 'M078', local: 'Costa de Marfil', visit: 'Noruega' },
    { id: 'M079', local: 'México', visit: 'Ecuador' },
    { id: 'M080', local: 'Inglaterra', visit: 'RD Congo' },
    { id: 'M083', local: 'Portugal', visit: 'Croacia' },
    { id: 'M084', local: 'España', visit: 'Austria' },
    { id: 'M081', local: 'Estados Unidos', visit: 'Bosnia-Herzegovina' },
    { id: 'M082', local: 'Bélgica', visit: 'Senegal' },
    { id: 'M086', local: 'Argentina', visit: 'Cabo Verde' },
    { id: 'M088', local: 'Australia', visit: 'Egipto' },
    { id: 'M085', local: 'Suiza', visit: 'Argelia' },
    { id: 'M087', local: 'Colombia', visit: 'Ghana' }
  ];

  const partidosOctavos = [
    { id: 'M090', from1: 'M073', from2: 'M075' },
    { id: 'M089', from1: 'M074', from2: 'M077' },
    { id: 'M091', from1: 'M076', from2: 'M078' },
    { id: 'M092', from1: 'M079', from2: 'M080' },
    { id: 'M093', from1: 'M083', from2: 'M084' },
    { id: 'M094', from1: 'M081', from2: 'M082' },
    { id: 'M095', from1: 'M086', from2: 'M088' },
    { id: 'M096', from1: 'M085', from2: 'M087' }
  ];

  const partidosCuartos = [
    { id: 'M097', from1: 'M089', from2: 'M090' },
    { id: 'M098', from1: 'M093', from2: 'M094' },
    { id: 'M099', from1: 'M091', from2: 'M092' },
    { id: 'M100', from1: 'M095', from2: 'M096' }
  ];

  const partidosSemis = [
    { id: 'M101', from1: 'M097', from2: 'M098' },
    { id: 'M102', from1: 'M099', from2: 'M100' }
  ];

  // ═══════════════════════════════════════════════════════
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

  function getGanadorDe16avo(partidoId) {
    const ganador = resolverGanador(partidoId);
    if (!ganador) return null;
    const partido = partidos16avos.find(p => p.id === partidoId);
    if (partido) return ganador === 'local' ? partido.local : partido.visit;
    return null;
  }

  function getGanadorDeRonda(partidoId) {
    const octavo = partidosOctavos.find(p => p.id === partidoId);
    if (octavo) {
      const g1 = getGanadorDe16avo(octavo.from1);
      const g2 = getGanadorDe16avo(octavo.from2);
      if (!g1 || !g2) return null;
      const ganador = resolverGanador(partidoId);
      if (!ganador) return null;
      return ganador === 'local' ? g1 : g2;
    }
    const cuarto = partidosCuartos.find(p => p.id === partidoId);
    if (cuarto) {
      const g1 = getGanadorDeRonda(cuarto.from1);
      const g2 = getGanadorDeRonda(cuarto.from2);
      if (!g1 || !g2) return null;
      const ganador = resolverGanador(partidoId);
      if (!ganador) return null;
      return ganador === 'local' ? g1 : g2;
    }
    const semi = partidosSemis.find(p => p.id === partidoId);
    if (semi) {
      const g1 = getGanadorDeRonda(semi.from1);
      const g2 = getGanadorDeRonda(semi.from2);
      if (!g1 || !g2) return null;
      const ganador = resolverGanador(partidoId);
      if (!ganador) return null;
      return ganador === 'local' ? g1 : g2;
    }
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
  // ══════════════════════════════════════════════════════
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
        <filter id="glowFilter">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
  `;

  // ═══════════════════════════════════════════════════════
  // CÍRCULOS GUÍA
  // ═══════════════════════════════════════════════════════
  svg += `<circle cx="${centerX}" cy="${centerY}" r="420" fill="none" stroke="rgba(255,201,60,0.15)" stroke-width="1.5" stroke-dasharray="4,4" />`;
  svg += `<circle cx="${centerX}" cy="${centerY}" r="320" fill="none" stroke="rgba(255,201,60,0.15)" stroke-width="1.5" stroke-dasharray="4,4" />`;
  svg += `<circle cx="${centerX}" cy="${centerY}" r="220" fill="none" stroke="rgba(255,201,60,0.15)" stroke-width="1.5" stroke-dasharray="4,4" />`;
  svg += `<circle cx="${centerX}" cy="${centerY}" r="120" fill="none" stroke="rgba(255,201,60,0.15)" stroke-width="1.5" stroke-dasharray="4,4" />`;

  // ═══════════════════════════════════════════════════════
  // CENTRO - TROFEO
  // ═══════════════════════════════════════════════════════
  svg += `<circle cx="${centerX}" cy="${centerY}" r="90" fill="url(#glow)" />`;
  svg += `<text x="${centerX}" y="${centerY - 5}" text-anchor="middle" font-size="70" filter="url(#glowFilter)">🏆</text>`;
  svg += `<text x="${centerX}" y="${centerY + 55}" text-anchor="middle" font-family="Anton, sans-serif" font-size="20" fill="#FFC93C" letter-spacing="3">FINAL</text>`;

  // ═══════════════════════════════════════════════════════
  // LÍNEAS CONECTORAS
  // ═══════════════════════════════════════════════════════
  partidosOctavos.forEach((octavo, idx) => {
    const pos1 = getPosicion(partidos16avos.findIndex(p => p.id === octavo.from1), 16, 420);
    const pos2 = getPosicion(partidos16avos.findIndex(p => p.id === octavo.from2), 16, 420);
    const posOct = getPosicion(idx, 8, 320);
    
    const g1 = getGanadorDe16avo(octavo.from1);
    const g2 = getGanadorDe16avo(octavo.from2);
    const lineColor = (g1 && g2) ? 'rgba(255,201,60,0.6)' : 'rgba(255,255,255,0.15)';
    const lineWidth = (g1 && g2) ? '2.5' : '1.5';
    
    svg += `<line x1="${pos1.x}" y1="${pos1.y}" x2="${posOct.x}" y2="${posOct.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
    svg += `<line x1="${pos2.x}" y1="${pos2.y}" x2="${posOct.x}" y2="${posOct.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
  });

  partidosCuartos.forEach((cuarto, idx) => {
    const pos1 = getPosicion(partidosOctavos.findIndex(p => p.id === cuarto.from1), 8, 320);
    const pos2 = getPosicion(partidosOctavos.findIndex(p => p.id === cuarto.from2), 8, 320);
    const posCua = getPosicion(idx, 4, 220);
    
    const g1 = getGanadorDeRonda(cuarto.from1);
    const g2 = getGanadorDeRonda(cuarto.from2);
    const lineColor = (g1 && g2) ? 'rgba(255,201,60,0.7)' : 'rgba(255,255,255,0.15)';
    const lineWidth = (g1 && g2) ? '2.5' : '1.5';
    
    svg += `<line x1="${pos1.x}" y1="${pos1.y}" x2="${posCua.x}" y2="${posCua.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
    svg += `<line x1="${pos2.x}" y1="${pos2.y}" x2="${posCua.x}" y2="${posCua.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
  });

  partidosSemis.forEach((semi, idx) => {
    const pos1 = getPosicion(partidosCuartos.findIndex(p => p.id === semi.from1), 4, 220);
    const pos2 = getPosicion(partidosCuartos.findIndex(p => p.id === semi.from2), 4, 220);
    const posSemi = getPosicion(idx, 2, 120);
    
    const g1 = getGanadorDeRonda(semi.from1);
    const g2 = getGanadorDeRonda(semi.from2);
    const lineColor = (g1 && g2) ? 'rgba(255,201,60,0.8)' : 'rgba(255,255,255,0.15)';
    const lineWidth = (g1 && g2) ? '2.5' : '1.5';
    
    svg += `<line x1="${pos1.x}" y1="${pos1.y}" x2="${posSemi.x}" y2="${posSemi.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
    svg += `<line x1="${pos2.x}" y1="${pos2.y}" x2="${posSemi.x}" y2="${posSemi.y}" stroke="${lineColor}" stroke-width="${lineWidth}" />`;
  });

  const posSemi1 = getPosicion(0, 2, 120);
  const posSemi2 = getPosicion(1, 2, 120);
  const gSemi1 = getGanadorDeRonda('M101');
  const gSemi2 = getGanadorDeRonda('M102');
  const finalColor = (gSemi1 && gSemi2) ? 'rgba(255,201,60,1)' : 'rgba(255,255,255,0.15)';
  const finalWidth = (gSemi1 && gSemi2) ? '3' : '1.5';
  
  svg += `<line x1="${posSemi1.x}" y1="${posSemi1.y}" x2="${centerX}" y2="${centerY - 70}" stroke="${finalColor}" stroke-width="${finalWidth}" />`;
  svg += `<line x1="${posSemi2.x}" y1="${posSemi2.y}" x2="${centerX}" y2="${centerY - 70}" stroke="${finalColor}" stroke-width="${finalWidth}" />`;

  // ═══════════════════════════════════════════════════════
  // 16AVOS - Círculo exterior (radio 420)
  // ═══════════════════════════════════════════════════════
  partidos16avos.forEach((partido, index) => {
    const pos = getPosicion(index, 16, 420);
    const ganador = resolverGanador(partido.id);
    
    const flagLocal = FLAGS[partido.local] || '🏳️';
    const flagVisit = FLAGS[partido.visit] || '🏳️';
    
    const circleColor = ganador ? '#FFC93C' : 'rgba(255,255,255,0.3)';
    const circleRadius = ganador ? '26' : '22';
    
    svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${circleRadius}" fill="#1a1a2e" stroke="${circleColor}" stroke-width="${ganador ? '3' : '2'}" filter="url(#shadow)" />`;
    
    svg += `<text x="${pos.x - 12}" y="${pos.y + 7}" text-anchor="middle" font-size="18">${flagLocal}</text>`;
    svg += `<text x="${pos.x + 12}" y="${pos.y + 7}" text-anchor="middle" font-size="18">${flagVisit}</text>`;
  });

  // ═══════════════════════════════════════════════════════
  // OCTAVOS - Círculo 2 (radio 320)
  // MOSTRAR BANDERAS QUE YA AVANZARON
  // ═══════════════════════════════════════════════════════
  partidosOctavos.forEach((octavo, index) => {
    const pos = getPosicion(index, 8, 320);
    const g1 = getGanadorDe16avo(octavo.from1);
    const g2 = getGanadorDe16avo(octavo.from2);
    const ganador = resolverGanador(octavo.id);
    
    if (ganador && g1 && g2) {
      // Hay ganador del octavo
      const equipoGanador = ganador === 'local' ? g1 : g2;
      const flagGanador = FLAGS[equipoGanador] || '🏳️';
      
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="30" fill="#1a1a2e" stroke="#FFC93C" stroke-width="3" filter="url(#shadow)" />`;
      svg += `<text x="${pos.x}" y="${pos.y + 10}" text-anchor="middle" font-size="32">${flagGanador}</text>`;
    } else if (g1 || g2) {
      // Solo uno de los dos equipos está definido - MOSTRAR EL QUE AVANZÓ
      const circleColor = 'rgba(255,201,60,0.4)';
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="26" fill="#1a1a2e" stroke="${circleColor}" stroke-width="2" filter="url(#shadow)" />`;
      
      if (g1 && g2) {
        // Ambos definidos pero sin ganador aún
        const flag1 = FLAGS[g1] || '🏳️';
        const flag2 = FLAGS[g2] || '🏳️';
        svg += `<text x="${pos.x - 13}" y="${pos.y + 8}" text-anchor="middle" font-size="20">${flag1}</text>`;
        svg += `<text x="${pos.x + 13}" y="${pos.y + 8}" text-anchor="middle" font-size="20">${flag2}</text>`;
      } else if (g1) {
        // Solo g1 definido
        const flag1 = FLAGS[g1] || '🏳️';
        svg += `<text x="${pos.x}" y="${pos.y + 8}" text-anchor="middle" font-size="24">${flag1}</text>`;
      } else if (g2) {
        // Solo g2 definido
        const flag2 = FLAGS[g2] || '🏳️';
        svg += `<text x="${pos.x}" y="${pos.y + 8}" text-anchor="middle" font-size="24">${flag2}</text>`;
      }
    } else {
      // Ninguno definido aún
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="20" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-dasharray="3,3" />`;
      svg += `<text x="${pos.x}" y="${pos.y + 6}" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.3)">?</text>`;
    }
  });

  // ═══════════════════════════════════════════════════════
  // CUARTOS - Círculo 3 (radio 220)
  // ══════════════════════════════════════════════════════
  partidosCuartos.forEach((cuarto, index) => {
    const pos = getPosicion(index, 4, 220);
    const g1 = getGanadorDeRonda(cuarto.from1);
    const g2 = getGanadorDeRonda(cuarto.from2);
    const ganador = resolverGanador(cuarto.id);
    
    if (ganador && g1 && g2) {
      const equipoGanador = ganador === 'local' ? g1 : g2;
      const flagGanador = FLAGS[equipoGanador] || '🏳️';
      
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="32" fill="#1a1a2e" stroke="#FFC93C" stroke-width="3" filter="url(#shadow)" />`;
      svg += `<text x="${pos.x}" y="${pos.y + 11}" text-anchor="middle" font-size="34">${flagGanador}</text>`;
    } else if (g1 || g2) {
      const circleColor = 'rgba(255,201,60,0.4)';
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="28" fill="#1a1a2e" stroke="${circleColor}" stroke-width="2" filter="url(#shadow)" />`;
      
      if (g1 && g2) {
        const flag1 = FLAGS[g1] || '🏳️';
        const flag2 = FLAGS[g2] || '🏳️';
        svg += `<text x="${pos.x - 14}" y="${pos.y + 9}" text-anchor="middle" font-size="22">${flag1}</text>`;
        svg += `<text x="${pos.x + 14}" y="${pos.y + 9}" text-anchor="middle" font-size="22">${flag2}</text>`;
      } else if (g1) {
        const flag1 = FLAGS[g1] || '️';
        svg += `<text x="${pos.x}" y="${pos.y + 9}" text-anchor="middle" font-size="26">${flag1}</text>`;
      } else if (g2) {
        const flag2 = FLAGS[g2] || '🏳️';
        svg += `<text x="${pos.x}" y="${pos.y + 9}" text-anchor="middle" font-size="26">${flag2}</text>`;
      }
    } else {
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="20" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-dasharray="3,3" />`;
      svg += `<text x="${pos.x}" y="${pos.y + 6}" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.3)">?</text>`;
    }
  });

  // ═══════════════════════════════════════════════════════
  // SEMIS - Círculo 4 (radio 120)
  // ═══════════════════════════════════════════════════════
  partidosSemis.forEach((semi, index) => {
    const pos = getPosicion(index, 2, 120);
    const g1 = getGanadorDeRonda(semi.from1);
    const g2 = getGanadorDeRonda(semi.from2);
    const ganador = resolverGanador(semi.id);
    
    if (ganador && g1 && g2) {
      const equipoGanador = ganador === 'local' ? g1 : g2;
      const flagGanador = FLAGS[equipoGanador] || '🏳️';
      
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="34" fill="#1a1a2e" stroke="#FFC93C" stroke-width="3" filter="url(#shadow)" />`;
      svg += `<text x="${pos.x}" y="${pos.y + 12}" text-anchor="middle" font-size="36">${flagGanador}</text>`;
    } else if (g1 || g2) {
      const circleColor = 'rgba(255,201,60,0.4)';
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="30" fill="#1a1a2e" stroke="${circleColor}" stroke-width="2" filter="url(#shadow)" />`;
      
      if (g1 && g2) {
        const flag1 = FLAGS[g1] || '🏳️';
        const flag2 = FLAGS[g2] || '🏳️';
        svg += `<text x="${pos.x - 15}" y="${pos.y + 10}" text-anchor="middle" font-size="24">${flag1}</text>`;
        svg += `<text x="${pos.x + 15}" y="${pos.y + 10}" text-anchor="middle" font-size="24">${flag2}</text>`;
      } else if (g1) {
        const flag1 = FLAGS[g1] || '🏳️';
        svg += `<text x="${pos.x}" y="${pos.y + 10}" text-anchor="middle" font-size="28">${flag1}</text>`;
      } else if (g2) {
        const flag2 = FLAGS[g2] || '🏳️';
        svg += `<text x="${pos.x}" y="${pos.y + 10}" text-anchor="middle" font-size="28">${flag2}</text>`;
      }
    } else {
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="20" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-dasharray="3,3" />`;
      svg += `<text x="${pos.x}" y="${pos.y + 6}" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.3)">?</text>`;
    }
  });

  svg += '</svg>';
  container.innerHTML = svg;
  console.log("✅ Bracket circular renderizado con éxito");
}
