// Copia fiel de los schemas zod del backend (src/schemas/*.schema.ts).
// Se conservan las mismas reglas y mensajes. Solo se omiten los wrappers
// `validateX` (no aportan en el frontend). Los enums se importan de ../types.
import z from "zod";
import {
  ESTADOS_ORDEN_COMPRA,
  ESTADOS_ORDEN_TRABAJO,
  ESTADOS_PEDIDO,
  ROLES,
  TIPOS_CAJA,
  TIPOS_RECEPCION,
} from "../types";

// ---------------- Usuario ----------------
export const schemaUsuario = z.object({
  usuario: z
    .string()
    .trim()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(50, "El nombre de usuario no puede tener más de 50 caracteres"),
  correo_electronico: z
    .string()
    .trim()
    .toLowerCase()
    .email("El correo electrónico no es válido")
    .max(255, "El correo electrónico no puede tener más de 255 caracteres"),
  contrasenia: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(50, "La contraseña no puede tener más de 50 caracteres"),
  rol: z.enum(ROLES, {
    message: `El rol debe ser uno de los siguientes: ${ROLES.join(", ")}`,
  }),
});

// ---------------- Cliente ----------------
export const schemaCliente = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(3, "El nombre del cliente debe tener al menos 3 caracteres")
      .max(100, "El nombre del cliente no puede tener más de 100 caracteres"),
    apellido: z
      .string()
      .trim()
      .min(3, "El apellido del cliente debe tener al menos 3 caracteres")
      .max(100, "El apellido del cliente no puede tener más de 100 caracteres"),
    telefono: z.string().regex(/^\d{8}$/, "El teléfono del cliente debe tener exactamente 8 dígitos"),
    telefono_ref: z
      .string()
      .regex(/^\d{8}$/, "El teléfono de referencia del cliente debe tener exactamente 8 dígitos"),
  })
  .refine((data) => data.telefono_ref !== data.telefono, {
    message: "El teléfono de referencia no puede ser igual al teléfono principal",
    path: ["telefono_ref"],
  });

// ---------------- Direccion ----------------
export const schemaDireccion = z.object({
  cliente_id: z.number().int("El ID del cliente debe ser un número entero").positive("El ID del cliente debe ser un número positivo"),
  municipio_id: z.number().int("El ID del municipio debe ser un número entero").positive("El ID del municipio debe ser un número positivo"),
  direccion1: z
    .string()
    .trim()
    .min(3, "La dirección principal debe tener al menos 3 caracteres")
    .max(155, "La dirección principal no puede tener más de 155 caracteres"),
  direccion2: z
    .string()
    .trim()
    .min(1, "La dirección secundaria es requerida")
    .max(100, "La dirección secundaria no puede tener más de 100 caracteres"),
});

export const schemaDireccionUpdate = schemaDireccion.partial().strict();

// ---------------- Categoria ----------------
export const schemaCategoria = z.object({
  categoria_id: z.number().int("El ID de la categoría debe ser un número entero").positive("El ID de la categoría debe ser un número positivo"),
  descripcion: z
    .string()
    .trim()
    .min(3, "La descripción de la categoría debe tener al menos 3 caracteres")
    .max(100, "La descripción de la categoría no puede tener más de 100 caracteres"),
});

// ---------------- Unidad de medida ----------------
export const schemaUnidadMedida = z.object({
  unidad: z
    .string()
    .trim()
    .min(2, "La unidad de medida debe tener al menos 2 caracteres")
    .max(50, "La unidad de medida no puede tener más de 50 caracteres"),
  abreviatura: z
    .string()
    .trim()
    .min(2, "La abreviatura debe tener al menos 2 caracteres")
    .max(5, "La abreviatura no puede tener más de 5 caracteres"),
});

// ---------------- Municipio / Departamento ----------------
export const schemaMunicipio = z.object({
  departamento_id: z.number().int("El ID del departamento debe ser un número entero").positive("El ID del departamento debe ser un número positivo"),
  municipio: z
    .string()
    .trim()
    .min(3, "El nombre del municipio debe tener al menos 3 caracteres")
    .max(100, "El nombre del municipio no puede tener más de 100 caracteres"),
});

export const schemaDepartamento = z.object({
  departamento: z
    .string()
    .trim()
    .min(3, "El nombre del departamento debe tener al menos 3 caracteres")
    .max(100, "El nombre del departamento no puede tener más de 100 caracteres"),
});

// ---------------- Sucursal / Bodega / Alacena ----------------
export const schemaSucursal = z.object({
  municipio_id: z.number().int().positive("El ID del municipio debe ser un número entero positivo"),
  sucursal: z
    .string()
    .min(3, "El nombre de la sucursal debe tener al menos 3 caracteres")
    .trim()
    .max(150, "El nombre de la sucursal no puede tener más de 150 caracteres"),
  direccion: z.string().max(255, "La dirección no puede tener más de 255 caracteres"),
});

export const schemaBodega = z.object({
  sucursal_id: z.number().int("El ID de la sucursal debe ser un número entero").positive("El ID de la sucursal debe ser un número positivo"),
  bodega: z
    .string()
    .trim()
    .min(2, "La bodega debe tener al menos 2 caracteres")
    .max(100, "La bodega no puede tener más de 100 caracteres"),
});

export const schemaBodegaUpdate = schemaBodega.partial().strict();

export const schemaAlacena = z.object({
  bodega_id: z.number().int("El ID de la bodega debe ser un número entero").positive("El ID de la bodega debe ser un número positivo").optional(),
  alacena: z
    .string()
    .trim()
    .min(1, "El nombre de la alacena es requerido")
    .max(100, "El nombre de la alacena no puede tener más de 100 caracteres"),
});

// ---------------- Producto / Materia prima / Receta ----------------
export const schemaProducto = z.object({
  categoria_id: z.number().int("El ID de la categoría debe ser un número entero").positive("El ID de la categoría debe ser un número positivo"),
  unidad_medida_id: z.number().int("El ID de la unidad de medida debe ser un número entero").positive("El ID de la unidad de medida debe ser un número positivo"),
  producto: z
    .string()
    .trim()
    .min(2, "El nombre del producto debe tener al menos 2 caracteres")
    .max(150, "El nombre del producto no puede tener más de 150 caracteres"),
  precio: z.number().positive("El precio debe ser un número positivo"),
});

export const schemaProductoUpdate = schemaProducto.partial().strict();

export const schemaProductoStockMinimo = z.object({
  stock_minimo: z.number().int("El stock mínimo debe ser un número entero").min(0, "El stock mínimo no puede ser negativo"),
});

export const schemaMateriaPrima = z.object({
  categoria_id: z.number().int("El ID de la categoría debe ser un número entero").positive("El ID de la categoría debe ser un número positivo"),
  unidad_medida_id: z.number().int("El ID de la unidad de medida debe ser un número entero").positive("El ID de la unidad de medida debe ser un número positivo"),
  materia_prima: z
    .string()
    .trim()
    .min(3, "El nombre de la materia prima debe tener al menos 3 caracteres")
    .max(150, "El nombre de la materia prima no puede tener más de 150 caracteres"),
  es_perecedera: z.boolean(),
  maneja_merma: z.boolean(),
});

export const schemaReceta = z.object({
  producto_id: z.number().int("El ID del producto debe ser un número entero").positive("El ID del producto debe ser un número positivo"),
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre de la receta debe tener al menos 2 caracteres")
    .max(150, "El nombre de la receta no puede tener más de 150 caracteres"),
  cantidad_lote: z.number().positive("La cantidad del lote debe ser un número positivo"),
  items: z
    .array(
      z.object({
        materia_prima_id: z.number().int("El ID de la materia prima debe ser un número entero").positive("El ID de la materia prima debe ser un número positivo"),
        cantidad_necesaria: z.number().positive("La cantidad necesaria debe ser un número positivo"),
      })
    )
    .optional(),
});

export const schemaRecetaUpdate = z
  .object({
    producto_id: z.number().int("El ID del producto debe ser un número entero").positive("El ID del producto debe ser un número positivo").optional(),
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre de la receta debe tener al menos 2 caracteres")
      .max(150, "El nombre de la receta no puede tener más de 150 caracteres")
      .optional(),
    cantidad_lote: z.number().positive("La cantidad del lote debe ser un número positivo").optional(),
  })
  .strict();

export const schemaLoteMateriaPrima = z
  .object({
    materia_prima_id: z.number().int("El ID de la materia prima debe ser un número entero").positive("El ID de la materia prima debe ser un número positivo"),
    fecha_vencimiento: z
      .string({ error: "La fecha de vencimiento es requerida" })
      .refine((val) => !isNaN(Date.parse(val)), { message: "Fecha inválida" })
      .refine(
        (val) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const inputDate = new Date(val);
          return inputDate >= today;
        },
        { message: "La fecha de vencimiento no debe ser una fecha pasada" }
      ),
    cantidad_inicial: z.number().positive("La cantidad inicial debe ser un número positivo"),
    cantidad_actual: z.number().nonnegative("La cantidad actual no puede ser negativa"),
    estado: z.enum(["VIGENTE", "VENCIDO", "AGOTADO"], {
      error: "El estado debe ser 'VIGENTE', 'VENCIDO' o 'AGOTADO'",
    }),
  })
  .refine((data) => data.cantidad_actual <= data.cantidad_inicial, {
    message: "La cantidad actual no puede ser mayor a la cantidad inicial",
    path: ["cantidad_actual"],
  });

export const schemaKardexBodega = z.object({
  bodega_id: z.number().int("El campo debe ser entero").positive("El campo debe ser positivo"),
  lote_id: z.number().int("El campo debe ser entero").positive("El campo debe ser positivo"),
  tipo_movimiento: z.enum(["INGRESO", "SALIDA", "MERMA", "VENCIMIENTO", "TRASLADO"]),
  cantidad: z.number().positive("El campo debe ser positivo").min(1, "El campo debe ser mayor o igual a 1"),
});

// ---------------- Pedido ----------------
export const schemaPedido = z.object({
  cliente_id: z.number().int("El ID del cliente debe ser un número entero").positive("El ID del cliente debe ser un número positivo"),
  observaciones: z.string().trim().max(255, "Las observaciones no pueden tener más de 255 caracteres").optional(),
  estado: z.enum(ESTADOS_PEDIDO, {
    message: `El estado del pedido debe ser uno de los siguientes: ${ESTADOS_PEDIDO.join(", ")}`,
  }),
});

export const schemaPedidoCreate = z.object({
  cliente_id: z.number().int("El ID del cliente debe ser un número entero").positive("El ID del cliente debe ser un número positivo"),
  observaciones: z.string().trim().max(255, "Las observaciones no pueden tener más de 255 caracteres").optional(),
  items: z
    .array(
      z.object({
        producto_id: z.number().int("El ID del producto debe ser un número entero").positive("El ID del producto debe ser un número positivo"),
        cantidad: z.number().positive("La cantidad debe ser un número positivo"),
      })
    )
    .min(1, "Debe incluir al menos un producto en el pedido"),
});

export const schemaPedidoEstado = z.object({
  estado: z.enum(ESTADOS_PEDIDO, {
    message: `El estado del pedido debe ser uno de los siguientes: ${ESTADOS_PEDIDO.join(", ")}`,
  }),
});

// ---------------- Proveedor ----------------
export const schemaProveedor = z.object({
  noNit: z
    .string()
    .min(8, "El NIT debe tener al menos 8 caracteres")
    .max(13, "El NIT no puede tener más de 13 caracteres")
    .regex(/^[0-9]+$/, "El NIT solo puede contener números"),
  proveedor: z
    .string()
    .min(3, "El nombre del proveedor debe tener al menos 3 caracteres")
    .max(150, "El nombre del proveedor no puede tener más de 150 caracteres"),
  direccion: z.string().max(255, "La dirección no puede tener más de 255 caracteres").optional(),
});

// ---------------- Orden de compra ----------------
export const schemaOrdenCompra = z.object({
  proveedor_id: z.number().int("El ID del proveedor debe ser un número entero").positive("El ID del proveedor debe ser un número positivo"),
  sucursal_destino: z.number().int("El ID de la sucursal destino debe ser un número entero").positive("El ID de la sucursal destino debe ser un número positivo"),
  items: z
    .array(
      z.object({
        materia_prima_id: z.number().int("El ID de la materia prima debe ser un número entero").positive("El ID de la materia prima debe ser un número positivo"),
        cantidad_solicitada: z.number().positive("La cantidad solicitada debe ser un número positivo"),
        precio_unitario: z.number().positive("El precio unitario debe ser un número positivo"),
      })
    )
    .min(1, "Debe incluir al menos un ítem"),
});

export const schemaOrdenCompraEstado = z.object({
  estado: z.enum(ESTADOS_ORDEN_COMPRA, {
    message: `El estado debe ser uno de los siguientes: ${ESTADOS_ORDEN_COMPRA.join(", ")}`,
  }),
});

// ---------------- Orden de trabajo ----------------
export const schemaOrdenTrabajo = z.object({
  sucursal_id: z.number().int("El ID de la sucursal debe ser un número entero").positive("El ID de la sucursal debe ser un número positivo"),
  receta_id: z.number().int("El ID de la receta debe ser un número entero").positive("El ID de la receta debe ser un número positivo"),
  cantidad_produccion: z.number().positive("La cantidad de producción debe ser un número positivo"),
});

export const schemaOrdenTrabajoEstado = z.object({
  estado: z.enum(ESTADOS_ORDEN_TRABAJO, {
    message: `El estado debe ser uno de los siguientes: ${ESTADOS_ORDEN_TRABAJO.join(", ")}`,
  }),
});

// ---------------- Hoja de recepcion ----------------
export const schemaHojaRecepcion = z.object({
  sucursal_receptora: z.number().int("El ID de la sucursal receptora debe ser un número entero").positive("El ID de la sucursal receptora debe ser un número positivo"),
  orden_compra_id: z.number().int("El ID de la orden de compra debe ser un número entero").positive("El ID de la orden de compra debe ser un número positivo").optional(),
  tipo_recepcion: z
    .enum(TIPOS_RECEPCION, { message: `El tipo de recepción debe ser uno de los siguientes: ${TIPOS_RECEPCION.join(", ")}` })
    .optional(),
  items: z
    .array(
      z.object({
        materia_prima_id: z.number().int("El ID de la materia prima debe ser un número entero").positive("El ID de la materia prima debe ser un número positivo"),
        cantidad_recibida: z.number().positive("La cantidad recibida debe ser un número positivo"),
        fecha_vencimiento: z.string().min(1, "La fecha de vencimiento es requerida"),
        merma: z.number().min(0, "La merma no puede ser negativa").optional(),
      })
    )
    .min(1, "Debe incluir al menos un ítem"),
});

// ---------------- Factura de compra ----------------
export const schemaFacturaCompra = z.object({
  hoja_recepcion_id: z.number().int("El ID de la hoja de recepción debe ser un número entero").positive("El ID de la hoja de recepción debe ser un número positivo"),
  serie: z.string().trim().min(1, "La serie es requerida").max(15, "La serie no puede tener más de 15 caracteres"),
  numero: z.string().trim().min(1, "El número es requerido").max(32, "El número no puede tener más de 32 caracteres"),
  fecha_emision: z.string().min(1, "La fecha de emisión es requerida"),
  total: z.number().positive("El total debe ser un número positivo"),
});

// ---------------- Hoja de despacho ----------------
export const schemaHojaDespacho = z.object({
  pedido_id: z.number().int("El ID del pedido debe ser un número entero").positive("El ID del pedido debe ser un número positivo"),
  sucursal_despacho: z.number().int("El ID de la sucursal de despacho debe ser un número entero").positive("El ID de la sucursal de despacho debe ser un número positivo"),
  items: z
    .array(
      z.object({
        producto_lote_id: z.number().int("El ID del lote de producto debe ser un número entero").positive("El ID del lote de producto debe ser un número positivo"),
        cantidad_despachada: z.number().positive("La cantidad despachada debe ser un número positivo"),
      })
    )
    .optional(),
});

// ---------------- Factura de venta ----------------
export const schemaFacturaVenta = z.object({
  pedido_id: z.number().int("El ID del pedido debe ser un número entero").positive("El ID del pedido debe ser un número positivo"),
  serie: z.string().trim().min(1, "La serie es requerida").max(15, "La serie no puede tener más de 15 caracteres"),
  numero: z.string().trim().min(1, "El número es requerido").max(32, "El número no puede tener más de 32 caracteres"),
  fecha_emision: z.string().optional(),
  total: z.number().positive("El total debe ser un número positivo"),
});

// ---------------- Caja / Turno / Liquidacion / Gasto ----------------
export const schemaCaja = z.object({
  sucursal_id: z.number().int("El ID de la sucursal debe ser un número entero").positive("El ID de la sucursal debe ser un número positivo"),
  nombre: z.string().trim().min(1, "El nombre de la caja es requerido").max(100, "El nombre de la caja no puede tener más de 100 caracteres"),
  tipo: z.enum(TIPOS_CAJA, { message: `El tipo de caja debe ser uno de los siguientes: ${TIPOS_CAJA.join(", ")}` }).optional(),
});

export const schemaCajaUpdate = schemaCaja.partial().strict();

export const schemaTurnoApertura = z.object({
  caja_id: z.number().int("El ID de la caja debe ser un número entero").positive("El ID de la caja debe ser un número positivo"),
  usuario_id: z.number().int("El ID del usuario debe ser un número entero").positive("El ID del usuario debe ser un número positivo"),
  administrador_id: z.number().int("El ID del administrador debe ser un número entero").positive("El ID del administrador debe ser un número positivo").optional(),
  monto_apertura: z.number().positive("El monto de apertura debe ser un número positivo"),
});

export const schemaTurnoCierre = z.object({
  monto_cierre_declarado: z.number().min(0, "El monto de cierre declarado no puede ser negativo"),
});

export const schemaTurnoValidar = z.object({
  monto_cierre_sistema: z.number().min(0, "El monto de cierre del sistema no puede ser negativo"),
});

export const schemaLiquidacion = z.object({
  turno_id: z.number().int("El ID del turno debe ser un número entero").positive("El ID del turno debe ser un número positivo"),
  repartidor_id: z.number().int("El ID del repartidor debe ser un número entero").positive("El ID del repartidor debe ser un número positivo"),
  monto_entregado_repartidor: z.number().min(0, "El monto entregado al repartidor no puede ser negativo").optional(),
  monto_recaudado_efectivo: z.number().min(0, "El monto recaudado en efectivo no puede ser negativo").optional(),
  monto_recaudado_voucher: z.number().min(0, "El monto recaudado en voucher no puede ser negativo").optional(),
});

export const schemaGastoSucursal = z.object({
  sucursal_id: z.number().int("El ID de la sucursal debe ser un número entero").positive("El ID de la sucursal debe ser un número positivo"),
  caja_id: z.number().int("El ID de la caja debe ser un número entero").positive("El ID de la caja debe ser un número positivo").optional(),
  usuario_id: z.number().int("El ID del usuario debe ser un número entero").positive("El ID del usuario debe ser un número positivo").optional(),
  monto_apertura: z.number().min(0, "El monto de apertura no puede ser negativo").optional(),
  monto_cierre_declarado: z.number().min(0, "El monto de cierre declarado no puede ser negativo").optional(),
  monto_cierre_sistema: z.number().min(0, "El monto de cierre del sistema no puede ser negativo").optional(),
});
