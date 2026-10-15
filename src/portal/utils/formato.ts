import type { EstadoPedido } from "../../copac/types";

export const quetzales = (n: number) => `Q${n.toFixed(2)}`;

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

export const numeroPedido = (id: number) => `#COPAC-${id}`;

// Emoji por categoria (la API solo expone el nombre). Se usa cuando el producto
// no tiene imagen_url.
export const emojiDeCategoria = (nombre: string): string => {
  const n = nombre.toLowerCase();
  if (/hamburg|carne/.test(n)) return "🍔";
  if (/combo/.test(n)) return "🥘";
  if (/papa|acompa|verdura/.test(n)) return "🍟";
  if (/bebida|refresco|jugo/.test(n)) return "🥤";
  if (/postre|helado|dulce/.test(n)) return "🍰";
  if (/pizza|grano/.test(n)) return "🍕";
  if (/pan|panader/.test(n)) return "🥖";
  if (/promo/.test(n)) return "🏷️";
  return "🍽️";
};

// Pasos del seguimiento. ANULADO queda fuera de la linea de tiempo normal.
export const PASOS_PEDIDO: { estado: EstadoPedido; etiqueta: string; mensaje: string }[] = [
  { estado: "CREADO", etiqueta: "Pedido recibido", mensaje: "Recibimos tu pedido y lo estamos revisando." },
  { estado: "LISTO", etiqueta: "Listo", mensaje: "Tu pedido está preparado y espera al repartidor." },
  { estado: "EN_RUTA", etiqueta: "En ruta", mensaje: "Tu pedido va en camino a tu dirección." },
  { estado: "ENTREGADO", etiqueta: "Entregado", mensaje: "¡Buen provecho! Tu pedido fue entregado." },
];

export const indicePaso = (estado: EstadoPedido) => PASOS_PEDIDO.findIndex((p) => p.estado === estado);
