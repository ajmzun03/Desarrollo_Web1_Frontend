import { describe, expect, it } from "vitest";
import { formatearNumero, formatearVence, luhnValido, validarTarjeta } from "./tarjeta";

const ahora = new Date(2026, 9, 27); // octubre de 2026
const buena = { numero: "4242 4242 4242 4242", titular: "Ana Pérez", vence: "12/30", cvc: "123" };

describe("tarjeta", () => {
  it("da formato mientras se escribe", () => {
    expect(formatearNumero("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatearNumero("42a4 2")).toBe("4242");
    expect(formatearVence("1228")).toBe("12/28");
    expect(formatearVence("1")).toBe("1");
  });

  it("valida el número con Luhn", () => {
    expect(luhnValido("4242424242424242")).toBe(true);
    expect(luhnValido("4242424242424241")).toBe(false);
    expect(luhnValido("1234")).toBe(false);
  });

  it("acepta una tarjeta correcta y arma los datos para el backend", () => {
    expect(validarTarjeta(buena, ahora)).toEqual({
      datos: { number: "4242424242424242", exp_month: 12, exp_year: 2030, cvc: "123" },
    });
  });

  it("rechaza datos inválidos con un mensaje claro", () => {
    expect(validarTarjeta({ ...buena, numero: "4242 4242 4242 4241" }, ahora)).toEqual({ error: "El número de tarjeta no es válido." });
    expect(validarTarjeta({ ...buena, titular: " " }, ahora)).toHaveProperty("error");
    expect(validarTarjeta({ ...buena, vence: "1230" }, ahora)).toEqual({ error: "Ingresa el vencimiento como MM/AA." });
    expect(validarTarjeta({ ...buena, vence: "13/30" }, ahora)).toEqual({ error: "El mes de vencimiento no es válido." });
    expect(validarTarjeta({ ...buena, vence: "09/26" }, ahora)).toEqual({ error: "La tarjeta está vencida." });
    expect(validarTarjeta({ ...buena, vence: "10/26" }, ahora)).toHaveProperty("datos");
    expect(validarTarjeta({ ...buena, cvc: "12" }, ahora)).toHaveProperty("error");
  });
});
