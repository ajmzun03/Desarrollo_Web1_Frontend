import { Printer, X } from "lucide-react";
import type { DetallePedido, FacturaVenta, Pedido } from "../types";
import { codigoFactura } from "../utils/factura";
import "../styles/factura.css";

interface Props {
  factura: FacturaVenta;
  pedido: Pedido;
  detalles: DetallePedido[];
  cliente: string;
  nombreProducto: (id: number) => string;
  onCerrar: () => void;
}

const q = (n: number) => `Q ${n.toFixed(2)}`;

// Factura lista para imprimir o guardar como PDF (el navegador ofrece "Guardar como PDF" en el dialogo de impresion).
export const FacturaImprimible = ({ factura, pedido, detalles, cliente, nombreProducto, onCerrar }: Props) => (
  <div className="factura-overlay" role="dialog" aria-modal="true" aria-label={`Factura ${codigoFactura(factura)}`}>
    <div className="factura-modal">
      <div className="factura-acciones">
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => window.print()}>
          <Printer size={14} /> Imprimir / PDF
        </button>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onCerrar}>
          <X size={14} /> Cerrar
        </button>
      </div>

      <article className="factura-hoja">
        <header className="factura-cab">
          <div>
            <h1>COPAC</h1>
            <p>Comida rápida · McChapín</p>
          </div>
          <div className="factura-num">
            <span>FACTURA</span>
            <strong>{codigoFactura(factura)}</strong>
            <small>{new Date(factura.fecha_emision).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" })}</small>
          </div>
        </header>

        <dl className="factura-datos">
          <div><dt>Cliente</dt><dd>{cliente}</dd></div>
          <div><dt>NIT</dt><dd>CF (Consumidor final)</dd></div>
          <div><dt>Pedido</dt><dd>#{pedido.id}</dd></div>
          <div><dt>Pago</dt><dd>{pedido.metodo_pago === "TARJETA" ? "Tarjeta" : "Efectivo"}{pedido.pagado ? " · pagado" : ""}</dd></div>
        </dl>

        <table className="factura-tabla">
          <thead>
            <tr><th>Cant.</th><th>Descripción</th><th>P. unitario</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            {detalles.map((d) => (
              <tr key={d.id}>
                <td>{d.cantidad}</td>
                <td>{nombreProducto(d.producto_id)}</td>
                <td>{q(Number(d.precio_unitario))}</td>
                <td>{q(Number(d.precio_unitario) * d.cantidad)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}>TOTAL</td><td>{q(Number(factura.total))}</td></tr>
          </tfoot>
        </table>

        <p className="factura-pie">¡Gracias por tu compra! Documento generado por el sistema COPAC.</p>
      </article>
    </div>
  </div>
);
