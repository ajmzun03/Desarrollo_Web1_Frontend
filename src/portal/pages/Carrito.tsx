import { Link } from "wouter";
import { Minus, Plus, Trash2 } from "lucide-react";
import { PortalLayout } from "../components/PortalLayout";
import { ProductImage } from "../components/ProductImage";
import { Vacio } from "../components/Estados";
import { carrito, precioUnitario, useCarrito } from "../store/carrito";
import { emojiDeCategoria, quetzales } from "../utils/formato";

export default function Carrito() {
  const { items, cantidadTotal, subtotal } = useCarrito();

  return (
    <PortalLayout>
      <div className="p-contenedor">
        <header className="p-pagina-cab">
          <h1 className="p-titulo">Tu pedido</h1>
          <p className="p-sub">{cantidadTotal} {cantidadTotal === 1 ? "producto" : "productos"} en tu carrito</p>
        </header>

        {items.length === 0 ? (
          <Vacio titulo="Tu carrito está vacío" texto="Agrega algo delicioso del menú.">
            <Link href="/menu" className="p-btn">VER MENÚ</Link>
          </Vacio>
        ) : (
          <div className="p-dos-col">
            <section className="p-lista">
              {items.map((i) => (
                <article key={i.clave} className="p-linea">
                  <ProductImage src={i.imagen_url} alt={i.nombre} emoji={emojiDeCategoria(i.tipo === "combo" ? "combo" : i.nombre)} className="p-linea__img" />
                  <div className="p-linea__info">
                    <h3>{i.nombre}</h3>
                    {i.extras.length > 0 && <p className="p-sub">+ {i.extras.map((e) => e.nombre).join(", ")}</p>}
                    {i.nota && <p className="p-sub">{i.nota}</p>}
                    <div className="p-linea__acciones">
                      <div className="p-cantidad" role="group" aria-label={`Cantidad de ${i.nombre}`}>
                        <button type="button" aria-label="Menos" onClick={() => carrito.setCantidad(i.clave, i.cantidad - 1)}><Minus size={14} /></button>
                        <span>{i.cantidad}</span>
                        <button type="button" aria-label="Más" onClick={() => carrito.setCantidad(i.clave, Math.min(99, i.cantidad + 1))}><Plus size={14} /></button>
                      </div>
                      <button type="button" className="p-enlace p-enlace--peligro" onClick={() => carrito.quitar(i.clave)}>
                        <Trash2 size={14} aria-hidden="true" /> Eliminar
                      </button>
                    </div>
                  </div>
                  <div className="p-linea__precio">
                    <strong>{quetzales(precioUnitario(i) * i.cantidad)}</strong>
                    {i.cantidad > 1 && <small>{quetzales(precioUnitario(i))} c/u</small>}
                  </div>
                </article>
              ))}
              <Link href="/menu" className="p-enlace">+ Agregar más productos</Link>
            </section>

            <aside className="p-resumen">
              <h2>Resumen</h2>
              <dl>
                <div><dt>Subtotal ({cantidadTotal} items)</dt><dd>{quetzales(subtotal)}</dd></div>
                <div className="p-resumen__total"><dt>Total</dt><dd>{quetzales(subtotal)}</dd></div>
              </dl>
              <p className="p-sub">El total final lo confirma el servidor al crear el pedido.</p>
              <Link href="/checkout" className="p-btn p-btn--lg p-btn--bloque">CONTINUAR PEDIDO</Link>
              <ul className="p-garantias">
                <li>🚀 Entrega estimada en 25–40 min</li>
                <li>✓ Seguimiento en tiempo real</li>
              </ul>
            </aside>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
