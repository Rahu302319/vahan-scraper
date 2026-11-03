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
      vhCatg = DEFAULT_VH_CATG,
      fuels = DEFAULT_FUELS,
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
      vhCatg,
      fuels
    );

    const totalVehicles = result.rows.reduce((sum, r) => sum + (r.TOTAL || 0), 0);

    // Save individual RTO files to local disk if outputDir is specified
    if (outputDir && typeof outputDir === "string" && outputDir.trim()) {
      try {
        const safeDir = path.resolve(outputDir.trim());
        const rawDir = path.join(safeDir, "raw_xlsx");
        const csvDir = path.join(safeDir, "csv");

        fs.mkdirSync(rawDir, { recursive: true });
        fs.mkdirSync(csvDir, { recursive: true });

        const safeName = (rtoName || "").replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_");
        const fileStem = `${rtoCode}_${safeName}_${year}`;

        // 1. Save original XLSX
        if (result.xlsxBuffer) {
          const xlsxPath = path.join(rawDir, `${fileStem}.xlsx`);
          fs.writeFileSync(xlsxPath, Buffer.from(result.xlsxBuffer));
        }

        // 2. Save parsed CSV
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const csvHeader = ["State", "RTO_Code", "RTO_Name", "Year", "S_No", "Maker", ...months, "TOTAL"].join(",");
        const csvLines = [csvHeader];

        result.rows.forEach((r) => {
          csvLines.push([
            r.State,
            r.RTO_Code,
            `"${r.RTO_Name}"`,
            r.Year,
            r.S_No,
            `"${r.Maker}"`,
            r.JAN ?? 0,
            r.FEB ?? 0,
            r.MAR ?? 0,
            r.APR ?? 0,
            r.MAY ?? 0,
            r.JUN ?? 0,
            r.JUL ?? 0,
            r.AUG ?? 0,
            r.SEP ?? 0,
            r.OCT ?? 0,
            r.NOV ?? 0,
            r.DEC ?? 0,
            r.TOTAL ?? 0,
          ].join(","));
        });

        const csvPath = path.join(csvDir, `${fileStem}.csv`);
        fs.writeFileSync(csvPath, csvLines.join("\n"), "utf-8");
      } catch (saveErr) {
        console.warn(`Could not save individual files for ${rtoCode}:`, saveErr);
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
    });
  } catch (error: any) {
    console.error("API /api/scrape-rto error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch RTO data." },
      { status: 500 }
    );
  }
}
