// Solo se aceptan rutas internas como destino tras el login (evita redirecciones a sitios externos).
export const destinoSeguro = (busqueda: string, porDefecto: string) => {
  const destino = new URLSearchParams(busqueda).get("volver");
  return destino && destino.startsWith("/") && !destino.startsWith("//") ? destino : porDefecto;
};
