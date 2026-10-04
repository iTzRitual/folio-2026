import { notFound } from "next/navigation";
import RegressionLab from "./RegressionLab";

export default function RegressionLabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <RegressionLab />;
}
