const sql = require('mssql');
const { poolPromise } = require('../config/db');
const cache = require('../cache'); // Importa la caché

// Controlador para obtener los clientes
const getCliente = async (req, res) => {
  const { codigoCliente } = req.body;

  if (!codigoCliente) {
    return res.status(400).json({ error: 'El código del cliente es obligatorio.' });
  }

  try {
    // Cargar las cachés o realizar las consultas si alguna está vacía
    let clientes = cache.get('clientes');
    if (!clientes) {
      console.log('Caché de clientes no encontrada. Consultando la base de datos...');
      const pool = await poolPromise;
      const result = await pool.request().query(`SELECT * FROM [User].[dbo].Clientes WITH(NOLOCK)`);
      clientes = result.recordset;
      cache.set('clientes', clientes);
      console.log('Caché de clientes actualizada.');
    }

    let tiposClientes = cache.get('tiposClientes');
    if (!tiposClientes) {
      console.log('Caché de tiposClientes no encontrada. Consultando la base de datos...');
      const pool = await poolPromise;
      const result = await pool.request().query(`SELECT * FROM [User].[dbo].TiposClientes WITH(NOLOCK)`);
      tiposClientes = result.recordset;
      cache.set('tiposClientes', tiposClientes);
      console.log('Caché de tiposClientes actualizada.');
    }

    let lugaresRetiro = cache.get('lugaresRetiro');
    if (!lugaresRetiro) {
      console.log('Caché de lugaresRetiro no encontrada. Consultando la base de datos...');
      const pool = await poolPromise;
      const result = await pool.request().query(`SELECT * FROM [User].[dbo].LugaresRetiro WITH(NOLOCK)`);
      lugaresRetiro = result.recordset;
      cache.set('lugaresRetiro', lugaresRetiro);
      console.log('Caché de lugaresRetiro actualizada.');
    }

    // Buscar el cliente en la caché de clientes
    const cliente = clientes.find((cli) => cli.CliCodigoCliente === codigoCliente);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    // Encontrar los datos relacionados
    const tipoCliente = tiposClientes.find((tc) => tc.TClIdTipoCliente === cliente.TClIdTipoCliente);
    const lugarRetiro = lugaresRetiro.find((lr) => lr.LReIdLugarRetiro === cliente.LReIdLugarRetiro);

    // Construir la respuesta uniendo los datos
    const response = {
      IdCliente: cliente.CliIdCliente,
      CodigoCliente: cliente.CliCodigoCliente,
      NombreCliente: cliente.CliNombreApellido,
      Celular: cliente.CliCelular,
      EmpresaCliente: cliente.CliNombreEmpresa,
      DocumentoCliente: cliente.CliDocumento,
      LocalidadCliente: cliente.CliLocalidad,
      DireccionCliente: cliente.CliDireccion,
      AgenciaCliente: cliente.CliAgencia,
      MailCliente: cliente.CliMail,
      TipoCliente: tipoCliente ? tipoCliente.TClDescripcion : null,
      LugarRetiroPreferencia: lugarRetiro ? lugarRetiro.LReNombreLugar : null,
      FechaAltaUsuario: cliente.CliFechaAlta,
    };

    console.log('Cliente servido desde la caché.');
    res.json({ cliente: response });
  } catch (err) {
    console.error('Error al obtener los datos del cliente:', err);
    res.status(500).json({ error: 'Error al obtener los datos del cliente' });
  }
};

const createCliente = async (req, res) => {
  var {
    CliCodigoCliente,
    CliNombreApellido,
    CliCelular,
    CliNombreEmpresa,
    CliDocumento,
    CliLocalidad,
    CliDireccion,
    CliAgencia,
    CliMail,
    TClIdTipoCliente,
  } = req.body;
    
  // Aseguramos que CliCodigoCliente y CliDocumento sea siempre una cadena
  CliCodigoCliente = CliCodigoCliente ? String(CliCodigoCliente) : '';
  CliDocumento = CliDocumento ? String(CliDocumento) : '';


  var userId;
  try {
    userId = req.user.id;
  } catch { 
    userId = 1;
  }

  if (!CliCodigoCliente) {
    return res.status(400).json({ error: 'Código de cliente es obligatorio' });
  }

  const pool = await poolPromise;

  try {
    // Obtener la caché de clientes
    let clientesCache = cache.get('clientes');
    if (!clientesCache) {
      console.log('Caché de clientes no inicializada. Cargando desde la base de datos...');
      const clientesResult = await pool.request().query('SELECT * FROM [User].dbo.Clientes WITH(NOLOCK)');
      clientesCache = clientesResult.recordset;
      cache.set('clientes', clientesCache); // Actualizar la caché
    }

    // Verificar si el cliente ya existe en la caché
    const clienteExistente = clientesCache.find(cliente => cliente.CliCodigoCliente === CliCodigoCliente);
    if (clienteExistente) {
      return res.status(400).json({
        error: `El cliente con el código ${CliCodigoCliente} ya existe.`,
      });
    }

    const fechaAlta = new Date();

    // Inserta el cliente en la base de datos
    const result = await pool.request()
      .input('CliCodigoCliente', sql.VarChar, CliCodigoCliente)
      .input('CliNombreApellido', sql.VarChar, CliNombreApellido)
      .input('CliCelular', sql.VarChar, CliCelular)
      .input('CliNombreEmpresa', sql.VarChar, CliNombreEmpresa)
      .input('CliDocumento', sql.VarChar, CliDocumento)
      .input('CliLocalidad', sql.VarChar, CliLocalidad)
      .input('CliDireccion', sql.VarChar, CliDireccion)
      .input('CliAgencia', sql.VarChar, CliAgencia)
      .input('CliMail', sql.VarChar, CliMail)
      .input('TClIdTipoCliente', sql.Int, TClIdTipoCliente)
      .input('CliFechaAlta', sql.DateTime, fechaAlta)
      .input('UsuarioAlta', sql.Int, userId)
      .query(`
        INSERT INTO [User].dbo.Clientes (
          CliCodigoCliente, CliNombreApellido, CliCelular, CliNombreEmpresa,
          CliDocumento, CliLocalidad, CliDireccion, CliAgencia,
          CliMail, TClIdTipoCliente, CliFechaAlta, CliUsuarioAlta
        ) OUTPUT INSERTED.*
        VALUES (
          @CliCodigoCliente, @CliNombreApellido, @CliCelular, @CliNombreEmpresa,
          @CliDocumento, @CliLocalidad, @CliDireccion, @CliAgencia,
          @CliMail, @TClIdTipoCliente, @CliFechaAlta, @UsuarioAlta
        )
      `);

    const nuevoCliente = result.recordset[0]; // Obtiene el cliente insertado

    // Agrega el nuevo cliente a la caché
    clientesCache.push(nuevoCliente);
    cache.set('clientes', clientesCache);

    console.log('Caché de clientes actualizada con el nuevo cliente:', nuevoCliente);

    res.status(201).json({ message: 'Cliente creado exitosamente', cliente: nuevoCliente });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};


const getAllClientes = async (req, res) => {
  try {
    // Obtener datos de la caché
    let clientes = cache.get('clientes');
    let tiposClientes = cache.get('tiposClientes');
    let lugaresRetiro = cache.get('lugaresRetiro');

    const pool = await poolPromise;

    // Si alguno de los datos necesarios no está en la caché, realizar consultas
    if (!clientes) {
      console.log('Clientes no encontrados en la caché. Consultando la base de datos...');
      const result = await pool.request()
        .query('SELECT * FROM [User].[dbo].Clientes WITH(NOLOCK)');
      clientes = result.recordset;
      cache.set('clientes', clientes);
    }

    if (!tiposClientes) {
      console.log('TiposClientes no encontrados en la caché. Consultando la base de datos...');
      const result = await pool.request()
        .query('SELECT * FROM [User].[dbo].TiposClientes WITH(NOLOCK)');
      tiposClientes = result.recordset;
      cache.set('tiposClientes', tiposClientes);
    }

    if (!lugaresRetiro) {
      console.log('LugaresRetiro no encontrados en la caché. Consultando la base de datos...');
      const result = await pool.request()
        .query('SELECT * FROM [User].[dbo].LugaresRetiro WITH(NOLOCK)');
      lugaresRetiro = result.recordset;
      cache.set('lugaresRetiro', lugaresRetiro);
    }

    // Combinar datos de las tablas relacionadas
    const enrichedClientes = clientes.map(cliente => {
      const tipoCliente = tiposClientes.find(tc => tc.TClIdTipoCliente === cliente.TClIdTipoCliente);
      const lugarRetiro = lugaresRetiro.find(lr => lr.LReIdLugarRetiro === cliente.LReIdLugarRetiro);

      return {
        IdCliente: cliente.CliIdCliente,
        CodigoCliente: cliente.CliCodigoCliente,
        NombreCliente: cliente.CliNombreApellido,
        Celular: cliente.CliCelular,
        EmpresaCliente: cliente.CliNombreEmpresa,
        DocumentoCliente: cliente.CliDocumento,
        LocalidadCliente: cliente.CliLocalidad,
        DireccionCliente: cliente.CliDireccion,
        AgenciaCliente: cliente.CliAgencia,
        MailCliente: cliente.CliMail,
        TipoCliente: tipoCliente ? tipoCliente.TClDescripcion : 'Desconocido',
        LugarRetiroPreferencia: lugarRetiro ? lugarRetiro.LReNombreLugar : 'No definido',
        FechaAltaUsuario: cliente.CliFechaAlta,
      };
    });

    console.log('Clientes servidos desde la caché.');

    // Devolver los datos combinados
    res.json({ recordset: enrichedClientes });
  } catch (err) {
    console.error('Error al obtener los datos del cliente:', err);
    res.status(500).json({ error: 'Error al obtener los datos del cliente' });
  }
};


// Controlador para actualizar los clientes
const updateCliente = async (req, res) => {
  const {
    id,
    codigoCliente,
    nombreApellido,
    celular,
    nombreEmpresa,
    documento,
    localidad,
    direccion,
    agencia,
    mail,
    tipoCliente,
  } = req.body;

  try {
    const pool = await poolPromise;

    // Actualizar los datos del cliente en la base de datos
    await pool.request()
      .input('id', sql.Int, id)
      .input('codigoCliente', sql.VarChar(50), codigoCliente)
      .input('nombreApellido', sql.VarChar(100), nombreApellido)
      .input('celular', sql.VarChar(15), celular)
      .input('nombreEmpresa', sql.VarChar(100), nombreEmpresa)
      .input('documento', sql.VarChar(20), documento)
      .input('localidad', sql.VarChar(100), localidad)
      .input('direccion', sql.VarChar(500), direccion)
      .input('agencia', sql.VarChar(100), agencia)
      .input('mail', sql.VarChar(200), mail)
      .input('tipoCliente', sql.VarChar(100), tipoCliente)
      .query(
        `UPDATE [User].[dbo].Clientes
         SET 
           CliCodigoCliente = @codigoCliente,
           CliNombreApellido = @nombreApellido,
           CliCelular = @celular,
           CliNombreEmpresa = @nombreEmpresa,
           CliDocumento = @documento,
           CliLocalidad = @localidad,
           CliDireccion = @direccion,
           CliAgencia = @agencia,
           CliMail = @mail,
           TClIdTipoCliente = (Select TClIdTipoCliente
                              from [User].dbo.TiposClientes WITH(NOLOCK)
                              where TClDescripcion = @tipoCliente)
         WHERE CliIdCliente = @id`
      );

    // Actualizar la caché
    let clientesCache = cache.get('clientes');
    let tipoClientesCache = cache.get('tiposClientes');

    if (clientesCache) {
      const clienteIndex = clientesCache.findIndex(cliente => cliente.CliIdCliente === id);
      if (clienteIndex !== -1) {
        // Actualizar el cliente en la caché
        clientesCache[clienteIndex] = {
          ...clientesCache[clienteIndex],
          CliCodigoCliente: codigoCliente,
          CliNombreApellido: nombreApellido,
          CliCelular: celular,
          CliNombreEmpresa: nombreEmpresa,
          CliDocumento: documento,
          CliLocalidad: localidad,
          CliDireccion: direccion,
          CliAgencia: agencia,
          CliMail: mail,
          TClIdTipoCliente: tipoClientesCache.find((tc) => tc.TClDescripcion === tipoCliente).TClIdTipoCliente,
        };
        cache.set('clientes', clientesCache);
        console.log(`Cliente con ID ${id} actualizado en la caché.`);
      }
    } else {
      console.log('Caché de clientes no inicializada. Consultando la base de datos...');
      const result = await pool.request()
        .query('SELECT * FROM [User].[dbo].Clientes WITH(NOLOCK)');
      clientesCache = result.recordset;
      cache.set('clientes', clientesCache);
    }

    res.status(200).send('Cliente actualizado correctamente');
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ error: 'Error al actualizar los datos del cliente' });
  }
};


// Controlador para obtener los tipos de clientes
const getTiposClientes = async (req, res) => {
  try {
    // Verificar si los datos están en la caché
    let tiposClientes = cache.get('tiposClientes');
    if (tiposClientes) {
      console.log('Tipos de clientes servidos desde la caché.');
    } else {
      console.log('Tipos de clientes no encontrados en la caché. Consultando la base de datos...');
      const pool = await poolPromise;
      const result = await pool.request()
        .query(
          `SELECT * 
           FROM [User].[dbo].TiposClientes WITH(NOLOCK)`
        );

      // Guardar en la caché
      tiposClientes = result.recordset;
      cache.set('tiposClientes', tiposClientes);
      console.log('Tipos de clientes consultados desde la base de datos y almacenados en la caché.');
    }

    // Filtrar los datos para devolver solo las columnas requeridas
    const filteredTiposClientes = tiposClientes.map(tipo => ({
      TClIdTipoCliente: tipo.TClIdTipoCliente,
      TClDescripcion: tipo.TClDescripcion,
    }));

    // Enviar la respuesta con los datos filtrados
    res.json({ recordset: filteredTiposClientes });
  } catch (err) {
    console.error('Error al obtener los tipos de cliente:', err);
    res.status(500).json({ error: 'Error al obtener los tipos de cliente' });
  }
};


// Bloquear cliente
const bloquearCliente = async (req, res) => {
  const { clientId } = req.body;
  const userId = req.user.id;

  try {
    const pool = await poolPromise;

    // Verificar y actualizar caché si es necesario
    let clientesCache = cache.get('clientes');
    if (!clientesCache) {
      console.log('Caché de clientes no inicializada. Actualizando...');
      const clientesResult = await pool.request().query('SELECT * FROM [User].dbo.Clientes WITH(NOLOCK)');
      clientesCache = clientesResult.recordset;
      cache.set('clientes', clientesCache);
    }

    let usuariosCache = cache.get('usuarios');
    if (!usuariosCache) {
      console.log('Caché de usuarios no inicializada. Actualizando...');
      const usuariosResult = await pool.request().query('SELECT * FROM [User].dbo.Usuarios WITH(NOLOCK)');
      usuariosCache = usuariosResult.recordset;
      cache.set('usuarios', usuariosCache);
    }

    // Intenta bloquear al cliente
    const result = await pool.request()
      .input('clientId', sql.VarChar(50), clientId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE [User].dbo.Clientes
        SET CliBloqueadoBy = @userId
        WHERE CliCodigoCliente = @clientId AND CliBloqueadoBy IS NULL
      `);

    if (result.rowsAffected[0] > 0) {
      // Actualizar la caché de clientes
      clientesCache = clientesCache.map(cliente =>
        cliente.CliCodigoCliente === clientId
          ? { ...cliente, CliBloqueadoBy: userId }
          : cliente
      );
      cache.set('clientes', clientesCache);
      console.log(`Caché de clientes actualizada para cliente ${clientId}.`);

      res.status(200).json({ success: true, message: 'Cliente bloqueado correctamente' });
    } else {
      // Revisar quién tiene bloqueado el cliente desde la caché
      const cliente = clientesCache.find(cliente => cliente.CliCodigoCliente === clientId);
    
      if (cliente?.CliBloqueadoBy) {
        const usuarioBloqueado = usuariosCache.find(usuario => usuario.UsuIdUsuario === cliente.CliBloqueadoBy);
        
        console.log(`Bloqueo de cliente servido por el caché.`);

        res.status(400).json({
          success: false,
          message: `El cliente ya está bloqueado por el usuario ${usuarioBloqueado?.UsuUserName || cliente.CliBloqueadoBy}`,
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'El cliente está bloqueado pues está siendo gestionado por otro usuario',
        });
      }
    }    
  } catch (error) {
    console.error('Error al bloquear cliente:', error);
    res.status(500).json({ success: false, error: 'Error al bloquear cliente' });
  }
};



// Desbloquear cliente
const desbloquearCliente = async (req, res) => {
  const { clientId } = req.body;
  const userId = req.user.id;

  try {
      const pool = await poolPromise;

      // Verificar y actualizar en la base de datos
      const result = await pool.request()
          .input('clientId', sql.VarChar(50), clientId)
          .input('userId', sql.Int, userId)
          .query(`
              UPDATE [User].dbo.Clientes
              SET CliBloqueadoBy = NULL
              WHERE CliCodigoCliente = @clientId AND CliBloqueadoBy = @userId
          `);

      if (result.rowsAffected[0] > 0) {
          // Actualizar la caché de clientes
          let clientesCache = cache.get('clientes');

          if (!clientesCache) {
              // Si no está cargada la caché, hacer un select para sincronizar
              console.log('Cargando caché de clientes...');
              const clientesResult = await pool.request().query('SELECT * FROM [User].dbo.Clientes WITH(NOLOCK)');
              clientesCache = clientesResult.recordset;
              cache.set('clientes', clientesCache);
          }

          // Actualizar la caché del cliente específico
          clientesCache = clientesCache.map(cliente =>
              cliente.CliCodigoCliente === clientId
                  ? { ...cliente, CliBloqueadoBy: null }
                  : cliente
          );
          cache.set('clientes', clientesCache);

          console.log(`Caché de clientes actualizada para desbloquear al cliente ${clientId}.`);

          return res.status(200).json({ success: true, message: 'Cliente desbloqueado correctamente' });
      } else {
          return res.status(400).json({ success: false, message: 'El cliente no estaba bloqueado por este usuario o no existe' });
      }
  } catch (error) {
      console.error('Error al desbloquear cliente:', error);
      return res.status(500).json({ success: false, error: 'Error al desbloquear cliente' });
  }
};

const desbloquearTodosClientes = async (req, res) => {
  const userId = req.user.id;

  try {
    const pool = await poolPromise;

    // Realizar la actualización en la base de datos
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE [User].dbo.Clientes
        SET CliBloqueadoBy = NULL
        WHERE CliBloqueadoBy = @userId
      `);

    if (result.rowsAffected[0] > 0) {
      // Actualizar la caché de clientes
      let clientesCache = cache.get('clientes');

      if (!clientesCache) {
        // Si la caché no está cargada, sincronizar con la base de datos
        console.log('Cargando caché de clientes...');
        const clientesResult = await pool.request().query('SELECT * FROM [User].dbo.Clientes WITH(NOLOCK)');
        clientesCache = clientesResult.recordset;
        cache.set('clientes', clientesCache);
      }

      // Actualizar todos los clientes bloqueados por este usuario en la caché
      clientesCache = clientesCache.map(cliente =>
        cliente.CliBloqueadoBy === userId
          ? { ...cliente, CliBloqueadoBy: null }
          : cliente
      );
      cache.set('clientes', clientesCache);

      console.log(`Caché de clientes actualizada: todos los clientes desbloqueados para el usuario ${userId}.`);
    } else {
      console.log(`No se encontraron clientes bloqueados por el usuario ${userId} en la base de datos.`);
    }

    res.status(200).json({ success: true, message: 'Todos los clientes desbloqueados correctamente' });
  } catch (error) {
    console.error('Error al desbloquear todos los clientes:', error);
    res.status(500).json({ success: false, error: 'Error al desbloquear clientes' });
  }
};




module.exports = { getCliente, createCliente, getAllClientes, updateCliente, getTiposClientes, bloquearCliente, desbloquearCliente, desbloquearTodosClientes};
