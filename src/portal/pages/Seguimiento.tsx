import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { LineaTiempo } from "../components/LineaTiempo";
import { Cargando, ErrorMsg } from "../components/Estados";
import { useDatos } from "../../hooks/useDatos";
import { useNombresProducto } from "../hooks/useNombresProducto";
import { COSTO_ENVIO, portalService } from "../services/portal.service";
import { PASOS_PEDIDO, indicePaso, numeroPedido, quetzales } from "../utils/formato";

export default function Seguimiento() {
  const { id } = useParams<{ id: string }>();
  const [tick, setTick] = useState(0);
  const { datos: pedido, cargando, error } = useDatos(() => portalService.getPedido(Number(id)), `${id}-${tick}`);
  const nombreDe = useNombresProducto();

  // Refresca el estado cada 20 s mientras el pedido siga en curso.
  const enCurso = !pedido || (pedido.estado !== "ENTREGADO" && pedido.estado !== "ANULADO");
  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(() => setTick((n) => n + 1), 20000);
    return () => clearInterval(t);
  }, [enCurso]);

  const paso = pedido ? PASOS_PEDIDO[Math.max(0, indicePaso(pedido.estado))] : null;

  return (
    <PortalLayout>
      <div className="p-contenedor">
        {cargando && !pedido && <Cargando />}
        {error && <ErrorMsg mensaje={error} />}
        {pedido && paso && (
          <>
            <header className="p-pagina-cab">
              <span className="p-sobretitulo">SEGUIMIENTO EN VIVO</span>
              <h1 className="p-titulo">Pedido {numeroPedido(pedido.id)}</h1>
            </header>
            <div className="p-dos-col">
              <section className="p-panel">
                <h2>Estado del pedido</h2>
                <LineaTiempo estado={pedido.estado} eventos={pedido.eventos} />
                {pedido.estado !== "ANULADO" && (
                  <div className="p-aviso">
                    <strong>{paso.etiqueta}</strong>
                    <p>{paso.mensaje}</p>
                  </div>
                )}
              </section>
              <aside className="p-panel">
                <h2>Información de entrega</h2>
                <dl className="p-datos">
                  {pedido.direccion && <div><dt>DIRECCIÓN</dt><dd>{pedido.direccion}</dd></div>}
                  {pedido.referencia && <div><dt>REFERENCIA</dt><dd>{pedido.referencia}</dd></div>}
                </dl>
                <h2>Productos</h2>
                <ul className="p-resumen__items">
                  {pedido.detalles.map((d) => (
                    <li key={d.id}><span>{d.cantidad}× {nombreDe(d.producto_id)}</span><span>{quetzales(d.precio_unitario * d.cantidad)}</span></li>
                  ))}
                  <li className="p-resumen__total"><span>Total (con envío)</span><span>{quetzales(pedido.total + COSTO_ENVIO)}</span></li>
                </ul>
                <Link href={`/mis-pedidos/${pedido.id}`} className="p-enlace">Ver detalle del pedido →</Link>
              </aside>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
