import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Search, ShoppingCart, X } from "lucide-react";
import { PortalLayout } from "../components/PortalLayout";
import { ProductoCard, type ItemCatalogo } from "../components/ProductoCard";
import { Cargando, ErrorMsg, Vacio } from "../components/Estados";
import { useCatalogo } from "../hooks/useCatalogo";
import { useCarrito } from "../store/carrito";
import { quetzales } from "../utils/formato";

type Orden = "az" | "menor" | "mayor";
type Filtro = "todos" | "disponibles" | "agotados";
const COMBOS = -1; // id virtual de la categoria "Combos"

// Compara sin mayusculas ni acentos: "cafe" encuentra "Café".
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

interface Entrada {
  item: ItemCatalogo;
  texto: string;
  categoriaId: number;
  disponible: boolean;
}

export default function Menu() {
  const { datos, cargando, error } = useCatalogo();
  const parametros = new URLSearchParams(useSearch());
  const categoriaInicial = Number(parametros.get("categoria")) || 0;
  const [busqueda, setBusqueda] = useState(parametros.get("q") ?? "");
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<Orden>("az");
  const { cantidadTotal, subtotal } = useCarrito();

  const entradas: Entrada[] = datos
    ? [
        ...datos.productos.map((p): Entrada => ({
          item: { tipo: "producto", id: p.id, nombre: p.producto, precio: p.precio, imagen: p.imagen_url, descripcion: p.descripcion },
          texto: normalizar(`${p.producto} ${p.descripcion ?? ""}`),
          categoriaId: p.categoria_id,
          disponible: datos.estaDisponible(p),
        })),
        ...datos.combos.map((c): Entrada => ({
          item: { tipo: "combo", id: c.id, nombre: c.nombre, precio: c.precio, imagen: c.imagen },
          texto: normalizar(`${c.nombre} combo`),
          categoriaId: COMBOS,
          // Un combo sin precio (0) no se puede vender: el backend rechaza el pedido, asi que no se ofrece.
          disponible: c.precio > 0,
        })),
      ]
    : [];

  // La busqueda se aplica primero: los contadores de categorias reflejan lo que se encontro.
  const terminos = normalizar(busqueda).split(/s+/).filter(Boolean);
  const buscadas = entradas.filter((e) => terminos.every((t) => e.texto.includes(t)));

  const visibles = buscadas
    .filter((e) => !categoria || e.categoriaId === categoria)
    .filter((e) => filtro === "todos" || (filtro === "disponibles" ? e.disponible : !e.disponible))
    .sort((a, b) =>
      orden === "menor" ? a.item.precio - b.item.precio : orden === "mayor" ? b.item.precio - a.item.precio : a.item.nombre.localeCompare(b.item.nombre),
    );

  const categorias = datos?.categorias.filter((c) => entradas.some((e) => e.categoriaId === c.id)) ?? [];
  const cuenta = (id: number) => buscadas.filter((e) => e.categoriaId === id).length;

  return (
    <PortalLayout>
      <div className="p-contenedor">
        <header className="p-pagina-cab">
          <h1 className="p-titulo">Nuestro Menú</h1>
          <p className="p-sub">{datos ? `${entradas.length} platillos disponibles` : "Cargando platillos…"}</p>
        </header>

        <div className="p-menu">
          <aside className="p-filtros" aria-label="Filtros">
            <h2>CATEGORÍAS</h2>
            <button type="button" className={!categoria ? "p-filtro p-filtro--activo" : "p-filtro"} onClick={() => setCategoria(0)}>
              Todos <span>{buscadas.length}</span>
            </button>
            {datos && datos.combos.length > 0 && (
              <button type="button" className={categoria === COMBOS ? "p-filtro p-filtro--activo" : "p-filtro"} onClick={() => setCategoria(COMBOS)}>
                Combos <span>{cuenta(COMBOS)}</span>
              </button>
            )}
            {categorias.map((c) => (
              <button key={c.id} type="button" className={categoria === c.id ? "p-filtro p-filtro--activo" : "p-filtro"} onClick={() => setCategoria(c.id)}>
                {c.descripcion} <span>{cuenta(c.id)}</span>
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
            <div className="p-buscador" role="search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                className="p-buscador__input"
                placeholder="Buscar en el menú: hamburguesa, pollo, café…"
                aria-label="Buscar en el menú"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setBusqueda("")}
              />
              {busqueda && (
                <button type="button" className="p-buscador__borrar" onClick={() => setBusqueda("")} aria-label="Borrar búsqueda">
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="p-menu__barra">
              <span>{visibles.length} resultados{busqueda.trim() ? ` para "${busqueda.trim()}"` : ""}</span>
              <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} aria-label="Ordenar por">
                <option value="az">Nombre A–Z</option>
                <option value="menor">Precio: menor a mayor</option>
                <option value="mayor">Precio: mayor a menor</option>
              </select>
            </div>
            {cargando && <Cargando />}
            {error && <ErrorMsg mensaje={error} />}
            {datos && visibles.length === 0 && <Vacio titulo="Sin resultados" texto={busqueda.trim() ? "No encontramos nada con esa búsqueda. Revisa la ortografía o prueba con otra palabra." : "Prueba con otra categoría o filtro."} />}
            <div className="p-grid">
              {visibles.map((e) => (
                <ProductoCard
                  key={`${e.item.tipo}-${e.item.id}`}
                  item={e.item}
                  emoji={e.item.tipo === "combo" ? "🥘" : datos!.emojiDe(e.categoriaId)}
                  disponible={e.disponible}
                />
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
