"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, ArrowLeft, User } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();
    const [mode, setMode] = useState<"signIn" | "signUp">("signIn");

    // Redirect if already authenticated
    if (isAuthenticated) {
        router.push("/");
        return null;
    }

    return (
        <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
            {/* Header */}
            <header className="p-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-neutral-400 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex flex-1 flex-col items-center justify-center px-4">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold">Optin</h1>
                        <p className="mt-2 text-neutral-400">
                            {mode === "signIn"
                                ? "Welcome back!"
                                : "Create your account"}
                        </p>
                    </div>

                    {/* Auth Form */}
                    <AuthForm mode={mode} />

                    {/* Toggle Mode */}
                    <div className="mt-6 text-center text-sm">
                        {mode === "signIn" ? (
                            <p className="text-neutral-400">
                                Don&apos;t have an account?{" "}
                                <button
                                    onClick={() => setMode("signUp")}
                                    className="text-white underline hover:no-underline"
                                >
                                    Sign up
                                </button>
                            </p>
                        ) : (
                            <p className="text-neutral-400">
                                Already have an account?{" "}
                                <button
                                    onClick={() => setMode("signIn")}
                                    className="text-white underline hover:no-underline"
                                >
                                    Sign in
                                </button>
                            </p>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px flex-1 bg-neutral-800" />
                        <span className="text-sm text-neutral-500">or</span>
                        <div className="h-px flex-1 bg-neutral-800" />
                    </div>

                    {/* Anonymous Sign In */}
                    <AnonymousSignIn />
                </div>
            </main>
        </div>
    );
}

function AuthForm({ mode }: { mode: "signIn" | "signUp" }) {
    const { signIn } = useAuthActions();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.set("email", email);
            formData.set("password", password);
            formData.set("flow", mode);
            if (mode === "signUp" && name) {
                formData.set("name", name);
            }

            await signIn("password", formData);
            router.push("/");
        } catch (err: any) {
            console.error("Auth error:", err);
            if (err.message?.includes("Invalid password")) {
                setError("Invalid email or password");
            } else if (err.message?.includes("already exists")) {
                setError("An account with this email already exists");
            } else {
                setError(mode === "signIn" ? "Sign in failed" : "Sign up failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (Sign Up only) */}
            {mode === "signUp" && (
                <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-300">
                        Name
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-3 pl-10 pr-4 text-white placeholder-neutral-500 focus:border-white focus:outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Email */}
            <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Email
                </label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-3 pl-10 pr-4 text-white placeholder-neutral-500 focus:border-white focus:outline-none"
                        required
                    />
                </div>
            </div>

            {/* Password */}
            <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-3 pl-10 pr-4 text-white placeholder-neutral-500 focus:border-white focus:outline-none"
                        required
                        minLength={6}
                    />
                </div>
            </div>

            {/* Error */}
            {error && (
                <p className="rounded-lg bg-red-900/50 p-3 text-sm text-red-300">
                    {error}
                </p>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-50"
            >
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === "signIn" ? (
                    "Sign In"
                ) : (
                    "Create Account"
                )}
            </button>
        </form>
    );
}

function AnonymousSignIn() {
    const { signIn } = useAuthActions();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleAnonymous = async () => {
        setIsLoading(true);
        try {
            await signIn("anonymous");
            router.push("/");
        } catch (error) {
            console.error("Anonymous sign in failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleAnonymous}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 py-3 font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
        >
            {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
                "Continue as Guest"
            )}
        </button>
    );
}
