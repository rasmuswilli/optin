// Push notification utilities for PWA

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Convert VAPID key to Uint8Array for subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
        console.warn("This browser does not support notifications");
        return "denied";
    }

    const permission = await Notification.requestPermission();
    return permission;
}

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push notifications not supported");
        return null;
    }

    if (!VAPID_PUBLIC_KEY) {
        console.error("VAPID public key not configured");
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Create new subscription
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
        }

        return subscription;
    } catch (error) {
        console.error("Failed to subscribe to push notifications:", error);
        return null;
    }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
    if (!("serviceWorker" in navigator)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
            return true;
        }

        return false;
    } catch (error) {
        console.error("Failed to unsubscribe from push notifications:", error);
        return false;
    }
}

export function isNotificationSupported(): boolean {
    return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export function getNotificationPermission(): NotificationPermission | null {
    if (!("Notification" in window)) {
        return null;
    }
    return Notification.permission;
}
