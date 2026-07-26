export const heroContent = {
    title: "Natan Mokrzycki",
    subtitle:
        "Bridging the gap between performance and high-end visual aesthetics.",
    professions: ["Frontend Engineer", "Creative Technologist"],
    scrollHint: "Scroll to explore CV",
} as const;

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
export const projectsData = [
    {
        name: "Folio 2026 - Github",
        link: "https://github.com/iTzRitual/folio-2026"
    },
    {
        name: "Controller Configurator - Github",
        link: "https://github.com/iTzRitual/r3f-controller-configurator-2025"
    },
    {
        name: "Commercial Portfolio - Github",
        link: "https://github.com/iTzRitual/commercial-portfolio"
    },
    {
        name: "Realtime Fluid Simulation - Github",
        link: "https://github.com/iTzRitual"
    },
    {
        name: "WebGPU Particle System - Github",
        link: "https://github.com/iTzRitual"
    },
    {
        name: "Procedural Terrain Generator - Github",
        link: "https://github.com/iTzRitual"
    },
    {
        name: "Shader Playground - Github",
        link: "https://github.com/iTzRitual"
    },
    {
        name: "Motion Design System - Github",
        link: "https://github.com/iTzRitual"
    },
] as const;
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
