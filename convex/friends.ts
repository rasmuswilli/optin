import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Send a friend request (using email for now - can add username later)
export const sendFriendRequest = mutation({
    args: {
        friendEmail: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Find friend by email
        const friend = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.friendEmail))
            .first();

        if (!friend) {
            throw new Error("User not found with that email");
        }

        if (friend._id === userId) {
            throw new Error("You can't add yourself as a friend");
        }

        // Check if friendship already exists (in either direction)
        const existingRequest = await ctx.db
            .query("friendships")
            .withIndex("by_user_and_friend", (q) =>
                q.eq("userId", userId).eq("friendId", friend._id)
            )
            .first();

        if (existingRequest) {
            throw new Error("Friend request already sent or you're already friends");
        }

        const reverseRequest = await ctx.db
            .query("friendships")
            .withIndex("by_user_and_friend", (q) =>
                q.eq("userId", friend._id).eq("friendId", userId)
            )
            .first();

        if (reverseRequest) {
            throw new Error("This user already sent you a friend request");
        }

        // Create friend request
        return await ctx.db.insert("friendships", {
            userId,
            friendId: friend._id,
            status: "pending",
            createdAt: Date.now(),
        });
    },
});

// Accept a friend request
export const acceptFriendRequest = mutation({
    args: {
        friendshipId: v.id("friendships"),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const friendship = await ctx.db.get(args.friendshipId);
        if (!friendship) {
            throw new Error("Friend request not found");
        }

        // Only the recipient can accept
        if (friendship.friendId !== userId) {
            throw new Error("Not authorized to accept this request");
        }

        if (friendship.status !== "pending") {
            throw new Error("Request already handled");
        }

        await ctx.db.patch(args.friendshipId, { status: "accepted" });

        // Create reverse friendship for bidirectional lookup
        await ctx.db.insert("friendships", {
            userId,
            friendId: friendship.userId,
            status: "accepted",
            createdAt: Date.now(),
        });
    },
});

// Decline/remove a friend request or friendship
export const removeFriendship = mutation({
    args: {
        friendshipId: v.id("friendships"),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const friendship = await ctx.db.get(args.friendshipId);
        if (!friendship) {
            throw new Error("Friendship not found");
        }

        // User can remove if they're either party
        if (friendship.userId !== userId && friendship.friendId !== userId) {
            throw new Error("Not authorized");
        }

        await ctx.db.delete(args.friendshipId);

        // If it was accepted, also remove the reverse friendship
        if (friendship.status === "accepted") {
            const otherUserId =
                friendship.userId === userId ? friendship.friendId : friendship.userId;
            const reverseFriendship = await ctx.db
                .query("friendships")
                .withIndex("by_user_and_friend", (q) =>
                    q.eq("userId", otherUserId).eq("friendId", userId)
                )
                .first();

            if (reverseFriendship) {
                await ctx.db.delete(reverseFriendship._id);
            }
        }
    },
});

// Get pending friend requests (received)
export const getPendingRequests = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return [];
        }

        const requests = await ctx.db
            .query("friendships")
            .withIndex("by_friend", (q) => q.eq("friendId", userId))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .collect();

        // Get user details for each request
        const requestsWithUsers = await Promise.all(
            requests.map(async (request) => {
                const user = await ctx.db.get(request.userId);
                return {
                    ...request,
                    fromUser: user
                        ? { _id: user._id, name: user.name, email: user.email, image: user.image }
                        : null,
                };
            })
        );

        return requestsWithUsers;
    },
});

// Get all friends
export const getMyFriends = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return [];
        }

        const friendships = await ctx.db
            .query("friendships")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .collect();

        // Get user details for each friend
        const friendsWithDetails = await Promise.all(
            friendships.map(async (friendship) => {
                const friend = await ctx.db.get(friendship.friendId);
                return {
                    friendshipId: friendship._id,
                    friend: friend
                        ? { _id: friend._id, name: friend.name, email: friend.email, image: friend.image }
                        : null,
                };
            })
        );

        return friendsWithDetails.filter((f) => f.friend !== null);
    },
});

// Add friend to a group
export const addFriendToGroup = mutation({
    args: {
        friendId: v.id("users"),
        groupId: v.id("groups"),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Verify current user is a member (preferably owner) of the group
        const myMembership = await ctx.db
            .query("groupMembers")
            .withIndex("by_group_and_user", (q) =>
                q.eq("groupId", args.groupId).eq("userId", userId)
            )
            .first();

        if (!myMembership) {
            throw new Error("You must be a member of this group");
        }

        // Verify they are friends
        const friendship = await ctx.db
            .query("friendships")
            .withIndex("by_user_and_friend", (q) =>
                q.eq("userId", userId).eq("friendId", args.friendId)
            )
            .first();

        if (!friendship || friendship.status !== "accepted") {
            throw new Error("You can only add friends to groups");
        }

        // Check if friend is already a member
        const existingMembership = await ctx.db
            .query("groupMembers")
            .withIndex("by_group_and_user", (q) =>
                q.eq("groupId", args.groupId).eq("userId", args.friendId)
            )
            .first();

        if (existingMembership) {
            throw new Error("Friend is already a member of this group");
        }

        // Add friend to group
        return await ctx.db.insert("groupMembers", {
            groupId: args.groupId,
            userId: args.friendId,
            role: "member",
            joinedAt: Date.now(),
        });
    },
});
