"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function AuthButton() {
    const { isLoading, isAuthenticated } = useConvexAuth();
    const { signIn, signOut } = useAuthActions();

    if (isLoading) {
        return (
            <button
                disabled
                className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-400"
            >
                Loading...
            </button>
        );
    }

    if (isAuthenticated) {
        return (
            <button
                onClick={() => void signOut()}
                className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
                Sign Out
            </button>
        );
    }

    return (
        <button
            onClick={() => void signIn("anonymous")}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
        >
            Get Started
        </button>
    );
}
