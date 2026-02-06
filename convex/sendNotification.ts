"use node";
/* eslint-disable @typescript-eslint/no-explicit-any */

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

function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
}

async function sendPushToUsers(
    ctx: any,
    userIds: any[],
    payload: string,
    excludedUserId?: any
) {
    for (const userId of userIds) {
        if (excludedUserId && userId === excludedUserId) {
            continue;
        }

        const subscriptions = await ctx.runQuery(
            api.pushSubscriptions.getUserSubscriptions,
            { userId }
        );

        if (!subscriptions || subscriptions.length === 0) {
            continue;
        }

        for (const sub of subscriptions) {
            try {
                const subscription = JSON.parse(sub.subscription);
                await webpush.sendNotification(subscription, payload);
            } catch (error: unknown) {
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
        const isUpcoming = match.state === "upcoming";
        const body = isUpcoming
            ? `You overlap in ${groupName} from ${formatTime(match.overlapStart)} to ${formatTime(match.overlapEnd)} (${match.overlapMinutes} min).`
            : `You have ${match.overlapMinutes} minutes of overlap in ${groupName}.`;

        const payload = JSON.stringify({
            title: isUpcoming ? "Upcoming match scheduled" : "You have a live match",
            body,
            url: `/chat/${args.matchId}`,
            icon: "/icon-192.png",
        });

        await sendPushToUsers(ctx, match.userIds, payload, args.triggeredByUserId);
    },
});

export const sendMatchReminder = internalAction({
    args: {
        matchId: v.id("matches"),
        minutesBefore: v.number(),
    },
    handler: async (ctx, args) => {
        if (!vapidPublicKey || !vapidPrivateKey) {
            return;
        }

        const match = await ctx.runQuery(api.optIns.getMatchById, {
            matchId: args.matchId,
        });

        if (!match) {
            return;
        }

        const now = Date.now();
        // Skip reminders for expired windows.
        if (match.overlapEnd <= now) {
            return;
        }

        const groupName = match.group?.name || "your group";
        const payload = JSON.stringify({
            title: `${args.minutesBefore} min until match`,
            body: `${groupName} overlap starts at ${formatTime(match.overlapStart)} for ${match.overlapMinutes} minutes.`,
            url: `/chat/${args.matchId}`,
            icon: "/icon-192.png",
        });

        await sendPushToUsers(ctx, match.userIds, payload);
    },
});
