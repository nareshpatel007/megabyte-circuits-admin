/**
 * Utility for handling Browser Native Notifications across Admin & User sides.
 */

export interface BrowserNotificationPayload {
    title: string;
    message?: string;
    body?: string;
    action_url?: string | null;
    actionUrl?: string | null;
    icon?: string;
}

/**
 * Triggers a native browser notification.
 * Checks permission first:
 * 1. If permission is "granted" -> shows browser notification immediately.
 * 2. If permission is "default" (not yet requested) -> requests permission from user. If user grants, shows browser notification.
 * 3. If permission is "denied" -> logs warning and skips native browser notification.
 */
export async function showBrowserNotification(payload: BrowserNotificationPayload): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
        console.warn("Browser Notifications API is not supported in this browser.");
        return false;
    }

    const title = payload.title || "New Notification";
    const body = payload.message || payload.body || "";
    const actionUrl = payload.action_url || payload.actionUrl || null;
    const icon = payload.icon || "/favicon.ico";

    try {
        let permission = Notification.permission;

        // If permission hasn't been requested yet, ask user
        if (permission === "default") {
            permission = await Notification.requestPermission();
        }

        // If permission is granted, display the browser notification
        if (permission === "granted") {
            const notif = new Notification(title, {
                body,
                icon,
                badge: icon,
                tag: `${title}-${Date.now()}`,
            });

            if (actionUrl) {
                notif.onclick = (e) => {
                    e.preventDefault();
                    window.focus();
                    window.location.href = actionUrl;
                    notif.close();
                };
            }
            return true;
        } else {
            console.log(`Browser notification permission status is '${permission}'. Native notification suppressed.`);
            return false;
        }
    } catch (error) {
        console.error("Error triggering browser notification:", error);
        return false;
    }
}

/**
 * Explicitly requests browser notification permission.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
    }
    if (Notification.permission === "granted") {
        return "granted";
    }
    try {
        return await Notification.requestPermission();
    } catch (e) {
        console.error("Error requesting notification permission:", e);
        return Notification.permission;
    }
}
