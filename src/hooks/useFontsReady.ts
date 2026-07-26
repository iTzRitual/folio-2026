"use client";

import { useEffect, useState } from "react";

export function useFontsReady(): boolean {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;

        document.fonts.ready.then(() => {
            if (!cancelled) setReady(true);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return ready;
}
