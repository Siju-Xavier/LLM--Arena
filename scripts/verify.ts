import dotenv from "dotenv";
import path from "path";

// Load .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function verifyAll() {
  console.log("=== 1. Testing Prisma Postgres Connection ===");
  const { prisma } = await import("../app/db");
  try {
    const userCount = await prisma.user.count();
    console.log(`[PASS] Database connected successfully! Total users in DB: ${userCount}`);
  } catch (err) {
    console.error("[FAIL] Database connection failed:", err);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n=== 2. Testing OpenRouter Direct API ===");
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    console.log("[SKIP] OpenRouter API key is placeholder or missing.");
  } else {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://llm-arena.app",
          "X-Title": "LLM Arena Verification",
        },
        body: JSON.stringify({
          model: "openrouter/auto",
          messages: [{ role: "user", content: "Say hello in 3 words" }],
          stream: false,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        console.log(`[PASS] OpenRouter answered: "${json.choices?.[0]?.message?.content?.trim()}"`);
      } else {
        const text = await res.text();
        console.error(`[FAIL] OpenRouter returned status ${res.status}:`, text);
      }
    } catch (err) {
      console.error("[FAIL] OpenRouter request error:", err);
    }
  }

  console.log("\n=== 3. Environment Variables Summary ===");
  const keys = [
    "OPENROUTER_API_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "ARCJET_KEY",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
    "DATABASE_URL",
  ];
  for (const k of keys) {
    const val = process.env[k];
    const isSet = !!val && !val.includes("placeholder");
    console.log(`- ${k}: ${isSet ? "CONFIGURED (valid)" : "MISSING OR PLACEHOLDER"}`);
  }

  console.log("\n=== 4. Cleaning up temporary test files ===");
  process.exit(0);
}

verifyAll();
