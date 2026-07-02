import { NextRequest, NextResponse } from "next/server";

const personCache = new Map<string, any>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const cacheKey = `${name.toLowerCase().trim()}_${request.nextUrl.searchParams.get("details") === "true" ? "details" : "basic"}`;
    if (personCache.has(cacheKey)) {
      return NextResponse.json(personCache.get(cacheKey));
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "TMDb API Key missing" }, { status: 500 });
    }

    // Search person on TMDb to get ID
    const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(name)}`;
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error("TMDb API error");
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      const emptyPayload = { matched: false, name, profile_url: null, popularity: 0 };
      personCache.set(cacheKey, emptyPayload);
      return NextResponse.json(emptyPayload);
    }

    const bestMatch = data.results[0];
    const personId = bestMatch.id;

    const isDetailsRequest = request.nextUrl.searchParams.get("details") === "true";

    if (!isDetailsRequest) {
      const basicPayload = {
        matched: true,
        id: personId,
        name: bestMatch.name,
        profile_url: bestMatch.profile_path ? `https://image.tmdb.org/t/p/w185${bestMatch.profile_path}` : null,
        popularity: bestMatch.popularity,
        known_for_department: bestMatch.known_for_department,
        known_for: bestMatch.known_for || []
      };
      personCache.set(cacheKey, basicPayload);
      return NextResponse.json(basicPayload);
    }

    // Fetch full details (biography, birthday, birthplace, gender, images, credits)
    const detailsUrl = `https://api.themoviedb.org/3/person/${personId}?api_key=${apiKey}&append_to_response=combined_credits,images`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) throw new Error("TMDb details API error");
    const detailsData = await detailsRes.json();

    const genderMap: Record<number, string> = {
      0: "Not specified",
      1: "Female",
      2: "Male",
      3: "Non-binary"
    };

    const detailsPayload = {
      matched: true,
      id: personId,
      name: detailsData.name,
      profile_url: detailsData.profile_path ? `https://image.tmdb.org/t/p/h632${detailsData.profile_path}` : null,
      profile_images: (detailsData.images?.profiles || []).slice(0, 8).map((img: any) => `https://image.tmdb.org/t/p/h632${img.file_path}`),
      popularity: detailsData.popularity,
      known_for_department: detailsData.known_for_department,
      birthday: detailsData.birthday || null,
      place_of_birth: detailsData.place_of_birth || null,
      biography: detailsData.biography || "Biography details not available on TMDb.",
      gender: genderMap[detailsData.gender] || "Not specified",
      combined_credits: (detailsData.combined_credits?.cast || []).concat(detailsData.combined_credits?.crew || [])
    };

    personCache.set(cacheKey, detailsPayload);
    return NextResponse.json(detailsPayload);
  } catch (err: any) {
    console.error("Person API route error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
