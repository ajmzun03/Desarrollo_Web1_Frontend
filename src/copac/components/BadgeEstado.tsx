import type { EstadoPedido } from "../types";
import { ESTADO_CLASE, ESTADO_LABEL } from "../utils/pedidoEstados";

export function BadgeEstado({ estado }: { estado: EstadoPedido }) {
  return (
    <span className={`ui-badge ${ESTADO_CLASE[estado]}`}>
      <span className="ui-badge__dot" />
      {ESTADO_LABEL[estado]}
    </span>
  );
}