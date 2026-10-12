import { useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, DollarSign, ShoppingBag, TrendingUp, Truck } from "lucide-react";
import { BarChart, Cargando, KpiCard, Panel, Pestanas, Vacio } from "../components/admin/AdminUI";
import { useDatos } from "../hooks/useDatos";
import { analiticaService, getDetallesDe } from "../services/analitica.service";
import { ESTADO_CLASE, ESTADO_LABEL } from "../utils/pedidoEstados";
import { ESTADOS_PEDIDO } from "../types";
import type { TipoNotificacion } from "../types";
import { claveDia, claveMes, enPeriodo, fechaLarga, fmtQ, fmtQ2, hora, sumar, variacion, type Periodo } from "../utils/admin";
import "../styles/ui.css";

const CRITICAS: TipoNotificacion[] = ["LOTE_VENCIDO", "RECEPCION_INCOMPLETA"];
const COLORES_TOP = ["var(--color-primary)", "var(--color-accent)", "var(--color-petroleum)", "var(--color-success-text-variant, #166634)", "var(--color-border-strong)"];
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "dia", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];

const tiempoRelativo = (iso: string) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  return `hace ${Math.floor(min / 1440)} d`;
};

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const { datos, cargando, error } = useDatos(async () => {
    const base = await analiticaService.getBaseVentas();
    const detalles = await getDetallesDe(base.pedidos).catch(() => []);
    return { ...base, detalles };
  });

  if (cargando) return <Cargando texto="Cargando resumen ejecutivo…" />;
  if (error || !datos) return <div className="ui-error">{error ?? "No se pudo cargar el dashboard."}</div>;

  const { pedidos, facturas, clientes, productos, notificaciones, detalles } = datos;

  // La fecha de referencia es la del pedido mas reciente: con operacion diaria equivale a "hoy".
  const ref = pedidos.length ? new Date(pedidos.reduce((m, p) => (p.fecha_pedido > m ? p.fecha_pedido : m), pedidos[0].fecha_pedido)) : new Date();

  const facturasPeriodo = facturas.filter((f) => enPeriodo(f.fecha_emision, ref, periodo));
  const pedidosPeriodo = pedidos.filter((p) => enPeriodo(p.fecha_pedido, ref, periodo));
  const ventas = sumar(facturasPeriodo, (f) => f.total);

  const activos = pedidos.filter((p) => p.estado === "CREADO" || p.estado === "LISTO" || p.estado === "EN_RUTA");
  const enRuta = activos.filter((p) => p.estado === "EN_RUTA").length;

  const mesRef = claveMes(ref.toISOString());
  const mesAnt = claveMes(new Date(ref.getFullYear(), ref.getMonth() - 1, 15).toISOString());
  const ingresosMes = sumar(facturas.filter((f) => claveMes(f.fecha_emision) === mesRef), (f) => f.total);
  const ingresosMesAnt = sumar(facturas.filter((f) => claveMes(f.fecha_emision) === mesAnt), (f) => f.total);

  const criticas = notificaciones.filter((n) => !n.leida && CRITICAS.includes(n.tipo));

  // Ventas de los ultimos 7 dias terminando en la fecha de referencia.
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ref);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const ventasDia = dias.map((d) => sumar(facturas.filter((f) => claveDia(f.fecha_emision) === claveDia(d.toISOString())), (f) => f.total));

  const unidadesPorProducto = new Map<number, number>();
  detalles.forEach((d) => unidadesPorProducto.set(d.producto_id, (unidadesPorProducto.get(d.producto_id) ?? 0) + d.cantidad));
  const totalUnidades = sumar([...unidadesPorProducto.values()], (n) => n);
  const top = [...unidadesPorProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const recientes = [...pedidos].sort((a, b) => b.fecha_pedido.localeCompare(a.fecha_pedido)).slice(0, 6);
  const nombreCliente = (id: number) => {
    const c = clientes.find((x) => x.id === id);
    return c ? `${c.nombre} ${c.apellido}` : `Cliente #${id}`;
  };
  const alertas = [...notificaciones].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 4);
  const nuevas = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="adm">
      <header className="adm-cab">
        <div>
          <h2 className="adm-titulo">Resumen Ejecutivo</h2>
          <p className="adm-sub">Datos al {fechaLarga(ref)}</p>
        </div>
        <Pestanas items={PERIODOS} activa={periodo} onCambiar={setPeriodo} />
      </header>

      <div className="adm-kpis">
        <KpiCard label="Ventas del periodo" valor={fmtQ(ventas)} sub={`${pedidosPeriodo.length} pedidos registrados`} icon={DollarSign} tono="rojo" />
        <KpiCard label="Pedidos activos" valor={String(activos.length)} sub={`${activos.filter((p) => p.estado === "CREADO").length} recibidos · ${enRuta} en ruta`} icon={Truck} tono="naranja" />
        <KpiCard label="Ingresos del mes" valor={fmtQ(ingresosMes)} sub={`vs ${fmtQ(ingresosMesAnt)} mes anterior`} icon={TrendingUp} tono="verde" variacion={variacion(ingresosMes, ingresosMesAnt)} />
        <KpiCard label="Alertas críticas" valor={String(criticas.length)} sub="Lotes vencidos y recepciones incompletas" icon={AlertTriangle} tono="azul" />
      </div>

      <div className="adm-fila adm-fila--2-1">
        <Panel titulo="Ventas de la semana" sub="Ingresos por día (Q)">
          {ventasDia.some((v) => v > 0) ? (
            <BarChart etiquetas={dias.map((d) => d.toLocaleDateString("es-GT", { weekday: "short" }))} series={[{ nombre: "Ventas", color: "var(--color-primary)", valores: ventasDia }]} formato={fmtQ2} />
          ) : (
            <Vacio texto="Sin facturas en los últimos 7 días." />
          )}
        </Panel>

        <Panel titulo="Productos más vendidos" sub="Distribución por unidades">
          {top.length === 0 ? (
            <Vacio texto="Sin detalle de pedidos para calcular." />
          ) : (
            <ul className="adm-top">
              {top.map(([id, unidades], i) => {
                const pct = totalUnidades ? Math.round((unidades / totalUnidades) * 100) : 0;
                return (
                  <li key={id}>
                    <span>{productos.find((p) => p.id === id)?.producto ?? `Producto #${id}`}</span>
                    <strong>{pct}%</strong>
                    <i style={{ width: `${pct}%`, background: COLORES_TOP[i] }} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="adm-fila adm-fila--2-1">
        <Panel titulo="Pedidos recientes" accion={<Link href="/copac/ventas" className="adm-enlace">Ver todos</Link>}>
          <div className="adm-tabla-wrap">
            <table className="ui-table">
              <thead>
                <tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Hora</th></tr>
              </thead>
              <tbody>
                {recientes.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>{nombreCliente(p.cliente_id)}</td>
                    <td>{fmtQ2(p.total)}</td>
                    <td><span className={`ui-badge ${ESTADO_CLASE[p.estado]}`}><span className="ui-badge__dot" />{ESTADO_LABEL[p.estado]}</span></td>
                    <td>{hora(p.fecha_pedido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel titulo="Alertas del sistema" sub={`${nuevas} nuevas`} accion={<Link href="/copac/notificaciones" className="adm-enlace">Ver</Link>}>
          {alertas.length === 0 ? (
            <Vacio texto="Sin alertas." />
          ) : (
            <ul className="adm-alertas">
              {alertas.map((n) => (
                <li key={n.id} className={CRITICAS.includes(n.tipo) ? "adm-alertas--critica" : undefined}>
                  <p>{n.mensaje}</p>
                  <small>{tiempoRelativo(n.fecha)}</small>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel titulo="Estado de los pedidos" sub="Todos los pedidos registrados">
        <ul className="adm-pipeline">
          {ESTADOS_PEDIDO.map((e) => (
            <li key={e}>
              <strong>{pedidos.filter((p) => p.estado === e).length}</strong>
              <span className={`ui-badge ${ESTADO_CLASE[e]}`}>{ESTADO_LABEL[e]}</span>
            </li>
          ))}
        </ul>
        <p className="adm-nota"><ShoppingBag size={13} aria-hidden="true" /> Los pedidos de la API no incluyen sucursal, por eso no se desglosan por sucursal.</p>
      </Panel>
    </div>
  );
}
