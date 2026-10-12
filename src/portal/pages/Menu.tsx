import { useState } from "react";
import { Link, useSearch } from "wouter";
import { ShoppingCart } from "lucide-react";
import { PortalLayout } from "../components/PortalLayout";
import { ProductoCard } from "../components/ProductoCard";
import { Cargando, ErrorMsg, Vacio } from "../components/Estados";
import { useCatalogo } from "../hooks/useCatalogo";
import { useCarrito } from "../store/carrito";
import { quetzales } from "../utils/formato";

type Orden = "az" | "menor" | "mayor";
type Filtro = "todos" | "disponibles" | "agotados";

export default function Menu() {
  const { datos, cargando, error } = useCatalogo();
  const categoriaInicial = Number(new URLSearchParams(useSearch()).get("categoria")) || 0;
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<Orden>("az");
  const { cantidadTotal, subtotal } = useCarrito();

  const visibles = (datos?.productos ?? [])
    .filter((p) => !categoria || p.categoria_id === categoria)
    .filter((p) => {
      const ok = datos?.estaDisponible(p) ?? true;
      return filtro === "todos" || (filtro === "disponibles" ? ok : !ok);
    })
    .sort((a, b) => (orden === "menor" ? a.precio - b.precio : orden === "mayor" ? b.precio - a.precio : a.producto.localeCompare(b.producto)));

  const categorias = datos?.categorias.filter((c) => datos.productos.some((p) => p.categoria_id === c.id)) ?? [];

  return (
    <PortalLayout>
      <div className="p-contenedor">
        <header className="p-pagina-cab">
          <h1 className="p-titulo">Nuestro Menú</h1>
          <p className="p-sub">{datos ? `${datos.productos.length} platillos — actualizado hoy` : "Cargando platillos…"}</p>
        </header>

        <div className="p-menu">
          <aside className="p-filtros" aria-label="Filtros">
            <h2>CATEGORÍAS</h2>
            <button type="button" className={!categoria ? "p-filtro p-filtro--activo" : "p-filtro"} onClick={() => setCategoria(0)}>
              Todos <span>{datos?.productos.length ?? 0}</span>
            </button>
            {categorias.map((c) => (
              <button key={c.id} type="button" className={categoria === c.id ? "p-filtro p-filtro--activo" : "p-filtro"} onClick={() => setCategoria(c.id)}>
                {c.descripcion} <span>{datos?.productos.filter((p) => p.categoria_id === c.id).length}</span>
              </button>
            ))}
            <h2>DISPONIBILIDAD</h2>
            {(["todos", "disponibles", "agotados"] as Filtro[]).map((f) => (
              <label key={f} className="p-radio">
                <input type="radio" name="disp" checked={filtro === f} onChange={() => setFiltro(f)} />
                {f === "todos" ? "Todos" : f === "disponibles" ? "Disponibles" : "No disponibles"}
              </label>
            ))}
          </aside>

          <section>
            <div className="p-menu__barra">
              <span>{visibles.length} resultados</span>
              <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} aria-label="Ordenar por">
                <option value="az">Nombre A–Z</option>
                <option value="menor">Precio: menor a mayor</option>
                <option value="mayor">Precio: mayor a menor</option>
              </select>
            </div>
            {cargando && <Cargando />}
            {error && <ErrorMsg mensaje={error} />}
            {datos && visibles.length === 0 && <Vacio titulo="Sin resultados" texto="Prueba con otra categoría o filtro." />}
            <div className="p-grid">
              {visibles.map((p) => (
                <ProductoCard key={p.id} producto={p} emoji={datos!.emojiDe(p.categoria_id)} disponible={datos!.estaDisponible(p)} />
              ))}
            </div>
          </section>
        </div>
      </div>

      {cantidadTotal > 0 && (
        <Link href="/carrito" className="p-flotante">
          <ShoppingCart size={18} aria-hidden="true" /> Ver carrito ({cantidadTotal}) · {quetzales(subtotal)}
        </Link>
      )}
    </PortalLayout>
  );
}
