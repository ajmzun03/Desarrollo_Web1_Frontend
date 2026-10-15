import { useState } from "react";
import { Link, useParams } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { LineaTiempo } from "../components/LineaTiempo";
import { Cargando, ErrorMsg } from "../components/Estados";
import { useDatos } from "../../hooks/useDatos";
import { useNombresProducto } from "../hooks/useNombresProducto";
import { useRepetirPedido } from "../hooks/useRepetirPedido";
import { COSTO_ENVIO, portalService } from "../services/portal.service";
import { ESTADO_CLASE, ESTADO_LABEL } from "../../copac/utils/pedidoEstados";
import { fechaCorta, hora, numeroPedido, quetzales } from "../utils/formato";

export default function PedidoDetalle() {
  const { id } = useParams<{ id: string }>();
  const { datos: pedido, cargando, error } = useDatos(() => portalService.getPedido(Number(id)), id);
  const nombreDe = useNombresProducto();
  const repetir = useRepetirPedido();
  const [fallo, setFallo] = useState<string | null>(null);

  return (
    <PortalLayout>
      <div className="p-contenedor">
        {cargando && <Cargando />}
        {error && <ErrorMsg mensaje={error} />}
        {pedido && (
          <>
            <nav className="p-migas" aria-label="Ruta">
              <Link href="/mis-pedidos">Mis pedidos</Link> › <span>{numeroPedido(pedido.id)}</span>
            </nav>
            <header className="p-pagina-cab">
              <h1 className="p-titulo">Pedido {numeroPedido(pedido.id)}</h1>
              <p className="p-sub">{fechaCorta(pedido.fecha_pedido)} · {hora(pedido.fecha_pedido)} <span className={`ui-badge ${ESTADO_CLASE[pedido.estado]}`}>{ESTADO_LABEL[pedido.estado]}</span></p>
            </header>
            <div className="p-dos-col">
              <section className="p-panel">
                <h2>Productos ordenados</h2>
                <ul className="p-resumen__items">
                  {pedido.detalles.map((d) => (
                    <li key={d.id}>
                      <span>{nombreDe(d.producto_id)}<small>Cantidad: {d.cantidad} · {quetzales(d.precio_unitario)} c/u</small></span>
                      <span>{quetzales(d.precio_unitario * d.cantidad)}</span>
                    </li>
                  ))}
                  <li><span>Subtotal</span><span>{quetzales(pedido.total)}</span></li>
                  <li><span>Envío</span><span>{quetzales(COSTO_ENVIO)}</span></li>
                  <li className="p-resumen__total"><span>Total</span><span>{quetzales(pedido.total + COSTO_ENVIO)}</span></li>
                </ul>
                {pedido.observaciones && <p className="p-sub">Notas: {pedido.observaciones}</p>}
              </section>
              <aside className="p-panel">
                <h2>Historial de estados</h2>
                <LineaTiempo estado={pedido.estado} eventos={pedido.eventos} />
                {(pedido.direccion || pedido.metodoPago) && (
                  <dl className="p-datos">
                    {pedido.direccion && <div><dt>DIRECCIÓN</dt><dd>{pedido.direccion}</dd></div>}
                    {pedido.metodoPago && <div><dt>PAGO</dt><dd>{pedido.metodoPago}</dd></div>}
                  </dl>
                )}
                {fallo && <ErrorMsg mensaje={fallo} />}
                <div className="p-acciones">
                  <Link href="/mis-pedidos" className="p-btn p-btn--fantasma">← Volver</Link>
                  {pedido.estado !== "ANULADO" && (
                    <button type="button" className="p-btn" onClick={() => repetir(pedido.id).catch((e: unknown) => setFallo(e instanceof Error ? e.message : "No se pudo repetir el pedido."))}>
                      🔄 Repetir pedido
                    </button>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
