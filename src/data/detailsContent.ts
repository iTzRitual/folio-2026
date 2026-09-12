import {
  coursesData,
  educationData,
  experienceData,
  projectsData,
  skillsData,
} from "@/data/content";

export const DETAILS_SECTION_KEYS = [
  "experience",
  "skills",
  "projects",
  "education",
  "courses",
  "bio",
] as const;

export type DetailsSectionKey = (typeof DETAILS_SECTION_KEYS)[number];
export type DetailsListSectionKey = Exclude<DetailsSectionKey, "bio">;

type DetailsSectionContent = {
  heading: string;
  wideLines: readonly string[];
  narrowLines: readonly string[];
};

const experienceLines = experienceData.map(
  (item) => `${item.duration} / ${item.position} @ ${item.company}`,
);
const educationLines = educationData.map(
  (item) => `${item.field} (${item.degree}) @ ${item.institution}`,
);
const courseLines = coursesData.map(
  (item) => `${item.date} / ${item.title} @ ${item.issuer}`,
);

export const DETAILS_SECTION_CONTENT = {
  experience: {
    heading: "Experience",
    wideLines: experienceLines,
    narrowLines: experienceLines,
  },
  skills: {
    heading: "Skills",
    wideLines: skillsData,
    narrowLines: skillsData,
  },
  projects: {
    heading: "Featured Projects",
    wideLines: projectsData.map((item) => item.name),
    narrowLines: projectsData.map((item) => item.title),
  },
  education: {
    heading: "Education",
    wideLines: educationLines,
    narrowLines: educationLines,
  },
  courses: {
    heading: "Courses\n& Certifications",
    wideLines: courseLines,
    narrowLines: courseLines,
  },
} satisfies Record<DetailsListSectionKey, DetailsSectionContent>;

export const DETAILS_SECTION_HEADINGS: Record<DetailsSectionKey, string> = {
  experience: DETAILS_SECTION_CONTENT.experience.heading,
  skills: DETAILS_SECTION_CONTENT.skills.heading,
  projects: DETAILS_SECTION_CONTENT.projects.heading,
  education: DETAILS_SECTION_CONTENT.education.heading,
  courses: DETAILS_SECTION_CONTENT.courses.heading,
  bio: "About me",
};

export const WIDE_STACKED_SECTION_KEYS = [
  "experience",
  "projects",
  "education",
  "courses",
] as const satisfies readonly DetailsListSectionKey[];
