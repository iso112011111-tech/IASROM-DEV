import type { Metadata } from "next";
import { cookies } from "next/headers";
import { adminConfigured, readSession, SESSION_COOKIE } from "../lib/adminAuth";
import AdminApp from "./AdminApp";
import AdminLogin from "./AdminLogin";
import "./admin.css";

export const metadata: Metadata = {
  title: "หลังบ้าน · IASROM-DEV",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return session ? <AdminApp me={session.name} /> : <AdminLogin configured={adminConfigured()} />;
}
