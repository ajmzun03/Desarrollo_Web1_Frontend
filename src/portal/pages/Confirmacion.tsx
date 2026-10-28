import { useState } from "react";
import { Link, useParams } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { Cargando, ErrorMsg } from "../components/Estados";
import { useDatos } from "../../hooks/useDatos";
import { portalService } from "../services/portal.service";
import { useNombresProducto } from "../hooks/useNombresProducto";
import { PagoPendiente } from "../components/PagoPendiente";
import { numeroPedido, quetzales } from "../utils/formato";

export default function Confirmacion() {
  const { id } = useParams<{ id: string }>();
  const [version, setVersion] = useState(0);
  const { datos: pedido, cargando, error } = useDatos(() => portalService.getPedido(Number(id)), `${id}-${version}`);
  const nombreDe = useNombresProducto();

  // Pedido con tarjeta que aun no se pagó (se cerró la pasarela o el pago falló): permite retomarlo o pasar a efectivo.
  const pendienteDePago = pedido?.metodo_pago === "TARJETA" && !pedido.pagado && pedido.estado !== "ANULADO";

  return (
    <PortalLayout>
      <div className="p-contenedor p-contenedor--angosto">
        {cargando && <Cargando />}
        {error && <ErrorMsg mensaje={error} />}
        {pedido && (
          <div className="p-panel p-confirmacion">
            <div className="p-check" aria-hidden="true">{pendienteDePago ? "…" : "✓"}</div>
            <h1 className="p-titulo">{pendienteDePago ? "Pedido creado" : "¡Pedido recibido!"}</h1>
            <p className="p-sub">
              {pendienteDePago
                ? `Tu pedido ${numeroPedido(pedido.id)} está esperando el pago con tarjeta.`
                : `Tu pedido ${numeroPedido(pedido.id)} ha sido enviado correctamente y estará contigo pronto.`}
            </p>

            <dl className="p-datos p-datos--rejilla">
              <div><dt>NÚMERO DE PEDIDO</dt><dd>{numeroPedido(pedido.id)}</dd></div>
              <div><dt>TOTAL</dt><dd>{quetzales(pedido.total)}</dd></div>
              <div><dt>MÉTODO DE PAGO</dt><dd>{pedido.metodo_pago === "TARJETA" ? (pedido.pagado ? "Tarjeta · pagado" : "Tarjeta · pendiente") : "Efectivo contra entrega"}</dd></div>
              <div><dt>ENTREGA</dt><dd>{pedido.tipo_entrega === "RECOGER" ? "Recoger en sucursal" : "A domicilio"}</dd></div>
            </dl>

            <h2>Productos ordenados</h2>
            <ul className="p-resumen__items">
              {pedido.detalles.map((d) => (
                <li key={d.id}><span>{d.cantidad}× {nombreDe(d.producto_id)}</span><span>{quetzales(d.precio_unitario * d.cantidad)}</span></li>
              ))}
            </ul>
            {pedido.observaciones && <p className="p-sub">Notas: {pedido.observaciones}</p>}

            {pendienteDePago && <PagoPendiente pedidoId={pedido.id} alCambiar={() => setVersion((n) => n + 1)} />}

            <div className="p-acciones p-acciones--centro">
              <Link href={`/pedido/${pedido.id}/seguimiento`} className="p-btn">VER ESTADO DEL PEDIDO</Link>
              <Link href="/menu" className="p-btn p-btn--fantasma">VOLVER AL MENÚ</Link>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
