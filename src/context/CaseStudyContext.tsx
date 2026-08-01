"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { projectsData } from "@/data/content";
import { caseStudyStage } from "@/lib/caseStudyStage";

interface CaseStudyActions {
    open: (index: number) => void;
    close: () => void;
}

/** Index into projectsData of the open case study, or null. */
const CaseStudyStateContext = createContext<number | null>(null);
const CaseStudyActionsContext = createContext<CaseStudyActions | null>(null);

const pathOf = (index: number) => `/projects/${projectsData[index].slug}`;

// Read straight off location rather than through usePathname: the site rewrites
// the URL under the router to keep the canvas alive, so the router's own idea
// of the path is not the one the address bar shows.
function indexFromPath(pathname: string) {
    const match = /^\/projects\/([^/]+)/.exec(pathname);
    if (!match) return null;
    const index = projectsData.findIndex(({ slug }) => slug === match[1]);
    return index === -1 ? null : index;
}

export function CaseStudyProvider({ children }: { children: ReactNode }) {
    // A study can be the page that was loaded, not only one that was clicked
    // into, so the first state has to come from the URL.
    const [openIndex, setOpenIndex] = useState<number | null>(() => {
        const index = indexFromPath(window.location.pathname);
        caseStudyStage.open = index !== null;
        caseStudyStage.instant = index !== null;
        return index;
    });

    // Whether the entry currently showing a study is one we pushed. A study
    // that was landed on directly sits on an entry that belongs to whoever
    // linked here, and going back from it would leave the site.
    const ownsEntry = useRef(false);

    // Registered whether or not a study is open: the entry a study lives on is
    // still there after back, and stepping forward onto it again has to
    // reopen it. Listening only while open is what made forward do nothing.
    useEffect(() => {
        const onPopState = () => {
            const index = indexFromPath(window.location.pathname);
            ownsEntry.current = false;
            caseStudyStage.open = index !== null;
            caseStudyStage.instant = index !== null;
            setOpenIndex(index);
        };

        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    // Split from the state for the same reason the project hover is: the links
    // only ever open a study, and each one re-renders an <Html> twin's React
    // root along with itself.
    const actions = useMemo(
        () => ({
            open: (index: number) => {
                caseStudyStage.open = true;
                caseStudyStage.instant = false;
                setOpenIndex(index);
                if (window.location.pathname === pathOf(index)) return;
                window.history.pushState(null, "", pathOf(index));
                ownsEntry.current = true;
            },
            close: () => {
                caseStudyStage.open = false;
                caseStudyStage.instant = false;
                setOpenIndex(null);
                if (ownsEntry.current) {
                    ownsEntry.current = false;
                    window.history.back();
                    return;
                }
                window.history.pushState(null, "", "/");
            },
        }),
        [],
    );

    return (
        <CaseStudyActionsContext.Provider value={actions}>
            <CaseStudyStateContext.Provider value={openIndex}>
                {children}
            </CaseStudyStateContext.Provider>
        </CaseStudyActionsContext.Provider>
    );
}

export function useCaseStudyActions() {
    const context = useContext(CaseStudyActionsContext);
    if (!context) {
        throw new Error(
            "useCaseStudyActions must be used inside CaseStudyProvider",
        );
    }
    return context;
}

export function useOpenCaseStudy() {
    return useContext(CaseStudyStateContext);
}
