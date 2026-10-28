import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "wouter";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";
import { PortalLayout } from "../components/PortalLayout";
import { Cargando, ErrorMsg } from "../components/Estados";
import { useDatos } from "../../hooks/useDatos";
import { portalService } from "../services/portal.service";
import { useNombresProducto } from "../hooks/useNombresProducto";
import { formatearNumero, formatearVence, validarTarjeta } from "../utils/tarjeta";
import { numeroPedido, quetzales } from "../utils/formato";

const CLAVE_STRIPE: string = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

// Pasarela de pago de COPAC. Con VITE_STRIPE_PUBLISHABLE_KEY la tarjeta se escribe en los campos seguros de
// Stripe (el numero nunca pasa por nuestro servidor) y el backend recibe un payment_method. Sin la clave se usa el
// modo local de pruebas. En ambos casos el pago solo se da por bueno cuando Stripe confirma "succeeded".
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

  // Campo seguro de Stripe (solo con clave publica).
  const contenedor = useRef<HTMLDivElement>(null);
  const stripe = useRef<Stripe | null>(null);
  const tarjeta = useRef<StripeCardElement | null>(null);
  const [tarjetaLista, setTarjetaLista] = useState(false);
  const usaElements = CLAVE_STRIPE !== "";

  const yaPagado = pedido?.pagado === true;
  const noCobrable = pedido && (pedido.metodo_pago !== "TARJETA" || pedido.estado === "ANULADO");
  const mostrarForm = !!pedido && !yaPagado && !noCobrable;

  useEffect(() => {
    if (!usaElements || !mostrarForm || !contenedor.current) return;
    let vivo = true;
    let el: StripeCardElement | null = null;
    loadStripe(CLAVE_STRIPE)
      .then((s) => {
        if (!vivo || !s || !contenedor.current) return;
        stripe.current = s;
        el = s.elements().create("card", { hidePostalCode: true, style: { base: { fontSize: "16px", color: "#211d1b" } } });
        el.mount(contenedor.current);
        el.on("change", (e) => setFallo(e.error?.message ?? null));
        tarjeta.current = el;
        setTarjetaLista(true);
      })
      .catch(() => vivo && setFallo("No se pudo cargar el formulario seguro de pago. Recarga la página."));
    return () => {
      vivo = false;
      el?.destroy();
      tarjeta.current = null;
    };
  }, [usaElements, mostrarForm]);

  const pagar = async (e: FormEvent) => {
    e.preventDefault();
    if (!pedido || procesando) return;
    if (titular.trim().length < 3) {
      setFallo("Ingresa el nombre que aparece en la tarjeta.");
      return;
    }
    setProcesando(true);
    setFallo(null);
    try {
      let medio: Parameters<typeof portalService.pagarConTarjeta>[2];
      if (usaElements) {
        if (!stripe.current || !tarjeta.current) throw new Error("El formulario de pago aún no está listo.");
        const r = await stripe.current.createPaymentMethod({ type: "card", card: tarjeta.current, billing_details: { name: titular.trim() } });
        if (r.error || !r.paymentMethod) throw new Error(r.error?.message ?? "Revisa los datos de la tarjeta.");
        medio = { payment_method: r.paymentMethod.id };
      } else {
        const v = validarTarjeta({ numero, titular, vence, cvc });
        if ("error" in v) throw new Error(v.error);
        medio = v.datos;
      }
      const items = pedido.detalles.map((d) => ({ nombre: nombreDe(d.producto_id), cantidad: d.cantidad, monto: d.precio_unitario }));
      await portalService.pagarConTarjeta(pedido.id, items, medio);
      navegar(`/pedido/${pedido.id}/confirmacion`);
    } catch (err) {
      setFallo(err instanceof Error ? err.message : "No se pudo procesar el pago.");
      setProcesando(false);
    }
  };

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

        {pedido && mostrarForm && (
          <form className="p-panel p-pasarela" onSubmit={pagar} noValidate>
            <div className="p-pasarela__monto">
              <span>Pedido {numeroPedido(pedido.id)}</span>
              <strong>{quetzales(pedido.total)}</strong>
            </div>

            <div className="p-campos">
              {usaElements ? (
                <label className="p-campos__ancho">Datos de la tarjeta
                  <div ref={contenedor} className="p-input p-pasarela__stripe" />
                </label>
              ) : (
                <>
                  <label className="p-campos__ancho">Número de tarjeta
                    <input className="p-input" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={numero} onChange={(e) => setNumero(formatearNumero(e.target.value))} />
                  </label>
                  <label>Vencimiento
                    <input className="p-input" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={vence} onChange={(e) => setVence(formatearVence(e.target.value))} />
                  </label>
                  <label>CVC
                    <input className="p-input" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="•••" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))} />
                  </label>
                </>
              )}
              <label className="p-campos__ancho">Nombre en la tarjeta
                <input className="p-input" autoComplete="cc-name" maxLength={60} value={titular} onChange={(e) => setTitular(e.target.value)} />
              </label>
            </div>

            <p className="p-sub p-pasarela__nota">Modo de pruebas: usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.</p>
            {fallo && <p className="p-estado p-estado--error" role="alert">{fallo}</p>}

            <div className="p-acciones">
              <button type="submit" className="p-btn p-btn--acento p-btn--bloque" disabled={procesando || (usaElements && !tarjetaLista)}>
                {procesando ? "VERIFICANDO PAGO…" : `PAGAR ${quetzales(pedido.total)}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </PortalLayout>
  );
}
