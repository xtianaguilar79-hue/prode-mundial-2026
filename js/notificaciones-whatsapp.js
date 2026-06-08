import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TODOS_PARTIDOS, FLAGS } from "../datos-partidos.js";

let ultimoCheck = 0;
let partidosNotificados = new Set();

// ═══════════════════════════════════════════════════════
// DETECTAR PARTIDOS PRÓXIMOS
// ═══════════════════════════════════════════════════════

export function iniciarNotificadorWhatsApp() {
  console.log("🔔 Notificador WhatsApp iniciado");
  
  // Verificar cada 30 segundos
  setInterval(() => {
    verificarPartidosProximos();
  }, 30000);
  
  // Primera verificación inmediata
  verificarPartidosProximos();
}

async function verificarPartidosProximos() {
  const ahora = Date.now();
  const resultadosSnap = await getDocs(collection(db, "resultados"));
  const resultados = {};
  resultadosSnap.forEach(d => { resultados[d.id] = d.data(); });

  TODOS_PARTIDOS.forEach(partido => {
    // Si ya se notificó o ya tiene resultado, saltar
    if (partidosNotificados.has(partido.id)) return;
    if (resultados[partido.id]) return;

    const kickoff = getKickoffTimestamp(partido);
    const minutosParaInicio = (kickoff - ahora) / (1000 * 60);

    // Notificar 10 minutos antes
    if (minutosParaInicio > 0 && minutosParaInicio <= 10) {
      mostrarNotificacion(partido, minutosParaInicio);
      partidosNotificados.add(partido.id);
    }
  });
}

function getKickoffTimestamp(partido) {
  const [dia, mes] = partido.fecha.split("/");
  const [hora, min] = partido.hora.split(":");
  return new Date(`2026-${mes}-${dia}T${hora}:${min}:00-03:00`).getTime();
}

function mostrarNotificacion(partido, minutos) {
  const flagL = FLAGS[partido.local] || "🏳️";
  const flagV = FLAGS[partido.visit] || "🏳️";
  
  const mensaje = generarMensajeWhatsApp(partido, flagL, flagV, minutos);
  
  // Crear notificación visual
  crearNotificacionUI(partido, mensaje, minutos);
  
  // Sonido de notificación (opcional)
  reproducirSonido();
}

function generarMensajeWhatsApp(partido, flagL, flagV, minutos) {
  const fase = partido.grupo ? `Grupo ${partido.grupo}` : partido.fase.toUpperCase();
  
  return `⚽ *PRODE MUNDIAL 2026* ⚽

️ *${fase}*
${flagL} *${partido.local}* vs *${partido.visit}* ${flagV}

⏰ Arranca en ${Math.round(minutos)} minutos
📍 ${partido.sede}
🕐 ${partido.hora} ARG

🔗 Seguí el ranking: ${window.location.origin}

#ProdeMundial2026`;
}

function crearNotificacionUI(partido, mensaje, minutos) {
  const notif = document.createElement("div");
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 9999;
    animation: slideIn 0.3s ease;
    font-family: 'DM Sans', sans-serif;
  `;
  
  notif.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="font-size: 32px;">🔔</div>
      <div>
        <div style="font-weight: 700; font-size: 16px;">Partido por comenzar</div>
        <div style="font-size: 13px; opacity: 0.9;">${partido.local} vs ${partido.visit}</div>
      </div>
      <button onclick="this.closest('.notif-whatsapp').remove()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        margin-left: auto;
      ">×</button>
    </div>
    
    <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px;">
      ${mensaje.replace(/\n/g, '<br>')}
    </div>
    
    <div style="display: flex; gap: 8px;">
      <button onclick="copiarMensajeWhatsApp()" style="
        flex: 1;
        background: white;
        color: #128C7E;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-weight: 700;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      ">📋 Copiar mensaje</button>
      
      <button onclick="abrirWhatsApp()" style="
        flex: 1;
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-weight: 700;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      ">💬 Abrir WhatsApp</button>
    </div>
  `;
  
  notif.classList.add("notif-whatsapp");
  document.body.appendChild(notif);
  
  // Guardar mensaje en window para los botones
  window.__ultimoMensajeWhatsApp = mensaje;
  window.__partidoActual = partido;
  
  // Auto-cerrar después de 30 segundos
  setTimeout(() => {
    if (notif.parentElement) notif.remove();
  }, 30000);
}

window.copiarMensajeWhatsApp = () => {
  const mensaje = window.__ultimoMensajeWhatsApp;
  navigator.clipboard.writeText(mensaje).then(() => {
    alert("✅ Mensaje copiado. Ahora pegalo en tu canal de WhatsApp.");
  }).catch(() => {
    // Fallback para navegadores antiguos
    const textarea = document.createElement("textarea");
    textarea.value = mensaje;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    alert("✅ Mensaje copiado. Ahora pegalo en tu canal de WhatsApp.");
  });
};

window.abrirWhatsApp = () => {
  // Abrir WhatsApp Web (funciona solo si ya está logueado)
  window.open("https://web.whatsapp.com", "_blank");
};

function reproducirSonido() {
  // Sonido simple de notificación
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = "sine";
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

// Agregar animación CSS
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);