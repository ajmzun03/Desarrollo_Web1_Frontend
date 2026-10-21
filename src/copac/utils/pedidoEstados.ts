import type { EstadoPedido } from "../types";

export const ESTADO_LABEL: Record<EstadoPedido, string> = {
  CREADO: "Recibido",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  ANULADO: "Anulado",
  EN_DESPACHO: "En despacho",
  EN_RUTA: "En ruta",
  ENTREGADO: "Entregado",
};

export const ESTADO_CLASE: Record<EstadoPedido, string> = {
  CREADO: "ui-badge--creado",
  EN_PREPARACION: "ui-badge--en-preparacion",
  LISTO: "ui-badge--listo",
  ANULADO: "ui-badge--anulado",
  EN_DESPACHO: "ui-badge--en-despacho",
  EN_RUTA: "ui-badge--en-ruta",
  ENTREGADO: "ui-badge--entregado",
};