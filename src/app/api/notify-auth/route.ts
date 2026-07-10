import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyDeveloper } from "@/lib/notify-developer";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event, email } = body as { event?: string; email?: string };

        if (!email || typeof email !== "string" || !event) {
            return NextResponse.json({ error: "Missing event or email" }, { status: 400 });
        }

        if (event !== "sign_in" && event !== "sign_up") {
            return NextResponse.json({ error: "Invalid event" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.email !== email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const label = event === "sign_up" ? "signed up" : "signed in";
        await notifyDeveloper(`User ${label}: ${email}`);

        return new NextResponse(null, { status: 204 });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
