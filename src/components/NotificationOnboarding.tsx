"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexAuth } from "convex/react";
import {
    requestNotificationPermission,
    subscribeToPushNotifications,
    isNotificationSupported,
    getNotificationPermission,
} from "@/lib/notifications";

const ONBOARDING_SHOWN_KEY = "optin_notification_onboarding_shown";

export function NotificationOnboarding() {
    const { isAuthenticated } = useConvexAuth();
    const [showPrompt, setShowPrompt] = useState(false);
    const [isEnabling, setIsEnabling] = useState(false);
    const hasSub = useQuery(api.pushSubscriptions.hasPushSubscription);
    const saveSub = useMutation(api.pushSubscriptions.savePushSubscription);

    useEffect(() => {
        // Only show if:
        // 1. User is authenticated
        // 2. Notifications are supported
        // 3. User hasn't already enabled notifications
        // 4. User hasn't dismissed the prompt before
        // 5. Permission isn't already denied

        if (!isAuthenticated) return;
        if (!isNotificationSupported()) return;
        if (hasSub === undefined) return; // Still loading
        if (hasSub === true) return; // Already has subscription

        const permission = getNotificationPermission();
        if (permission === "denied") return;

        const alreadyShown = localStorage.getItem(ONBOARDING_SHOWN_KEY);
        if (alreadyShown === "true") return;

        // Small delay to not show immediately on page load
        const timer = setTimeout(() => {
            setShowPrompt(true);
        }, 1500);

        return () => clearTimeout(timer);
    }, [isAuthenticated, hasSub]);

    const handleEnable = async () => {
        setIsEnabling(true);
        try {
            const permission = await requestNotificationPermission();
            if (permission === "granted") {
                const subscription = await subscribeToPushNotifications();
                if (subscription) {
                    await saveSub({ subscription: JSON.stringify(subscription) });
                }
            }
            localStorage.setItem(ONBOARDING_SHOWN_KEY, "true");
            setShowPrompt(false);
        } catch (error) {
            console.error("Failed to enable notifications:", error);
        } finally {
            setIsEnabling(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem(ONBOARDING_SHOWN_KEY, "true");
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center">
            <div className="w-full max-w-sm animate-slide-up rounded-2xl bg-neutral-900 p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-900/50">
                        <Bell className="h-6 w-6 text-green-400" />
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <h2 className="mb-2 text-lg font-bold text-white">
                    Enable Notifications
                </h2>
                <p className="mb-6 text-sm text-neutral-400">
                    Get notified instantly when friends want to hang out. Don&apos;t miss a match!
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 rounded-xl border border-neutral-700 py-3 font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
                    >
                        Maybe Later
                    </button>
                    <button
                        onClick={handleEnable}
                        disabled={isEnabling}
                        className="flex-1 rounded-xl bg-white py-3 font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-50"
                    >
                        {isEnabling ? "Enabling..." : "Enable"}
                    </button>
                </div>
            </div>
        </div>
    );
}
