import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  ChevronRight,
  Check,
  X,
  Phone,
  MapPin,
  ShoppingBag,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle,
  Star,
  ArrowLeft,
} from "lucide-react";
import "../styles/ui.css";
import "../styles/ventas.css";
import { clientesService } from "../services/clientes.service";
import { pedidosService } from "../services/pedidos.service";
import { productosService } from "../services/productos.service";
import { categoriasService } from "../services/categorias.service";
import { direccionesService } from "../services/direcciones.service";
import { facturasVentaService } from "../services/facturasVenta.service";
import { schemaCliente, schemaPedidoCreate } from "../schemas";
import { BadgeEstado } from "../components/BadgeEstado";
import { ESTADO_LABEL } from "../utils/pedidoEstados";
import type {
  Cliente,
  Direccion,
  Producto,
  Pedido,
  PedidoConDetalles,
  PedidoCreateInput,
  Categoria,
  EstadoPedido,
  FacturaVenta,
} from "../types";
import type { ProductoDisponibilidad } from "../services/productos.service";

type Tab = "dashboard" | "clientes" | "nuevo-pedido" | "seguimiento";

const ORDEN_TRACKING: EstadoPedido[] = ["CREADO", "EN_PREPARACION", "LISTO", "EN_RUTA", "ENTREGADO"];

const q = (n: number) => `Q ${n.toFixed(2)}`;
const nombreCliente = (c: Cliente) => `${c.nombre} ${c.apellido}`;
const horaPedido = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "short" });

interface DashboardProps {
  pedidos: Pedido[];
  facturas: FacturaVenta[];
  clientes: Cliente[];
  onNuevoPedido: () => void;
}

function Dashboard({ pedidos, facturas, clientes, onNuevoPedido }: DashboardProps) {
  const ventasTotal = useMemo(
    () => facturas.reduce((sum, f) => sum + Number(f.total || 0), 0),
    [facturas]
  );
  const pendientes = pedidos.filter((p) => p.estado === "CREADO" || p.estado === "LISTO").length;
  const entregados = pedidos.filter((p) => p.estado === "ENTREGADO").length;

  const stats = [
    { label: "Pedidos registrados", value: String(pedidos.length), icon: ShoppingBag },
    { label: "Ventas (facturas)", value: q(ventasTotal), icon: Star },
    { label: "Pendientes", value: String(pendientes), icon: Clock },
    { label: "Entregados", value: String(entregados), icon: CheckCircle },
  ];

  const ordenados = [...pedidos].sort(
    (a, b) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime()
  );

  return (
    <div className="ventas__content">
      <div className="ventas__stats">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="ui-panel ventas__stat">
              <div className="ventas__stat-top">
                <div className="ventas__stat-icon">
                  <Icon size={15} />
                </div>
              </div>
              <p className="ventas__stat-value">{s.value}</p>
              <p className="ventas__stat-label">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="ventas__section-header ventas__section-header--mt">
        <h2 className="ventas__title">Ventas</h2>
      </div>
      <button className="ventas__quick" onClick={onNuevoPedido}>
        <Plus size={16} /> Registrar nuevo pedido
      </button>

      <div className="ui-panel ventas__panel ventas__panel--mt">
        <p className="ventas__panel-title">Pedidos recientes</p>
        <table className="ui-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((p) => (
              <tr key={p.id}>
                <td className="ventas__track-id">#{p.id}</td>
                <td>{clienteNombre(p.cliente_id, clientes)}</td>
                <td>{q(Number(p.total || 0))}</td>
                <td>
                  <BadgeEstado estado={p.estado} />
                </td>
                <td>{horaPedido(p.fecha_pedido)}</td>
              </tr>
            ))}
            {ordenados.length === 0 && (
              <tr>
                <td colSpan={5}>Sin pedidos registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function clienteNombre(clienteId: number, clientes: Cliente[]): string {
  const c = clientes.find((x) => x.id === clienteId);
  return c ? nombreCliente(c) : `Cliente #${clienteId}`;
}

interface ClientesTabProps {
  clientes: Cliente[];
  direcciones: Direccion[];
  pedidos: Pedido[];
  onGuardarCliente: (data: Omit<Cliente, "id" | "creado_en">) => Promise<Cliente>;
}

function ClientesTab({ clientes, direcciones, pedidos, onGuardarCliente }: ClientesTabProps) {
  const [busqueda, setBusqueda] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", telefono: "", telefono_ref: "" });
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const direccionDe = (clienteId: number) =>
    direcciones.find((d) => d.cliente_id === clienteId)?.direccion1 ?? "Sin dirección";

  const pedidosDe = (clienteId: number) => {
    const propios = pedidos.filter((p) => p.cliente_id === clienteId);
    const ultimo = propios.reduce<Pedido | null>((acc, p) => {
      if (!acc || new Date(p.fecha_pedido) > new Date(acc.fecha_pedido)) return p;
      return acc;
    }, null);
    return { cuenta: propios.length, ultimo };
  };

  const filtrados = clientes.filter(
    (c) =>
      nombreCliente(c).toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono.includes(busqueda)
  );

  const guardar = async () => {
    const res = schemaCliente.safeParse(form);
    if (!res.success) {
      setErrores(res.error.issues.map((i) => i.message));
      return;
    }
    setErrores([]);
    setGuardando(true);
    try {
      await onGuardarCliente(res.data);
      setForm({ nombre: "", apellido: "", telefono: "", telefono_ref: "" });
      setShowForm(false);
    } catch {
      setErrores(["No se pudo guardar el cliente."]);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="ventas__content">
      <div className="ventas__section-header">
        <div>
          <h2 className="ventas__title">Clientes registrados</h2>
          <p className="ventas__subtitle">{clientes.length} clientes en total</p>
        </div>
        <button className="ui-btn ui-btn--primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      {showForm && (
        <div className="ui-panel ventas__panel ventas__panel--padded">
          <div className="ventas__section-header">
            <h3 className="ventas__title">Registrar nuevo cliente</h3>
            <button className="ventas__detail-close" onClick={() => setShowForm(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="ventas__form-grid">
            <div className="ventas__form-field">
              <label className="ventas__form-label">Nombre</label>
              <input
                className="ventas__form-input"
                placeholder="Ana"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div className="ventas__form-field">
              <label className="ventas__form-label">Apellido</label>
              <input
                className="ventas__form-input"
                placeholder="López"
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              />
            </div>
            <div className="ventas__form-field">
              <label className="ventas__form-label">Teléfono principal</label>
              <input
                className="ventas__form-input"
                placeholder="55510001"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div className="ventas__form-field">
              <label className="ventas__form-label">Teléfono de referencia</label>
              <input
                className="ventas__form-input"
                placeholder="55510002"
                value={form.telefono_ref}
                onChange={(e) => setForm({ ...form, telefono_ref: e.target.value })}
              />
            </div>
          </div>
          {errores.length > 0 && (
            <div className="ventas__form-error">{errores.join(" · ")}</div>
          )}
          <div className="ventas__form-actions">
            <button className="ui-btn ui-btn--primary" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar cliente"}
            </button>
            <button className="ui-btn ui-btn--secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="ventas__search">
        <Search size={15} className="ventas__search-icon" />
        <input
          className="ventas__search-input"
          placeholder="Buscar cliente por nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="ui-panel ventas__panel">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Pedidos</th>
              <th>Último pedido</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => {
              const { cuenta, ultimo } = pedidosDe(c.id);
              return (
                <tr key={c.id}>
                  <td>
                    <div className="ventas__cell-client">
                      <span className="ventas__avatar">{c.nombre[0]}</span>
                      <span className="ventas__cell-client-name">{nombreCliente(c)}</span>
                    </div>
                  </td>
                  <td>{c.telefono}</td>
                  <td>{direccionDe(c.id)}</td>
                  <td className="ventas__td-center">{cuenta}</td>
                  <td>{ultimo ? fechaCorta(ultimo.fecha_pedido) : "—"}</td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5}>No se encontraron clientes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CreateOrderProps {
  clientes: Cliente[];
  direcciones: Direccion[];
  pedidos: Pedido[];
  productos: ProductoDisponibilidad[];
  categorias: Categoria[];
  onGuardarCliente: (data: Omit<Cliente, "id" | "creado_en">) => Promise<Cliente>;
  onCrearPedido: (input: PedidoCreateInput) => Promise<PedidoConDetalles>;
  onVerSeguimiento: () => void;
}

type PayMethod = "efectivo" | "tarjeta";
type OrderStep = 1 | 2 | 3 | 4;

function CreateOrder({
  clientes,
  direcciones,
  pedidos,
  productos,
  categorias,
  onGuardarCliente,
  onCrearPedido,
  onVerSeguimiento,
}: CreateOrderProps) {
  const [step, setStep] = useState<OrderStep>(1);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [payMethod, setPayMethod] = useState<PayMethod>("efectivo");
  const [obs, setObs] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [catSel, setCatSel] = useState("Todos");
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", apellido: "", telefono: "", telefono_ref: "" });
  const [erroresNuevo, setErroresNuevo] = useState<string[]>([]);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState<PedidoConDetalles | null>(null);
  const [errorCrear, setErrorCrear] = useState("");

  const categoriaDesc = (categoriaId: number) =>
    categorias.find((c) => c.categoria_id === categoriaId)?.descripcion ?? "Otros";

  const pills = useMemo(() => {
    const desc = (categoriaId: number) =>
      categorias.find((c) => c.categoria_id === categoriaId)?.descripcion ?? "Otros";
    return ["Todos", ...Array.from(new Set(productos.map((p) => desc(p.categoria_id))))];
  }, [productos, categorias]);

  const filtrados = productos.filter(
    (p) => catSel === "Todos" || categoriaDesc(p.categoria_id) === catSel
  );

  const cartItems = productos.filter((p) => (cart[p.id] || 0) > 0);
  const subtotal = cartItems.reduce((s, p) => s + Number(p.precio || 0) * cart[p.id], 0);
  const total = subtotal;

  const clientesFiltrados = clientes.filter(
    (c) =>
      nombreCliente(c).toLowerCase().includes(busquedaCliente.toLowerCase()) ||
      c.telefono.includes(busquedaCliente)
  );

  const direccionDe = (clienteId: number) =>
    direcciones.find((d) => d.cliente_id === clienteId)?.direccion1 ?? "Sin dirección";

  const addToCart = (id: number) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removeFromCart = (id: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));

  const guardarNuevoCliente = async () => {
    const res = schemaCliente.safeParse(nuevo);
    if (!res.success) {
      setErroresNuevo(res.error.issues.map((i) => i.message));
      return;
    }
    setErroresNuevo([]);
    setGuardandoNuevo(true);
    try {
      const creado = await onGuardarCliente(res.data);
      setClienteSel(creado);
      setBusquedaCliente("");
      setShowNuevoCliente(false);
      setNuevo({ nombre: "", apellido: "", telefono: "", telefono_ref: "" });
    } catch {
      setErroresNuevo(["No se pudo guardar el cliente."]);
    } finally {
      setGuardandoNuevo(false);
    }
  };

  const confirmarPedido = async () => {
    const items = cartItems.map((p) => ({ producto_id: p.id, cantidad: cart[p.id] }));
    const res = schemaPedidoCreate.safeParse({ cliente_id: clienteSel?.id, observaciones: obs.trim() || undefined, items });
    if (!res.success) {
      setErrorCrear(res.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    setErrorCrear("");
    try {
      // TODO: el pago (efectivo/tarjeta) es solo visual; no existe endpoint para registrarlo.
      const creado = await onCrearPedido(res.data);
      setPedidoCreado(creado);
      setStep(4);
    } catch {
      setErrorCrear("No se pudo registrar el pedido.");
    }
  };

  const resetear = () => {
    setStep(1);
    setClienteSel(null);
    setCart({});
    setObs("");
    setPedidoCreado(null);
  };

  const pasos = [
    { n: 1, label: "Cliente" },
    { n: 2, label: "Productos" },
    { n: 3, label: "Checkout" },
    { n: 4, label: "Confirmado" },
  ];

  return (
    <div className="ventas__content ventas__wizard-root">
      <div className="ventas__steps">
        {pasos.map((s, i, arr) => (
          <div key={s.n} className="ventas__step">
            <div className="ventas__step">
              <span
                className={`ventas__step-num ${
                  step > s.n ? "ventas__step-num--done" : step === s.n ? "ventas__step-num--active" : ""
                }`}
              >
                {step > s.n ? <Check size={12} /> : s.n}
              </span>
              <span className={`ventas__step-label ${step >= s.n ? "ventas__step-label--on" : ""}`}>
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <span className={`ventas__step-line ${step > s.n ? "ventas__step-line--done" : ""}`} />
            )}
          </div>
        ))}
      </div>

      {/* Paso 1 — Cliente */}
      {step === 1 && (
        <div className="ventas__content">
          <div className="ventas__client-area">
            <h2 className="ventas__title">Seleccionar cliente</h2>
            <p className="ventas__subtitle">Busca o selecciona el cliente para el pedido.</p>
            <div className="ventas__search">
              <Search size={15} className="ventas__search-icon" />
              <input
                className="ventas__search-input"
                placeholder="Buscar por nombre o teléfono..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
              />
            </div>

            {showNuevoCliente && (
              <div className="ui-panel ventas__panel ventas__panel--padded-sm">
                <div className="ventas__form-grid">
                  <div className="ventas__form-field">
                    <label className="ventas__form-label">Nombre</label>
                    <input
                      className="ventas__form-input"
                      value={nuevo.nombre}
                      placeholder="Ana"
                      onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                    />
                  </div>
                  <div className="ventas__form-field">
                    <label className="ventas__form-label">Apellido</label>
                    <input
                      className="ventas__form-input"
                      value={nuevo.apellido}
                      placeholder="López"
                      onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })}
                    />
                  </div>
                  <div className="ventas__form-field">
                    <label className="ventas__form-label">Teléfono principal</label>
                    <input
                      className="ventas__form-input"
                      value={nuevo.telefono}
                      placeholder="55510001"
                      onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                    />
                  </div>
                  <div className="ventas__form-field">
                    <label className="ventas__form-label">Teléfono de referencia</label>
                    <input
                      className="ventas__form-input"
                      value={nuevo.telefono_ref}
                      placeholder="55510002"
                      onChange={(e) => setNuevo({ ...nuevo, telefono_ref: e.target.value })}
                    />
                  </div>
                </div>
                {erroresNuevo.length > 0 && (
                  <div className="ventas__form-error">{erroresNuevo.join(" · ")}</div>
                )}
                <div className="ventas__form-actions">
                  <button
                    className="ui-btn ui-btn--primary"
                    onClick={guardarNuevoCliente}
                    disabled={guardandoNuevo}
                  >
                    {guardandoNuevo ? "Guardando…" : "Guardar y seleccionar"}
                  </button>
                  <button className="ui-btn ui-btn--secondary" onClick={() => setShowNuevoCliente(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="ventas__client-list">
              {clientesFiltrados.map((c) => {
                const seleccionado = clienteSel?.id === c.id;
                return (
                  <button
                    key={c.id}
                    className={`ventas__client-row ${seleccionado ? "ventas__client-row--selected" : ""}`}
                    onClick={() => setClienteSel(c)}
                  >
                    <span className="ventas__avatar">{c.nombre[0]}</span>
                    <span className="ventas__client-main">
                      <span className="ventas__client-name">{nombreCliente(c)}</span>
                      <span className="ventas__client-meta">
                        <Phone size={10} /> {c.telefono} · <MapPin size={10} /> {direccionDe(c.id)}
                      </span>
                    </span>
                    <span className="ventas__client-side">
                      {pedidosPorCliente(c.id, pedidos)} pedidos
                    </span>
                    {seleccionado && <Check size={16} className="ventas__client-check" />}
                  </button>
                );
              })}
              {clientesFiltrados.length === 0 && (
                <p className="ventas__cart-empty">No se encontraron clientes.</p>
              )}
            </div>

            <div className="ventas__client-actions">
              <button className="ventas__dashed-btn" onClick={() => setShowNuevoCliente((v) => !v)}>
                <Plus size={14} /> Nuevo cliente
              </button>
              {clienteSel && (
                <button className="ui-btn ui-btn--primary" onClick={() => setStep(2)}>
                  Continuar <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Paso 2 — Productos */}
      {step === 2 && (
        <div className="ventas__wizard-body">
          <div className="ventas__wizard-main">
            <h2 className="ventas__title">Seleccionar productos</h2>
            <p className="ventas__subtitle">
              Cliente: <strong>{clienteSel ? nombreCliente(clienteSel) : "—"}</strong>
            </p>
            <div className="ventas__pills">
              {pills.map((cat) => (
                <button
                  key={cat}
                  className={`ventas__pill ${catSel === cat ? "ventas__pill--active" : ""}`}
                  onClick={() => setCatSel(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="ventas__grid">
              {filtrados.map((p) => {
                const sinStock = typeof p.disponible === "number" && p.disponible <= 0;
                const cantidad = cart[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className={`ventas__card ${
                      sinStock
                        ? "ventas__card--sin-stock"
                        : cantidad > 0
                          ? "ventas__card--selected"
                          : ""
                    }`}
                  >
                    <div className={`ventas__card-thumb ${sinStock ? "ventas__card-thumb--out" : ""}`}>
                      <span className="ventas__thumb-letter">{p.producto[0]}</span>
                      <span className={`ventas__avail ${sinStock ? "ventas__avail--out" : ""}`}>
                        {sinStock ? "No disponible" : "Disponible"}
                      </span>
                    </div>
                    <div className="ventas__card-body">
                      <p className="ventas__card-name">{p.producto}</p>
                      <p className="ventas__card-cat">{categoriaDesc(p.categoria_id)}</p>
                      <div className="ventas__card-foot">
                        <p className="ventas__card-price">{q(Number(p.precio || 0))}</p>
                        <div className="ventas__stepper">
                          <button
                            className="ventas__stepper-btn"
                            onClick={() => removeFromCart(p.id)}
                          >
                            −
                          </button>
                          <span className="ventas__stepper-qty">{cantidad}</span>
                          <button
                            className="ventas__stepper-btn ventas__stepper-btn--add"
                            onClick={() => addToCart(p.id)}
                            disabled={sinStock}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="ui-panel ventas__cart">
            <p className="ventas__panel-title">Resumen del pedido</p>
            <div className="ventas__cart-items">
              {cartItems.length === 0 ? (
                <p className="ventas__cart-empty">Agrega productos al pedido</p>
              ) : (
                cartItems.map((p) => (
                  <div key={p.id} className="ventas__cart-item">
                    <div className="ventas__cart-item-info">
                      <p className="ventas__cart-item-name">{p.producto}</p>
                      <p className="ventas__cart-item-price">
                        {q(Number(p.precio || 0))} c/u ×{cart[p.id]}
                      </p>
                    </div>
                    <span className="ventas__cart-item-total">{q(Number(p.precio || 0) * cart[p.id])}</span>
                  </div>
                ))
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="ventas__totals">
                <div className="ventas__totals-row">
                  <span>Subtotal</span>
                  <span>{q(subtotal)}</span>
                </div>
                <div className="ventas__totals-row ventas__totals-row--final">
                  <span>Total</span>
                  <span className="ventas__totals-final">{q(total)}</span>
                </div>
              </div>
            )}
            <div className="ventas__cart-actions">
              <button className="ui-btn ui-btn--secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={12} /> Volver
              </button>
              <button
                className="ui-btn ui-btn--primary"
                disabled={cartItems.length === 0}
                onClick={() => setStep(3)}
              >
                Ir al checkout →
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Paso 3 — Checkout */}
      {step === 3 && (
        <div className="ventas__content">
          <div className="ventas__checkout">
            <div>
              <div className="ui-panel ventas__info-card">
                <h4 className="ventas__info-title">Cliente</h4>
                <p className="ventas__checkout-client-name">
                  {clienteSel ? nombreCliente(clienteSel) : "—"}
                </p>
                {clienteSel && (
                  <>
                    <p className="ventas__info-line">
                      <Phone size={11} /> {clienteSel.telefono}
                    </p>
                    <p className="ventas__info-line">
                      <MapPin size={11} /> {direccionDe(clienteSel.id)}
                    </p>
                  </>
                )}
              </div>
              <div className="ui-panel ventas__info-card">
                <h4 className="ventas__info-title">Método de pago</h4>
                <div className="ventas__pay-list">
                  {(
                    [
                      { id: "efectivo", label: "Efectivo", icon: Banknote },
                      { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      className={`ventas__pay ${payMethod === id ? "ventas__pay--selected" : ""}`}
                      onClick={() => setPayMethod(id)}
                    >
                      <Icon size={16} className="ventas__pay-icon" />
                      <span className="ventas__pay-label">{label}</span>
                      {payMethod === id && <Check size={14} className="ventas__pay-check" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ui-panel ventas__info-card">
                <h4 className="ventas__info-title">Observaciones</h4>
                <textarea
                  className="ventas__textarea"
                  rows={3}
                  placeholder="Sin cebolla, extra salsa, etc..."
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="ui-panel ventas__info-card">
                <h4 className="ventas__info-title">Productos</h4>
                <div className="ventas__items-list">
                  {cartItems.map((p) => (
                    <div key={p.id} className="ventas__item-line">
                      <span className="ventas__item-line-name">
                        {cart[p.id]}× {p.producto}
                      </span>
                      <span className="ventas__item-line-total">
                        {q(Number(p.precio || 0) * cart[p.id])}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="ventas__totals ventas__totals--checkout">
                  <div className="ventas__totals-row">
                    <span>Subtotal</span>
                    <span>{q(subtotal)}</span>
                  </div>
                  <div className="ventas__totals-row ventas__totals-row--final">
                    <span>Total</span>
                    <span className="ventas__totals-final">{q(total)}</span>
                  </div>
                </div>
              </div>
              {errorCrear && <div className="ventas__form-error">{errorCrear}</div>}
              <div className="ventas__checkout-actions">
                <button className="ui-btn ui-btn--secondary" onClick={() => setStep(2)}>
                  <ArrowLeft size={13} /> Volver
                </button>
                <button className="ui-btn ui-btn--primary" onClick={confirmarPedido}>
                  Confirmar pedido →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 4 — Confirmado */}
      {step === 4 && (
        <div className="ventas__content">
          <div className="ventas__success">
            <div className="ventas__success-icon">
              <CheckCircle size={36} />
            </div>
            <h3 className="ventas__success-title">¡Pedido confirmado!</h3>
            <p className="ventas__success-sub">El pedido fue registrado exitosamente.</p>
            <div className="ventas__success-order">
              <span className="ventas__success-order-id">#{pedidoCreado?.id ?? "—"}</span>
              <span className="ventas__success-order-for">
                para {clienteSel ? nombreCliente(clienteSel) : "—"}
              </span>
            </div>
            <div className="ui-panel ventas__success-box">
              <div className="ventas__success-row">
                <span>Total</span>
                <span>{q(total)}</span>
              </div>
              <div className="ventas__success-row">
                <span>Pago</span>
                <span className="ventas__pay-text">{payMethod}</span>
              </div>
            </div>
            <div className="ventas__success-actions">
              <button className="ui-btn ui-btn--primary" onClick={resetear}>
                Nuevo pedido
              </button>
              <button className="ui-btn ui-btn--secondary" onClick={onVerSeguimiento}>
                Ver seguimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pedidosPorCliente(clienteId: number, pedidos: Pedido[]): number {
  return pedidos.filter((p) => p.cliente_id === clienteId).length;
}

interface TrackingProps {
  pedidos: Pedido[];
  clientes: Cliente[];
  productos: Producto[];
  onCargarDetalle: (id: number) => Promise<PedidoConDetalles>;
}

function Tracking({ pedidos, clientes, productos, onCargarDetalle }: TrackingProps) {
  const [seleccionado, setSeleccionado] = useState<Pedido | null>(null);
  const [detalle, setDetalle] = useState<PedidoConDetalles | null>(null);

  const ordenados = [...pedidos].sort(
    (a, b) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime()
  );

  const seleccionar = async (p: Pedido) => {
    setSeleccionado(p);
    setDetalle(null);
    try {
      setDetalle(await onCargarDetalle(p.id));
    } catch {
      setDetalle(null);
    }
  };

  const nombreProducto = (id: number) =>
    productos.find((pr) => pr.id === id)?.producto ?? `Producto #${id}`;

  return (
    <div className="ventas__content">
      <div className="ventas__track">
        <div className="ventas__track-list">
          <h2 className="ventas__title">Seguimiento de pedidos</h2>
          {ordenados.map((o) => {
            const activo = seleccionado?.id === o.id;
            return (
              <button
                key={o.id}
                className={`ventas__track-row ${activo ? "ventas__track-row--selected" : ""}`}
                onClick={() => seleccionar(o)}
              >
                <div>
                  <p className="ventas__track-id">#{o.id}</p>
                  <p className="ventas__track-client">{clienteNombre(o.cliente_id, clientes)}</p>
                </div>
                <div className="ventas__track-spacer" />
                <div className="ventas__track-badge">
                  <BadgeEstado estado={o.estado} />
                </div>
                <div className="ventas__track-side">
                  <p className="ventas__track-total">{q(Number(o.total || 0))}</p>
                  <p className="ventas__track-eta">{horaPedido(o.fecha_pedido)}</p>
                </div>
              </button>
            );
          })}
          {ordenados.length === 0 && (
            <p className="ventas__cart-empty">Sin pedidos registrados.</p>
          )}
        </div>

        {seleccionado && (
          <div className="ui-panel ventas__detail">
            <div className="ventas__detail-head">
              <p className="ventas__detail-title">Detalle #{seleccionado.id}</p>
              <button className="ventas__detail-close" onClick={() => setSeleccionado(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="ventas__detail-body">
              <p className="ventas__detail-client">
                {clienteNombre(seleccionado.cliente_id, clientes)}
              </p>

              {seleccionado.estado === "ANULADO" ? (
                <div className="ventas__timeline">
                  <div className="ventas__tl">
                    <div className="ventas__tl-col">
                      <span className="ventas__tl-dot ventas__tl-dot--active" />
                    </div>
                    <div className="ventas__tl-text">
                      <p className="ventas__tl-label ventas__tl-label--done">Pedido anulado</p>
                      <p className="ventas__tl-note">Cancelado, no sigue el flujo normal.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ventas__timeline">
                  {ORDEN_TRACKING.map((st, idx) => {
                    const stepIdx = ORDEN_TRACKING.indexOf(seleccionado.estado);
                    const done = idx <= stepIdx;
                    const activo = idx === stepIdx;
                    return (
                      <div key={st} className="ventas__tl">
                        <div className="ventas__tl-col">
                          <span
                            className={`ventas__tl-dot ${
                              activo
                                ? "ventas__tl-dot--active"
                                : done
                                  ? "ventas__tl-dot--done"
                                  : ""
                            }`}
                          >
                            {done && !activo && <Check size={10} />}
                            {activo && <span className="ventas__tl-pulse" />}
                          </span>
                          {idx < ORDEN_TRACKING.length - 1 && (
                            <span
                              className={`ventas__tl-line ${done && idx < stepIdx ? "ventas__tl-line--done" : ""}`}
                            />
                          )}
                        </div>
                        <div className="ventas__tl-text">
                          <p className={`ventas__tl-label ${done ? "ventas__tl-label--done" : "ventas__tl-label--pending"}`}>
                            {ESTADO_LABEL[st]}
                          </p>
                          {activo && <p className="ventas__tl-note">En progreso...</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {detalle && (
                <div className="ventas__detail-items">
                  <p className="ventas__detail-items-title">Productos</p>
                  {detalle.detalles.map((d) => (
                    <div key={d.id} className="ventas__detail-item">
                      <span>
                        {d.cantidad}× {nombreProducto(d.producto_id)}
                      </span>
                      <span>{q(Number(d.precio_unitario || 0) * d.cantidad)}</span>
                    </div>
                  ))}
                  {detalle.observaciones && (
                    <p className="ventas__tl-note ventas__tl-note--mt">
                      Obs: {detalle.observaciones}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Ventas() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<ProductoDisponibilidad[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [facturas, setFacturas] = useState<FacturaVenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [clis, dirs, peds, prods, cats, fvs] = await Promise.all([
          clientesService.getAll(),
          direccionesService.getAll(),
          pedidosService.getAll(),
          productosService.getDisponibilidad(),
          categoriasService.getAll(),
          facturasVentaService.getAll(),
        ]);
        if (!activo) return;
        setClientes(clis);
        setDirecciones(dirs);
        setPedidos(peds);
        setProductos(
          prods.map((p) => ({
            ...p,
            disponible: typeof p.disponible === "number" ? p.disponible : 1,
          }))
        );
        setCategorias(cats);
        setFacturas(fvs);
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : "Error al cargar datos.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const guardarCliente = async (
    data: Omit<Cliente, "id" | "creado_en">
  ): Promise<Cliente> => {
    const creado = await clientesService.create(data);
    setClientes((prev) => [creado, ...prev]);
    return creado;
  };

  const crearPedido = async (input: PedidoCreateInput) => {
    const creado = await pedidosService.create(input);
    setPedidos((prev) => [creado, ...prev]);
    return creado;
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Mi Dashboard" },
    { id: "clientes", label: "Clientes" },
    { id: "nuevo-pedido", label: "Nuevo Pedido" },
    { id: "seguimiento", label: "Seguimiento" },
  ];

  if (cargando) {
    return (
      <div className="ventas__content">
        <p className="ventas__subtitle">Cargando datos de ventas…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ventas__content">
        <div className="ventas__form-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="ventas">
      <div className="ventas__tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`ventas__tab ${tab === t.id ? "ventas__tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        {tab === "nuevo-pedido" && <span className="ventas__tabbar-note">Registrar pedido manual</span>}
      </div>

      {tab === "dashboard" && (
        <Dashboard
          pedidos={pedidos}
          facturas={facturas}
          clientes={clientes}
          onNuevoPedido={() => setTab("nuevo-pedido")}
        />
      )}
      {tab === "clientes" && (
        <ClientesTab
          clientes={clientes}
          direcciones={direcciones}
          pedidos={pedidos}
          onGuardarCliente={guardarCliente}
        />
      )}
      {tab === "nuevo-pedido" && (
        <CreateOrder
          clientes={clientes}
          direcciones={direcciones}
          pedidos={pedidos}
          productos={productos}
          categorias={categorias}
          onGuardarCliente={guardarCliente}
          onCrearPedido={crearPedido}
          onVerSeguimiento={() => setTab("seguimiento")}
        />
      )}
      {tab === "seguimiento" && (
        <Tracking
          pedidos={pedidos}
          clientes={clientes}
          productos={productos}
          onCargarDetalle={(id) => pedidosService.getById(id)}
        />
      )}
    </div>
  );
}