"use client";

import { useEffect, useRef } from "react";
import { NoJsHero } from "@/components/NoJs/NoJsHero";
import { NoJsDetails } from "./NoJsDetails";
import { headerContent, fallbackContent } from "@/data/content";

export function NoJsContent({ rendererFailed = false }: { rendererFailed?: boolean }) {
    const contentRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!rendererFailed) return;
        contentRef.current?.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }, [rendererFailed]);
    return (
        <main
            ref={contentRef}
            tabIndex={-1}
            aria-label={fallbackContent.label}
            data-renderer-fallback={rendererFailed}
            className="no-js-fallback bg-(--bg) text-(--text-primary) flex-col items-center justify-center text-center w-full z-50"
        >
            <header className="flex flex-wrap justify-between gap-4 px-[3vw] py-6 font-karla font-light text-sm text-(--text-secondary)">
                <span>{headerContent.coordinates}</span>
                <span>{headerContent.availability}</span>
                <a href={headerContent.contact.href}>
                    {headerContent.contact.label}
                </a>
            </header>
            <NoJsHero rendererFailed={rendererFailed} />
            <NoJsDetails />
        </main>
    );
}
