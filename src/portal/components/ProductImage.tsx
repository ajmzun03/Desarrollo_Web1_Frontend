import { useState } from "react";
import { urlImagen } from "../../copac/utils/imagenes";

interface Props {
  src?: string | null;
  alt: string;
  emoji: string;
  className?: string;
}

// Muestra la imagen del producto (imagen_url / imagen de la API). Las URLs del bucket privado de S3 se
// sirven a traves del backend (ver utils/imagenes.ts). Si no hay imagen o falla la carga, cae a un emoji.
export const ProductImage = ({ src, alt, emoji, className = "" }: Props) => {
  const [fallo, setFallo] = useState<string | null>(null);
  const origen = urlImagen(src);
  const usable = origen && fallo !== origen;

  return (
    <div className={`p-img ${className}`}>
      {usable ? (
        <img src={origen} alt={alt} loading="lazy" onError={() => setFallo(origen)} />
      ) : (
        <span className="p-img__emoji" role="img" aria-label={alt}>
          {emoji}
        </span>
      )}
    </div>
  );
};
