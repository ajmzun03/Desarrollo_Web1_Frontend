import { useState } from "react";

interface Props {
  src?: string | null;
  alt: string;
  emoji: string;
  className?: string;
}

// Muestra imagen_url del producto; si no existe o falla la carga, cae a un emoji de categoria.
export const ProductImage = ({ src, alt, emoji, className = "" }: Props) => {
  const [fallo, setFallo] = useState<string | null>(null);
  const usable = src && fallo !== src;

  return (
    <div className={`p-img ${className}`}>
      {usable ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFallo(src)} />
      ) : (
        <span className="p-img__emoji" role="img" aria-label={alt}>
          {emoji}
        </span>
      )}
    </div>
  );
};
