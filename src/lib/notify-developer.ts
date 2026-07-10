import { sendText, isWahaConfigured } from './waha';

export function getNotifyDeveloperChatId(): string {
    return process.env.NOTIFY_DEVELOPER_CHAT_ID ?? '';
}

/**
 * Sends a text message to the configured developer WhatsApp chat via WAHA.
 * If WAHA or the chat ID is not configured, this function acts as a no-op and returns success.
 */
export async function notifyDeveloper(
    message: string
): Promise<{ success: boolean; error?: unknown }> {
    const chatId = getNotifyDeveloperChatId();

    if (!chatId || !isWahaConfigured()) {
        // No-op if not configured
        return { success: true };
    }

    const result = await sendText({
        chatId,
        text: message,
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return { success: true };
}
