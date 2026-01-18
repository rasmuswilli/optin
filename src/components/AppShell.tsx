"use client";

import { ReactNode } from "react";
import { BottomNav, SideNav } from "./Navigation";

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Side navigation for desktop */}
            <SideNav />

            {/* Main content area */}
            <main className="pb-20 md:pb-0 md:pl-64">
                {/* Mobile header */}
                <header className="sticky top-0 z-40 flex h-14 items-center border-b border-neutral-800 bg-neutral-900/95 px-4 backdrop-blur-sm md:hidden">
                    <h1 className="text-lg font-bold">Optin</h1>
                </header>

                {/* Page content */}
                <div className="px-4 py-6 md:px-8 md:py-8">{children}</div>
            </main>

            {/* Bottom navigation for mobile */}
            <BottomNav />
        </div>
    );
}
