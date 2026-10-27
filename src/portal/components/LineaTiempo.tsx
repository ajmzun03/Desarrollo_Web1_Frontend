import type { EstadoPedido } from "../../copac/types";
import { PASOS_PEDIDO, hora, indicePaso } from "../utils/formato";
import type { EventoEstado } from "../services/portal.service";

interface Props {
  estado: EstadoPedido;
  eventos?: EventoEstado[];
}

// La API V1 solo guarda el estado actual (sin historial con horas), por eso las
// horas solo aparecen cuando el pedido trae `eventos` (pedidos demo del portal).
export const LineaTiempo = ({ estado, eventos }: Props) => {
  if (estado === "ANULADO") return <p className="p-estado p-estado--error">Este pedido fue anulado.</p>;
  const actual = indicePaso(estado);

  return (
    <ol className="p-tiempo">
      {PASOS_PEDIDO.map((paso, n) => {
        const evento = eventos?.find((e) => e.estado === paso.estado);
        const clase = n < actual ? "p-tiempo__paso p-tiempo__paso--hecho" : n === actual ? "p-tiempo__paso p-tiempo__paso--actual" : "p-tiempo__paso";
        return (
          <li key={paso.estado} className={clase} aria-current={n === actual ? "step" : undefined}>
            <span className="p-tiempo__punto" aria-hidden="true">{n <= actual ? "✓" : ""}</span>
            <div>
              <strong>{paso.etiqueta}</strong>
              {evento && <small>{hora(evento.hora)}</small>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
