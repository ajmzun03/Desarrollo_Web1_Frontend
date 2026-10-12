import { Link, useParams } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { Cargando, ErrorMsg } from "../components/Estados";
import { useDatos } from "../../hooks/useDatos";
import { COSTO_ENVIO, portalService } from "../services/portal.service";
import { useNombresProducto } from "../hooks/useNombresProducto";
import { numeroPedido, quetzales } from "../utils/formato";

export default function Confirmacion() {
  const { id } = useParams<{ id: string }>();
  const { datos: pedido, cargando, error } = useDatos(() => portalService.getPedido(Number(id)), id);
  const nombreDe = useNombresProducto();

  return (
    <PortalLayout>
      <div className="p-contenedor p-contenedor--angosto">
        {cargando && <Cargando />}
        {error && <ErrorMsg mensaje={error} />}
        {pedido && (
          <div className="p-panel p-confirmacion">
            <div className="p-check" aria-hidden="true">✓</div>
            <h1 className="p-titulo">¡Pedido recibido!</h1>
            <p className="p-sub">Tu pedido {numeroPedido(pedido.id)} ha sido enviado correctamente y estará contigo pronto.</p>

            <dl className="p-datos p-datos--rejilla">
              <div><dt>NÚMERO DE PEDIDO</dt><dd>{numeroPedido(pedido.id)}</dd></div>
              <div><dt>TOTAL A PAGAR</dt><dd>{quetzales(pedido.total + COSTO_ENVIO)}</dd></div>
              {pedido.metodoPago && <div><dt>MÉTODO DE PAGO</dt><dd>{pedido.metodoPago}</dd></div>}
              <div><dt>TIEMPO ESTIMADO</dt><dd>25–35 minutos</dd></div>
              {pedido.direccion && <div className="p-datos__ancho"><dt>DIRECCIÓN DE ENTREGA</dt><dd>{pedido.direccion}</dd></div>}
            </dl>

            <h2>Productos ordenados</h2>
            <ul className="p-resumen__items">
              {pedido.detalles.map((d) => (
                <li key={d.id}><span>{d.cantidad}× {nombreDe(d.producto_id)}</span><span>{quetzales(d.precio_unitario * d.cantidad)}</span></li>
              ))}
            </ul>
            {pedido.observaciones && <p className="p-sub">Notas: {pedido.observaciones}</p>}

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
