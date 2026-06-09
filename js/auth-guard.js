import { supabase, ADMIN_EMAIL } from "./supabase-config.js";

let usuarioGuardado = null;
let sesionActiva = null;

export async function protegerPagina(requiereAdmin = false) {
  console.log("🛡️ Protegiendo ruta...");

  // 1. Intentar obtener la sesión guardada
  const { data: { session }, error } = await supabase.auth.getSession();
  
  // 2. Si NO hay sesión
  if (error || !session) {
    console.log("⚠️ No hay sesión activa.");
    // Si no estamos ya en login, mandar para allá
    if (!window.location.pathname.includes("login")) {
      window.location.href = "login.html";
    }
    return null;
  }

  // 3. Si HAY sesión
  console.log("✅ Sesión encontrada para:", session.user.email);
  sesionActiva = session;

  // Buscar perfil en base de datos
  const { data: usuario, error: userError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (userError || !usuario) {
    console.error("❌ Usuario logueado pero sin perfil en BD:", userError);
    // Si el usuario existe en Auth pero no en BD, algo salió mal en el registro
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  // 4. Verificar permisos de Admin si se requiere
  if (requiereAdmin && !usuario.es_admin) {
    alert(" No tenés permisos de administrador.");
    window.location.href = "prode.html";
    return null;
  }

  // 5. Guardar datos globales
  usuarioGuardado = {
    uid: usuario.id,
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    es_admin: usuario.es_admin
  };

  window.usuarioActual = usuarioGuardado;
  window.session = sesionActiva;

  console.log("✅ Usuario autenticado:", usuarioGuardado.nombre);
  return usuarioGuardado;
}

export async function cerrarSesion() {
  console.log("👋 Cerrando sesión...");
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

// Helper para obtener usuario sin redirigir (útil para headers públicos)
export async function obtenerUsuarioHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  
  // Si ya lo tenemos en memoria, devolverlo rápido
  if (usuarioGuardado) return usuarioGuardado;

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (usuario) {
    usuarioGuardado = {
      uid: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      es_admin: usuario.es_admin
    };
    return usuarioGuardado;
  }
  return null;
}