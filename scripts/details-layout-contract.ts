import { bioVariants, projectsData, type BioVariant } from "../src/data/content";
import {
  DETAILS_SECTION_CONTENT,
  DETAILS_SECTION_HEADINGS,
  DETAILS_SECTION_KEYS,
  WIDE_STACKED_SECTION_KEYS,
  type DetailsListSectionKey,
} from "../src/data/detailsContent";
import { calculateDetailsLayout } from "../src/lib/detailsLayout";

export const detailsLayoutViewports = [
  [320, 568], [568, 320], [390, 844], [430, 932],
  [600, 900], [768, 1024], [900, 500], [1024, 768],
  [1440, 900], [1920, 1080],
] as const;

export function checkDetailsLayout(fontsReady = false) {
  let scenarios = 0;
  for (const [viewportWidth, viewportHeight] of detailsLayoutViewports) {
    for (const bioVariant of Object.keys(bioVariants) as BioVariant[]) {
      const label = `${viewportWidth}×${viewportHeight}, ${bioVariant}`;
      const assert = (condition: boolean, message: string) => {
        if (!condition) throw new Error(`${label}: ${message}`);
      };
      const layout = calculateDetailsLayout({ viewportWidth, viewportHeight, bioVariant, fontsReady });
      for (const key of DETAILS_SECTION_KEYS) {
        const section = layout.sections[key];
        assert(Object.values(section).every(Number.isFinite), `${key} has finite geometry`);
        assert(section.bodyY >= section.headingY && section.bottomY >= section.bodyY, `${key} preserves vertical order`);
        assert(DETAILS_SECTION_HEADINGS[key].length > 0, `${key} has a heading`);
      }
      for (const key of Object.keys(DETAILS_SECTION_CONTENT) as DetailsListSectionKey[]) {
        assert(layout.sectionLines[key].length > 0, `${key} preserves its copy`);
      }
      const order: readonly DetailsListSectionKey[] = layout.layoutMode === "wide"
        ? WIDE_STACKED_SECTION_KEYS
        : ["experience", "skills", "projects", "achievements", "education", "courses"];
      for (let index = 1; index < order.length; index++) {
        assert(layout.sections[order[index]].headingY > layout.sections[order[index - 1]].bottomY, `${order[index]} clears the previous section`);
      }
      const detailsBottom = Math.max(...order.map(key => layout.sections[key].bottomY), layout.sections.skills.bottomY);
      assert(layout.sections.bio.headingY > detailsBottom, "Bio reads as a separate screen");
      assert(layout.bioImageWidth > 0 && layout.bioImageHeight > 0 && layout.bioLines.length > 0, "Bio retains its image and copy");
      assert(layout.bioImageY + layout.bioImageHeight <= layout.contentHeight, "Bio image stays within the scroll extent");
      assert(layout.contentHeight <= layout.overflow + layout.usableHeight + 1e-6, "The scroll extent includes all content");
      assert(layout.overflow >= 0 && Number.isFinite(layout.overflow), "Overflow is finite and nonnegative");
      assert(layout.sectionLines.projects.length === projectsData.length, "All project rows are present");
      if (layout.layoutMode === "narrow") {
        assert(layout.modelAnchorY - layout.modelInterludeHeight / 2 > layout.sections.skills.bottomY, "Model interlude clears skills");
        assert(layout.modelAnchorY + layout.modelInterludeHeight / 2 < layout.sections.projects.headingY, "Model interlude clears projects");
        assert(layout.sections.bio.bodyY > layout.bioImageY + layout.bioImageHeight, "Bio copy clears the stacked image");
      }
      scenarios++;
    }
  }
  return `PASS: ${scenarios} layout scenarios preserve section clearance, model interludes, Bio separation and complete scroll extents (${fontsReady ? "loaded fonts" : "estimated metrics"}).`;
}
