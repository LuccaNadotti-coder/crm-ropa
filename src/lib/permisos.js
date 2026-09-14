// Quién puede hacer qué, en un solo lugar.
//
// Roles:
//   admin      -> ve las 6 tiendas y puede crear, editar y eliminar.
//   tienda     -> ve y edita solo los clientes de su tienda.
//   supervisor -> ve exactamente lo mismo que el admin, pero no toca nada:
//                 ni crear, ni editar, ni marcar, ni eliminar, ni enviar.
//
// La regla de verdad vive en la base de datos: el supervisor solo tiene
// políticas de SELECT, así que Postgres rechaza cualquier escritura aunque
// alguien fuerce la interfaz. Lo de acá solo evita mostrarle botones que van
// a fallar. Ver supabase-migracion-v3-supervisor.sql.

export const esAdmin = (perfil) => perfil?.rol === "admin";
export const esSupervisor = (perfil) => perfil?.rol === "supervisor";

/** Alcance de lectura: admin y supervisor ven todas las tiendas. */
export const veTodasLasTiendas = (perfil) => esAdmin(perfil) || esSupervisor(perfil);

/** Crear, editar, marcar catálogos o tareas de cumpleaños. */
export const puedeEditar = (perfil) => !esSupervisor(perfil);

/** Eliminar clientes sigue siendo exclusivo del administrador. */
export const puedeEliminar = (perfil) => esAdmin(perfil);

/**
 * Abrir un WhatsApp deja constancia en envios_whatsapp (cuenta contra el tope
 * diario de la tienda), así que es una escritura: el supervisor no la tiene.
 */
export const puedeEnviarWhatsApp = (perfil) => !esSupervisor(perfil);

/** Texto corto para la insignia de la cabecera. */
export function etiquetaRol(perfil) {
  if (esAdmin(perfil)) return "Admin";
  if (esSupervisor(perfil)) return "Supervisor";
  return perfil?.tienda?.replace(" SFIDA", "") || "Tienda";
}

/** Bajo el nombre en la barra lateral. */
export function alcanceRol(perfil) {
  if (esAdmin(perfil)) return "Todas las tiendas";
  if (esSupervisor(perfil)) return "Todas las tiendas · solo lectura";
  return perfil?.tienda || "Sin tienda";
}
