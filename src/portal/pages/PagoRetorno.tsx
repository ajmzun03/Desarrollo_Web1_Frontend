import { Link, useSearch } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { Vacio } from "../components/Estados";

// Pagina a la que Stripe devuelve al cliente (STRIPE_SUCCESS_URL / STRIPE_CANCEL_URL del backend,
// con ?pedido_id=<id>). El estado real del pago lo confirma el webhook; aqui solo se orienta al cliente.
export default function PagoRetorno({ resultado }: { resultado: "exito" | "cancelado" }) {
  const pedidoId = Number(new URLSearchParams(useSearch()).get("pedido_id")) || null;
  const destino = pedidoId ? `/pedido/${pedidoId}/confirmacion` : "/mis-pedidos";

  return (
    <PortalLayout>
      <div className="p-contenedor p-contenedor--angosto">
        {resultado === "exito" ? (
          <Vacio titulo="¡Gracias por tu pago!" texto="Estamos confirmando tu pago con Stripe. En unos segundos verás tu pedido actualizado.">
            <Link href={destino} className="p-btn">VER MI PEDIDO</Link>
          </Vacio>
        ) : (
          <Vacio titulo="Pago cancelado" texto="No se realizó ningún cobro. Tu pedido sigue registrado y puedes pagarlo cuando quieras.">
            <Link href={destino} className="p-btn">VOLVER A MI PEDIDO</Link>
          </Vacio>
        )}
      </div>
    </PortalLayout>
  );
}
