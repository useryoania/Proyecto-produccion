const { getPool } = require('./config/db.js');

async function main() {
    const pool = await getPool();
    const t = "SINCRO-ARTICULOS";
    const query = `
        SELECT 
            c.name AS ColumnName,
            ty.name AS DataType,
            c.max_length AS MaxLength,
            c.precision,
            c.scale,
            c.is_nullable,
            c.is_identity,
            (
                SELECT 1 
                FROM sys.indexes i 
                JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                WHERE i.is_primary_key = 1 AND ic.object_id = c.object_id AND ic.column_id = c.column_id
            ) AS IsPrimaryKey
        FROM sys.columns c
        JOIN sys.types ty ON c.user_type_id = ty.user_type_id
        WHERE c.object_id = OBJECT_ID('dbo.[${t}]')
        ORDER BY c.column_id;
    `;
    
    const r = await pool.request().query(query);
    if (r.recordset.length === 0) {
        console.log("Table not found or no columns:", t);
        process.exit(0);
    }
    
    let createStmt = `CREATE TABLE dbo.[${t}] (\n`;
    const colStmts = [];
    const pks = [];
    
    for (const col of r.recordset) {
        let typeStr = col.DataType;
        if (['varchar', 'nvarchar', 'char', 'nchar', 'varbinary'].includes(col.DataType)) {
            let len = col.MaxLength;
            if (col.DataType === 'nvarchar' || col.DataType === 'nchar') len = len / 2;
            typeStr += `(${len === -1 ? 'MAX' : len})`;
        } else if (['decimal', 'numeric'].includes(col.DataType)) {
            typeStr += `(${col.precision}, ${col.scale})`;
        }
        
        let line = `    [${col.ColumnName}] ${typeStr}`;
        if (col.is_identity) line += " IDENTITY(1,1)";
        line += col.is_nullable ? " NULL" : " NOT NULL";
        colStmts.push(line);
        
        if (col.IsPrimaryKey) pks.push(`[${col.ColumnName}]`);
    }
    
    createStmt += colStmts.join(',\n');
    
    if (pks.length > 0) {
        createStmt += `,\n    PRIMARY KEY (${pks.join(', ')})`;
    }
    createStmt += "\n);\nGO";
    
    console.log(createStmt);
    process.exit(0);
}

main().catch(console.error);
