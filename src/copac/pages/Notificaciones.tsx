import { useCallback, useEffect, useState } from "react";
import { Bell, AlertTriangle, Clock, CheckCircle, Info, X } from "lucide-react";
import "../styles/ui.css";
import "../styles/notificaciones.css";
import { notificacionesService } from "../services/notificaciones.service";
import { getCookie } from "../utils/cookies";
import type { Notificacion, TipoNotificacion, RolUsuario } from "../types";

type Filtro = "todas" | "no-leidas" | "criticas";
type Severidad = "critica" | "advertencia" | "exito" | "info";

// Severidad e ícono visuales derivados del tipo de notificación (solo frontend).
const SEVERIDAD: Record<TipoNotificacion, Severidad> = {
  LOTE_VENCIDO: "critica",
  RECEPCION_INCOMPLETA: "critica",
  LOTE_POR_VENCER: "advertencia",
  SOLICITUD_INSUMO_PENDIENTE: "advertencia",
  PEDIDO_LISTO: "exito",
  PEDIDO_NUEVO: "info",
};

const SEV_LABEL: Record<Severidad, string> = {
  critica: "Crítica",
  advertencia: "Advertencia",
  exito: "Éxito",
  info: "Información",
};

const SEV_ICON = {
  critica: AlertTriangle,
  advertencia: Clock,
  exito: CheckCircle,
  info: Info,
} as const;

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default function Notificaciones() {
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    let rol: RolUsuario | undefined;
    try {
      const usuario = JSON.parse(getCookie("usuario") ?? "null");
      rol = usuario?.rol;
    } catch {
      rol = undefined;
    }
    try {
      const todas = await notificacionesService.getAll();
      const visibles = todas.filter((n) => !rol || n.roles_destino.includes(rol));
      setNotifs(visibles.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar las notificaciones.");
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

  const noLeidas = notifs.filter((n) => !n.leida).length;

  const mostradas = notifs.filter((n) => {
    if (filtro === "no-leidas") return !n.leida;
    if (filtro === "criticas")
      return SEVERIDAD[n.tipo] === "critica" || SEVERIDAD[n.tipo] === "advertencia";
    return true;
  });

  const marcarLeida = (id: number) => setNotifs((p) => p.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  const marcarTodasLeidas = () => setNotifs((p) => p.map((n) => ({ ...n, leida: true })));
  const descartar = (id: number) => setNotifs((p) => p.filter((n) => n.id !== id));

  const PILLS: { id: Filtro; label: string }[] = [
    { id: "todas", label: `Todas (${notifs.length})` },
    { id: "no-leidas", label: `Sin leer (${noLeidas})` },
    { id: "criticas", label: "Críticas" },
  ];

  if (cargando) {
    return (
      <div className="notif__content">
        <p className="notif__subtitle">Cargando notificaciones…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notif__content">
        <div className="ui-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="notif__content">
      <div className="notif__head">
        <div className="notif__head-left">
          <div className="notif__head-icon">
            <Bell size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="notif__title">Centro de notificaciones</h2>
            <p className="notif__subtitle">
              {noLeidas} {noLeidas === 1 ? "notificación sin leer" : "notificaciones sin leer"}
            </p>
          </div>
        </div>
        {noLeidas > 0 && (
          <button className="notif__markall" onClick={marcarTodasLeidas}>
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="notif__filtros">
        {PILLS.map((p) => (
          <button
            key={p.id}
            className={`notif__pill ${filtro === p.id ? "notif__pill--activo" : ""}`}
            onClick={() => setFiltro(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="notif__list">
        {mostradas.length === 0 && (
          <div className="notif__empty">
            <CheckCircle size={32} className="notif__empty-icon" />
            <p className="notif__empty-text">Sin notificaciones</p>
            <p className="notif__empty-sub">Todo está al día.</p>
          </div>
        )}
        {mostradas.map((n) => {
          const sev = SEVERIDAD[n.tipo];
          const Icon = SEV_ICON[sev];
          return (
            <div
              key={n.id}
              className={`notif__card notif__card--${sev} ${n.leida ? "notif__card--leida" : "notif__card--no-leida"}`}
              onClick={() => marcarLeida(n.id)}
            >
              <div className={`notif__icon ${n.leida ? "notif__icon--leida" : `notif__icon--${sev}`}`}>
                <Icon size={15} aria-hidden="true" />
              </div>
              <div className="notif__body">
                <div className="notif__fila">
                  <div className="notif__contenido">
                    {!n.leida && <span className={`notif__dot notif__dot--${sev}`} />}
                    <p className="notif__texto">{n.mensaje}</p>
                  </div>
                  <button
                    className="notif__close"
                    onClick={(e) => {
                      e.stopPropagation();
                      descartar(n.id);
                    }}
                    aria-label="Descartar notificación"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="notif__meta">
                  <span className={`notif__chip notif__chip--${sev}`}>{SEV_LABEL[sev]}</span>
                  <span className="notif__time">{tiempoRelativo(n.fecha)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}