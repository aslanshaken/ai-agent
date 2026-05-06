import type { Metadata } from "next";
import { HomeLanding } from "@/components/landing/home-landing";

export const metadata: Metadata = {
  title: "Build Your Own AI Agents",
  description: "Operational AI agent workflows.",
};

export default function HomePage() {
  return <HomeLanding />;
}
