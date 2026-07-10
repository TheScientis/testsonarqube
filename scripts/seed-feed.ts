import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    // 1. Get an existing promise id (if any)
    const { data: promises } = await supabase.from('promises').select('id').limit(1);
    let promise_id = null;
    if (promises && promises.length > 0) {
        promise_id = promises[0].id;
    } else {
        // Create a dummy promise
        const { data: insPromise } = await supabase.from('promises').insert({
            politician_name: "Test Politician",
            quote: "I promise to build a new park",
            context: "Election Campaign",
            date: new Date().toISOString()
        }).select().single();
        if (insPromise) promise_id = insPromise.id;
    }

    if (!promise_id) {
        console.error("Failed to get/create promise_id");
        return;
    }

    // 2. Get a user
    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    let user_id = null;
    if (users && users.length > 0) {
        user_id = users[0].id;
    }

    // 3. Insert report type 1: Verification
    const { error: err1 } = await supabase.from('walk_o_meter_reports').insert({
        report_type: "promise_verification",
        promise_id: promise_id,
        vote: "yes",
        latitude: -6.200000,
        longitude: 106.816666,
        photo_url: "https://via.placeholder.com/400",
        description: "Test verification report that there is progress on the park.",
        user_id: user_id,
        user_name: "Test User 1",
        region_id: "dki-jakarta",
        location_label: "Jakarta",
        trust_tier: "standard",
        tags: ["Infrastruktur", "Lingkungan"]
    });

    if (err1) console.error("Error inserting verification:", err1);

    // 4. Insert report type 2: Complaint
    const { error: err2 } = await supabase.from('walk_o_meter_reports').insert({
        report_type: "bang_jaga_complaint",
        latitude: -6.210000,
        longitude: 106.820000,
        description: "Test complaint about illegal dumping near the new park.",
        user_id: user_id,
        user_name: "Test User 2",
        complaint_id: "test-session-id",
        region_id: "dki-jakarta",
        location_label: "Jakarta",
        trust_tier: "standard",
        tags: ["Lingkungan", "Keamanan"]
    });

    if (err2) console.error("Error inserting complaint:", err2);

    console.log("Seeding complete. Verification and Complaint reports added.");
}

seed();
