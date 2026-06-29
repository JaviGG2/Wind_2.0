require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

async function keepAlive() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('[keepalive] Error:', error.message);
        process.exit(1);
    }
    console.log(`[keepalive] OK — ${data.length} buckets encontrados`);
    process.exit(0);
}

keepAlive();
