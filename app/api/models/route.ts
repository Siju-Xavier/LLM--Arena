import { getFreeModels } from "@/app/arena/lib/models";

export async function GET() {
  try {
    const models = await getFreeModels();

    return Response.json(
      { models },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (error) {
    console.error("[models route] OpenRouter catalog error:", error);
    return Response.json(
      { error: "The model list is unavailable right now. Please try again." },
      { status: 502 }
    );
  }
}
