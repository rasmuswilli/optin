"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";
import { SideNav } from "@/components/Navigation";

export default function ChatPage() {
    const params = useParams();
    const matchId = params.matchId as Id<"matches">;

    const getOrCreateChat = useMutation(api.chat.getOrCreateChat);
    const [chatId, setChatId] = useState<Id<"chats"> | null>(null);
    const [initializing, setInitializing] = useState(true);

    // Initialize chat on mount
    useEffect(() => {
        async function init() {
            try {
                const id = await getOrCreateChat({ matchId });
                setChatId(id);
            } catch (error) {
                console.error("Failed to get/create chat:", error);
            } finally {
                setInitializing(false);
            }
        }
        init();
    }, [matchId, getOrCreateChat]);

    const chatDetails = useQuery(api.chat.getChatByMatch, { matchId });

    if (initializing || !chatDetails) {
        return (
            <div className="flex h-screen items-center justify-center bg-neutral-950 md:pl-64">
                <SideNav />
                <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-neutral-950 text-white md:pl-64">
            {/* Desktop sidebar */}
            <SideNav />

            {/* Header - fixed at top with safe area */}
            <header
                className="flex-shrink-0 border-b border-neutral-800 bg-neutral-900 px-4 py-3"
                style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
                <Link
                    href="/"
                    className="mb-2 inline-flex items-center gap-2 text-neutral-400 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-xl">
                        {chatDetails.group?.iconEmoji || "💬"}
                    </div>
                    <div>
                        <h1 className="font-bold">{chatDetails.group?.name || "Chat"}</h1>
                        <p className="text-sm text-neutral-400">
                            {chatDetails.participants?.map((p) => p?.name || "?").join(", ")}
                        </p>
                    </div>
                </div>
            </header>

            {/* Messages - scrollable middle section */}
            {chatId && <MessageList chatId={chatId} />}

            {/* Input - fixed at bottom */}
            {chatId && <MessageInput chatId={chatId} />}
        </div>
    );
}

function MessageList({ chatId }: { chatId: Id<"chats"> }) {
    const messages = useQuery(api.chat.getMessages, { chatId });
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (messages === undefined) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-neutral-500">No messages yet. Say hi! 👋</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg._id}
                        className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.isMe
                                ? "bg-white text-neutral-900"
                                : "bg-neutral-800 text-white"
                                }`}
                        >
                            {!msg.isMe && (
                                <p className="mb-1 text-xs font-medium text-neutral-400">
                                    {msg.sender?.name || "Unknown"}
                                </p>
                            )}
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function MessageInput({ chatId }: { chatId: Id<"chats"> }) {
    const [text, setText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const sendMessage = useMutation(api.chat.sendMessage);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || isSending) return;

        setIsSending(true);
        try {
            await sendMessage({ chatId, text: text.trim() });
            setText("");
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex-shrink-0 border-t border-neutral-800 bg-neutral-900 px-4 py-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
            <div className="flex items-center gap-3">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-white focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={!text.trim() || isSending}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-50"
                >
                    {isSending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Send className="h-5 w-5" />
                    )}
                </button>
            </div>
        </form>
    );
}
