import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { Vacio } from "../components/Estados";
import { carrito, useCarrito } from "../store/carrito";
import { sesionCliente, useSesionCliente } from "../store/sesion";
import { COSTO_ENVIO, portalService } from "../services/portal.service";
import { quetzales } from "../utils/formato";

const PASOS = ["Datos", "Dirección", "Pago", "Resumen"];
const OCHO_DIGITOS = /^\d{8}$/;

export default function Checkout() {
  const [, navegar] = useLocation();
  const { items, subtotal } = useCarrito();
  const cliente = useSesionCliente();

  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [apellido, setApellido] = useState(cliente?.apellido ?? "");
  const [telefono, setTelefono] = useState(cliente?.telefono ?? "");
  const [telefonoRef, setTelefonoRef] = useState(cliente?.telefono_ref ?? "");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [metodoPago] = useState("Efectivo contra entrega");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (items.length === 0 && !enviando) {
    return (
      <PortalLayout>
        <div className="p-contenedor">
          <Vacio titulo="No hay nada que pagar" texto="Tu carrito está vacío.">
            <Link href="/menu" className="p-btn">VER MENÚ</Link>
          </Vacio>
        </div>
      </PortalLayout>
    );
  }

  const validarDatos = () => {
    if (!nombre.trim() || !apellido.trim()) return "Ingresa tu nombre y apellido.";
    if (!OCHO_DIGITOS.test(telefono)) return "El teléfono debe tener exactamente 8 dígitos.";
    if (!OCHO_DIGITOS.test(telefonoRef)) return "El teléfono de referencia debe tener exactamente 8 dígitos.";
    if (telefono === telefonoRef) return "El teléfono de referencia debe ser distinto al principal.";
    return null;
  };

  const siguiente = (e: FormEvent) => {
    e.preventDefault();
    const problema = paso === 0 ? validarDatos() : paso === 1 && !direccion.trim() ? "Ingresa tu dirección de entrega." : null;
    setError(problema);
    if (!problema) setPaso((p) => p + 1);
  };

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      // Sin sesion (checkout como invitado): se registra al cliente antes de crear el pedido.
      const actual =
        cliente ?? (await portalService.registrar({ nombre: nombre.trim(), apellido: apellido.trim(), telefono, telefono_ref: telefonoRef }));
      if (!cliente) sesionCliente.iniciar(actual);
      const pedido = await portalService.crearPedido(actual.id, items, { direccion: direccion.trim(), referencia: referencia.trim(), metodoPago });
      carrito.vaciar();
      navegar(`/pedido/${pedido.id}/confirmacion`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el pedido.");
      setEnviando(false);
    }
  };

  return (
    <PortalLayout>
      <div className="p-contenedor">
        <h1 className="p-titulo">Checkout</h1>
        <ol className="p-stepper" aria-label="Progreso del checkout">
          {PASOS.map((nombrePaso, n) => (
            <li key={nombrePaso} className={n === paso ? "p-step p-step--activo" : n < paso ? "p-step p-step--hecho" : "p-step"} aria-current={n === paso ? "step" : undefined}>
              <span>{n < paso ? "✓" : n + 1}</span> {nombrePaso}
            </li>
          ))}
        </ol>

        <div className="p-dos-col">
          <form className="p-panel" onSubmit={siguiente} noValidate>
            {paso === 0 && (
              <>
                <h2>Datos del cliente</h2>
                <div className="p-campos">
                  <label>Nombre<input className="p-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" /></label>
                  <label>Apellido<input className="p-input" value={apellido} onChange={(e) => setApellido(e.target.value)} autoComplete="family-name" /></label>
                  <label>Teléfono<input className="p-input" inputMode="numeric" maxLength={8} value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} autoComplete="tel" /></label>
                  <label>Teléfono de referencia<input className="p-input" inputMode="numeric" maxLength={8} value={telefonoRef} onChange={(e) => setTelefonoRef(e.target.value.replace(/\D/g, ""))} /></label>
                </div>
              </>
            )}
            {paso === 1 && (
              <>
                <h2>Dirección de entrega</h2>
                <div className="p-campos">
                  <label className="p-campos__ancho">Dirección<input className="p-input" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="6a Avenida 14-08, Zona 10" autoComplete="street-address" /></label>
                  <label className="p-campos__ancho">Referencia<input className="p-input" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Edificio azul, portón negro" /></label>
                </div>
              </>
            )}
            {paso === 2 && (
              <>
                <h2>Método de pago</h2>
                <label className="p-opcion p-opcion--on"><input type="radio" checked readOnly /> 💵 Efectivo contra entrega</label>
                <label className="p-opcion p-opcion--off"><input type="radio" disabled /> 💳 Tarjeta (próximamente)</label>
              </>
            )}
            {paso === 3 && (
              <>
                <h2>Confirma tu pedido</h2>
                <dl className="p-datos">
                  <div><dt>Cliente</dt><dd>{nombre} {apellido} · {telefono}</dd></div>
                  <div><dt>Dirección</dt><dd>{direccion}{referencia && ` (${referencia})`}</dd></div>
                  <div><dt>Pago</dt><dd>{metodoPago}</dd></div>
                </dl>
              </>
            )}

            {error && <p className="p-estado p-estado--error" role="alert">{error}</p>}

            <div className="p-acciones">
              <button type="button" className="p-btn p-btn--fantasma" disabled={paso === 0 || enviando} onClick={() => setPaso((p) => p - 1)}>← Atrás</button>
              {paso < 3 ? (
                <button type="submit" className="p-btn">Continuar →</button>
              ) : (
                <button type="button" className="p-btn p-btn--acento" disabled={enviando} onClick={confirmar}>{enviando ? "ENVIANDO…" : "CONFIRMAR PEDIDO"}</button>
              )}
            </div>
          </form>

          <aside className="p-resumen">
            <h2>Tu pedido</h2>
            <ul className="p-resumen__items">
              {items.map((i) => (
                <li key={`${i.productoId}-${i.nota}`}><span>{i.cantidad}× {i.nombre}</span><span>{quetzales(i.precio * i.cantidad)}</span></li>
              ))}
            </ul>
            <dl>
              <div><dt>Subtotal</dt><dd>{quetzales(subtotal)}</dd></div>
              <div><dt>Envío</dt><dd>{quetzales(COSTO_ENVIO)}</dd></div>
              <div className="p-resumen__total"><dt>Total</dt><dd>{quetzales(subtotal + COSTO_ENVIO)}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </PortalLayout>
  );
}
