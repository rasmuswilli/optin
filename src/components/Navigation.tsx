"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Users, UserPlus } from "lucide-react";
import { useConvexAuth } from "convex/react";

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/groups", label: "Groups", icon: Users },
    { href: "/friends", label: "Friends", icon: UserPlus },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-sm md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="flex h-16 items-center justify-around">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${isActive
                                ? "text-white"
                                : "text-neutral-400 hover:text-neutral-200"
                                }`}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export function SideNav() {
    const pathname = usePathname();
    const { isAuthenticated, isLoading } = useConvexAuth();

    return (
        <nav className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-neutral-800 bg-neutral-900 md:flex">
            {/* Logo / App Name */}
            <div className="flex h-16 items-center border-b border-neutral-800 px-6">
                <h1 className="text-xl font-bold text-white">Optin</h1>
            </div>

            {/* Navigation Items */}
            <div className="flex flex-1 flex-col gap-1 p-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${isActive
                                ? "bg-neutral-800 text-white"
                                : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                                }`}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Footer / User section */}
            <div className="border-t border-neutral-800 p-4">
                {isLoading ? (
                    <div className="flex items-center gap-3 rounded-lg bg-neutral-800/50 px-4 py-3">
                        <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-700" />
                        <div className="flex-1">
                            <div className="h-4 w-20 animate-pulse rounded bg-neutral-700" />
                        </div>
                    </div>
                ) : isAuthenticated ? (
                    <Link
                        href="/settings"
                        className="flex w-full items-center gap-3 rounded-lg bg-neutral-800/50 px-4 py-3 transition-colors hover:bg-neutral-800"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold">
                            ✓
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-white">Profile</p>
                            <p className="text-xs text-neutral-400">View settings</p>
                        </div>
                    </Link>
                ) : (
                    <Link
                        href="/auth"
                        className="flex w-full items-center gap-3 rounded-lg bg-neutral-800/50 px-4 py-3 transition-colors hover:bg-neutral-800"
                    >
                        <div className="h-8 w-8 rounded-full bg-neutral-700" />
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-white">Not signed in</p>
                            <p className="text-xs text-neutral-400">Click to sign in</p>
                        </div>
                    </Link>
                )}
            </div>
        </nav>
    );
}
