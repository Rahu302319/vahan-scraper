import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetDir } = body;

    if (process.platform === "win32") {
      const outDir = targetDir && targetDir.trim()
        ? path.resolve(targetDir.trim())
        : path.resolve(process.cwd(), "output");

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      exec(`explorer.exe "${outDir}"`);
      return NextResponse.json({ success: true, openedPath: outDir });
    } else {
      // Cloud hosting (Vercel/Linux)
      return NextResponse.json({
        success: true,
        isCloud: true,
        message: "Running in Cloud Mode: Files are saved to your selected local folder or browser downloads.",
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to open folder" },
      { status: 500 }
    );
  }
}
