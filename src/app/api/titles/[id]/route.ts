import { NextRequest, NextResponse } from "next/server";
import { getTitleDetails } from "@/lib/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const details = getTitleDetails(id);
    
    if (!details) {
      return NextResponse.json({ error: "Title not found" }, { status: 404 });
    }
    
    return NextResponse.json(details);
  } catch (error) {
    console.error("API error fetching single title details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
