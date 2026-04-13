import { NoJsHero } from "@/components/NoJs/NoJsHero";
import { NoJsDetails } from "./NoJsDetails";

export function NoJsContent() {
    return (
        <div className="no-js-fallback bg-[#1D1D1D]  text-white flex-col items-center justify-center text-center w-full z-50">
            <NoJsHero />
            <NoJsDetails />
        </div>
    );
}
