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
//
// `slug` and everything under it belong to the case study the row opens: the
// slug is what the URL is rewritten to, and `title` drops the " - Github" the
// row carries for the link, which has no business being the study's headline.
export const projectsData = [
    {
        name: "Folio 2026 - Github",
        link: "https://github.com/iTzRitual/folio-2026",
        preview: "/media/projects/folio-2026/teaser.svg",
        slug: "folio-2026",
        title: "Folio 2026",
        role: "Design & Engineering",
        year: "2026",
        stack: "Next.js · React Three Fiber · GSAP",
        lede: "A portfolio that looks like a flat website and is not one.",
        body: [
            "Every line of the desktop interface is drawn inside a WebGL canvas. The DOM behind it exists only as a scroll spacer and as the accessible twin of the text you are reading, kept in sync to the pixel so selection, search and screen readers still work.",
            "The wager was that a site can be built out of shaders without announcing it. No entrance flourish, no parallax for its own sake — the surface only starts behaving like an object once you touch it.",
        ],
    },
    {
        name: "Controller Configurator - Github",
        link: "https://github.com/iTzRitual/r3f-controller-configurator-2025",
        preview: "/media/projects/controller-configurator/teaser.webp",
        loop: "/media/projects/controller-configurator/teaser.mp4",
        slug: "controller-configurator",
        title: "Controller Configurator",
        role: "Solo build",
        year: "2025",
        stack: "React Three Fiber · Draco · Zustand",
        lede: "A real-time controller configurator that renders like a product shot.",
        body: [
            "Twelve interchangeable parts, six finishes and a live price, all resolved against one Draco-compressed mesh. Material swaps happen on the GPU rather than by re-uploading geometry, which is what keeps the configurator responsive on a laptop.",
            "The hard part was never the 3D. It was making a spec sheet feel like a spec sheet while the thing it describes is spinning next to it, and keeping the two in agreement at every step.",
        ],
    },
    {
        name: "Commercial Portfolio - Github",
        link: "https://github.com/iTzRitual/commercial-portfolio",
        preview: "/media/projects/commercial-portfolio/teaser.svg",
        slug: "commercial-portfolio",
        title: "Commercial Portfolio",
        role: "Frontend Engineer",
        year: "2024 — 2026",
        stack: "React · TypeScript · Liquid",
        lede: "Commercial work, stripped down to what survived contact with clients.",
        body: [
            "Storefronts, configurators and campaign pages built inside real deadlines and real CMS constraints. The pieces collected here are the ones where the brief left enough room to design the motion rather than inherit it.",
            "Shared across all of them: a component layer that outlived the campaign it was written for.",
        ],
    },
    {
        name: "Realtime Fluid Simulation - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/fluid-simulation/teaser.svg",
        slug: "fluid-simulation",
        title: "Realtime Fluid Simulation",
        role: "Research build",
        year: "2025",
        stack: "WebGL2 · GLSL · Float textures",
        lede: "Navier–Stokes in a fragment shader, at sixty frames per second.",
        body: [
            "A semi-Lagrangian advection step, a Jacobi pressure solve and a vorticity confinement pass, all running over ping-ponged float textures. The simulation grid is decoupled from the display resolution, so the fluid stays cheap while the render stays sharp.",
            "Built to understand the solver, not to ship it. The interesting failure was discovering how much of the perceived quality comes from the dye advection rather than the velocity field.",
        ],
    },
    {
        name: "WebGPU Particle System - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/webgpu-particles/teaser.svg",
        slug: "webgpu-particles",
        title: "WebGPU Particle System",
        role: "Research build",
        year: "2026",
        stack: "WebGPU · WGSL · Compute shaders",
        lede: "A million particles, sorted and simulated without touching the CPU.",
        body: [
            "Position and velocity live in storage buffers that only the compute pass writes. A spatial hash rebuilt every frame turns neighbour lookup from a quadratic problem into a bounded one, which is what makes collisions affordable at this count.",
            "WebGPU's explicitness is the point: the bind group layout forces you to state what the GPU is allowed to see, and most of the bugs disappeared with it.",
        ],
    },
    {
        name: "Procedural Terrain Generator - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/procedural-terrain/teaser.svg",
        slug: "procedural-terrain",
        title: "Procedural Terrain Generator",
        role: "Solo build",
        year: "2025",
        stack: "Three.js · GLSL · Web Workers",
        lede: "Infinite terrain, generated as you fly over it.",
        body: [
            "Chunks are meshed off the main thread from layered simplex noise, streamed in around the camera and retired behind it. Level of detail is chosen per chunk against screen-space error, so the horizon costs almost nothing and the ground under you costs what it should.",
            "Erosion came last and changed everything — a landscape reads as a place only once water has been over it.",
        ],
    },
    {
        name: "Shader Playground - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/shader-playground/teaser.svg",
        slug: "shader-playground",
        title: "Shader Playground",
        role: "Solo build",
        year: "2024",
        stack: "GLSL · CodeMirror · Vite",
        lede: "A shader editor that recompiles between keystrokes.",
        body: [
            "Compilation is debounced against the parse, not the keypress, and the previous program stays bound until the new one links cleanly — so a syntax error mid-word never blanks the canvas you are working against.",
            "Uniforms are discovered from the source and given controls automatically. Writing a slider by hand is the fastest way to stop experimenting.",
        ],
    },
    {
        name: "Motion Design System - Github",
        link: "https://github.com/iTzRitual",
        preview: "/media/projects/motion-design-system/teaser.svg",
        slug: "motion-design-system",
        title: "Motion Design System",
        role: "Design Engineering",
        year: "2026",
        stack: "React · CSS custom properties · Framer Motion",
        lede: "One motion language, expressed as tokens instead of opinions.",
        body: [
            "Durations, easings and travel distances live as named tokens, so a card, a sheet and a toast can share a personality without sharing an implementation. Reduced motion is a branch in the token layer rather than a special case in every component.",
            "The system's real output is not the components. It is that two engineers reaching for an entrance animation now reach for the same one.",
        ],
    },
] as const;

export type CaseStudy = (typeof projectsData)[number];

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
