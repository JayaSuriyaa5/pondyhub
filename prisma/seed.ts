import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultCategories } from "../src/lib/siteConfig";
import { slugify } from "../src/lib/slugify";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PondyHub database...");

  // --------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------
  for (const category of defaultCategories) {
    const slug = slugify(category.name);
    await prisma.category.upsert({
      where: { slug },
      update: {
        name: category.name,
        description: category.description,
      },
      create: {
        name: category.name,
        slug,
        description: category.description,
      },
    });
  }
  console.log(`Seeded ${defaultCategories.length} categories.`);

  // --------------------------------------------------------------------
  // Admin user (only created if it doesn't already exist)
  // --------------------------------------------------------------------
  const adminEmail = "admin@pondyhub.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
    await prisma.user.create({
      data: {
        username: "pondyhub_admin",
        email: adminEmail,
        passwordHash,
        displayName: "PondyHub Admin",
        role: "ADMIN",
        bio: "Official PondyHub administrator account.",
      },
    });
    console.log("Created default admin user:");
    console.log("  email:    admin@pondyhub.com");
    console.log("  password: ChangeMe123!");
    console.log("  ⚠ Change this password immediately after first login.");
  } else {
    console.log("Admin user already exists, skipping.");
  }

  console.log("Seeding complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
