import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  PackageCheck,
  Plus,
  Star,
  Truck,
  X,
} from "lucide-react";
import "../styles/ui.css";
import "../styles/bodega.css";
import { bodegasService } from "../services/bodegas.service";
import { lotesMateriaPrimaService } from "../services/lotesMateriaPrima.service";
import { materiasPrimasService } from "../services/materiasPrimas.service";
import { unidadesMedidaService } from "../services/unidadesMedida.service";
import { categoriasService } from "../services/categorias.service";
import { sucursalesService } from "../services/sucursales.service";
import { usuariosService } from "../services/usuarios.service";
import { proveedoresService } from "../services/proveedores.service";
import { ordenesCompraService } from "../services/ordenesCompra.service";
import { hojasRecepcionService } from "../services/hojasRecepcion.service";
import { solicitudesInsumoService } from "../services/solicitudesInsumo.service";
import { trasladosService } from "../services/traslados.service";
import { cuadreService } from "../services/cuadre.service";
import type {
  Bodega as BodegaModel,
  Categoria,
  CuadreInventario,
  DetalleOrdenCompra,
  DetalleSolicitudInsumo,
  EstadoLote,
  EstadoOrdenCompra,
  EstadoRecepcion,
  EstadoSolicitudInsumo,
  EstadoTraslado,
  HojaRecepcion,
  HojaRecepcionDetalle,
  LoteMateriaPrima,
  MateriaPrima,
  OrdenCompra,
  Proveedor,
  SolicitudInsumo,
  Sucursal,
  TipoRecepcion,
  TrasladoInventario,
  UnidadMedida,
  Usuario,
} from "../types";

type BTab = "dashboard" | "recepcion" | "fefo" | "traslados" | "cuadre" | "solicitudes";

interface RecItem {
  materia_prima_id: number;
  cantidad_recibida: number;
  fecha_vencimiento: string;
}

const OC_LABEL: Record<EstadoOrdenCompra, string> = {
  CREADA: "Creada",
  EN_PROCESO: "En proceso",
  FINALIZADO: "Finalizada",
  ANULADO: "Anulada",
};

const OC_TAG: Record<EstadoOrdenCompra, string> = {
  CREADA: "bodega__tag--warning",
  EN_PROCESO: "bodega__tag--info",
  FINALIZADO: "bodega__tag--success",
  ANULADO: "bodega__tag--danger",
};

const SOL_LABEL: Record<EstadoSolicitudInsumo, string> = {
  PENDIENTE: "Pendiente",
  ENVIADA: "Enviada",
  RECIBIDA: "Recibida",
  CANCELADA: "Cancelada",
};

const SOL_TAG: Record<EstadoSolicitudInsumo, string> = {
  PENDIENTE: "bodega__tag--warning",
  ENVIADA: "bodega__tag--info",
  RECIBIDA: "bodega__tag--success",
  CANCELADA: "bodega__tag--danger",
};

const TRAS_LABEL: Record<EstadoTraslado, string> = {
  PENDIENTE: "Pendiente",
  EN_TRANSITO: "En tránsito",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

const TRAS_TAG: Record<EstadoTraslado, string> = {
  PENDIENTE: "bodega__tag--warning",
  EN_TRANSITO: "bodega__tag--info",
  COMPLETADO: "bodega__tag--success",
  CANCELADO: "bodega__tag--danger",
};

const LOTE_TAG: Record<EstadoLote, string> = {
  VIGENTE: "bodega__tag--success",
  VENCIDO: "bodega__tag--danger",
  AGOTADO: "bodega__tag--muted",
};

const pad = (n: number | null | undefined) => String(n ?? 0).padStart(3, "0");

// Las fechas sin hora ("YYYY-MM-DD") se interpretan como locales; de lo contrario
// new Date() las trata como UTC y en zonas UTC-6 (Guatemala) restan un día.
const parseFecha = (iso: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
};

const fecha = (iso: string) =>
  parseFecha(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" });

const diasRestantes = (iso: string): number => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = parseFecha(iso);
  venc.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoy.getTime()) / 86400000);
};

export default function Bodega() {
  const [tab, setTab] = useState<BTab>("dashboard");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bodegas, setBodegas] = useState<BodegaModel[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [detalleOC, setDetalleOC] = useState<Record<number, DetalleOrdenCompra[]>>({});
  const [recepciones, setRecepciones] = useState<HojaRecepcion[]>([]);
  const [detalleRecep, setDetalleRecep] = useState<Record<number, HojaRecepcionDetalle[]>>({});
  const [lotes, setLotes] = useState<LoteMateriaPrima[]>([]);
  const [traslados, setTraslados] = useState<TrasladoInventario[]>([]);
  const [cuadre, setCuadre] = useState<CuadreInventario[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudInsumo[]>([]);
  const [detalleSol, setDetalleSol] = useState<DetalleSolicitudInsumo[]>([]);

  const [bodegaSel, setBodegaSel] = useState(0);

  const [recOC, setRecOC] = useState(0);
  const [recItems, setRecItems] = useState<RecItem[]>([]);
  const [recMsg, setRecMsg] = useState("");

  const [trasFormOpen, setTrasFormOpen] = useState(false);
  const [trasForm, setTrasForm] = useState({ origen: 0, destino: 0, materia_prima_id: 0, cantidad: 1, motivo: "" });
  const [trasMsg, setTrasMsg] = useState("");

  const [cuadreEdit, setCuadreEdit] = useState<Record<number, { stock_fisico: number; justificacion: string }>>({});
  const [cuadreMsg, setCuadreMsg] = useState("");

  const [solSel, setSolSel] = useState<SolicitudInsumo | null>(null);

  const cargarLotes = useCallback(async (bodegaId: number, mps: MateriaPrima[]) => {
    if (!bodegaId || mps.length === 0) {
      setLotes([]);
      return;
    }
    const listas = await Promise.all(mps.map((mp) => lotesMateriaPrimaService.getFefo(bodegaId, mp.id)));
    const unicos = new Map<number, LoteMateriaPrima>();
    listas.flat().forEach((l) => unicos.set(l.id, l));
    setLotes(Array.from(unicos.values()));
  }, []);

  const cargar = useCallback(async () => {
    try {
      const [bods, sucs, mps, uns, cats, usrs, provs, ords, recs, tras, cua, sols, dets] = await Promise.all([
        bodegasService.getAll(),
        sucursalesService.getAll(),
        materiasPrimasService.getAll(),
        unidadesMedidaService.getAll(),
        categoriasService.getAll(),
        usuariosService.getAll(),
        proveedoresService.getAll(),
        ordenesCompraService.getAll(),
        hojasRecepcionService.getAll(),
        trasladosService.getAll(),
        cuadreService.getAll(),
        solicitudesInsumoService.getAll(),
        solicitudesInsumoService.getDetalles(),
      ]);

      const detOCArr = await Promise.all(ords.map((o) => ordenesCompraService.getById(o.id)));
      const mapaOC: Record<number, DetalleOrdenCompra[]> = {};
      detOCArr.forEach((d) => {
        mapaOC[d.id] = d.detalles;
      });

      const detRecArr = await Promise.all(recs.map((r) => hojasRecepcionService.getById(r.id)));
      const mapaRec: Record<number, HojaRecepcionDetalle[]> = {};
      detRecArr.forEach((r) => {
        mapaRec[r.id] = r.detalles;
      });

      setBodegas(bods);
      setSucursales(sucs);
      setMateriasPrimas(mps);
      setUnidades(uns);
      setCategorias(cats);
      setUsuarios(usrs);
      setProveedores(provs);
      setOrdenes(ords);
      setDetalleOC(mapaOC);
      setRecepciones(recs);
      setDetalleRecep(mapaRec);
      setTraslados(tras);
      setCuadre(cua);
      setSolicitudes(sols);
      setDetalleSol(dets);

      const bodegaId = bods[0]?.id ?? 0;
      setBodegaSel(bodegaId);
      await cargarLotes(bodegaId, mps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el módulo de bodega.");
    }
  }, [cargarLotes]);

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

  const cambiarBodega = async (id: number) => {
    setBodegaSel(id);
    await cargarLotes(id, materiasPrimas);
  };

  const mpNombre = (id: number | null) =>
    materiasPrimas.find((m) => m.id === id)?.materia_prima ?? `MP #${id ?? "—"}`;
  const unidadAbrev = (mpId: number) => {
    const mp = materiasPrimas.find((m) => m.id === mpId);
    return unidades.find((u) => u.id === mp?.unidad_medida_id)?.abreviatura ?? "u";
  };
  const catNombre = (mpId: number) => {
    const mp = materiasPrimas.find((m) => m.id === mpId);
    return categorias.find((c) => c.id === mp?.categoria_id)?.descripcion ?? "Sin categoría";
  };
  const sucNombre = (id: number | null) => sucursales.find((s) => s.id === id)?.sucursal ?? `Sucursal #${id ?? "—"}`;
  const bodNombre = (id: number) => bodegas.find((b) => b.id === id)?.bodega ?? `Bodega #${id}`;
  const usuarioNombre = (id: number | null) => {
    const u = usuarios.find((x) => x.id === id);
    return u?.usuario ?? u?.correo_electronico ?? `Usuario #${id ?? "—"}`;
  };

  /* ---------- Derivados ---------- */
  const ocProgramadas = useMemo(
    () => ordenes.filter((o) => o.estado_orden === "CREADA" || o.estado_orden === "EN_PROCESO"),
    [ordenes]
  );

  const lotesPorMateria = useMemo(() => {
    const grupos = new Map<number, LoteMateriaPrima[]>();
    lotes.forEach((l) => {
      const arr = grupos.get(l.materia_prima_id) ?? [];
      arr.push(l);
      grupos.set(l.materia_prima_id, arr);
    });
    return Array.from(grupos.entries())
      .map(([mpId, ls]) => {
        const ordenados = [...ls].sort(
          (a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
        );
        return {
          mpId,
          lotes: ordenados,
          proximo: ordenados[0] ? new Date(ordenados[0].fecha_vencimiento).getTime() : Infinity,
        };
      })
      .sort((a, b) => a.proximo - b.proximo);
  }, [lotes]);

  const proxVencer = useMemo(
    () => lotes.filter((l) => l.estado === "VIGENTE" && l.cantidad_actual > 0 && diasRestantes(l.fecha_vencimiento) <= 30),
    [lotes]
  );

  const trasladosRecientes = useMemo(
    () => [...traslados].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5),
    [traslados]
  );

  const nombreProveedor = (id: number | null) =>
    proveedores.find((p) => p.id === id)?.proveedor ?? `Proveedor #${id ?? "—"}`;

  const recepEstado = (id: number): EstadoRecepcion | null => {
    const dets = detalleRecep[id] ?? [];
    if (dets.length === 0) return null;
    return dets.every((d) => d.estado === "COMPLETA") ? "COMPLETA" : "INCOMPLETA";
  };

  const recOCobj = ordenes.find((o) => o.id === recOC) ?? null;

  /* ---------- Acciones ---------- */
  const abrirRecepcion = async (ocId: number) => {
    setTab("recepcion");
    setRecMsg("");
    setRecOC(ocId);
    const oc = ordenes.find((o) => o.id === ocId);
    const detalles = detalleOC[ocId] ?? (oc ? (await ordenesCompraService.getById(ocId)).detalles : []);
    setRecItems(
      detalles.map((d) => ({
        materia_prima_id: d.materia_prima_id,
        cantidad_recibida: d.cantidad_solicitada,
        fecha_vencimiento: "",
      }))
    );
  };

  const seleccionarOC = async (id: number) => {
    setRecMsg("");
    setRecOC(id);
    if (!id) {
      setRecItems([]);
      return;
    }
    const detalles = detalleOC[id] ?? (await ordenesCompraService.getById(id)).detalles;
    setRecItems(
      detalles.map((d) => ({
        materia_prima_id: d.materia_prima_id,
        cantidad_recibida: d.cantidad_solicitada,
        fecha_vencimiento: "",
      }))
    );
  };

  const setRecItem = (idx: number, patch: Partial<RecItem>) =>
    setRecItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const confirmarRecepcion = async (tipo: TipoRecepcion) => {
    if (!recOC || !recOCobj) return;
    const items = recItems
      .filter((i) => i.cantidad_recibida > 0 && i.fecha_vencimiento)
      .map((i) => ({
        materia_prima_id: i.materia_prima_id,
        cantidad_recibida: i.cantidad_recibida,
        fecha_vencimiento: i.fecha_vencimiento,
      }));
    if (items.length === 0) {
      setRecMsg("Ingresa al menos una cantidad recibida con su fecha de vencimiento.");
      return;
    }
    try {
      await hojasRecepcionService.create({
        sucursal_receptora: recOCobj.sucursal_destino ?? sucursales[0]?.id ?? 0,
        orden_compra_id: recOC,
        tipo_recepcion: tipo,
        items,
      });
      setRecMsg("Recepción registrada correctamente.");
    } catch {
      setRecMsg("No se pudo registrar la recepción.");
    }
  };

  const crearTraslado = () => {
    setTrasMsg("Función no disponible: el endpoint de traslados está pendiente en el backend.");
  };

  const guardarCuadre = () => {
    setCuadreMsg("Función no disponible: el endpoint de cuadre está pendiente en el backend.");
  };

  const valorCuadre = (row: CuadreInventario) => {
    const edit = cuadreEdit[row.id];
    const fisico = edit ? edit.stock_fisico : (row.stock_fisico ?? row.stock_sistema);
    const justificacion = edit ? edit.justificacion : (row.justificacion ?? "");
    return { fisico, justificacion, diferencia: fisico - row.stock_sistema };
  };

  const alertasTodos: {
    tipo: "danger" | "warning" | "info";
    titulo: string;
    sub: string;
    accion: string;
    onClick: () => void;
  }[] = [];

  lotes
    .filter((l) => l.estado === "VENCIDO")
    .forEach((l) =>
      alertasTodos.push({
        tipo: "danger",
        titulo: `${mpNombre(l.materia_prima_id)} con lote vencido`,
        sub: `Lote #${pad(l.id)} · venció el ${fecha(l.fecha_vencimiento)}`,
        accion: "Ver FEFO →",
        onClick: () => setTab("fefo"),
      })
    );

  lotes
    .filter((l) => l.estado === "VIGENTE" && l.cantidad_actual > 0 && diasRestantes(l.fecha_vencimiento) <= 7)
    .forEach((l) => {
      const dias = diasRestantes(l.fecha_vencimiento);
      alertasTodos.push({
        tipo: "warning",
        titulo: `${mpNombre(l.materia_prima_id)} por vencer`,
        sub: `Lote #${pad(l.id)} · ${dias <= 0 ? "vence hoy" : `vence en ${dias} día(s)`}`,
        accion: "Planificar uso →",
        onClick: () => setTab("fefo"),
      });
    });

  ocProgramadas
    .filter((o) => o.estado_orden === "EN_PROCESO")
    .forEach((o) =>
      alertasTodos.push({
        tipo: "info",
        titulo: `Orden de compra #${pad(o.id)} en proceso`,
        sub: `${nombreProveedor(o.proveedor_id)} · ${sucNombre(o.sucursal_destino)}`,
        accion: "Ver orden →",
        onClick: () => abrirRecepcion(o.id),
      })
    );

  const alertas = alertasTodos.slice(0, 6);

  if (cargando) {
    return (
      <div className="bodega__content">
        <p className="bodega__subtitle">Cargando módulo de bodega…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bodega__content">
        <div className="ui-error">{error}</div>
      </div>
    );
  }

  const KPIS = [
    { label: "Recepciones", value: recepciones.length, sub: "Total registradas", icon: PackageCheck, var: "green" },
    { label: "OC pendientes", value: ocProgramadas.length, sub: "Por recibir", icon: ClipboardList, var: "amber" },
    { label: "Próx. a vencer", value: proxVencer.length, sub: "Lotes ≤ 30 días", icon: CalendarClock, var: "red" },
  ];

  const TABS: { id: BTab; label: string; count?: number }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "recepcion", label: "Recepción", count: ocProgramadas.length },
    { id: "fefo", label: "Control FEFO", count: lotesPorMateria.length },
    { id: "traslados", label: "Traslados", count: traslados.length },
    { id: "cuadre", label: "Cuadre" },
    { id: "solicitudes", label: "Solicitudes", count: solicitudes.filter((s) => s.estado === "PENDIENTE").length },
  ];

  const cuadreTotal = cuadre.length;
  const cuadreConDif = cuadre.filter((r) => valorCuadre(r).diferencia !== 0).length;
  const cuadreDifNeta = cuadre.reduce((s, r) => s + valorCuadre(r).diferencia, 0);

  return (
    <div className="bodega">
      <div className="bodega__tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`bodega__tab ${tab === t.id ? "bodega__tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && <span className="bodega__tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="bodega__content">
        <div className="bodega__section-head">
          <div>
            <h1 className="bodega__title">Módulo de Bodega</h1>
            <p className="bodega__subtitle">Control de inventario, recepciones y trazabilidad por lotes</p>
          </div>
          <div className="bodega__head-actions">
            <label className="bodega__label">Bodega</label>
            <select
              className="ui-select"
              style={{ width: "auto", minWidth: "200px" }}
              value={bodegaSel}
              onChange={(e) => cambiarBodega(Number(e.target.value))}
            >
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bodega}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ============ Dashboard ============ */}
        {tab === "dashboard" && (
          <div>
            <div className="bodega__kpis">
              {KPIS.map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className={`bodega__kpi bodega__kpi--${k.var}`}>
                    <div className="bodega__kpi-icon">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="bodega__kpi-value">{k.value}</p>
                      <p className="bodega__kpi-label">{k.label}</p>
                      <p className="bodega__kpi-sub">{k.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bodega__cols">
              <div className="ui-panel bodega__box">
                <div className="bodega__box-head">
                  <h3 className="bodega__box-title">Alertas de bodega</h3>
                  <span className="bodega__list-meta">{alertas.length} alerta(s)</span>
                </div>
                {alertas.length === 0 ? (
                  <div className="bodega__empty">
                    <CheckCircle2 size={28} className="bodega__empty-icon" />
                    <p>Sin alertas. Todo en orden.</p>
                  </div>
                ) : (
                  alertas.map((a, i) => (
                    <div key={i} className={`bodega__alert bodega__alert--${a.tipo}`}>
                      <span className="bodega__alert-icon">
                        {a.tipo === "info" ? <Truck size={16} /> : <AlertTriangle size={16} />}
                      </span>
                      <div className="bodega__alert-body">
                        <p className="bodega__alert-text">{a.titulo}</p>
                        <p className="bodega__alert-sub">{a.sub}</p>
                      </div>
                      <button className="bodega__alert-action" onClick={a.onClick}>
                        {a.accion}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="ui-panel bodega__box">
                <div className="bodega__box-head">
                  <h3 className="bodega__box-title">Traslados recientes</h3>
                  <button className="ui-btn ui-btn--ghost" onClick={() => setTab("traslados")}>
                    Ver todos <ChevronRight size={14} />
                  </button>
                </div>
                {trasladosRecientes.length === 0 ? (
                  <div className="bodega__empty">
                    <ArrowLeftRight size={28} className="bodega__empty-icon" />
                    <p>Sin traslados registrados.</p>
                  </div>
                ) : (
                  trasladosRecientes.map((t) => (
                    <div key={t.id} className="bodega__list-row">
                      <span className="bodega__list-main">
                        {mpNombre(t.materia_prima_id)} · {t.cantidad} {unidadAbrev(t.materia_prima_id)}
                      </span>
                      <span className="bodega__list-meta">
                        {bodNombre(t.bodega_origen_id)} → {bodNombre(t.bodega_destino_id)}
                      </span>
                      <span className={`bodega__tag ${TRAS_TAG[t.estado]}`}>{TRAS_LABEL[t.estado]}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ Recepción ============ */}
        {tab === "recepcion" && (
          <div>
            <div className="ui-panel bodega__form">
              <div className="bodega__field" style={{ maxWidth: "420px" }}>
                <label className="bodega__label">Orden de compra a recibir</label>
                <select className="ui-select" value={recOC} onChange={(e) => seleccionarOC(Number(e.target.value))}>
                  <option value={0}>Seleccionar…</option>
                  {ocProgramadas.map((o) => (
                    <option key={o.id} value={o.id}>
                      OC #{pad(o.id)} · {nombreProveedor(o.proveedor_id)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {recOC > 0 && recOCobj && (
              <>
                <div className="ui-panel bodega__rec-head">
                  <div className="bodega__rec-meta">
                    <div>
                      <p className="bodega__rec-meta-label">Orden de compra</p>
                      <p className="bodega__rec-meta-value">#{pad(recOC)}</p>
                    </div>
                    <div>
                      <p className="bodega__rec-meta-label">Proveedor</p>
                      <p className="bodega__rec-meta-value">{nombreProveedor(recOCobj.proveedor_id)}</p>
                    </div>
                    <div>
                      <p className="bodega__rec-meta-label">Sucursal destino</p>
                      <p className="bodega__rec-meta-value">{sucNombre(recOCobj.sucursal_destino)}</p>
                    </div>
                    <div>
                      <p className="bodega__rec-meta-label">Fecha OC</p>
                      <p className="bodega__rec-meta-value">{fecha(recOCobj.fecha_generada)}</p>
                    </div>
                  </div>
                  <span className={`bodega__tag ${OC_TAG[recOCobj.estado_orden]}`}>{OC_LABEL[recOCobj.estado_orden]}</span>
                </div>

                <div className="ui-panel bodega__table-wrap">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Solicitado</th>
                        <th>Recibido</th>
                        <th>Diferencia</th>
                        <th>Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recItems.map((it, idx) => {
                        const solicitado = detalleOC[recOC]?.find((d) => d.materia_prima_id === it.materia_prima_id)?.cantidad_solicitada ?? 0;
                        const dif = it.cantidad_recibida - solicitado;
                        return (
                          <tr key={idx}>
                            <td className="bodega__strong">{mpNombre(it.materia_prima_id)}</td>
                            <td>
                              {solicitado} {unidadAbrev(it.materia_prima_id)}
                            </td>
                            <td>
                              <input
                                className="bodega__cell-input"
                                type="number"
                                min={0}
                                value={it.cantidad_recibida}
                                onChange={(e) => setRecItem(idx, { cantidad_recibida: Number(e.target.value) })}
                              />
                            </td>
                            <td className={dif < 0 ? "bodega__neg" : dif > 0 ? "bodega__pos" : ""}>{dif}</td>
                            <td>
                              <input
                                className="bodega__cell-input bodega__cell-date"
                                type="date"
                                value={it.fecha_vencimiento}
                                onChange={(e) => setRecItem(idx, { fecha_vencimiento: e.target.value })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bodega__form-actions">
                  <button className="ui-btn ui-btn--primary" onClick={() => confirmarRecepcion("TOTAL")}>
                    Confirmar recepción
                  </button>
                  <button className="ui-btn ui-btn--secondary" onClick={() => confirmarRecepcion("PARCIAL")}>
                    Recepción parcial
                  </button>
                </div>
                {recMsg && <div className="bodega__notice">{recMsg}</div>}
              </>
            )}

            <div className="bodega__section-head" style={{ marginTop: "1.5rem" }}>
              <h2 className="bodega__title">Recepciones registradas</h2>
            </div>
            <div className="ui-panel bodega__table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Hoja</th>
                    <th>OC</th>
                    <th>Sucursal</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recepciones.length === 0 && (
                    <tr>
                      <td colSpan={6} className="bodega__empty">
                        Sin recepciones registradas.
                      </td>
                    </tr>
                  )}
                  {recepciones.map((r) => {
                    const estado = recepEstado(r.id);
                    return (
                      <tr key={r.id}>
                        <td className="bodega__num">HR-{pad(r.id)}</td>
                        <td>{r.orden_compra_id ? `#${pad(r.orden_compra_id)}` : "—"}</td>
                        <td>{sucNombre(r.sucursal_receptora)}</td>
                        <td>{r.tipo_recepcion}</td>
                        <td>{fecha(r.fecha_generada)}</td>
                        <td>
                          {estado ? (
                            <span className={`bodega__tag ${estado === "COMPLETA" ? "bodega__tag--success" : "bodega__tag--warning"}`}>
                              {estado}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ Control FEFO ============ */}
        {tab === "fefo" && (
          <div>
            {lotesPorMateria.length === 0 ? (
              <div className="ui-panel bodega__empty">
                <Boxes size={32} className="bodega__empty-icon" />
                <p>No hay lotes en inventario para esta bodega.</p>
              </div>
            ) : (
              <div className="bodega__fefo-grid">
                {lotesPorMateria.map((g) => {
                  const total = g.lotes.reduce((s, l) => s + l.cantidad_actual, 0);
                  return (
                    <div key={g.mpId} className="bodega__fefo-card">
                      <div className="bodega__fefo-head">
                        <div>
                          <p className="bodega__fefo-name">{mpNombre(g.mpId)}</p>
                          <p className="bodega__fefo-cat">{catNombre(g.mpId)}</p>
                        </div>
                        <span className="bodega__fefo-total">
                          {total} {unidadAbrev(g.mpId)}
                        </span>
                      </div>
                      {g.lotes.map((l, idx) => {
                        const dias = diasRestantes(l.fecha_vencimiento);
                        const pct = l.cantidad_inicial > 0 ? Math.round((l.cantidad_actual / l.cantidad_inicial) * 100) : 0;
                        const critico = l.estado === "VENCIDO" || dias < 0;
                        return (
                          <div key={l.id} className={`bodega__lote ${idx === 0 ? "bodega__lote--primero" : ""}`}>
                            <div className="bodega__lote-fila">
                              <span className="bodega__lote-lote">
                                {idx === 0 && (
                                  <span className="bodega__lote-tag">
                                    <Star size={11} /> Usar primero
                                  </span>
                                )}{" "}
                                Lote #{pad(l.id)}
                              </span>
                              <span className="bodega__lote-stock">
                                {l.cantidad_actual} {unidadAbrev(g.mpId)}
                              </span>
                            </div>
                            <div className="bodega__lote-meta">
                              <span>Vence {fecha(l.fecha_vencimiento)}</span>
                              <span className={critico ? "bodega__crit" : ""}>
                                {l.estado === "VENCIDO" || dias < 0
                                  ? `Vencido (${Math.abs(dias)} d)`
                                  : `${dias} d restantes`}
                              </span>
                            </div>
                            <div className="bodega__bar">
                              <div className="bodega__bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="bodega__lote-meta">
                              <span className={`bodega__tag ${LOTE_TAG[l.estado]}`}>{l.estado}</span>
                              <span>{pct}% del lote</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============ Traslados (mock temporal) ============ */}
        {tab === "traslados" && (
          <div>
            <div className="bodega__section-head">
              <div>
                <h2 className="bodega__title">Traslados de inventario</h2>
                <p className="bodega__subtitle">
                  {traslados.length} traslados · {/* TEMPORAL: no existe tabla ni endpoint en el backend */}
                  datos de demostración
                </p>
              </div>
              <button className="ui-btn ui-btn--primary" onClick={() => setTrasFormOpen((v) => !v)}>
                <Plus size={14} /> {trasFormOpen ? "Cerrar formulario" : "Nuevo traslado"}
              </button>
            </div>

            {trasFormOpen && (
              <div className="ui-panel bodega__form">
                <div className="bodega__form-grid">
                  <div className="bodega__field">
                    <label className="bodega__label">Bodega origen</label>
                    <select
                      className="ui-select"
                      value={trasForm.origen}
                      onChange={(e) => setTrasForm({ ...trasForm, origen: Number(e.target.value) })}
                    >
                      <option value={0}>Seleccionar…</option>
                      {bodegas.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bodega}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bodega__field">
                    <label className="bodega__label">Bodega destino</label>
                    <select
                      className="ui-select"
                      value={trasForm.destino}
                      onChange={(e) => setTrasForm({ ...trasForm, destino: Number(e.target.value) })}
                    >
                      <option value={0}>Seleccionar…</option>
                      {bodegas.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bodega}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bodega__field">
                    <label className="bodega__label">Producto</label>
                    <select
                      className="ui-select"
                      value={trasForm.materia_prima_id}
                      onChange={(e) => setTrasForm({ ...trasForm, materia_prima_id: Number(e.target.value) })}
                    >
                      <option value={0}>Seleccionar…</option>
                      {materiasPrimas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.materia_prima}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bodega__field">
                    <label className="bodega__label">Cantidad</label>
                    <input
                      className="ui-input"
                      type="number"
                      min={1}
                      value={trasForm.cantidad}
                      onChange={(e) => setTrasForm({ ...trasForm, cantidad: Number(e.target.value) })}
                    />
                  </div>
                  <div className="bodega__field">
                    <label className="bodega__label">Motivo</label>
                    <input
                      className="ui-input"
                      type="text"
                      placeholder="Motivo del traslado"
                      value={trasForm.motivo}
                      onChange={(e) => setTrasForm({ ...trasForm, motivo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="bodega__form-actions">
                  <button className="ui-btn ui-btn--primary" onClick={crearTraslado}>
                    Crear traslado
                  </button>
                  <button className="ui-btn ui-btn--secondary" onClick={() => setTrasFormOpen(false)}>
                    Cancelar
                  </button>
                </div>
                {trasMsg && <div className="bodega__notice">{trasMsg}</div>}
              </div>
            )}

            <div className="ui-panel bodega__table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {traslados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="bodega__empty">
                        Sin traslados registrados.
                      </td>
                    </tr>
                  )}
                  {traslados.map((t) => (
                    <tr key={t.id}>
                      <td className="bodega__num">TR-{pad(t.id)}</td>
                      <td>{bodNombre(t.bodega_origen_id)}</td>
                      <td>{bodNombre(t.bodega_destino_id)}</td>
                      <td className="bodega__strong">{mpNombre(t.materia_prima_id)}</td>
                      <td>
                        {t.cantidad} {unidadAbrev(t.materia_prima_id)}
                      </td>
                      <td>{fecha(t.fecha)}</td>
                      <td>
                        <span className={`bodega__tag ${TRAS_TAG[t.estado]}`}>{TRAS_LABEL[t.estado]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ Cuadre (mock temporal) ============ */}
        {tab === "cuadre" && (
          <div>
            <div className="bodega__section-head">
              <div>
                <h2 className="bodega__title">Cuadre de inventario</h2>
                <p className="bodega__subtitle">
                  Comparación entre stock del sistema y conteo físico · {/* TEMPORAL */}
                  datos de demostración
                </p>
              </div>
              <button className="ui-btn ui-btn--primary" onClick={guardarCuadre}>
                Guardar cuadre
              </button>
            </div>

            <div className="bodega__resumen">
              <div className="bodega__resumen-item">
                <p className="bodega__resumen-label">Líneas</p>
                <p className="bodega__resumen-value">{cuadreTotal}</p>
              </div>
              <div className="bodega__resumen-item">
                <p className="bodega__resumen-label">Con diferencia</p>
                <p className="bodega__resumen-value">{cuadreConDif}</p>
              </div>
              <div className="bodega__resumen-item">
                <p className="bodega__resumen-label">Diferencia neta</p>
                <p className={`bodega__resumen-value ${cuadreDifNeta < 0 ? "bodega__neg" : cuadreDifNeta > 0 ? "bodega__pos" : ""}`}>
                  {cuadreDifNeta > 0 ? `+${cuadreDifNeta}` : cuadreDifNeta}
                </p>
              </div>
            </div>

            <div className="ui-panel bodega__table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock sistema</th>
                    <th>Stock físico</th>
                    <th>Diferencia</th>
                    <th>Justificación</th>
                  </tr>
                </thead>
                <tbody>
                  {cuadre.length === 0 && (
                    <tr>
                      <td colSpan={5} className="bodega__empty">
                        Sin datos de cuadre.
                      </td>
                    </tr>
                  )}
                  {cuadre.map((row) => {
                    const { fisico, justificacion, diferencia } = valorCuadre(row);
                    return (
                      <tr key={row.id}>
                        <td className="bodega__strong">{mpNombre(row.materia_prima_id)}</td>
                        <td>
                          {row.stock_sistema} {unidadAbrev(row.materia_prima_id)}
                        </td>
                        <td>
                          <input
                            className="bodega__cell-input"
                            type="number"
                            min={0}
                            value={fisico}
                            onChange={(e) =>
                              setCuadreEdit((prev) => ({
                                ...prev,
                                [row.id]: { stock_fisico: Number(e.target.value), justificacion },
                              }))
                            }
                          />
                        </td>
                        <td className={diferencia < 0 ? "bodega__neg" : diferencia > 0 ? "bodega__pos" : ""}>
                          {diferencia > 0 ? `+${diferencia}` : diferencia}
                        </td>
                        <td>
                          <input
                            className="ui-input"
                            type="text"
                            placeholder="Justificación"
                            value={justificacion}
                            onChange={(e) =>
                              setCuadreEdit((prev) => ({
                                ...prev,
                                [row.id]: { stock_fisico: fisico, justificacion: e.target.value },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {cuadreMsg && <div className="bodega__notice">{cuadreMsg}</div>}
          </div>
        )}

        {/* ============ Solicitudes (mock temporal) ============ */}
        {tab === "solicitudes" && (
          <div>
            <div className="bodega__section-head">
              <div>
                <h2 className="bodega__title">Solicitudes de insumo</h2>
                <p className="bodega__subtitle">
                  {solicitudes.length} solicitudes · {/* TEMPORAL: no existe endpoint en el backend */}
                  datos de demostración
                </p>
              </div>
            </div>

            <div className="bodega__split">
              <div className="ui-panel bodega__table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Sucursal</th>
                      <th>Solicitado por</th>
                      <th>Fecha</th>
                      <th>Ítems</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="bodega__empty">
                          Sin solicitudes registradas.
                        </td>
                      </tr>
                    )}
                    {solicitudes.map((s) => (
                      <tr
                        key={s.id}
                        className={`bodega__fila ${solSel?.id === s.id ? "bodega__row--selected" : ""}`}
                        onClick={() => setSolSel(s)}
                      >
                        <td className="bodega__num">SI-{pad(s.id)}</td>
                        <td>{sucNombre(s.sucursal_id)}</td>
                        <td>{usuarioNombre(s.solicitado_por)}</td>
                        <td>{fecha(s.fecha_solicitud)}</td>
                        <td>{detalleSol.filter((d) => d.solicitud_id === s.id).length}</td>
                        <td>
                          <span className={`bodega__tag ${SOL_TAG[s.estado]}`}>{SOL_LABEL[s.estado]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {solSel && (
                <div className="bodega__aside">
                  <div className="bodega__aside-head">
                    <h3 className="bodega__aside-title">Solicitud SI-{pad(solSel.id)}</h3>
                    <button className="bodega__aside-close" onClick={() => setSolSel(null)}>
                      <X size={15} />
                    </button>
                  </div>
                  <span className={`bodega__tag ${SOL_TAG[solSel.estado]}`}>{SOL_LABEL[solSel.estado]}</span>
                  <div className="bodega__aside-grid" style={{ marginTop: "0.75rem" }}>
                    <div>
                      <p className="bodega__aside-label">Sucursal</p>
                      <p className="bodega__aside-value">{sucNombre(solSel.sucursal_id)}</p>
                    </div>
                    <div>
                      <p className="bodega__aside-label">Solicitado por</p>
                      <p className="bodega__aside-value">{usuarioNombre(solSel.solicitado_por)}</p>
                    </div>
                    <div>
                      <p className="bodega__aside-label">Fecha</p>
                      <p className="bodega__aside-value">{fecha(solSel.fecha_solicitud)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="bodega__aside-sec-title">Insumos</p>
                    {detalleSol.filter((d) => d.solicitud_id === solSel.id).length === 0 ? (
                      <p className="bodega__subtitle">Sin ítems.</p>
                    ) : (
                      detalleSol
                        .filter((d) => d.solicitud_id === solSel.id)
                        .map((d) => (
                          <div key={d.id} className="bodega__item">
                            <span className="bodega__item-name">{mpNombre(d.materia_prima_id)}</span>
                            <span className="bodega__item-meta">
                              {d.cantidad_recibida ?? 0} / {d.cantidad_solicitada} {unidadAbrev(d.materia_prima_id)}
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
      </div>
    </div>
  );
}
