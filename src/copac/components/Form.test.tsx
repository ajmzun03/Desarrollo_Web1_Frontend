import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  enrolar: vi.fn(),
  verificar: vi.fn(),
  recuperar: vi.fn(),
}));
vi.mock("../services/auth.service", () => ({ authService: auth }));

import { Form } from "./Form";
import { ApiError } from "../services/http";

const sesion = {
  token: "jwt-de-sesion",
  usuario: { id: 1, usuario: "admin.mc", correo_electronico: "a@mc.com", rol: "ADMIN" as const, creado_en: "" },
  vistas: ["dashboard", "usuarios"],
};
const qr = { qrCode: "data:image/svg+xml;utf8,<svg/>", secret: "ABCD EFGH", uri: "otpauth://totp/x" };

async function iniciarSesion(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Usuario"), "admin.mc");
  await user.type(screen.getByLabelText("Contraseña"), "umg123");
  await user.click(screen.getByRole("button", { name: /ingresar al sistema/i }));
}

describe("Login del personal con segundo factor (TOTP)", () => {
  const asignar = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    document.cookie = "token=; path=/; max-age=0";
    localStorage.clear();
    Object.defineProperty(window, "location", { value: { ...window.location, assign: asignar }, writable: true });
  });
  afterEach(cleanup);

  it("primera vez: muestra el QR y el secreto, y entra con el código", async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValue({ tipo: "verificacion", mfa: "enrolar", tmpToken: "tmp-1" });
    auth.enrolar.mockResolvedValue(qr);
    auth.verificar.mockResolvedValue(sesion);

    render(<Form />);
    await iniciarSesion(user);

    expect((await screen.findByAltText(/código qr/i)).getAttribute("src")).toBe(qr.qrCode);
    expect(screen.getByText(qr.secret)).toBeTruthy();
    expect(auth.enrolar).toHaveBeenCalledWith("tmp-1");

    await user.type(screen.getByLabelText(/código de 6 dígitos/i), "123456");
    await user.click(screen.getByRole("button", { name: /activar e ingresar/i }));

    await waitFor(() => expect(auth.verificar).toHaveBeenCalledWith("tmp-1", "123456"));
    expect(document.cookie).toContain("token=jwt-de-sesion");
    expect(JSON.parse(localStorage.getItem("copac_vistas")!)).toEqual(["dashboard", "usuarios"]);
    expect(asignar).toHaveBeenCalledWith("/copac/dashboard");
  });

  it("ya tiene autenticador: pide solo el código, sin QR", async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValue({ tipo: "verificacion", mfa: "verificar", tmpToken: "tmp-2" });

    render(<Form />);
    await iniciarSesion(user);

    expect(await screen.findByLabelText(/código de verificación/i)).toBeTruthy();
    expect(auth.enrolar).not.toHaveBeenCalled();
    expect(screen.queryByAltText(/código qr/i)).toBeNull();
  });

  it("el tmpToken nunca se guarda en cookie ni en localStorage", async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValue({ tipo: "verificacion", mfa: "verificar", tmpToken: "tmp-secreto" });
    render(<Form />);
    await iniciarSesion(user);
    await screen.findByLabelText(/código de verificación/i);
    expect(document.cookie).not.toContain("tmp-secreto");
    expect(JSON.stringify({ ...localStorage })).not.toContain("tmp-secreto");
  });

  it("el campo del código aparece VACÍO: no hereda la contraseña recién escrita", async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValue({ tipo: "verificacion", mfa: "verificar", tmpToken: "tmp-x" });
    render(<Form />);
    await iniciarSesion(user); // la contraseña escrita fue "umg123"
    const campo = (await screen.findByLabelText(/código de verificación/i)) as HTMLInputElement;
    expect(campo.value).toBe("");
    expect(campo.type).toBe("text");
  });

  it("un código mal escrito no llega al servidor", async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValue({ tipo: "verificacion", mfa: "verificar", tmpToken: "tmp-3" });
    render(<Form />);
    await iniciarSesion(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "12ab");
    await user.click(screen.getByRole("button", { name: /verificar e ingresar/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/6 dígitos/);
    expect(auth.verificar).not.toHaveBeenCalled();
  });

  it("código incorrecto (401): muestra el error y permite reintentar", async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValue({ tipo: "verificacion", mfa: "verificar", tmpToken: "tmp-4" });
    auth.verificar.mockRejectedValueOnce(new ApiError("Código incorrecto", 401));
    render(<Form />);
    await iniciarSesion(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "000000");
    await user.click(screen.getByRole("button", { name: /verificar e ingresar/i }));

    expect((await screen.findByRole("alert")).textContent).toBe("Código incorrecto");
    expect(screen.getByLabelText(/código de verificación/i)).toBeTruthy(); // sigue en el paso del código
  });

  it("demasiados intentos (429): vuelve al inicio de sesión con el mensaje", async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValue({ tipo: "verificacion", mfa: "verificar", tmpToken: "tmp-5" });
    auth.verificar.mockRejectedValueOnce(new ApiError("Demasiados intentos fallidos. Inicia sesión de nuevo.", 429));
    render(<Form />);
    await iniciarSesion(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "000000");
    await user.click(screen.getByRole("button", { name: /verificar e ingresar/i }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/demasiados intentos/i);
    expect(await screen.findByLabelText("Usuario")).toBeTruthy();
  });

  it("sesión de verificación vencida (401 'venció'): vuelve al inicio de sesión", async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValue({ tipo: "verificacion", mfa: "verificar", tmpToken: "tmp-6" });
    auth.verificar.mockRejectedValueOnce(new ApiError("La sesión de verificación venció. Inicia sesión de nuevo.", 401));
    render(<Form />);
    await iniciarSesion(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "123456");
    await user.click(screen.getByRole("button", { name: /verificar e ingresar/i }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/venció/);
    expect(await screen.findByLabelText("Usuario")).toBeTruthy();
  });

  it("falta configurar el autenticador (409): vuelve al paso del QR", async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValue({ tipo: "verificacion", mfa: "verificar", tmpToken: "tmp-7" });
    auth.verificar.mockRejectedValueOnce(new ApiError("Primero configura tu autenticador.", 409));
    auth.enrolar.mockResolvedValue(qr);
    render(<Form />);
    await iniciarSesion(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "123456");
    await user.click(screen.getByRole("button", { name: /verificar e ingresar/i }));

    expect(await screen.findByAltText(/código qr/i)).toBeTruthy();
    expect(auth.enrolar).toHaveBeenCalledWith("tmp-7");
  });

  it("credenciales incorrectas (401): muestra el error sin pedir código", async () => {
    const user = userEvent.setup();
    auth.login.mockRejectedValue(new ApiError("Credenciales inválidas", 401));
    render(<Form />);
    await iniciarSesion(user);
    expect((await screen.findByRole("alert")).textContent).toBe("Credenciales inválidas");
    expect(screen.queryByLabelText(/código/i)).toBeNull();
  });

  it("recuperar contraseña: envía el correo y no pide ningún código", async () => {
    const user = userEvent.setup();
    auth.recuperar.mockResolvedValue(undefined);
    render(<Form />);
    await user.click(screen.getByRole("link", { name: /olvidaste tu contraseña/i }));
    await user.type(screen.getByLabelText(/usuario o correo/i), "admin.mc");
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));

    await waitFor(() => expect(auth.recuperar).toHaveBeenCalledWith("admin.mc"));
    expect((await screen.findByRole("status")).textContent).toMatch(/enviamos un correo/i);
    expect(screen.queryByLabelText(/código recibido/i)).toBeNull();
  });
});
