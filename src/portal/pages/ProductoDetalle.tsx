import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Minus, Plus } from "lucide-react";
import { PortalLayout } from "../components/PortalLayout";
import { ProductImage } from "../components/ProductImage";
import { Cargando, ErrorMsg } from "../components/Estados";
import { useCatalogo } from "../hooks/useCatalogo";
import { useDatos } from "../../hooks/useDatos";
import { productosExtraService } from "../../copac/services/combos.service";
import { carrito } from "../store/carrito";
import { descripcionUtil, quetzales } from "../utils/formato";

// Atajos de personalizacion: viajan como texto en las observaciones del pedido (no tienen precio).
const SIN = ["Sin cebolla", "Sin tomate", "Sin lechuga", "Sin pepino", "Sin salsa"];

export default function ProductoDetalle() {
  const { id } = useParams<{ id: string }>();
  const [, navegar] = useLocation();
  const { datos, cargando, error } = useCatalogo();
  const { datos: extras } = useDatos(() => productosExtraService.getByProducto(Number(id)).catch(() => []), id);
  const [cantidad, setCantidad] = useState(1);
  const [quitar, setQuitar] = useState<string[]>([]);
  const [elegidos, setElegidos] = useState<number[]>([]);
  const [obs, setObs] = useState("");

  const producto = datos?.productos.find((p) => p.id === Number(id));
  const disponible = producto ? datos!.estaDisponible(producto) : false;
  const extrasActivos = (extras ?? []).filter((e) => e.activo);
  const extrasElegidos = extrasActivos.filter((e) => elegidos.includes(e.id));
  const unitario = (producto?.precio ?? 0) + extrasElegidos.reduce((a, e) => a + e.precio, 0);

  const alternar = (s: string) => setQuitar((q) => (q.includes(s) ? q.filter((x) => x !== s) : [...q, s]));
  const alternarExtra = (extraId: number) => setElegidos((l) => (l.includes(extraId) ? l.filter((x) => x !== extraId) : [...l, extraId]));

  const agregar = () => {
    if (!producto) return;
    const nota = [...quitar, obs.trim()].filter(Boolean).join(", ");
    carrito.agregar({
      tipo: "producto",
      refId: producto.id,
      nombre: producto.producto,
      precio: producto.precio,
      imagen_url: producto.imagen_url,
      cantidad,
      nota,
      extras: extrasElegidos.map((e) => ({ id: e.id, nombre: e.nombre, precio: e.precio })),
    });
    navegar("/carrito");
  };

  return (
    <PortalLayout>
      <div className="p-contenedor">
        {cargando && <Cargando />}
        {error && <ErrorMsg mensaje={error} />}
        {datos && !producto && <ErrorMsg mensaje="No encontramos este producto." />}
        {producto && (
          <>
            <nav className="p-migas" aria-label="Ruta">
              <Link href="/">Inicio</Link> › <Link href="/menu">Menú</Link> › <span>{producto.producto}</span>
            </nav>
            <div className="p-detalle">
              <ProductImage src={producto.imagen_url} alt={producto.producto} emoji={datos!.emojiDe(producto.categoria_id)} className="p-detalle__img" />
              <div className="p-detalle__info">
                <h1 className="p-titulo">{producto.producto}</h1>
                {descripcionUtil(producto.producto, producto.descripcion) && <p className="p-sub">{descripcionUtil(producto.producto, producto.descripcion)}</p>}
                <strong className="p-precio p-precio--lg">{quetzales(unitario)}</strong>
                {!disponible && <p className="p-estado p-estado--error">Este producto no está disponible por ahora.</p>}

                {extrasActivos.length > 0 && (
                  <>
                    <h2 className="p-sobretitulo">EXTRAS</h2>
                    <div className="p-chips">
                      {extrasActivos.map((e) => (
                        <button key={e.id} type="button" aria-pressed={elegidos.includes(e.id)} className={elegidos.includes(e.id) ? "p-chip-btn p-chip-btn--on" : "p-chip-btn"} onClick={() => alternarExtra(e.id)}>
                          {e.nombre} +{quetzales(e.precio)}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <h2 className="p-sobretitulo">ELIMINAR INGREDIENTES</h2>
                <div className="p-chips">
                  {SIN.map((s) => (
                    <button key={s} type="button" aria-pressed={quitar.includes(s)} className={quitar.includes(s) ? "p-chip-btn p-chip-btn--on" : "p-chip-btn"} onClick={() => alternar(s)}>
                      {s}
                    </button>
                  ))}
                </div>

                <h2 className="p-sobretitulo">OBSERVACIONES ESPECIALES</h2>
                <textarea className="p-input" aria-label="Observaciones especiales" rows={3} maxLength={120} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ej.: bien cocida, sin sal…" />

                <div className="p-detalle__accion">
                  <div className="p-cantidad" role="group" aria-label="Cantidad">
                    <button type="button" aria-label="Menos" onClick={() => setCantidad((c) => Math.max(1, c - 1))}><Minus size={16} /></button>
                    <span>{cantidad}</span>
                    <button type="button" aria-label="Más" onClick={() => setCantidad((c) => Math.min(99, c + 1))}><Plus size={16} /></button>
                  </div>
                  <button type="button" className="p-btn p-btn--lg p-btn--bloque" disabled={!disponible} onClick={agregar}>
                    AGREGAR AL CARRITO · {quetzales(unitario * cantidad)}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
