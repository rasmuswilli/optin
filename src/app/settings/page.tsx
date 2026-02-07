"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Bell, LogOut, Info, Loader2, Check, X, BellOff } from "lucide-react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
    requestNotificationPermission,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    isNotificationSupported,
    getNotificationPermission,
} from "@/lib/notifications";
import { getCachedQueryData, storeCachedQueryData } from "@/lib/uiQueryCache";

const CACHE_KEY_SETTINGS_CURRENT_USER = "settings:current-user";

export default function SettingsPage() {
    const { isAuthenticated } = useConvexAuth();
    const { signOut } = useAuthActions();

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-neutral-400">Manage your preferences</p>
                </div>

                {/* Notifications */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-neutral-300">
                        Notifications
                    </h2>
                    {isAuthenticated ? (
                        <NotificationSettings />
                    ) : (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                            <p className="text-neutral-400">
                                Sign in to manage notifications
                            </p>
                        </div>
                    )}
                </section>

                {/* Account */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-neutral-300">Account</h2>
                    {isAuthenticated ? (
                        <ProfileSettings />
                    ) : (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                            <p className="text-neutral-400">Sign in to manage your profile</p>
                        </div>
                    )}

                    {isAuthenticated && (
                        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                            <button
                                onClick={() => void signOut()}
                                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-neutral-800/50"
                            >
                                <div className="rounded-lg bg-red-900/50 p-2">
                                    <LogOut className="h-5 w-5 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-red-400">Sign Out</p>
                                    <p className="text-sm text-neutral-400">
                                        Sign out of your account
                                    </p>
                                </div>
                            </button>
                        </div>
                    )}
                </section>

                {/* App Info */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-neutral-300">About</h2>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-neutral-800 p-2">
                                <Info className="h-5 w-5 text-neutral-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white">Optin</p>
                                <p className="text-sm text-neutral-400">
                                    Version 1.0.0 • Made with ❤️
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}

function ProfileSettings() {
    const userQuery = useQuery(api.users.getCurrentUser);
    const updateProfile = useMutation(api.users.updateProfile);
    const [name, setName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        storeCachedQueryData(CACHE_KEY_SETTINGS_CURRENT_USER, userQuery);
    }, [userQuery]);

    const user =
        userQuery ?? getCachedQueryData<typeof userQuery>(CACHE_KEY_SETTINGS_CURRENT_USER);

    // Initialize name from user data
    useEffect(() => {
        if (user?.name) {
            setName(user.name);
        }
    }, [user?.name]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await updateProfile({ name: name.trim() });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Failed to update profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (user === undefined) {
        return <ProfileSettingsSkeleton />;
    }

    if (user === null) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <p className="text-neutral-400">Profile data is unavailable right now.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
            {/* Profile Header */}
            <div className="flex items-center gap-4 border-b border-neutral-800 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-700 text-lg font-bold">
                    {name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                    <p className="font-medium text-white">{name || "Guest"}</p>
                    <p className="text-sm text-neutral-400">
                        {user?.email || "Anonymous user"}
                    </p>
                </div>
            </div>

            {/* Edit Name */}
            <div className="p-4">
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Display Name
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-white placeholder-neutral-500 focus:border-white focus:outline-none"
                    />
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !name.trim() || name === user?.name}
                        className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-medium text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saved ? (
                            <Check className="h-4 w-4 text-green-600" />
                        ) : (
                            "Save"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProfileSettingsSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
            <div className="flex animate-pulse items-center gap-4 border-b border-neutral-800 p-4">
                <div className="h-12 w-12 rounded-full bg-neutral-800" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-neutral-800" />
                    <div className="h-3 w-32 rounded bg-neutral-800" />
                </div>
            </div>
            <div className="animate-pulse space-y-3 p-4">
                <div className="h-3 w-24 rounded bg-neutral-800" />
                <div className="h-10 w-full rounded-lg bg-neutral-800" />
            </div>
        </div>
    );
}

function NotificationSettings() {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [testSent, setTestSent] = useState(false);

    const hasSub = useQuery(api.pushSubscriptions.hasPushSubscription);
    const saveSub = useMutation(api.pushSubscriptions.savePushSubscription);
    const removeSub = useMutation(api.pushSubscriptions.removePushSubscription);

    useEffect(() => {
        setIsSupported(isNotificationSupported());
        setPermission(getNotificationPermission());
    }, []);

    const handleEnableNotifications = async () => {
        setIsLoading(true);
        try {
            const perm = await requestNotificationPermission();
            setPermission(perm);

            if (perm === "granted") {
                const subscription = await subscribeToPushNotifications();
                if (subscription) {
                    await saveSub({ subscription: JSON.stringify(subscription) });
                }
            }
        } catch (error) {
            console.error("Failed to enable notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisableNotifications = async () => {
        setIsLoading(true);
        try {
            await unsubscribeFromPushNotifications();
            await removeSub({});
        } catch (error) {
            console.error("Failed to disable notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestNotification = async () => {
        if (permission === "granted") {
            new Notification("Optin Test", {
                body: "Notifications are working! 🎉",
                icon: "/icon-192.png",
            });
            setTestSent(true);
            setTimeout(() => setTestSent(false), 3000);
        }
    };

    if (!isSupported) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-neutral-800 p-2">
                        <BellOff className="h-5 w-5 text-neutral-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white">Not Supported</p>
                        <p className="text-sm text-neutral-400">
                            Push notifications aren&apos;t supported in this browser
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between border-b border-neutral-800 p-4">
                <div className="flex items-center gap-4">
                    <div
                        className={`rounded-lg p-2 ${hasSub ? "bg-green-900/50" : "bg-neutral-800"
                            }`}
                    >
                        <Bell
                            className={`h-5 w-5 ${hasSub ? "text-green-400" : "text-neutral-400"
                                }`}
                        />
                    </div>
                    <div>
                        <p className="font-medium text-white">Push Notifications</p>
                        <p className="text-sm text-neutral-400">
                            {hasSub
                                ? "You'll be notified when friends want to hang out"
                                : "Get notified when friends want to hang out"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={
                        hasSub ? handleDisableNotifications : handleEnableNotifications
                    }
                    disabled={isLoading}
                    className={`rounded-lg px-4 py-2 font-medium transition-colors ${hasSub
                        ? "bg-neutral-700 text-white hover:bg-neutral-600"
                        : "bg-white text-neutral-900 hover:bg-neutral-200"
                        } disabled:opacity-50`}
                >
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : hasSub ? (
                        "Disable"
                    ) : (
                        "Enable"
                    )}
                </button>
            </div>

            {/* Test Notification */}
            {hasSub && (
                <button
                    onClick={handleTestNotification}
                    className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-neutral-800/50"
                >
                    <div className="rounded-lg bg-neutral-800 p-2">
                        {testSent ? (
                            <Check className="h-5 w-5 text-green-400" />
                        ) : (
                            <Bell className="h-5 w-5 text-neutral-400" />
                        )}
                    </div>
                    <div>
                        <p className="font-medium text-white">
                            {testSent ? "Test Sent!" : "Test Notification"}
                        </p>
                        <p className="text-sm text-neutral-400">
                            {testSent
                                ? "Check your notifications"
                                : "Send a test notification to verify setup"}
                        </p>
                    </div>
                </button>
            )}

            {/* Permission Status */}
            {permission === "denied" && (
                <div className="border-t border-neutral-800 p-4">
                    <div className="flex items-center gap-2 text-red-400">
                        <X className="h-4 w-4" />
                        <p className="text-sm">
                            Notifications blocked. Please enable them in your browser
                            settings.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
