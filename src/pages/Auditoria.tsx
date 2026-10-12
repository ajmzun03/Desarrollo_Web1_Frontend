import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Download, XCircle } from "lucide-react";
import { Cargando, KpiCard, Pestanas, Panel, Vacio } from "../components/admin/AdminUI";
import { useDatos } from "../hooks/useDatos";
import { analiticaService, type Movimiento } from "../services/analitica.service";
import { descargarCSV, fechaHora } from "../utils/admin";
import "../styles/ui.css";

type Modulo = "Todos" | Movimiento["modulo"];
const MODULOS: { id: Modulo; label: string }[] = [
  { id: "Todos", label: "Todos" },
  { id: "Ventas", label: "Ventas" },
  { id: "Compras", label: "Compras" },
  { id: "Bodega", label: "Bodega" },
  { id: "Alacena", label: "Alacena" },
];
const POR_PAGINA = 10;
const CLASE_ESTADO: Record<Movimiento["estado"], string> = {
  Exitoso: "ui-badge--entregado",
  Advertencia: "ui-badge--listo",
  Anulación: "ui-badge--anulado",
};

export default function Auditoria() {
  const { datos, cargando, error } = useDatos(() => analiticaService.getMovimientos());
  const [modulo, setModulo] = useState<Modulo>("Todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);

  if (cargando) return <Cargando texto="Cargando auditoría…" />;
  if (error || !datos) return <div className="ui-error">{error ?? "No se pudo cargar la auditoría."}</div>;

  const { movimientos, fallidas } = datos;
  const filtrados = movimientos.filter(
    (m) => (modulo === "Todos" || m.modulo === modulo) && (!desde || m.fecha.slice(0, 10) >= desde) && (!hasta || m.fecha.slice(0, 10) <= hasta),
  );
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const visibles = filtrados.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);
  const cuenta = (e: Movimiento["estado"]) => filtrados.filter((m) => m.estado === e).length;

  // Al cambiar un filtro se vuelve a la primera pagina.
  const conFiltro = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPagina(1);
  };

  const exportar = () =>
    descargarCSV("auditoria.csv", [
      ["Fecha / Hora", "Módulo", "Acción", "Registro", "Cantidad / Monto", "Estado"],
      ...filtrados.map((m) => [fechaHora(m.fecha), m.modulo, m.accion, m.registro, m.cantidad, m.estado]),
    ]);

  return (
    <div className="adm">
      <header className="adm-cab">
        <div>
          <h2 className="adm-titulo">Auditoría del Sistema</h2>
          <p className="adm-sub">Registro de movimientos · {movimientos.length} en total</p>
        </div>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={exportar} disabled={filtrados.length === 0}>
          <Download size={14} aria-hidden="true" /> Exportar
        </button>
      </header>

      {fallidas.length > 0 && (
        <div className="ui-error" role="alert">
          No se pudieron cargar: {fallidas.join(", ")}. El kardex requiere rol Administrador en el backend.
        </div>
      )}

      <div className="adm-kpis">
        <KpiCard label="Total movimientos" valor={String(filtrados.length)} icon={Activity} tono="rojo" />
        <KpiCard label="Exitosos" valor={String(cuenta("Exitoso"))} icon={CheckCircle} tono="verde" />
        <KpiCard label="Advertencias" valor={String(cuenta("Advertencia"))} sub="Mermas y vencimientos" icon={AlertTriangle} tono="naranja" />
        <KpiCard label="Anulaciones" valor={String(cuenta("Anulación"))} icon={XCircle} tono="azul" />
      </div>

      <Panel titulo="Movimientos" accion={<Pestanas items={MODULOS} activa={modulo} onCambiar={conFiltro(setModulo)} />}>
        <div className="adm-filtros">
          <label>Desde<input type="date" className="ui-input" value={desde} onChange={(e) => conFiltro(setDesde)(e.target.value)} /></label>
          <label>Hasta<input type="date" className="ui-input" value={hasta} onChange={(e) => conFiltro(setHasta)(e.target.value)} /></label>
        </div>
        {visibles.length === 0 ? (
          <Vacio texto="Sin movimientos para estos filtros." />
        ) : (
          <div className="adm-tabla-wrap">
            <table className="ui-table">
              <thead>
                <tr><th>Fecha / Hora</th><th>Módulo</th><th>Acción</th><th>Registro</th><th>Cantidad / Monto</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {visibles.map((m) => (
                  <tr key={m.id}>
                    <td>{fechaHora(m.fecha)}</td>
                    <td>{m.modulo}</td>
                    <td>{m.accion}</td>
                    <td>{m.registro}</td>
                    <td>{m.cantidad}</td>
                    <td><span className={`ui-badge ${CLASE_ESTADO[m.estado]}`}><span className="ui-badge__dot" />{m.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="adm-paginas">
          <span>Mostrando {visibles.length} de {filtrados.length} registros</span>
          <div>
            <button type="button" className="ui-btn ui-btn--ghost" disabled={actual <= 1} onClick={() => setPagina(actual - 1)}>Anterior</button>
            <span>{actual} / {paginas}</span>
            <button type="button" className="ui-btn ui-btn--ghost" disabled={actual >= paginas} onClick={() => setPagina(actual + 1)}>Siguiente</button>
          </div>
        </footer>
      </Panel>
    </div>
  );
}
