import { db } from "./firebase-config.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  TODOS_PARTIDOS, PARTIDOS_GRUPOS, PARTIDOS_ELIM, FLAGS, 
  calcularPuntos, calcularPuntosCampeon,
  getKickoffTimestamp, partidoBloqueado
} from "../datos-partidos.js";

// ═══════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════

// Determina si un partido está en juego ahora (entre kickoff y kickoff+100min)
function partidoEnJuego(partido) {
  const kickoff = getKickoffTimestamp(partido);
  const ahora = Date.now();
  const inicio = kickoff - (5 * 60 * 1000); // 5 min antes (bloqueo)
  const fin = kickoff + (100 * 60 * 1000);   // 100 min después (90+10 de margen)
  return ahora >= inicio && ahora <= fin;
}

// ═══════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════

async function cargarRanking() {
  try {
    const usuariosSnap = await getDocs(collection(db, "usuarios"));
    const usuarios = {};
    usuariosSnap.forEach(d => { usuarios[d.id] = d.data(); });

    const predsSnap = await getDocs(collection(db, "predicciones"));
    const resSnap = await getDocs(collection(db, "resultados"));
    const campeonesSnap = await getDocs(collection(db, "campeones"));
    const finalSnap = await getDoc(doc(db, "config", "final"));

    const resultados = {};
    resSnap.forEach(d => { resultados[d.id] = d.data(); });

    const campeones = {};
    campeonesSnap.forEach(d => { campeones[d.id] = d.data(); });

    const resultadoFinal = finalSnap.exists() ? finalSnap.data() : null;
    const campeonReal = resultadoFinal?.campeon;

    const ranking = {};

    predsSnap.forEach(doc => {
      const pred = doc.data();
      const res = resultados[pred.partidoId];
      const pts = res ? calcularPuntos(pred, res) : 0;

      if (!ranking[pred.uid]) {
        ranking[pred.uid] = {
          uid: pred.uid,
          nombre: usuarios[pred.uid]?.nombre || "Jugador",
          puntos: 0,
          puntosCampeon: 0,
          partidosPronosticados: 0,
          partidosAcertados: 0
        };
      }
      ranking[pred.uid].puntos += pts;
      ranking[pred.uid].partidosPronosticados += 1;
      if (pts > 0) ranking[pred.uid].partidosAcertados += 1;
    });

    Object.entries(campeones).forEach(([uid, pred]) => {
      if (!ranking[uid]) {
        ranking[uid] = {
          uid,
          nombre: usuarios[uid]?.nombre || "Jugador",
          puntos: 0,
          puntosCampeon: 0,
          partidosPronosticados: 0,
          partidosAcertados: 0
        };
      }
      if (campeonReal) {
        ranking[uid].puntosCampeon = calcularPuntosCampeon(pred, campeonReal);
      }
    });

    Object.values(usuarios).forEach(u => {
      if (!ranking[u.uid]) {
        ranking[u.uid] = {
          uid: u.uid,
          nombre: u.nombre,
          puntos: 0,
          puntosCampeon: 0,
          partidosPronosticados: 0,
          partidosAcertados: 0
        };
      }
    });

    const lista = Object.values(ranking).map(u => {
      const bonus = u.partidosPronosticados >= 104 ? 100 : 0;
      return { ...u, bonus, total: u.puntos + u.puntosCampeon + bonus };
    });

    lista.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.partidosAcertados !== a.partidosAcertados) return b.partidosAcertados - a.partidosAcertados;
      return b.puntosCampeon - a.puntosCampeon;
    });

    lista.forEach((u, i) => u.pos = i + 1);
    renderRanking(lista);
  } catch (err) {
    console.error(err);
    document.getElementById("rankingLoader").innerHTML = "<p style='color:var(--red)'>Error al cargar el ranking</p>";
  }
}

function renderRanking(lista) {
  document.getElementById("rankingLoader").style.display = "none";
  document.getElementById("actualizado").textContent = "Actualizado: " + new Date().toLocaleTimeString();

  // Si no hay jugadores o todos tienen 0 puntos
  const hayJugadoresActivos = lista.some(u => u.partidosPronosticados > 0);

  if (!hayJugadoresActivos || lista.length === 0) {
    // Mostrar mensaje "Muy pronto arranca el torneo"
    document.getElementById("rankingTabla").style.display = "none";
    document.getElementById("top3").innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:50px 20px; background:var(--card); border-radius:var(--r-lg); border:1.5px solid var(--gold); box-shadow: 0 4px 24px rgba(255, 201, 60, 0.08);">
        <div style="font-size:70px; margin-bottom:16px;">🏆</div>
        <h3 style="color:var(--gold); font-family:'Anton'; font-size:clamp(24px, 4vw, 36px); margin-bottom:12px; letter-spacing:1px;">MUY PRONTO ARRANCA EL TORNEO</h3>
        <p style="color:var(--text2); font-size:15px; max-width:450px; margin:0 auto 20px; line-height:1.6;">
          El ranking se activará una vez que comience el Mundial y los jugadores carguen sus pronósticos.
        </p>
        <a href="login.html" class="btn" style="display:inline-block; width:auto; padding:12px 32px; text-decoration:none; font-size:14px;"> Registrarme y pronosticar</a>
      </div>
    `;
    return;
  }

  // Hay jugadores activos: mostrar ranking normal
  document.getElementById("rankingTabla").style.display = "block";

  // TOP 3
  const top3Div = document.getElementById("top3");
  if (lista.length >= 3) {
    const orden = [1, 0, 2];
    const colores = ["p2", "p1", "p3"];
    const emojis = ["🥈", "", "🥉"];
    
    top3Div.innerHTML = orden.map((idx, i) => {
      const u = lista[idx];
      if (!u) return "";
      return `
        <div class="top3-card ${colores[i]}">
          <div class="emoji">${emojis[i]}</div>
          <div class="nombre">${u.nombre}</div>
          <div class="pts">${u.total}</div>
          <div class="meta">${u.partidosPronosticados} partidos · ${u.partidosAcertados} acertados</div>
        </div>
      `;
    }).join("");
  } else {
    top3Div.innerHTML = "";
  }

  // Tabla completa
  const tbody = document.getElementById("rankingBody");
  tbody.innerHTML = lista.map(u => {
    const claseFila = u.pos === 1 ? "top1" : u.pos === 2 ? "top2" : u.pos === 3 ? "top3" : "";
    const posText = u.pos <= 3 ? `<span class="pos-${u.pos}">${["🥇","🥈",""][u.pos-1]}</span>` : u.pos;
    return `
      <tr class="${claseFila}">
        <td>${posText}</td>
        <td class="left"><strong>${u.nombre}</strong></td>
        <td>${u.partidosPronosticados}/104</td>
        <td>${u.partidosAcertados}</td>
        <td>${u.puntosCampeon > 0 ? `<span style="color:var(--gold)">+${u.puntosCampeon}</span>` : "—"}</td>
        <td>${u.bonus > 0 ? `<span style="color:var(--green)">+${u.bonus}</span>` : "—"}</td>
        <td class="pts-total">${u.total}</td>
      </tr>
    `;
  }).join("");
}

// ═══════════════════════════════════════════════════════
// RESULTADOS OFICIALES (con partidos en vivo destacados)
// ═══════════════════════════════════════════════════════

async function cargarResultados() {
  try {
    const resSnap = await getDocs(collection(db, "resultados"));
    const resultados = {};
    resSnap.forEach(d => { resultados[d.id] = d.data(); });

    document.getElementById("resultadosLoader").style.display = "none";

    const secciones = [
      { label: "Fase de Grupos · Fecha 1", partidos: PARTIDOS_GRUPOS.filter(p => p.j === 1) },
      { label: "Fase de Grupos · Fecha 2", partidos: PARTIDOS_GRUPOS.filter(p => p.j === 2) },
      { label: "Fase de Grupos · Fecha 3", partidos: PARTIDOS_GRUPOS.filter(p => p.j === 3) },
      { label: "Dieciseisavos de Final", partidos: PARTIDOS_ELIM.filter(p => p.fase === "16avos") },
      { label: "Octavos de Final", partidos: PARTIDOS_ELIM.filter(p => p.fase === "octavos") },
      { label: "Cuartos de Final", partidos: PARTIDOS_ELIM.filter(p => p.fase === "cuartos") },
      { label: "Semifinales", partidos: PARTIDOS_ELIM.filter(p => p.fase === "semis") },
      { label: "3er Puesto", partidos: PARTIDOS_ELIM.filter(p => p.fase === "3er") },
      { label: "🏆 Final", partidos: PARTIDOS_ELIM.filter(p => p.fase === "final") },
    ];

    // Detectar si hay ALGÚN resultado cargado
    const hayResultados = Object.keys(resultados).length > 0;

    const cont = document.getElementById("resultadosContenido");

    // Si NO hay resultados cargados: mostrar TODOS los partidos sin resultado
    if (!hayResultados) {
      cont.innerHTML = `
        <div style="text-align:center; padding:30px 20px; background:var(--card); border-radius:var(--r); border:1px solid var(--border); margin-bottom:24px;">
          <div style="font-size:50px; margin-bottom:12px;"></div>
          <h3 style="color:var(--gold); font-family:'Anton'; font-size:clamp(20px, 3vw, 28px); margin-bottom:8px;">PROGRAMA DE PARTIDOS</h3>
          <p style="color:var(--text2); font-size:14px; max-width:450px; margin:0 auto;">
            Estos son los 104 partidos del Mundial. Los resultados oficiales se publicarán aquí una vez finalizado cada encuentro.
          </p>
        </div>
        ${secciones.map(sec => {
          if (sec.partidos.length === 0) return "";
          return `
            <div class="admin-section">
              <h3>${sec.label} (${sec.partidos.length} partidos)</h3>
              ${sec.partidos.map(p => {
                const flagL = FLAGS[p.local] || "🏳️";
                const flagV = FLAGS[p.visit] || "🏳️";
                const enJuego = partidoEnJuego(p);
                return `
                  <div class="res-row" style="${enJuego ? 'background:var(--gold-soft); border-left:4px solid var(--gold);' : ''}">
                    <span class="res-id">${p.id}</span>
                    <span class="res-match">
                      ${enJuego ? '<span style="color:var(--gold); font-weight:700; margin-right:6px;">🔴 EN VIVO</span>' : ''}
                      ${flagL} ${p.local} <strong style="color:var(--text2); margin:0 8px;">vs</strong> ${p.visit} ${flagV}
                    </span>
                    ${p.grupo ? `<span class="badge badge-grupo">Grupo ${p.grupo}</span>` : ""}
                    <span style="color:var(--text2); font-size:11px;">${p.fecha} · ${p.hora} ARG · ${p.sede}</span>
                  </div>
                `;
              }).join("")}
            </div>
          `;
        }).join("")}
      `;
      return;
    }

    // Si YA hay resultados: mostrar normalmente, destacando los que están en juego
    cont.innerHTML = secciones.map(sec => {
      const conResultado = sec.partidos.filter(p => resultados[p.id]);
      const sinResultado = sec.partidos.filter(p => !resultados[p.id]);
      
      if (conResultado.length === 0 && sinResultado.length === 0) return "";
      
      let html = `<div class="admin-section"><h3>${sec.label}</h3>`;
      
      // Primero los que están en juego (sin resultado pero en horario)
      const enJuego = sinResultado.filter(p => partidoEnJuego(p));
      enJuego.forEach(p => {
        const flagL = FLAGS[p.local] || "🏳️";
        const flagV = FLAGS[p.visit] || "️";
        html += `
          <div class="res-row" style="background:var(--gold-soft); border-left:4px solid var(--gold);">
            <span class="res-id">${p.id}</span>
            <span class="res-match">
              <span style="color:var(--gold); font-weight:700; margin-right:6px;">🔴 EN VIVO</span>
              ${flagL} ${p.local} <strong style="color:var(--text2); margin:0 8px;">vs</strong> ${p.visit} ${flagV}
            </span>
            ${p.grupo ? `<span class="badge badge-grupo">Grupo ${p.grupo}</span>` : ""}
            <span style="color:var(--text2); font-size:11px;">${p.fecha} · ${p.hora} ARG</span>
          </div>
        `;
      });

      // Luego los que ya tienen resultado
      conResultado.forEach(p => {
        const r = resultados[p.id];
        const flagL = FLAGS[p.local] || "🏳️";
        const flagV = FLAGS[p.visit] || "🏳️";
        html += `
          <div class="res-row">
            <span class="res-id">${p.id}</span>
            <span class="res-match">
              ${flagL} ${p.local} <strong style="color:var(--gold); margin:0 8px;">${r.local} - ${r.visit}</strong> ${p.visit} ${flagV}
            </span>
            ${p.grupo ? `<span class="badge badge-grupo">Grupo ${p.grupo}</span>` : ""}
            <span style="color:var(--text2); font-size:11px;">${p.fecha} · ${p.sede}</span>
          </div>
        `;
      });

      // Finalmente los que aún no tienen resultado y no están en juego (próximos)
      const proximos = sinResultado.filter(p => !partidoEnJuego(p));
      if (proximos.length > 0) {
        proximos.forEach(p => {
          const flagL = FLAGS[p.local] || "🏳️";
          const flagV = FLAGS[p.visit] || "🏳️";
          html += `
            <div class="res-row" style="opacity:0.7;">
              <span class="res-id">${p.id}</span>
              <span class="res-match">
                ${flagL} ${p.local} <strong style="color:var(--text2); margin:0 8px;">vs</strong> ${p.visit} ${flagV}
              </span>
              ${p.grupo ? `<span class="badge badge-grupo">Grupo ${p.grupo}</span>` : ""}
              <span style="color:var(--text2); font-size:11px;">${p.fecha} · ${p.hora} ARG</span>
            </div>
          `;
        });
      }

      html += `</div>`;
      return html;
    }).join("");

  } catch (err) {
    console.error(err);
    document.getElementById("resultadosLoader").innerHTML = "<p style='color:var(--red)'>Error al cargar resultados</p>";
  }
}

// ══════════════════════════════════════════════════════
// INICIO
// ═══════════════════════════════════════════════════════

cargarRanking();
cargarResultados();

// Actualizar cada 60 segundos (para refrescar partidos en vivo)
setInterval(() => {
  cargarRanking();
  cargarResultados();
}, 60000);