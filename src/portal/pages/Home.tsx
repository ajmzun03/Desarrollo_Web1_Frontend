import { Link } from "wouter";
import { PortalLayout } from "../components/PortalLayout";
import { ProductoCard } from "../components/ProductoCard";
import { Cargando, ErrorMsg } from "../components/Estados";
import { useCatalogo } from "../hooks/useCatalogo";
import { emojiDeCategoria } from "../utils/formato";

export default function Home() {
  const { datos, cargando, error } = useCatalogo();

  const conteo = (id: number) => datos?.productos.filter((p) => p.categoria_id === id).length ?? 0;
  const categorias = datos?.categorias.filter((c) => conteo(c.id) > 0) ?? [];

  return (
    <PortalLayout>
      <section className="p-hero">
        <div className="p-hero__contenido">
          <span className="p-chip">PEDIDOS EN LÍNEA</span>
          <h1>
            El sabor que <em>quieres,</em>
            <br />
            cuando lo quieres.
          </h1>
          <p>Ordena tus platillos favoritos de forma rápida y sencilla. Sin esperas, sin complicaciones.</p>
          <div className="p-hero__cta">
            <Link href="/menu" className="p-btn p-btn--lg">VER MENÚ</Link>
            <Link href="/menu" className="p-btn p-btn--acento p-btn--lg">ORDENAR AHORA</Link>
          </div>
        </div>
      </section>

      <section className="p-seccion">
        <span className="p-sobretitulo">EXPLORA</span>
        <h2 className="p-titulo">¿Qué quieres comer?</h2>
        {cargando && <Cargando />}
        {error && <ErrorMsg mensaje={error} />}
        <div className="p-categorias">
          {categorias.map((c) => (
            <Link key={c.id} href={`/menu?categoria=${c.id}`} className="p-categoria">
              <span className="p-categoria__emoji">{emojiDeCategoria(c.descripcion)}</span>
              <strong>{c.descripcion}</strong>
              <small>{conteo(c.id)} items</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="p-seccion">
        <div className="p-seccion__cabecera">
          <div>
            <span className="p-sobretitulo">MÁS PEDIDOS</span>
            <h2 className="p-titulo">Los favoritos</h2>
          </div>
          <Link href="/menu" className="p-enlace">Ver todo el menú →</Link>
        </div>
        <div className="p-grid">
          {datos?.productos.slice(0, 4).map((p) => (
            <ProductoCard key={p.id} producto={p} emoji={datos.emojiDe(p.categoria_id)} disponible={datos.estaDisponible(p)} />
          ))}
        </div>
      </section>

      <section className="p-banner">
        <h2>¿Listo para ordenar?</h2>
        <p>Entrega en 25-40 minutos directo a tu puerta.</p>
        <Link href="/menu" className="p-btn p-btn--acento p-btn--lg">VER MENÚ COMPLETO</Link>
      </section>
    </PortalLayout>
  );
}
