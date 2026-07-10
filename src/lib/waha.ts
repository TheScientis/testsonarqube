/**
 * Reusable WAHA (WhatsApp HTTP API) client.
 */

export interface WahaConfig {
    baseUrl: string;
    apiKey: string;
}

export function getWahaConfig(): WahaConfig {
    return {
        baseUrl: process.env.WAHA_BASE_URL ?? '',
        apiKey: process.env.WAHA_API_KEY ?? '',
    };
}

export function isWahaConfigured(): boolean {
    const { baseUrl, apiKey } = getWahaConfig();
    return Boolean(baseUrl && apiKey);
}

export async function wahaPost<T>(
    path: string,
    body: Record<string, unknown>
): Promise<{ success: true; data: T } | { success: false; error: unknown }> {
    const { baseUrl, apiKey } = getWahaConfig();

    if (!isWahaConfigured()) {
        return { success: false, error: new Error('WAHA not configured') };
    }

    const url = `${baseUrl.replace(/\/$/, '')}${path}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: new Error(`WAHA API error (${response.status}): ${errorText}`),
            };
        }

        const data = (await response.json()) as T;
        return { success: true, data };
    } catch (error) {
        return { success: false, error };
    }
}

export interface SendTextParams {
    chatId: string;
    text: string;
    session?: string;
}

export async function sendText(
    params: SendTextParams
): Promise<{ success: true; data: unknown } | { success: false; error: unknown }> {
    const { chatId, text, session = 'default' } = params;
    return wahaPost('/api/sendText', { session, chatId, text });
}
