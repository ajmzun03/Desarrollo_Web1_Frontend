import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Check,
  ChevronRight,
  CreditCard,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import "../styles/ui.css";
import "../styles/repartidor.css";
import { repartidorService } from "../services/repartidor.service";
import { pedidosService } from "../services/pedidos.service";
import { clientesService } from "../services/clientes.service";
import { direccionesService } from "../services/direcciones.service";
import { productosService } from "../services/productos.service";
import { liquidacionesService } from "../services/liquidaciones.service";
import { getCookie } from "../utils/cookies";
import type { Cliente, DetallePedido, Direccion, LiquidacionRepartidor, Pedido, Producto, Usuario } from "../types";

type MTab = "orders" | "detail" | "incident" | "resumen";

const INCIDENT_REASONS = [
  "Dirección incorrecta",
  "Cliente no responde",
  "Zona peligrosa",
  "Producto rechazado",
  "Otro",
];

const ESTADO_TAG: Record<string, { label: string; clase: string }> = {
  EN_RUTA: { label: "En ruta", clase: "repartidor__status--ruta" },
  ENTREGADO: { label: "Entregado", clase: "repartidor__status--entregado" },
};

const quetzales = (n: number) => `Q ${Number(n).toFixed(2)}`;
const cerrado = (p: Pedido) => p.estado === "ENTREGADO" || p.estado === "ANULADO";
// En efectivo y sin pago previo: el repartidor debe cobrarlo al entregar.
const aCobrar = (p: Pedido) => p.metodo_pago === "EFECTIVO" && !p.pagado;

const leerUsuario = (): Usuario | null => {
  try {
    return JSON.parse(getCookie("usuario") ?? "null");
  } catch {
    return null;
  }
};

export default function RepartidorMovil() {
  const [mTab, setMTab] = useState<MTab>("orders");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionRepartidor[]>([]);

  // Datos que solo se piden al abrir un pedido (el backend limita el acceso a los asignados).
  const [selId, setSelId] = useState<number | null>(null);
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [confirmModal, setConfirmModal] = useState(false);
  const [incMotivo, setIncMotivo] = useState("");
  const [incObs, setIncObs] = useState("");

  const usuario = useMemo(() => leerUsuario(), []);

  const cargar = useCallback(async () => {
    const [peds, dirs, prods, liqs] = await Promise.all([
      repartidorService.misPedidos(true),
      direccionesService.getAll().catch(() => [] as Direccion[]),
      productosService.getAll().catch(() => [] as Producto[]),
      liquidacionesService.getAll().catch(() => [] as LiquidacionRepartidor[]),
    ]);
    setPedidos(peds);
    setDirecciones(dirs);
    setProductos(prods);
    setLiquidaciones(liqs);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        await cargar();
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : "No se pudo cargar tu ruta.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cargar]);

  // Pedidos nuevos que asigna el despachador: se refresca solo mientras se ve la lista.
  useEffect(() => {
    if (mTab !== "orders") return;
    const id = window.setInterval(() => {
      cargar().catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(id);
  }, [mTab, cargar]);

  const pendientes = useMemo(
    () => pedidos.filter((p) => !cerrado(p)).sort((a, b) => a.id - b.id),
    [pedidos]
  );
  const entregados = useMemo(
    () => pedidos.filter((p) => p.estado === "ENTREGADO").sort((a, b) => b.id - a.id),
    [pedidos]
  );
  const sel = pedidos.find((p) => p.id === selId) ?? null;

  const direccionDe = (p: Pedido): string => {
    const d = direcciones.find((x) => x.id === p.direccion_id);
    if (!d) return "Sin dirección registrada";
    return d.direccion2 ? `${d.direccion1}, ${d.direccion2}` : d.direccion1;
  };
  const nombreProducto = (id: number) => productos.find((p) => p.id === id)?.producto ?? `Producto #${id}`;

  const resumen = useMemo(() => {
    const efectivo = entregados.filter((p) => p.metodo_pago === "EFECTIVO").reduce((s, p) => s + p.total, 0);
    const tarjeta = entregados.filter((p) => p.metodo_pago !== "EFECTIVO").reduce((s, p) => s + p.total, 0);
    const porCobrar = pendientes.filter(aCobrar).reduce((s, p) => s + p.total, 0);
    return { efectivo, tarjeta, porCobrar };
  }, [entregados, pendientes]);

  /* ---------- Acciones ---------- */
  const abrirDetalle = async (id: number) => {
    setSelId(id);
    setAviso(null);
    setDetalles([]);
    setCliente(null);
    setMTab("detail");
    setCargandoDetalle(true);
    const p = pedidos.find((x) => x.id === id);
    try {
      const [ped, cli] = await Promise.all([
        pedidosService.getById(id),
        p ? clientesService.getById(p.cliente_id).catch(() => null) : Promise.resolve(null),
      ]);
      setDetalles(ped.detalles);
      setCliente(cli);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo cargar el detalle del pedido.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const refrescar = async () => {
    setAviso(null);
    setTrabajando(true);
    try {
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setTrabajando(false);
    }
  };

  const marcarEntregado = async () => {
    if (!sel) return;
    const id = sel.id;
    setConfirmModal(false);
    setTrabajando(true);
    try {
      await pedidosService.entregado(id);
      await cargar();
      setMTab("orders");
      setAviso(`Pedido #${id} marcado como entregado.`);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo marcar el pedido como entregado.");
    } finally {
      setTrabajando(false);
    }
  };

  const enviarIncidente = async () => {
    if (!sel || !incMotivo) return;
    const id = sel.id;
    setTrabajando(true);
    try {
      await repartidorService.reportarIncidente(id, incMotivo, incObs.trim() || undefined);
      setIncMotivo("");
      setIncObs("");
      await cargar();
      setMTab("orders");
      setAviso(`Incidente del pedido #${id} registrado.`);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo registrar el incidente.");
    } finally {
      setTrabajando(false);
    }
  };

  if (cargando) {
    return (
      <div className="repartidor">
        <p className="repartidor__loading">Cargando tu ruta…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="repartidor">
        <div className="ui-error">{error}</div>
      </div>
    );
  }

  const direccionSel = sel ? direccionDe(sel) : "";

  return (
    <div className="repartidor">
      <div className="repartidor__phone">
        <header className="repartidor__header">
          <p className="repartidor__brand">COPAC Repartidor</p>
          <p className="repartidor__turno">{usuario?.usuario ?? "Repartidor"}</p>
        </header>

        <div className="repartidor__contenido">
          {/* ============ Mis pedidos ============ */}
          {mTab === "orders" && (
            <div className="repartidor__seccion">
              <h2 className="repartidor__titulo">Mis pedidos</h2>

              {aviso && <div className="repartidor__aviso">{aviso}</div>}

              {pendientes.length === 0 ? (
                <div className="repartidor__vacio">
                  <Package size={28} />
                  <p>No tienes pedidos por entregar.</p>
                </div>
              ) : (
                pendientes.map((p) => {
                  const tag = ESTADO_TAG[p.estado] ?? { label: p.estado, clase: "repartidor__status--muted" };
                  return (
                    <button key={p.id} className="repartidor__card" onClick={() => abrirDetalle(p.id)}>
                      <div className="repartidor__card-top">
                        <div>
                          <p className="repartidor__pedido">#{p.id}</p>
                          <p className="repartidor__cliente">{direccionDe(p)}</p>
                        </div>
                        <div className="repartidor__card-right">
                          <span className={`repartidor__status ${tag.clase}`}>{tag.label}</span>
                          <p className="repartidor__monto">{quetzales(p.total)}</p>
                        </div>
                      </div>
                      <div className="repartidor__card-foot">
                        <span className="repartidor__metodo">
                          {aCobrar(p) ? "Cobrar en efectivo" : p.metodo_pago === "TARJETA" ? "Pagado con tarjeta" : "Pagado"}
                        </span>
                        <ChevronRight size={15} aria-hidden="true" />
                      </div>
                    </button>
                  );
                })
              )}

              <button className="repartidor__btn repartidor__btn--dark" disabled={trabajando} onClick={refrescar}>
                <RefreshCw size={16} aria-hidden="true" /> Actualizar pedidos
              </button>
            </div>
          )}

          {/* ============ Detalle del pedido ============ */}
          {mTab === "detail" && sel && (
            <div className="repartidor__seccion">
              <button className="repartidor__volver" onClick={() => setMTab("orders")}>
                ← Mis pedidos
              </button>

              {aviso && <div className="repartidor__aviso">{aviso}</div>}

              <div className="repartidor__card repartidor__card--static">
                <p className="repartidor__pedido repartidor__pedido--grande">#{sel.id}</p>
                <h3 className="repartidor__cliente repartidor__cliente--grande">
                  {cliente ? `${cliente.nombre} ${cliente.apellido}` : cargandoDetalle ? "Cargando…" : `Cliente #${sel.cliente_id}`}
                </h3>
                <div className="repartidor__dato">
                  <MapPin size={14} aria-hidden="true" />
                  <span>{direccionSel}</span>
                </div>
                {cliente && (
                  <div className="repartidor__dato">
                    <Phone size={14} aria-hidden="true" />
                    <a href={`tel:${cliente.telefono}`}>{cliente.telefono}</a>
                  </div>
                )}
                {sel.direccion_id && (
                  <a
                    className="repartidor__mapa"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionSel)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation size={22} aria-hidden="true" />
                    <span>Ver en mapa</span>
                  </a>
                )}
              </div>

              <div className="repartidor__card repartidor__card--static">
                <p className="repartidor__label">Productos</p>
                {cargandoDetalle ? (
                  <p className="repartidor__vacio-texto">Cargando…</p>
                ) : detalles.length === 0 ? (
                  <p className="repartidor__vacio-texto">Sin detalle registrado.</p>
                ) : (
                  detalles.map((d) => (
                    <p key={d.id} className="repartidor__item">
                      {d.cantidad}× {nombreProducto(d.producto_id)}
                    </p>
                  ))
                )}
                {sel.observaciones && <p className="repartidor__vacio-texto">Notas: {sel.observaciones}</p>}
              </div>

              <div className="repartidor__card repartidor__card--static">
                <div className="repartidor__pago">
                  <div>
                    <p className="repartidor__label">{aCobrar(sel) ? "Monto a cobrar" : "Total del pedido"}</p>
                    <p className="repartidor__monto-grande">{quetzales(sel.total)}</p>
                  </div>
                  <span className="repartidor__metodo">
                    {sel.metodo_pago === "EFECTIVO" ? <Banknote size={16} aria-hidden="true" /> : <CreditCard size={16} aria-hidden="true" />}
                    {sel.metodo_pago === "EFECTIVO" ? (sel.pagado ? "Efectivo (pagado)" : "Efectivo") : "Tarjeta (pagado)"}
                  </span>
                </div>
              </div>

              {sel.estado !== "ENTREGADO" ? (
                <>
                  <button
                    className="repartidor__btn repartidor__btn--success"
                    disabled={trabajando}
                    onClick={() => setConfirmModal(true)}
                  >
                    <Check size={16} aria-hidden="true" /> Marcar como entregado
                  </button>
                  <button
                    className="repartidor__btn repartidor__btn--danger-outline"
                    onClick={() => {
                      setIncMotivo("");
                      setIncObs("");
                      setAviso(null);
                      setMTab("incident");
                    }}
                  >
                    <AlertTriangle size={16} aria-hidden="true" /> Reportar incidente
                  </button>
                </>
              ) : (
                <div className="repartidor__entrega-ok">
                  <Check size={16} aria-hidden="true" /> Entregado exitosamente
                </div>
              )}
            </div>
          )}

          {/* ============ Incidente ============ */}
          {mTab === "incident" && sel && (
            <div className="repartidor__seccion">
              <button className="repartidor__volver" onClick={() => setMTab("detail")}>
                ← Detalle del pedido
              </button>

              {aviso && <div className="repartidor__aviso">{aviso}</div>}

              <div className="repartidor__alerta">
                <div className="repartidor__alerta-head">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <p>Reportar incidente · #{sel.id}</p>
                </div>
                <p className="repartidor__alerta-sub">Queda anotado en las observaciones del pedido para el despachador.</p>
              </div>

              <div className="repartidor__card repartidor__card--static">
                <p className="repartidor__label">Motivo del incidente</p>
                {INCIDENT_REASONS.map((r) => (
                  <button
                    key={r}
                    className={`repartidor__motivo ${incMotivo === r ? "repartidor__motivo--sel" : ""}`}
                    onClick={() => setIncMotivo(r)}
                  >
                    {r}
                    {incMotivo === r && <Check size={14} aria-hidden="true" />}
                  </button>
                ))}
              </div>

              <div className="repartidor__card repartidor__card--static">
                <p className="repartidor__label">Observaciones</p>
                <textarea
                  className="repartidor__textarea"
                  rows={3}
                  maxLength={255}
                  placeholder="Describe el incidente…"
                  aria-label="Observaciones del incidente"
                  value={incObs}
                  onChange={(e) => setIncObs(e.target.value)}
                />
              </div>

              <button
                className="repartidor__btn repartidor__btn--danger"
                disabled={!incMotivo || trabajando}
                onClick={enviarIncidente}
              >
                <AlertTriangle size={16} aria-hidden="true" /> Reportar incidente
              </button>
            </div>
          )}

          {/* ============ Resumen y liquidaciones ============ */}
          {mTab === "resumen" && (
            <div className="repartidor__seccion">
              <h2 className="repartidor__titulo">Mi resumen</h2>

              <div className="repartidor__liq-hero">
                <p className="repartidor__liq-hero-label">Efectivo cobrado en entregas</p>
                <p className="repartidor__liq-hero-valor">{quetzales(resumen.efectivo)}</p>
                <p className="repartidor__liq-hero-sub">Por cobrar en pedidos pendientes: {quetzales(resumen.porCobrar)}</p>
              </div>

              <div className="repartidor__card repartidor__card--static">
                {[
                  { label: "Pedidos entregados", value: String(entregados.length) },
                  { label: "Pedidos por entregar", value: String(pendientes.length) },
                  { label: "Entregas pagadas con tarjeta", value: quetzales(resumen.tarjeta) },
                ].map((fila) => (
                  <div key={fila.label} className="repartidor__liq-fila">
                    <span>{fila.label}</span>
                    <span className="repartidor__liq-valor">{fila.value}</span>
                  </div>
                ))}
              </div>

              <div className="repartidor__card repartidor__card--static">
                <p className="repartidor__label">Liquidaciones registradas</p>
                {liquidaciones.length === 0 ? (
                  <p className="repartidor__vacio-texto">Aún no tienes liquidaciones. El despachador las registra al cierre de turno.</p>
                ) : (
                  liquidaciones.map((l) => (
                    <div key={l.id} className="repartidor__liq-fila">
                      <span>
                        {new Date(l.creado_en).toLocaleDateString("es-GT")} · efectivo {quetzales(l.monto_recaudado_efectivo ?? 0)}
                      </span>
                      <span className="repartidor__liq-valor">{quetzales(l.monto_entregado_repartidor ?? 0)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <nav className="repartidor__nav">
          <button
            className={`repartidor__nav-item ${mTab !== "resumen" ? "repartidor__nav-item--activo" : ""}`}
            onClick={() => {
              setAviso(null);
              setMTab("orders");
            }}
          >
            <Package size={18} aria-hidden="true" />
            <span>Pedidos</span>
          </button>
          <button
            className={`repartidor__nav-item ${mTab === "resumen" ? "repartidor__nav-item--activo" : ""}`}
            onClick={() => setMTab("resumen")}
          >
            <Wallet size={18} aria-hidden="true" />
            <span>Resumen</span>
          </button>
        </nav>
      </div>

      {confirmModal && sel && (
        <div className="repartidor__modal-fondo" onClick={() => setConfirmModal(false)}>
          <div className="repartidor__modal" onClick={(e) => e.stopPropagation()}>
            <div className="repartidor__modal-barra" />
            <div className="repartidor__modal-head">
              <h3>¿Confirmar entrega?</h3>
              <button className="repartidor__modal-close" aria-label="Cerrar" onClick={() => setConfirmModal(false)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="repartidor__modal-texto">
              {aCobrar(sel) ? `Confirma que cobraste ${quetzales(sel.total)} en efectivo. ` : ""}
              El pedido #{sel.id} pasará a <strong>Entregado</strong> y no podrá deshacerse.
            </p>
            <button className="repartidor__btn repartidor__btn--success" onClick={marcarEntregado}>
              <Check size={16} aria-hidden="true" /> Confirmar entrega
            </button>
            <button className="repartidor__btn repartidor__btn--ghost" onClick={() => setConfirmModal(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
