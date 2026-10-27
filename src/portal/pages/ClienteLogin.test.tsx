import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

const portal = vi.hoisted(() => ({ login: vi.fn(), recuperar: vi.fn() }));
vi.mock("../services/portal.service", () => ({ portalService: portal }));

import ClienteLogin from "./ClienteLogin";
import { ApiError } from "../../copac/services/http";

const sesion = { token: "jwt-cliente", cliente: { id: 7, nombre: "Ana", apellido: "López", telefono: "55512345", telefono_ref: null, creado_en: "" } };

function montar(ruta = "/login") {
  const [camino, busqueda = ""] = ruta.split("?");
  const { hook, searchHook, history } = memoryLocation({ path: camino, searchPath: busqueda, record: true });
  render(<Router hook={hook} searchHook={searchHook}><ClienteLogin /></Router>);
  return history;
}

async function escribirCredenciales(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/correo electrónico/i), "ANA@Ejemplo.com");
  await user.type(screen.getByLabelText(/^contraseña/i), "clave-1234");
  await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));
}

describe("login del cliente (sin segundo factor)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });
  afterEach(cleanup);

  it("entra directamente con correo y contraseña, sin pedir ningún código", async () => {
    const user = userEvent.setup();
    portal.login.mockResolvedValue(sesion);
    const history = montar();
    await escribirCredenciales(user);

    await waitFor(() => expect(portal.login).toHaveBeenCalledWith("ana@ejemplo.com", "clave-1234")); // correo normalizado
    expect(JSON.parse(localStorage.getItem("copac_cliente")!).token).toBe("jwt-cliente");
    expect(screen.queryByLabelText(/código/i)).toBeNull();
    await waitFor(() => expect(history?.at(-1)).toBe("/mis-pedidos"));
  });

  it("vuelve a la página que pidió el login (volver=/checkout)", async () => {
    const user = userEvent.setup();
    portal.login.mockResolvedValue(sesion);
    const history = montar("/login?volver=%2Fcheckout");
    await escribirCredenciales(user);
    await waitFor(() => expect(history?.at(-1)).toBe("/checkout"));
  });

  it("no redirige a sitios externos (volver=https://malo.com)", async () => {
    const user = userEvent.setup();
    portal.login.mockResolvedValue(sesion);
    const history = montar("/login?volver=https%3A%2F%2Fmalo.com");
    await escribirCredenciales(user);
    await waitFor(() => expect(history?.at(-1)).toBe("/mis-pedidos"));
  });

  it("credenciales inválidas (401): muestra el error y no guarda sesión", async () => {
    const user = userEvent.setup();
    portal.login.mockRejectedValue(new ApiError("Credenciales inválidas", 401));
    montar();
    await escribirCredenciales(user);
    expect((await screen.findByRole("alert")).textContent).toBe("Credenciales inválidas");
    expect(localStorage.getItem("copac_cliente")).toBeNull();
  });

  it("recuperar contraseña: pide el correo, envía el enlace y avisa sin revelar si existe", async () => {
    const user = userEvent.setup();
    portal.recuperar.mockResolvedValue(undefined);
    montar();
    await user.click(screen.getByRole("button", { name: /olvidaste tu contraseña/i }));
    await user.type(screen.getByLabelText(/correo electrónico/i), "ana@ejemplo.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));

    await waitFor(() => expect(portal.recuperar).toHaveBeenCalledWith("ana@ejemplo.com"));
    expect((await screen.findByRole("status")).textContent).toMatch(/si el correo está registrado/i);
  });
});
