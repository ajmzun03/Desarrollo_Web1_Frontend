import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Play,
  RotateCcw,
  Plus,
  X,
  Flame,
} from "lucide-react";
import "../styles/ui.css";
import "../styles/cocina.css";
import { pedidosService } from "../services/pedidos.service";
import { productosService } from "../services/productos.service";
import { materiasPrimasService } from "../services/materiasPrimas.service";
import { unidadesMedidaService } from "../services/unidadesMedida.service";
import { ordenesTrabajoService } from "../services/ordenesTrabajo.service";
import { recetasService } from "../services/recetas.service";
import { sucursalesService } from "../services/sucursales.service";
import { lotesMateriaPrimaService } from "../services/lotesMateriaPrima.service";
import { schemaOrdenTrabajo } from "../schemas";
import type {
  Pedido,
  PedidoConDetalles,
  DetallePedido,
  Producto,
  MateriaPrima,
  UnidadMedida,
  OrdenTrabajo,
  Receta,
  Sucursal,
  LoteMateriaPrima,
  EstadoOrdenTrabajo,
} from "../types";

type KTab = "dashboard" | "kds" | "produccion" | "inventario";
type CardStatus = "pending" | "cooking" | "ready";

const OT_LABEL: Record<EstadoOrdenTrabajo, string> = {
  GENERADA: "Pendiente",
  EN_PROCESO: "En producción",
  FINALIZADA: "Finalizada",
  ANULADA: "Anulada",
};

const OT_CLASE: Record<EstadoOrdenTrabajo, string> = {
  GENERADA: "cocina__tag--pendiente",
  EN_PROCESO: "cocina__tag--en-proceso",
  FINALIZADA: "cocina__tag--finalizada",
  ANULADA: "cocina__tag--anulada",
};

// A cocina solo llegan pedidos pagados: los de tarjeta esperan a que Stripe confirme el cobro.
const pagoVerificado = (p: { metodo_pago?: string; pagado?: boolean }) => p.metodo_pago !== "TARJETA" || p.pagado === true;

const horaPedido = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });

// Clasificación derivada (solo visual) a partir de la fecha de vencimiento real del lote.
function clasificarLote(l: LoteMateriaPrima): { label: string; badge: string } {
  if (l.estado === "VENCIDO") return { label: "Vencido", badge: "cocina__badge--vencido" };
  if (l.estado === "AGOTADO") return { label: "Agotado", badge: "cocina__badge--agotado" };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(`${l.fecha_vencimiento}T00:00:00`);
  const dias = Math.floor((venc.getTime() - hoy.getTime()) / 86400000);
  if (dias <= 3) return { label: "Por vencer", badge: "cocina__badge--por-vencer" };
  return { label: "Vigente", badge: "cocina__badge--vigente" };
}

interface KDSCardProps {
  pedido: Pedido;
  status: CardStatus;
  items: DetallePedido[];
  productos: Producto[];
  onAccion: (id: number) => void;
}

function KDSCard({ pedido, status, items, productos, onAccion }: KDSCardProps) {
  const nombreProducto = (id: number) =>
    productos.find((pr) => pr.id === id)?.producto ?? `Producto #${id}`;

  return (
    <div className={`cocina__card cocina__card--${status}`}>
      <div className={`cocina__card-head cocina__card-head--${status}`}>
        <p className="cocina__card-id">#{pedido.id}</p>
        <span className="cocina__card-time">
          <Clock size={13} /> {horaPedido(pedido.fecha_pedido)}
        </span>
      </div>
      <div className="cocina__card-body">
        <div className="cocina__card-items">
          {items.map((d, idx) => (
            <div key={`${d.id}-${idx}`} className="cocina__card-item">
              <span className="cocina__card-dot" />
              <span>
                {d.cantidad}× {nombreProducto(d.producto_id)}
              </span>
            </div>
          ))}
        </div>
        {pedido.observaciones && (
          <div className="cocina__card-obs">
            <AlertTriangle size={12} className="cocina__card-obs-icon" />
            Obs: {pedido.observaciones}
          </div>
        )}
      </div>
      <div className="cocina__card-foot">
        <p className="cocina__card-ingreso">Ingresado: {horaPedido(pedido.fecha_pedido)}</p>
        {status === "pending" && (
          <button className="cocina__kds-action cocina__kds-action--iniciar" onClick={() => onAccion(pedido.id)}>
            <Play size={14} /> INICIAR PREPARACIÓN
          </button>
        )}
        {status === "cooking" && (
          <button className="cocina__kds-action cocina__kds-action--listo" onClick={() => onAccion(pedido.id)}>
            <CheckCircle size={14} /> MARCAR COMO LISTO
          </button>
        )}
        {status === "ready" && (
          <div className="cocina__kds-ready">✓ LISTO PARA DESPACHO</div>
        )}
      </div>
    </div>
  );
}

export default function Cocina() {
  const [kTab, setKTab] = useState<KTab>("dashboard");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [detalles, setDetalles] = useState<Record<number, DetallePedido[]>>({});
  const [productos, setProductos] = useState<Producto[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [lotes, setLotes] = useState<LoteMateriaPrima[]>([]);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajo[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [enCocina, setEnCocina] = useState<Set<number>>(new Set());
  const [mermFormOpen, setMermFormOpen] = useState(false);
  const [otFormOpen, setOtFormOpen] = useState(false);
  const [otForm, setOtForm] = useState({ sucursal_id: 0, receta_id: 0, cantidad_produccion: 1 });
  const [errorOt, setErrorOt] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [peds, prods, mats, unis, ots, recs, sers] = await Promise.all([
        pedidosService.getAll(),
        productosService.getAll(),
        materiasPrimasService.getAll(),
        unidadesMedidaService.getAll(),
        ordenesTrabajoService.getAll(),
        recetasService.getAll(),
        sucursalesService.getAll(),
      ]);
      const lotesPorMp = await Promise.all(mats.map((m) => lotesMateriaPrimaService.getFefo(1, m.id)));
      const loteLista = Array.from(new Map(lotesPorMp.flat().map((l) => [l.id, l])).values());

      const activos = peds.filter((p) => (p.estado === "CREADO" || p.estado === "LISTO") && pagoVerificado(p));
      const dets = await Promise.all(activos.map((p) => pedidosService.getById(p.id)));
      const mapa: Record<number, DetallePedido[]> = {};
      dets.forEach((d) => {
        mapa[d.id] = (d as PedidoConDetalles).detalles;
      });

      setPedidos(peds);
      setProductos(prods);
      setMateriasPrimas(mats);
      setUnidades(unis);
      setLotes(loteLista);
      setOrdenesTrabajo(ots);
      setRecetas(recs);
      setSucursales(sers);
      setDetalles(mapa);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el módulo de cocina.");
    } finally {
      setCargando(false);
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

  const refrescar = async () => {
    setCargando(true);
    try {
      await cargar();
    } finally {
      setCargando(false);
    }
  };

  const statusDe = (p: Pedido): CardStatus => {
    if (p.estado === "LISTO") return "ready";
    if (enCocina.has(p.id)) return "cooking";
    return "pending";
  };

  const iniciar = (id: number) => setEnCocina((prev) => new Set(prev).add(id));

  // El flujo "En preparación" es local/visual; solo el estado LISTO se persiste.
  const marcarListo = async (id: number) => {
    await pedidosService.updateEstado(id, "LISTO");
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado: "LISTO" } : p)));
    setEnCocina((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  };

  const accionKDS = (id: number) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return;
    if (statusDe(pedido) === "pending") iniciar(id);
    else marcarListo(id);
  };

  const iniciarOt = async (id: number) => {
    await ordenesTrabajoService.iniciar(id);
    setOrdenesTrabajo((prev) =>
      prev.map((o) => (o.id === id ? { ...o, estado: "EN_PROCESO" } : o))
    );
  };

  const terminarOt = async (id: number) => {
    await ordenesTrabajoService.terminar(id);
    setOrdenesTrabajo((prev) =>
      prev.map((o) => (o.id === id ? { ...o, estado: "FINALIZADA" } : o))
    );
  };

  const guardarOt = async () => {
    const res = schemaOrdenTrabajo.safeParse(otForm);
    if (!res.success) {
      setErrorOt(res.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    setErrorOt("");
    try {
      await ordenesTrabajoService.create(res.data);
      setOtForm({ sucursal_id: 0, receta_id: 0, cantidad_produccion: 1 });
      setOtFormOpen(false);
      cargar();
    } catch {
      setErrorOt("No se pudo crear la orden de trabajo.");
    }
  };

  const notaReceta = (recetaId: number | null) =>
    recetas.find((r) => r.id === recetaId)?.nombre ?? "Sin receta";

  const listaKDS = (() => {
    const activos = pedidos.filter((p) => (p.estado === "CREADO" || p.estado === "LISTO") && pagoVerificado(p));
    const prioridad: Record<CardStatus, number> = { pending: 0, cooking: 1, ready: 2 };
    return activos
      .map((p) => ({ p, s: statusDe(p) }))
      .sort((a, b) => prioridad[a.s] - prioridad[b.s])
      .map((x) => x.p);
  })();

  const grupos = usoComun(pedidos, enCocina);
  const { pendientes, enPreparacion, listos } = grupos;
  const criticos = lotes.filter((l) => clasificarLote(l).label !== "Vigente");

  const counts = { pendientes: pendientes.length };

  const unidadAbrev = (mp: MateriaPrima) =>
    unidades.find((u) => u.id === mp.unidad_medida_id)?.abreviatura ?? "u";

  const nombreMateriaPrima = (id: number) =>
    materiasPrimas.find((m) => m.id === id)?.materia_prima ?? `Materia prima #${id}`;

  if (cargando) {
    return (
      <div className="cocina__content">
        <p className="cocina__subtitle">Cargando módulo de cocina…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cocina__content">
        <div className="ui-error">{error}</div>
      </div>
    );
  }

  const TABS = [
    { id: "dashboard" as KTab, label: "Dashboard" },
    { id: "kds" as KTab, label: "Monitor KDS", count: counts.pendientes },
    { id: "produccion" as KTab, label: "Producción" },
    { id: "inventario" as KTab, label: "Inventario Cocina" },
  ];

  return (
    <div className="cocina">
      <div className="cocina__tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`cocina__tab ${kTab === t.id ? "cocina__tab--active" : ""}`}
            onClick={() => setKTab(t.id)}
          >
            {t.label}
            {t.count && <span className="cocina__tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="cocina__content">
        {/* Dashboard */}
        {kTab === "dashboard" && (
          <div>
            <div className="cocina__kpis">
              {[
                { label: "Pedidos pendientes", value: pendientes.length, icon: Clock, var: "pendientes" },
                { label: "En preparación", value: enPreparacion.length, icon: Flame, var: "cocina" },
                { label: "Listos para despacho", value: listos.length, icon: CheckCircle, var: "listos" },
                { label: "Insumos críticos", value: criticos.length, icon: AlertTriangle, var: "criticos" },
              ].map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className={`cocina__kpi cocina__kpi--${k.var}`}>
                    <div className="cocina__kpi-icon">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="cocina__kpi-value">{k.value}</p>
                      <p className="cocina__kpi-label">{k.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {criticos.length > 0 && (
              <div className="cocina__alert">
                <div className="cocina__alert-title">
                  <AlertTriangle size={16} />
                  <h3>Insumos que requieren atención inmediata</h3>
                </div>
                <div className="cocina__alert-grid">
                  {criticos.map((l) => {
                    const c = clasificarLote(l);
                    return (
                      <div key={l.id} className="cocina__alert-item">
                        <div>
                          <p className="cocina__alert-item-title">{nombreMateriaPrima(l.materia_prima_id)}</p>
                          <p className="cocina__alert-item-sub">
                            {l.cantidad_actual} {unidadAbrev(materiasPrimas.find((m) => m.id === l.materia_prima_id) as MateriaPrima)} · Lote #{l.id}
                          </p>
                        </div>
                        <span className={`cocina__alert-tag cocina__alert-tag--${c.label === "Por vencer" ? "por-vencer" : c.label.toLowerCase()}`}>
                          {c.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="cocina__cols">
              {[
                { title: "Pendientes", lista: pendientes, var: "pendientes" },
                { title: "En preparación", lista: enPreparacion, var: "cocina" },
                { title: "Listos", lista: listos, var: "listos" },
              ].map((col) => (
                <div key={col.title} className="cocina__col">
                  <div className={`cocina__col-head cocina__col-head--${col.var}`}>
                    {col.title} · {col.lista.length}
                  </div>
                  <div className="cocina__col-body">
                    {col.lista.length === 0 ? (
                      <p className="cocina__col-empty">Sin pedidos</p>
                    ) : (
                      col.lista.map((o) => (
                        <div key={o.id} className="cocina__col-item">
                          <div className="cocina__col-item-row">
                            <p className="cocina__col-id">#{o.id}</p>
                            <p className="cocina__col-meta">{horaPedido(o.fecha_pedido)}</p>
                          </div>
                          <p className="cocina__col-meta">{(detalles[o.id] ?? []).length} productos</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KDS */}
        {kTab === "kds" && (
          <div>
            <div className="cocina__kds-head">
              <div>
                <h2 className="cocina__title">Monitor de Cocina</h2>
                <p className="cocina__subtitle">
                  {listaKDS.length} pedidos activos (pendientes + en preparación + listos)
                </p>
              </div>
              <button className="ui-btn ui-btn--secondary" onClick={refrescar}>
                <RotateCcw size={12} /> Actualizar
              </button>
            </div>
            <div className="cocina__kds-grid">
              {listaKDS.map((p) => (
                <KDSCard
                  key={p.id}
                  pedido={p}
                  status={statusDe(p)}
                  items={detalles[p.id] ?? []}
                  productos={productos}
                  onAccion={accionKDS}
                />
              ))}
            </div>
          </div>
        )}

        {/* Producción */}
        {kTab === "produccion" && (
          <div>
            <div className="cocina__section-head">
              <div>
                <h2 className="cocina__title">Órdenes de Producción</h2>
                <p className="cocina__subtitle">
                  {ordenesTrabajo.length} órdenes de trabajo
                </p>
              </div>
              <button className="ui-btn ui-btn--primary" onClick={() => setOtFormOpen(true)}>
                <Plus size={14} /> Nueva orden
              </button>
            </div>

            {otFormOpen && (
              <div className="ui-panel cocina__form-box">
                <div className="cocina__kds-head cocina__form-head">
                  <h3 className="cocina__title">Nueva orden de trabajo</h3>
                  <button className="cocina__close" onClick={() => setOtFormOpen(false)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="cocina__form-grid">
                  <div className="cocina__form-field">
                    <label className="cocina__form-label">Receta</label>
                    <select
                      className="ui-select"
                      value={otForm.receta_id}
                      onChange={(e) => setOtForm({ ...otForm, receta_id: Number(e.target.value) })}
                    >
                      <option value={0}>Seleccionar…</option>
                      {recetas.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cocina__form-field">
                    <label className="cocina__form-label">Sucursal</label>
                    <select
                      className="ui-select"
                      value={otForm.sucursal_id}
                      onChange={(e) => setOtForm({ ...otForm, sucursal_id: Number(e.target.value) })}
                    >
                      <option value={0}>Seleccionar…</option>
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.sucursal}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cocina__form-field">
                    <label className="cocina__form-label">Cantidad a producir</label>
                    <input
                      className="ui-input"
                      type="number"
                      min={1}
                      value={otForm.cantidad_produccion}
                      onChange={(e) => setOtForm({ ...otForm, cantidad_produccion: Number(e.target.value) })}
                    />
                  </div>
                </div>
                {errorOt && <div className="ui-error">{errorOt}</div>}
                <div className="cocina__form-actions">
                  <button className="ui-btn ui-btn--primary" onClick={guardarOt}>
                    Crear orden
                  </button>
                  <button className="ui-btn ui-btn--secondary" onClick={() => setOtFormOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="cocina__prod-list">
              {ordenesTrabajo.map((o) => (
                <div key={o.id} className="cocina__prod">
                  <div className="cocina__prod-top">
                    <div>
                      <p className="cocina__prod-id">OT-{o.id}</p>
                      <h4 className="cocina__prod-name">{notaReceta(o.receta_id)}</h4>
                      <p className="cocina__prod-qty">Cantidad: <strong>{o.cantidad_produccion}</strong> uds</p>
                    </div>
                    <span className={`cocina__tag ${OT_CLASE[o.estado ?? "GENERADA"]}`}>
                      {OT_LABEL[o.estado ?? "GENERADA"]}
                    </span>
                  </div>
                  {o.estado === "GENERADA" && (
                    <div className="cocina__prod-actions">
                      <button className="ui-btn ui-btn--primary" onClick={() => iniciarOt(o.id)}>
                        <Play size={13} /> Iniciar producción
                      </button>
                    </div>
                  )}
                  {o.estado === "EN_PROCESO" && (
                    <div className="cocina__prod-actions">
                      <button className="ui-btn cocina__btn--success" onClick={() => terminarOt(o.id)}>
                        <CheckCircle size={13} /> Marcar completada
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventario */}
        {kTab === "inventario" && (
          <div>
            <div className="cocina__section-head">
              <div>
                <h2 className="cocina__title">Inventario de Cocina</h2>
                <p className="cocina__subtitle">Lotes vigentes por materia prima</p>
              </div>
              <button className="ui-btn ui-btn--secondary" onClick={() => setMermFormOpen(true)}>
                <Plus size={14} /> Registrar merma
              </button>
            </div>

            {mermFormOpen && (
              <div className="ui-panel cocina__form-box">
                <div className="cocina__kds-head cocina__form-head">
                  <h3 className="cocina__title">Registrar merma</h3>
                  <button className="cocina__close" onClick={() => setMermFormOpen(false)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="cocina__form-grid">
                  <div className="cocina__form-field">
                    <label className="cocina__form-label">Materia prima</label>
                    <select className="ui-select">
                      <option value={0}>Seleccionar…</option>
                      {materiasPrimas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.materia_prima}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cocina__form-field">
                    <label className="cocina__form-label">Cantidad</label>
                    <input className="ui-input" type="number" min={0} step="0.01" placeholder="0.00" />
                  </div>
                  <div className="cocina__form-field">
                    <label className="cocina__form-label">Motivo</label>
                    <select className="ui-select">
                      <option>Vencimiento</option>
                      <option>Contaminación</option>
                      <option>Rotura / Daño</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div className="cocina__form-field">
                    <label className="cocina__form-label">Observaciones</label>
                    <input className="ui-input" type="text" placeholder="Describe el motivo..." />
                  </div>
                </div>
                <div className="cocina__form-actions">
                  {/* TODO: no existe endpoint para registrar merma; el registro quedará en bodega. */}
                  <button className="ui-btn ui-btn--primary">Registrar merma</button>
                  <button className="ui-btn ui-btn--secondary" onClick={() => setMermFormOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="ui-panel cocina__table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Materia prima</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Lote</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.map((l) => {
                    const mp = materiasPrimas.find((m) => m.id === l.materia_prima_id);
                    const c = clasificarLote(l);
                    const filaClase =
                      l.estado === "VENCIDO"
                        ? "cocina__tr--vencido"
                        : l.estado === "AGOTADO"
                          ? "cocina__tr--agotado"
                          : "";
                    return (
                      <tr key={l.id} className={filaClase}>
                        <td className="cocina__mp-name">{mp?.materia_prima ?? `MP #${l.materia_prima_id}`}</td>
                        <td className={c.label === "Vigente" ? "cocina__qty" : "cocina__qty cocina__qty--critico"}>
                          {l.cantidad_actual}
                        </td>
                        <td>{(mp && unidadAbrev(mp)) || "u"}</td>
                        <td className="cocina__mono-id">#{l.id}</td>
                        <td className="cocina__venc">{fechaCorta(l.fecha_vencimiento)}</td>
                        <td>
                          <span className={`cocina__badge ${c.badge}`}>{c.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Cómputos compartidos entre tabs.
function usoComun(pedidos: Pedido[], enCocina: Set<number>) {
  const pendientes = pedidos.filter((p) => p.estado === "CREADO" && !enCocina.has(p.id));
  const enPreparacion = pedidos.filter((p) => p.estado === "CREADO" && enCocina.has(p.id));
  const listos = pedidos.filter((p) => p.estado === "LISTO");
  return { pendientes, enPreparacion, listos };
}