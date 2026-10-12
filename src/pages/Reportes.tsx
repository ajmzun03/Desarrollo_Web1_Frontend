import { useState } from "react";
import { Download, PiggyBank, Receipt, TrendingUp, Wallet } from "lucide-react";
import { BarChart, Cargando, KpiCard, Panel, Pestanas, Vacio } from "../components/admin/AdminUI";
import { useDatos } from "../hooks/useDatos";
import { analiticaService, getDetallesDe } from "../services/analitica.service";
import { claveMes, descargarCSV, fechaHora, fmtQ, fmtQ2, sumar, variacion } from "../utils/admin";
import "../styles/ui.css";

type Tab = "financiero" | "cierres" | "productos" | "exportar";
const TABS: { id: Tab; label: string }[] = [
  { id: "financiero", label: "Financiero" },
  { id: "cierres", label: "Cierres de caja" },
  { id: "productos", label: "Productos" },
  { id: "exportar", label: "Exportar" },
];

export default function Reportes() {
  const [tab, setTab] = useState<Tab>("financiero");
  const { datos, cargando, error } = useDatos(async () => {
    const base = await analiticaService.getBaseFinanzas();
    const detalles = await getDetallesDe(base.pedidos).catch(() => []);
    return { ...base, detalles };
  });

  if (cargando) return <Cargando texto="Cargando reportes…" />;
  if (error || !datos) return <div className="ui-error">{error ?? "No se pudieron cargar los reportes."}</div>;

  const { facturasVenta, facturasCompra, productos, cierres, sucursales, detalles } = datos;

  // Mes de referencia: el de la factura de venta mas reciente (o el actual si no hay datos).
  const ultima = facturasVenta.reduce((m, f) => (f.fecha_emision > m ? f.fecha_emision : m), "");
  const ref = ultima ? new Date(ultima) : new Date();
  const meses = Array.from({ length: 6 }, (_, i) => new Date(ref.getFullYear(), ref.getMonth() - (5 - i), 15));
  const claves = meses.map((m) => claveMes(m.toISOString()));
  const ingresosPorMes = claves.map((c) => sumar(facturasVenta.filter((f) => claveMes(f.fecha_emision) === c), (f) => f.total));
  const comprasPorMes = claves.map((c) => sumar(facturasCompra.filter((f) => claveMes(f.fecha_ingreso) === c), (f) => f.total));

  const ingresos = ingresosPorMes[5];
  const compras = comprasPorMes[5];
  const utilidad = ingresos - compras;
  const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;

  const filasProducto = (() => {
    const mapa = new Map<number, { unidades: number; ingreso: number }>();
    detalles.forEach((d) => {
      const x = mapa.get(d.producto_id) ?? { unidades: 0, ingreso: 0 };
      x.unidades += d.cantidad;
      x.ingreso += d.cantidad * d.precio_unitario;
      mapa.set(d.producto_id, x);
    });
    return [...mapa.entries()]
      .map(([id, v]) => ({ id, nombre: productos.find((p) => p.id === id)?.producto ?? `Producto #${id}`, ...v }))
      .sort((a, b) => b.ingreso - a.ingreso);
  })();

  const nombreSucursal = (id: number | null) => sucursales.find((s) => s.id === id)?.sucursal ?? (id ? `Sucursal #${id}` : "—");
  const diferencia = (c: (typeof cierres)[number]) => (c.monto_cierre_declarado ?? 0) - (c.monto_cierre_sistema ?? 0);

  const exportar = {
    ventas: () =>
      descargarCSV("facturas-venta.csv", [["Serie", "Número", "Pedido", "Fecha", "Total"], ...facturasVenta.map((f) => [f.serie, f.numero, f.pedido_id, fechaHora(f.fecha_emision), f.total])]),
    compras: () =>
      descargarCSV("facturas-compra.csv", [["Serie", "Número", "Hoja de recepción", "Fecha de ingreso", "Total"], ...facturasCompra.map((f) => [f.serie, f.numero, f.hoja_recepcion_id ?? "", fechaHora(f.fecha_ingreso), f.total])]),
    productos: () =>
      descargarCSV("productos-vendidos.csv", [["Producto", "Unidades", "Ingreso"], ...filasProducto.map((p) => [p.nombre, p.unidades, p.ingreso])]),
    cierres: () =>
      descargarCSV("cierres-caja.csv", [
        ["Sucursal", "Apertura", "Cierre declarado", "Cierre sistema", "Diferencia"],
        ...cierres.map((c) => [nombreSucursal(c.sucursal_id), c.monto_apertura ?? "", c.monto_cierre_declarado ?? "", c.monto_cierre_sistema ?? "", diferencia(c)]),
      ]),
  };

  return (
    <div className="adm">
      <header className="adm-cab">
        <div>
          <h2 className="adm-titulo">Reportes y Finanzas</h2>
          <p className="adm-sub">Vista ejecutiva · calculada con facturas de venta y compra</p>
        </div>
        <Pestanas items={TABS} activa={tab} onCambiar={setTab} />
      </header>

      {tab === "financiero" && (
        <>
          <div className="adm-kpis">
            <KpiCard label="Ingresos del mes" valor={fmtQ(ingresos)} icon={TrendingUp} tono="verde" variacion={variacion(ingresos, ingresosPorMes[4])} />
            <KpiCard label="Compras (insumos)" valor={fmtQ(compras)} icon={Receipt} tono="naranja" variacion={variacion(compras, comprasPorMes[4])} />
            <KpiCard label="Balance del mes" valor={fmtQ(utilidad)} sub={ingresos > 0 ? `${margen.toFixed(1)}% de los ingresos` : "Sin ingresos en el mes"} icon={PiggyBank} tono="rojo" />
            <KpiCard label="Facturas de compra" valor={String(facturasCompra.length)} sub="Registradas en total" icon={Wallet} tono="azul" />
          </div>
          <Panel titulo="Ingresos vs Compras" sub="Últimos 6 meses (Q)">
            <BarChart
              etiquetas={meses.map((m) => m.toLocaleDateString("es-GT", { month: "short" }))}
              series={[
                { nombre: "Ingresos", color: "var(--color-primary)", valores: ingresosPorMes },
                { nombre: "Compras", color: "var(--color-accent)", valores: comprasPorMes },
              ]}
              formato={fmtQ2}
              alto={220}
            />
          </Panel>
          <p className="adm-nota">El balance es ingresos menos compras de insumos (no incluye costo de ventas ni otros gastos). La API V1 no expone gastos operativos (sueldos, servicios) en un endpoint tipado, por eso no se incluyen.</p>
        </>
      )}

      {tab === "cierres" && (
        <Panel titulo="Cierres de caja por sucursal" sub="Apertura, cierre declarado y cierre del sistema">
          {cierres.length === 0 ? (
            <Vacio texto="Sin cierres de caja registrados." />
          ) : (
            <div className="adm-tabla-wrap">
              <table className="ui-table">
                <thead>
                  <tr><th>Sucursal</th><th>Apertura</th><th>Cierre declarado</th><th>Cierre sistema</th><th>Diferencia</th></tr>
                </thead>
                <tbody>
                  {cierres.map((c) => (
                    <tr key={c.id}>
                      <td>{nombreSucursal(c.sucursal_id)}</td>
                      <td>{fmtQ2(c.monto_apertura ?? 0)}</td>
                      <td>{c.monto_cierre_declarado != null ? fmtQ2(c.monto_cierre_declarado) : "Abierta"}</td>
                      <td>{c.monto_cierre_sistema != null ? fmtQ2(c.monto_cierre_sistema) : "—"}</td>
                      <td className={diferencia(c) === 0 ? undefined : "adm-neg"}>{c.monto_cierre_declarado != null ? fmtQ2(diferencia(c)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "productos" && (
        <Panel titulo="Productos más vendidos" sub="Por ingreso, según el detalle de pedidos no anulados">
          {filasProducto.length === 0 ? (
            <Vacio texto="Sin detalle de pedidos para calcular." />
          ) : (
            <div className="adm-tabla-wrap">
              <table className="ui-table">
                <thead>
                  <tr><th>Producto</th><th>Unidades</th><th>Ingreso</th></tr>
                </thead>
                <tbody>
                  {filasProducto.map((p) => (
                    <tr key={p.id}><td>{p.nombre}</td><td>{p.unidades}</td><td>{fmtQ2(p.ingreso)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "exportar" && (
        <Panel titulo="Exportar datos" sub="Descarga en CSV, compatible con Excel">
          <ul className="adm-export">
            {[
              ["Facturas de venta", exportar.ventas],
              ["Facturas de compra", exportar.compras],
              ["Productos vendidos", exportar.productos],
              ["Cierres de caja", exportar.cierres],
            ].map(([nombre, accion]) => (
              <li key={nombre as string}>
                <span>{nombre as string}</span>
                <button type="button" className="ui-btn ui-btn--secondary" onClick={accion as () => void}>
                  <Download size={14} aria-hidden="true" /> CSV
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
