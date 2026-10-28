import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { EstadoPedido } from "../../copac/types";
import { PASOS_PEDIDO, hora, indicePaso } from "../utils/formato";
import type { EventoEstado } from "../services/portal.service";

interface Props {
  estado: EstadoPedido;
  eventos?: EventoEstado[];
}

// Interior del vaso (misma forma para dibujarlo y para recortar el líquido).
const VASO = "M20 20 L140 20 L120 218 Q119 228 109 228 L51 228 Q41 228 40 218 Z";
const FONDO = 228;
const ALTO_UTIL = 208;

// Onda senoidal que se repite 2 veces en 320 px: al desplazarla 160 px el bucle es continuo.
const onda = (() => {
  let d = "M0 10";
  for (let x = 0; x <= 320; x += 10) d += ` L${x} ${(10 + Math.sin((x / 160) * Math.PI * 2) * 5).toFixed(2)}`;
  return `${d} L320 260 L0 260 Z`;
})();

const BURBUJAS = [
  { x: 62, r: 2.4, d: 0 }, { x: 84, r: 3.2, d: 0.9 }, { x: 104, r: 2, d: 1.7 },
  { x: 74, r: 1.6, d: 2.4 }, { x: 96, r: 2.8, d: 3.1 }, { x: 116, r: 1.8, d: 0.5 },
];

// La API V1 solo guarda el estado actual (sin historial con horas), por eso las
// horas solo aparecen cuando el pedido trae `eventos` (pedidos demo del portal).
export const LineaTiempo = ({ estado, eventos }: Props) => {
  const raiz = useRef<HTMLDivElement>(null);
  const nivel = useRef<SVGGElement>(null);
  const primera = useRef(true);
  const anulado = estado === "ANULADO";
  const actual = indicePaso(estado);
  const fraccion = anulado ? 0 : (actual + 1) / PASOS_PEDIDO.length;
  const yObjetivo = FONDO - fraccion * ALTO_UTIL;

  // Movimiento continuo: ondas, burbujas que suben y brillo de la espuma.
  useEffect(() => {
    if (anulado || !raiz.current) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.to(".p-vaso__onda--a", { x: -160, duration: 3.2, ease: "none", repeat: -1 });
      gsap.to(".p-vaso__onda--b", { x: 0, duration: 4.6, ease: "none", repeat: -1, startAt: { x: -160 } });
      gsap.to(".p-vaso__ola", { y: 3, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.utils.toArray<SVGElement>(".p-vaso__burbuja").forEach((b, i) => {
        gsap.fromTo(
          b,
          { y: 0, opacity: 0 },
          { y: -120 - (i % 3) * 25, opacity: 0.85, duration: 3 + (i % 3), delay: BURBUJAS[i].d, ease: "none", repeat: -1, },
        );
      });
    }, raiz);
    return () => ctx.revert();
  }, [anulado]);

  // Al cambiar de estado el líquido sube con un pequeño rebote.
  useEffect(() => {
    if (!nivel.current) return;
    const reducido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (primera.current || reducido) {
      gsap.set(nivel.current, { y: yObjetivo });
      primera.current = false;
      return;
    }
    gsap.to(nivel.current, { y: yObjetivo, duration: 1.8, ease: "elastic.out(1, 0.55)" });
  }, [yObjetivo]);

  if (anulado) return <p className="p-estado p-estado--error">Este pedido fue anulado.</p>;

  return (
    <div className="p-seguimiento" ref={raiz}>
      <div className="p-vaso" role="img" aria-label={`Vaso de soda lleno al ${Math.round(fraccion * 100)} %: ${PASOS_PEDIDO[Math.max(0, actual)].etiqueta}`}>
        <svg viewBox="0 0 160 250" aria-hidden="true">
          <defs>
            <clipPath id="p-vaso-clip"><path d={VASO} /></clipPath>
            <linearGradient id="p-soda" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c0392b" />
              <stop offset="1" stopColor="#5a0d06" />
            </linearGradient>
            <linearGradient id="p-brillo" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={VASO} fill="rgba(255,255,255,0.35)" />
          <g clipPath="url(#p-vaso-clip)">
            <g ref={nivel} className="p-vaso__nivel">
              <g className="p-vaso__ola">
                <path className="p-vaso__onda p-vaso__onda--b" d={onda} fill="#e0594a" opacity="0.55" />
                <path className="p-vaso__onda p-vaso__onda--a" d={onda} fill="url(#p-soda)" />
                <rect x="0" y="12" width="160" height="260" fill="url(#p-soda)" />
              </g>
              {BURBUJAS.map((b) => (
                <circle key={b.x} className="p-vaso__burbuja" cx={b.x} cy={-4} r={b.r} fill="#fff" opacity="0" />
              ))}
            </g>
          </g>
          <path d={VASO} fill="none" stroke="#8a8581" strokeWidth="3" strokeLinejoin="round" />
          <path d="M30 34 L45 205" stroke="url(#p-brillo)" strokeWidth="7" strokeLinecap="round" fill="none" />
          <line x1="100" y1="70" x2="124" y2="4" stroke="#1f8a4c" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <span className="p-vaso__pct">{Math.round(fraccion * 100)}%</span>
      </div>

      <ol className="p-tiempo">
        {PASOS_PEDIDO.map((paso, n) => {
          const evento = eventos?.find((e) => e.estado === paso.estado);
          const clase = n < actual ? "p-tiempo__paso p-tiempo__paso--hecho" : n === actual ? "p-tiempo__paso p-tiempo__paso--actual" : "p-tiempo__paso";
          return (
            <li key={paso.estado} className={clase} aria-current={n === actual ? "step" : undefined}>
              <span className="p-tiempo__punto" aria-hidden="true">{n <= actual ? "✓" : ""}</span>
              <div>
                <strong>{paso.etiqueta}</strong>
                {evento && <small>{hora(evento.hora)}</small>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
