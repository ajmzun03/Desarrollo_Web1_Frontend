import { useState } from "react";
import { Link } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { Cargando, ErrorMsg, Vacio } from "../components/Estados";
import { useDatos } from "../../hooks/useDatos";
import { useRepetirPedido } from "../hooks/useRepetirPedido";
import { portalService } from "../services/portal.service";
import { useSesionCliente } from "../store/sesion";
import { ESTADO_CLASE, ESTADO_LABEL } from "../../utils/pedidoEstados";
import { fechaCorta, numeroPedido, quetzales } from "../utils/formato";
import type { Pedido } from "../../types";

type Filtro = "todos" | "entregados" | "cancelados" | "proceso";
const FILTROS: { id: Filtro; label: string; ok: (p: Pedido) => boolean }[] = [
  { id: "todos", label: "Todos", ok: () => true },
  { id: "entregados", label: "Entregados", ok: (p) => p.estado === "ENTREGADO" },
  { id: "cancelados", label: "Cancelados", ok: (p) => p.estado === "ANULADO" },
  { id: "proceso", label: "En proceso", ok: (p) => p.estado === "CREADO" || p.estado === "LISTO" || p.estado === "EN_RUTA" },
];

export default function MisPedidos() {
  const cliente = useSesionCliente();
  const { datos, cargando, error } = useDatos(
    () => (cliente ? portalService.getPedidosDeCliente(cliente.id) : Promise.resolve([] as Pedido[])),
    cliente?.id ?? null,
  );
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const repetir = useRepetirPedido();
  const [fallo, setFallo] = useState<string | null>(null);

  const lista = (datos ?? [])
    .filter(FILTROS.find((f) => f.id === filtro)!.ok)
    .sort((a, b) => b.fecha_pedido.localeCompare(a.fecha_pedido));

  return (
    <PortalLayout>
      <div className="p-contenedor p-contenedor--medio">
        <header className="p-pagina-cab">
          <span className="p-sobretitulo">HISTORIAL</span>
          <h1 className="p-titulo">Mis pedidos</h1>
        </header>

        {!cliente ? (
          <Vacio titulo="Inicia sesión para ver tus pedidos" texto="Identifícate con tu teléfono para ver tu historial.">
            <Link href="/login" className="p-btn">INICIAR SESIÓN</Link>
          </Vacio>
        ) : (
          <>
            <div className="p-tabs" role="tablist">
              {FILTROS.map((f) => (
                <button key={f.id} type="button" role="tab" aria-selected={filtro === f.id} className={filtro === f.id ? "p-tab p-tab--activo" : "p-tab"} onClick={() => setFiltro(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            {cargando && <Cargando />}
            {error && <ErrorMsg mensaje={error} />}
            {fallo && <ErrorMsg mensaje={fallo} />}
            {datos && lista.length === 0 && <Vacio titulo="Sin pedidos" texto="Aún no hay pedidos en esta categoría." />}
            <ul className="p-pedidos">
              {lista.map((p) => (
                <li key={p.id} className="p-pedido">
                  <div>
                    <strong>{numeroPedido(p.id)}</strong>
                    <span className={`ui-badge ${ESTADO_CLASE[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span>
                    <small>{fechaCorta(p.fecha_pedido)}</small>
                    {p.observaciones && <p className="p-sub">{p.observaciones}</p>}
                  </div>
                  <div className="p-pedido__der">
                    <strong>{quetzales(p.total)}</strong>
                    <div className="p-pedido__acciones">
                      <Link href={`/mis-pedidos/${p.id}`} className="p-btn p-btn--sm p-btn--fantasma">Ver detalle</Link>
                      {p.estado !== "ANULADO" && (
                        <button type="button" className="p-btn p-btn--sm" onClick={() => repetir(p.id).catch((e: unknown) => setFallo(e instanceof Error ? e.message : "No se pudo repetir el pedido."))}>
                          Repetir
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
