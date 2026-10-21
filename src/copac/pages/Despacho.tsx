import { useCallback, useEffect, useState } from "react";
import { Bike, ChevronRight, MapPin, Clock, X, Check, AlertTriangle } from "lucide-react";
import "../styles/ui.css";
import "../styles/despacho.css";
import { pedidosService } from "../services/pedidos.service";
import { clientesService } from "../services/clientes.service";
import { direccionesService } from "../services/direcciones.service";
import { usuariosService } from "../services/usuarios.service";
import { cajasService } from "../services/cajas.service";
import { turnosService } from "../services/turnos.service";
import { liquidacionesService } from "../services/liquidaciones.service";
import { schemaTurnoApertura, schemaTurnoCierre } from "../schemas";
import { getCookie } from "../utils/cookies";
import { BadgeEstado } from "../components/BadgeEstado";
import type {
  Pedido,
  PedidoConDetalles,
  DetallePedido,
  Cliente,
  Direccion,
  Usuario,
  Caja,
  TurnoDespachador,
  LiquidacionRepartidor,
} from "../types";

type DTab = "despacho" | "repartidores" | "turno";
type TurnoView = "apertura" | "cierre";

// Capacidad de pedidos activos por repartidor (derivada, presentación visual).
const CAPACIDAD_REPARTIDOR = 3;

const q = (n: number) => `Q ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" });

const prettifyUser = (u: string) =>
  u
    .split(".")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

const iniciales = (u: string) =>
  u
    .split(".")
    .map((s) => s.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

function estadoRepartidor(activos: number) {
  if (activos >= CAPACIDAD_REPARTIDOR) {
    return { label: "Ocupado", badge: "desp__rbadge--busy", dot: "desp__legend-dot--busy" };
  }
  if (activos > 0) {
    return { label: "En ruta", badge: "desp__rbadge--on-route", dot: "desp__legend-dot--on-route" };
  }
  return { label: "Disponible", badge: "desp__rbadge--available", dot: "desp__legend-dot--available" };
}

export default function Despacho() {
  const [tab, setTab] = useState<DTab>("despacho");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [detalles, setDetalles] = useState<Record<number, DetallePedido[]>>({});
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [turnos, setTurnos] = useState<TurnoDespachador[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionRepartidor[]>([]);
  // Asignación repartidor->pedido (solo visual: no existe campo de repartidor en el pedido).
  const [asignaciones, setAsignaciones] = useState<Record<number, number>>({});
  const [modalPedido, setModalPedido] = useState<Pedido | null>(null);
  const [selRepartidor, setSelRepartidor] = useState(0);
  const [errorAccion, setErrorAccion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [turnoView, setTurnoView] = useState<TurnoView>("apertura");
  const [cajaSel, setCajaSel] = useState(0);
  const [montoApertura, setMontoApertura] = useState<number | "">(500);
  const [montoDeclarado, setMontoDeclarado] = useState<number | "">("");
  const [errorTurno, setErrorTurno] = useState("");

  let usuarioActualId = 0;
  try {
    const u = JSON.parse(getCookie("usuario") ?? "null");
    usuarioActualId = Number(u?.id) || 0;
  } catch {
    // cookie no legible
  }

  const cargar = useCallback(async () => {
    try {
      const [peds, clis, dirs, usrs, cjs, trns, liqs] = await Promise.all([
        pedidosService.getAll(),
        clientesService.getAll(),
        direccionesService.getAll(),
        usuariosService.getAll(),
        cajasService.getAll(),
        turnosService.getAll(),
        liquidacionesService.getAll(),
      ]);
      const despacho = peds.filter((p) => p.estado === "LISTO" || p.estado === "EN_DESPACHO" || p.estado === "EN_RUTA");
      const dets = await Promise.all(despacho.map((p) => pedidosService.getById(p.id)));
      const mapa: Record<number, DetallePedido[]> = {};
      dets.forEach((d) => {
        mapa[d.id] = (d as PedidoConDetalles).detalles;
      });
      setPedidos(peds);
      setClientes(clis);
      setDirecciones(dirs);
      setUsuarios(usrs);
      setCajas(cjs);
      setTurnos(trns);
      setLiquidaciones(liqs);
      setDetalles(mapa);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el centro de despacho.");
    }
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        await cargar();
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cargar]);

  const listos = pedidos.filter((p) => p.estado === "LISTO");
  const enRuta = pedidos.filter((p) => p.estado === "EN_RUTA");
  const repartidores = usuarios.filter((u) => u.rol === "REPARTIDOR");
  const turnoAbierto = turnos
    .filter((t) => !t.cerrado_en)
    .sort((a, b) => new Date(b.abierto_en ?? "").getTime() - new Date(a.abierto_en ?? "").getTime())[0];

  const nombreCliente = (id: number) => {
    const c = clientes.find((x) => x.id === id);
    return c ? `${c.nombre} ${c.apellido}`.trim() : `Cliente #${id}`;
  };

  const direccionCliente = (id: number) =>
    (direcciones.find((d) => d.cliente_id === id)?.direccion1 ?? "").trim();

  const itemsPedido = (id: number) =>
    (detalles[id] ?? []).reduce((sum, d) => sum + (d.cantidad ?? 0), 0);

  const activosDe = (repartidorId: number) =>
    Object.values(asignaciones).filter((v) => v === repartidorId).length;

  const nombreRepartidor = (repartidorId: number) => {
    const u = repartidores.find((r) => r.id === repartidorId);
    return u ? prettifyUser(u.usuario ?? "") : `Repartidor #${repartidorId}`;
  };

  const nombreCaja = (cajaId: number | null) =>
    cajas.find((c) => c.id === cajaId)?.nombre ?? "Caja sin asignar";

  const abrirModal = (p: Pedido) => {
    setSelRepartidor(0);
    setErrorAccion("");
    setModalPedido(p);
  };

  const confirmarAsignacion = async () => {
    if (!modalPedido || !selRepartidor) return;
    try {
      await pedidosService.updateEstado(modalPedido.id, "EN_RUTA");
      setAsignaciones((prev) => ({ ...prev, [modalPedido.id]: selRepartidor }));
      setPedidos((prev) =>
        prev.map((p) => (p.id === modalPedido.id ? { ...p, estado: "EN_RUTA" } : p))
      );
      setModalPedido(null);
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : "No se pudo asignar el repartidor.");
    }
  };

  const guardarApertura = async () => {
    if (turnoAbierto) {
      setErrorTurno("Ya existe un turno abierto. Cierre el turno actual antes de abrir otro.");
      return;
    }
    if (!usuarioActualId) {
      setErrorTurno("No se pudo identificar al usuario en la sesión.");
      return;
    }
    const res = schemaTurnoApertura.safeParse({
      caja_id: cajaSel,
      usuario_id: usuarioActualId,
      monto_apertura: Number(montoApertura),
    });
    if (!res.success) {
      setErrorTurno(res.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    setErrorTurno("");
    try {
      await turnosService.apertura(res.data);
      setTurnos(await turnosService.getAll());
      setCajaSel(0);
      setMontoApertura(500);
      setTurnoView("cierre");
    } catch {
      setErrorTurno("No se pudo abrir el turno.");
    }
  };

  const guardarCierre = async () => {
    if (!turnoAbierto) return;
    const res = schemaTurnoCierre.safeParse({ monto_cierre_declarado: Number(montoDeclarado) });
    if (!res.success) {
      setErrorTurno(res.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    setErrorTurno("");
    try {
      await turnosService.cierre(turnoAbierto.id, res.data);
      setTurnos(await turnosService.getAll());
      setMontoDeclarado("");
    } catch {
      setErrorTurno("No se pudo cerrar el turno.");
    }
  };

  const liqsTurno = turnoAbierto
    ? liquidaciones.filter((l) => l.turno_id === turnoAbierto.id)
    : [];
  const efectivoRecaudado = turnoAbierto
    ? (turnoAbierto.monto_apertura ?? 0) +
      liqsTurno.reduce((s, l) => s + (l.monto_recaudado_efectivo ?? 0), 0)
    : 0;
  const voucherRecaudado = liqsTurno.reduce((s, l) => s + (l.monto_recaudado_voucher ?? 0), 0);
  const totalEntregarCaja = efectivoRecaudado + voucherRecaudado;
  const declaradoNum = Number(montoDeclarado);
  const diferencia = declaradoNum - totalEntregarCaja;

  const TABS: { id: DTab; label: string; count?: number }[] = [
    { id: "despacho", label: "Pedidos Listos", count: listos.length },
    { id: "repartidores", label: "Repartidores" },
    { id: "turno", label: "Apertura / Cierre" },
  ];

  if (cargando) {
    return (
      <div className="desp__content">
        <p className="desp__subtitle">Cargando centro de despacho…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="desp__content">
        <div className="ui-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="desp">
      <div className="desp__tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`desp__tab ${tab === t.id ? "desp__tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span className="desp__tab-count">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="desp__content">
        {/* ---- Pedidos listos / en ruta ---- */}
        {tab === "despacho" && (
          <div>
            <div className="desp__section-head">
              <div>
                <h2 className="desp__title">Pedidos listos para despacho</h2>
                <p className="desp__subtitle">
                  {listos.length} pedidos esperando repartidor · {enRuta.length} en ruta
                </p>
              </div>
            </div>

            {listos.length === 0 && enRuta.length === 0 ? (
              <div className="ui-panel">
                <p className="desp__subtitle">No hay pedidos listos para despacho.</p>
              </div>
            ) : (
              <div className="desp__grid">
                {[...listos, ...enRuta].map((p) => (
                  <div key={p.id} className={`desp__card ${p.estado === "EN_RUTA" ? "desp__card--ruta" : ""}`}>
                    <div className="desp__card-head">
                      <span className="desp__card-id">#{p.id}</span>
                      <span className="desp__card-time">
                        <Clock size={13} />
                        Listo: {hora(p.fecha_pedido)}
                      </span>
                    </div>
                    <div className="desp__card-line desp__card-line--b">
                      <span>{nombreCliente(p.cliente_id)}</span>
                      <BadgeEstado estado={p.estado} />
                    </div>
                    <div className="desp__card-line desp__card-line--m">
                      <MapPin size={13} /> {direccionCliente(p.cliente_id)}
                    </div>
                    <p className="desp__card-items">
                      {itemsPedido(p.id)} productos · {q(p.total)}
                    </p>
                    {p.observaciones && (
                      <div className="desp__card-obs">
                        <AlertTriangle size={12} className="desp__card-obs-icon" />
                        Obs: {p.observaciones}
                      </div>
                    )}
                    {p.estado === "LISTO" && (
                      <div className="desp__card-foot">
                        <span className="desp__monto">{q(p.total)}</span>
                        <button className="ui-btn ui-btn--primary" onClick={() => abrirModal(p)}>
                          <Bike size={14} /> Asignar repartidor
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                    {p.estado === "EN_RUTA" && asignaciones[p.id] && (
                      <p className="desp__card-ruta">
                        Repartidor: {nombreRepartidor(asignaciones[p.id])}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- Repartidores ---- */}
        {tab === "repartidores" && (
          <div>
            <div className="desp__section-head">
              <h2 className="desp__title">Estado de repartidores</h2>
            </div>
            <div className="desp__legend">
              {[
                { label: "Disponible", dot: "desp__legend-dot--available" },
                { label: "En ruta", dot: "desp__legend-dot--on-route" },
                { label: "Ocupado", dot: "desp__legend-dot--busy" },
              ].map((l) => (
                <span key={l.label} className="desp__legend-item">
                  <span className={`desp__legend-dot ${l.dot}`} />
                  {l.label}
                </span>
              ))}
            </div>

            {repartidores.length === 0 ? (
              <div className="ui-panel">
                <p className="desp__subtitle">No hay repartidores registrados.</p>
              </div>
            ) : (
              <div className="desp__riders-grid">
                {repartidores.map((r) => {
                  const activos = activosDe(r.id);
                  const estado = estadoRepartidor(activos);
                  const pct = Math.min(100, Math.round((activos / CAPACIDAD_REPARTIDOR) * 100));
                  return (
                    <div key={r.id} className="desp__ridercard">
                      <div className="desp__ridercard-head">
                        <span className="desp__rider-avatar">{iniciales(r.usuario ?? "")}</span>
                        <div className="desp__ridercard-main">
                          <p className="desp__ridercard-name">{prettifyUser(r.usuario ?? "")}</p>
                          <p className="desp__ridercard-meta">{r.correo_electronico}</p>
                        </div>
                        <span className={`desp__rbadge ${estado.badge}`}>{estado.label}</span>
                      </div>
                      <p className="desp__ridercard-activos">
                        Pedidos activos: {activos}/{CAPACIDAD_REPARTIDOR}
                      </p>
                      <div className="desp__cap-bar">
                        <div
                          className={`desp__cap-fill ${activos >= CAPACIDAD_REPARTIDOR ? "desp__cap-fill--alert" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- Apertura / Cierre de turno ---- */}
        {tab === "turno" && (
          <div>
            <div className="desp__section-head">
              <h2 className="desp__title">Apertura y Cierre de Turno</h2>
            </div>

            <div className="desp__toggle">
              {(["apertura", "cierre"] as TurnoView[]).map((v) => (
                <button
                  key={v}
                  className={`desp__toggle-btn ${turnoView === v ? "desp__toggle-btn--on" : ""}`}
                  onClick={() => {
                    setTurnoView(v);
                    setErrorTurno("");
                  }}
                >
                  {v === "apertura" ? "Apertura de turno" : "Cierre de turno"}
                </button>
              ))}
            </div>

            {turnoAbierto && (
              <div className="desp__turno-info">
                <div className="desp__turno-info-item">
                  <p className="desp__turno-info-label">Caja</p>
                  <p className="desp__turno-info-value">{nombreCaja(turnoAbierto.caja_id)}</p>
                </div>
                <div className="desp__turno-info-item">
                  <p className="desp__turno-info-label">Apertura</p>
                  <p className="desp__turno-info-value">{fechaLarga(turnoAbierto.abierto_en ?? "")}</p>
                </div>
                <div className="desp__turno-info-item">
                  <p className="desp__turno-info-label">Fondo inicial</p>
                  <p className="desp__turno-info-value">{q(turnoAbierto.monto_apertura ?? 0)}</p>
                </div>
                <div className="desp__turno-info-item">
                  <p className="desp__turno-info-label">Estado</p>
                  <p className="desp__turno-info-value">Abierto</p>
                </div>
              </div>
            )}

            {turnoView === "apertura" && (
              <div className="ui-panel desp__box">
                <h3 className="desp__title desp__form-title">Apertura de turno</h3>
                <div className="desp__form-grid">
                  <div className="desp__field">
                    <label className="desp__label">Caja</label>
                    <select
                      className="ui-select"
                      value={cajaSel}
                      onChange={(e) => setCajaSel(Number(e.target.value))}
                    >
                      <option value={0}>Seleccionar…</option>
                      {cajas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="desp__field">
                    <label className="desp__label">
                      Fondo inicial / monto físico recibido (Q)
                    </label>
                    <input
                      className="ui-input"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="500.00"
                      value={montoApertura}
                      onChange={(e) =>
                        setMontoApertura(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>
                </div>
                {errorTurno && <div className="ui-error">{errorTurno}</div>}
                <div className="desp__form-actions">
                  <button
                    className="ui-btn ui-btn--primary"
                    onClick={guardarApertura}
                    disabled={!!turnoAbierto}
                  >
                    Confirmar apertura de turno
                  </button>
                  {turnoAbierto && (
                    <p className="desp__subtitle">
                      Ya hay un turno abierto; cierre el turno actual antes de abrir otro.
                    </p>
                  )}
                </div>
              </div>
            )}

            {turnoView === "cierre" && (
              <div className="ui-panel desp__box">
                <h3 className="desp__title desp__form-title">Cierre de turno</h3>

                {!turnoAbierto ? (
                  <p className="desp__subtitle">
                    No hay un turno abierto. Realice primero la apertura de turno.
                  </p>
                ) : (
                  <>
                    <div className="desp__kpis">
                      <div className="desp__kpi">
                        <p className="desp__kpi-label">Efectivo recaudado</p>
                        <p className="desp__kpi-value">{q(efectivoRecaudado)}</p>
                      </div>
                      <div className="desp__kpi">
                        <p className="desp__kpi-label">Pagos con tarjeta</p>
                        <p className="desp__kpi-value">{q(voucherRecaudado)}</p>
                      </div>
                      <div className="desp__kpi">
                        <p className="desp__kpi-label">Fondo fijo</p>
                        <p className="desp__kpi-value">{q(turnoAbierto.monto_apertura ?? 0)}</p>
                      </div>
                    </div>

                    <div className="desp__turno-total">
                      <span className="desp__turno-total-label">Total a entregar a caja</span>
                      <span className="desp__turno-total-value">{q(totalEntregarCaja)}</span>
                    </div>

                    <div className="desp__field desp__form-field--mb">
                      <label className="desp__label">Monto de cierre declarado (Q)</label>
                      <input
                        className="ui-input"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={montoDeclarado}
                        onChange={(e) =>
                          setMontoDeclarado(e.target.value === "" ? "" : Number(e.target.value))
                        }
                      />
                    </div>

                    {declaradoNum > 0 && (
                      <div className={`desp__diff ${diferencia >= 0 ? "desp__diff--ok" : "desp__diff--bad"}`}>
                        Diferencia: {q(diferencia)}
                        {diferencia >= 0 ? " · Sin diferencia" : " · Requiere justificación"}
                      </div>
                    )}

                    {errorTurno && <div className="ui-error">{errorTurno}</div>}
                    <div className="desp__form-actions">
                      <button className="ui-btn ui-btn--primary" onClick={guardarCierre}>
                        Confirmar cierre de turno
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- Modal asignar repartidor ---- */}
      {modalPedido && (
        <div className="desp__overlay">
          <div className="desp__modal">
            <div className="desp__modal-head">
              <h3 className="desp__modal-title">Asignar repartidor</h3>
              <button className="desp__modal-close" onClick={() => setModalPedido(null)}>
                <X size={16} />
              </button>
            </div>
            <p className="desp__modal-sub">
              Pedido #{modalPedido.id} · {nombreCliente(modalPedido.cliente_id)} ·{" "}
              {direccionCliente(modalPedido.cliente_id)}
            </p>

            <div className="desp__rider-list">
              {repartidores.map((r) => {
                const activos = activosDe(r.id);
                const estado = estadoRepartidor(activos);
                const seleccionado = selRepartidor === r.id;
                return (
                  <button
                    key={r.id}
                    className={`desp__rider ${seleccionado ? "desp__rider--selected" : ""}`}
                    onClick={() => setSelRepartidor(r.id)}
                  >
                    <span className="desp__rider-avatar">{iniciales(r.usuario ?? "")}</span>
                    <span className="desp__rider-main">
                      <span className="desp__rider-name">{prettifyUser(r.usuario ?? "")}</span>
                      <span className="desp__rider-meta">
                        {r.correo_electronico} · Pedidos activos: {activos}/{CAPACIDAD_REPARTIDOR} ·{" "}
                        {estado.label}
                      </span>
                    </span>
                    {seleccionado && <Check size={16} className="desp__rider-arrow" />}
                  </button>
                );
              })}
            </div>

            {errorAccion && <div className="ui-error">{errorAccion}</div>}

            <div className="desp__modal-actions">
              <button className="ui-btn ui-btn--secondary" onClick={() => setModalPedido(null)}>
                Cancelar
              </button>
              <button
                className="ui-btn ui-btn--primary"
                disabled={!selRepartidor}
                onClick={confirmarAsignacion}
              >
                Confirmar asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}