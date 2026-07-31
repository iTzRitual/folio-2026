"use client";

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { caseStudyStage } from "@/lib/caseStudyStage";

interface CaseStudyActions {
    open: (index: number) => void;
    close: () => void;
}

/** Index into projectsData of the open case study, or null. */
const CaseStudyStateContext = createContext<number | null>(null);
const CaseStudyActionsContext = createContext<CaseStudyActions | null>(null);

export function CaseStudyProvider({ children }: { children: ReactNode }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    // Split from the state for the same reason the project hover is: the links
    // only ever open a study, and each one re-renders an <Html> twin's React
    // root along with itself.
    const actions = useMemo(
        () => ({
            open: (index: number) => {
                caseStudyStage.open = true;
                setOpenIndex(index);
            },
            close: () => {
                caseStudyStage.open = false;
                setOpenIndex(null);
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
