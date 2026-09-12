import assert from "node:assert/strict";
import {
  DETAILS_SECTION_CONTENT,
  DETAILS_SECTION_HEADINGS,
  DETAILS_SECTION_KEYS,
} from "../src/data/detailsContent";
import { projectsData } from "../src/data/content";
import { calculateDetailsLayout } from "../src/lib/detailsLayout";

for (const [viewportWidth, viewportHeight] of [
  [1440, 900],
  [600, 900],
  [900, 500],
] as const) {
  const layout = calculateDetailsLayout({ viewportWidth, viewportHeight });
  for (const key of DETAILS_SECTION_KEYS) {
    const section = layout.sections[key];
    assert(Number.isFinite(section.headingY));
    assert(section.bodyY >= section.headingY);
    assert(section.bottomY >= section.bodyY);
    assert(DETAILS_SECTION_HEADINGS[key].length > 0);
  }
  for (const key of Object.keys(DETAILS_SECTION_CONTENT) as Array<
    keyof typeof DETAILS_SECTION_CONTENT
  >) {
    assert(layout.sectionLines[key].length > 0);
  }
  assert.equal(layout.sectionLines.projects.length, projectsData.length);
  assert(layout.contentHeight > 0);
  assert(layout.overflow >= 0);
}

console.log(
  "PASS: typed detail sections produce complete wide, narrow, and compact layouts.",
);
