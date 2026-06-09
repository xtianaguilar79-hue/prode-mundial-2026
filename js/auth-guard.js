import { supabase } from "./supabase-config.js";

let usuarioGlobal = null;
let perfilGlobal = null;
let sesionGlobal = null;
let readyPromise = null;

export async function protegerPagina(requiereAdmin = false) {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    try {

      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (error || !session) {
        window.location.href = "login.html";
        throw new Error("Sin sesión");
      }

      const { data: usuario, error: perfilError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (perfilError || !usuario) {
        console.error("Perfil inexistente:", perfilError);
        window.location.href = "login.html";
        throw new Error("Perfil no encontrado");
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
        puntos_totales: usuario.puntos_totales,
        fecha_registro: usuario.fecha_registro
      };

      perfilGlobal = usuario;
      sesionGlobal = session;

      window.usuarioActual = usuarioGlobal;
      window.session = session;

      const userName = document.getElementById("userName");

      if (userName) {
        userName.textContent =
          usuario.nombre || usuario.apodo || usuario.email;
      }

      if (usuario.es_admin === true) {

        const adminTag =
          document.getElementById("adminTag");

        if (adminTag) {
          adminTag.style.display = "inline";
        }

        const linkAdmin =
          document.getElementById("linkAdmin");

        if (linkAdmin) {
          linkAdmin.style.display = "inline-block";
        }
      }

      if (requiereAdmin && usuario.es_admin !== true) {

        alert("No tenés permisos de administrador");

        window.location.href = "prode.html";

        throw new Error("Usuario sin permisos");
      }

      window.dispatchEvent(
        new CustomEvent(
          "usuarioListo",
          {
            detail: {
              user: usuarioGlobal,
              perfil: usuario
            }
          }
        )
      );

      return {
        user: usuarioGlobal,
        perfil: perfilGlobal,
        session: sesionGlobal
      };

    } catch (err) {

      console.error(
        "Error en auth-guard:",
        err
      );

      throw err;
    }
  })();

  return readyPromise;
}

export async function obtenerUsuario() {

  if (usuarioGlobal) {
    return {
      user: usuarioGlobal,
      perfil: perfilGlobal,
      session: sesionGlobal
    };
  }

  return protegerPagina(false);
}

export async function cerrarSesion() {

  try {

    await supabase.auth.signOut();

    usuarioGlobal = null;
    perfilGlobal = null;
    sesionGlobal = null;
    readyPromise = null;

    window.location.href = "login.html";

  } catch (err) {

    console.error(
      "Error al cerrar sesión:",
      err
    );
  }
}