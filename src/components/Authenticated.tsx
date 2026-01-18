"use client";

import { useConvexAuth } from "convex/react";
import { ReactNode } from "react";

interface AuthenticatedProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export function Authenticated({ children, fallback }: AuthenticatedProps) {
    const { isLoading, isAuthenticated } = useConvexAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-neutral-400">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
