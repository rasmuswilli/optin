import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";

// Create an opt-in (declare availability)
export const createOptIn = mutation({
    args: {
        groupId: v.id("groups"),
        startsAt: v.number(), // When availability begins (timestamp)
        endsAt: v.number(), // When availability ends (timestamp)
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
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
            // Update existing opt-in
            await ctx.db.patch(existingOptIn._id, {
                startsAt: args.startsAt,
                endsAt: args.endsAt,
            });
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

        // Check for overlapping opt-ins and create match if found
        await checkForMatches(ctx, args.groupId, optInId, userId);

        return optInId;
    },
});

// Helper function to check for matches
async function checkForMatches(
    ctx: { db: any; scheduler: any },
    groupId: any,
    newOptInId: any,
    triggeredByUserId: any
) {
    const newOptIn = await ctx.db.get(newOptInId);
    if (!newOptIn) return;

    // Get all active opt-ins for this group
    const activeOptIns = await ctx.db
        .query("optIns")
        .withIndex("by_group_and_status", (q: any) =>
            q.eq("groupId", groupId).eq("status", "active")
        )
        .collect();

    // Find overlapping opt-ins
    const overlapping = activeOptIns.filter((optIn: any) => {
        if (optIn._id === newOptInId) return false; // Skip self

        // Check for time overlap
        const overlapStart = Math.max(optIn.startsAt, newOptIn.startsAt);
        const overlapEnd = Math.min(optIn.endsAt, newOptIn.endsAt);

        return overlapStart < overlapEnd; // There is overlap
    });

    if (overlapping.length > 0) {
        // We have a match! Create match record
        const allOptInIds = [newOptInId, ...overlapping.map((o: any) => o._id)];
        const allUserIds = [
            newOptIn.userId,
            ...overlapping.map((o: any) => o.userId),
        ];

        // Check if a match with these exact users already exists
        const existingMatches = await ctx.db
            .query("matches")
            .withIndex("by_group", (q: any) => q.eq("groupId", groupId))
            .collect();

        const matchExists = existingMatches.some((match: any) => {
            const sortedExisting = [...match.userIds].sort();
            const sortedNew = [...allUserIds].sort();
            return JSON.stringify(sortedExisting) === JSON.stringify(sortedNew);
        });

        if (!matchExists) {
            // Create new match
            const matchId = await ctx.db.insert("matches", {
                groupId,
                userIds: allUserIds,
                optInIds: allOptInIds,
                createdAt: Date.now(),
            });

            // Schedule push notification to matched users
            await ctx.scheduler.runAfter(0, internal.sendNotification.sendMatchNotification, {
                matchId,
                triggeredByUserId,
            });
        }
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

        // Mark opt-in as expired
        await ctx.db.patch(args.optInId, { status: "expired" });

        // Find and delete any matches that included this opt-in
        const matchesWithOptIn = await ctx.db
            .query("matches")
            .withIndex("by_group", (q) => q.eq("groupId", optIn.groupId))
            .collect();

        // Delete matches where this opt-in was a participant
        for (const match of matchesWithOptIn) {
            if (match.optInIds.includes(args.optInId)) {
                await ctx.db.delete(match._id);
            }
        }
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

        // Note: Expired opt-ins should be cleaned up by a scheduled function, not in a query
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

        let matchesDeleted = 0;

        // 1. Handle newly expired opt-ins
        for (const optIn of expiredOptIns) {
            await ctx.db.patch(optIn._id, { status: "expired" });

            // Find and delete any matches that included this opt-in
            const matchesWithOptIn = await ctx.db
                .query("matches")
                .withIndex("by_group", (q) => q.eq("groupId", optIn.groupId))
                .collect();

            for (const match of matchesWithOptIn) {
                if (match.optInIds.includes(optIn._id)) {
                    // Check if match still exists (might have been deleted in this loop already)
                    const existingMatch = await ctx.db.get(match._id);
                    if (existingMatch) {
                        await ctx.db.delete(match._id);
                        matchesDeleted++;
                    }
                }
            }
        }

        // 2. Safety Net: Clean up "zombie" matches (matches referring to invalid/inactive opt-ins)
        // This handles cases where opt-ins expired before this script was running
        const allMatches = await ctx.db.query("matches").collect();
        for (const match of allMatches) {
            // Check if this match is already valid (referenced active opt-ins)
            // We need to fetch all opt-ins for this match
            const optInsProm = match.optInIds.map((id) => ctx.db.get(id));
            const optIns = await Promise.all(optInsProm);

            // If any opt-in is missing OR not active -> Match is invalid
            const isInvalid = optIns.some((o) => !o || o.status !== "active");

            if (isInvalid) {
                // Double check it wasn't already deleted in step 1
                const stillExists = await ctx.db.get(match._id);
                if (stillExists) {
                    await ctx.db.delete(match._id);
                    matchesDeleted++;
                }
            }
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

        // Get all matches
        const allMatches = await ctx.db.query("matches").collect();

        // Filter to matches that include this user
        const myMatches = allMatches.filter((match) =>
            match.userIds.includes(userId)
        );

        // Get details for each match
        const matchDetails = await Promise.all(
            myMatches.map(async (match) => {
                const group = await ctx.db.get(match.groupId);
                const users = await Promise.all(
                    match.userIds.map((id) => ctx.db.get(id))
                );

                return {
                    ...match,
                    group: group
                        ? { _id: group._id, name: group.name, iconEmoji: group.iconEmoji }
                        : null,
                    users: users
                        .filter((u) => u !== null)
                        .map((u) => ({ _id: u!._id, name: u!.name, image: u!.image })),
                };
            })
        );

        return matchDetails;
    },
});

// Get a specific match by ID (used by notification action)
export const getMatchById = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) return null;

        const group = await ctx.db.get(match.groupId);

        return {
            ...match,
            group: group
                ? { _id: group._id, name: group.name, iconEmoji: group.iconEmoji }
                : null,
        };
    },
});
