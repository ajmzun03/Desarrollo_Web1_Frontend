import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { Cargando, Vacio } from "../components/Estados";
import { carrito, precioUnitario, useCarrito } from "../store/carrito";
import { useSesionCliente } from "../store/sesion";
import { portalService, type DatosEntrega } from "../services/portal.service";
import { useDatos } from "../../hooks/useDatos";
import { municipiosService } from "../../copac/services/municipios.service";
import { sucursalesService } from "../../copac/services/sucursales.service";
import type { MetodoPago, TipoEntrega } from "../../copac/types";
import { quetzales } from "../utils/formato";

const PASOS = ["Datos", "Entrega", "Pago", "Resumen"];
const NUEVA = 0; // valor del selector para "usar una direccion nueva"

export default function Checkout() {
  const [, navegar] = useLocation();
  const { items, subtotal } = useCarrito();
  const sesion = useSesionCliente();

  const [paso, setPaso] = useState(0);
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("DOMICILIO");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [direccionId, setDireccionId] = useState(NUEVA);
  const [municipioId, setMunicipioId] = useState(0);
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [sucursalId, setSucursalId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Datos de apoyo: direcciones guardadas del cliente, municipios y sucursales.
  const { datos: apoyo, cargando } = useDatos(async () => {
    const [direcciones, municipios, sucursales] = await Promise.all([
      sesion ? portalService.getDirecciones().catch(() => []) : Promise.resolve([]),
      municipiosService.getAll(),
      sucursalesService.getAll(),
    ]);
    return { direcciones, municipios, sucursales };
  }, sesion?.cliente.id ?? "anonimo");

  const volverA = encodeURIComponent("/checkout");

  if (!sesion) {
    return (
      <PortalLayout>
        <div className="p-contenedor p-contenedor--angosto">
          <Vacio titulo="Inicia sesión para continuar" texto="Necesitamos tu cuenta para registrar tu pedido y que puedas darle seguimiento.">
            <Link href={`/login?volver=${volverA}`} className="p-btn">INICIAR SESIÓN</Link>
            <Link href={`/registro?volver=${volverA}`} className="p-btn p-btn--fantasma">CREAR CUENTA</Link>
          </Vacio>
        </div>
      </PortalLayout>
    );
  }

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

  const { cliente } = sesion;
  const guardada = apoyo?.direcciones.find((d) => d.id === direccionId);
  const sucursal = apoyo?.sucursales.find((s) => s.id === sucursalId);
  const municipio = apoyo?.municipios.find((m) => m.id === municipioId);

  const validarEntrega = () => {
    if (tipoEntrega === "RECOGER") return sucursalId ? null : "Elige la sucursal donde recogerás tu pedido.";
    if (direccionId !== NUEVA) return null;
    if (!municipioId) return "Elige tu municipio.";
    if (direccion.trim().length < 3) return "Ingresa tu dirección (mínimo 3 caracteres).";
    if (!referencia.trim()) return "Agrega una referencia para encontrar tu dirección.";
    return null;
  };

  const siguiente = (e: FormEvent) => {
    e.preventDefault();
    const problema = paso === 1 ? validarEntrega() : null;
    setError(problema);
    if (!problema) setPaso((p) => p + 1);
  };

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const entrega: DatosEntrega = { tipoEntrega, metodoPago };
      if (tipoEntrega === "RECOGER") {
        entrega.sucursalId = sucursalId;
      } else if (direccionId !== NUEVA) {
        entrega.direccionId = direccionId;
      } else {
        const nueva = await portalService.crearDireccion({ municipio_id: municipioId, direccion1: direccion.trim(), direccion2: referencia.trim() });
        entrega.direccionId = nueva.id;
      }
      const pedido = await portalService.crearPedido(cliente, items, entrega);
      const aPagar = items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, monto: precioUnitario(i) }));
      carrito.vaciar();
      if (metodoPago === "TARJETA") {
        // Redirige a Stripe; al volver, /pago/exito o /pago/cancelado reciben el pedido.
        window.location.assign(await portalService.iniciarPago(pedido.id, aPagar));
        return;
      }
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
            {cargando && <Cargando />}

            {paso === 0 && (
              <>
                <h2>Datos del cliente</h2>
                <dl className="p-datos">
                  <div><dt>NOMBRE</dt><dd>{cliente.nombre} {cliente.apellido}</dd></div>
                  {cliente.correo_electronico && <div><dt>CORREO</dt><dd>{cliente.correo_electronico}</dd></div>}
                  <div><dt>TELÉFONO</dt><dd>{cliente.telefono}</dd></div>
                </dl>
                <h2>¿Cómo quieres recibir tu pedido?</h2>
                <label className={tipoEntrega === "DOMICILIO" ? "p-opcion p-opcion--on" : "p-opcion"}>
                  <input type="radio" name="entrega" checked={tipoEntrega === "DOMICILIO"} onChange={() => setTipoEntrega("DOMICILIO")} /> 🛵 A domicilio
                </label>
                <label className={tipoEntrega === "RECOGER" ? "p-opcion p-opcion--on" : "p-opcion"}>
                  <input type="radio" name="entrega" checked={tipoEntrega === "RECOGER"} onChange={() => setTipoEntrega("RECOGER")} /> 🏪 Recoger en sucursal
                </label>
              </>
            )}

            {paso === 1 && tipoEntrega === "RECOGER" && (
              <>
                <h2>Sucursal para recoger</h2>
                <label className="p-campos__ancho">Sucursal
                  <select className="p-input" value={sucursalId} onChange={(e) => setSucursalId(Number(e.target.value))}>
                    <option value={0}>Elige una sucursal…</option>
                    {apoyo?.sucursales.map((s) => <option key={s.id} value={s.id}>{s.sucursal}{s.direccion ? ` — ${s.direccion}` : ""}</option>)}
                  </select>
                </label>
              </>
            )}

            {paso === 1 && tipoEntrega === "DOMICILIO" && (
              <>
                <h2>Dirección de entrega</h2>
                {(apoyo?.direcciones.length ?? 0) > 0 && (
                  <label className="p-campos__ancho">Direcciones guardadas
                    <select className="p-input" value={direccionId} onChange={(e) => setDireccionId(Number(e.target.value))}>
                      {apoyo?.direcciones.map((d) => <option key={d.id} value={d.id}>{d.direccion1} ({d.direccion2})</option>)}
                      <option value={NUEVA}>Usar una dirección nueva…</option>
                    </select>
                  </label>
                )}
                {direccionId === NUEVA && (
                  <div className="p-campos">
                    <label className="p-campos__ancho">Municipio
                      <select className="p-input" value={municipioId} onChange={(e) => setMunicipioId(Number(e.target.value))}>
                        <option value={0}>Elige tu municipio…</option>
                        {apoyo?.municipios.map((m) => <option key={m.id} value={m.id}>{m.municipio}</option>)}
                      </select>
                    </label>
                    <label className="p-campos__ancho">Dirección<input className="p-input" maxLength={155} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="6a Avenida 14-08, Zona 10" autoComplete="street-address" /></label>
                    <label className="p-campos__ancho">Referencia<input className="p-input" maxLength={100} value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Edificio azul, portón negro" /></label>
                  </div>
                )}
              </>
            )}

            {paso === 2 && (
              <>
                <h2>Método de pago</h2>
                <label className={metodoPago === "EFECTIVO" ? "p-opcion p-opcion--on" : "p-opcion"}>
                  <input type="radio" name="pago" checked={metodoPago === "EFECTIVO"} onChange={() => setMetodoPago("EFECTIVO")} /> 💵 Efectivo contra entrega
                </label>
                <label className={metodoPago === "TARJETA" ? "p-opcion p-opcion--on" : "p-opcion"}>
                  <input type="radio" name="pago" checked={metodoPago === "TARJETA"} onChange={() => setMetodoPago("TARJETA")} /> 💳 Tarjeta (pago seguro con Stripe)
                </label>
              </>
            )}

            {paso === 3 && (
              <>
                <h2>Confirma tu pedido</h2>
                <dl className="p-datos">
                  <div><dt>CLIENTE</dt><dd>{cliente.nombre} {cliente.apellido} · {cliente.telefono}</dd></div>
                  <div>
                    <dt>{tipoEntrega === "RECOGER" ? "RECOGER EN" : "ENTREGA"}</dt>
                    <dd>
                      {tipoEntrega === "RECOGER"
                        ? sucursal?.sucursal
                        : guardada
                          ? `${guardada.direccion1} (${guardada.direccion2})`
                          : `${direccion}, ${municipio?.municipio ?? ""} (${referencia})`}
                    </dd>
                  </div>
                  <div><dt>PAGO</dt><dd>{metodoPago === "TARJETA" ? "Tarjeta (Stripe)" : "Efectivo contra entrega"}</dd></div>
                </dl>
                {metodoPago === "TARJETA" && <p className="p-sub">Al confirmar te llevaremos a la página segura de Stripe para pagar.</p>}
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
                <li key={i.clave}>
                  <span>{i.cantidad}× {i.nombre}{i.extras.length > 0 && <small>+ {i.extras.map((e) => e.nombre).join(", ")}</small>}</span>
                  <span>{quetzales(precioUnitario(i) * i.cantidad)}</span>
                </li>
              ))}
            </ul>
            <dl>
              <div className="p-resumen__total"><dt>Total</dt><dd>{quetzales(subtotal)}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </PortalLayout>
  );
}
