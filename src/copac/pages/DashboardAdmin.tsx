import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  Info,
  Calendar,
  ChefHat,
  Package,
  Bike,
  Boxes,
  Bell,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import "../styles/ui.css";
import "../styles/dashboard.css";
import { pedidosService } from "../services/pedidos.service";
import { facturasVentaService } from "../services/facturasVenta.service";
import { clientesService } from "../services/clientes.service";
import { direccionesService } from "../services/direcciones.service";
import { municipiosService } from "../services/municipios.service";
import { sucursalesService } from "../services/sucursales.service";
import { productosService } from "../services/productos.service";
import { hojasDespachoService } from "../services/hojasDespacho.service";
import { notificacionesService } from "../services/notificaciones.service";
import type {
  Pedido,
  DetallePedido,
  FacturaVenta,
  Cliente,
  Direccion,
  Municipio,
  Sucursal,
  Producto,
  HojaDespacho,
  Notificacion,
  TipoNotificacion,
  EstadoPedido,
} from "../types";

type Periodo = "hoy" | "semana" | "mes";
type Severidad = "critica" | "advertencia" | "exito" | "info";

// Severidad visual derivada del tipo de notificación (misma lógica que Notificaciones.tsx).
const SEVERIDAD: Record<TipoNotificacion, Severidad> = {
  LOTE_VENCIDO: "critica",
  RECEPCION_INCOMPLETA: "critica",
  LOTE_POR_VENCER: "advertencia",
  SOLICITUD_INSUMO_PENDIENTE: "advertencia",
  PEDIDO_LISTO: "exito",
  PEDIDO_NUEVO: "info",
};

const SEV_ICON: Record<Severidad, typeof Info> = {
  critica: AlertTriangle,
  advertencia: Clock,
  exito: CheckCircle,
  info: Info,
};

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const PERIODO_LABEL: Record<Periodo, string> = { hoy: "del día", semana: "de la semana", mes: "del mes" };
const PERIODO_NOMBRE: Record<Periodo, string> = { hoy: "Hoy", semana: "Semana", mes: "Mes" };

const ESTADO_CLASE: Record<EstadoPedido, string> = {
  CREADO: "dash__badge--info",
  EN_PREPARACION: "dash__badge--info",
  LISTO: "dash__badge--accent",
  EN_DESPACHO: "dash__badge--petro",
  EN_RUTA: "dash__badge--petro",
  ENTREGADO: "dash__badge--ok",
  ANULADO: "dash__badge--error",
};

interface DashData {
  pedidos: Pedido[];
  detalles: DetallePedido[];
  facturas: FacturaVenta[];
  clientes: Cliente[];
  direcciones: Direccion[];
  municipios: Municipio[];
  sucursales: Sucursal[];
  productos: Producto[];
  hojas: HojaDespacho[];
  notifs: Notificacion[];
}

const dia = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function addDias(fecha: string, n: number): string {
  const d = new Date(fecha + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function rango(desde: string, hasta: string): string[] {
  const out: string[] = [];
  for (let d = desde; d <= hasta; d = addDias(d, 1)) out.push(d);
  return out;
}

const q = (n: number) => "Q " + Math.round(n).toLocaleString("es-GT");

interface PuntoSerie {
  x: number;
  y: number;
  dia: string;
  label: string;
  total: number;
}

function graficarArea(
  serie: { dia: string; label: string; total: number }[],
  w: number,
  h: number,
  pad: { t: number; r: number; b: number; l: number },
) {
  const max = Math.max(1, ...serie.map((s) => s.total));
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const step = serie.length > 1 ? innerW / (serie.length - 1) : 0;
  const pts: (PuntoSerie & { label: string; total: number })[] = serie.map((s, i) => ({
    x: pad.l + i * step,
    y: pad.t + innerH - (s.total / max) * innerH,
    dia: s.dia,
    label: s.label,
    total: s.total,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const baseY = pad.t + innerH;
  const area =
    pts.length > 0
      ? `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`
      : "";
  return { max, pts, line, area, baseY };
}

export default function DashboardAdmin() {
  const [datos, setDatos] = useState<DashData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("hoy");

  const cargar = useCallback(async (): Promise<DashData> => {
    const [pedidos, facturas, clientes, direcciones, municipios, sucursales, productos, hojas, notifs] =
      await Promise.all([
        pedidosService.getAll(),
        facturasVentaService.getAll(),
        clientesService.getAll(),
        direccionesService.getAll(),
        municipiosService.getAll(),
        sucursalesService.getAll(),
        productosService.getAll(),
        hojasDespachoService.getAll(),
        notificacionesService.getAll(),
      ]);
    // GET /pedidos no trae detalles; se piden por pedido (mismo patrón que Bodega/Despacho).
    const detalles = (await Promise.all(pedidos.map((p) => pedidosService.getById(p.id)))).flatMap((p) => p.detalles);
    return { pedidos, facturas, clientes, direcciones, municipios, sucursales, productos, hojas, notifs, detalles };
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const d = await cargar();
        if (activo) setDatos(d);
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : "Error al cargar el resumen.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cargar]);

  const resumen = useMemo(() => {
    if (!datos) return null;
    const { pedidos, detalles, facturas, clientes, direcciones, municipios, sucursales, productos, hojas, notifs } =
      datos;

    const fechas = [...facturas.map((f) => dia(f.fecha_emision)), ...pedidos.map((p) => dia(p.fecha_pedido))].sort();
    const refDate = fechas.length > 0 ? fechas[fechas.length - 1] : dia(new Date().toISOString());

    const sumaPorDia = new Map<string, number>();
    for (const f of facturas) {
      const d = dia(f.fecha_emision);
      sumaPorDia.set(d, (sumaPorDia.get(d) ?? 0) + f.total);
    }
    const ventaRango = (dias: string[]) => dias.reduce((s, d) => s + (sumaPorDia.get(d) ?? 0), 0);

    const ultimos7 = rango(addDias(refDate, -6), refDate);
    const serieVentas = ultimos7.map((d) => ({
      dia: d,
      label: DOW[new Date(d + "T00:00:00Z").getUTCDay()],
      total: sumaPorDia.get(d) ?? 0,
    }));

    let ventana: string[];
    let previa: string[];
    if (periodo === "hoy") {
      ventana = [refDate];
      previa = [addDias(refDate, -1)];
    } else if (periodo === "semana") {
      ventana = ultimos7;
      previa = rango(addDias(refDate, -13), addDias(refDate, -7));
    } else {
      const primero = refDate.slice(0, 7) + "-01";
      ventana = rango(primero, refDate);
      const mp = new Date(primero + "T00:00:00Z");
      mp.setUTCMonth(mp.getUTCMonth() - 1);
      const pIni = mp.toISOString().slice(0, 10);
      const pFin = new Date(Date.UTC(mp.getUTCFullYear(), mp.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
      previa = rango(pIni, pFin);
    }
    const ventasPeriodo = ventaRango(ventana);
    const ventasPrevia = ventaRango(previa);
    const tendencia = ventasPrevia > 0 ? ((ventasPeriodo - ventasPrevia) / ventasPrevia) * 100 : null;
    const pedidosPeriodo = pedidos.filter((p) => ventana.includes(dia(p.fecha_pedido))).length;

    const porEstado = (e: EstadoPedido) => pedidos.filter((p) => p.estado === e).length;
    const enCocina = porEstado("CREADO");
    const listos = porEstado("LISTO");
    const enRuta = porEstado("EN_RUTA");
    const activos = enCocina + listos + enRuta;

    const recibidosHoy = pedidos.filter((p) => dia(p.fecha_pedido) === refDate).length;
    const entregadosHoy = pedidos.filter((p) => p.estado === "ENTREGADO" && dia(p.fecha_pedido) === refDate).length;
    const empacadosHoy = hojas.filter((h) => h.despachado_en && dia(h.despachado_en) === refDate).length;

    const ym = refDate.slice(0, 7);
    const ingresosMes = facturas.filter((f) => dia(f.fecha_emision).slice(0, 7) === ym).reduce((s, f) => s + f.total, 0);

    const visibles = notifs.filter((n) => n.roles_destino.includes("ADMIN"));
    const alertasLista = [...visibles].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 6);
    const criticas = visibles.filter((n) => SEVERIDAD[n.tipo] === "critica").length;
    const advertencias = visibles.filter((n) => SEVERIDAD[n.tipo] === "advertencia").length;

    const prodMap = new Map(productos.map((p) => [p.id, p] as const));
    const unidadesProd = new Map<number, number>();
    for (const d of detalles) unidadesProd.set(d.producto_id, (unidadesProd.get(d.producto_id) ?? 0) + d.cantidad);
    const totalUnidades = [...unidadesProd.values()].reduce((s, n) => s + n, 0);
    const ordenProd = [...unidadesProd.entries()]
      .map(([id, uds]) => ({ nombre: prodMap.get(id)?.producto ?? `Producto ${id}`, uds }))
      .sort((a, b) => b.uds - a.uds);
    const top5 = ordenProd.slice(0, 5);
    const resto = totalUnidades - top5.reduce((s, p) => s + p.uds, 0);
    const baseProd = resto > 0 ? [...top5, { nombre: "Otros", uds: resto }] : top5;
    const topProd = baseProd.map((p) => ({ ...p, pct: totalUnidades > 0 ? (p.uds / totalUnidades) * 100 : 0 }));

    const clienteMap = new Map(clientes.map((c) => [c.id, c] as const));
    const municipioMap = new Map(municipios.map((m) => [m.id, m.municipio] as const));
    const dirCliente = new Map<number, Direccion>();
    for (const d of direcciones) if (!dirCliente.has(d.cliente_id)) dirCliente.set(d.cliente_id, d);
    const pedidoMap = new Map(pedidos.map((p) => [p.id, p] as const));

    const sucursalPorMunicipio = new Map<number, Sucursal>();
    for (const s of sucursales) if (!sucursalPorMunicipio.has(s.municipio_id)) sucursalPorMunicipio.set(s.municipio_id, s);
    const porSucursal = new Map<string, number>();
    for (const f of facturas) {
      if (dia(f.fecha_emision) !== refDate) continue;
      const pedido = pedidoMap.get(f.pedido_id);
      const dir = pedido ? dirCliente.get(pedido.cliente_id) : undefined;
      const suc = dir ? sucursalPorMunicipio.get(dir.municipio_id) : undefined;
      const nombre = suc ? suc.sucursal : "Sin sucursal";
      porSucursal.set(nombre, (porSucursal.get(nombre) ?? 0) + f.total);
    }
    const totalSucursal = [...porSucursal.values()].reduce((s, n) => s + n, 0);
    const sucursalesArr = [...porSucursal.entries()]
      .map(([nombre, total]) => ({ nombre, total, pct: totalSucursal > 0 ? (total / totalSucursal) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);

    const recientes = [...pedidos]
      .sort((a, b) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime())
      .slice(0, 6)
      .map((p) => {
        const c = clienteMap.get(p.cliente_id);
        const dir = dirCliente.get(p.cliente_id);
        return {
          id: p.id,
          cliente: c ? `${c.nombre} ${c.apellido}` : `Cliente ${p.cliente_id}`,
          zona: dir ? municipioMap.get(dir.municipio_id) ?? "—" : "—",
          total: p.total,
          estado: p.estado,
        };
      });

    return {
      refDate,
      serieVentas,
      ventasPeriodo,
      pedidosPeriodo,
      tendencia,
      activos,
      enCocina,
      listos,
      enRuta,
      recibidosHoy,
      entregadosHoy,
      empacadosHoy,
      ingresosMes,
      criticas,
      advertencias,
      alertasLista,
      topProd,
      totalUnidades,
      sucursalesArr,
      totalSucursal,
      recientes,
    };
  }, [datos, periodo]);

  if (cargando) {
    return (
      <div className="dash">
        <div className="ui-panel dash__estado">Cargando resumen…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash">
        <div className="ui-error">{error}</div>
      </div>
    );
  }

  if (!resumen) return null;

  const sube = resumen.tendencia !== null && resumen.tendencia >= 0;

  return (
    <div className="dash">
      <header className="dash__head">
        <div>
          <h1 className="dash__title">Resumen Ejecutivo</h1>
          <p className="dash__subtitle">Actividad del negocio · {resumen.refDate}</p>
        </div>
        <div className="dash__acciones">
          <div className="dash__periodos">
            {(["hoy", "semana", "mes"] as Periodo[]).map((p) => (
              <button
                key={p}
                className={`dash__periodo ${periodo === p ? "dash__periodo--activo" : ""}`}
                onClick={() => setPeriodo(p)}
              >
                {PERIODO_NOMBRE[p]}
              </button>
            ))}
          </div>
          <button
            className="ui-btn ui-btn--secondary"
            disabled
            title="No disponible: no existe endpoint de rango personalizado (reportado)."
          >
            <Calendar size={15} aria-hidden="true" /> Rango
          </button>
        </div>
      </header>

      <section className="dash__kpis">
        <div className="ui-panel dash__kpi">
          <div className="dash__kpi-top">
            <span className="dash__kpi-ico dash__kpi-ico--primary">
              <ShoppingBag size={16} aria-hidden="true" />
            </span>
            <span className="dash__kpi-label">Ventas {PERIODO_LABEL[periodo]}</span>
          </div>
          <div className="dash__kpi-valor">{q(resumen.ventasPeriodo)}</div>
          <div className="dash__kpi-foot">
            <span className="dash__kpi-sub">{resumen.pedidosPeriodo} pedidos procesados</span>
            {resumen.tendencia !== null && (
              <span className={`dash__trend dash__trend--${sube ? "up" : "down"}`}>
                {sube ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
                {resumen.tendencia >= 0 ? "+" : ""}
                {resumen.tendencia.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="ui-panel dash__kpi">
          <div className="dash__kpi-top">
            <span className="dash__kpi-ico dash__kpi-ico--accent">
              <ChefHat size={16} aria-hidden="true" />
            </span>
            <span className="dash__kpi-label">Pedidos activos</span>
          </div>
          <div className="dash__kpi-valor">{resumen.activos}</div>
          <div className="dash__kpi-foot">
            <span className="dash__kpi-sub">
              {resumen.enCocina} en cocina · {resumen.enRuta} en ruta
            </span>
          </div>
        </div>

        <div className="ui-panel dash__kpi">
          <div className="dash__kpi-top">
            <span className="dash__kpi-ico dash__kpi-ico--success">
              <DollarSign size={16} aria-hidden="true" />
            </span>
            <span className="dash__kpi-label">Ingresos del mes</span>
          </div>
          <div className="dash__kpi-valor">{q(resumen.ingresosMes)}</div>
          <div className="dash__kpi-foot">
            <span className="dash__kpi-sub">Mes en curso (parcial)</span>
          </div>
        </div>

        <div className="ui-panel dash__kpi">
          <div className="dash__kpi-top">
            <span className="dash__kpi-ico dash__kpi-ico--error">
              <AlertTriangle size={16} aria-hidden="true" />
            </span>
            <span className="dash__kpi-label">Alertas críticas</span>
          </div>
          <div className="dash__kpi-valor">{resumen.criticas}</div>
          <div className="dash__kpi-foot">
            <span className="dash__kpi-sub">{resumen.advertencias} advertencias</span>
          </div>
        </div>
      </section>

      <section className="dash__fichas">
        <Ficha icono={<Boxes size={15} aria-hidden="true" />} valor={resumen.recibidosHoy} label="Recibidos" />
        <Ficha icono={<ChefHat size={15} aria-hidden="true" />} valor={resumen.enCocina} label="En cocina" />
        <Ficha icono={<CheckCircle size={15} aria-hidden="true" />} valor={resumen.listos} label="Listos" />
        <Ficha icono={<Package size={15} aria-hidden="true" />} valor={resumen.empacadosHoy} label="Empacados" />
        <Ficha icono={<Bike size={15} aria-hidden="true" />} valor={resumen.enRuta} label="En ruta" />
        <Ficha icono={<CheckCircle size={15} aria-hidden="true" />} valor={resumen.entregadosHoy} label="Entregados" ok />
      </section>

      <section className="dash__grid">
        <GraficaSemana serie={resumen.serieVentas} />
        <DonaProductos data={resumen.topProd} total={resumen.totalUnidades} />
      </section>

      <section className="dash__grid dash__grid--2">
        <TablaRecientes filas={resumen.recientes} />
        <PanelAlertas alertas={resumen.alertasLista} criticas={resumen.criticas} />
      </section>

      <section className="ui-panel dash__panel">
        <div className="dash__panel-head">
          <h2 className="dash__panel-title">Ventas por sucursal (hoy)</h2>
          <span className="dash__panel-sub">Inferidas por municipio del cliente</span>
        </div>
        {resumen.sucursalesArr.length === 0 ? (
          <p className="dash__empty">Sin ventas registradas hoy.</p>
        ) : (
          <ul className="dash__barras">
            {resumen.sucursalesArr.map((s) => (
              <li key={s.nombre} className="dash__barra">
                <span className="dash__barra-nom">{s.nombre}</span>
                <span className="dash__barra-track">
                  <span className="dash__barra-fill" style={{ width: `${s.pct}%` }} />
                </span>
                <span className="dash__barra-val">{q(s.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Ficha({
  icono,
  valor,
  label,
  ok = false,
}: {
  icono: ReactNode;
  valor: number;
  label: string;
  ok?: boolean;
}) {
  return (
    <div className={`ui-panel dash__ficha ${ok ? "dash__ficha--ok" : ""}`}>
      <span className="dash__ficha-ico">{icono}</span>
      <span className="dash__ficha-valor">{valor}</span>
      <span className="dash__ficha-label">{label}</span>
    </div>
  );
}

function GraficaSemana({ serie }: { serie: { dia: string; label: string; total: number }[] }) {
  const W = 760;
  const H = 240;
  const geo = graficarArea(serie, W, H, { t: 20, r: 24, b: 34, l: 56 });
  const hayDatos = serie.some((s) => s.total > 0);

  return (
    <div className="ui-panel dash__panel">
      <div className="dash__panel-head">
        <h2 className="dash__panel-title">Ventas de la semana</h2>
        <span className="dash__panel-sub">{serie.length} días</span>
      </div>
      {!hayDatos ? (
        <p className="dash__empty">Sin ventas en la semana.</p>
      ) : (
        <svg className="dash__chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ventas de la semana">
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = geo.baseY - frac * (geo.baseY - 20);
            return (
              <g key={frac}>
                <line className="dash__gridline" x1={56} y1={y} x2={W - 24} y2={y} />
                <text className="dash__axis" x={50} y={y + 4} textAnchor="end">
                  {Math.round(geo.max * frac)}
                </text>
              </g>
            );
          })}
          <path className="dash__area" d={geo.area} />
          <path className="dash__line" d={geo.line} />
          {geo.pts.map((p) => (
            <g key={p.dia}>
              <circle className="dash__dot" cx={p.x} cy={p.y} r={3.5} />
              <text className="dash__xlab" x={p.x} y={H - 12} textAnchor="middle">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

function DonaProductos({
  data,
  total,
}: {
  data: { nombre: string; uds: number; pct: number }[];
  total: number;
}) {
  const R = 58;
  const C = 2 * Math.PI * R;
  const slices = data.reduce<{ nombre: string; uds: number; pct: number; len: number; gap: number; offset: number }[]>(
    (out, d) => {
      const prev = out[out.length - 1];
      const len = (d.pct / 100) * C;
      out.push({ ...d, len, gap: C - len, offset: prev ? prev.offset - prev.len : 0 });
      return out;
    },
    [],
  );

  return (
    <div className="ui-panel dash__panel">
      <div className="dash__panel-head">
        <h2 className="dash__panel-title">Ventas por producto</h2>
        <span className="dash__panel-sub">Top 5 · unidades</span>
      </div>
      {data.length === 0 ? (
        <p className="dash__empty">Sin productos vendidos.</p>
      ) : (
        <div className="dash__dona-wrap">
          <svg className="dash__dona" viewBox="0 0 160 160" role="img" aria-label="Distribución por producto">
            {slices.map((s, i) => (
              <circle
                key={s.nombre}
                className={`dash__slice dash__slice--${i + 1}`}
                cx={80}
                cy={80}
                r={R}
                fill="none"
                strokeWidth={16}
                strokeDasharray={`${s.len.toFixed(2)} ${s.gap.toFixed(2)}`}
                strokeDashoffset={s.offset.toFixed(2)}
                transform="rotate(-90 80 80)"
              />
            ))}
            <text className="dash__dona-val" x={80} y={78} textAnchor="middle">
              {total}
            </text>
            <text className="dash__dona-lab" x={80} y={94} textAnchor="middle">
              unidades
            </text>
          </svg>
          <ul className="dash__leyenda">
            {data.map((d, i) => (
              <li key={d.nombre} className="dash__leyenda-item">
                <span className={`dash__swatch dash__slice--${i + 1}`} />
                <span className="dash__leyenda-nom">{d.nombre}</span>
                <span className="dash__leyenda-val">{d.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TablaRecientes({
  filas,
}: {
  filas: { id: number; cliente: string; zona: string; total: number; estado: EstadoPedido }[];
}) {
  return (
    <div className="ui-panel dash__panel">
      <div className="dash__panel-head">
        <h2 className="dash__panel-title">Pedidos recientes</h2>
      </div>
      {filas.length === 0 ? (
        <p className="dash__empty">Sin pedidos.</p>
      ) : (
        <div className="dash__tabla-wrap">
          <table className="dash__tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Zona</th>
                <th>Método</th>
                <th className="dash__num">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <td>#{f.id}</td>
                  <td>{f.cliente}</td>
                  <td>{f.zona}</td>
                  <td className="dash__nd">N/D</td>
                  <td className="dash__num">{q(f.total)}</td>
                  <td>
                    <span className={`dash__badge ${ESTADO_CLASE[f.estado]}`}>{f.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PanelAlertas({ alertas, criticas }: { alertas: Notificacion[]; criticas: number }) {
  return (
    <div className="ui-panel dash__panel">
      <div className="dash__panel-head">
        <span className="dash__panel-title dash__panel-title--icon">
          <Bell size={16} aria-hidden="true" /> Alertas del sistema
        </span>
        <span className="dash__panel-sub">{criticas} críticas</span>
      </div>
      {alertas.length === 0 ? (
        <p className="dash__empty">Sin alertas.</p>
      ) : (
        <ul className="dash__alertas">
          {alertas.map((n) => {
            const sev = SEVERIDAD[n.tipo];
            const Icono = SEV_ICON[sev];
            return (
              <li key={n.id} className={`dash__alerta dash__alerta--${sev}`}>
                <span className="dash__alerta-ico">
                  <Icono size={15} aria-hidden="true" />
                </span>
                <span className="dash__alerta-txt">{n.mensaje}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
