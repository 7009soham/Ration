import db from "../../src/config/database";

async function run() {
  try {
    console.log("🔧 Patching verification_codes.code column to VARCHAR(255)...");
    await db.execute(
      "ALTER TABLE verification_codes MODIFY code VARCHAR(255) NOT NULL;"
    );
    console.log("✅ Patch applied successfully.");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Patch failed:", err.message);
    process.exit(1);
  }
}

run();
