import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        'mailto:hello@wiwokdetok.com',
        vapidPublicKey,
        vapidPrivateKey
    );
}

export async function sendWebPushByUserId(userId: string, payload: { title: string, body: string, url?: string }) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('VAPID keys not configured. Web Push is disabled.');
        return [];
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: subs, error } = await adminSupabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId);

    if (error || !subs || subs.length === 0) {
        return [];
    }

    const results = await Promise.allSettled(subs.map(async (s) => {
        const pushSubscription = {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth }
        };
        try {
            await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        } catch (err: any) {
            if (err.statusCode === 404 || err.statusCode === 410) {
                // Subscription has expired or is no longer valid, delete it
                await adminSupabase.from('push_subscriptions').delete().match({ endpoint: s.endpoint });
            } else {
                console.error('Push Sending Error:', err);
                throw err;
            }
        }
    }));
    return results;
}
