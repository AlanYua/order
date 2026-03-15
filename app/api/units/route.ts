import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const list = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(list);
}
