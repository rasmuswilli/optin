"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("[App] ServiceWorker registered:", registration.scope);
                })
                .catch((error) => {
                    console.log("[App] ServiceWorker registration failed:", error);
                });
        }
    }, []);

    return null;
}
