const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_RiPBZf9GYys2@ep-small-hill-apewxafl-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});
client.connect().then(async () => {
    const res = await client.query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = 'temas'
         ORDER BY ordinal_position`
    );
    console.log('Columnas de temas:');
    res.rows.forEach(r => console.log(' -', r.column_name, r.data_type, r.is_nullable));
    await client.end();
}).catch(e => console.error('Error:', e.message));
