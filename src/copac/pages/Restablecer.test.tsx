import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

const auth = vi.hoisted(() => ({ restablecer: vi.fn() }));
const portal = vi.hoisted(() => ({ restablecer: vi.fn() }));
vi.mock("../services/auth.service", () => ({ authService: auth }));
vi.mock("../../portal/services/portal.service", () => ({ portalService: portal }));

import Restablecer from "./Restablecer";
import RestablecerCliente from "../../portal/pages/RestablecerCliente";
import { ApiError } from "../services/http";

const en = (ruta: string, pagina: React.ReactNode) => {
  const [camino, busqueda = ""] = ruta.split("?");
  const { hook, searchHook } = memoryLocation({ path: camino, searchPath: busqueda });
  return render(<Router hook={hook} searchHook={searchHook}>{pagina}</Router>);
};

// Misma logica en las dos pantallas: leen token_hash del enlace del correo y llaman a su servicio.
describe.each([
  ["personal", "/copac/restablecer", () => <Restablecer />, auth],
  ["cliente", "/restablecer", () => <RestablecerCliente />, portal],
] as const)("restablecer contraseña (%s)", (_zona, ruta, Pagina, servicio) => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);

  it("sin token_hash en el enlace muestra que no es válido y no deja enviar nada", () => {
    en(ruta, <Pagina />);
    expect(screen.getByRole("alert").textContent).toMatch(/enlace no es válido/i);
    expect(screen.queryByLabelText(/nueva contraseña/i)).toBeNull();
  });

  it("valida longitud y coincidencia antes de llamar al servidor", async () => {
    const user = userEvent.setup();
    en(`${ruta}?token_hash=abc123&type=recovery`, <Pagina />);

    await user.type(screen.getByLabelText(/^nueva contraseña/i), "corta");
    await user.type(screen.getByLabelText(/confirmar/i), "corta");
    await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/entre 8 y 50/);

    await user.clear(screen.getByLabelText(/^nueva contraseña/i));
    await user.clear(screen.getByLabelText(/confirmar/i));
    await user.type(screen.getByLabelText(/^nueva contraseña/i), "clave-larga-1");
    await user.type(screen.getByLabelText(/confirmar/i), "clave-larga-2");
    await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/no coinciden/);
    expect(servicio.restablecer).not.toHaveBeenCalled();
  });

  it("envía el token_hash del enlace y la contraseña nueva, y confirma", async () => {
    const user = userEvent.setup();
    servicio.restablecer.mockResolvedValue(undefined);
    en(`${ruta}?token_hash=abc123&type=recovery`, <Pagina />);

    await user.type(screen.getByLabelText(/^nueva contraseña/i), "clave-larga-1");
    await user.type(screen.getByLabelText(/confirmar/i), "clave-larga-1");
    await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    await waitFor(() => expect(servicio.restablecer).toHaveBeenCalledWith("abc123", "clave-larga-1"));
    expect((await screen.findByRole("status")).textContent).toMatch(/contraseña actualizada/i);
  });

  it("enlace vencido o ya usado (401): lo informa y ofrece volver al inicio de sesión", async () => {
    const user = userEvent.setup();
    servicio.restablecer.mockRejectedValue(new ApiError("El enlace es inválido, venció o ya fue usado. Solicita uno nuevo.", 401));
    en(`${ruta}?token_hash=usado&type=recovery`, <Pagina />);

    await user.type(screen.getByLabelText(/^nueva contraseña/i), "clave-larga-1");
    await user.type(screen.getByLabelText(/confirmar/i), "clave-larga-1");
    await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/ya fue usado/);
    expect(screen.getByRole("link", { name: /volver a iniciar sesión/i })).toBeTruthy();
    expect(screen.queryByLabelText(/^nueva contraseña/i)).toBeNull();
  });
});
