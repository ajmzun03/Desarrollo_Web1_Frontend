import { useCallback, useEffect, useState } from "react";
import { Plus, X, Eye, Search, ClipboardList, Truck, Receipt, Store, ChevronRight } from "lucide-react";
import "../styles/ui.css";
import "../styles/compras.css";
import { ordenesCompraService } from "../services/ordenesCompra.service";
import { proveedoresService } from "../services/proveedores.service";
import { facturasCompraService } from "../services/facturasCompra.service";
import { materiasPrimasService } from "../services/materiasPrimas.service";
import { unidadesMedidaService } from "../services/unidadesMedida.service";
import { sucursalesService } from "../services/sucursales.service";
import { schemaOrdenCompra, schemaOrdenCompraEstado, schemaProveedor } from "../schemas";
import type {
  OrdenCompra,
  DetalleOrdenCompra,
  Proveedor,
  FacturaCompra,
  MateriaPrima,
  UnidadMedida,
  Sucursal,
  EstadoOrdenCompra,
} from "../types";

type CTab = "dashboard" | "proveedores" | "ordenes";

interface OcItemForm {
  materia_prima_id: number;
  cantidad_solicitada: number;
  precio_unitario: number;
}

const OC_LABEL: Record<EstadoOrdenCompra, string> = {
  CREADA: "Creada",
  EN_PROCESO: "En proceso",
  FINALIZADO: "Finalizada",
  ANULADO: "Anulada",
};

const OC_CLASE: Record<EstadoOrdenCompra, string> = {
  CREADA: "compras__tag--creada",
  EN_PROCESO: "compras__tag--en-proceso",
  FINALIZADO: "compras__tag--finalizada",
  ANULADO: "compras__tag--anulada",
};

const OC_CLASE_FILA: Record<EstadoOrdenCompra, string> = {
  CREADA: "compras__fila--creada",
  EN_PROCESO: "compras__fila--en-proceso",
  FINALIZADO: "compras__fila--finalizada",
  ANULADO: "compras__fila--anulada",
};

const q = (n: number) => `Q ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function Compras() {
  const [tab, setTab] = useState<CTab>("dashboard");
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [detalles, setDetalles] = useState<Record<number, DetalleOrdenCompra[]>>({});
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [facturas, setFacturas] = useState<FacturaCompra[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [provFormOpen, setProvFormOpen] = useState(false);
  const [provForm, setProvForm] = useState({ proveedor: "", noNit: "", direccion: "" });
  const [provErrores, setProvErrores] = useState("");
  const [provBusca, setProvBusca] = useState("");
  const [provSel, setProvSel] = useState<Proveedor | null>(null);

  const [ocFormOpen, setOcFormOpen] = useState(false);
  const [ocForm, setOcForm] = useState<{
    proveedor_id: number;
    sucursal_id: number;
    items: OcItemForm[];
  }>({ proveedor_id: 0, sucursal_id: 0, items: [{ materia_prima_id: 0, cantidad_solicitada: 1, precio_unitario: 1 }] });
  const [ocErrores, setOcErrores] = useState("");
  const [ocSel, setOcSel] = useState<OrdenCompra | null>(null);
  const [fEstado, setFEstado] = useState<"" | EstadoOrdenCompra>("");
  const [fProveedor, setFProveedor] = useState(0);
  const [fFecha, setFFecha] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [ords, provs, fcs, mats, unis, sers] = await Promise.all([
        ordenesCompraService.getAll(),
        proveedoresService.getAll(),
        facturasCompraService.getAll(),
        materiasPrimasService.getAll(),
        unidadesMedidaService.getAll(),
        sucursalesService.getAll(),
      ]);
      const dets = await Promise.all(ords.map((o) => ordenesCompraService.getById(o.id)));
      const mapa: Record<number, DetalleOrdenCompra[]> = {};
      dets.forEach((d) => {
        mapa[d.id] = d.detalles;
      });
      setOrdenes(ords);
      setDetalles(mapa);
      setProveedores(provs);
      setFacturas(fcs);
      setMateriasPrimas(mats);
      setUnidades(unis);
      setSucursales(sers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el módulo de compras.");
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

  const ocAbiertas = ordenes.filter((o) => o.estado_orden === "CREADA" || o.estado_orden === "EN_PROCESO");
  const entregasProceso = ordenes.filter((o) => o.estado_orden === "EN_PROCESO");

  const totalOrden = (id: number) =>
    (detalles[id] ?? []).reduce((s, d) => s + (d.subtotal ?? 0), 0);

  const nombreProveedor = (id: number | null) => proveedores.find((p) => p.id === id)?.proveedor ?? `Proveedor #${id}`;
  const nombreSucursal = (id: number | null) => sucursales.find((s) => s.id === id)?.sucursal ?? `Sucursal #${id}`;
  const nombreMp = (id: number) => materiasPrimas.find((m) => m.id === id)?.materia_prima ?? `MP #${id}`;
  const unidadAbrev = (mpId: number) => {
    const mp = materiasPrimas.find((m) => m.id === mpId);
    return unidades.find((u) => u.id === mp?.unidad_medida_id)?.abreviatura ?? "u";
  };

  const guardarProveedor = async () => {
    const res = schemaProveedor.safeParse({
      noNit: provForm.noNit,
      proveedor: provForm.proveedor,
      direccion: provForm.direccion,
    });
    if (!res.success) {
      setProvErrores(res.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    setProvErrores("");
    try {
      await proveedoresService.create(res.data);
      setProveedores(await proveedoresService.getAll());
      setProvForm({ proveedor: "", noNit: "", direccion: "" });
      setProvFormOpen(false);
    } catch {
      setProvErrores("No se pudo registrar el proveedor.");
    }
  };

  const agregarItem = () =>
    setOcForm((f) => ({
      ...f,
      items: [...f.items, { materia_prima_id: 0, cantidad_solicitada: 1, precio_unitario: 1 }],
    }));

  const eliminarItem = (idx: number) =>
    setOcForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const setItem = (idx: number, patch: Partial<OcItemForm>) =>
    setOcForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));

  const guardarOrden = async () => {
    const res = schemaOrdenCompra.safeParse({
      proveedor_id: ocForm.proveedor_id,
      sucursal_destino: ocForm.sucursal_id,
      items: ocForm.items,
    });
    if (!res.success) {
      setOcErrores(res.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    setOcErrores("");
    try {
      await ordenesCompraService.create(res.data);
      setOcForm({
        proveedor_id: 0,
        sucursal_id: 0,
        items: [{ materia_prima_id: 0, cantidad_solicitada: 1, precio_unitario: 1 }],
      });
      setOcFormOpen(false);
      await cargar();
    } catch {
      setOcErrores("No se pudo generar la orden de compra.");
    }
  };

  const cambiarEstado = async (orden: OrdenCompra, estado: EstadoOrdenCompra) => {
    const res = schemaOrdenCompraEstado.safeParse({ estado });
    if (!res.success) return;
    await ordenesCompraService.updateEstado(orden.id, res.data.estado);
    setOrdenes((prev) => prev.map((o) => (o.id === orden.id ? { ...o, estado_orden: res.data.estado } : o)));
    setOcSel((prev) => (prev && prev.id === orden.id ? { ...prev, estado_orden: res.data.estado } : prev));
  };

  const proveedoresFiltrados = proveedores.filter(
    (p) =>
      !provBusca ||
      p.proveedor.toLowerCase().includes(provBusca.toLowerCase()) ||
      p.no_nit.includes(provBusca)
  );

  const ordenesFiltradas = ordenes
    .filter(
      (o) =>
        (!fEstado || o.estado_orden === fEstado) &&
        (!fProveedor || o.proveedor_id === fProveedor) &&
        (!fFecha || o.fecha_generada.slice(0, 10) === fFecha)
    )
    .sort((a, b) => new Date(b.fecha_generada).getTime() - new Date(a.fecha_generada).getTime());

  const TABS: { id: CTab; label: string; count?: number }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "proveedores", label: "Proveedores", count: proveedores.length },
    { id: "ordenes", label: "Órdenes de Compra", count: ocAbiertas.length },
  ];

  if (cargando) {
    return (
      <div className="compras__content">
        <p className="compras__subtitle">Cargando módulo de compras…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="compras__content">
        <div className="ui-error">{error}</div>
      </div>
    );
  }

  const KPIS = [
    { label: "Órdenes abiertas", value: ocAbiertas.length, sub: "OC activas", icon: ClipboardList, var: "amber" },
    { label: "Facturas de compra", value: facturas.length, sub: "Pendientes de pago", icon: Receipt, var: "blue" },
    { label: "Entregas en proceso", value: entregasProceso.length, sub: "Próximas entregas", icon: Truck, var: "green" },
    { label: "Proveedores", value: proveedores.length, sub: "Registrados", icon: Store, var: "soft" },
  ];

  return (
    <div className="compras">
      <div className="compras__tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`compras__tab ${tab === t.id ? "compras__tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span className="compras__tab-count">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="compras__content">
        {/* ---- Dashboard ---- */}
        {tab === "dashboard" && (
          <div>
            <div className="compras__kpis">
              {KPIS.map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className={`compras__kpi compras__kpi--${k.var}`}>
                    <div className="compras__kpi-icon">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="compras__kpi-value">{k.value}</p>
                      <p className="compras__kpi-label">{k.label}</p>
                      <p className="compras__kpi-sub">{k.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="compras__quick">
              <button
                className="compras__quick-btn"
                onClick={() => {
                  setTab("ordenes");
                  setOcFormOpen(true);
                }}
              >
                <Plus size={15} /> Nueva orden de compra
              </button>
              <button
                className="compras__quick-btn"
                onClick={() => {
                  setTab("proveedores");
                  setProvFormOpen(true);
                }}
              >
                <Plus size={15} /> Registrar proveedor
              </button>
            </div>

            <div className="compras__section-head">
              <h2 className="compras__title">Órdenes recientes</h2>
              <button className="ui-btn ui-btn--secondary" onClick={() => setTab("ordenes")}>
                Ver todas <ChevronRight size={14} />
              </button>
            </div>

            <div className="ui-panel compras__table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>N° OC</th>
                    <th>Proveedor</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesFiltradas.slice(0, 5).map((o) => (
                    <tr
                      key={o.id}
                      className={`compras__fila ${OC_CLASE_FILA[o.estado_orden]}`}
                      onClick={() => {
                        setOcSel(o);
                        setTab("ordenes");
                      }}
                    >
                      <td className="compras__filtro-num">#{String(o.id).padStart(3, "0")}</td>
                      <td style={{ fontWeight: 600 }}>{nombreProveedor(o.proveedor_id)}</td>
                      <td>{fecha(o.fecha_generada)}</td>
                      <td style={{ fontWeight: 700 }}>{q(totalOrden(o.id))}</td>
                      <td>
                        <span className={`compras__tag ${OC_CLASE[o.estado_orden]}`}>
                          {OC_LABEL[o.estado_orden]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- Proveedores ---- */}
        {tab === "proveedores" && (
          <div>
            <div className="compras__section-head">
              <div>
                <h2 className="compras__title">Proveedores</h2>
                <p className="compras__subtitle">{proveedores.length} proveedores registrados</p>
              </div>
              <button className="ui-btn ui-btn--primary" onClick={() => setProvFormOpen((v) => !v)}>
                <Plus size={14} /> {provFormOpen ? "Cerrar formulario" : "Nuevo proveedor"}
              </button>
            </div>

            {provFormOpen && (
              <div className="ui-panel compras__box">
                <h3 className="compras__title compras__form-title">Registrar proveedor</h3>
                <div className="compras__form-grid">
                  <div className="compras__field">
                    <label className="compras__label">Razón social</label>
                    <input
                      className="ui-input"
                      type="text"
                      placeholder="Nombre del proveedor"
                      value={provForm.proveedor}
                      onChange={(e) => setProvForm({ ...provForm, proveedor: e.target.value })}
                    />
                  </div>
                  <div className="compras__field">
                    <label className="compras__label">NIT</label>
                    <input
                      className="ui-input"
                      type="text"
                      placeholder="12345678"
                      value={provForm.noNit}
                      onChange={(e) => setProvForm({ ...provForm, noNit: e.target.value })}
                    />
                  </div>
                  <div className="compras__field">
                    <label className="compras__label">Dirección</label>
                    <input
                      className="ui-input"
                      type="text"
                      placeholder="Dirección fiscal"
                      value={provForm.direccion}
                      onChange={(e) => setProvForm({ ...provForm, direccion: e.target.value })}
                    />
                  </div>
                </div>
                {provErrores && <div className="ui-error">{provErrores}</div>}
                <div className="compras__form-actions">
                  <button className="ui-btn ui-btn--primary" onClick={guardarProveedor}>
                    Guardar proveedor
                  </button>
                  <button className="ui-btn ui-btn--secondary" onClick={() => setProvFormOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="compras__search">
              <Search size={15} className="compras__search-icon" />
              <input
                className="compras__search-input"
                type="text"
                placeholder="Buscar proveedor, NIT..."
                value={provBusca}
                onChange={(e) => setProvBusca(e.target.value)}
              />
            </div>

            <div className="compras__split">
              <div className="ui-panel compras__table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>NIT</th>
                      <th>Dirección</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedoresFiltrados.map((p) => (
                      <tr
                        key={p.id}
                        className={`compras__fila ${provSel?.id === p.id ? "compras__row--selected" : ""}`}
                        onClick={() => setProvSel(p)}
                      >
                        <td style={{ fontWeight: 600 }}>
                          {p.proveedor}
                        </td>
                        <td>{p.no_nit}</td>
                        <td>{p.direccion}</td>
                        <td>
                          <button
                            className="ui-btn ui-btn--ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProvSel(p);
                            }}
                          >
                            <Eye size={14} /> Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {provSel && (
                <div className="compras__aside">
                  <div className="compras__aside-head">
                    <h3 className="compras__aside-title">{provSel.proveedor}</h3>
                    <button className="compras__aside-close" onClick={() => setProvSel(null)}>
                      <X size={15} />
                    </button>
                  </div>
                  <div className="compras__aside-grid compras__aside-grid--1">
                    <div>
                      <p className="compras__aside-label">NIT</p>
                      <p className="compras__aside-value">{provSel.no_nit}</p>
                    </div>
                    <div>
                      <p className="compras__aside-label">Dirección</p>
                      <p className="compras__aside-value">{provSel.direccion ?? "—"}</p>
                    </div>
                  </div>
                  <div className="compras__aside-sec">
                    <p className="compras__aside-sec-title">Órdenes de este proveedor</p>
                    {ordenes.filter((o) => o.proveedor_id === provSel.id).length === 0 ? (
                      <p className="compras__subtitle" style={{ marginTop: 0 }}>
                        Sin órdenes registradas.
                      </p>
                    ) : (
                      ordenes
                        .filter((o) => o.proveedor_id === provSel.id)
                        .map((o) => (
                          <div key={o.id} className="compras__item">
                            <span className="compras__item-name">OC #{codigoOC(o.id)}</span>
                            <span className="compras__item-meta">
                              <span className={`compras__tag ${OC_CLASE[o.estado_orden]}`}>
                                {OC_LABEL[o.estado_orden]}
                              </span>{" "}
                              {q(totalOrden(o.id))}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- Órdenes de compra ---- */}
        {tab === "ordenes" && (
          <div>
            <div className="compras__section-head">
              <div>
                <h2 className="compras__title">Órdenes de Compra</h2>
                <p className="compras__subtitle">{ordenes.length} órdenes en total</p>
              </div>
              <button className="ui-btn ui-btn--primary" onClick={() => setOcFormOpen((v) => !v)}>
                <Plus size={14} /> {ocFormOpen ? "Cerrar formulario" : "Generar Orden de Compra"}
              </button>
            </div>

            {ocFormOpen && (
              <div className="ui-panel compras__box">
                <h3 className="compras__title compras__form-title">Nueva orden de compra</h3>
                <div className="compras__form-grid">
                  <div className="compras__field">
                    <label className="compras__label">Proveedor</label>
                    <select
                      className="ui-select"
                      value={ocForm.proveedor_id}
                      onChange={(e) => setOcForm({ ...ocForm, proveedor_id: Number(e.target.value) })}
                    >
                      <option value={0}>Seleccionar…</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.proveedor}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="compras__field">
                    <label className="compras__label">Sucursal destino</label>
                    <select
                      className="ui-select"
                      value={ocForm.sucursal_id}
                      onChange={(e) => setOcForm({ ...ocForm, sucursal_id: Number(e.target.value) })}
                    >
                      <option value={0}>Seleccionar…</option>
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.sucursal}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="compras__aside-sec" style={{ marginTop: "1rem" }}>
                  <p className="compras__aside-sec-title">Ítems</p>
                  <div className="compras__field" style={{ marginBottom: "0.5rem" }}>
                    {ocForm.items.map((it, idx) => (
                      <div key={idx} className="compras__item-row">
                        <div className="compras__field">
                          <label className="compras__label">Materia prima</label>
                          <select
                            className="ui-select"
                            value={it.materia_prima_id}
                            onChange={(e) =>
                              setItem(idx, { materia_prima_id: Number(e.target.value) })
                            }
                          >
                            <option value={0}>Seleccionar…</option>
                            {materiasPrimas.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.materia_prima}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="compras__field">
                          <label className="compras__label">Cantidad</label>
                          <input
                            className="ui-input"
                            type="number"
                            min={1}
                            value={it.cantidad_solicitada}
                            onChange={(e) =>
                              setItem(idx, { cantidad_solicitada: Number(e.target.value) })
                            }
                          />
                        </div>
                        <div className="compras__field">
                          <label className="compras__label">Precio unitario (Q)</label>
                          <input
                            className="ui-input"
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.precio_unitario}
                            onChange={(e) =>
                              setItem(idx, { precio_unitario: Number(e.target.value) })
                            }
                          />
                        </div>
                        <button className="compras__aside-close" onClick={() => eliminarItem(idx)}>
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="ui-btn ui-btn--secondary" onClick={agregarItem}>
                    <Plus size={14} /> Agregar ítem
                  </button>
                </div>

                {ocErrores && <div className="ui-error">{ocErrores}</div>}
                <div className="compras__form-actions">
                  <button className="ui-btn ui-btn--primary" onClick={guardarOrden}>
                    Generar orden
                  </button>
                  <button className="ui-btn ui-btn--secondary" onClick={() => setOcFormOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="compras__filtros">
              <div className="compras__field">
                <label className="compras__label">Estado</label>
                <select
                  className="ui-select"
                  value={fEstado}
                  onChange={(e) => setFEstado(e.target.value as "" | EstadoOrdenCompra)}
                >
                  <option value="">Todos</option>
                  {(Object.keys(OC_LABEL) as EstadoOrdenCompra[]).map((s) => (
                    <option key={s} value={s}>
                      {OC_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="compras__field">
                <label className="compras__label">Proveedor</label>
                <select
                  className="ui-select"
                  value={fProveedor}
                  onChange={(e) => setFProveedor(Number(e.target.value))}
                >
                  <option value={0}>Todos</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.proveedor}
                    </option>
                  ))}
                </select>
              </div>
              <div className="compras__field">
                <label className="compras__label">Fecha</label>
                <input
                  className="ui-input"
                  type="date"
                  value={fFecha}
                  onChange={(e) => setFFecha(e.target.value)}
                />
              </div>
            </div>

            <div className="compras__split">
              <div className="ui-panel compras__table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>N° OC</th>
                      <th>Proveedor</th>
                      <th>Sucursal</th>
                      <th>Fecha</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesFiltradas.map((o) => (
                      <tr
                        key={o.id}
                        className={`compras__fila ${ocSel?.id === o.id ? "compras__row--selected" : ""}`}
                        onClick={() => setOcSel(o)}
                      >
                        <td className="compras__filtro-num">#{String(o.id).padStart(3, "0")}</td>
                        <td style={{ fontWeight: 600 }}>{nombreProveedor(o.proveedor_id)}</td>
                        <td>{nombreSucursal(o.sucursal_destino)}</td>
                        <td>{fecha(o.fecha_generada)}</td>
                        <td style={{ fontWeight: 700 }}>{q(totalOrden(o.id))}</td>
                        <td>
                          <span className={`compras__tag ${OC_CLASE[o.estado_orden]}`}>
                            {OC_LABEL[o.estado_orden]}
                          </span>
                        </td>
                        <td>
                          <button
                            className="ui-btn ui-btn--ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOcSel(o);
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {ocSel && (
                <div className="compras__aside">
                  <div className="compras__aside-head">
                    <h3 className="compras__aside-title">OC #{codigoOC(ocSel.id)}</h3>
                    <button className="compras__aside-close" onClick={() => setOcSel(null)}>
                      <X size={15} />
                    </button>
                  </div>
                  <span className={`compras__tag ${OC_CLASE[ocSel.estado_orden]}`}>
                    {OC_LABEL[ocSel.estado_orden]}
                  </span>
                  <div className="compras__aside-grid" style={{ marginTop: "0.6rem" }}>
                    <div>
                      <p className="compras__aside-label">Proveedor</p>
                      <p className="compras__aside-value">{nombreProveedor(ocSel.proveedor_id)}</p>
                    </div>
                    <div>
                      <p className="compras__aside-label">Sucursal</p>
                      <p className="compras__aside-value">{nombreSucursal(ocSel.sucursal_destino)}</p>
                    </div>
                    <div>
                      <p className="compras__aside-label">Fecha OC</p>
                      <p className="compras__aside-value">{fecha(ocSel.fecha_generada)}</p>
                    </div>
                  </div>

                  <div className="compras__aside-sec">
                    <p className="compras__aside-sec-title">Productos</p>
                    {(detalles[ocSel.id] ?? []).map((d) => (
                      <div key={d.id} className="compras__item">
                        <span className="compras__item-name">{nombreMp(d.materia_prima_id)}</span>
                        <span className="compras__item-meta">
                          {d.cantidad_solicitada} {unidadAbrev(d.materia_prima_id)} × {q(d.precio_unitario)} ={" "}
                          {q(d.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="compras__total">
                    <span className="compras__total-label">Total</span>
                    <span className="compras__total-value">{q(totalOrden(ocSel.id))}</span>
                  </div>

                  {ocSel.estado_orden !== "ANULADO" && ocSel.estado_orden !== "FINALIZADO" && (
                    <div className="compras__acciones-estado">
                      {ocSel.estado_orden === "CREADA" && (
                        <button
                          className="compras__btn--success"
                          onClick={() => cambiarEstado(ocSel, "EN_PROCESO")}
                        >
                          Iniciar proceso
                        </button>
                      )}
                      {ocSel.estado_orden === "EN_PROCESO" && (
                        <button
                          className="compras__btn--success"
                          onClick={() => cambiarEstado(ocSel, "FINALIZADO")}
                        >
                          Marcar finalizada
                        </button>
                      )}
                      <button
                        className="compras__btn--danger"
                        onClick={() => cambiarEstado(ocSel, "ANULADO")}
                      >
                        Anular orden
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Formatea el número de OC como código de tres dígitos.
function codigoOC(id: number | null | undefined): string {
  return String(id ?? 0).padStart(3, "0");
}