export const heroContent = {
    title: "Natan Mokrzycki",
    subtitle:
        "Bridging the gap between performance and high-end visual aesthetics.",
    professions: ["Frontend Engineer", "Creative Technologist"],
    scrollHint: "Scroll to explore CV",
} as const;

export const headerContent = {
    coordinates: "51.10°N 17.03°E",
    availability: "Available for work",
    themeOptions: ["Light", "Dark"] as const,
    themeSeparator: "/",
    timeZone: "Europe/Warsaw",
    contact: {
        label: "Contact",
        href: "mailto:hello@natanmokrzycki.com",
    },
} as const;

export type ThemeOption = (typeof headerContent.themeOptions)[number];

export const experienceData = [
    {
        company: "Nowa Łukasz Walter",
        position: "Fullstack Engineer",
        duration: "2026 - Present",
    },
    {
        company: "Nowa Łukasz Walter",
        position: "Frontend Engineer",
        duration: "2024 - 2026",
    },
    {
        company: "Galactic Reborn",
        position: "Co-Founder",
        duration: "2023 - 2024",
    },
    {
        company: "Nowa Łukasz Walter",
        position: "Frontend Developer",
        duration: "2020 - 2024",
    },
    {
        company: "Nowa Łukasz Walter",
        position: "Ecommerce Specialist",
        duration: "2018 - 2020",
    },
] as const;
// Every project owns a folder under /media/projects/<slug>/. `preview` is the
// still the plate shows the moment a row is hovered, authored at 1280x800 to
// match CONFIG.projectPreview.ASPECT; `loop` is an optional muted video that
// takes the plate over once it has a frame to show. The remaining .svg files
// are placeholders — drop a teaser.webp in beside them to replace one.
export const projectsData = [
    {
        name: "Folio 2026 - Github",
        link: "https://github.com/iTzRitual/folio-2026",
        preview: "/media/projects/folio-2026/teaser.svg",
    },
    {
        name: "Controller Configurator - Github",
        link: "https://github.com/iTzRitual/r3f-controller-configurator-2025",
        preview: "/media/projects/controller-configurator/teaser.webp",
        loop: "/media/projects/controller-configurator/teaser.mp4",
    },
    {
        name: "Commercial Portfolio - Github",
        link: "https://github.com/iTzRitual/commercial-portfolio",
        preview: "/media/projects/commercial-portfolio/teaser.svg",
    },
    {
        name: "Realtime Fluid Simulation - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/fluid-simulation/teaser.svg",
    },
    {
        name: "WebGPU Particle System - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/webgpu-particles/teaser.svg",
    },
    {
        name: "Procedural Terrain Generator - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/procedural-terrain/teaser.svg",
    },
    {
        name: "Shader Playground - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/shader-playground/teaser.svg",
    },
    {
        name: "Motion Design System - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/motion-design-system/teaser.svg",
    },
] as const;

export const PROJECT_PREVIEW_SOURCES = projectsData.map(
    (project) => project.preview,
);

export const PROJECT_LOOP_SOURCES = Object.fromEntries(
    projectsData.flatMap((project) =>
        "loop" in project ? [[project.preview, project.loop] as const] : [],
    ),
) as Record<string, string | undefined>;
export const educationData = [
    {
        institution: "DSW University of Lower Silesia",
        degree: "Master's degree",
        field: "Creative Media: 3D Animation",
    },
    {
        institution: "WSB Merito University Wroclaw",
        degree: "Bachelor of Engineering",
        field: "Computer Science",
    },
] as const;

export const coursesData = [
    {
        title: "Animations on the Web - Advanced Interactions",
        issuer: "Emil Kowalski",
        date: "In progress",
    },
    {
        title: "Three.js Journey – Creative 3D Web Development",
        issuer: "Bruno Simon",
        date: "In progress",
    },
    {
        title: "Enterprise React & Architecture",
        issuer: "zrozumiecreact.pl",
        date: "2026",
    },
    {
        title: "Front-End & Business – Corporate Workflows",
        issuer: "Accenture",
        date: "2024",
    },
    {
        title: "Web Penetration Testing – Security Audit & Pentesting",
        issuer: "EY",
        date: "2023",
    },
] as const;

export const bioVariants = {
    narrative: [
        "My tech journey started early—entering the e-commerce space at 17, which quickly evolved into a passion for frontend engineering, UI design in Figma, and fullstack architecture. Driven by a long-standing fascination with Awwwards-level interactive design, I shifted my focus toward creative technology, blending performance with rich visual aesthetics.",
        "My creative eye was originally shaped outside of web dev through video editing—specifically crafting gameplay montages (huge Gears of War fan). When I'm not pushing pixels or shaders, you'll find me skateboarding, hitting the slopes on a snowboard, or gaming.",
    ],
    manifesto: [
        "I build interfaces that behave like objects, not documents.",
        "Ten years between commercial ecommerce and real-time 3D.",
        "I care about the frame budget as much as the typography.",
        "Currently exploring WebGPU and procedural geometry.",
    ],
    facts: [
        "Based in / Wrocław, Poland",
        "Focus / Real-time 3D, WebGL, creative frontend",
        "Toolkit / React, Three.js, GSAP, Blender",
        "Open to / Freelance and full-time roles",
        "Contact / hello@natanmokrzycki.com",
    ],
} as const;

export const bioImage = {
    src: "/images/natan_bio.JPG",
    alt: "Natan Mokrzycki standing on a beach at night, city lights behind him",
} as const;

export type BioVariant = keyof typeof bioVariants;

export const DEFAULT_BIO_VARIANT: BioVariant = "narrative";

export const bioData = bioVariants[DEFAULT_BIO_VARIANT];

export const skillsData = [
    "Visual Design",
    "UI/UX Design",
    "React",
    "React Native",
    "Three.js",
    "React Three Fiber",
    "GSAP",
    "Blender",
    "JavaScript",
    "TypeScript",
    "Liquid",
    "Figma",
    "After Effects",
] as const;
