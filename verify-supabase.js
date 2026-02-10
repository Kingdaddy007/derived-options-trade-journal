const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local to get keys
const envPath = path.join(__dirname, '.env.local');
let soupUrl = '';
let soupKey = '';

try {
    const env = fs.readFileSync(envPath, 'utf8');
    const lines = env.split('\n');
    for (const line of lines) {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            soupUrl = line.split('=')[1].trim();
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            soupKey = line.split('=')[1].trim();
        }
    }
} catch (e) {
    console.error('Error reading .env.local:', e);
}

if (!soupUrl || !soupKey) {
    console.error('Could not find Supabase keys in .env.local');
    process.exit(1);
}

const supabase = createClient(soupUrl, soupKey);

async function testInsert() {
    console.log('Connecting to Supabase...');
    console.log('URL:', soupUrl);

    const testTrade = {
        title: "Test Trade from Script",
        trade_type: "R_F",
        market: "Test Market",
        direction: "Rise",
        stake: 10,
        payout: 19,
        profit: 9,
        outcome: "Win",
        confidence: 5
    };

    console.log('Attempting to insert test trade...');
    const { data, error } = await supabase
        .from('trades')
        .insert([testTrade])
        .select();

    if (error) {
        console.error('❌ INSERT FAILED:', error);
    } else {
        console.log('✅ INSERT SUCCEEDED!', data);
    }
}

testInsert();
