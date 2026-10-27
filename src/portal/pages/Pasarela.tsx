import { useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { Cargando, ErrorMsg } from "../components/Estados";
import { useDatos } from "../../hooks/useDatos";
import { portalService } from "../services/portal.service";
import { useNombresProducto } from "../hooks/useNombresProducto";
import { formatearNumero, formatearVence, validarTarjeta } from "../utils/tarjeta";
import { numeroPedido, quetzales } from "../utils/formato";

// Pasarela de pago de COPAC: el cliente escribe la tarjeta aquí y el backend cobra con la API de Stripe.
// No se redirige a ninguna página de Stripe. El monto lo fija el servidor a partir del pedido.
export default function Pasarela() {
  const { id } = useParams<{ id: string }>();
  const [, navegar] = useLocation();
  const { datos: pedido, cargando, error } = useDatos(() => portalService.getPedido(Number(id)), id);
  const nombreDe = useNombresProducto();

  const [numero, setNumero] = useState("");
  const [titular, setTitular] = useState("");
  const [vence, setVence] = useState("");
  const [cvc, setCvc] = useState("");
  const [fallo, setFallo] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const pagar = async (e: FormEvent) => {
    e.preventDefault();
    if (!pedido) return;
    const r = validarTarjeta({ numero, titular, vence, cvc });
    if ("error" in r) {
      setFallo(r.error);
      return;
    }
    setProcesando(true);
    setFallo(null);
    try {
      const items = pedido.detalles.map((d) => ({ nombre: nombreDe(d.producto_id), cantidad: d.cantidad, monto: d.precio_unitario }));
      await portalService.pagarConTarjeta(pedido.id, items, r.datos);
      navegar(`/pedido/${pedido.id}/confirmacion`);
    } catch (err) {
      setFallo(err instanceof Error ? err.message : "No se pudo procesar el pago.");
      setProcesando(false);
    }
  };

  const yaPagado = pedido?.pagado === true;
  const noCobrable = pedido && (pedido.metodo_pago !== "TARJETA" || pedido.estado === "ANULADO");

  return (
    <PortalLayout>
      <div className="p-contenedor p-contenedor--angosto">
        <h1 className="p-titulo">Pago con tarjeta</h1>
        {cargando && <Cargando />}
        {error && <ErrorMsg mensaje={error} />}

        {pedido && (yaPagado || noCobrable) && (
          <div className="p-panel">
            <p className="p-sub">{yaPagado ? "Este pedido ya está pagado." : "Este pedido no se paga con tarjeta o fue anulado."}</p>
            <div className="p-acciones">
              <Link href={`/pedido/${pedido.id}/confirmacion`} className="p-btn">VER MI PEDIDO</Link>
            </div>
          </div>
        )}

        {pedido && !yaPagado && !noCobrable && (
          <form className="p-panel p-pasarela" onSubmit={pagar} noValidate>
            <div className="p-pasarela__monto">
              <span>Pedido {numeroPedido(pedido.id)}</span>
              <strong>{quetzales(pedido.total)}</strong>
            </div>

            <div className="p-campos">
              <label className="p-campos__ancho">Número de tarjeta
                <input className="p-input" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={numero} onChange={(e) => setNumero(formatearNumero(e.target.value))} />
              </label>
              <label className="p-campos__ancho">Nombre en la tarjeta
                <input className="p-input" autoComplete="cc-name" maxLength={60} value={titular} onChange={(e) => setTitular(e.target.value)} />
              </label>
              <label>Vencimiento
                <input className="p-input" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={vence} onChange={(e) => setVence(formatearVence(e.target.value))} />
              </label>
              <label>CVC
                <input className="p-input" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="•••" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))} />
              </label>
            </div>

            <p className="p-sub p-pasarela__nota">Modo de pruebas: usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.</p>
            {fallo && <p className="p-estado p-estado--error" role="alert">{fallo}</p>}

            <div className="p-acciones">
              <Link href={`/pedido/${pedido.id}/confirmacion`} className="p-btn p-btn--fantasma">Pagar después</Link>
              <button type="submit" className="p-btn p-btn--acento" disabled={procesando}>{procesando ? "PROCESANDO…" : `PAGAR ${quetzales(pedido.total)}`}</button>
            </div>
          </form>
        )}
      </div>
    </PortalLayout>
  );
}
