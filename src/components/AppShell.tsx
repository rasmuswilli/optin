"use client";

import { ReactNode } from "react";
import { BottomNav, SideNav } from "./Navigation";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { LogIn, User } from "lucide-react";

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const { isAuthenticated, isLoading } = useConvexAuth();

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Side navigation for desktop */}
            <SideNav />

            {/* Main content area */}
            <main className="pb-20 md:pb-0 md:pl-64">
                {/* Mobile header */}
                <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-800 bg-neutral-900/95 px-4 backdrop-blur-sm md:hidden">
                    <h1 className="text-lg font-bold">Optin</h1>
                    {!isLoading && (
                        isAuthenticated ? (
                            <Link
                                href="/settings"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold"
                            >
                                <User className="h-4 w-4" />
                            </Link>
                        ) : (
                            <Link
                                href="/auth"
                                className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-neutral-900"
                            >
                                <LogIn className="h-4 w-4" />
                                Sign In
                            </Link>
                        )
                    )}
                </header>

                {/* Page content */}
                <div className="px-4 py-6 md:px-8 md:py-8">{children}</div>
            </main>

            {/* Bottom navigation for mobile */}
            <BottomNav />
        </div>
    );
}
