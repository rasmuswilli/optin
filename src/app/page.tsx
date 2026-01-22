"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Clock, Plus, X, Loader2, MessageCircle, Users, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { Id } from "../../convex/_generated/dataModel";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();
  const [showOptInModal, setShowOptInModal] = useState(false);

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-10rem)] flex-col md:min-h-0 md:block">
        {/* Main content */}
        <div className="flex-1 space-y-6">
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
        </div>

        {/* Bottom CTA - Fixed at bottom on mobile */}
        <div
          className="sticky bottom-16 -mx-4 mt-6 bg-neutral-950 px-4 pb-2 pt-2 md:relative md:bottom-0 md:mx-0 md:mt-8 md:bg-transparent md:p-0"
        >
          {isAuthenticated ? (
            <button
              onClick={() => setShowOptInModal(true)}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-5 text-lg font-semibold text-neutral-900 shadow-lg transition-colors hover:bg-neutral-200 md:py-4 md:shadow-none"
            >
              <Plus className="h-6 w-6" />
              Ready to Hang Out
            </button>
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 py-5 text-center">
              <p className="text-neutral-400">Sign in to start opting in</p>
            </div>
          )}
        </div>

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
        No active opt-ins. Press the button below to let friends know you&apos;re available!
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
          When you and your friends have overlapping opt-ins, matches will appear here.
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
            {match.users.slice(0, 5).map((user) => (
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

  // Multi-step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Group selection (multi-select)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<Id<"groups">>>(new Set());

  // Step 2: Time selection
  const [isCustomStart, setIsCustomStart] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("");
  const [duration, setDuration] = useState<number | "custom">(60);
  const [customEndTime, setCustomEndTime] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleGroup = (groupId: Id<"groups">) => {
    const newSet = new Set(selectedGroupIds);
    if (newSet.has(groupId)) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    setSelectedGroupIds(newSet);
  };

  const getStartTime = () => {
    if (isCustomStart && customStartTime) {
      return new Date(customStartTime).getTime();
    }
    return Date.now();
  };

  const getEndTime = () => {
    const start = getStartTime();
    if (duration === "custom" && customEndTime) {
      return new Date(customEndTime).getTime();
    }
    if (typeof duration === "number") {
      return start + duration * 60 * 1000;
    }
    return start + 60 * 60 * 1000;
  };

  const toDateTimeLocal = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleSubmit = async () => {
    if (selectedGroupIds.size === 0) return;

    const startsAt = getStartTime();
    const endsAt = getEndTime();

    if (endsAt <= startsAt) {
      alert("End time must be after start time");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create opt-ins for all selected groups
      for (const groupId of selectedGroupIds) {
        await createOptIn({ groupId, startsAt, endsAt });
      }
      onClose();
    } catch (error) {
      console.error("Failed to create opt-in:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 md:items-center"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-xl font-bold">
              {step === 1 ? "What are you up for?" : "When are you free?"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Group Multi-Selection */}
            {groups === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 text-center">
                <Users className="mx-auto h-10 w-10 text-neutral-500" />
                <p className="mt-3 text-neutral-400">
                  No groups yet.{" "}
                  <Link href="/groups" className="text-white underline" onClick={onClose}>
                    Create one first
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => {
                  const isSelected = selectedGroupIds.has(group._id);
                  return (
                    <button
                      key={group._id}
                      onClick={() => toggleGroup(group._id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 transition-colors ${isSelected
                        ? "border-green-500 bg-green-950/50"
                        : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
                        }`}
                    >
                      <span className="text-2xl">{group.iconEmoji || "🎮"}</span>
                      <span className="flex-1 text-left font-medium">{group.name}</span>
                      {isSelected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Next Button */}
            <button
              onClick={() => setStep(2)}
              disabled={selectedGroupIds.size === 0}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            {/* Start Time */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-neutral-300">
                Start Time
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsCustomStart(false)}
                  className={`rounded-xl py-4 text-sm font-medium transition-colors ${!isCustomStart
                    ? "bg-white text-neutral-900"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                >
                  Now
                </button>
                <button
                  onClick={() => {
                    setIsCustomStart(true);
                    if (!customStartTime) {
                      setCustomStartTime(toDateTimeLocal(new Date()));
                    }
                  }}
                  className={`rounded-xl py-4 text-sm font-medium transition-colors ${isCustomStart
                    ? "bg-white text-neutral-900"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                >
                  Later
                </button>
              </div>
              {isCustomStart && (
                <input
                  type="datetime-local"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white focus:border-white focus:outline-none"
                />
              )}
            </div>

            {/* Duration */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-neutral-300">
                For how long?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 30, label: "30 min" },
                  { value: 60, label: "1 hour" },
                  { value: 120, label: "2 hours" },
                  { value: 180, label: "3 hours" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={`rounded-xl py-4 text-sm font-medium transition-colors ${duration === opt.value
                      ? "bg-white text-neutral-900"
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setDuration("custom");
                  if (!customEndTime) {
                    const start = getStartTime();
                    setCustomEndTime(toDateTimeLocal(new Date(start + 60 * 60 * 1000)));
                  }
                }}
                className={`mt-3 w-full rounded-xl py-4 text-sm font-medium transition-colors ${duration === "custom"
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
              >
                Custom End Time
              </button>
              {duration === "custom" && (
                <input
                  type="datetime-local"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white focus:border-white focus:outline-none"
                />
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  I&apos;m Ready ({selectedGroupIds.size} group{selectedGroupIds.size !== 1 ? "s" : ""})
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
