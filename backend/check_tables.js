const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Narsha0971-@db.ladqowqclutyhzlyfoqf.supabase.co:5432/postgres';

async function checkTables() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables in database:', res.rows.map(r => r.table_name));
    } catch (err) {
        console.error('Error connecting to database:', err);
    } finally {
        await client.end();
    }
}

checkTables();
