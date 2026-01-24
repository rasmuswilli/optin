"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { UserPlus, X, Loader2, Check, Mail, Users } from "lucide-react";
import { useConvexAuth } from "convex/react";

export default function FriendsPage() {
    const { isAuthenticated } = useConvexAuth();
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Friends</h1>
                        <p className="text-neutral-400">Manage your connections</p>
                    </div>
                    {isAuthenticated && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-neutral-900 transition-colors hover:bg-neutral-200"
                        >
                            <UserPlus className="h-4 w-4" />
                            Add
                        </button>
                    )}
                </div>

                {isAuthenticated ? (
                    <>
                        {/* Pending Requests */}
                        <PendingRequests />

                        {/* Friends List */}
                        <FriendsList />
                    </>
                ) : (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="rounded-full bg-neutral-800 p-4">
                                <Users className="h-8 w-8 text-neutral-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">
                                    Sign in to see your friends
                                </h3>
                                <p className="mt-1 text-sm text-neutral-500">
                                    Click &quot;Not signed in&quot; in the sidebar to get started
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Friend Modal */}
                {showAddModal && (
                    <AddFriendModal onClose={() => setShowAddModal(false)} />
                )}
            </div>
        </AppShell>
    );
}

function PendingRequests() {
    const requests = useQuery(api.friends.getPendingRequests);
    const acceptRequest = useMutation(api.friends.acceptFriendRequest);
    const declineRequest = useMutation(api.friends.removeFriendship);

    if (requests === undefined) {
        return null;
    }

    if (requests.length === 0) {
        return null;
    }

    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-300">
                Pending Requests
            </h2>
            <div className="space-y-2">
                {requests.map((request) => (
                    <div
                        key={request._id}
                        className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-700 text-sm font-medium">
                                {request.fromUser?.name?.charAt(0) ||
                                    request.fromUser?.email?.charAt(0) ||
                                    "?"}
                            </div>
                            <div>
                                <p className="font-medium text-white">
                                    {request.fromUser?.name || "Unknown User"}
                                </p>
                                <p className="text-sm text-neutral-400">
                                    {request.fromUser?.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => acceptRequest({ friendshipId: request._id })}
                                className="rounded-lg bg-green-600 p-2 text-white transition-colors hover:bg-green-500"
                            >
                                <Check className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => declineRequest({ friendshipId: request._id })}
                                className="rounded-lg bg-neutral-700 p-2 text-white transition-colors hover:bg-neutral-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function FriendsList() {
    const friends = useQuery(api.friends.getMyFriends);
    const removeFriend = useMutation(api.friends.removeFriendship);

    if (friends === undefined) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
        );
    }

    if (friends.length === 0) {
        return (
            <section className="space-y-3">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="rounded-full bg-neutral-800 p-4">
                            <Users className="h-8 w-8 text-neutral-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">No friends yet</h3>
                            <p className="mt-1 text-sm text-neutral-500">
                                Add friends by their email address to start coordinating!
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-3">
            <div className="space-y-2">
                {friends.map(({ friendshipId, friend }) => (
                    <div
                        key={friendshipId}
                        className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-700 text-sm font-medium">
                                {friend?.name?.charAt(0) || friend?.email?.charAt(0) || "?"}
                            </div>
                            <div>
                                <p className="font-medium text-white">
                                    {friend?.name || "Unknown User"}
                                </p>
                                <p className="text-sm text-neutral-400">{friend?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => removeFriend({ friendshipId })}
                            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-red-400"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}

function AddFriendModal({ onClose }: { onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const sendRequest = useMutation(api.friends.sendFriendRequest);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await sendRequest({ friendEmail: email.trim() });
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || "Failed to send friend request");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Add Friend</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {success ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <div className="rounded-full bg-green-600 p-3">
                            <Check className="h-6 w-6 text-white" />
                        </div>
                        <p className="font-medium text-white">Friend request sent!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-neutral-300">
                                Friend&apos;s Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="friend@example.com"
                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-3 pl-10 pr-4 text-white placeholder-neutral-500 focus:border-white focus:outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="rounded-lg bg-red-900/50 p-3 text-sm text-red-300">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={!email.trim() || isSubmitting}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-5 w-5" />
                                    Send Request
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
