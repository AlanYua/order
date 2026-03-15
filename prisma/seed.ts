import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash: hash },
  });

  let cat1 = await prisma.category.findFirst({ where: { name: "葉菜" } });
  if (!cat1) cat1 = await prisma.category.create({ data: { name: "葉菜" } });
  let cat2 = await prisma.category.findFirst({ where: { name: "根莖" } });
  if (!cat2) cat2 = await prisma.category.create({ data: { name: "根莖" } });

  let s1 = await prisma.season.findFirst({ where: { name: "春季" } });
  if (!s1) s1 = await prisma.season.create({ data: { name: "春季" } });
  let s2 = await prisma.season.findFirst({ where: { name: "夏季" } });
  if (!s2) s2 = await prisma.season.create({ data: { name: "夏季" } });

  let sup = await prisma.supplier.findFirst({ where: { name: "綠田農產" } });
  if (!sup) sup = await prisma.supplier.create({ data: { name: "綠田農產", contact: "0912345678" } });

  let u1 = await prisma.unit.findFirst({ where: { name: "斤" } });
  if (!u1) u1 = await prisma.unit.create({ data: { name: "斤" } });
  await prisma.unit.findFirst({ where: { name: "包" } }).then((u) => u ?? prisma.unit.create({ data: { name: "包" } }));
  await prisma.unit.findFirst({ where: { name: "顆" } }).then((u) => u ?? prisma.unit.create({ data: { name: "顆" } }));

  const existingItem = await prisma.item.findFirst({ where: { name: "高麗菜" } });
  if (!existingItem) {
    await prisma.item.create({
      data: {
        name: "高麗菜",
        unitId: u1.id,
        categoryId: cat1.id,
        seasonId: s1.id,
        supplierId: sup.id,
        active: true,
      },
    });
  }
  const existingItem2 = await prisma.item.findFirst({ where: { name: "地瓜" } });
  if (!existingItem2) {
    await prisma.item.create({
      data: {
        name: "地瓜",
        unitId: u1.id,
        categoryId: cat2.id,
        seasonId: s2.id,
        supplierId: sup.id,
        active: true,
      },
    });
  }

  await prisma.setting.upsert({
    where: { key: "announcement" },
    update: {},
    create: {
      key: "announcement",
      value: "歡迎訂購，請於訂購日期前一日完成下單。\n若有特殊需求或疑問請來電告知。",
    },
  });
  await prisma.setting.upsert({
    where: { key: "unit_conversion" },
    update: {},
    create: {
      key: "unit_conversion",
      value: "常用換算：1斤＝600g、1包＝1份、1顆＝1粒、1把＝約300g",
    },
  });

  console.log("Seed done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
