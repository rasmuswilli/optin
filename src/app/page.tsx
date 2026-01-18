"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Clock, Plus, X, Loader2, MessageCircle, Users } from "lucide-react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { Id } from "../../convex/_generated/dataModel";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();
  const [showOptInModal, setShowOptInModal] = useState(false);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-neutral-400">Ready to hang out?</p>
          </div>
        </div>

        {/* Quick Opt-In CTA */}
        {isAuthenticated ? (
          <button
            onClick={() => setShowOptInModal(true)}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-6 text-lg font-semibold text-neutral-900 transition-colors hover:bg-neutral-200"
          >
            <Plus className="h-6 w-6" />
            Opt In Now
          </button>
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 py-6 text-center">
            <p className="text-neutral-400">Sign in to start opting in</p>
          </div>
        )}

        {/* Current Opt-Ins */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-300">
            Your Active Opt-Ins
          </h2>
          {isAuthenticated ? <ActiveOptIns /> : <EmptyOptIns />}
        </section>

        {/* Matches */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-300">
            Current Matches
          </h2>
          {isAuthenticated ? <CurrentMatches /> : <EmptyMatches />}
        </section>

        {/* Opt-In Modal */}
        {showOptInModal && (
          <OptInModal onClose={() => setShowOptInModal(false)} />
        )}
      </div>
    </AppShell>
  );
}

function EmptyOptIns() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <p className="text-center text-neutral-500">
        No active opt-ins. Press the button above to let friends know you&apos;re
        available!
      </p>
    </div>
  );
}

function EmptyMatches() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Clock className="h-8 w-8 text-neutral-600" />
        <p className="text-neutral-500">
          When you and your friends have overlapping opt-ins, matches will appear
          here.
        </p>
      </div>
    </div>
  );
}

function ActiveOptIns() {
  const optIns = useQuery(api.optIns.getMyActiveOptIns);
  const cancelOptIn = useMutation(api.optIns.cancelOptIn);

  if (optIns === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (optIns.length === 0) {
    return <EmptyOptIns />;
  }

  return (
    <div className="space-y-3">
      {optIns.map((optIn) => (
        <div
          key={optIn._id}
          className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-xl">
              {optIn.group?.iconEmoji || "🎮"}
            </div>
            <div>
              <p className="font-medium text-white">
                {optIn.group?.name || "Unknown Group"}
              </p>
              <p className="text-sm text-neutral-400">
                Until {formatTime(optIn.endsAt)}
              </p>
            </div>
          </div>
          <button
            onClick={() => cancelOptIn({ optInId: optIn._id })}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-red-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function CurrentMatches() {
  const matches = useQuery(api.optIns.getMyMatches);

  if (matches === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (matches.length === 0) {
    return <EmptyMatches />;
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <div
          key={match._id}
          className="rounded-xl border border-green-900/50 bg-green-950/30 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-900/50 text-xl">
                {match.group?.iconEmoji || "🎮"}
              </div>
              <div>
                <p className="font-medium text-white">
                  {match.group?.name || "Unknown Group"}
                </p>
                <p className="text-sm text-green-400">
                  {match.users.length} people ready!
                </p>
              </div>
            </div>
            <Link
              href={`/chat/${match._id}`}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-500"
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </Link>
          </div>
          <div className="mt-3 flex -space-x-2">
            {match.users.slice(0, 5).map((user, i) => (
              <div
                key={user._id}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-green-950 bg-neutral-700 text-xs font-medium"
                title={user.name || "User"}
              >
                {user.name?.charAt(0) || "?"}
              </div>
            ))}
            {match.users.length > 5 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-green-950 bg-neutral-800 text-xs font-medium">
                +{match.users.length - 5}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OptInModal({ onClose }: { onClose: () => void }) {
  const groups = useQuery(api.groups.getMyGroups);
  const createOptIn = useMutation(api.optIns.createOptIn);
  const [selectedGroupId, setSelectedGroupId] = useState<Id<"groups"> | null>(null);
  const [duration, setDuration] = useState<number>(60); // minutes
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedGroupId) return;

    setIsSubmitting(true);
    try {
      const now = Date.now();
      await createOptIn({
        groupId: selectedGroupId,
        startsAt: now,
        endsAt: now + duration * 60 * 1000,
      });
      onClose();
    } catch (error) {
      console.error("Failed to create opt-in:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Opt In</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Group Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            Select a group
          </label>
          {groups === undefined ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-center">
              <Users className="mx-auto h-8 w-8 text-neutral-500" />
              <p className="mt-2 text-sm text-neutral-400">
                No groups yet.{" "}
                <Link href="/groups" className="text-white underline" onClick={onClose}>
                  Create one first
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <button
                  key={group._id}
                  onClick={() => setSelectedGroupId(group._id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-colors ${selectedGroupId === group._id
                    ? "border-white bg-neutral-800"
                    : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
                    }`}
                >
                  <span className="text-xl">{group.iconEmoji || "🎮"}</span>
                  <span className="font-medium">{group.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Duration Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            How long are you available?
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[30, 60, 120, 180].map((mins) => (
              <button
                key={mins}
                onClick={() => setDuration(mins)}
                className={`rounded-lg py-3 text-sm font-medium transition-colors ${duration === mins
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
              >
                {mins < 60 ? `${mins}m` : `${mins / 60}h`}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedGroupId || isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Opting in...
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Opt In
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
