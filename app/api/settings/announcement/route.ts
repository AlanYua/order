import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT = "歡迎訂購，請於訂購日期前一日完成下單。\n若有特殊需求或疑問請來電告知。";

export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: "announcement" } });
  const text = row?.value ?? DEFAULT;
  return NextResponse.json({ text });
}
