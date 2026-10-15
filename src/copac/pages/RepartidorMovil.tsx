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
  Wallet,
  X,
} from "lucide-react";
import "../styles/ui.css";
import "../styles/repartidor.css";
import { pedidosService } from "../services/pedidos.service";
import { clientesService } from "../services/clientes.service";
import { direccionesService } from "../services/direcciones.service";
import { productosService } from "../services/productos.service";
import { liquidacionesService } from "../services/liquidaciones.service";
import { getCookie } from "../utils/cookies";
import type {
  Cliente,
  DetallePedido,
  Direccion,
  EstadoPedido,
  LiquidacionRepartidor,
  Pedido,
  Producto,
  Usuario,
} from "../types";

type MTab = "orders" | "detail" | "incident" | "liquidacion";

const INCIDENT_REASONS = [
  "Dirección incorrecta",
  "Cliente no responde",
  "Zona peligrosa",
  "Producto rechazado",
  "Otro",
];

// Estados de pedido relevantes para la ruta del repartidor.
const ESTADO_TAG: Record<string, { label: string; clase: string }> = {
  EN_RUTA: { label: "En ruta", clase: "repartidor__status--ruta" },
  ENTREGADO: { label: "Entregado", clase: "repartidor__status--entregado" },
};

const quetzales = (n: number) => `Q ${n.toFixed(2)}`;

const dia = (iso: string) => new Date(iso).toISOString().slice(0, 10);

// Fecha de referencia = día más reciente con pedidos (mismo criterio que el Dashboard).
const diaDeRuta = (peds: Pedido[]): string => {
  const fechas = peds.map((p) => dia(p.fecha_pedido)).sort();
  return fechas.length > 0 ? fechas[fechas.length - 1] : dia(new Date().toISOString());
};

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

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [detalles, setDetalles] = useState<Record<number, DetallePedido[]>>({});
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionRepartidor[]>([]);

  const [overrides, setOverrides] = useState<Record<number, EstadoPedido>>({});
  const [selId, setSelId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // TEMPORAL: no existe tabla ni endpoint de incidentes en el backend.
  const [incidentes, setIncidentes] = useState<{ pedido_id: number; motivo: string; observacion: string }[]>([]);
  const [incMotivo, setIncMotivo] = useState("");
  const [incObs, setIncObs] = useState("");

  const usuario = useMemo(() => leerUsuario(), []);
  const repartidorId = usuario?.id ?? null;

  const cargar = useCallback(async () => {
    const [peds, clis, dirs, prods, liqs] = await Promise.all([
      pedidosService.getAll(),
      clientesService.getAll(),
      direccionesService.getAll(),
      productosService.getAll(),
      liquidacionesService.getAll(),
    ]);
    const ref = diaDeRuta(peds);
    const ruta = peds.filter(
      (p) => p.estado === "EN_RUTA" || (p.estado === "ENTREGADO" && dia(p.fecha_pedido) === ref)
    );
    const detArr = await Promise.all(ruta.map((p) => pedidosService.getById(p.id)));
    const mapa: Record<number, DetallePedido[]> = {};
    detArr.forEach((d) => {
      mapa[d.id] = d.detalles;
    });

    setPedidos(peds);
    setClientes(clis);
    setDirecciones(dirs);
    setProductos(prods);
    setLiquidaciones(liqs);
    setDetalles(mapa);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        await cargar();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar la ruta del repartidor.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cargar]);

  /* ---------- Derivados ---------- */
  // "Mis pedidos" = ruta del día: pedidos en ruta + los entregados HOY.
  const misPedidos = useMemo(() => {
    const ref = diaDeRuta(pedidos);
    return pedidos
      .filter((p) => p.estado === "EN_RUTA" || (p.estado === "ENTREGADO" && dia(p.fecha_pedido) === ref))
      .map((p) => ({ ...p, estado: overrides[p.id] ?? p.estado }))
      .sort((a, b) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime());
  }, [pedidos, overrides]);

  const sel = misPedidos.find((p) => p.id === selId) ?? null;

  const nombreCliente = (id: number) => {
    const c = clientes.find((x) => x.id === id);
    return c ? `${c.nombre} ${c.apellido}` : `Cliente #${id}`;
  };
  const direccionTexto = (clienteId: number) => {
    const d = direcciones.find((x) => x.cliente_id === clienteId);
    if (!d) return "Sin dirección registrada";
    return d.direccion2 ? `${d.direccion1}, ${d.direccion2}` : d.direccion1;
  };
  const productoNombre = (id: number) => productos.find((p) => p.id === id)?.producto ?? `Producto #${id}`;
  const itemsDe = (pedidoId: number) =>
    (detalles[pedidoId] ?? []).map((d) => `${d.cantidad}× ${productoNombre(d.producto_id)}`);

  const entregadas = misPedidos.filter((p) => p.estado === "ENTREGADO").length;

  // Liquidaciones del repartidor conectado; si no es un repartidor con datos,
  // se muestran todas para no dejar la vista vacía (se reporta).
  const misLiquidaciones = useMemo(() => {
    if (repartidorId == null) return liquidaciones;
    const propias = liquidaciones.filter((l) => l.repartidor_id === repartidorId);
    return propias.length > 0 ? propias : liquidaciones;
  }, [liquidaciones, repartidorId]);

  const liq = useMemo(() => {
    const efectivo = misLiquidaciones.reduce((s, l) => s + (l.monto_recaudado_efectivo ?? 0), 0);
    const voucher = misLiquidaciones.reduce((s, l) => s + (l.monto_recaudado_voucher ?? 0), 0);
    const entregado = misLiquidaciones.reduce((s, l) => s + (l.monto_entregado_repartidor ?? 0), 0);
    return { efectivo, voucher, entregado };
  }, [misLiquidaciones]);

  /* ---------- Acciones ---------- */
  const abrirDetalle = (id: number) => {
    setSelId(id);
    setAviso(null);
    setMTab("detail");
  };

  const marcarEntregado = async () => {
    if (!sel) return;
    const id = sel.id;
    setConfirmModal(false);
    setAviso(null);
    setOverrides((prev) => ({ ...prev, [id]: "ENTREGADO" }));
    setMTab("orders");
    try {
      await pedidosService.entregado(id);
      setAviso(`Pedido #${id} marcado como entregado.`);
    } catch {
      setOverrides((prev) => {
        const copia = { ...prev };
        delete copia[id];
        return copia;
      });
      setAviso("No se pudo actualizar el pedido.");
    }
  };

  const enviarIncidente = () => {
    if (!sel) return;
    const pedidoId = sel.id;
    setIncidentes((prev) => [...prev, { pedido_id: pedidoId, motivo: incMotivo, observacion: incObs }]);
    setIncMotivo("");
    setIncObs("");
    setMTab("orders");
    setAviso(`Incidente del pedido #${pedidoId} registrado (no persistido: endpoint pendiente en backend).`);
  };

  const confirmarLiquidacion = () => {
    setAviso("Función no disponible: no existe endpoint para confirmar la liquidación en el backend.");
  };

  if (cargando) {
    return (
      <div className="repartidor">
        <p className="repartidor__loading">Cargando ruta del repartidor…</p>
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

  return (
    <div className="repartidor">
      <div className="repartidor__phone">
        <header className="repartidor__header">
          <p className="repartidor__brand">COPAC Repartidor</p>
          <p className="repartidor__turno">{usuario?.usuario ?? "Repartidor"} · Turno activo</p>
        </header>

        <div className="repartidor__contenido">
          {/* ============ Mis pedidos ============ */}
          {mTab === "orders" && (
            <div className="repartidor__seccion">
              <h2 className="repartidor__titulo">Mis pedidos</h2>

              {aviso && <div className="repartidor__aviso">{aviso}</div>}

              {misPedidos.length === 0 ? (
                <div className="repartidor__vacio">
                  <Package size={28} />
                  <p>No tienes pedidos asignados.</p>
                </div>
              ) : (
                misPedidos.map((p) => {
                  const tag = ESTADO_TAG[p.estado] ?? { label: p.estado, clase: "repartidor__status--muted" };
                  return (
                    <button key={p.id} className="repartidor__card" onClick={() => abrirDetalle(p.id)}>
                      <div className="repartidor__card-top">
                        <div>
                          <p className="repartidor__pedido">#{p.id}</p>
                          <p className="repartidor__cliente">{nombreCliente(p.cliente_id)}</p>
                        </div>
                        <div className="repartidor__card-right">
                          <span className={`repartidor__status ${tag.clase}`}>{tag.label}</span>
                          <p className="repartidor__monto">{quetzales(p.total)}</p>
                        </div>
                      </div>
                      <p className="repartidor__direccion">
                        <MapPin size={12} aria-hidden="true" /> {direccionTexto(p.cliente_id)}
                      </p>
                      <div className="repartidor__card-foot">
                        {/* TODO: PEDIDO no guarda método de pago; no se puede derivar. */}
                        <span className="repartidor__metodo repartidor__metodo--nd">N/D</span>
                        <ChevronRight size={15} aria-hidden="true" />
                      </div>
                    </button>
                  );
                })
              )}

              <button className="repartidor__btn repartidor__btn--dark" onClick={() => setMTab("liquidacion")}>
                <Wallet size={16} aria-hidden="true" /> Ver liquidación de ruta
              </button>
            </div>
          )}

          {/* ============ Detalle del pedido ============ */}
          {mTab === "detail" && sel && (
            <div className="repartidor__seccion">
              <button className="repartidor__volver" onClick={() => setMTab("orders")}>
                ← Mis pedidos
              </button>

              <div className="repartidor__card repartidor__card--static">
                <p className="repartidor__pedido repartidor__pedido--grande">#{sel.id}</p>
                <h3 className="repartidor__cliente repartidor__cliente--grande">{nombreCliente(sel.cliente_id)}</h3>
                <div className="repartidor__dato">
                  <MapPin size={14} aria-hidden="true" />
                  <span>{direccionTexto(sel.cliente_id)}</span>
                </div>
                {(() => {
                  const c = clientes.find((x) => x.id === sel.cliente_id);
                  return c ? (
                    <div className="repartidor__dato">
                      <Phone size={14} aria-hidden="true" />
                      <span>{c.telefono}</span>
                    </div>
                  ) : null;
                })()}
                <div className="repartidor__mapa">
                  <Navigation size={22} aria-hidden="true" />
                  <span>Ver en mapa</span>
                </div>
              </div>

              <div className="repartidor__card repartidor__card--static">
                <p className="repartidor__label">Productos</p>
                {itemsDe(sel.id).length === 0 ? (
                  <p className="repartidor__vacio-texto">Sin detalle registrado.</p>
                ) : (
                  itemsDe(sel.id).map((item, i) => (
                    <p key={i} className="repartidor__item">
                      {item}
                    </p>
                  ))
                )}
              </div>

              <div className="repartidor__card repartidor__card--static">
                <div className="repartidor__pago">
                  <div>
                    <p className="repartidor__label">Monto a cobrar</p>
                    <p className="repartidor__monto-grande">{quetzales(sel.total)}</p>
                  </div>
                  {/* TODO: PEDIDO no guarda método de pago; no se puede derivar. */}
                  <span className="repartidor__metodo repartidor__metodo--nd">
                    <CreditCard size={16} aria-hidden="true" /> N/D
                  </span>
                </div>
              </div>

              {sel.estado !== "ENTREGADO" ? (
                <>
                  <button
                    className="repartidor__btn repartidor__btn--success"
                    onClick={() => setConfirmModal(true)}
                  >
                    <Check size={16} aria-hidden="true" /> Marcar como entregado
                  </button>
                  <button
                    className="repartidor__btn repartidor__btn--danger-outline"
                    onClick={() => {
                      setIncMotivo("");
                      setIncObs("");
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

          {/* ============ Incidente (mock temporal) ============ */}
          {mTab === "incident" && sel && (
            <div className="repartidor__seccion">
              <button className="repartidor__volver" onClick={() => setMTab("detail")}>
                ← Detalle del pedido
              </button>

              <div className="repartidor__alerta">
                <div className="repartidor__alerta-head">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <p>Reportar incidente</p>
                </div>
                <p className="repartidor__alerta-sub">
                  Esta acción quedará registrada en el sistema y notificará al despachador.
                </p>
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
                  placeholder="Describe el incidente…"
                  value={incObs}
                  onChange={(e) => setIncObs(e.target.value)}
                />
              </div>

              <button
                className="repartidor__btn repartidor__btn--danger"
                disabled={!incMotivo}
                onClick={enviarIncidente}
              >
                <AlertTriangle size={16} aria-hidden="true" /> Reportar incidente
              </button>
            </div>
          )}

          {/* ============ Liquidación ============ */}
          {mTab === "liquidacion" && (
            <div className="repartidor__seccion">
              <button className="repartidor__volver" onClick={() => setMTab("orders")}>
                ← Mis pedidos
              </button>

              <div className="repartidor__liq-hero">
                <p className="repartidor__liq-hero-label">Efectivo recaudado</p>
                <p className="repartidor__liq-hero-valor">{quetzales(liq.efectivo)}</p>
                <p className="repartidor__liq-hero-sub">Monto entregado: {quetzales(liq.entregado)}</p>
              </div>

              <div className="repartidor__card repartidor__card--static">
                {[
                  { label: "Pedidos entregados", value: String(entregadas) },
                  { label: "Efectivo recaudado", value: quetzales(liq.efectivo) },
                  { label: "Pagos con tarjeta (voucher)", value: quetzales(liq.voucher) },
                  { label: "Incidentes reportados", value: String(incidentes.length) },
                ].map((fila) => (
                  <div key={fila.label} className="repartidor__liq-fila">
                    <span>{fila.label}</span>
                    <span className="repartidor__liq-valor">{fila.value}</span>
                  </div>
                ))}
              </div>

              <button className="repartidor__btn repartidor__btn--primary" onClick={confirmarLiquidacion}>
                Confirmar liquidación
              </button>
              {aviso && <div className="repartidor__aviso">{aviso}</div>}
            </div>
          )}
        </div>

        <nav className="repartidor__nav">
          <button
            className={`repartidor__nav-item ${mTab === "orders" || mTab === "detail" || mTab === "incident" ? "repartidor__nav-item--activo" : ""}`}
            onClick={() => setMTab("orders")}
          >
            <Package size={18} aria-hidden="true" />
            <span>Pedidos</span>
          </button>
          <button
            className={`repartidor__nav-item ${mTab === "liquidacion" ? "repartidor__nav-item--activo" : ""}`}
            onClick={() => setMTab("liquidacion")}
          >
            <Banknote size={18} aria-hidden="true" />
            <span>Liquidación</span>
          </button>
        </nav>
      </div>

      {confirmModal && sel && (
        <div className="repartidor__modal-fondo" onClick={() => setConfirmModal(false)}>
          <div className="repartidor__modal" onClick={(e) => e.stopPropagation()}>
            <div className="repartidor__modal-barra" />
            <div className="repartidor__modal-head">
              <h3>¿Confirmar entrega?</h3>
              <button className="repartidor__modal-close" onClick={() => setConfirmModal(false)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="repartidor__modal-texto">
              Esta acción cambiará el pedido #{sel.id} a <strong>Entregado</strong> y no podrá deshacerse.
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
