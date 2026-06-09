import { supabase, ADMIN_EMAIL } from "./supabase-config.js";

export async function protegerPagina(requiereAdmin = false) {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log("⚠️ No hay sesión, redirigiendo a login");
      window.location.href = "login.html";
      return null;
    }

    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userError || !usuario) {
      console.error("❌ No se encontró el perfil:", userError);
      window.location.href = "login.html";
      return null;
    }

    console.log("✅ Usuario autenticado:", usuario.nombre);

    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.textContent = usuario.nombre;

    if (usuario.es_admin) {
      const adminTag = document.getElementById("adminTag");
      if (adminTag) adminTag.style.display = "inline";
      const linkAdmin = document.getElementById("linkAdmin");
      if (linkAdmin) linkAdmin.style.display = "inline-block";
    }

    if (requiereAdmin && !usuario.es_admin) {
      alert("No tenés permisos de administrador");
      window.location.href = "prode.html";
      return null;
    }

    const userData = {
      uid: usuario.id,
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      es_admin: usuario.es_admin
    };
    
    window.usuarioActual = userData;
    window.session = session;

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("usuarioListo", { 
        detail: { user: userData, perfil: usuario } 
      }));
    }, 100);

    return { user: userData, perfil: usuario, session };
  } catch (err) {
    console.error("❌ Error en auth-guard:", err);
    window.location.href = "login.html";
    return null;
  }
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}