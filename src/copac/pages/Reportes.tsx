import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  FileSpreadsheet,
  Wallet,
  Receipt,
  LineChart,
} from "lucide-react";
import "../styles/ui.css";
import "../styles/reportes.css";
import { facturasVentaService } from "../services/facturasVenta.service";
import { facturasCompraService } from "../services/facturasCompra.service";
import { pedidosService } from "../services/pedidos.service";
import { clientesService } from "../services/clientes.service";
import { direccionesService } from "../services/direcciones.service";
import { sucursalesService } from "../services/sucursales.service";
import { turnosService } from "../services/turnos.service";
import { gastosOperativosService } from "../services/gastosOperativos.service";
import type {
  FacturaVenta,
  FacturaCompra,
  Pedido,
  Cliente,
  Direccion,
  Sucursal,
  TurnoDespachador,
  GastoOperativo,
} from "../types";

type Pestana = "financiero" | "sucursales" | "productos";

const MES_CORTO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CATEGORIAS = ["Compras", "Sueldos", "Servicios", "Mantenimiento", "Otros"] as const;

const q = (n: number) => "Q " + Math.round(n).toLocaleString("es-GT");
const qk = (n: number) => `Q ${Math.round(n / 1000)}k`;
const mesDe = (iso: string) => iso.slice(0, 7);
const nombreMes = (key: string) => `${MES_CORTO[Number(key.slice(5, 7))]} ${key.slice(0, 4)}`;

function addMes(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

function diasEnMes(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function pct(actual: number, previo: number): number | null {
  return previo > 0 ? ((actual - previo) / previo) * 100 : null;
}

interface Datos {
  facturas: FacturaVenta[];
  compras: FacturaCompra[];
  pedidos: Pedido[];
  clientes: Cliente[];
  direcciones: Direccion[];
  sucursales: Sucursal[];
  turnos: TurnoDespachador[];
  gastos: GastoOperativo[];
}

export default function Reportes() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>("financiero");

  const cargar = useCallback(async (): Promise<Datos> => {
    const [facturas, compras, pedidos, clientes, direcciones, sucursales, turnos, gastos] = await Promise.all([
      facturasVentaService.getAll(),
      facturasCompraService.getAll(),
      pedidosService.getAll(),
      clientesService.getAll(),
      direccionesService.getAll(),
      sucursalesService.getAll(),
      turnosService.getAll(),
      gastosOperativosService.getAll(),
    ]);
    return { facturas, compras, pedidos, clientes, direcciones, sucursales, turnos, gastos };
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const d = await cargar();
        if (activo) setDatos(d);
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : "Error al cargar los reportes.");
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
    const { facturas, compras, pedidos, clientes, direcciones, sucursales, turnos, gastos } = datos;

    const mesesFact = facturas.map((f) => mesDe(f.fecha_emision)).sort();
    const refMes = mesesFact.length > 0 ? mesesFact[mesesFact.length - 1] : new Date().toISOString().slice(0, 7);
    const ultimos6 = Array.from({ length: 6 }, (_, i) => addMes(refMes, i - 5));

    const ingresoMes = new Map<string, number>();
    for (const f of facturas) {
      const k = mesDe(f.fecha_emision);
      ingresoMes.set(k, (ingresoMes.get(k) ?? 0) + f.total);
    }
    const compraMes = new Map<string, number>();
    for (const f of compras) {
      const k = mesDe(f.fecha_emision);
      compraMes.set(k, (compraMes.get(k) ?? 0) + f.total);
    }
    const gastoMes = new Map<string, number>();
    for (const g of gastos) gastoMes.set(g.mes, (gastoMes.get(g.mes) ?? 0) + g.monto);

    const serie = ultimos6.map((key) => ({
      key,
      label: MES_CORTO[Number(key.slice(5, 7))],
      ingresos: ingresoMes.get(key) ?? 0,
      gastos: gastoMes.get(key) ?? 0,
      compras: compraMes.get(key) ?? 0,
    }));

    const ingresos = ingresoMes.get(refMes) ?? 0;
    const gastosOp = gastoMes.get(refMes) ?? 0;
    const comprasMes = compraMes.get(refMes) ?? 0;
    const utilidad = ingresos - gastosOp;
    const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;

    const distribucionBase = CATEGORIAS.map((cat) => ({
      nombre: cat,
      monto:
        cat === "Compras"
          ? comprasMes
          : gastos.filter((g) => g.mes === refMes && g.categoria === cat).reduce((s, g) => s + g.monto, 0),
    }));
    const totalDist = distribucionBase.reduce((s, d) => s + d.monto, 0);
    const distribucion = distribucionBase.map((d) => ({ ...d, pct: totalDist > 0 ? (d.monto / totalDist) * 100 : 0 }));

    // Sucursal inferida: cliente -> dirección -> municipio -> sucursal.
    const dirCliente = new Map<number, Direccion>();
    for (const d of direcciones) if (!dirCliente.has(d.cliente_id)) dirCliente.set(d.cliente_id, d);
    const sucPorMunicipio = new Map<number, Sucursal>();
    for (const s of sucursales) if (!sucPorMunicipio.has(s.municipio_id)) sucPorMunicipio.set(s.municipio_id, s);
    const sucDeCliente = new Map<number, number>();
    for (const c of clientes) {
      const dir = dirCliente.get(c.id);
      const s = dir ? sucPorMunicipio.get(dir.municipio_id) : undefined;
      if (s) sucDeCliente.set(c.id, s.id);
    }
    const pedidoPorId = new Map(pedidos.map((p) => [p.id, p] as const));

    const ingPorSuc = new Map<number, number>();
    for (const f of facturas) {
      if (mesDe(f.fecha_emision) !== refMes) continue;
      const pedido = pedidoPorId.get(f.pedido_id);
      const sid = pedido ? sucDeCliente.get(pedido.cliente_id) : undefined;
      if (sid != null) ingPorSuc.set(sid, (ingPorSuc.get(sid) ?? 0) + f.total);
    }
    const gastoPorSuc = new Map<number, number>();
    for (const g of gastos) {
      if (g.mes !== refMes) continue;
      gastoPorSuc.set(g.sucursal_id, (gastoPorSuc.get(g.sucursal_id) ?? 0) + g.monto);
    }
    const pedidosPorSuc = new Map<number, number>();
    for (const p of pedidos) {
      if (mesDe(p.fecha_pedido) !== refMes) continue;
      const sid = sucDeCliente.get(p.cliente_id);
      if (sid != null) pedidosPorSuc.set(sid, (pedidosPorSuc.get(sid) ?? 0) + 1);
    }
    const filasSucursal = sucursales
      .map((s) => {
        const ing = ingPorSuc.get(s.id) ?? 0;
        const gas = gastoPorSuc.get(s.id) ?? 0;
        const ped = pedidosPorSuc.get(s.id) ?? 0;
        const util = ing - gas;
        return {
          id: s.id,
          nombre: s.sucursal,
          ingresos: ing,
          gastos: gas,
          utilidad: util,
          margen: ing > 0 ? (util / ing) * 100 : 0,
          pedidos: ped,
        };
      })
      .filter((s) => s.ingresos > 0 || s.gastos > 0 || s.pedidos > 0)
      .sort((a, b) => b.ingresos - a.ingresos);

    const abiertos = turnos.filter((t) => t.cerrado_en === null);
    const caja = abiertos.reduce((s, t) => s + (t.monto_apertura ?? 0), 0);

    const fechaMax = [...facturas.map((f) => f.fecha_emision), ...pedidos.map((p) => p.fecha_pedido)].sort().slice(-1)[0];
    const diaActual = fechaMax ? Number(fechaMax.slice(8, 10)) : 1;
    const diasMes = diasEnMes(refMes);
    const proyeccion = diaActual > 0 ? (ingresos / diaActual) * diasMes : ingresos;

    const prev = addMes(refMes, -1);
    return {
      refMes,
      serie,
      ingresos,
      gastosOp,
      comprasMes,
      utilidad,
      margen,
      tendencias: {
        ingresos: pct(ingresos, ingresoMes.get(prev) ?? 0),
        gastos: pct(gastosOp, gastoMes.get(prev) ?? 0),
        compras: pct(comprasMes, compraMes.get(prev) ?? 0),
        utilidad: pct(utilidad, (ingresoMes.get(prev) ?? 0) - (gastoMes.get(prev) ?? 0)),
      },
      distribucion,
      filasSucursal,
      caja,
      turnosAbiertos: abiertos.length,
      proyeccion,
      diaActual,
      diasMes,
      mesNombre: nombreMes(refMes),
    };
  }, [datos]);

  if (cargando) {
    return (
      <div className="rep">
        <div className="ui-panel rep__estado">Cargando reportes…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rep">
        <div className="ui-error">{error}</div>
      </div>
    );
  }

  if (!resumen) return null;

  const exportarCsv = () => {
    const cab = ["Sucursal", "Ingresos", "Gastos", "Utilidad", "Margen (%)", "Pedidos"];
    const filas = resumen.filasSucursal.map((s) => [
      s.nombre,
      s.ingresos,
      s.gastos,
      s.utilidad,
      s.margen.toFixed(1),
      s.pedidos,
    ]);
    const csv = [cab, ...filas].map((f) => f.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rendimiento-sucursal-${resumen.refMes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rep">
      <header className="rep__head">
        <div>
          <h1 className="rep__title">Reportes y Finanzas</h1>
          <p className="rep__subtitle">Vista ejecutiva · Todas las sucursales</p>
        </div>
        <div className="rep__acciones">
          <div className="rep__pestanas">
            {(["financiero", "sucursales", "productos"] as Pestana[]).map((p) => (
              <button
                key={p}
                className={`rep__pestana ${pestana === p ? "rep__pestana--activo" : ""}`}
                onClick={() => setPestana(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="ui-btn ui-btn--secondary" onClick={exportarCsv}>
            <Download size={15} aria-hidden="true" /> Exportar CSV
          </button>
          <button
            className="ui-btn ui-btn--ghost"
            disabled
            title="No disponible: no se permite generar PDF en el frontend (reportado)."
          >
            <FileText size={15} aria-hidden="true" /> PDF
          </button>
          <button
            className="ui-btn ui-btn--ghost"
            disabled
            title="No disponible: no se permite generar Excel en el frontend (reportado)."
          >
            <FileSpreadsheet size={15} aria-hidden="true" /> Excel
          </button>
        </div>
      </header>

      <section className="rep__kpis">
        <Kpi etiqueta="Ingresos del mes" valor={q(resumen.ingresos)} tendencia={resumen.tendencias.ingresos} subir />
        <Kpi etiqueta="Gastos (insumos)" valor={q(resumen.gastosOp)} tendencia={resumen.tendencias.gastos} subir={false} />
        <Kpi etiqueta="Compras (insumos)" valor={q(resumen.comprasMes)} tendencia={resumen.tendencias.compras} subir={false} />
        <Kpi etiqueta="Utilidad neta" valor={q(resumen.utilidad)} tendencia={null} nota={`${resumen.margen.toFixed(1)}% margen`} subir />
      </section>

      <section className="rep__grid">
        <GraficaMeses serie={resumen.serie} />
        <DonaGastos data={resumen.distribucion} mes={resumen.mesNombre} />
      </section>

      <section className="ui-panel rep__panel">
        <div className="rep__panel-head">
          <h2 className="rep__panel-title">Rendimiento por sucursal — {resumen.mesNombre}</h2>
          <span className="rep__panel-sub">Ingresos inferidos por municipio del cliente</span>
        </div>
        {resumen.filasSucursal.length === 0 ? (
          <p className="rep__empty">Sin datos para el mes actual.</p>
        ) : (
          <div className="rep__tabla-wrap">
            <table className="rep__tabla">
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th className="rep__num">Ingresos</th>
                  <th className="rep__num">Gastos</th>
                  <th className="rep__num">Utilidad</th>
                  <th>Margen</th>
                  <th className="rep__num">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {resumen.filasSucursal.map((s) => (
                  <tr key={s.id}>
                    <td className="rep__suc">{s.nombre}</td>
                    <td className="rep__num rep__fuerte">{q(s.ingresos)}</td>
                    <td className="rep__num">{q(s.gastos)}</td>
                    <td className={`rep__num rep__fuerte ${s.utilidad >= 0 ? "rep__ok" : "rep__neg"}`}>{q(s.utilidad)}</td>
                    <td>
                      <div className="rep__margen">
                        <span className="rep__margen-track">
                          <span
                            className="rep__margen-fill"
                            style={{ width: `${Math.min(100, Math.max(0, s.margen))}%` }}
                          />
                        </span>
                        <span className="rep__margen-val">{s.margen.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="rep__num">{s.pedidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rep__tarjetas">
        <div className="rep__tarjeta rep__tarjeta--success">
          <Wallet size={18} aria-hidden="true" />
          <p className="rep__tarjeta-valor">{q(resumen.caja)}</p>
          <p className="rep__tarjeta-label">Caja en turnos abiertos</p>
          <p className="rep__tarjeta-nota">{resumen.turnosAbiertos} turnos abiertos</p>
        </div>
        <div className="rep__tarjeta rep__tarjeta--warning">
          <Receipt size={18} aria-hidden="true" />
          <p className="rep__tarjeta-valor">N/D</p>
          <p className="rep__tarjeta-label">Facturas pendientes</p>
          <p className="rep__tarjeta-nota">Sin estado de pago en el modelo</p>
        </div>
        <div className="rep__tarjeta rep__tarjeta--info">
          <LineChart size={18} aria-hidden="true" />
          <p className="rep__tarjeta-valor">{q(resumen.proyeccion)}</p>
          <p className="rep__tarjeta-label">Proyección del mes</p>
          <p className="rep__tarjeta-nota">
            {resumen.diaActual}/{resumen.diasMes} días · según tendencia
          </p>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  tendencia,
  nota,
  subir = true,
}: {
  etiqueta: string;
  valor: string;
  tendencia: number | null;
  nota?: string;
  subir?: boolean;
}) {
  return (
    <div className="ui-panel rep__kpi">
      <p className="rep__kpi-label">{etiqueta}</p>
      <p className="rep__kpi-valor">{valor}</p>
      <div className="rep__kpi-foot">
        {tendencia !== null ? (
          <span className={`rep__trend ${subir ? "rep__trend--up" : "rep__trend--down"}`}>
            {subir ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
            {tendencia >= 0 ? "+" : ""}
            {tendencia.toFixed(1)}%
          </span>
        ) : nota ? (
          <span className="rep__kpi-nota">{nota}</span>
        ) : null}
      </div>
    </div>
  );
}

function GraficaMeses({
  serie,
}: {
  serie: { key: string; label: string; ingresos: number; gastos: number; compras: number }[];
}) {
  const W = 760;
  const H = 260;
  const padL = 60;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const baseY = padT + innerH;
  const max = Math.max(1, ...serie.flatMap((s) => [s.ingresos, s.gastos, s.compras]));
  const groupW = innerW / Math.max(1, serie.length);
  const barW = Math.min(22, groupW * 0.2);
  const gap = 3;
  const hayDatos = serie.some((s) => s.ingresos > 0 || s.gastos > 0 || s.compras > 0);
  const claves: { clave: "ingresos" | "gastos" | "compras"; clase: string }[] = [
    { clave: "ingresos", clase: "rep__bar--ing" },
    { clave: "gastos", clase: "rep__bar--gas" },
    { clave: "compras", clase: "rep__bar--com" },
  ];

  return (
    <div className="ui-panel rep__panel">
      <div className="rep__panel-head">
        <div>
          <h2 className="rep__panel-title">Ingresos vs Gastos</h2>
          <p className="rep__panel-sub">Últimos {serie.length} meses (Q)</p>
        </div>
        <div className="rep__leyenda-inline">
          <span className="rep__leyenda-item">
            <span className="rep__swatch rep__swatch--ing" /> Ingresos
          </span>
          <span className="rep__leyenda-item">
            <span className="rep__swatch rep__swatch--gas" /> Gastos
          </span>
          <span className="rep__leyenda-item">
            <span className="rep__swatch rep__swatch--com" /> Compras
          </span>
        </div>
      </div>
      {!hayDatos ? (
        <p className="rep__empty">Sin datos en los últimos meses.</p>
      ) : (
        <svg className="rep__chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ingresos vs gastos por mes">
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = baseY - frac * innerH;
            return (
              <g key={frac}>
                <line className="rep__gridline" x1={padL} y1={y} x2={W - padR} y2={y} />
                <text className="rep__axis" x={padL - 6} y={y + 4} textAnchor="end">
                  {qk(max * frac)}
                </text>
              </g>
            );
          })}
          {serie.map((s, i) => {
            const centro = padL + i * groupW + groupW / 2;
            return (
              <g key={s.key}>
                {claves.map((c, j) => {
                  const h = (s[c.clave] / max) * innerH;
                  const x = centro + (j - 1) * (barW + gap) - barW / 2;
                  return (
                    <rect key={c.clave} className={`rep__bar ${c.clase}`} x={x} y={baseY - h} width={barW} height={h} rx={3} />
                  );
                })}
                <text className="rep__axis rep__xlab" x={centro} y={H - 12} textAnchor="middle">
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function DonaGastos({ data, mes }: { data: { nombre: string; monto: number; pct: number }[]; mes: string }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const total = data.reduce((s, d) => s + d.monto, 0);
  const slices = data.reduce<{ nombre: string; monto: number; pct: number; len: number; gap: number; offset: number }[]>(
    (out, d) => {
      const prev = out[out.length - 1];
      const len = (d.pct / 100) * C;
      out.push({ ...d, len, gap: C - len, offset: prev ? prev.offset - prev.len : 0 });
      return out;
    },
    [],
  );

  return (
    <div className="ui-panel rep__panel">
      <div className="rep__panel-head">
        <h2 className="rep__panel-title">Distribución de gastos</h2>
        <span className="rep__panel-sub">{mes}</span>
      </div>
      {total === 0 ? (
        <p className="rep__empty">Sin gastos registrados.</p>
      ) : (
        <>
          <div className="rep__dona-wrap">
            <svg className="rep__dona" viewBox="0 0 140 140" role="img" aria-label="Distribución de gastos">
              {slices.map((s, i) => (
                <circle
                  key={s.nombre}
                  className={`rep__slice rep__slice--${i + 1}`}
                  cx={70}
                  cy={70}
                  r={R}
                  fill="none"
                  strokeWidth={18}
                  strokeDasharray={`${s.len.toFixed(2)} ${s.gap.toFixed(2)}`}
                  strokeDashoffset={s.offset.toFixed(2)}
                  transform="rotate(-90 70 70)"
                />
              ))}
              <text className="rep__dona-val" x={70} y={68} textAnchor="middle">
                {qk(total)}
              </text>
              <text className="rep__dona-lab" x={70} y={84} textAnchor="middle">
                total
              </text>
            </svg>
          </div>
          <ul className="rep__leyenda">
            {data.map((d, i) => (
              <li key={d.nombre} className="rep__leyenda-fila">
                <span className={`rep__swatch rep__slice--${i + 1}`} />
                <span className="rep__leyenda-nom">{d.nombre}</span>
                <span className="rep__leyenda-val">{d.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
