// Espejo de los tipos de la base de datos del backend (src/schemas/db.schema.ts).
// Las fechas se modelan como string (ISO) y los decimales como number.
// PROHIBIDO usar `any` en este archivo.

// ============================================================
// Enums (valores tal cual los expone la API)
// ============================================================
export const ROLES = ["ADMIN", "BODEGUERO", "DESPACHADOR", "REPARTIDOR", "CAJERO"] as const;
export const ESTADOS_PEDIDO = ["CREADO", "LISTO", "ANULADO", "EN_RUTA", "ENTREGADO"] as const;
export const ESTADOS_ORDEN_COMPRA = ["CREADA", "EN_PROCESO", "FINALIZADO", "ANULADO"] as const;
export const ESTADOS_ORDEN_TRABAJO = ["GENERADA", "EN_PROCESO", "ANULADA", "FINALIZADA"] as const;
export const ESTADOS_LOTE = ["VIGENTE", "VENCIDO", "AGOTADO"] as const;
export const TIPOS_RECEPCION = ["TOTAL", "PARCIAL"] as const;
export const ESTADOS_RECEPCION = ["COMPLETA", "INCOMPLETA"] as const;
export const TIPOS_MOVIMIENTO = ["INGRESO", "SALIDA", "MERMA", "VENCIMIENTO", "TRASLADO"] as const;
export const TIPOS_CAJA = ["CAJA_CHICA", "GASTOS_REPRESENTACION", "TRANSITO"] as const;
export const ESTADOS_SOLICITUD_INSUMO = ["PENDIENTE", "ENVIADA", "RECIBIDA", "CANCELADA"] as const;

export type RolUsuario = (typeof ROLES)[number];
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];
export type EstadoOrdenCompra = (typeof ESTADOS_ORDEN_COMPRA)[number];
export type EstadoOrdenTrabajo = (typeof ESTADOS_ORDEN_TRABAJO)[number];
export type EstadoLote = (typeof ESTADOS_LOTE)[number];
export type TipoRecepcion = (typeof TIPOS_RECEPCION)[number];
export type EstadoRecepcion = (typeof ESTADOS_RECEPCION)[number];
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];
export type TipoCaja = (typeof TIPOS_CAJA)[number];
export type EstadoSolicitudInsumo = (typeof ESTADOS_SOLICITUD_INSUMO)[number];

// ============================================================
// Envelope de la API: { data, error }
// ============================================================
export interface ApiEnvelope<T> {
  data: T;
  error: string | null;
}

// ============================================================
// Entidades (SELECT) - una por tabla
// ============================================================
export interface Sucursal {
  id: number;
  municipio_id: number;
  sucursal: string;
  direccion: string | null;
}

export interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  telefono_ref: string;
  creado_en: string;
}

export interface Municipio {
  id: number;
  departamento_id: number;
  municipio: string;
}

export interface Departamento {
  id: number;
  departamento: string;
}

export interface Direccion {
  id: number;
  cliente_id: number;
  municipio_id: number;
  direccion1: string;
  direccion2: string;
}

export interface Categoria {
  id: number;
  categoria_id: number;
  descripcion: string;
  creado_en: string;
}

export interface UnidadMedida {
  id: number;
  unidad: string;
  abreviatura: string;
  creado_en: string;
}

export interface MateriaPrima {
  id: number;
  categoria_id: number;
  unidad_medida_id: number;
  materia_prima: string;
  es_perecedera: boolean;
  maneja_merma: boolean;
  creado_en: string;
}

export interface LoteMateriaPrima {
  id: number;
  materia_prima_id: number;
  fecha_vencimiento: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  estado: EstadoLote;
  creado_en: string;
}

export interface Bodega {
  id: number;
  sucursal_id: number;
  bodega: string;
}

export interface StockBodega {
  id: number;
  bodega_id: number;
  lote_id: number;
}

export interface KardexBodega {
  id: number;
  bodega_id: number;
  lote_id: number;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  fecha_movimiento: string;
}

export interface Alacena {
  id: number;
  bodega_id: number | null;
  alacena: string;
  creado_en: string;
}

export interface StockAlacena {
  id: number;
  alacena_id: number | null;
  lote_id: number | null;
}

export interface KardexAlacena {
  id: number;
  alacena_id: number | null;
  lote_id: number | null;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  fecha_movimiento: string;
}

export interface Producto {
  id: number;
  categoria_id: number;
  unidad_medida_id: number;
  producto: string;
  precio: number;
  // V2 del backend: URL de la imagen del producto (aun no existe en la API V1).
  imagen_url?: string | null;
}

export interface Pedido {
  id: number;
  cliente_id: number;
  fecha_pedido: string;
  observaciones: string | null;
  total: number;
  estado: EstadoPedido;
}

export interface DetallePedido {
  id: number;
  pedido_id: number | null;
  producto_id: number;
  precio_unitario: number;
  cantidad: number;
}

export interface FacturaVenta {
  id: number;
  pedido_id: number;
  serie: string;
  numero: string;
  fecha_emision: string;
  total: number;
  creado_en: string;
}

export interface Proveedor {
  id: number;
  no_nit: string;
  proveedor: string;
  direccion: string | null;
}

export interface OrdenCompra {
  id: number;
  proveedor_id: number | null;
  sucursal_destino: number | null;
  fecha_generada: string;
  estado_orden: EstadoOrdenCompra;
}

export interface DetalleOrdenCompra {
  id: number;
  orden_compra_id: number;
  materia_prima_id: number;
  cantidad_solicitada: number;
  precio_unitario: number;
  subtotal: number;
}

export interface HojaRecepcion {
  id: number;
  sucursal_receptora: number | null;
  orden_compra_id: number | null;
  tipo_recepcion: TipoRecepcion;
  fecha_generada: string;
}

export interface HojaRecepcionDetalle {
  id: number;
  hoja_recepcion_id: number | null;
  materia_prima_id: number | null;
  cantidad_recibida: number;
  fecha_vencimiento: string;
  merma: number | null;
  saldo: number;
  estado: EstadoRecepcion;
}

export interface FacturaCompra {
  id: number;
  hoja_recepcion_id: number | null;
  serie: string;
  numero: string;
  fecha_emision: string;
  total: number;
  fecha_ingreso: string;
}

export interface OrdenTrabajo {
  id: number;
  sucursal_id: number | null;
  receta_id: number | null;
  cantidad_produccion: number | null;
  estado: EstadoOrdenTrabajo | null;
}

export interface ProductoLote {
  id: number;
  orden_id: number | null;
  cantidad_inicial: number | null;
  cantidad_actual: number | null;
  estado: EstadoLote | null;
  producido_en: string;
}

export interface Receta {
  id: number;
  producto_id: number | null;
  nombre: string;
  cantidad_lote: number;
  creada_en: string;
}

export interface RecetaDetalle {
  id: number;
  receta_id: number | null;
  materia_prima_id: number | null;
  cantidad_necesaria: number;
}

export interface HojaDespacho {
  id: number;
  pedido_id: number | null;
  sucursal_despacho: number | null;
  despachado_en: string;
}

export interface HojaDespachoDetalle {
  id: number;
  hoja_despacho_id: number | null;
  producto_lote_id: number | null;
  cantidad_despachada: number | null;
}

export interface Caja {
  id: number;
  sucursal_id: number | null;
  tipo: TipoCaja | null;
  nombre: string | null;
}

export interface TurnoDespachador {
  id: number;
  caja_id: number | null;
  usuario_id: number | null;
  administrador_id: number | null;
  monto_apertura: number | null;
  monto_cierre_declarado: number | null;
  monto_cierre_sistema: number | null;
  abierto_en: string | null;
  cerrado_en: string | null;
}

export interface LiquidacionRepartidor {
  id: number;
  turno_id: number | null;
  repartidor_id: number | null;
  monto_entregado_repartidor: number | null;
  monto_recaudado_efectivo: number | null;
  monto_recaudado_voucher: number | null;
  creado_en: string;
}

export interface GastosSucursal {
  id: number;
  caja_id: number | null;
  usuario_id: number | null;
  sucursal_id: number | null;
  monto_apertura: number | null;
  monto_cierre_declarado: number | null;
  monto_cierre_sistema: number | null;
  abierto_en: string | null;
  cerrado_en: string | null;
}

// La API nunca devuelve `contrasenia`.
export interface Usuario {
  id: number;
  usuario: string | null;
  correo_electronico: string | null;
  rol: RolUsuario;
  creado_en: string;
}

export interface SolicitudInsumo {
  id: number;
  sucursal_id: number | null;
  solicitado_por: number | null;
  estado: EstadoSolicitudInsumo;
  fecha_solicitud: string;
}

export interface DetalleSolicitudInsumo {
  id: number;
  solicitud_id: number;
  materia_prima_id: number;
  cantidad_solicitada: number;
  cantidad_recibida: number | null;
}

// ============================================================
// Respuestas compuestas
// ============================================================
// GET /pedidos/{id} devuelve { ...pedido, detalles }
export interface PedidoConDetalles extends Pedido {
  detalles: DetallePedido[];
}

// GET /recetas/{id} devuelve { ...receta, detalles }
export interface RecetaConDetalles extends Receta {
  detalles: RecetaDetalle[];
}

// GET /hojas-recepcion/{id} y /hojas-despacho/{id} (si el backend anida detalles)
export interface HojaRecepcionConDetalles extends HojaRecepcion {
  detalles: HojaRecepcionDetalle[];
}

export interface HojaDespachoConDetalles extends HojaDespacho {
  detalles: HojaDespachoDetalle[];
}

export interface OrdenCompraConDetalles extends OrdenCompra {
  detalles: DetalleOrdenCompra[];
}

// ============================================================
// DTOs de entrada (request bodies reales de los controllers)
// ============================================================
export interface PedidoItemInput {
  producto_id: number;
  cantidad: number;
}

export interface PedidoCreateInput {
  cliente_id: number;
  observaciones?: string;
  items: PedidoItemInput[];
}

export interface RecetaItemInput {
  materia_prima_id: number;
  cantidad_necesaria: number;
}

export interface RecetaCreateInput {
  producto_id: number;
  nombre: string;
  cantidad_lote: number;
  items?: RecetaItemInput[];
}

export interface OrdenCompraItemInput {
  materia_prima_id: number;
  cantidad_solicitada: number;
  precio_unitario: number;
}

export interface OrdenCompraCreateInput {
  proveedor_id: number;
  sucursal_destino: number;
  items: OrdenCompraItemInput[];
}

export interface OrdenTrabajoCreateInput {
  sucursal_id: number;
  receta_id: number;
  cantidad_produccion: number;
}

export interface HojaRecepcionItemInput {
  materia_prima_id: number;
  cantidad_recibida: number;
  fecha_vencimiento: string;
  merma?: number;
}

export interface HojaRecepcionCreateInput {
  sucursal_receptora: number;
  orden_compra_id?: number;
  tipo_recepcion?: TipoRecepcion;
  items: HojaRecepcionItemInput[];
}

export interface HojaDespachoItemInput {
  producto_lote_id: number;
  cantidad_despachada: number;
}

export interface HojaDespachoCreateInput {
  pedido_id: number;
  sucursal_despacho: number;
  items?: HojaDespachoItemInput[];
}

export interface FacturaVentaCreateInput {
  pedido_id: number;
  serie: string;
  numero: string;
  fecha_emision?: string;
  total: number;
}

export interface FacturaCompraCreateInput {
  hoja_recepcion_id: number;
  serie: string;
  numero: string;
  fecha_emision: string;
  total: number;
}

export interface TurnoAperturaInput {
  caja_id: number;
  usuario_id: number;
  administrador_id?: number;
  monto_apertura: number;
}

export interface TurnoCierreInput {
  monto_cierre_declarado: number;
}

export interface TurnoValidarInput {
  monto_cierre_sistema: number;
}

export interface LiquidacionCreateInput {
  turno_id: number;
  repartidor_id: number;
  monto_entregado_repartidor?: number;
  monto_recaudado_efectivo?: number;
  monto_recaudado_voucher?: number;
}

// El schema zod del backend valida `noNit`, pero la tabla/controller leen `no_nit`.
// Se expone `noNit` en el body (contrato Swagger) y `Proveedor.no_nit` en la respuesta.
export interface ProveedorInput {
  noNit: string;
  proveedor: string;
  direccion?: string;
}

export interface CategoriaInput {
  categoria_id: number;
  descripcion: string;
}

export interface UnidadMedidaInput {
  unidad: string;
  abreviatura: string;
}

export interface MunicipioInput {
  departamento_id: number;
  municipio: string;
}

export interface SucursalInput {
  municipio_id: number;
  sucursal: string;
  direccion?: string;
}

export interface ProductoInput {
  categoria_id: number;
  unidad_medida_id: number;
  producto: string;
  precio: number;
  imagen_url?: string | null;
}

export interface MateriaPrimaInput {
  categoria_id: number;
  unidad_medida_id: number;
  materia_prima: string;
  es_perecedera?: boolean;
  maneja_merma?: boolean;
}

// ============================================================
// Notificaciones (TEMPORAL: no existe tabla ni endpoint en el backend)
// ============================================================
export const TIPOS_NOTIFICACION = [
  "PEDIDO_NUEVO",
  "PEDIDO_LISTO",
  "LOTE_POR_VENCER",
  "LOTE_VENCIDO",
  "SOLICITUD_INSUMO_PENDIENTE",
  "RECEPCION_INCOMPLETA",
] as const;

export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
  fecha: string;
  leida: boolean;
  roles_destino: RolUsuario[];
}

// ============================================================
// Gastos operativos (TEMPORAL: no existe tabla ni endpoint en el backend)
// La vista de Reportes se alimenta de un mock temporal por sucursal/mes.
// ============================================================
export const CATEGORIAS_GASTO_OPERATIVO = ["Sueldos", "Servicios", "Mantenimiento", "Otros"] as const;

export type CategoriaGastoOperativo = (typeof CATEGORIAS_GASTO_OPERATIVO)[number];

export interface GastoOperativo {
  id: number;
  sucursal_id: number;
  mes: string; // "YYYY-MM"
  categoria: CategoriaGastoOperativo;
  monto: number;
}

// ============================================================
// Auditoría (TEMPORAL: no existe tabla ni endpoint en el backend)
// La vista de auditoría se alimenta de un mock temporal.
// ============================================================
export const MODULOS_AUDITORIA = [
  "Ventas",
  "Cocina",
  "Despacho",
  "Compras",
  "Bodega",
  "Administración",
  "Sistema",
] as const;

export type ModuloAuditoria = (typeof MODULOS_AUDITORIA)[number];

export const ESTADOS_AUDITORIA = ["EXITOSO", "ADVERTENCIA", "ANULACION", "NEUTRAL"] as const;

export type EstadoAuditoria = (typeof ESTADOS_AUDITORIA)[number];

export interface AuditoriaRegistro {
  id: number;
  fecha: string;
  usuario: string;
  rol: string;
  modulo: ModuloAuditoria;
  accion: string;
  registro: string | null;
  estado: EstadoAuditoria;
}

// ============================================================
// Traslados de inventario (TEMPORAL: no existe tabla ni endpoint en el backend)
// El único rastro es tipo_movimiento = "TRASLADO" en KARDEX_BODEGA, que no
// incluye origen/destino/estado. Se alimenta de un mock temporal.
// ============================================================
export const ESTADOS_TRASLADO = ["PENDIENTE", "EN_TRANSITO", "COMPLETADO", "CANCELADO"] as const;

export type EstadoTraslado = (typeof ESTADOS_TRASLADO)[number];

export interface TrasladoInventario {
  id: number;
  bodega_origen_id: number;
  bodega_destino_id: number;
  materia_prima_id: number;
  cantidad: number;
  fecha: string;
  estado: EstadoTraslado;
}

// ============================================================
// Cuadre de inventario (TEMPORAL: no existe tabla ni endpoint en el backend)
// Se alimenta de un mock temporal.
// ============================================================
export interface CuadreInventario {
  id: number;
  bodega_id: number;
  materia_prima_id: number;
  stock_sistema: number;
  stock_fisico: number | null;
  justificacion: string | null;
}
