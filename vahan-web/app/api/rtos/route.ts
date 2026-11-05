import { NextRequest, NextResponse } from "next/server";
import { KERALA_RTOS } from "@/lib/kerala-rtos";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      state: "KL",
      rtos: KERALA_RTOS,
      source: "verified_catalog",
    });
  } catch (error: any) {
    console.error("API /api/rtos error:", error);
    return NextResponse.json({
      success: true,
      state: "KL",
      rtos: KERALA_RTOS,
      source: "fallback",
    });
  }
}
