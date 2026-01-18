import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
    // Auth tables from Convex Auth
    ...authTables,

    // Extend the users table with additional fields
    users: defineTable({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        emailVerificationTime: v.optional(v.float64()),
        image: v.optional(v.string()),
        isAnonymous: v.optional(v.boolean()),
        avatarUrl: v.optional(v.string()),
        createdAt: v.optional(v.number()),
    }).index("by_email", ["email"]),


    // Friendships table
    friendships: defineTable({
        userId: v.id("users"),
        friendId: v.id("users"),
        status: v.union(v.literal("pending"), v.literal("accepted")),
        createdAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_friend", ["friendId"])
        .index("by_user_and_friend", ["userId", "friendId"]),

    // Groups (shared interests like "play Valorant")
    groups: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        createdBy: v.id("users"),
        iconEmoji: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_creator", ["createdBy"]),

    // Group members
    groupMembers: defineTable({
        groupId: v.id("groups"),
        userId: v.id("users"),
        role: v.union(v.literal("owner"), v.literal("member")),
        joinedAt: v.number(),
    })
        .index("by_group", ["groupId"])
        .index("by_user", ["userId"])
        .index("by_group_and_user", ["groupId", "userId"]),

    // Opt-ins (availability windows)
    optIns: defineTable({
        userId: v.id("users"),
        groupId: v.id("groups"),
        startsAt: v.number(), // When availability begins
        endsAt: v.number(), // When availability ends
        createdAt: v.number(),
        status: v.union(
            v.literal("active"),
            v.literal("matched"),
            v.literal("expired")
        ),
    })
        .index("by_user", ["userId"])
        .index("by_group", ["groupId"])
        .index("by_group_and_status", ["groupId", "status"])
        .index("by_user_and_status", ["userId", "status"]),

    // Matches (when two or more users have overlapping opt-ins)
    matches: defineTable({
        groupId: v.id("groups"),
        userIds: v.array(v.id("users")),
        optInIds: v.array(v.id("optIns")),
        createdAt: v.number(),
        chatId: v.optional(v.id("chats")),
    }).index("by_group", ["groupId"]),

    // Push subscriptions for notifications
    pushSubscriptions: defineTable({
        userId: v.id("users"),
        subscription: v.string(), // JSON stringified PushSubscription
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // Chats for matched groups
    chats: defineTable({
        matchId: v.id("matches"),
        createdAt: v.number(),
    }).index("by_match", ["matchId"]),

    // Messages in chats
    messages: defineTable({
        chatId: v.id("chats"),
        userId: v.id("users"),
        text: v.string(),
        createdAt: v.number(),
    }).index("by_chat", ["chatId"]),
});
