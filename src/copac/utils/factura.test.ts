import { describe, expect, it } from "vitest";
import { codigoFactura, siguienteNumeroFactura } from "./factura";

describe("factura", () => {
  it("empieza en 50001 cuando no hay facturas de la serie", () => {
    expect(siguienteNumeroFactura([])).toBe("50001");
    expect(siguienteNumeroFactura([{ serie: "A", numero: "000003" }])).toBe("50001");
  });

  it("toma el mayor numero de la serie y suma uno", () => {
    const facturas = [
      { serie: "FV", numero: "50003" },
      { serie: "FV", numero: "50010" },
      { serie: "B", numero: "99999" },
    ];
    expect(siguienteNumeroFactura(facturas)).toBe("50011");
    expect(siguienteNumeroFactura(facturas, "B")).toBe("100000");
  });

  it("tolera numeros no numericos y arma el codigo", () => {
    expect(siguienteNumeroFactura([{ serie: "FV", numero: "abc" }])).toBe("50001");
    expect(codigoFactura({ serie: "FV", numero: "50005" })).toBe("FV-50005");
  });
});
