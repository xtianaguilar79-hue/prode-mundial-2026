import { supabase, ADMIN_EMAIL } from "./supabase-config.js";

let usuarioGuardado = null;

export async function protegerPagina(requiereAdmin = false) {
  if (usuarioGuardado) return usuarioGuardado;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log("⚠️ No hay sesión, redirigiendo a login");
      window.location.href = "login.html";
      return null;
    }

    console.log("✅ Sesión activa:", session.user.email);

    // Buscar perfil del usuario
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // Si no existe el perfil, crearlo automáticamente
    if (userError || !usuario) {
      console.log("⚠️ Perfil no encontrado, creándolo...");
      
      const nuevoPerfil = {
        id: session.user.id,
        email: session.user.email,
        nombre: session.user.email.split('@')[0],
        apellido: 'Usuario',
        apodo: null,
        grupos: [],
        es_admin: session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
        puntos_totales: 0
      };

      const { error: insertError } = await supabase
        .from('usuarios')
        .insert(nuevoPerfil);

      if (insertError) {
        console.error("❌ Error al crear perfil:", insertError);
        alert("Error al crear tu perfil. Contactá al administrador.");
        await supabase.auth.signOut();
        window.location.href = "login.html";
        return null;
      }

      console.log("✅ Perfil creado automáticamente");
      
      // Volver a buscar el perfil
      const { data: usuarioCreado, error: errorCreado } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (errorCreado || !usuarioCreado) {
        console.error("❌ No se pudo recuperar el perfil creado");
        window.location.href = "login.html";
        return null;
      }

      usuarioGuardado = {
        uid: usuarioCreado.id,
        id: usuarioCreado.id,
        email: usuarioCreado.email,
        nombre: usuarioCreado.nombre,
        apellido: usuarioCreado.apellido,
        es_admin: usuarioCreado.es_admin
      };
    } else {
      usuarioGuardado = {
        uid: usuario.id,
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        es_admin: usuario.es_admin
      };
    }

    // Actualizar UI
    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.textContent = usuarioGuardado.nombre;

    if (usuarioGuardado.es_admin) {
      const adminTag = document.getElementById("adminTag");
      if (adminTag) adminTag.style.display = "inline";
      const linkAdmin = document.getElementById("linkAdmin");
      if (linkAdmin) linkAdmin.style.display = "inline-block";
    }

    if (requiereAdmin && !usuarioGuardado.es_admin) {
      alert("No tenés permisos de administrador");
      window.location.href = "prode.html";
      return null;
    }

    window.usuarioActual = usuarioGuardado;
    window.session = session;

    console.log("✅ Usuario autenticado:", usuarioGuardado.nombre);
    return usuarioGuardado;
  } catch (err) {
    console.error("❌ Error en auth-guard:", err);
    window.location.href = "login.html";
    return null;
  }
}

export async function cerrarSesion() {
  usuarioGuardado = null;
  await supabase.auth.signOut();
  window.location.href = "login.html";
}