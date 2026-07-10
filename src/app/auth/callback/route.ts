import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyDeveloper } from "@/lib/notify-developer";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const redirect = url.searchParams.get("redirect") || "/";

    if (code) {
        const supabase = await createClient();
        const { data } = await supabase.auth.exchangeCodeForSession(code);
        if (data?.user?.email) {
            void notifyDeveloper(`User signed in (OAuth): ${data.user.email}`);
        }
    }

    return NextResponse.redirect(new URL(redirect, url.origin));
}
