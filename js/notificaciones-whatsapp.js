import { supabase } from "./supabase-config.js";
import { TODOS_PARTIDOS, FLAGS } from "../datos-partidos.js";

let partidosNotificados = new Set();

export function iniciarNotificadorWhatsApp() {

  console.log("🔔 Notificador WhatsApp iniciado");

  verificarPartidosProximos();

  setInterval(() => {
    verificarPartidosProximos();
  }, 30000);
}

async function verificarPartidosProximos() {

  try {

    const { data, error } = await supabase
      .from("resultados")
      .select("*");

    if (error) throw error;

    const resultados = {};

    data.forEach(r => {
      resultados[r.partido_id] = r;
    });

    const ahora = Date.now();

    TODOS_PARTIDOS.forEach(partido => {

      if (partidosNotificados.has(partido.id)) return;

      if (resultados[partido.id]) return;

      const kickoff = getKickoffTimestamp(partido);

      const minutosParaInicio =
        (kickoff - ahora) / (1000 * 60);

      if (
        minutosParaInicio > 0 &&
        minutosParaInicio <= 10
      ) {

        mostrarNotificacion(
          partido,
          minutosParaInicio
        );

        partidosNotificados.add(
          partido.id
        );
      }
    });

  } catch (err) {

    console.error(
      "Error verificando partidos:",
      err
    );
  }
}

function getKickoffTimestamp(partido) {

  const [dia, mes] =
    partido.fecha.split("/");

  const [hora, minuto] =
    partido.hora.split(":");

  return new Date(
    `2026-${mes}-${dia}T${hora}:${minuto}:00-03:00`
  ).getTime();
}

function mostrarNotificacion(
  partido,
  minutos
) {

  const flagL =
    FLAGS[partido.local] || "🏳️";

  const flagV =
    FLAGS[partido.visit] || "🏳️";

  const mensaje =
    generarMensajeWhatsApp(
      partido,
      flagL,
      flagV,
      minutos
    );

  crearNotificacionUI(
    partido,
    mensaje
  );

  reproducirSonido();
}

function generarMensajeWhatsApp(
  partido,
  flagL,
  flagV,
  minutos
) {

  const fase = partido.grupo
    ? `Grupo ${partido.grupo}`
    : partido.fase;

  return `⚽ PRODE MUNDIAL 2026 ⚽

${fase}

${flagL} ${partido.local}
vs
${partido.visit} ${flagV}

⏰ Arranca en ${Math.round(minutos)} minutos

🕐 ${partido.hora}

🔗 ${window.location.origin}`;
}

function crearNotificacionUI(
  partido,
  mensaje
) {

  const notif =
    document.createElement("div");

  notif.className =
    "notif-whatsapp";

  notif.style.cssText = `
    position:fixed;
    top:20px;
    right:20px;
    width:380px;
    max-width:90vw;
    background:#25D366;
    color:white;
    padding:16px;
    border-radius:12px;
    z-index:99999;
    box-shadow:0 10px 30px rgba(0,0,0,.25);
    font-family:sans-serif;
  `;

  notif.innerHTML = `
    <div style="font-weight:bold;margin-bottom:8px;">
      Partido por comenzar
    </div>

    <div style="margin-bottom:12px;">
      ${partido.local}
      vs
      ${partido.visit}
    </div>

    <button id="copiarWhatsMsg">
      Copiar mensaje
    </button>

    <button id="cerrarWhatsMsg">
      Cerrar
    </button>
  `;

  document.body.appendChild(
    notif
  );

  document
    .getElementById(
      "copiarWhatsMsg"
    )
    ?.addEventListener(
      "click",
      async () => {

        await navigator.clipboard.writeText(
          mensaje
        );

        alert(
          "Mensaje copiado"
        );
      }
    );

  document
    .getElementById(
      "cerrarWhatsMsg"
    )
    ?.addEventListener(
      "click",
      () => notif.remove()
    );

  setTimeout(() => {

    if (
      document.body.contains(
        notif
      )
    ) {
      notif.remove();
    }

  }, 30000);
}

function reproducirSonido() {

  try {

    const audioCtx =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

    const osc =
      audioCtx.createOscillator();

    const gain =
      audioCtx.createGain();

    osc.connect(gain);

    gain.connect(
      audioCtx.destination
    );

    osc.frequency.value = 800;

    gain.gain.setValueAtTime(
      0.2,
      audioCtx.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + 0.5
    );

    osc.start();

    osc.stop(
      audioCtx.currentTime + 0.5
    );

  } catch (err) {

    console.error(
      "Error sonido:",
      err
    );
  }
}