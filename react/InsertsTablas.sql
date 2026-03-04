--------------------------------------------------------------------------------------------------------------
Use [User]

--------------------------------------------------------------------------------------------------------------
------------------------------------------------ MONEDAS -----------------------------------------------------
--------------------------------------------------------------------------------------------------------------

insert into Monedas values('$','Peso uruguayo',getdate())
insert into Monedas values('USD','Dólar americano',getdate())

--------------------------------------------------------------------------------------------------------------
----------------------------------------------- UNIDADES -----------------------------------------------------
--------------------------------------------------------------------------------------------------------------

insert into Unidades values ('Cantidades','uni',getdate())
insert into Unidades values ('Metros','mts',getdate())

--------------------------------------------------------------------------------------------------------------
---------------------------------------------- SUBMARCAS -----------------------------------------------------
--------------------------------------------------------------------------------------------------------------

insert into SubMarcas values ('IMPRITEX','SB',getdate(),1)
insert into SubMarcas values ('ECOuv','ECOUV',getdate(),1)
insert into SubMarcas values ('DTF Uruguay','DF',getdate(),1)
insert into SubMarcas values ('Team work','TWC',getdate(),1)
insert into SubMarcas values ('Otros','OT',getdate(),1)
insert into SubMarcas values ('Emblemas UY','EMB',getdate(),1)

--------------------------------------------------------------------------------------------------------------
---------------------------------------------- PRODUCTOS -----------------------------------------------------
--------------------------------------------------------------------------------------------------------------

Declare @IDProducto as int

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Tela Cliente','(Minimo 5mts)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,28,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Dry Poroso','(1,50)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Bandera Confeccionada','(1,50x0,90)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,27.1,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Adis Elastizado','(1,50)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,29,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Modal','(1,50)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,29,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Lycra','(1,60)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Micropolar','(1,50)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Frontlight','3,20 Brillo (reverso blanco)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,220,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Frontlight','3,20 Mate (reverso blanco)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,220,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Frontlight','3,20 Brillo (reverso gris)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,220,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Frontlight','3,20 Mate (reverso gris)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,220,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Frontlight','1,60 Mate (reverso gris)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Frontlight','1,60 Brillo (reverso gris)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Frontlight','1,60 Mate (reverso blanco)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Frontlight','1,60 Brillo (reverso blanco)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Vinilo brillo','1,52 (Adhesivo Gris)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,29,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Vinilo brillo','1,52 (Adhesivo Transparente)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,29,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Vinilo mate','1,52 (Adhesivo Gris)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,29,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Vinilo brillo','1,37 (Adhesivo Gris)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,27,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Vinilo brillo','1,37 (Adhesivo Transparente)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,27,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Vinilo Brillo','1,37 (Adhesivo Blanco)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,27,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Vinilo Brillo','1,0 (Adhesivo Blanco)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,28,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Vinilo Vehicular','(1,52)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,215,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Canvas','1,52',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,226,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Canvas','1,27',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,222,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Banner Pet semibrillo','(0,91)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,211,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Banner Pet mate','(1,37)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,217,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Back pet','(1,37)',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,217,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Jacquard Elite','1,83',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,214,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Jacquard Supreme','1,83',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,214,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Rib','1,70 (Cuellos y vivos tela Elite y Supreme)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,214,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Dry Exclusive','(1,83)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Scuba','1,57',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Jacquard','1,83 (Lado poroso)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Jacquard','1,83 (lado liso)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Lona para Pasacalles','0,80',2,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,28,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Papel',NULL,1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,27,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('TC Tela cliente',NULL,1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,28,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Toalla','(1,83)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,28,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Bandera mesh','(1,83)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Bandera fina','(1,60) (68g)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,29,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Dry Rajchman','(1,83)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Hexagonal','(1,83)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210.5,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Dry Microporoso','1.83 (lado  poroso)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Dry Microporoso','1.83 (lado  liso)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Adis Elastizado','(1,83)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,29,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('COMUN',NULL,3,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,222,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('DORADO',NULL,3,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,225,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('PLATEADO',NULL,3,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,225,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('GLITTER',NULL,3,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,225,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('LUMINISCENTE',NULL,3,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,225,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('UV','(PARA RIGIDOS)',3,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,222,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('TORNASOLADO',NULL,3,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,225,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Saten','(1.50)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Dry Pro','(1,80)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Bandera','(1,60)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,212,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Panama','(1,50)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,29,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Adis','(1,60)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,29,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Micro fibra','(1,50)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Polar','(1,50)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,210,getdate(),NULL,getdate(),NULL,1)

insert into Productos (ProNombreProducto,ProDetalleProducto,SMaIdSubMarca,UniIdUnidad,ProVigente,ProFechaHoraAlta,ProUsuarioAlta) values ('Mykonos','(1,50)',1,2,1,getdate(),1)
set @IDProducto = SCOPE_IDENTITY()
insert into HistoricoPreciosProductos values (@IDProducto,2,211,getdate(),NULL,getdate(),NULL,1)

update HistoricoPreciosProductos
set HPPPrecioProducto = RIGHT(HPPPrecioProducto,LEN(HPPPrecioProducto)-1)

update Pro
set Pro.MonIdMoneda = HPP.MonIdMoneda,
	Pro.ProPrecioActual = HPP.HPPPrecioProducto
from Productos Pro
join HistoricoPreciosProductos HPP ON HPP.ProIdProducto = Pro.ProIdProducto


INSERT INTO PRODUCTOS VALUES (NULL,'Mykonos','(1,60)',1,2,1,GETDATE(),1,2,11)
INSERT INTO PRODUCTOS VALUES (NULL,'Deportiva','(1,60)',1,2,1,GETDATE(),1,2,12)
INSERT INTO PRODUCTOS VALUES (NULL,'Bandera Confeccionada','(1,50x0,85)',1,1,1,GETDATE(),1,1,250)
INSERT INTO PRODUCTOS VALUES (NULL,'Bordado','',6,1,1,GETDATE(),1,1,10)
INSERT INTO PRODUCTOS VALUES (NULL,'Vinilo Microperforado','1,50',2,2,1,GETDATE(),1,2,17)
INSERT INTO PRODUCTOS VALUES (NULL,'PET Backlight','(0,91)',2,2,1,GETDATE(),1,2,22)
INSERT INTO PRODUCTOS VALUES (NULL,'Frontlight','3,20 Brillo (Reverso Negro)',2,2,1,GETDATE(),1,2,22)
INSERT INTO PRODUCTOS VALUES (NULL,'Frontlight','3,20 Mate (Reverso Negro)',2,2,1,GETDATE(),1,2,12)
INSERT INTO PRODUCTOS VALUES (NULL,'Frontlight','1,60 Brillo (Reverso Negro)',2,2,1,GETDATE(),1,2,12)
INSERT INTO PRODUCTOS VALUES (NULL,'Frontlight','1,60 Mate (Reverso Negro)',2,2,1,GETDATE(),1,2,6.8)
INSERT INTO PRODUCTOS VALUES (NULL,'Vinilo Microperforado','1,52 (Reverso Negro)',2,2,1,GETDATE(),1,2,6.8)
INSERT INTO PRODUCTOS VALUES (NULL,'Vinilo Microperforado','0,98 (Reverso Negro)',2,2,1,GETDATE(),1,2,8)
INSERT INTO PRODUCTOS VALUES (NULL,'Vinilo Brillo','1,52 (Adhesivo Blanco)',2,2,1,GETDATE(),1,2,8)
INSERT INTO PRODUCTOS VALUES (NULL,'Vinilo Mate','1,52 (Adhesivo Blanco)',2,2,1,GETDATE(),1,2,9)
INSERT INTO PRODUCTOS VALUES (NULL,'Vinilo Vehicular','1,52 (Adhesivo Gris)',2,2,1,GETDATE(),1,2,8)
INSERT INTO PRODUCTOS VALUES (NULL,'Vinilo brillo','1,37 (adhesivo translúcido/blanco)',2,2,1,GETDATE(),1,2,6.5)
INSERT INTO PRODUCTOS VALUES (NULL,'Vinilo Brillo','0,91 (Adhesivo Blanco)',2,2,1,GETDATE(),1,2,6.5)
INSERT INTO PRODUCTOS VALUES (NULL,'Vinilo Mate','0,91 (Adhesivo Blanco)',2,2,1,GETDATE(),1,2,8)
INSERT INTO PRODUCTOS VALUES (NULL,'Canvas','0,90',2,2,1,GETDATE(),1,2,8)
INSERT INTO PRODUCTOS VALUES (NULL,'SUBLIMACIÓN','',4,1,1,GETDATE(),1,1,0)
INSERT INTO PRODUCTOS VALUES (NULL,'Articulos User','',5,1,1,GETDATE(),1,1,0)
INSERT INTO PRODUCTOS VALUES (NULL,'MOLDES CLIENTE','',4,1,1,GETDATE(),1,1,0)


update productos set ProCodigoOdooProducto = 'IPS' WHERE PROIDPRODUCTO = 37
update productos set ProCodigoOdooProducto = 'ST-CL-' WHERE PROIDPRODUCTO = 38
update productos set ProCodigoOdooProducto = 'ST-T-' WHERE PROIDPRODUCTO = 39
update productos set ProCodigoOdooProducto = 'ST-BM-' WHERE PROIDPRODUCTO = 40
update productos set ProCodigoOdooProducto = 'ST-BF-' WHERE PROIDPRODUCTO = 41
update productos set ProCodigoOdooProducto = 'ST-DLR180-' WHERE PROIDPRODUCTO = 42
update productos set ProCodigoOdooProducto = 'ST-H180-' WHERE PROIDPRODUCTO = 43
update productos set ProCodigoOdooProducto = 'ST-DM180-' WHERE PROIDPRODUCTO = 44
update productos set ProCodigoOdooProducto = 'ST-DM180-' WHERE PROIDPRODUCTO = 45
update productos set ProCodigoOdooProducto = 'ST-AE-' WHERE PROIDPRODUCTO = 46
update productos set ProCodigoOdooProducto = 'IDTF' WHERE PROIDPRODUCTO = 47
update productos set ProCodigoOdooProducto = 'IDTFED' WHERE PROIDPRODUCTO = 48
update productos set ProCodigoOdooProducto = 'IDTFEP' WHERE PROIDPRODUCTO = 49
update productos set ProCodigoOdooProducto = 'IDTFEG' WHERE PROIDPRODUCTO = 50
update productos set ProCodigoOdooProducto = 'IDTFEF' WHERE PROIDPRODUCTO = 51
update productos set ProCodigoOdooProducto = 'IDTFUV' WHERE PROIDPRODUCTO = 52
update productos set ProCodigoOdooProducto = 'IDTFEC' WHERE PROIDPRODUCTO = 53
update productos set ProCodigoOdooProducto = 'ST-FS-' WHERE PROIDPRODUCTO = 54
update productos set ProCodigoOdooProducto = 'ST-DP-' WHERE PROIDPRODUCTO = 55
update productos set ProCodigoOdooProducto = 'ST-BA-' WHERE PROIDPRODUCTO = 56
update productos set ProCodigoOdooProducto = 'ST-PA-' WHERE PROIDPRODUCTO = 57
update productos set ProCodigoOdooProducto = 'ST-AD-' WHERE PROIDPRODUCTO = 58
update productos set ProCodigoOdooProducto = 'ST-MF-' WHERE PROIDPRODUCTO = 59
update productos set ProCodigoOdooProducto = 'ST-P-' WHERE PROIDPRODUCTO = 60
update productos set ProCodigoOdooProducto = 'ST-MY-' WHERE PROIDPRODUCTO = 62
update productos set ProCodigoOdooProducto = 'ST-DE-' WHERE PROIDPRODUCTO = 63

INSERT INTO HistoricoPreciosProductos (ProIdProducto, MonIdMoneda, HPPPrecioProducto, HPPFechaDesde, HPPFechaHasta, HPPFechaAlta, HPPFechaModificacion, HPPUsuarioAlta)
Select Pro.ProIdProducto, Pro.MonIdMoneda, ProPrecioActual, getdate(), NULL, getdate(), NULL, 1
from Productos Pro
left join HistoricoPreciosProductos HPP ON HPP.ProIdProducto = Pro.ProIdProducto
where HPP.ProIdProducto is null

--------------------------------------------------------------------------------------------------------------
--------------------------------------------- MODOORDENES ----------------------------------------------------
--------------------------------------------------------------------------------------------------------------

insert into ModosOrdenes values ('Normal','(24 a 96 hs)',0,1,getdate(),1)
insert into ModosOrdenes values ('Urgente','(entrega en 24h , costo 25% extra, sujeto a disponibilidad)',0.25,1,getdate(),1)

--------------------------------------------------------------------------------------------------------------
-------------------------------------------- ESTADOSORDENES --------------------------------------------------
--------------------------------------------------------------------------------------------------------------

insert into EstadosOrdenes values ('Ingresado')
insert into EstadosOrdenes values ('Para imprimir')
insert into EstadosOrdenes values ('Impreso')
insert into EstadosOrdenes values ('Pronto')
insert into EstadosOrdenes values ('Para avisar')
insert into EstadosOrdenes values ('Avisado')
insert into EstadosOrdenes values ('Pronto para entregar')
insert into EstadosOrdenes values ('En camino')
insert into EstadosOrdenes values ('Entregado')
insert into EstadosOrdenes values ('Cancelado')
insert into EstadosOrdenes values ('Perdida')

--------------------------------------------------------------------------------------------------------------
-------------------------------------------- LUGARESRETIRO ---------------------------------------------------
--------------------------------------------------------------------------------------------------------------

insert into LugaresRetiro values ('Encomienda',1,getdate(),1)
insert into LugaresRetiro values ('Cadetería',1,getdate(),1)
insert into LugaresRetiro values ('Corte',1,getdate(),1)
insert into LugaresRetiro values ('Viviana',1,getdate(),1)
insert into LugaresRetiro values ('En local',1,getdate(),1)
insert into LugaresRetiro values ('Retira más adelante',1,getdate(),1)
insert into LugaresRetiro values ('Emblemas Uy',1,getdate(),1)

--------------------------------------------------------------------------------------------------------------
-------------------------------------------- TIPOSCLIENTES ---------------------------------------------------
--------------------------------------------------------------------------------------------------------------

Insert into TiposClientes values ('Comun',getdate())
Insert into TiposClientes values ('Semanal',getdate())
Insert into TiposClientes values ('Rollo por adelantado',getdate())
insert into TiposClientes values ('DEUDOR',getdate())

--------------------------------------------------------------------------------------------------------------
----------------------------------------------- CLIENTES -----------------------------------------------------
--------------------------------------------------------------------------------------------------------------
ALTER TABLE Clientes
ADD CliBloqueadoBy int

Insert into [User].[dbo].MetodosPagos values ('Contado')
Insert into [User].[dbo].MetodosPagos values ('Transferencia')
Insert into [User].[dbo].MetodosPagos values ('Débito')
Insert into [User].[dbo].MetodosPagos values ('Crédito')
Insert into [User].[dbo].MetodosPagos values ('Mercado pago')
Insert into [User].[dbo].MetodosPagos values ('Take (BROU)')
Insert into [User].[dbo].MetodosPagos values ('Rollo por adelantado')

--insert into [User].[dbo].Ordenes values ('SB-14371',135,'Prueba',1,NULL,NULL,37,1,2,9,0,NULL,NULL,getdate(),1,0)
--insert into [User].[dbo].HistoricoEstadosOrdenes values (1,1,getdate(),1)

--insert into [User].[dbo].Ordenes values ('SB-14372',135,'Prueba2',1,NULL,NULL,37,1,2,9,0,NULL,NULL,getdate(),1,0)
--insert into [User].[dbo].HistoricoEstadosOrdenes values (2,1,getdate(),1)

--insert into [User].[dbo].Ordenes values ('SB-14373',102,'Prueba3',1,NULL,NULL,23,1.3,2,14,0,NULL,NULL,getdate(),1,0)
--insert into [User].[dbo].HistoricoEstadosOrdenes values (3,1,getdate(),1)

--insert into [User].[dbo].Ordenes values ('SB-14374',102,'Prueba4',1,NULL,NULL,23,1.3,2,14,0,NULL,NULL,getdate(),1,0)
--insert into [User].[dbo].HistoricoEstadosOrdenes values (4,1,getdate(),1)
--insert into [User].[dbo].HistoricoEstadosOrdenes values (4,5,getdate(),1)


insert into [User].[dbo].EstadosOrdenesRetiro values ('Ingresado')
insert into [User].[dbo].EstadosOrdenesRetiro values ('Pasar por caja')
insert into [User].[dbo].EstadosOrdenesRetiro values ('Abonado')
insert into [User].[dbo].EstadosOrdenesRetiro values ('Abonado de antemano')
insert into [User].[dbo].EstadosOrdenesRetiro values ('Entregado')
insert into [User].[dbo].EstadosOrdenesRetiro values ('Cancelar')
insert into [User].[dbo].EstadosOrdenesRetiro values ('Empaquetado')

/* Cambios 25/12/2024 */
insert into [User].[dbo].EstadosOrdenesRetiro values ('Empaquetado y abonado')

update [User].[dbo].EstadosOrdenesRetiro 
set EORNombreEstado = 'Empaquetado sin abonar'
where EORNombreEstado = 'Empaquetado'
