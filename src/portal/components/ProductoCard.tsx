import { Link } from "wouter";
import { Plus } from "lucide-react";
import { carrito } from "../store/carrito";
import { quetzales } from "../utils/formato";
import { ProductImage } from "./ProductImage";

export interface ItemCatalogo {
  tipo: "producto" | "combo";
  id: number;
  nombre: string;
  precio: number;
  imagen?: string | null;
  descripcion?: string | null;
}

interface Props {
  item: ItemCatalogo;
  emoji: string;
  disponible?: boolean;
}

export const ProductoCard = ({ item, emoji, disponible = true }: Props) => {
  // Los productos tienen pagina de detalle (extras y notas); los combos se agregan directo.
  const media = (
    <>
      <ProductImage src={item.imagen} alt={item.nombre} emoji={emoji} />
      {!disponible && <span className="p-card__etiqueta">No disponible</span>}
      {item.tipo === "combo" && disponible && <span className="p-card__etiqueta p-card__etiqueta--combo">Combo</span>}
    </>
  );

  return (
    <article className={disponible ? "p-card" : "p-card p-card--agotado"}>
      {item.tipo === "producto" ? (
        <Link href={`/menu/${item.id}`} className="p-card__media">{media}</Link>
      ) : (
        <div className="p-card__media">{media}</div>
      )}
      <div className="p-card__cuerpo">
        <h3>{item.tipo === "producto" ? <Link href={`/menu/${item.id}`}>{item.nombre}</Link> : item.nombre}</h3>
        {item.descripcion && <p className="p-sub">{item.descripcion}</p>}
        <div className="p-card__pie">
          <strong className="p-precio">{quetzales(item.precio)}</strong>
          <button
            type="button"
            className="p-btn p-btn--sm"
            disabled={!disponible}
            onClick={() =>
              carrito.agregar({ tipo: item.tipo, refId: item.id, nombre: item.nombre, precio: item.precio, imagen_url: item.imagen })
            }
          >
            <Plus size={14} aria-hidden="true" /> Agregar
          </button>
        </div>
      </div>
    </article>
  );
};
