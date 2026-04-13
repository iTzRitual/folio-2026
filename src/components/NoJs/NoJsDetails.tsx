import { educationData, experienceData, projectsData } from "@/data/content";

export function NoJsDetails() {
    return (
        <section className="w-full max-w-275 px-4 pb-16 sm:px-8 sm:pb-24">
            <div className="mb-12">
                <h3 className="w-full border-b border-[#3C3C3C] pb-2 text-left text-3xl font-black text-white">
                    Experience
                </h3>
                <ul className="mt-4 space-y-3">
                    {experienceData.map((item) => (
                        <li
                            key={`${item.company}-${item.duration}`}
                            className="text-left text-lg leading-relaxed font-karla text-[#E8E8E8]"
                        >
                            - {item.position} at {item.company} ({item.duration}
                            )
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mb-12">
                <h3 className="w-full border-b border-[#3C3C3C] pb-2 text-left text-3xl font-black text-white">
                    Recent Projects
                </h3>
                <ul className="mt-4 space-y-3">
                    {projectsData.map((item) => (
                        <li
                            key={item.name}
                            className="text-left text-lg leading-relaxed font-karla text-[#E8E8E8]"
                        >
                            -{" "}
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-[#666666] underline-offset-4 transition-colors hover:text-white"
                            >
                                {item.name}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mb-36">
                <h3 className="w-full border-b border-[#3C3C3C] pb-2 text-left text-3xl font-black text-white">
                    Education
                </h3>
                <ul className="mt-4 space-y-3">
                    {educationData.map((item) => (
                        <li
                            key={`${item.institution}-${item.degree}`}
                            className="text-left text-lg leading-relaxed font-karla text-[#E8E8E8]"
                        >
                            - {item.degree} in {item.field} from{" "}
                            {item.institution}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
