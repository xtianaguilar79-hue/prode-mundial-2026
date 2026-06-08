import { supabase, ADMIN_EMAIL } from "./supabase-config.js";

export async function protegerPagina(requiereAdmin = false) {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log("⚠️ No hay sesión, redirigiendo a login");
      window.location.href = "login.html";
      return;
    }

    // Obtener perfil del usuario
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userError || !usuario) {
      console.error("❌ No se encontró el perfil del usuario:", userError);
      window.location.href = "login.html";
      return;
    }

    console.log("✅ Usuario autenticado:", usuario.nombre, usuario.apellido, "ID:", usuario.id);

    // Mostrar nombre en el header
    const userNameEl = document.getElementById("userName");
    if (userNameEl) {
      userNameEl.textContent = usuario.nombre;
    }

    // Mostrar tag ADMIN si corresponde
    if (usuario.es_admin) {
      const adminTag = document.getElementById("adminTag");
      if (adminTag) adminTag.style.display = "inline";
      const linkAdmin = document.getElementById("linkAdmin");
      if (linkAdmin) linkAdmin.style.display = "inline-block";
    }

    // Si requiere admin y no lo es
    if (requiereAdmin && !usuario.es_admin) {
      alert("No tenés permisos de administrador");
      window.location.href = "prode.html";
      return;
    }

    // Guardar usuario en window con el formato correcto
    window.usuarioActual = {
      uid: usuario.id,  // ← CLAVE: mapear id a uid para compatibilidad
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      apodo: usuario.apodo,
      grupos: usuario.grupos,
      es_admin: usuario.es_admin,
      puntos_totales: usuario.puntos_totales
    };
    
    window.session = session;

    // Disparar evento
    window.dispatchEvent(new CustomEvent("usuarioListo", { 
      detail: { 
        user: { uid: usuario.id, id: usuario.id, email: session.user.email }, 
        perfil: usuario 
      } 
    }));

  } catch (err) {
    console.error("❌ Error en auth-guard:", err);
    window.location.href = "login.html";
  }
}

export async function cerrarSesion() {
  try {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  } catch (err) {
    console.error("Error al cerrar sesión:", err);
  }
}