import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const list = await prisma.item.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { unit: true, category: true, season: true },
  });
  return NextResponse.json(list);
}
