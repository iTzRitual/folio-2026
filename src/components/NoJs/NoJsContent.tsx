import { NoJsHero } from "@/components/NoJs/NoJsHero";
import { NoJsDetails } from "./NoJsDetails";
import { headerContent } from "@/data/content";

export function NoJsContent() {
    return (
        <div className="no-js-fallback bg-[#1D1D1D]  text-white flex-col items-center justify-center text-center w-full z-50">
            <header className="flex flex-wrap justify-between gap-4 px-[3vw] py-6 font-karla font-light text-sm text-[#BCBCBC]">
                <span>{headerContent.coordinates}</span>
                <span>{headerContent.availability}</span>
                <a href={headerContent.contact.href}>
                    {headerContent.contact.label}
                </a>
            </header>
            <NoJsHero />
            <NoJsDetails />
        </div>
    );
}
