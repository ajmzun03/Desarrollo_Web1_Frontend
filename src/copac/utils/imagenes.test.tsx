import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { urlImagen } from "./imagenes";
import { ProductImage } from "../../portal/components/ProductImage";
import { API_URL } from "../config/api";

const S3 = "https://umg-bucket.s3.us-east-2.amazonaws.com";

describe("urlImagen: las fotos del bucket privado pasan por el backend", () => {
  it("convierte una URL de S3 del catálogo en /archivos/imagen?key=…", () => {
    const r = urlImagen(`${S3}/productos/combos/Combo%20Bacon%20Chap%C3%ADn%20-%20Papas%20y%20Bebida.jpg`);
    expect(r).toBe(`${API_URL}/archivos/imagen?key=${encodeURIComponent("productos/combos/Combo Bacon Chapín - Papas y Bebida.jpg")}`);
  });

  it("decodifica y vuelve a codificar bien los acentos y espacios (ida y vuelta)", () => {
    const original = "productos/acompañamientos/Papas Chapinas - Queso y Tocino.jpg";
    const r = urlImagen(`${S3}/${encodeURI(original)}`)!;
    expect(decodeURIComponent(new URL(r).searchParams.get("key")!)).toBe(original);
  });

  it("también reconoce el formato de host con guion (s3-us-east-2)", () => {
    expect(urlImagen("https://umg-bucket.s3-us-east-2.amazonaws.com/productos/a.jpg")).toContain("/archivos/imagen?key=");
  });

  it("deja igual una URL que no es de S3", () => {
    expect(urlImagen("https://cdn.otro.com/foto.jpg")).toBe("https://cdn.otro.com/foto.jpg");
    expect(urlImagen("/img/local.png")).toBe("/img/local.png");
  });

  it("no toca objetos de S3 fuera de la carpeta del catálogo (el backend no los sirve)", () => {
    expect(urlImagen(`${S3}/uploads/123-foto.jpg`)).toBe(`${S3}/uploads/123-foto.jpg`);
  });

  it("sin imagen devuelve null", () => {
    expect(urlImagen(null)).toBeNull();
    expect(urlImagen(undefined)).toBeNull();
    expect(urlImagen("")).toBeNull();
  });
});

describe("ProductImage", () => {
  afterEach(cleanup);

  it("carga la imagen desde el backend, no directamente desde S3", () => {
    render(<ProductImage src={`${S3}/productos/combos/a.jpg`} alt="Combo" emoji="🥘" />);
    const img = screen.getByAltText("Combo") as HTMLImageElement;
    expect(img.src).toContain("/archivos/imagen?key=");
    expect(img.src).not.toContain("amazonaws.com");
  });

  it("si la imagen falla, muestra el emoji de la categoría", () => {
    render(<ProductImage src={`${S3}/productos/combos/a.jpg`} alt="Combo" emoji="🥘" />);
    fireEvent.error(screen.getByAltText("Combo"));
    expect(screen.getByRole("img", { name: "Combo" }).textContent).toBe("🥘");
  });

  it("sin imagen muestra el emoji", () => {
    render(<ProductImage src={null} alt="Papas" emoji="🍟" />);
    expect(screen.getByRole("img", { name: "Papas" }).textContent).toBe("🍟");
  });
});
