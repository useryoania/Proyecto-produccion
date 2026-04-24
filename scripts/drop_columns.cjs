const { sql, getPool } = require('../backend/config/db');

async function dropCols() {
    console.log("Forcing drop of legacy columns...");
    const pool = await getPool();
    const tablesArt = ['PreciosBase', 'PerfilesItems', 'PreciosEspecialesItems'];
    
    for (const tb of tablesArt) {
        try {
            console.log('Checking constraints for ' + tb);
            // Drop PK / Unique / Defaults if any on CodArticulo
            const constRes = await pool.request().query(`
                SELECT d.name 
                FROM sys.default_constraints d 
                INNER JOIN sys.columns c ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id 
                INNER JOIN sys.tables t ON t.object_id = c.object_id 
                WHERE t.name = '${tb}' AND c.name = 'CodArticulo'
                
                UNION ALL
                
                SELECT i.name
                FROM sys.indexes i
                INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                INNER JOIN sys.tables t ON t.object_id = c.object_id
                WHERE t.name = '${tb}' AND c.name = 'CodArticulo'
            `);
            for (const r of constRes.recordset) {
                console.log('Dropping constraint/index ' + r.name + ' on ' + tb);
                try {
                    await pool.request().query('ALTER TABLE ' + tb + ' DROP CONSTRAINT ' + r.name);
                } catch(err) {
                    try {
                        await pool.request().query('DROP INDEX ' + r.name + ' ON ' + tb);
                    } catch(err2) {
                        console.log('Could not drop ' + r.name);
                    }
                }
            }
            console.log('Dropping COLUMN CodArticulo on ' + tb);
            await pool.request().query('ALTER TABLE ' + tb + ' DROP COLUMN CodArticulo');
            console.log('✅ Dropped CodArticulo on ' + tb);
        } catch(e) {
            console.error('Error dropping CodArticulo on ' + tb + ': ' + e.message);
        }
    }

    const tablesCli = ['PreciosEspeciales', 'PreciosEspecialesItems'];
    for (const tb of tablesCli) {
        try {
            console.log('Checking constraints for ClienteID on ' + tb);
            // Drop PK / Unique / Defaults if any on ClienteID
            const constRes = await pool.request().query(`
                SELECT d.name 
                FROM sys.default_constraints d 
                INNER JOIN sys.columns c ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id 
                INNER JOIN sys.tables t ON t.object_id = c.object_id 
                WHERE t.name = '${tb}' AND c.name = 'ClienteID'
            `);
            for (const r of constRes.recordset) {
                console.log('Dropping constraint ' + r.name + ' on ' + tb);
                try {
                    await pool.request().query('ALTER TABLE ' + tb + ' DROP CONSTRAINT ' + r.name);
                } catch(err) {
                    console.log('Could not drop ' + r.name);
                }
            }
            console.log('Dropping COLUMN ClienteID on ' + tb);
            await pool.request().query('ALTER TABLE ' + tb + ' DROP COLUMN ClienteID');
            console.log('✅ Dropped ClienteID on ' + tb);
        } catch(e) {
            console.error('Error dropping ClienteID on ' + tb + ': ' + e.message);
        }
    }
    
    process.exit(0);
}

dropCols();
