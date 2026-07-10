'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function usePush() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
            setIsSupported(true);
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
            setSubscription(sub);
            setIsSubscribed(true);
        }
    };

    const subscribe = async () => {
        if (!isSupported) return false;

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission denied');
            }

            const registration = await navigator.serviceWorker.ready;

            const applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Must be logged in to subscribe to push');

            const subJson = sub.toJSON();

            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: subJson.keys
                })
            });

            if (!res.ok) throw new Error('Failed to save subscription');

            setSubscription(sub);
            setIsSubscribed(true);
            return true;
        } catch (error) {
            console.error('Push subscription failed:', error);
            return false;
        }
    };

    return { isSupported, isSubscribed, subscribe, subscription };
}
