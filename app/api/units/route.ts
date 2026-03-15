import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(list);
}
