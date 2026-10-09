import type { EstadoPedido } from "../types";

export const ESTADO_LABEL: Record<EstadoPedido, string> = {
  CREADO: "Recibido",
  LISTO: "Listo",
  ANULADO: "Anulado",
  EN_RUTA: "En ruta",
  ENTREGADO: "Entregado",
};

export const ESTADO_CLASE: Record<EstadoPedido, string> = {
  CREADO: "ui-badge--creado",
  LISTO: "ui-badge--listo",
  ANULADO: "ui-badge--anulado",
  EN_RUTA: "ui-badge--en-ruta",
  ENTREGADO: "ui-badge--entregado",
};