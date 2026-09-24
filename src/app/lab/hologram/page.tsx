import { notFound } from "next/navigation";
import HologramLab from "./HologramLab";

export default function HologramLabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <HologramLab />;
}
