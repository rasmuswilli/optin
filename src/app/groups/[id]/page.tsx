"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, UserPlus, Trash2, Loader2, X, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";

export default function GroupDetailPage() {
    const params = useParams();
    const router = useRouter();
    const groupId = params.id as Id<"groups">;
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const group = useQuery(api.groups.getGroup, { groupId });
    const deleteGroup = useMutation(api.groups.deleteGroup);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this group?")) return;

        setIsDeleting(true);
        try {
            await deleteGroup({ groupId });
            router.push("/groups");
        } catch (error) {
            console.error("Failed to delete group:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (group === undefined) {
        return (
            <AppShell>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                </div>
            </AppShell>
        );
    }

    if (group === null) {
        return (
            <AppShell>
                <div className="space-y-4">
                    <Link
                        href="/groups"
                        className="inline-flex items-center gap-2 text-neutral-400 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Groups
                    </Link>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
                        <p className="text-neutral-400">Group not found or you don&apos;t have access.</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    const isOwner = group.currentUserRole === "owner";

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <Link
                        href="/groups"
                        className="inline-flex items-center gap-2 text-neutral-400 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Groups
                    </Link>
                </div>

                {/* Group Info */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800 text-3xl">
                            {group.iconEmoji || "🎮"}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{group.name}</h1>
                            {group.description && (
                                <p className="text-neutral-400">{group.description}</p>
                            )}
                        </div>
                    </div>
                    {isOwner && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-900/50 hover:text-red-400"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Trash2 className="h-5 w-5" />
                            )}
                        </button>
                    )}
                </div>

                {/* Active Opt-Ins */}
                {group.activeOptIns && group.activeOptIns.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-neutral-300">
                            Active Right Now
                        </h2>
                        <div className="rounded-xl border border-green-900/50 bg-green-950/30 p-4">
                            <p className="text-green-400">
                                {group.activeOptIns.length} member
                                {group.activeOptIns.length !== 1 ? "s" : ""} available!
                            </p>
                        </div>
                    </section>
                )}

                {/* Members */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-neutral-300">
                            Members ({group.members?.length || 0})
                        </h2>
                        <button
                            onClick={() => setShowAddMemberModal(true)}
                            className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                        >
                            <UserPlus className="h-4 w-4" />
                            Add
                        </button>
                    </div>
                    <div className="space-y-2">
                        {group.members?.map((member) => (
                            <div
                                key={member._id}
                                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-700 text-sm font-medium">
                                        {member.user?.name?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">
                                            {member.user?.name || "Unknown"}
                                        </p>
                                        <p className="text-sm text-neutral-400">
                                            {member.role === "owner" ? "Owner" : "Member"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Add Member Modal */}
                {showAddMemberModal && (
                    <AddMemberModal
                        groupId={groupId}
                        onClose={() => setShowAddMemberModal(false)}
                    />
                )}
            </div>
        </AppShell>
    );
}

function AddMemberModal({
    groupId,
    onClose,
}: {
    groupId: Id<"groups">;
    onClose: () => void;
}) {
    const friends = useQuery(api.friends.getMyFriends);
    const addFriendToGroup = useMutation(api.friends.addFriendToGroup);
    const [isAdding, setIsAdding] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async (friendId: Id<"users">) => {
        setIsAdding(friendId);
        setError(null);
        try {
            await addFriendToGroup({ friendId, groupId });
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to add friend");
        } finally {
            setIsAdding(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Add Member</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {error && (
                    <p className="mb-4 rounded-lg bg-red-900/50 p-3 text-sm text-red-300">
                        {error}
                    </p>
                )}

                {friends === undefined ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                    </div>
                ) : friends.length === 0 ? (
                    <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-center">
                        <Users className="mx-auto h-8 w-8 text-neutral-500" />
                        <p className="mt-2 text-sm text-neutral-400">
                            No friends yet.{" "}
                            <Link
                                href="/friends"
                                className="text-white underline"
                                onClick={onClose}
                            >
                                Add some friends first
                            </Link>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {friends.map(({ friendshipId, friend }) => (
                            <button
                                key={friendshipId}
                                onClick={() => handleAdd(friend!._id)}
                                disabled={isAdding !== null}
                                className="flex w-full items-center justify-between rounded-lg border border-neutral-700 bg-neutral-800 p-3 transition-colors hover:border-neutral-600 disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-sm font-medium">
                                        {friend?.name?.charAt(0) || "?"}
                                    </div>
                                    <span className="font-medium">{friend?.name || "Unknown"}</span>
                                </div>
                                {isAdding === friend?._id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <UserPlus className="h-5 w-5 text-neutral-400" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
