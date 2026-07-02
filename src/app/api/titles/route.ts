import { NextRequest, NextResponse } from "next/server";
import { getFilteredTitles } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const type = searchParams.get("type") || undefined;
    const year = searchParams.get("year") || undefined;
    const genre = searchParams.get("genre") || undefined;
    const country = searchParams.get("country") || undefined;
    const rating = searchParams.get("rating") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const sortBy = (searchParams.get("sortBy") as any) || "title";
    const sortOrder = (searchParams.get("sortOrder") as any) || "asc";

    const results = getFilteredTitles({
      type,
      year,
      genre,
      country,
      rating,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("API error fetching titles:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
