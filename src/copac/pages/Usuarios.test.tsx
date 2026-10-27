import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const usuarios = vi.hoisted(() => ({ getAll: vi.fn() }));
const auth = vi.hoisted(() => ({ reiniciarMfa: vi.fn() }));
vi.mock("../services/usuarios.service", () => ({ usuariosService: usuarios }));
vi.mock("../services/auth.service", () => ({ authService: auth }));

import Usuarios from "./Usuarios";
import { ApiError } from "../services/http";

const lista = [
  { id: 1, usuario: "admin.mc", correo_electronico: "admin@mc.com", rol: "ADMIN", creado_en: "" },
  { id: 2, usuario: "ana.cocina", correo_electronico: "ana@mc.com", rol: "JEFE_COCINA", creado_en: "" },
];

describe("Usuarios: reiniciar autenticador", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    usuarios.getAll.mockResolvedValue(lista);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lista los usuarios con su rol en español", async () => {
    render(<Usuarios />);
    expect(await screen.findByText("ana.cocina")).toBeTruthy();
    expect(screen.getByText("Jefe de cocina")).toBeTruthy();
  });

  it("pide confirmación y reinicia el autenticador del usuario elegido", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("confirm", vi.fn(() => true));
    auth.reiniciarMfa.mockResolvedValue(undefined);
    render(<Usuarios />);
    await screen.findByText("ana.cocina");

    await user.click(screen.getAllByRole("button", { name: /reiniciar/i })[1]!);

    await waitFor(() => expect(auth.reiniciarMfa).toHaveBeenCalledWith(2));
    expect((await screen.findByRole("status")).textContent).toMatch(/ana\.cocina.*reiniciado/i);
  });

  it("si el administrador cancela, no se reinicia nada", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<Usuarios />);
    await screen.findByText("ana.cocina");
    await user.click(screen.getAllByRole("button", { name: /reiniciar/i })[1]!);
    expect(auth.reiniciarMfa).not.toHaveBeenCalled();
  });

  it("muestra el error si el backend lo rechaza (por ejemplo, sin correo registrado)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("confirm", vi.fn(() => true));
    auth.reiniciarMfa.mockRejectedValue(new ApiError("El usuario no tiene correo registrado", 409));
    render(<Usuarios />);
    await screen.findByText("ana.cocina");
    await user.click(screen.getAllByRole("button", { name: /reiniciar/i })[0]!);
    expect((await screen.findByRole("alert")).textContent).toMatch(/no tiene correo/);
  });
});
