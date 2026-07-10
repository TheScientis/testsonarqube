'use client';

import { usePush } from '@/hooks/usePush';
import { useState } from 'react';

export default function NotificationsToggle() {
    const { isSupported, isSubscribed, subscribe } = usePush();
    const [loading, setLoading] = useState(false);

    if (!isSupported) {
        return <div className="text-sm text-gray-500">Push Notifications are not supported on this device.</div>;
    }

    const handleSubscribe = async () => {
        setLoading(true);
        await subscribe();
        setLoading(false);
    };

    if (isSubscribed) {
        return <div className="text-sm text-green-600 font-medium">Push Notifications Enabled ✓</div>;
    }

    return (
        <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
        >
            {loading ? 'Enabling...' : 'Enable Push Notifications'}
        </button>
    );
}
