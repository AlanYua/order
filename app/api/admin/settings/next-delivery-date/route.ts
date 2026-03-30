import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getNextDeliverableYYYYMMDDLocal } from "@/lib/nextDeliveryDate";

export const dynamic = "force-dynamic";

export async function GET() {
  const err = await requireAdmin();
  if (err) return err;
  const date = await getNextDeliverableYYYYMMDDLocal();
  return NextResponse.json({ date });
}

