import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { RTORowData } from "@/lib/vahan";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { allRows, year, targetDir } = body;

    // Check if running on Cloud Linux (Netlify/Vercel) where Windows paths don't exist
    if (process.platform !== "win32" && targetDir && targetDir.includes(":")) {
      return NextResponse.json({
        success: true,
        isCloud: true,
        message: "Cloud environment (Netlify) active. Use direct browser download.",
      });
    }

    let outDir = targetDir && targetDir.trim()
      ? path.resolve(targetDir.trim())
      : path.resolve(process.cwd(), "output");

    if (process.platform !== "win32") {
      outDir = "/tmp/output";
    }

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const rows: RTORowData[] = allRows || [];
    const yr = year || "2026";

    // 1. Create Excel Workbook (3 sheets)
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Vahan Kerala Scraper";
    workbook.created = new Date();

    const sheetAll = workbook.addWorksheet("All_Kerala_Data");
    const sheetRTO = workbook.addWorksheet("RTO_Summary");
    const sheetMaker = workbook.addWorksheet("Maker_Market_Share");

    const months = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ];
    const headersAll = [
      "State", "RTO_Code", "RTO_Name", "Year", "S_No", "Maker",
      ...months, "TOTAL"
    ];

    sheetAll.addRow(headersAll);
    const headerRow1 = sheetAll.getRow(1);
    headerRow1.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow1.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0284C7" },
    };

    rows.forEach((r) => {
      sheetAll.addRow([
        r.State,
        r.RTO_Code,
        r.RTO_Name,
        r.Year,
        r.S_No,
        r.Maker,
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
      ]);
    });

    // 2. Sheet 2: RTO Summary
    sheetRTO.addRow(["RTO_Code", "RTO_Name", "Makers_Count", "Total_Vehicles"]);
    sheetRTO.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheetRTO.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D9488" },
    };

    const rtoMap = new Map<string, { code: string; name: string; makers: number; total: number }>();
    rows.forEach((r) => {
      const existing = rtoMap.get(r.RTO_Code) || {
        code: r.RTO_Code,
        name: r.RTO_Name,
        makers: 0,
        total: 0,
      };
      existing.makers += 1;
      existing.total += r.TOTAL || 0;
      rtoMap.set(r.RTO_Code, existing);
    });

    Array.from(rtoMap.values())
      .sort((a, b) => b.total - a.total)
      .forEach((item) => {
        sheetRTO.addRow([item.code, item.name, item.makers, item.total]);
      });

    // 3. Sheet 3: Maker Market Share
    sheetMaker.addRow(["Maker", "Total_Registrations", "Market_Share_%"]);
    sheetMaker.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheetMaker.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF6366F1" },
    };

    const makerMap = new Map<string, number>();
    let grandTotal = 0;
    rows.forEach((r) => {
      const cur = makerMap.get(r.Maker) || 0;
      const v = r.TOTAL || 0;
      makerMap.set(r.Maker, cur + v);
      grandTotal += v;
    });

    Array.from(makerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([mName, mTotal]) => {
        const pct = grandTotal > 0 ? ((mTotal / grandTotal) * 100).toFixed(2) + "%" : "0%";
        sheetMaker.addRow([mName, mTotal, pct]);
      });

    // Determine filename: if single RTO, strictly use format: <RTO Name without SRTO/RTO>-<Year>.xlsx
    const uniqueRtos = Array.from(new Set(rows.map((r) => r.RTO_Name || r.RTO_Code)));
    let xlsxFileName = `KL_ALL_RTO_CONSOLIDATED_${yr}.xlsx`;
    if (uniqueRtos.length === 1) {
      const rawName = uniqueRtos[0].replace(/[\s\-_]+(?:SRTO|RTO)\s*$/i, "").trim() || uniqueRtos[0];
      const cleanName = rawName.replace(/[\\/:*?"<>|]/g, "").trim();
      xlsxFileName = `${cleanName}-${yr}.xlsx`;
    }

    const xlsxFullPath = path.join(outDir, xlsxFileName);
    await workbook.xlsx.writeFile(xlsxFullPath);

    return NextResponse.json({
      success: true,
      savedXlsx: xlsxFullPath,
      directory: outDir,
      rowsCount: rows.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save file to local path" },
      { status: 500 }
    );
  }
}
