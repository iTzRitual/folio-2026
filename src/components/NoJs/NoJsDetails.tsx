import Image from "next/image";
import {
    bioData,
    bioImage,
    educationData,
    experienceData,
    projectsData,
} from "@/data/content";

export function NoJsDetails() {
    return (
        <section className="w-full max-w-275 px-4 pb-16 sm:px-8 sm:pb-24">
            <div className="mb-12">
                <h3 className="w-full border-b border-(--border) pb-2 text-left text-3xl font-black text-(--text-primary)">
                    Experience
                </h3>
                <ul className="mt-4 space-y-3">
                    {experienceData.map((item) => (
                        <li
                            key={`${item.company}-${item.duration}`}
                            className="text-left text-lg leading-relaxed font-karla text-(--text-body)"
                        >
                            - {item.position} at {item.company} ({item.duration}
                            )
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mb-12">
                <h3 className="w-full border-b border-(--border) pb-2 text-left text-3xl font-black text-(--text-primary)">
                    Recent Projects
                </h3>
                <ul className="mt-4 space-y-3">
                    {projectsData.map((item) => (
                        <li
                            key={item.name}
                            className="text-left text-lg leading-relaxed font-karla text-(--text-body)"
                        >
                            -{" "}
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-(--text-hint) underline-offset-4 transition-colors hover:text-(--text-primary)"
                            >
                                {item.name}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mb-12">
                <h3 className="w-full border-b border-(--border) pb-2 text-left text-3xl font-black text-(--text-primary)">
                    Education
                </h3>
                <ul className="mt-4 space-y-3">
                    {educationData.map((item) => (
                        <li
                            key={`${item.institution}-${item.degree}`}
                            className="text-left text-lg leading-relaxed font-karla text-(--text-body)"
                        >
                            - {item.degree} in {item.field} from{" "}
                            {item.institution}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mb-36">
                <h3 className="w-full border-b border-(--border) pb-2 text-left text-3xl font-black text-(--text-primary)">
                    Bio
                </h3>
                {bioData.map((paragraph, index) => (
                    <p
                        key={index}
                        className="mt-4 max-w-176 text-left text-lg leading-relaxed font-karla text-(--text-body)"
                    >
                        {paragraph}
                    </p>
                ))}
                <Image
                    src={bioImage.src}
                    alt={bioImage.alt}
                    width={1500}
                    height={2000}
                    className="mt-6 h-auto w-full max-w-64"
                />
            </div>
        </section>
    );
}
