import { redirect } from "next/navigation";
import { projectsData } from "@/data/content";
import Home from "../../page";

export function generateStaticParams() {
    return projectsData.map(({ slug }) => ({ slug }));
}

export default async function ProjectPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    if (!projectsData.some((project) => project.slug === slug)) redirect("/");
    return <Home />;
}
