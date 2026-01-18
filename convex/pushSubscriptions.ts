import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Save push subscription for a user
export const savePushSubscription = mutation({
    args: {
        subscription: v.string(), // JSON stringified PushSubscription
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Check if subscription already exists
        const existing = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (existing) {
            // Update existing subscription
            await ctx.db.patch(existing._id, {
                subscription: args.subscription,
                createdAt: Date.now(),
            });
            return existing._id;
        }

        // Create new subscription
        return await ctx.db.insert("pushSubscriptions", {
            userId,
            subscription: args.subscription,
            createdAt: Date.now(),
        });
    },
});

// Remove push subscription
export const removePushSubscription = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const subscription = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (subscription) {
            await ctx.db.delete(subscription._id);
        }
    },
});

// Check if user has push subscription
export const hasPushSubscription = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return false;
        }

        const subscription = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        return !!subscription;
    },
});
