import { supabase, ADMIN_EMAIL } from "./supabase-config.js";

let usuarioGlobal = null;
let perfilGlobal = null;
let sesionGlobal = null;
let readyPromise = null;

export async function protegerPagina(requiereAdmin = false) {
  if (readyPromise) return readyPromise;
  
  readyPromise = (async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log("️ No hay sesión, redirigiendo a login");
        window.location.href = "login.html";
        throw new Error("No session");
      }

      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !usuario) {
        console.error("❌ No se encontró el perfil del usuario:", userError);
        window.location.href = "login.html";
        throw new Error("No profile");
      }

      console.log("✅ Usuario autenticado:", usuario.nombre, usuario.apellido, "ID:", usuario.id);

      const userNameEl = document.getElementById("userName");
      if (userNameEl) {
        userNameEl.textContent = usuario.nombre;
      }

      if (usuario.es_admin) {
        const adminTag = document.getElementById("adminTag");
        if (adminTag) adminTag.style.display = "inline";
        const linkAdmin = document.getElementById("linkAdmin");
        if (linkAdmin) linkAdmin.style.display = "inline-block";
      }

      if (requiereAdmin && !usuario.es_admin) {
        alert("No tenés permisos de administrador");
        window.location.href = "prode.html";
        throw new Error("Not admin");
      }

      usuarioGlobal = {
        uid: usuario.id,
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        apodo: usuario.apodo,
        grupos: usuario.grupos,
        es_admin: usuario.es_admin,
        puntos_totales: usuario.puntos_totales
      };
      
      perfilGlobal = usuario;
      sesionGlobal = session;

      window.usuarioActual = usuarioGlobal;
      window.session = session;

      window.dispatchEvent(new CustomEvent("usuarioListo", { 
        detail: { 
          user: { uid: usuario.id, id: usuario.id, email: session.user.email }, 
          perfil: usuario 
        } 
      }));

      return { user: usuarioGlobal, perfil: perfilGlobal, session: sesionGlobal };
    } catch (err) {
      console.error("❌ Error en auth-guard:", err);
      throw err;
    }
  })();

  return readyPromise;
}

export async function obtenerUsuario() {
  if (usuarioGlobal) return { user: usuarioGlobal, perfil: perfilGlobal, session: sesionGlobal };
  return protegerPagina(false);
}

export async function cerrarSesion() {
  try {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  } catch (err) {
    console.error("Error al cerrar sesión:", err);
  }
}