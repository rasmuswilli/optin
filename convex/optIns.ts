/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const MIN_OVERLAP_MINUTES = 15;
const MS_PER_MINUTE = 60 * 1000;

type DbContext = {
    db: any;
    scheduler: any;
};

type CandidateMatch = {
    matchKey: string;
    userIds: any[];
    optInIds: any[];
    overlapStart: number;
    overlapEnd: number;
    overlapMinutes: number;
};

// Create an opt-in (declare availability)
export const createOptIn = mutation({
    args: {
        groupId: v.id("groups"),
        startsAt: v.number(),
        endsAt: v.number(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        if (args.endsAt <= args.startsAt) {
            throw new Error("End time must be after start time");
        }

        // Verify user is a member of the group
        const membership = await ctx.db
            .query("groupMembers")
            .withIndex("by_group_and_user", (q) =>
                q.eq("groupId", args.groupId).eq("userId", userId)
            )
            .first();

        if (!membership) {
            throw new Error("You must be a member of this group to opt in");
        }

        // Check for existing active opt-in in this group
        const existingOptIn = await ctx.db
            .query("optIns")
            .withIndex("by_user_and_status", (q) =>
                q.eq("userId", userId).eq("status", "active")
            )
            .filter((q) => q.eq(q.field("groupId"), args.groupId))
            .first();

        if (existingOptIn) {
            // Update existing opt-in and recompute matches for the group.
            await ctx.db.patch(existingOptIn._id, {
                startsAt: args.startsAt,
                endsAt: args.endsAt,
            });
            await recomputeGroupMatches(ctx, args.groupId, userId);
            return existingOptIn._id;
        }

        // Create new opt-in
        const optInId = await ctx.db.insert("optIns", {
            userId,
            groupId: args.groupId,
            startsAt: args.startsAt,
            endsAt: args.endsAt,
            createdAt: Date.now(),
            status: "active",
        });

        // Recompute matches for this group.
        await recomputeGroupMatches(ctx, args.groupId, userId);

        return optInId;
    },
});

function getMatchState(overlapStart: number, overlapEnd: number, now: number): "upcoming" | "live" {
    if (overlapStart > now) return "upcoming";
    if (overlapEnd > now) return "live";
    return "live";
}

function buildCandidates(activeOptIns: any[], groupId: string): CandidateMatch[] {
    if (activeOptIns.length < 2) return [];

    const userToOptIn = new Map<string, any>();
    for (const optIn of activeOptIns) {
        userToOptIn.set(String(optIn.userId), optIn);
    }

    const boundaries = Array.from(
        new Set(activeOptIns.flatMap((optIn) => [optIn.startsAt, optIn.endsAt]))
    ).sort((a, b) => a - b);

    if (boundaries.length < 2) return [];

    const rawSegments: Array<{ start: number; end: number; userIds: any[]; optInIds: any[] }> = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
        const start = boundaries[i];
        const end = boundaries[i + 1];

        if (end <= start) continue;

        const overlapping = activeOptIns.filter(
            (optIn) => optIn.startsAt <= start && optIn.endsAt >= end
        );

        if (overlapping.length < 2) continue;

        const userIds = Array.from(new Set(overlapping.map((o) => o.userId))).sort();
        if (userIds.length < 2) continue;

        const optInIds = userIds
            .map((userId) => userToOptIn.get(String(userId))?._id)
            .filter(Boolean)
            .map((id) => id);

        rawSegments.push({ start, end, userIds, optInIds });
    }

    // Merge adjacent segments with identical participant set.
    const merged: Array<{ start: number; end: number; userIds: any[]; optInIds: any[] }> = [];
    for (const segment of rawSegments) {
        const last = merged[merged.length - 1];
        if (
            last &&
            last.end === segment.start &&
            JSON.stringify(last.userIds) === JSON.stringify(segment.userIds)
        ) {
            last.end = segment.end;
        } else {
            merged.push({ ...segment });
        }
    }

    return merged
        .map((segment) => {
            const overlapMinutes = Math.floor((segment.end - segment.start) / MS_PER_MINUTE);
            const matchKey = `${groupId}:${segment.userIds.join(",")}:${segment.start}:${segment.end}`;
            return {
                matchKey,
                userIds: segment.userIds,
                optInIds: segment.optInIds,
                overlapStart: segment.start,
                overlapEnd: segment.end,
                overlapMinutes,
            };
        })
        .filter((candidate) => candidate.overlapMinutes >= MIN_OVERLAP_MINUTES);
}

async function scheduleNotificationsForNewMatch(
    ctx: DbContext,
    matchId: any,
    overlapStart: number,
    triggeredByUserId?: any
) {
    if (triggeredByUserId) {
        await ctx.scheduler.runAfter(0, internal.sendNotification.sendMatchNotification, {
            matchId,
            triggeredByUserId,
        });
    }

    const now = Date.now();
    const reminderMinutes = [60, 10];

    for (const minutesBefore of reminderMinutes) {
        const delay = overlapStart - now - minutesBefore * MS_PER_MINUTE;
        if (delay > 0) {
            await ctx.scheduler.runAfter(delay, internal.sendNotification.sendMatchReminder, {
                matchId,
                minutesBefore,
            });
        }
    }
}

async function recomputeGroupMatches(
    ctx: DbContext,
    groupId: any,
    triggeredByUserId?: any
) {
    const now = Date.now();

    // Use active, non-expired opt-ins as the source of truth.
    const activeOptIns = await ctx.db
        .query("optIns")
        .withIndex("by_group_and_status", (q: any) =>
            q.eq("groupId", groupId).eq("status", "active")
        )
        .collect();

    const validOptIns = activeOptIns.filter((optIn: any) => optIn.endsAt > now);
    const candidates = buildCandidates(validOptIns, String(groupId));

    const existingMatches = await ctx.db
        .query("matches")
        .withIndex("by_group", (q: any) => q.eq("groupId", groupId))
        .collect();

    const existingByKey = new Map<string, any>(
        existingMatches.map((match: any) => [match.matchKey, match])
    );
    const candidateKeys = new Set(candidates.map((candidate) => candidate.matchKey));

    // Delete stale matches no longer valid after recomputation.
    for (const match of existingMatches) {
        if (!candidateKeys.has(match.matchKey)) {
            await ctx.db.delete(match._id);
        }
    }

    // Create or update valid matches.
    for (const candidate of candidates) {
        const state = getMatchState(candidate.overlapStart, candidate.overlapEnd, now);
        const existing = existingByKey.get(candidate.matchKey);

        if (existing) {
            await ctx.db.patch(existing._id, {
                userIds: candidate.userIds,
                optInIds: candidate.optInIds,
                overlapStart: candidate.overlapStart,
                overlapEnd: candidate.overlapEnd,
                overlapMinutes: candidate.overlapMinutes,
                state,
                startsInMinutes: Math.max(
                    0,
                    Math.ceil((candidate.overlapStart - Date.now()) / MS_PER_MINUTE)
                ),
            });
            continue;
        }

        const matchId = await ctx.db.insert("matches", {
            groupId,
            userIds: candidate.userIds,
            optInIds: candidate.optInIds,
            createdAt: now,
            matchKey: candidate.matchKey,
            overlapStart: candidate.overlapStart,
            overlapEnd: candidate.overlapEnd,
            overlapMinutes: candidate.overlapMinutes,
            state,
            startsInMinutes: Math.max(
                0,
                Math.ceil((candidate.overlapStart - Date.now()) / MS_PER_MINUTE)
            ),
        });

        await scheduleNotificationsForNewMatch(
            ctx,
            matchId,
            candidate.overlapStart,
            triggeredByUserId
        );
    }
}

// Cancel an opt-in
export const cancelOptIn = mutation({
    args: { optInId: v.id("optIns") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const optIn = await ctx.db.get(args.optInId);
        if (!optIn || optIn.userId !== userId) {
            throw new Error("Not authorized to cancel this opt-in");
        }

        // Mark opt-in as expired and recompute match graph for the group.
        await ctx.db.patch(args.optInId, { status: "expired" });
        await recomputeGroupMatches(ctx, optIn.groupId, userId);
    },
});

// Get my active opt-ins
export const getMyActiveOptIns = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return [];
        }

        const now = Date.now();

        // Get active opt-ins that haven't expired
        const optIns = await ctx.db
            .query("optIns")
            .withIndex("by_user_and_status", (q) =>
                q.eq("userId", userId).eq("status", "active")
            )
            .collect();

        // Filter out expired ones and get group details
        const activeOptIns = await Promise.all(
            optIns
                .filter((optIn) => optIn.endsAt > now)
                .map(async (optIn) => {
                    const group = await ctx.db.get(optIn.groupId);
                    return {
                        ...optIn,
                        group: group
                            ? { _id: group._id, name: group.name, iconEmoji: group.iconEmoji }
                            : null,
                    };
                })
        );

        return activeOptIns;
    },
});

// Clean up expired opt-ins (should be called by a scheduled job)
export const cleanupExpiredOptIns = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const expiredOptIns = await ctx.db
            .query("optIns")
            .withIndex("by_user_and_status")
            .filter((q) =>
                q.and(q.eq(q.field("status"), "active"), q.lt(q.field("endsAt"), now))
            )
            .collect();

        const touchedGroups = new Set<string>();

        for (const optIn of expiredOptIns) {
            await ctx.db.patch(optIn._id, { status: "expired" });
            touchedGroups.add(String(optIn.groupId));
        }

        // Keep match state fresh for groups with active opt-ins, even when no one just changed.
        const activeOptIns = await ctx.db
            .query("optIns")
            .withIndex("by_user_and_status")
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();
        for (const optIn of activeOptIns) {
            touchedGroups.add(String(optIn.groupId));
        }

        for (const groupId of touchedGroups) {
            await recomputeGroupMatches(ctx, groupId);
        }

        // Safety net: remove matches that are already fully in the past.
        const allMatches = await ctx.db.query("matches").collect();
        let matchesDeleted = 0;

        for (const match of allMatches) {
            if (match.overlapEnd <= now) {
                await ctx.db.delete(match._id);
                matchesDeleted++;
                continue;
            }

            const state = getMatchState(match.overlapStart, match.overlapEnd, now);
            await ctx.db.patch(match._id, {
                state,
                startsInMinutes: Math.max(0, Math.ceil((match.overlapStart - now) / MS_PER_MINUTE)),
            });
        }

        return { cleanedOptIns: expiredOptIns.length, matchesDeleted };
    },
});

// Get my current matches
export const getMyMatches = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return [];
        }

        const now = Date.now();

        // Get all matches
        const allMatches = await ctx.db.query("matches").collect();

        // Filter to matches that include this user and are still relevant.
        const myMatches = allMatches.filter(
            (match) => match.userIds.includes(userId) && match.overlapEnd > now
        );

        // Get details for each match
        const matchDetails = await Promise.all(
            myMatches.map(async (match) => {
                const group = await ctx.db.get(match.groupId);
                const users = await Promise.all(match.userIds.map((id) => ctx.db.get(id)));

                const state = getMatchState(match.overlapStart, match.overlapEnd, now);

                return {
                    ...match,
                    state,
                    startsInMinutes: Math.max(0, Math.ceil((match.overlapStart - now) / MS_PER_MINUTE)),
                    group: group
                        ? { _id: group._id, name: group.name, iconEmoji: group.iconEmoji }
                        : null,
                    users: users
                        .filter((u) => u !== null)
                        .map((u) => ({ _id: u!._id, name: u!.name, image: u!.image })),
                };
            })
        );

        return matchDetails.sort((a, b) => a.overlapStart - b.overlapStart);
    },
});

// Get a specific match by ID (used by notification actions)
export const getMatchById = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) return null;

        const group = await ctx.db.get(match.groupId);
        const now = Date.now();

        return {
            ...match,
            state: getMatchState(match.overlapStart, match.overlapEnd, now),
            startsInMinutes: Math.max(0, Math.ceil((match.overlapStart - now) / MS_PER_MINUTE)),
            group: group
                ? { _id: group._id, name: group.name, iconEmoji: group.iconEmoji }
                : null,
        };
    },
});
