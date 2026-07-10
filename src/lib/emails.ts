import { Resend } from 'resend';

function getResendClient(): Resend {
    return new Resend(process.env.RESEND_API_KEY!);
}

function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://wiwokdetok.vercel.app";
}

export async function sendCriticalGapEmail(to: string, regions: string[], promiseTitle: string) {
    const resend = getResendClient();

    try {
        const { data, error } = await resend.emails.send({
            from: 'WIWOKDETOK <onboarding@resend.dev>',
            to: [to],
            subject: `Critical Gap Alert: ${promiseTitle}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Critical Action Gap Detected</h2>
                    <p>A promise in one of your regions of interest (<strong>${regions.join(", ")}</strong>) has fallen significantly behind its target.</p>
                    <div style="padding: 16px; background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 4px; margin: 16px 0;">
                        <strong>Promise:</strong> ${promiseTitle}
                    </div>
                    <p>Log in to WIWOKDETOK to view the full details and community updates.</p>
                    <p style="color: #64748B; font-size: 12px; margin-top: 32px;">
                        You received this email because you opted into Critical Action Gaps alerts in your Preference Center.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Resend API Error:", error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Failed to send email:", error);
        return { success: false, error };
    }
}

export async function sendPolicyUpdateEmail(to: string, regions: string[], policyTitle: string) {
    const resend = getResendClient();

    try {
        const { data, error } = await resend.emails.send({
            from: 'WIWOKDETOK <onboarding@resend.dev>',
            to: [to],
            subject: `New Policy Announcement: ${policyTitle}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>New Regional Policy Announcement</h2>
                    <p>A new environmental policy has just been announced affecting your regions of interest (<strong>${regions.join(", ")}</strong>).</p>
                    <div style="padding: 16px; background-color: #F0FDF4; border-left: 4px solid #22C55E; border-radius: 4px; margin: 16px 0;">
                        <strong>Policy Initiative:</strong> ${policyTitle}
                    </div>
                    <p>Log in to WIWOKDETOK to read the fine print and see how this impacts local promises.</p>
                    <p style="color: #64748B; font-size: 12px; margin-top: 32px;">
                        You received this email because you opted into New Policy Announcements in your Preference Center.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Resend API Error (Policy Update):", error);
            return { success: false, error };
        }
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send Policy Update email:", error);
        return { success: false, error };
    }
}

export interface WeeklyDigestStats {
    verifiedProgress: number;
    newPolicies: number;
    communityReports: number;
}

export async function sendWeeklyDigestEmail(to: string, regions: string[], stats: WeeklyDigestStats) {
    const resend = getResendClient();
    const appUrl = getAppUrl();

    try {
        const { data, error } = await resend.emails.send({
            from: 'WIWOKDETOK <onboarding@resend.dev>',
            to: [to],
            subject: `Your WIWOKDETOK Weekly Digest`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Your Weekly Environmental Digest</h2>
                    <p>Here's a quick summary of accountability updates for <strong>${regions.join(", ")}</strong> over the past week:</p>
                    <ul style="line-height: 1.6; margin-bottom: 24px;">
                        <li><strong>${stats.verifiedProgress}</strong> promises saw verified progress.</li>
                        <li><strong>${stats.newPolicies}</strong> new policies were enacted.</li>
                        <li><strong>${stats.communityReports}</strong> new community verification reports submitted.</li>
                    </ul>
                    <a href="${appUrl}/profile" style="display: inline-block; padding: 10px 20px; background-color: #0284C7; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Full Dashboard</a>
                    <p style="color: #64748B; font-size: 12px; margin-top: 32px;">
                        You received this email because you opted into the Weekly Digest in your Preference Center.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Resend API Error (Weekly Digest):", error);
            return { success: false, error };
        }
        return { success: true, data };
    } catch (error) {
        console.error("Failed to send Weekly Digest email:", error);
        return { success: false, error };
    }
}
