import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

const MS_PER_MINUTE = 60 * 1000;

function getMatchState(overlapStart: number, overlapEnd: number, now: number): "upcoming" | "live" {
    if (overlapStart > now) return "upcoming";
    if (overlapEnd > now) return "live";
    return "live";
}

// Get or create a chat for a match
export const getOrCreateChat = mutation({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Verify user is part of the match
        const match = await ctx.db.get(args.matchId);
        if (!match || !match.userIds.includes(userId)) {
            throw new Error("Not authorized");
        }

        // Check for existing chat
        const existingChat = await ctx.db
            .query("chats")
            .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
            .first();

        if (existingChat) {
            return existingChat._id;
        }

        // Create new chat
        return await ctx.db.insert("chats", {
            matchId: args.matchId,
            createdAt: Date.now(),
        });
    },
});

// Get chat details for a match
export const getChatByMatch = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return null;
        }

        // Verify user is part of the match
        const match = await ctx.db.get(args.matchId);
        if (!match || !match.userIds.includes(userId)) {
            return null;
        }

        // Get chat
        const chat = await ctx.db
            .query("chats")
            .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
            .first();

        if (!chat) return null;

        // Get group info
        const group = await ctx.db.get(match.groupId);

        // Get participant info
        const participants = await Promise.all(
            match.userIds.map(async (id) => {
                const user = await ctx.db.get(id);
                return user ? { _id: user._id, name: user.name, image: user.image } : null;
            })
        );

        const now = Date.now();
        const hydratedMatch = {
            ...match,
            state: getMatchState(match.overlapStart, match.overlapEnd, now),
            startsInMinutes: Math.max(0, Math.ceil((match.overlapStart - now) / MS_PER_MINUTE)),
        };

        return {
            ...chat,
            match: hydratedMatch,
            group: group ? { _id: group._id, name: group.name, iconEmoji: group.iconEmoji } : null,
            participants: participants.filter(Boolean),
        };
    },
});

// Send message to a chat
export const sendMessage = mutation({
    args: {
        chatId: v.id("chats"),
        text: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        // Verify user is part of the match
        const match = await ctx.db.get(chat.matchId);
        if (!match || !match.userIds.includes(userId)) {
            throw new Error("Not authorized");
        }

        return await ctx.db.insert("messages", {
            chatId: args.chatId,
            userId,
            text: args.text,
            createdAt: Date.now(),
        });
    },
});

// Get messages for a chat (real-time)
export const getMessages = query({
    args: { chatId: v.id("chats") },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return [];
        }

        const chat = await ctx.db.get(args.chatId);
        if (!chat) return [];

        // Verify user is part of the match
        const match = await ctx.db.get(chat.matchId);
        if (!match || !match.userIds.includes(userId)) {
            return [];
        }

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
            .order("asc")
            .collect();

        // Get sender info for each message
        const messagesWithSender = await Promise.all(
            messages.map(async (msg) => {
                const sender = await ctx.db.get(msg.userId);
                const user = sender as { _id: string; name?: string; image?: string } | null;
                return {
                    ...msg,
                    sender: user ? { _id: user._id, name: user.name, image: user.image } : null,
                    isMe: msg.userId === userId,
                };
            })
        );

        return messagesWithSender;
    },
});
