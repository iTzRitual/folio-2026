import { heroContent } from "@/data/content";

export function NoJsHero() {
    return (
        <div className="flex flex-col gap-16 min-h-screen items-center justify-center">
            <div className="flex flex-col gap-4">
                <p className="max-w-full wrap-break-word text-(--text-secondary) font-karla font-black text-[2.26vw] text-center">
                    {heroContent.subtitle}
                </p>
                <h1 className="w-full max-w-full wrap-break-word text-(--text-primary) font-black text-[10vw] leading-[0.95] text-center mb-2">
                    {heroContent.title}
                </h1>
            </div>
            <div className="flex border border-(--text-secondary) rounded-lg p-4 gap-4 w-fit self-center mx-[8.5%]">
                <div className="bg-(--text-secondary) rounded-full self-center inline-flex h-8 w-8 shrink-0 items-center justify-center text-(--bg) font-black">
                    !
                </div>
                <div className="text-left uppercase font-karla font-normal text-lg">
                    This website relies heavily on JavaScript. For the full
                    interactive experience, please{" "}
                    <span className="bg-(--border) rounded-sm px-1">
                        enable JavaScript
                    </span>{" "}
                    and refresh the page. Otherwise, simply scroll down to view
                    the most essential information.
                </div>
            </div>
        </div>
    );
}
