import { auth, db, ADMIN_EMAIL } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function protegerPagina(requiereAdmin = false) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/login.html";
      return;
    }
    
    const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));
    const perfil = perfilSnap.exists() ? perfilSnap.data() : {};
    
    if (requiereAdmin && !perfil.esAdmin) {
      alert("⛔ Acceso solo para administradores");
      window.location.href = "/prode.html";
      return;
    }
    
    window.__USER__ = user;
    window.__PERFIL__ = perfil;
    window.dispatchEvent(new CustomEvent("usuarioListo", { 
      detail: { user, perfil } 
    }));
  });
}

export function cerrarSesion() {
  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js")
    .then(mod => mod.signOut(auth))
    .then(() => window.location.href = "/login.html");
}