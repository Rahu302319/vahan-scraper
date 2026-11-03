import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { RTORowData } from "@/lib/vahan";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { allRows, year = "2026" } = (await req.json()) as {
      allRows: RTORowData[];
      year: string;
    };

    if (!allRows || allRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No data provided for export." },
        { status: 400 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Vahan Kerala Scraper";
    workbook.created = new Date();

    // 1. Sheet 1: All_Kerala_Data
    const sheet1 = workbook.addWorksheet("All_Kerala_Data");

    // Discover month columns
    const standardCols = ["State", "RTO_Code", "RTO_Name", "Year", "S_No", "Maker", "TOTAL"];
    const monthSet = new Set<string>();
    for (const r of allRows) {
      for (const k of Object.keys(r)) {
        if (!standardCols.includes(k)) {
          monthSet.add(k);
        }
      }
    }
    const monthCols = Array.from(monthSet);
    const allHeaders = ["State", "RTO_Code", "RTO_Name", "Year", "S_No", "Maker", ...monthCols, "TOTAL"];

    sheet1.addRow(allHeaders);
    // Style header row
    const hRow1 = sheet1.getRow(1);
    hRow1.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hRow1.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };

    for (const r of allRows) {
      const rowVals: any[] = [];
      for (const h of allHeaders) {
        rowVals.push(r[h] ?? 0);
      }
      sheet1.addRow(rowVals);
    }

    // Auto-fit columns
    sheet1.columns.forEach((col) => {
      col.width = 16;
    });
    if (sheet1.getColumn(6)) sheet1.getColumn(6).width = 36; // Maker name
    if (sheet1.getColumn(3)) sheet1.getColumn(3).width = 24; // RTO name

    // 2. Sheet 2: RTO_Summary
    const sheet2 = workbook.addWorksheet("RTO_Summary");
    sheet2.addRow(["RTO_Code", "RTO_Name", "Total_Makers", "Total_Vehicles"]);
    const hRow2 = sheet2.getRow(1);
    hRow2.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hRow2.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0284C7" },
    };

    const rtoMap = new Map<string, { code: string; name: string; makers: number; vehicles: number }>();
    for (const r of allRows) {
      const key = r.RTO_Code;
      if (!rtoMap.has(key)) {
        rtoMap.set(key, { code: r.RTO_Code, name: r.RTO_Name, makers: 0, vehicles: 0 });
      }
      const item = rtoMap.get(key)!;
      item.makers++;
      item.vehicles += Number(r.TOTAL) || 0;
    }

    const rtoList = Array.from(rtoMap.values()).sort((a, b) => b.vehicles - a.vehicles);
    for (const r of rtoList) {
      sheet2.addRow([r.code, r.name, r.makers, r.vehicles]);
    }
    sheet2.columns = [
      { width: 14 },
      { width: 28 },
      { width: 16 },
      { width: 18 },
    ];

    // 3. Sheet 3: Maker_Market_Share
    const sheet3 = workbook.addWorksheet("Maker_Market_Share");
    sheet3.addRow(["Maker", "Total_Registrations", "RTO_Presence", "Market_Share_%"]);
    const hRow3 = sheet3.getRow(1);
    hRow3.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hRow3.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" },
    };

    const makerMap = new Map<string, { maker: string; total: number; rtos: Set<string> }>();
    let grandTotal = 0;
    for (const r of allRows) {
      const m = r.Maker;
      const v = Number(r.TOTAL) || 0;
      grandTotal += v;
      if (!makerMap.has(m)) {
        makerMap.set(m, { maker: m, total: 0, rtos: new Set() });
      }
      const item = makerMap.get(m)!;
      item.total += v;
      item.rtos.add(r.RTO_Code);
    }

    const makerList = Array.from(makerMap.values()).sort((a, b) => b.total - a.total);
    for (const m of makerList) {
      const share = grandTotal > 0 ? ((m.total / grandTotal) * 100).toFixed(2) : "0.00";
      sheet3.addRow([m.maker, m.total, m.rtos.size, `${share}%`]);
    }
    sheet3.columns = [
      { width: 40 },
      { width: 20 },
      { width: 16 },
      { width: 16 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=KL_ALL_${rtoList.length}_RTO_CONSOLIDATED_${year}.xlsx`,
      },
    });
  } catch (error: any) {
    console.error("API /api/export-master error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate Excel." },
      { status: 500 }
    );
  }
}

