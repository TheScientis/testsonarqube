import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Reading seed data from JSON...");
  const dataPath = path.resolve(
    process.cwd(),
    "docs/temp/seed_search_results.json",
  );
  if (!fs.existsSync(dataPath)) {
    console.error("Seed data JSON not found at", dataPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, "utf8");
  const seedData = JSON.parse(rawData);

  // 1. Get or create a valid user via Supabase Admin Auth
  let user_id = null;
  const { data: usersData, error: listError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (usersData?.users && usersData.users.length > 0) {
    user_id = usersData.users[0].id;
    console.log(`Found existing user: ${user_id}`);
  } else {
    console.log("No user found. Creating a dummy user via Admin API...");
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: "volunteer@watchdog.local",
        password: "password123",
        email_confirm: true,
      });

    if (createError) {
      console.error("Failed to create dummy user:", createError.message);
    } else if (newUser.user) {
      user_id = newUser.user.id;
      console.log(`Created new dummy user: ${user_id}`);
      // Wait a little bit for any profile creation triggers to run
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const sentimentDataPath = path.resolve(
    process.cwd(),
    "docs/temp/seed_sentiment_results.json",
  );
  let sentimentData: any = {};
  if (fs.existsSync(sentimentDataPath)) {
    sentimentData = JSON.parse(fs.readFileSync(sentimentDataPath, "utf8"));
  }

  console.log("Inserting promises...");
  const promiseIdMap: Record<string, string> = {};

  for (const p of seedData.promises) {
    const promiseKey = `${p.title} (${p.politician_name})`;
    const sentiment = sentimentData[promiseKey];

    const score = sentiment?.score || 0;
    const count = sentiment?.count || 0;
    const commentCount = sentiment?.comments?.length || 0;
    const likeCount = Math.floor(Math.random() * 50) + 10;

    const { data: existingPromise } = await supabase
      .from("promises")
      .select("id")
      .eq("quote", p.quote)
      .single();

    let promiseId;
    if (existingPromise) {
      console.log(`Promise already exists: ${p.title}, updating scores...`);
      promiseId = existingPromise.id;
      await supabase
        .from("promises")
        .update({
          walk_o_meter_score: score,
          walk_o_meter_count: count,
          comment_count: commentCount,
          like_count: likeCount,
        })
        .eq("id", promiseId);
    } else {
      const { data: inserted, error } = await supabase
        .from("promises")
        .insert({
          region_id: p.region_id,
          quote: p.quote,
          source_url: p.source_url,
          source_domain: p.source_domain,
          source_status: "active",
          date: p.date,
          category: p.category,
          walk_o_meter_score: score,
          walk_o_meter_count: count,
          summary_what: p.summary_what,
          summary_when: p.summary_when,
          summary_budget: p.summary_budget,
          watchdog_commentary: p.watchdog_commentary,
          politician_name: p.politician_name,
          politician_role: p.politician_role,
          comment_count: commentCount,
          like_count: likeCount,
        })
        .select("id")
        .single();

      if (error) {
        console.error(`Failed to insert promise ${p.title}:`, error.message);
        continue;
      }
      promiseId = inserted.id;
      console.log(`Inserted promise: ${p.title}`);
    }
    promiseIdMap[p.title] = promiseId;

    // Insert comments
    if (sentiment?.comments && user_id) {
      for (const c of sentiment.comments) {
        const { data: existingComment } = await supabase
          .from("promise_comments")
          .select("id")
          .eq("promise_id", promiseId)
          .eq("text", c.text)
          .single();

        if (!existingComment) {
          await supabase.from("promise_comments").insert({
            promise_id: promiseId,
            user_id: user_id,
            user_name: c.user_name,
            text: c.text,
            like_count: Math.floor(Math.random() * 20),
            created_at: new Date(c.date).toISOString(),
          });
        }
      }
    }
  }

  console.log("Inserting walk_o_meter_reports...");
  for (const report of seedData.walk_o_meter_reports) {
    const promiseId = promiseIdMap[report.promise_title];
    if (!promiseId) {
      console.log(
        `Promise ID not found for report: ${report.promise_title}, skipping...`,
      );
      continue;
    }

    const { data: existingReport } = await supabase
      .from("walk_o_meter_reports")
      .select("id")
      .eq("promise_id", promiseId)
      .eq("latitude", report.latitude)
      .eq("longitude", report.longitude)
      .single();

    if (existingReport) {
      console.log(`Report already exists for promise: ${report.promise_title}`);
      continue;
    }

    // Find the promise to get region
    const { data: pData } = await supabase
      .from("promises")
      .select("region_id")
      .eq("id", promiseId)
      .single();
    const region_id = pData ? pData.region_id : null;

    const { error } = await supabase.from("walk_o_meter_reports").insert({
      report_type: "promise_verification",
      promise_id: promiseId,
      vote: "yes",
      latitude: report.latitude,
      longitude: report.longitude,
      photo_url: "https://via.placeholder.com/400",
      description: `Verifikasi fisik untuk: ${report.promise_title}. Pantauan langsung di lokasi menunjukkan progres/hasil sesuai laporan.`,
      user_id: user_id,
      user_name: "Watchdog Volunteer",
      region_id: region_id,
      location_label: report.location_label,
      trust_tier: "standard",
      tags: ["Verifikasi", "Infrastruktur"],
      status: "accepted",
    });

    if (error) {
      console.error(
        `Failed to insert report for ${report.promise_title}:`,
        error.message,
      );
    } else {
      console.log(`Inserted report for: ${report.promise_title}`);
    }
  }

  console.log("Seeding process finished!");
}

seed().catch(console.error);
