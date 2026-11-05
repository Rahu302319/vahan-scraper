"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Car,
  Award,
  Layers,
  MapPin,
  Download,
  Filter,
  Search,
  Upload,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileSpreadsheet,
  Database,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";
import ExcelJS from "exceljs";
import summaryDataRaw from "@/lib/summary-data.json";
import oemGroupingSummaryRaw from "@/lib/oem-grouping-summary.json";
import { OEMRecord, RTORecord } from "./DatabaseManager";

export interface DashboardProps {
  theme?: "dark" | "light";
  liveScrapedRows?: any[];
  oemDb?: OEMRecord[];
  rtoDt?: RTORecord[];
}

interface SummaryRow {
  territory: string;
  district: string;
  rtoName: string;
  label: string;
  type: "rto" | "district_total" | "territory_total" | "grand_total";
  years: Record<string, { total: number; mm: number; ms: number }>;
}

const AVAILABLE_YEARS = ["2026", "2025", "2024", "2023", "2022", "2021"];

const OEM_COLORS: Record<string, string> = {
  Maruti: "#3b82f6",     // Blue
  Tata: "#6366f1",       // Indigo
  Hyundai: "#06b6d4",    // Cyan
  Toyota: "#10b981",     // Emerald
  Mahindra: "#ef4444",   // Red
  Kia: "#f97316",        // Orange
  Others: "#64748b",     // Slate
  Honda: "#8b5cf6",      // Violet
  MG: "#ec4899",         // Pink
  Premium: "#eab308",    // Amber / Gold
};

const SPECIAL_CODE_TO_FINAL_RTO: Record<string, string> = {
  KL15: "Thiruvananthapuram",
  KL42: "Paravur",
  KL99: "Thiruvananthapuram",
};

function cleanRtoName(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\s\-_]+(?:srto|rto|rt\s*office|sub\s*rt\s*office|mvi\s*office)\b/gi, "")
    .replace(/[^a-z0-9]/g, "");
}

function getRowVolume(row: any): number {
  if (row.TOTAL !== undefined && row.TOTAL !== null && !isNaN(Number(row.TOTAL))) {
    return Number(row.TOTAL);
  }
  if (row.Value !== undefined && row.Value !== null && !isNaN(Number(row.Value))) {
    return Number(row.Value);
  }
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  let sum = 0;
  let found = false;
  for (const m of months) {
    if (row[m] !== undefined && !isNaN(Number(row[m]))) {
      sum += Number(row[m]);
      found = true;
    }
  }
  return found ? sum : 0;
}

export default function ExecutiveDashboard({
  theme = "dark",
  liveScrapedRows = [],
  oemDb = [],
  rtoDt = [],
}: DashboardProps) {
  const isDark = theme === "dark";

  // Persistent live rows from localStorage if any
  const [cachedScrapedRows, setCachedScrapedRows] = useState<any[]>([]);

  // Load cached scraped rows on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("vahan_scraped_live_data");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCachedScrapedRows(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Effective live scraped rows (props take priority, otherwise cached)
  const activeLiveRows = useMemo(() => {
    if (liveScrapedRows && liveScrapedRows.length > 0) return liveScrapedRows;
    return cachedScrapedRows;
  }, [liveScrapedRows, cachedScrapedRows]);

  // Dashboard Filters
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedTerritory, setSelectedTerritory] = useState<string>("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [searchRto, setSearchRto] = useState<string>("");
  const [hideZeroRtos, setHideZeroRtos] = useState<boolean>(false);

  // Active Data Source: default to 'live' if scraped rows exist, else 'benchmark'
  const [dataSource, setDataSource] = useState<"benchmark" | "live" | "custom">("benchmark");

  // Auto-switch to 'live' whenever live scraped rows arrive
  useEffect(() => {
    if (activeLiveRows.length > 0 && dataSource === "benchmark") {
      setDataSource("live");
    }
  }, [activeLiveRows.length]);

  // Custom uploaded rows from user Excel file
  const [customRows, setCustomRows] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  // Base summary template rows from JSON
  const summaryRowsTemplate = summaryDataRaw as SummaryRow[];
  const oemGroupingSummary = oemGroupingSummaryRaw as {
    byYear: Record<string, Record<string, number>>;
    byTerritory: Record<string, Record<string, Record<string, number>>>;
  };

  // Build RTO Name Lookup Table from rtoDt
  const rtoDtLookup = useMemo(() => {
    const map = new Map<string, string>();
    rtoDt.forEach((d) => {
      if (d.srtOffice) map.set(cleanRtoName(d.srtOffice), d.finalRtoName);
      if (d.finalRtoName) map.set(cleanRtoName(d.finalRtoName), d.finalRtoName);
    });
    return map;
  }, [rtoDt]);

  // Helper to resolve row to Final RTO Name
  const resolveRowToFinalRto = (row: any): string => {
    const code = (row.RTO_Code || row["RTO Code"] || row.Code || "").toUpperCase().trim();
    if (SPECIAL_CODE_TO_FINAL_RTO[code]) {
      return SPECIAL_CODE_TO_FINAL_RTO[code];
    }
    const directFinal = row["Final RTO Name"] || row.finalRtoName;
    if (directFinal) return String(directFinal).trim();

    const rawName = String(row.RTO_Name || row["RTO Name"] || row.srtOffice || row.RTO || "").trim();
    const c = cleanRtoName(rawName);
    if (rtoDtLookup.has(c)) {
      return rtoDtLookup.get(c)!;
    }
    return rawName;
  };

  // Helper to identify OEM Grouping and Mahindra flag
  const resolveRowOem = (row: any): { grouping: string; isMahindra: boolean } => {
    const directGroup = row["OEM Group"] || row.oemGroup;
    const directGrouping = row["OEM Grouping"] || row.oemGrouping;
    if (directGroup === "M&M" || directGrouping === "Mahindra") {
      return { grouping: "Mahindra", isMahindra: true };
    }

    const rawMaker = String(row.Maker || row["OEM Name"] || row.OEM || row["Maker Name"] || "").trim().toUpperCase();

    const matched = oemDb.find(
      (o) => o.oemName.toUpperCase() === rawMaker || o.oemFinal.toUpperCase() === rawMaker
    );
    if (matched) {
      const isM = matched.oemGroup === "M&M" || matched.oemGrouping === "Mahindra";
      return { grouping: matched.oemGrouping || "Others", isMahindra: isM };
    }

    if (rawMaker.includes("MAHINDRA")) return { grouping: "Mahindra", isMahindra: true };
    if (rawMaker.includes("MARUTI")) return { grouping: "Maruti", isMahindra: false };
    if (rawMaker.includes("TATA")) return { grouping: "Tata", isMahindra: false };
    if (rawMaker.includes("HYUNDAI")) return { grouping: "Hyundai", isMahindra: false };
    if (rawMaker.includes("TOYOTA")) return { grouping: "Toyota", isMahindra: false };
    if (rawMaker.includes("KIA")) return { grouping: "Kia", isMahindra: false };
    if (rawMaker.includes("HONDA")) return { grouping: "Honda", isMahindra: false };
    if (rawMaker.includes("MG") || rawMaker.includes("JSW")) return { grouping: "MG", isMahindra: false };
    if (/MERCEDES|BMW|AUDI|VOLVO|JAGUAR|LAND ROVER|PORSCHE/.test(rawMaker)) {
      return { grouping: "Premium", isMahindra: false };
    }
    return { grouping: "Others", isMahindra: false };
  };

  // Handle Custom Excel Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      let targetSheet = workbook.worksheets.find(
        (ws) => ws.name.toLowerCase() === "all_kerala_data" || ws.name.toLowerCase() === "final data"
      );
      if (!targetSheet) {
        targetSheet = workbook.worksheets.find((ws) => ws.name.includes(selectedYear));
      }
      if (!targetSheet) {
        targetSheet = workbook.worksheets.reduce((prev, curr) =>
          curr.rowCount > prev.rowCount ? curr : prev
        );
      }

      const rows: any[] = [];
      let headers: string[] = [];

      targetSheet.eachRow((row, rowNumber) => {
        const values = (row.values as any[]).slice(1);
        if (rowNumber === 1) {
          headers = values.map((v) => String(v || "").trim());
        } else {
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] !== undefined ? values[idx] : null;
          });
          rows.push(rowObj);
        }
      });

      setCustomRows(rows);
      setUploadedFileName(file.name);
      setDataSource("custom");

      // Attempt to auto-detect year from first row
      if (rows[0]?.Year || rows[0]?.FY) {
        const yr = String(rows[0].Year || rows[0].FY).trim();
        if (AVAILABLE_YEARS.includes(yr)) {
          setSelectedYear(yr);
        }
      }
    } catch (err: any) {
      alert(`Error reading Excel file: ${err.message}`);
    }
  };

  // Active working dataset
  const activeDatasetRows = useMemo(() => {
    if (dataSource === "live") return activeLiveRows;
    if (dataSource === "custom") return customRows;
    return [];
  }, [dataSource, activeLiveRows, customRows]);

  // Distinct RTO count in active dataset
  const activeDatasetRtoCount = useMemo(() => {
    if (dataSource === "benchmark") return 87;
    const rtoSet = new Set<string>();
    activeDatasetRows.forEach((r) => {
      const finalName = resolveRowToFinalRto(r);
      if (finalName) rtoSet.add(cleanRtoName(finalName));
    });
    return rtoSet.size;
  }, [dataSource, activeDatasetRows, rtoDtLookup]);

  // Compute Active OEM Market Shares
  const activeOemBreakdown = useMemo(() => {
    if (dataSource === "benchmark") {
      let breakdown: Record<string, number> = {};
      if (selectedTerritory === "ALL") {
        breakdown = oemGroupingSummary.byYear[selectedYear] || {};
      } else {
        breakdown = oemGroupingSummary.byTerritory[selectedYear]?.[selectedTerritory] || {};
      }

      const totalVal = Object.values(breakdown).reduce((a, b) => a + b, 0);
      return Object.entries(breakdown)
        .map(([group, count]) => ({
          name: group,
          count,
          share: totalVal > 0 ? (count / totalVal) * 100 : 0,
          color: OEM_COLORS[group] || "#64748b",
        }))
        .sort((a, b) => b.count - a.count);
    }

    if (!activeDatasetRows || activeDatasetRows.length === 0) return [];

    const groupMap: Record<string, number> = {};
    let totalVal = 0;

    activeDatasetRows.forEach((r) => {
      // Optional year filter if row has Year
      const rowYr = String(r.Year || r.FY || "").trim();
      if (rowYr && rowYr !== selectedYear) return;

      const { grouping } = resolveRowOem(r);
      const vol = getRowVolume(r);
      groupMap[grouping] = (groupMap[grouping] || 0) + vol;
      totalVal += vol;
    });

    return Object.entries(groupMap)
      .map(([group, count]) => ({
        name: group,
        count,
        share: totalVal > 0 ? (count / totalVal) * 100 : 0,
        color: OEM_COLORS[group] || "#64748b",
      }))
      .sort((a, b) => b.count - a.count);
  }, [dataSource, selectedYear, selectedTerritory, activeDatasetRows, oemDb, rtoDtLookup]);

  // DYNAMIC SUMMARY ROWS ENGINE (Aggregates Active Scraper / Excel Data into Image 4 Table Hierarchy)
  const computedSummaryRows = useMemo(() => {
    if (dataSource === "benchmark") {
      return summaryRowsTemplate.filter((r) => r.district !== "District");
    }

    // 1. Build volume map for each RTO from activeDatasetRows
    const rtoMap = new Map<string, { total: number; mm: number }>();

    activeDatasetRows.forEach((row) => {
      const rowYr = String(row.Year || row.FY || "").trim();
      if (rowYr && rowYr !== selectedYear) return;

      const finalName = resolveRowToFinalRto(row);
      const key = cleanRtoName(finalName);
      const vol = getRowVolume(row);
      const { isMahindra } = resolveRowOem(row);

      const curr = rtoMap.get(key) || { total: 0, mm: 0 };
      curr.total += vol;
      if (isMahindra) curr.mm += vol;
      rtoMap.set(key, curr);
    });

    // 2. Clone structure and calculate values
    const newRows: SummaryRow[] = [];
    const districtAccumulator: Record<string, { total: number; mm: number }> = {};
    const territoryAccumulator: Record<string, { total: number; mm: number }> = {
      "North Kerala": { total: 0, mm: 0 },
      "South Kerala": { total: 0, mm: 0 },
    };

    summaryRowsTemplate.forEach((templateRow) => {
      if (templateRow.district === "District") return; // skip header row

      if (templateRow.type === "rto") {
        const key = cleanRtoName(templateRow.rtoName);
        const stats = rtoMap.get(key) || { total: 0, mm: 0 };
        const ms = stats.total > 0 ? (stats.mm / stats.total) * 100 : 0;

        // Accumulate into District & Territory
        if (!districtAccumulator[templateRow.district]) {
          districtAccumulator[templateRow.district] = { total: 0, mm: 0 };
        }
        districtAccumulator[templateRow.district].total += stats.total;
        districtAccumulator[templateRow.district].mm += stats.mm;

        if (territoryAccumulator[templateRow.territory]) {
          territoryAccumulator[templateRow.territory].total += stats.total;
          territoryAccumulator[templateRow.territory].mm += stats.mm;
        }

        newRows.push({
          ...templateRow,
          years: {
            [selectedYear]: { total: stats.total, mm: stats.mm, ms },
          },
        });
      } else if (templateRow.type === "district_total") {
        const distStats = districtAccumulator[templateRow.district] || { total: 0, mm: 0 };
        const ms = distStats.total > 0 ? (distStats.mm / distStats.total) * 100 : 0;

        newRows.push({
          ...templateRow,
          years: {
            [selectedYear]: { total: distStats.total, mm: distStats.mm, ms },
          },
        });
      } else if (templateRow.type === "territory_total") {
        const terrName = templateRow.label.replace(" Total", "").trim();
        const terrStats = territoryAccumulator[terrName] || { total: 0, mm: 0 };
        const ms = terrStats.total > 0 ? (terrStats.mm / terrStats.total) * 100 : 0;

        newRows.push({
          ...templateRow,
          years: {
            [selectedYear]: { total: terrStats.total, mm: terrStats.mm, ms },
          },
        });
      } else if (templateRow.type === "grand_total") {
        const grandTotal =
          (territoryAccumulator["North Kerala"]?.total || 0) +
          (territoryAccumulator["South Kerala"]?.total || 0);
        const grandMm =
          (territoryAccumulator["North Kerala"]?.mm || 0) +
          (territoryAccumulator["South Kerala"]?.mm || 0);
        const ms = grandTotal > 0 ? (grandMm / grandTotal) * 100 : 0;

        newRows.push({
          ...templateRow,
          years: {
            [selectedYear]: { total: grandTotal, mm: grandMm, ms },
          },
        });
      }
    });

    return newRows;
  }, [dataSource, selectedYear, activeDatasetRows, summaryRowsTemplate, rtoDtLookup, oemDb]);

  // Compute Grand Totals & KPI Cards from dynamically computed rows
  const kpiData = useMemo(() => {
    const grandTotalRow = computedSummaryRows.find((r) => r.type === "grand_total");
    const northTotalRow = computedSummaryRows.find((r) => r.label === "North Kerala Total");
    const southTotalRow = computedSummaryRows.find((r) => r.label === "South Kerala Total");

    const grand = grandTotalRow?.years[selectedYear] || { total: 0, mm: 0, ms: 0 };
    const north = northTotalRow?.years[selectedYear] || { total: 0, mm: 0, ms: 0 };
    const south = southTotalRow?.years[selectedYear] || { total: 0, mm: 0, ms: 0 };

    const topOem = activeOemBreakdown[0] || { name: "N/A", share: 0, count: 0 };

    return {
      totalVehicles: grand.total,
      mmVehicles: grand.mm,
      mmMarketShare: grand.ms,
      topOemName: topOem.name,
      topOemShare: topOem.share.toFixed(1),
      northTotal: north.total,
      southTotal: south.total,
      northShare: grand.total > 0 ? ((north.total / grand.total) * 100).toFixed(1) : "0",
      southShare: grand.total > 0 ? ((south.total / grand.total) * 100).toFixed(1) : "0",
    };
  }, [computedSummaryRows, selectedYear, activeOemBreakdown]);

  // Filtered Summary Table Rows
  const filteredSummaryRows = useMemo(() => {
    return computedSummaryRows.filter((r) => {
      // Zero RTO filter
      if (hideZeroRtos && r.type === "rto") {
        const metrics = r.years[selectedYear];
        if (!metrics || metrics.total === 0) return false;
      }
      // Territory filter
      if (selectedTerritory !== "ALL" && r.territory !== selectedTerritory && r.type !== "grand_total") {
        return false;
      }
      // District filter
      if (selectedDistrict !== "ALL") {
        if (r.type === "grand_total" || r.type === "territory_total") return false;
        if (r.district !== selectedDistrict && !r.label.startsWith(selectedDistrict)) return false;
      }
      // Search filter
      if (searchRto.trim()) {
        const q = searchRto.toLowerCase().trim();
        const matches =
          r.label.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.territory.toLowerCase().includes(q);
        if (!matches && r.type !== "grand_total") return false;
      }
      return true;
    });
  }, [computedSummaryRows, selectedTerritory, selectedDistrict, searchRto, hideZeroRtos, selectedYear]);

  // Export Summary Table as formatted Excel
  const handleExportSummaryExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Vahan Kerala Intelligence Dashboard";
      const sheet = workbook.addWorksheet(`Summary_${selectedYear}`);

      sheet.addRow([
        "Territory",
        "District",
        "Final RTO Name",
        `Total Registration (${selectedYear})`,
        `M&M Nos (${selectedYear})`,
        `M&M MS % (${selectedYear})`,
      ]);

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };

      filteredSummaryRows.forEach((r) => {
        const metrics = r.years[selectedYear] || { total: 0, mm: 0, ms: 0 };
        const isTotal = r.type !== "rto";
        const row = sheet.addRow([
          r.type === "rto" ? r.territory : "",
          r.type === "rto" ? r.district : r.type === "district_total" ? r.label : "",
          r.type === "rto" ? r.rtoName : r.type !== "district_total" ? r.label : "",
          metrics.total,
          metrics.mm,
          `${metrics.ms.toFixed(2)}%`,
        ]);

        if (isTotal) {
          row.font = { bold: true };
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: r.type === "grand_total" ? "FFFEF3C7" : "FFF1F5F9" },
          };
        }
      });

      sheet.columns = [
        { width: 18 },
        { width: 22 },
        { width: 22 },
        { width: 24 },
        { width: 18 },
        { width: 18 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Vahan_Kerala_Summary_${selectedYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-3 sm:p-4 transition-colors ${
      isDark ? "bg-[#060a14] border-[#18233a] text-[#cbd5e1]" : "bg-slate-50 border-slate-200 text-slate-800"
    }`}>
      {/* 1. DATA SOURCE CONTROLLER BANNER */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border transition ${
        isDark ? "bg-[#0b1222] border-[#1e2f4d]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
            isDark ? "text-[#38bdf8]" : "text-sky-700"
          }`}>
            <Sparkles className="w-4 h-4 text-[#38bdf8]" />
            Active Data Source:
          </span>

          {/* Source Toggle Pills */}
          <div className={`inline-flex rounded-md p-0.5 border ${
            isDark ? "bg-[#070d18] border-[#18263e]" : "bg-slate-100 border-slate-300"
          }`}>
            <button
              type="button"
              onClick={() => setDataSource("live")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded transition ${
                dataSource === "live"
                  ? "bg-[#0284c7] text-white shadow-sm"
                  : isDark
                  ? "text-[#94a3b8] hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                activeLiveRows.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`} />
              ⚡ Live Scraper Data ({activeLiveRows.length > 0 ? `${activeDatasetRtoCount} RTOs` : "0"})
            </button>

            <button
              type="button"
              onClick={() => setDataSource("custom")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded transition ${
                dataSource === "custom"
                  ? "bg-[#0284c7] text-white shadow-sm"
                  : isDark
                  ? "text-[#94a3b8] hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              📁 Uploaded Excel ({customRows.length > 0 ? `${customRows.length} rows` : "None"})
            </button>

            <button
              type="button"
              onClick={() => setDataSource("benchmark")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded transition ${
                dataSource === "benchmark"
                  ? "bg-[#0284c7] text-white shadow-sm"
                  : isDark
                  ? "text-[#94a3b8] hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              📊 Historical Benchmark (2021-2026)
            </button>
          </div>
        </div>

        {/* Upload Excel Button */}
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border cursor-pointer transition ${
            isDark
              ? "bg-[#0f172a] hover:bg-[#1e293b] text-[#38bdf8] border-[#38bdf8]/40 hover:border-[#38bdf8]"
              : "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-300 shadow-sm"
          }`}>
            <Upload className="w-3.5 h-3.5" />
            <span>Load Downloaded Excel (.xlsx)</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Source Status Banner */}
      {dataSource === "live" && (
        <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
          activeLiveRows.length > 0
            ? isDark
              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
              : "bg-emerald-50 border-emerald-300 text-emerald-800"
            : isDark
            ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
            : "bg-amber-50 border-amber-300 text-amber-800"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              activeLiveRows.length > 0 ? "bg-emerald-400 animate-ping" : "bg-amber-400"
            }`} />
            {activeLiveRows.length > 0 ? (
              <span>
                <strong>LIVE SCRAPER FEED ACTIVE:</strong> Displaying real-time market metrics computed from{" "}
                <strong>{activeLiveRows.length}</strong> scraped records across{" "}
                <strong>{activeDatasetRtoCount}</strong> Kerala RTOs for FY {selectedYear}.
              </span>
            ) : (
              <span>
                <strong>NO SCRAPED RECORDS YET:</strong> Head to the <strong>87 RTO Scraper</strong> tab and click{" "}
                <strong>START BATCH SCRAPER</strong>, or load a downloaded Excel file below.
              </span>
            )}
          </div>
        </div>
      )}

      {dataSource === "custom" && (
        <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
          isDark
            ? "bg-sky-950/30 border-sky-500/40 text-sky-300"
            : "bg-sky-50 border-sky-300 text-sky-800"
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#38bdf8]" />
            <span>
              <strong>CUSTOM EXCEL FILE ACTIVE:</strong> Loaded <strong>{customRows.length}</strong> records from{" "}
              <strong>&ldquo;{uploadedFileName}&rdquo;</strong> across <strong>{activeDatasetRtoCount}</strong> RTOs.
            </span>
          </div>
        </div>
      )}

      {/* 2. Tactical Filters Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border ${
        isDark ? "bg-[#0a1120] border-[#1b2b48]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-[#0284c7]/20 border border-[#0284c7] text-[#38bdf8]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base sm:text-lg font-black tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
                EXECUTIVE MARKET ANALYTICS DASHBOARD
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#0284c7] text-white tracking-wider">
                KL • KERALA
              </span>
            </div>
            <p className={`text-[11px] ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              {dataSource === "live"
                ? "Dynamically Computing Live Scraper Registrations & Mahindra Market Share"
                : dataSource === "custom"
                ? "Dynamically Computing Uploaded Excel Registrations & Market Share"
                : "Maker Market Share, Territory Volumes & RTO Hierarchy Analytics"}
            </p>
          </div>
        </div>

        {/* Global Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Picker */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              Year:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs font-bold border focus:outline-none ${
                isDark
                  ? "bg-[#060c18] border-[#1f2f4c] text-[#38bdf8] focus:border-[#38bdf8]"
                  : "bg-slate-100 border-slate-300 text-slate-900 focus:border-sky-500"
              }`}
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  FY {y}
                </option>
              ))}
            </select>
          </div>

          {/* Territory Filter */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              Territory:
            </span>
            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold border focus:outline-none ${
                isDark
                  ? "bg-[#060c18] border-[#1f2f4c] text-white focus:border-[#38bdf8]"
                  : "bg-slate-100 border-slate-300 text-slate-900 focus:border-sky-500"
              }`}
            >
              <option value="ALL">All Kerala</option>
              <option value="North Kerala">North Kerala</option>
              <option value="South Kerala">South Kerala</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              District:
            </span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold border focus:outline-none ${
                isDark
                  ? "bg-[#060c18] border-[#1f2f4c] text-white focus:border-[#38bdf8]"
                  : "bg-slate-100 border-slate-300 text-slate-900 focus:border-sky-500"
              }`}
            >
              <option value="ALL">All 14 Districts</option>
              {[
                "Kannur",
                "Kasargod",
                "Wayanad",
                "Kozhikode",
                "Malappuram",
                "Palakkad",
                "Thrissur",
                "Thiruvananthapuram",
                "Kollam",
                "Pathanamthitta",
                "Alappuzha",
                "Kottayam",
                "Idukki",
                "Ernakulam",
              ].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportSummaryExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#38bdf8] shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Summary Excel
          </button>
        </div>
      </div>

      {/* 3. Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Total Registrations */}
        <div className={`p-3 rounded-lg border flex flex-col justify-between transition ${
          isDark
            ? "bg-gradient-to-br from-[#0c1424] to-[#111c33] border-[#1f2f4c] border-l-4 border-l-[#38bdf8]"
            : "bg-white border-slate-200 border-l-4 border-l-sky-500 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              Total Registrations ({selectedYear})
            </span>
            <Car className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="mt-2">
            <span className={`text-xl sm:text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
              {kpiData.totalVehicles.toLocaleString()}
            </span>
            <span className={`block text-[11px] font-medium mt-0.5 ${isDark ? "text-[#94a3b8]" : "text-slate-500"}`}>
              {dataSource === "live"
                ? `Across ${activeDatasetRtoCount} Scraped RTOs`
                : "Across All 87 Kerala RTOs"}
            </span>
          </div>
        </div>

        {/* Mahindra (M&M) Registrations */}
        <div className={`p-3 rounded-lg border flex flex-col justify-between transition ${
          isDark
            ? "bg-gradient-to-br from-[#0c1424] to-[#111c33] border-[#1f2f4c] border-l-4 border-l-red-500"
            : "bg-white border-slate-200 border-l-4 border-l-red-500 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              M&M Volume (Mahindra)
            </span>
            <Award className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-red-400">
              {kpiData.mmVehicles.toLocaleString()}
            </span>
            <span className={`block text-[11px] font-medium mt-0.5 ${isDark ? "text-[#94a3b8]" : "text-slate-500"}`}>
              Vehicles Registered
            </span>
          </div>
        </div>

        {/* M&M Market Share */}
        <div className={`p-3 rounded-lg border flex flex-col justify-between transition ${
          isDark
            ? "bg-gradient-to-br from-[#0c1424] to-[#111c33] border-[#1f2f4c] border-l-4 border-l-[#34d399]"
            : "bg-white border-slate-200 border-l-4 border-l-emerald-500 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              M&M Market Share (MS %)
            </span>
            <TrendingUp className="w-4 h-4 text-[#34d399]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-[#34d399]">
              {kpiData.mmMarketShare.toFixed(2)}%
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
              isDark ? "bg-[#064e3b] text-[#34d399]" : "bg-emerald-100 text-emerald-800"
            }`}>
              Statewide
            </span>
          </div>
        </div>

        {/* Market Leader OEM */}
        <div className={`p-3 rounded-lg border flex flex-col justify-between transition ${
          isDark
            ? "bg-gradient-to-br from-[#0c1424] to-[#111c33] border-[#1f2f4c] border-l-4 border-l-[#a78bfa]"
            : "bg-white border-slate-200 border-l-4 border-l-indigo-500 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              Market Leader (OEM Grouping)
            </span>
            <Layers className="w-4 h-4 text-[#a78bfa]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
              {kpiData.topOemName}
            </span>
            <span className="text-xs font-bold text-[#a78bfa]">
              {kpiData.topOemShare}%
            </span>
          </div>
        </div>
      </div>

      {/* 4. Visual Charts & OEM Market Share Distribution */}
      <div className={`p-3 rounded-lg border ${
        isDark ? "bg-[#090f1d] border-[#18263e]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f2f4c]/40">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#38bdf8]" />
            <h3 className={`text-xs font-extrabold uppercase tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
              OEM Grouping Market Share Breakdown ({selectedYear})
            </h3>
          </div>
          <span className={`text-[11px] ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
            Territory: <span className="font-bold text-[#38bdf8]">{selectedTerritory}</span>
          </span>
        </div>

        {/* Progress Bar Distribution */}
        <div className={`w-full h-3 rounded-full overflow-hidden flex my-2 ${
          isDark ? "bg-slate-800" : "bg-slate-200"
        }`}>
          {activeOemBreakdown.map((item) => (
            <div
              key={item.name}
              style={{ width: `${item.share}%`, backgroundColor: item.color }}
              title={`${item.name}: ${item.count.toLocaleString()} (${item.share.toFixed(1)}%)`}
              className="h-full transition-all duration-300 hover:opacity-80"
            />
          ))}
        </div>

        {/* Legend & Breakdown Tags */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
          {activeOemBreakdown.map((item) => (
            <div
              key={item.name}
              className={`p-2 rounded border flex flex-col justify-between ${
                isDark ? "bg-[#060c18] border-[#1b2842]" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span style={{ color: item.color }}>{item.share.toFixed(1)}%</span>
              </div>
              <span className={`text-[10px] font-mono mt-1 ${isDark ? "text-[#94a3b8]" : "text-slate-500"}`}>
                {item.count.toLocaleString()} units
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Territory & District Summary Table (Image 4 replica & Excel summary sheet) */}
      <div className={`flex flex-col gap-2 rounded-lg border p-3 ${
        isDark ? "bg-[#090f1d] border-[#18263e]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1f2f4c]/40">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#38bdf8]" />
            <h3 className={`text-xs font-extrabold uppercase tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
              Territory & District Registration Summary Table
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Zero RTOs */}
            <button
              type="button"
              onClick={() => setHideZeroRtos(!hideZeroRtos)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border transition ${
                hideZeroRtos
                  ? isDark
                    ? "bg-[#0284c7] text-white border-[#38bdf8]"
                    : "bg-sky-600 text-white border-sky-700 shadow-sm"
                  : isDark
                  ? "bg-[#070d18] text-[#94a3b8] border-[#1f2f4c] hover:text-white"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
              }`}
            >
              {hideZeroRtos ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {hideZeroRtos ? "Showing Active RTOs Only" : "Show All 87 RTOs"}
            </button>

            {/* Search within table */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDark ? "text-[#64748b]" : "text-slate-400"}`} />
              <input
                type="text"
                value={searchRto}
                onChange={(e) => setSearchRto(e.target.value)}
                placeholder="Quick filter RTO or District..."
                className={`pl-8 pr-3 py-1 rounded text-xs border focus:outline-none w-48 sm:w-56 ${
                  isDark
                    ? "bg-[#060c18] border-[#1f2f4c] text-white focus:border-[#38bdf8]"
                    : "bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Summary Table */}
        <div className={`overflow-auto rounded border max-h-[600px] ${
          isDark ? "border-[#1b2842] bg-[#060a14]" : "border-slate-200 bg-white"
        }`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-10 font-bold border-b text-[11px] ${
              isDark ? "bg-[#0d1627] text-[#38bdf8] border-[#1f2f4c]" : "bg-slate-100 text-slate-700 border-slate-300"
            }`}>
              <tr>
                <th className="p-2 w-36">Territory</th>
                <th className="p-2 w-44">District</th>
                <th className="p-2">Final RTO Name</th>
                <th className="p-2 text-right w-36">Total Registration</th>
                <th className="p-2 text-right w-28 text-red-400">M&M Nos</th>
                <th className="p-2 text-right w-28 text-[#34d399]">M&M MS %</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-[#131f33]" : "divide-slate-200"}`}>
              {filteredSummaryRows.map((row, idx) => {
                const metrics = row.years[selectedYear] || { total: 0, mm: 0, ms: 0 };
                const isGrandTotal = row.type === "grand_total";
                const isTerrTotal = row.type === "territory_total";
                const isDistTotal = row.type === "district_total";

                let rowBg = "";
                if (isGrandTotal) {
                  rowBg = isDark ? "bg-[#38bdf8]/15 font-black text-white" : "bg-amber-100 font-black text-slate-900";
                } else if (isTerrTotal) {
                  rowBg = isDark ? "bg-[#1e293b] font-extrabold text-[#38bdf8]" : "bg-sky-100 font-bold text-sky-900";
                } else if (isDistTotal) {
                  rowBg = isDark ? "bg-[#0d172a] font-bold text-white" : "bg-slate-100 font-bold text-slate-900";
                } else {
                  rowBg = idx % 2 === 0
                    ? isDark ? "bg-[#060a14] hover:bg-[#0c1424]" : "bg-white hover:bg-slate-50"
                    : isDark ? "bg-[#080e1b] hover:bg-[#0e172a]" : "bg-slate-50/60 hover:bg-slate-100";
                }

                return (
                  <tr key={idx} className={`transition ${rowBg}`}>
                    {/* Territory */}
                    <td className="p-2">
                      {isGrandTotal ? (
                        <span className="font-extrabold uppercase tracking-wider text-[#38bdf8]">
                          GRAND TOTAL
                        </span>
                      ) : isTerrTotal ? (
                        <span className="font-extrabold text-[#38bdf8] uppercase tracking-wide">
                          {row.label}
                        </span>
                      ) : row.type === "rto" ? (
                        <span className={`text-[11px] ${isDark ? "text-[#94a3b8]" : "text-slate-600"}`}>
                          {row.territory}
                        </span>
                      ) : (
                        ""
                      )}
                    </td>

                    {/* District */}
                    <td className="p-2 font-medium">
                      {isDistTotal ? (
                        <span className={`font-bold uppercase tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
                          {row.label}
                        </span>
                      ) : row.type === "rto" ? (
                        <span className={isDark ? "text-white" : "text-slate-800"}>{row.district}</span>
                      ) : (
                        ""
                      )}
                    </td>

                    {/* Final RTO Name */}
                    <td className="p-2 font-semibold">
                      {row.type === "rto" ? (
                        <span className={isDark ? "text-[#e2e8f0]" : "text-slate-900"}>{row.rtoName}</span>
                      ) : (
                        ""
                      )}
                    </td>

                    {/* Total Registration */}
                    <td className="p-2 text-right font-mono font-bold">
                      {metrics.total.toLocaleString()}
                    </td>

                    {/* M&M Nos */}
                    <td className="p-2 text-right font-mono font-bold text-red-400">
                      {metrics.mm.toLocaleString()}
                    </td>

                    {/* M&M MS % */}
                    <td className="p-2 text-right font-mono font-bold">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                          metrics.ms >= 4.0
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : metrics.ms >= 3.0
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                            : metrics.ms >= 2.0
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            : isDark
                            ? "bg-slate-800 text-slate-400"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {metrics.ms.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={`flex items-center justify-between text-[11px] pt-1 ${
          isDark ? "text-[#64748b]" : "text-slate-500"
        }`}>
          <span>
            Displaying {filteredSummaryRows.length} summary rows for FY {selectedYear}
          </span>
          <span>
            Color Thresholds: <span className="text-emerald-400 font-bold">≥4% MS</span> •{" "}
            <span className="text-sky-400 font-bold">3–4% MS</span> •{" "}
            <span className="text-amber-400 font-bold">2–3% MS</span>
          </span>
        </div>
      </div>
    </div>
  );
}
