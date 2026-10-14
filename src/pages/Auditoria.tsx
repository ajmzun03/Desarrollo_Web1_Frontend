import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, Download, Eye, RefreshCw } from "lucide-react";
import "../styles/ui.css";
import "../styles/auditoria.css";
import { auditoriaService } from "../services/auditoria.service";
import type { AuditoriaRegistro, EstadoAuditoria } from "../types";

const TAMANO_PAGINA = 10;

const ESTADO_META: Record<EstadoAuditoria, { clase: string; label: string }> = {
  EXITOSO: { clase: "aud__estado--exitoso", label: "Exitoso" },
  ADVERTENCIA: { clase: "aud__estado--advertencia", label: "Advertencia" },
  ANULACION: { clase: "aud__estado--anulacion", label: "Anulación" },
  NEUTRAL: { clase: "aud__estado--neutral", label: "Neutral" },
};

function formatoFecha(iso: string): string {
  const fecha = iso.slice(0, 10);
  const hora = iso.slice(11, 16);
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y} ${hora}`;
}

const soloDia = (iso: string) => iso.slice(0, 10);

export default function Auditoria() {
  const [registros, setRegistros] = useState<AuditoriaRegistro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [moduloFiltro, setModuloFiltro] = useState("Todos");
  const [usuarioFiltro, setUsuarioFiltro] = useState("Todos");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  const cargar = useCallback(async (): Promise<AuditoriaRegistro[]> => {
    return auditoriaService.getAll();
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const d = await cargar();
        if (activo) setRegistros(d);
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : "Error al cargar la auditoría.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cargar]);

  const recargar = async () => {
    setCargando(true);
    setError(null);
    try {
      setRegistros(await cargar());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar la auditoría.");
    } finally {
      setCargando(false);
    }
  };

  const modulos = useMemo(() => {
    const set = new Set(registros.map((r) => r.modulo));
    return ["Todos", ...Array.from(set).sort()];
  }, [registros]);

  const usuarios = useMemo(() => {
    const set = new Set(registros.map((r) => r.usuario));
    return ["Todos", ...Array.from(set).sort()];
  }, [registros]);

  const resumen = useMemo(
    () => ({
      total: registros.length,
      exitosas: registros.filter((r) => r.estado === "EXITOSO").length,
      advertencias: registros.filter((r) => r.estado === "ADVERTENCIA").length,
      anulaciones: registros.filter((r) => r.estado === "ANULACION").length,
    }),
    [registros]
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return registros.filter((r) => {
      const coincideTexto =
        texto.length === 0 ||
        r.accion.toLowerCase().includes(texto) ||
        r.usuario.toLowerCase().includes(texto) ||
        (r.registro ?? "").toLowerCase().includes(texto);
      const coincideModulo = moduloFiltro === "Todos" || r.modulo === moduloFiltro;
      const coincideUsuario = usuarioFiltro === "Todos" || r.usuario === usuarioFiltro;
      const coincideFecha = fechaFiltro === "" || soloDia(r.fecha) === fechaFiltro;
      return coincideTexto && coincideModulo && coincideUsuario && coincideFecha;
    });
  }, [registros, busqueda, moduloFiltro, usuarioFiltro, fechaFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANO_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * TAMANO_PAGINA;
  const visibles = filtrados.slice(inicio, inicio + TAMANO_PAGINA);

  const exportarCsv = () => {
    const cab = ["Fecha", "Usuario", "Rol", "Módulo", "Acción", "Registro", "Estado"];
    const filas = filtrados.map((r) => [
      formatoFecha(r.fecha),
      r.usuario,
      r.rol,
      r.modulo,
      r.accion,
      r.registro ?? "",
      ESTADO_META[r.estado].label,
    ]);
    const csv = [cab, ...filas].map((f) => f.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auditoria.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="aud">
      <header className="aud__head">
        <div>
          <h1 className="aud__title">Auditoría del Sistema</h1>
          <p className="aud__subtitle">Registro de todas las acciones · {resumen.total} registros</p>
        </div>
        <div className="aud__acciones">
          <button className="ui-btn ui-btn--secondary" onClick={recargar}>
            <RefreshCw size={14} aria-hidden="true" /> Actualizar
          </button>
          <button className="ui-btn ui-btn--secondary" onClick={exportarCsv}>
            <Download size={14} aria-hidden="true" /> Exportar CSV
          </button>
        </div>
      </header>

      <section className="aud__stats">
        <div className="aud__stat aud__stat--total">
          <p className="aud__stat-valor">{resumen.total}</p>
          <p className="aud__stat-label">Total acciones</p>
        </div>
        <div className="aud__stat aud__stat--exitoso">
          <p className="aud__stat-valor">{resumen.exitosas}</p>
          <p className="aud__stat-label">Exitosas</p>
        </div>
        <div className="aud__stat aud__stat--advertencia">
          <p className="aud__stat-valor">{resumen.advertencias}</p>
          <p className="aud__stat-label">Advertencias</p>
        </div>
        <div className="aud__stat aud__stat--anulacion">
          <p className="aud__stat-valor">{resumen.anulaciones}</p>
          <p className="aud__stat-label">Anulaciones</p>
        </div>
      </section>

      <section className="aud__filtros">
        <div className="aud__search">
          <Search size={14} className="aud__search-ico" aria-hidden="true" />
          <input
            type="text"
            className="aud__search-input"
            placeholder="Buscar acción, usuario, registro..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <div className="aud__select-wrap">
          <select
            className="ui-select aud__select"
            value={moduloFiltro}
            onChange={(e) => {
              setModuloFiltro(e.target.value);
              setPagina(1);
            }}
          >
            {modulos.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <ChevronDown size={12} className="aud__select-ico" aria-hidden="true" />
        </div>
        <div className="aud__select-wrap">
          <select
            className="ui-select aud__select"
            value={usuarioFiltro}
            onChange={(e) => {
              setUsuarioFiltro(e.target.value);
              setPagina(1);
            }}
          >
            {usuarios.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <ChevronDown size={12} className="aud__select-ico" aria-hidden="true" />
        </div>
        <input
          type="date"
          className="ui-input aud__fecha"
          value={fechaFiltro}
          onChange={(e) => {
            setFechaFiltro(e.target.value);
            setPagina(1);
          }}
        />
      </section>

      {cargando ? (
        <div className="ui-panel aud__estado">Cargando auditoría…</div>
      ) : error ? (
        <div className="ui-error">{error}</div>
      ) : (
        <div className="ui-panel aud__panel">
          <div className="aud__tabla-wrap">
            <table className="aud__tabla">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th aria-label="Ver" />
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 ? (
                  <tr>
                    <td className="aud__vacio" colSpan={8}>
                      No se encontraron registros con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  visibles.map((r) => {
                    const meta = ESTADO_META[r.estado];
                    return (
                      <tr
                        key={r.id}
                        className={`aud__fila ${seleccionado === r.id ? "aud__fila--sel" : ""}`}
                        onClick={() => setSeleccionado(seleccionado === r.id ? null : r.id)}
                      >
                        <td className="aud__celda-fecha">{formatoFecha(r.fecha)}</td>
                        <td className="aud__celda-usuario">{r.usuario}</td>
                        <td className="aud__celda-rol">{r.rol}</td>
                        <td>
                          <span className="aud__tag">{r.modulo}</span>
                        </td>
                        <td className="aud__celda-accion">{r.accion}</td>
                        <td className="aud__celda-registro">{r.registro ?? "—"}</td>
                        <td>
                          <span className={`aud__estado ${meta.clase}`}>{meta.label}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="aud__ver"
                            aria-label="Ver detalle"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSeleccionado(seleccionado === r.id ? null : r.id);
                            }}
                          >
                            <Eye size={14} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="aud__pie">
            <p className="aud__pie-txt">
              Mostrando {visibles.length === 0 ? 0 : inicio + 1}–{inicio + visibles.length} de {filtrados.length}{" "}
              registros
            </p>
            <div className="aud__paginacion">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`aud__pagina ${p === paginaActual ? "aud__pagina--activo" : ""}`}
                  onClick={() => setPagina(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
