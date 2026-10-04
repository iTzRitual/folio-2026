import { notFound } from "next/navigation";
import RegressionLab from "./RegressionLab";
import PortfolioFixture from "./PortfolioFixture";
import ScrollbarFixture from "./ScrollbarFixture";
import DesktopFixture from "./DesktopFixture";
import ModelFixture from "./ModelFixture";
import { bioVariants, DEFAULT_BIO_VARIANT, type BioVariant } from "@/data/content";

export default async function RegressionLabPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string; input?: string; bio?: string; quality?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  if (params.fixture === "scrollbar") return <ScrollbarFixture />;
  if (params.fixture === "desktop") return <DesktopFixture />;
  if (params.fixture === "model") return <ModelFixture initialQuality={params.quality === "low" ? "low" : "balanced"} />;
  if (params.fixture === "portfolio") {
    const bioVariant = params.bio && Object.hasOwn(bioVariants, params.bio)
      ? params.bio as BioVariant
      : DEFAULT_BIO_VARIANT;
    return (
      <PortfolioFixture
        inputMode={params.input === "coarse" ? "coarse" : "fine"}
        bioVariant={bioVariant}
      />
    );
  }
  return <RegressionLab />;
}
