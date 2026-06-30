import { FLAGS } from "./datos-partidos.js";

// ═══════════════════════════════════════════════════════
// BRACKET CIRCULAR - MUNDIAL 2026
// ═══════════════════════════════════════════════════════

export function renderBracketCircular(resultados, clasificacion) {
  const container = document.getElementById('bracketCircular');
  if (!container) {
    console.error("❌ No se encontró #bracketCircular");
    return;
  }

  console.log("🎨 Renderizando bracket circular...");

  // Configuración
  const width = 1000;
  const height = 1000;
  const centerX = width / 2;
  const centerY = height / 2;
  const trophyRadius = 80;
  
  // Crear SVG
  let svg = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; min-height:1000px;">
      <!-- Fondo degradado -->
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:rgba(255,201,60,0.3)" />
          <stop offset="100%" style="stop-color:transparent" />
        </radialGradient>
      </defs>
      
      <!-- Círculos concéntricos -->
      <circle cx="${centerX}" cy="${centerY}" r="450" fill="none" stroke="rgba(255,201,60,0.2)" stroke-width="2" />
      <circle cx="${centerX}" cy="${centerY}" r="350" fill="none" stroke="rgba(255,201,60,0.2)" stroke-width="2" />
      <circle cx="${centerX}" cy="${centerY}" r="230" fill="none" stroke="rgba(255,201,60,0.2)" stroke-width="2" />
      <circle cx="${centerX}" cy="${centerY}" r="130" fill="none" stroke="rgba(255,201,60,0.2)" stroke-width="2" />
      
      <!-- Brillo central -->
      <circle cx="${centerX}" cy="${centerY}" r="${trophyRadius}" fill="url(#glow)" />
      
      <!-- Trofeo en el centro -->
      <text x="${centerX}" y="${centerY - 20}" text-anchor="middle" font-size="60" fill="#FFC93C" style="filter:drop-shadow(0 0 20px rgba(255,201,60,0.8))">🏆</text>
      <text x="${centerX}" y="${centerY + 50}" text-anchor="middle" font-family="Anton, sans-serif" font-size="18" fill="#FFC93C" letter-spacing="2">FINAL</text>
  `;

  // 16avos - Círculo exterior (radio 420)
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

  // Dibujar 16avos
  partidos16avos.forEach((partido, index) => {
    const angle = (index * 22.5) * (Math.PI / 180);
    const radius = 420;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    const res = resultados.find(r => r.partido_id === partido.id);
    const ganador = resolverGanadorCircular(partido.id, resultados);
    const winnerClass = ganador ? 'winner' : '';
    
    const flagLocal = FLAGS[partido.local] || '🏳️';
    const flagVisit = FLAGS[partido.visit] || '🏳️';
    const scoreLocal = res && res.local !== null ? res.local : '';
    const scoreVisit = res && res.visit !== null ? res.visit : '';
    
    svg += `
      <g class="match-node ${winnerClass}" transform="translate(${x - 70}, ${y - 35})">
        <rect width="140" height="70" rx="8" fill="#1a1a2e" stroke="${ganador ? '#FFC93C' : '#333'}" stroke-width="${ganador ? '3' : '2'}" />
        <text x="10" y="22" font-size="11" fill="${ganador === 'local' ? '#FFC93C' : '#fff'}" font-weight="${ganador === 'local' ? 'bold' : 'normal'}">
          ${flagLocal} ${partido.local}
        </text>
        <text x="130" y="22" font-size="13" fill="#FFC93C" text-anchor="end" font-family="Anton, sans-serif">
          ${scoreLocal}
        </text>
        <text x="10" y="42" font-size="11" fill="${ganador === 'visit' ? '#FFC93C' : '#fff'}" font-weight="${ganador === 'visit' ? 'bold' : 'normal'}">
          ${flagVisit} ${partido.visit}
        </text>
        <text x="130" y="42" font-size="13" fill="#FFC93C" text-anchor="end" font-family="Anton, sans-serif">
          ${scoreVisit}
        </text>
      </g>
    `;
  });

  svg += '</svg>';
  container.innerHTML = svg;
  console.log("✅ Bracket circular renderizado");
}

function resolverGanadorCircular(partidoId, resultados) {
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
