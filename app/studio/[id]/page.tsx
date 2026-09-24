import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "../../lib/line";
import { getMockup } from "../../lib/mockups";
import MockupSite from "./MockupSite";
import StudioBar from "./StudioBar";
import "../../pro.css";
import "../studio.css";

export const dynamic = "force-dynamic";
export const preferredRegion = ["sin1"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = await getMockup((await params).id);
  return { title: m ? `${m.brand} — ออกแบบโดย AI · IASROM-DEV` : "AI Studio · IASROM-DEV", robots: { index: false, follow: false } };
}

export default async function MockupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMockup(id);
  if (!m) notFound();
  const url = `${SITE}/studio/${m.id}`;
  const lineMsg = `สนใจทำเว็บแบบนี้ครับ 👉 ${url}`;
  return <main className="studio-view">
    <StudioBar url={url} lineUrl={`https://line.me/R/oaMessage/%40891dpcst/?${encodeURIComponent(lineMsg)}`}>
      <MockupSite m={m} />
    </StudioBar>
  </main>;
}
