"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import webpush from "web-push";

// Set VAPID details from environment
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        "mailto:hello@optin.app",
        vapidPublicKey,
        vapidPrivateKey
    );
}

// Send match notification to all users in a match
export const sendMatchNotification = internalAction({
    args: {
        matchId: v.id("matches"),
        triggeredByUserId: v.id("users"),
    },
    handler: async (ctx, args) => {
        if (!vapidPublicKey || !vapidPrivateKey) {
            console.error("VAPID keys not configured");
            return;
        }

        // Get the match details
        const match = await ctx.runQuery(api.optIns.getMatchById, {
            matchId: args.matchId,
        });

        if (!match) {
            console.error("Match not found:", args.matchId);
            return;
        }

        const groupName = match.group?.name || "a group";

        // Send notification to all users except the one who triggered it
        for (const userId of match.userIds) {
            if (userId !== args.triggeredByUserId) {
                // Get user's push subscriptions
                const subscriptions = await ctx.runQuery(
                    api.pushSubscriptions.getUserSubscriptions,
                    { userId }
                );

                if (!subscriptions || subscriptions.length === 0) {
                    console.log(`No push subscriptions for user ${userId}`);
                    continue;
                }

                const payload = JSON.stringify({
                    title: "You have a match! 🎉",
                    body: `Someone in ${groupName} is available to hang out!`,
                    url: "/",
                    icon: "/icon-192.png",
                });

                for (const sub of subscriptions) {
                    try {
                        const subscription = JSON.parse(sub.subscription);
                        await webpush.sendNotification(subscription, payload);
                        console.log(`Notification sent to user ${userId}`);
                    } catch (error: unknown) {
                        console.error("Failed to send notification:", error);
                        // If subscription is invalid, remove it
                        const err = error as { statusCode?: number };
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            await ctx.runMutation(api.pushSubscriptions.removeById, {
                                subscriptionId: sub._id,
                            });
                        }
                    }
                }
            }
        }
    },
});
