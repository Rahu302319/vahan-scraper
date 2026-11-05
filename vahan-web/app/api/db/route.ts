import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import defaultOemDb from "@/lib/oem-db.json";
import defaultRtoDt from "@/lib/rto-dt.json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "oem";

    if (type === "oem") {
      const filePath = path.join(process.cwd(), "lib", "oem-db.json");
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return NextResponse.json({ success: true, data: JSON.parse(content) });
      }
      return NextResponse.json({ success: true, data: defaultOemDb });
    } else {
      const filePath = path.join(process.cwd(), "lib", "rto-dt.json");
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return NextResponse.json({ success: true, data: JSON.parse(content) });
      }
      return NextResponse.json({ success: true, data: defaultRtoDt });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = "oem", data } = body;

    if (!Array.isArray(data)) {
      return NextResponse.json({ success: false, error: "Data must be an array" }, { status: 400 });
    }

    const fileName = type === "oem" ? "oem-db.json" : "rto-dt.json";
    const filePath = path.join(process.cwd(), "lib", fileName);

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (fsErr) {
      // In read-only cloud filesystems (Vercel serverless), disk write might fail, which is okay since client localStorage persists
      console.warn("Could not write to disk in serverless environment:", fsErr);
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

