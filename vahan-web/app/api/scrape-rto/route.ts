import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { VahanWebSession, DEFAULT_VH_CATG, DEFAULT_FUELS } from "@/lib/vahan";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      rtoValue,
      rtoCode,
      rtoName,
      year = "2026",
      yaxis = "Maker",
      vhCatg = DEFAULT_VH_CATG,
      fuels = DEFAULT_FUELS,
      norms = [],
      vhClass = [],
      outputDir,
    } = body;

    if (!rtoValue || !rtoCode) {
      return NextResponse.json(
        { success: false, error: "Missing rtoValue or rtoCode in request." },
        { status: 400 }
      );
    }

    const session = new VahanWebSession();
    await session.initSession();
    await session.selectState("KL");

    const result = await session.fetchRTO(
      rtoValue,
      rtoCode,
      rtoName,
      String(year),
      yaxis,
      vhCatg,
      fuels,
      norms,
      vhClass
    );

    const totalVehicles = result.rows.reduce((sum, r) => sum + (r.TOTAL || 0), 0);

    // Save individual RTO files to local disk if outputDir is specified
    // If local output directory specified, save only XLSX with required format: <RTO Name>-<Year>.xlsx
    if (outputDir && typeof outputDir === "string" && outputDir.trim()) {
      try {
        const safeDir = path.resolve(outputDir.trim());
        fs.mkdirSync(safeDir, { recursive: true });

        // Strip trailing SRTO / RTO from name
        const rawName = (rtoName || rtoCode).replace(/[\s\-_]+(?:SRTO|RTO)\s*$/i, "").trim() || (rtoName || rtoCode);
        const cleanName = rawName.replace(/[\\/:*?"<>|]/g, "").trim();
        const fileName = `${cleanName}-${year}.xlsx`;

        if (result.xlsxBuffer) {
          const xlsxPath = path.join(safeDir, fileName);
          fs.writeFileSync(xlsxPath, Buffer.from(result.xlsxBuffer));
        }
      } catch (saveErr) {
        console.warn(`Could not save individual XLSX for ${rtoCode}:`, saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      rtoCode,
      rtoName,
      year,
      makerCount: result.rows.length,
      totalVehicles,
      rows: result.rows,
      xlsxBase64: result.xlsxBuffer ? Buffer.from(result.xlsxBuffer).toString("base64") : null,
    });
  } catch (error: any) {
    console.error("API /api/scrape-rto error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch RTO data." },
      { status: 500 }
    );
  }
}
