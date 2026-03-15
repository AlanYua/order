import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT = "常用換算：1斤＝600g、1包＝1份、1顆＝1粒、1把＝約300g";

export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: "unit_conversion" } });
  const text = row?.value ?? DEFAULT;
  return NextResponse.json({ text });
}
