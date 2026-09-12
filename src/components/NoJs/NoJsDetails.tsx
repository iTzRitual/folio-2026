import Image from "next/image";
import {
    bioData,
    bioImage,
    educationData,
    coursesData,
    experienceData,
    projectsData,
    skillsData,
} from "@/data/content";
import { DETAILS_SECTION_HEADINGS } from "@/data/detailsContent";

export function NoJsDetails() {
    return (
        <section className="w-full max-w-275 px-4 pb-16 sm:px-8 sm:pb-24">
            <div className="mb-12">
                <h3 className="w-full border-b border-(--border) pb-2 text-left text-3xl font-black text-(--text-primary)">
                    {DETAILS_SECTION_HEADINGS.experience}
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
                    {DETAILS_SECTION_HEADINGS.projects}
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
                    {DETAILS_SECTION_HEADINGS.education}
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

            <div className="mb-12">
                <h3 className="w-full border-b border-(--border) pb-2 text-left text-3xl font-black text-(--text-primary)">
                    {DETAILS_SECTION_HEADINGS.courses.replace("\n", " ")}
                </h3>
                <ul className="mt-4 space-y-3">
                    {coursesData.map((item) => (
                        <li
                            key={`${item.title}-${item.issuer}`}
                            className="text-left text-lg leading-relaxed font-karla text-(--text-body)"
                        >
                            - {item.title} @ {item.issuer} ({item.date})
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mb-12">
                <h3 className="w-full border-b border-(--border) pb-2 text-left text-3xl font-black text-(--text-primary)">
                    {DETAILS_SECTION_HEADINGS.skills}
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {skillsData.map((skill) => (
                        <li
                            key={skill}
                            className="text-left text-lg leading-relaxed font-karla text-(--text-body)"
                        >
                            - {skill}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mb-36">
                <h3 className="w-full border-b border-(--border) pb-2 text-left text-3xl font-black text-(--text-primary)">
                    {DETAILS_SECTION_HEADINGS.bio}
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
                    width={960}
                    height={1280}
                    className="mt-6 h-auto w-full max-w-64"
                />
            </div>
        </section>
    );
}
