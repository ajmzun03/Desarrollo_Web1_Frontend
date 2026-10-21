import { beforeEach, describe, expect, it } from "vitest";
import { carrito, precioUnitario } from "./carrito";
import { destinoSeguro } from "../utils/destino";
import { indicePaso } from "../utils/formato";

const hamburguesa = { tipo: "producto" as const, refId: 1, nombre: "Big Mac", precio: 48 };

describe("carrito", () => {
  beforeEach(() => carrito.vaciar());

  const leer = () => JSON.parse(localStorage.getItem("copac_carrito_v2") ?? "[]") as { clave: string; cantidad: number }[];

  it("suma la cantidad cuando se agrega el mismo producto con las mismas opciones", () => {
    carrito.agregar(hamburguesa);
    carrito.agregar({ ...hamburguesa, cantidad: 2 });
    expect(leer()).toHaveLength(1);
    expect(leer()[0].cantidad).toBe(3);
  });

  it("separa lineas con extras o notas distintas", () => {
    carrito.agregar(hamburguesa);
    carrito.agregar({ ...hamburguesa, nota: "Sin cebolla" });
    carrito.agregar({ ...hamburguesa, extras: [{ id: 7, nombre: "Queso extra", precio: 5 }] });
    expect(leer()).toHaveLength(3);
  });

  it("distingue un producto de un combo con el mismo id", () => {
    carrito.agregar(hamburguesa);
    carrito.agregar({ ...hamburguesa, tipo: "combo" });
    expect(leer()).toHaveLength(2);
  });

  it("incluye los extras en el precio unitario", () => {
    carrito.agregar({ ...hamburguesa, extras: [{ id: 1, nombre: "Queso", precio: 5 }, { id: 2, nombre: "Tocino", precio: 8.5 }] });
    const linea = JSON.parse(localStorage.getItem("copac_carrito_v2")!)[0];
    expect(precioUnitario(linea)).toBeCloseTo(61.5);
  });

  it("elimina la linea al bajar la cantidad a cero", () => {
    carrito.agregar(hamburguesa);
    carrito.setCantidad(leer()[0].clave, 0);
    expect(leer()).toHaveLength(0);
  });
});

describe("destinoSeguro", () => {
  it("acepta rutas internas", () => {
    expect(destinoSeguro("volver=%2Fcheckout", "/menu")).toBe("/checkout");
  });
  it("rechaza URLs externas y rutas con doble barra", () => {
    expect(destinoSeguro("volver=https%3A%2F%2Fmalo.com", "/menu")).toBe("/menu");
    expect(destinoSeguro("volver=%2F%2Fmalo.com", "/menu")).toBe("/menu");
  });
  it("usa el valor por defecto si no hay destino", () => {
    expect(destinoSeguro("", "/menu")).toBe("/menu");
  });
});

describe("indicePaso", () => {
  it("agrupa EN_DESPACHO y EN_RUTA en el mismo paso", () => {
    expect(indicePaso("EN_DESPACHO")).toBe(indicePaso("EN_RUTA"));
  });
  it("ordena los estados del pedido", () => {
    const orden = ["CREADO", "EN_PREPARACION", "LISTO", "EN_RUTA", "ENTREGADO"] as const;
    expect(orden.map(indicePaso)).toEqual([0, 1, 2, 3, 4]);
  });
});
