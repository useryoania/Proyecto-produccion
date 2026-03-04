/* Cambios 25/12/2024 */
insert into [User].[dbo].EstadosOrdenesRetiro values ('Empaquetado y abonado')

update [User].[dbo].EstadosOrdenesRetiro 
set EORNombreEstado = 'Empaquetado sin abonar'
where EORNombreEstado = 'Empaquetado'

ALTER TABLE [User].dbo.OrdenesRetiro
ADD ORePasarPorCaja bit default 0

/* Cambios 12/01/2026 */
ALTER TABLE [User].dbo.Ordenes 
ADD OrdAvisoWsp bit default 0

ALTER TABLE [User].dbo.Ordenes 
ADD OrdFechaAvisoWsp datetime 
