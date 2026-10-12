import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import "../../styles/admin.css";

interface KpiProps {
  label: string;
  valor: string;
  sub?: string;
  icon: LucideIcon;
  tono?: "rojo" | "naranja" | "verde" | "azul";
  variacion?: number | null;
}

export const KpiCard = ({ label, valor, sub, icon: Icon, tono = "rojo", variacion }: KpiProps) => (
  <article className="adm-kpi">
    <div className="adm-kpi__cab">
      <span className={`adm-kpi__icono adm-kpi__icono--${tono}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      {variacion != null && (
        <span className={variacion >= 0 ? "adm-delta adm-delta--sube" : "adm-delta adm-delta--baja"}>
          {variacion >= 0 ? "+" : ""}
          {variacion.toFixed(1)}%
        </span>
      )}
    </div>
    <p className="adm-kpi__valor">{valor}</p>
    <p className="adm-kpi__label">{label}</p>
    {sub && <p className="adm-kpi__sub">{sub}</p>}
  </article>
);

export const Panel = ({ titulo, sub, accion, children, className = "" }: { titulo: string; sub?: string; accion?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`adm-panel ${className}`}>
    <header className="adm-panel__cab">
      <div>
        <h2>{titulo}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {accion}
    </header>
    {children}
  </section>
);

export const Pestanas = <T extends string>({ items, activa, onCambiar }: { items: { id: T; label: string }[]; activa: T; onCambiar: (id: T) => void }) => (
  <div className="adm-tabs" role="tablist">
    {items.map((t) => (
      <button key={t.id} type="button" role="tab" aria-selected={activa === t.id} className={activa === t.id ? "adm-tab adm-tab--activa" : "adm-tab"} onClick={() => onCambiar(t.id)}>
        {t.label}
      </button>
    ))}
  </div>
);

export const Cargando = ({ texto = "Cargando…" }: { texto?: string }) => (
  <p className="adm-estado" role="status">{texto}</p>
);

export const Vacio = ({ texto }: { texto: string }) => <p className="adm-vacio">{texto}</p>;

interface SerieBarras {
  nombre: string;
  color: string;
  valores: number[];
}

// Grafico de barras agrupadas con CSS puro (sin dependencias). `formato` da el texto accesible/tooltip.
export const BarChart = ({ etiquetas, series, formato, alto = 180 }: { etiquetas: string[]; series: SerieBarras[]; formato: (n: number) => string; alto?: number }) => {
  const max = Math.max(1, ...series.flatMap((s) => s.valores));
  const resumen = etiquetas.map((e, i) => `${e}: ${series.map((s) => `${s.nombre} ${formato(s.valores[i])}`).join(", ")}`).join("; ");
  return (
    <div>
      <div className="adm-barras" style={{ height: alto }} role="img" aria-label={resumen}>
        {etiquetas.map((e, i) => (
          <div key={e} className="adm-barras__grupo">
            <div className="adm-barras__cols">
              {series.map((s) => (
                <span key={s.nombre} className="adm-barras__col" title={`${s.nombre}: ${formato(s.valores[i])}`} style={{ height: `${(s.valores[i] / max) * 100}%`, background: s.color }} />
              ))}
            </div>
            <span className="adm-barras__et">{e}</span>
          </div>
        ))}
      </div>
      {series.length > 1 && (
        <ul className="adm-leyenda">
          {series.map((s) => (
            <li key={s.nombre}>
              <i style={{ background: s.color }} /> {s.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
