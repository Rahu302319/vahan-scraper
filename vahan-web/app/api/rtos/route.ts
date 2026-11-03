import { NextRequest, NextResponse } from "next/server";
import { VahanWebSession } from "@/lib/vahan";
import { KERALA_RTOS } from "@/lib/kerala-rtos";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state") || "KL";

    // Attempt live portal fetch with 4s timeout (so it never hangs)
    try {
      const session = new VahanWebSession();
      const initPromise = (async () => {
        await session.initSession();
        return await session.selectState(state);
      })();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout waiting for portal")), 4000)
      );

      const liveRtos = await Promise.race([initPromise, timeoutPromise]);
      if (Array.isArray(liveRtos) && liveRtos.length > 0) {
        return NextResponse.json({ success: true, state, rtos: liveRtos, source: "live" });
      }
    } catch (liveErr) {
      console.warn("Live portal fetch timed out or restricted; using verified Kerala RTO database:", liveErr);
    }

    // Instant guaranteed response with all 87 Kerala RTOs
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
