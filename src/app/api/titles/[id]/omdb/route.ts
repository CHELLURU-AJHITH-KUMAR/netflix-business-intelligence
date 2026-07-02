import { NextRequest, NextResponse } from "next/server";
import { getTitleDetails } from "@/lib/data";
import { fetchOmdbData } from "@/lib/omdb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const queryImdbId = searchParams.get("imdbId");

    const catalogItem = getTitleDetails(showId);
    if (!catalogItem) {
      return NextResponse.json({ error: "Title not found in catalog" }, { status: 404 });
    }

    const { title, release_year, type } = catalogItem;

    // Use the query parameter imdbId if provided, otherwise fetch by title details
    const omdbData = await fetchOmdbData(
      title,
      release_year,
      type,
      queryImdbId || null
    );

    if (!omdbData) {
      return NextResponse.json({
        matched: false,
        title,
        release_year,
        type,
      });
    }

    return NextResponse.json({
      matched: true,
      ...omdbData,
    });
  } catch (error) {
    console.error("Failed to fetch OMDb details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
