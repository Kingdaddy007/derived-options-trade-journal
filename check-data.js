const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Read .env.local
const envFile = fs.readFileSync(".env.local", "utf-8");
const env = {};
envFile.split("\n").forEach(line => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) env[key.trim()] = rest.join("=").trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("=== TRADES ===");
    const { data: trades, error: tErr } = await supabase.from("trades").select("id, title, created_at").order("created_at", { ascending: false });
    if (tErr) console.error("Trade error:", tErr);
    else { console.log(`Found ${trades.length} trades:`); trades.forEach(t => console.log(`  - ${t.title} (${t.created_at})`)); }

    console.log("\n=== STRATEGIES ===");
    const { data: strats, error: sErr } = await supabase.from("strategies").select("id, name, example_images, created_at").order("created_at", { ascending: false });
    if (sErr) console.error("Strategy error:", sErr);
    else { console.log(`Found ${strats.length} strategies:`); strats.forEach(s => console.log(`  - ${s.name} | images: ${(s.example_images || []).length} (${s.created_at})`)); }

    console.log("\n=== SETTINGS ===");
    const { data: settings, error: setErr } = await supabase.from("settings").select("*");
    if (setErr) console.error("Settings error:", setErr);
    else console.log("Settings:", settings);
}

check();
