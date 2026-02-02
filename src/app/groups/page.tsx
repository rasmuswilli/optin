"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Plus, Users, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useConvexAuth } from "convex/react";

// Common emoji options for groups
const EMOJI_OPTIONS = ["🎮", "⚽", "🎬", "☕", "🍺", "🎵", "📚", "🏃", "🎨", "🍕", "🎲", "🏀"];

export default function GroupsPage() {
    const { isAuthenticated } = useConvexAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);

    return (
        <AppShell>
            <div className="flex min-h-[calc(100vh-10rem)] flex-col md:min-h-0 md:block">
                {/* Main content */}
                <div className="flex-1 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Groups</h1>
                            <p className="text-neutral-400">Your shared interest groups</p>
                        </div>
                    </div>

                    {/* Groups List */}
                    {isAuthenticated ? (
                        <GroupsList />
                    ) : (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="rounded-full bg-neutral-800 p-4">
                                    <Users className="h-8 w-8 text-neutral-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">Sign in to see your groups</h3>
                                    <p className="mt-1 text-sm text-neutral-500">
                                        Click &quot;Not signed in&quot; in the sidebar to get started
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom CTA - Fixed at bottom on mobile */}
                {isAuthenticated && (
                    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 mt-6 bg-neutral-950 px-4 pb-6 pt-2 md:relative md:bottom-0 md:mx-0 md:mt-8 md:bg-transparent md:p-0">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-5 text-lg font-semibold text-neutral-900 shadow-lg transition-colors hover:bg-neutral-200 md:py-4 md:shadow-none"
                        >
                            <Plus className="h-6 w-6" />
                            New
                        </button>
                    </div>
                )}

                {/* Create Group Modal */}
                {showCreateModal && (
                    <CreateGroupModal onClose={() => setShowCreateModal(false)} />
                )}
            </div>
        </AppShell>
    );
}

function GroupsList() {
    const groups = useQuery(api.groups.getMyGroups);

    if (groups === undefined) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="rounded-full bg-neutral-800 p-4">
                        <Users className="h-8 w-8 text-neutral-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">No groups yet</h3>
                        <p className="mt-1 text-sm text-neutral-500">
                            Create a group for activities you enjoy with friends, like
                            &quot;Play Valorant&quot; or &quot;Coffee Run&quot;
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((group) => (
                <Link
                    key={group._id}
                    href={`/groups/${group._id}`}
                    className="flex items-start gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:bg-neutral-800/50"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-2xl">
                        {group.iconEmoji || "🎮"}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-white">{group.name}</h3>
                        <p className="text-sm text-neutral-400">
                            {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                            {group.activeOptInsCount > 0 && (
                                <span className="ml-2 text-green-400">
                                    • {group.activeOptInsCount} active
                                </span>
                            )}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    );
}

function CreateGroupModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedEmoji, setSelectedEmoji] = useState("🎮");
    const [isCreating, setIsCreating] = useState(false);

    const createGroup = useMutation(api.groups.createGroup);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            await createGroup({
                name: name.trim(),
                description: description.trim() || undefined,
                iconEmoji: selectedEmoji,
            });
            onClose();
        } catch (error) {
            console.error("Failed to create group:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Create Group</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Emoji Picker */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-neutral-300">
                            Icon
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setSelectedEmoji(emoji)}
                                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors ${selectedEmoji === emoji
                                            ? "bg-white text-neutral-900"
                                            : "bg-neutral-800 hover:bg-neutral-700"
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-neutral-300">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Play Valorant"
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-white focus:outline-none"
                            required
                        />
                    </div>

                    {/* Description Input */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-neutral-300">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this group for?"
                            rows={2}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-white focus:outline-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!name.trim() || isCreating}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-50"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus className="h-5 w-5" />
                                Create Group
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
