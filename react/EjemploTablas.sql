

Productos (
	NombreProducto,
	Moneda,
	PrecioUnidadActual,
	SubMarca,
	Variante, --Metros, observación
)


Archivos (
	Referencia a la orden,
	NombreArchivo,
	CantidadImpresiones
)


Sublimacion (
	TelaCliente, -- Cliente especifica que tela quiere sublimar
)

Lona (
	TipoImpresion, --Ecosolvente, UV
	CantidadPasadas,
)

Corte(
	OrdenUser, --Puede ser null
	TipoDeMolde, --De user siempre viene como Sublimacion, sino ModeldesTW
)


Clientes (
	ID,
	Nombre Apellido,
	Celular,
	Nombre Empresa,
	Documento, --RUT o C.I.
	Localidad,
	Agencia, -- puede ser null,
	PreferenciaEntrega,
	Direccion, 
	TipoCliente, --Semanal, Comun, PagoAdelantado
	Mail
)

DescuentoClienteProducto (
	Cliente,
	Producto,
	Porcentaje
)

