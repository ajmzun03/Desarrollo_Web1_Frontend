import { useState } from "react";
import { Link } from "wouter";
import { pedidosService } from "../../copac/services/pedidos.service";

interface Props {
  pedidoId: number;
  // Se llama cuando el pedido pasó a efectivo, para que la pantalla vuelva a leerlo.
  alCambiar?: () => void;
}

// Pedido con tarjeta que aún no se cobró: el cliente puede retomar el pago o cambiar a efectivo contra entrega.
export const PagoPendiente = ({ pedidoId, alCambiar }: Props) => {
  const [cambiando, setCambiando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const aEfectivo = async () => {
    if (!window.confirm("¿Pagar en efectivo contra entrega? Ya no se te cobrará con tarjeta.")) return;
    setCambiando(true);
    setFallo(null);
    try {
      await pedidosService.cambiarAEfectivo(pedidoId);
      alCambiar?.();
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo cambiar el método de pago.");
    } finally {
      setCambiando(false);
    }
  };

  return (
    <div className="p-aviso p-pago-pendiente">
      <strong>Pago con tarjeta pendiente</strong>
      <p>Tu pedido empezará a prepararse cuando Stripe confirme el pago.</p>
      <div className="p-acciones">
        <Link href={`/pago/${pedidoId}`} className="p-btn p-btn--acento">💳 PAGAR CON TARJETA</Link>
        <button type="button" className="p-btn p-btn--fantasma" onClick={aEfectivo} disabled={cambiando}>
          {cambiando ? "CAMBIANDO…" : "💵 CAMBIAR A EFECTIVO CONTRA ENTREGA"}
        </button>
      </div>
      {fallo && <p className="p-estado p-estado--error" role="alert">{fallo}</p>}
    </div>
  );
};
