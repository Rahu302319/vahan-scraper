import { NextRequest, NextResponse } from "next/server";
import { VahanWebSession } from "@/lib/vahan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state") || "KL";

    const session = new VahanWebSession();
    await session.initSession();
    const rtos = await session.selectState(state);

    return NextResponse.json({ success: true, state, rtos });
  } catch (error: any) {
    console.error("API /api/rtos error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch RTO list." },
      { status: 500 }
    );
  }
}

