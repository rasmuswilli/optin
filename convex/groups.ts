import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Create a new group
export const createGroup = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        iconEmoji: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Create the group
        const groupId = await ctx.db.insert("groups", {
            name: args.name,
            description: args.description,
            iconEmoji: args.iconEmoji || "🎮",
            createdBy: userId,
            createdAt: Date.now(),
        });

        // Add creator as owner
        await ctx.db.insert("groupMembers", {
            groupId,
            userId,
            role: "owner",
            joinedAt: Date.now(),
        });

        return groupId;
    },
});

// Get all groups for the current user
export const getMyGroups = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return [];
        }

        // Get all group memberships
        const memberships = await ctx.db
            .query("groupMembers")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Get group details for each membership
        const groups = await Promise.all(
            memberships.map(async (membership) => {
                const group = await ctx.db.get(membership.groupId);
                if (!group) return null;

                // Get member count
                const members = await ctx.db
                    .query("groupMembers")
                    .withIndex("by_group", (q) => q.eq("groupId", group._id))
                    .collect();

                // Get active opt-ins count
                const activeOptIns = await ctx.db
                    .query("optIns")
                    .withIndex("by_group_and_status", (q) =>
                        q.eq("groupId", group._id).eq("status", "active")
                    )
                    .collect();

                return {
                    ...group,
                    memberCount: members.length,
                    activeOptInsCount: activeOptIns.length,
                    role: membership.role,
                };
            })
        );

        return groups.filter((g) => g !== null);
    },
});

// Get a single group with details
export const getGroup = query({
    args: { groupId: v.id("groups") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return null;
        }

        const group = await ctx.db.get(args.groupId);
        if (!group) return null;

        // Check if user is a member
        const membership = await ctx.db
            .query("groupMembers")
            .withIndex("by_group_and_user", (q) =>
                q.eq("groupId", args.groupId).eq("userId", userId)
            )
            .first();

        if (!membership) return null;

        // Get all members with details
        const memberRecords = await ctx.db
            .query("groupMembers")
            .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
            .collect();

        const members = await Promise.all(
            memberRecords.map(async (m) => {
                const user = await ctx.db.get(m.userId);
                return {
                    ...m,
                    user: user
                        ? { _id: user._id, name: user.name, image: user.image }
                        : null,
                };
            })
        );

        // Get active opt-ins
        const activeOptIns = await ctx.db
            .query("optIns")
            .withIndex("by_group_and_status", (q) =>
                q.eq("groupId", args.groupId).eq("status", "active")
            )
            .collect();

        return {
            ...group,
            members,
            activeOptIns,
            currentUserRole: membership.role,
        };
    },
});

// Delete a group (owner only)
export const deleteGroup = mutation({
    args: { groupId: v.id("groups") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Check if user is owner
        const membership = await ctx.db
            .query("groupMembers")
            .withIndex("by_group_and_user", (q) =>
                q.eq("groupId", args.groupId).eq("userId", userId)
            )
            .first();

        if (!membership || membership.role !== "owner") {
            throw new Error("Only owners can delete groups");
        }

        // Delete all group members
        const members = await ctx.db
            .query("groupMembers")
            .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
            .collect();

        for (const member of members) {
            await ctx.db.delete(member._id);
        }

        // Delete all opt-ins for this group
        const optIns = await ctx.db
            .query("optIns")
            .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
            .collect();

        for (const optIn of optIns) {
            await ctx.db.delete(optIn._id);
        }

        // Delete the group
        await ctx.db.delete(args.groupId);
    },
});
