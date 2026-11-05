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
  CheckCircle2,
  Building2,
  Eye,
  EyeOff,
  Activity,
  Zap,
  Sparkles,
  RefreshCw,
  Calendar,
  RotateCcw
} from "lucide-react";
import ExcelJS from "exceljs";
import summaryDataRaw from "@/lib/summary-data.json";
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

const MONTHS_LIST = [
  { value: "ALL", label: "All Months (Full Year / Cumulative)" },
  { value: "JAN", label: "01 • January (JAN)" },
  { value: "FEB", label: "02 • February (FEB)" },
  { value: "MAR", label: "03 • March (MAR)" },
  { value: "APR", label: "04 • April (APR)" },
  { value: "MAY", label: "05 • May (MAY)" },
  { value: "JUN", label: "06 • June (JUN)" },
  { value: "JUL", label: "07 • July (JUL)" },
  { value: "AUG", label: "08 • August (AUG)" },
  { value: "SEP", label: "09 • September (SEP)" },
  { value: "OCT", label: "10 • October (OCT)" },
  { value: "NOV", label: "11 • November (NOV)" },
  { value: "DEC", label: "12 • December (DEC)" },
];

export const KERALA_TERRITORIES: Record<string, string[]> = {
  "North Kerala": [
    "Kannur",
    "Kasargod",
    "Wayanad",
    "Kozhikode",
    "Malappuram",
    "Palakkad",
    "Thrissur",
  ],
  "South Kerala": [
    "Thiruvananthapuram",
    "Kollam",
    "Pathanamthitta",
    "Alappuzha",
    "Kottayam",
    "Idukki",
    "Ernakulam",
  ],
};

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

function getRowVolume(row: any, selectedMonth: string = "ALL"): number {
  if (selectedMonth && selectedMonth !== "ALL") {
    const colName = selectedMonth.toUpperCase();
    if (colName === "DEC") {
      const v = row["DEC"] ?? row["dec_val"] ?? row["dec"] ?? 0;
      return Number(v) || 0;
    }
    const v = row[colName] ?? row[selectedMonth.toLowerCase()] ?? 0;
    return Number(v) || 0;
  }

  // Full Year Cumulative Total
  if (row.TOTAL !== undefined && row.TOTAL !== null && !isNaN(Number(row.TOTAL))) {
    return Number(row.TOTAL);
  }
  if (row.total !== undefined && row.total !== null && !isNaN(Number(row.total))) {
    return Number(row.total);
  }
  if (row.Value !== undefined && row.Value !== null && !isNaN(Number(row.Value))) {
    return Number(row.Value);
  }
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "dec_val"];
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

  // Base summary template rows from JSON (hierarchy structure)
  const summaryRowsTemplate = summaryDataRaw as SummaryRow[];

  // 1. DEPENDENT FILTER STATES
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedTerritory, setSelectedTerritory] = useState<string>("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [selectedRto, setSelectedRto] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("ALL");
  const [hideZeroRtos, setHideZeroRtos] = useState<boolean>(false);

  // Cached scraped rows from localStorage & database
  const [cachedScrapedRows, setCachedScrapedRows] = useState<any[]>([]);
  const [dbScrapedRows, setDbScrapedRows] = useState<any[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);

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
    } catch {}
  }, []);

  // Fetch live registrations from Hostinger database if no live scrape in memory
  const fetchDbRegistrations = async () => {
    setIsLoadingDb(true);
    try {
      const res = await fetch(`/api/db?type=registrations&year=${selectedYear}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setDbScrapedRows(json.data);
      }
    } catch (err) {
      console.warn("DB registrations fetch note:", err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    if ((!liveScrapedRows || liveScrapedRows.length === 0) && cachedScrapedRows.length === 0) {
      fetchDbRegistrations();
    }
  }, [selectedYear, liveScrapedRows.length, cachedScrapedRows.length]);

  // Pure Live Scraper Data: live session > localStorage cache > database registrations
  const activeDatasetRows = useMemo(() => {
    if (liveScrapedRows && liveScrapedRows.length > 0) return liveScrapedRows;
    if (cachedScrapedRows && cachedScrapedRows.length > 0) {
      const filtered = cachedScrapedRows.filter((r) => !r.Year || String(r.Year) === selectedYear);
      if (filtered.length > 0) return filtered;
      return cachedScrapedRows;
    }
    return dbScrapedRows;
  }, [liveScrapedRows, cachedScrapedRows, dbScrapedRows, selectedYear]);

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
    const code = (row.RTO_Code || row["RTO Code"] || row.Code || row.rto_code || "").toUpperCase().trim();
    if (SPECIAL_CODE_TO_FINAL_RTO[code]) {
      return SPECIAL_CODE_TO_FINAL_RTO[code];
    }
    const directFinal = row["Final RTO Name"] || row.finalRtoName || row.final_rto_name;
    if (directFinal) return String(directFinal).trim();

    const rawName = String(row.RTO_Name || row["RTO Name"] || row.rto_name || row.srtOffice || row.RTO || "").trim();
    const c = cleanRtoName(rawName);
    if (rtoDtLookup.has(c)) {
      return rtoDtLookup.get(c)!;
    }
    return rawName;
  };

  // Helper to identify OEM Grouping and Mahindra flag
  const resolveRowOem = (row: any): { grouping: string; isMahindra: boolean } => {
    const directGroup = row["OEM Group"] || row.oemGroup || row.oem_group;
    const directGrouping = row["OEM Grouping"] || row.oemGrouping || row.oem_grouping;
    if (directGroup === "M&M" || directGrouping === "Mahindra") {
      return { grouping: "Mahindra", isMahindra: true };
    }

    const rawMaker = String(row.Maker || row["OEM Name"] || row.OEM || row["Maker Name"] || row.maker || "").trim().toUpperCase();

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

  // -------------------------------------------------------------
  // 2. DEPENDENT CASCADING DROPDOWN LOGIC
  // -------------------------------------------------------------

  // A. Available Districts depends on selected Territory
  const availableDistricts = useMemo(() => {
    if (selectedTerritory === "North Kerala") {
      return KERALA_TERRITORIES["North Kerala"];
    }
    if (selectedTerritory === "South Kerala") {
      return KERALA_TERRITORIES["South Kerala"];
    }
    return [
      ...KERALA_TERRITORIES["North Kerala"],
      ...KERALA_TERRITORIES["South Kerala"],
    ];
  }, [selectedTerritory]);

  // When Territory Changes -> Validate/Reset District and RTO
  const handleTerritoryChange = (newTerr: string) => {
    setSelectedTerritory(newTerr);
    if (newTerr !== "ALL") {
      const allowedDistricts = KERALA_TERRITORIES[newTerr] || [];
      if (selectedDistrict !== "ALL" && !allowedDistricts.includes(selectedDistrict)) {
        setSelectedDistrict("ALL");
        setSelectedRto("ALL");
      }
    }
  };

  // B. Available RTOs depends on selected District and Territory
  const availableRtos = useMemo(() => {
    let rtos = summaryRowsTemplate.filter((r) => r.type === "rto");
    if (selectedTerritory !== "ALL") {
      rtos = rtos.filter((r) => r.territory === selectedTerritory);
    }
    if (selectedDistrict !== "ALL") {
      rtos = rtos.filter((r) => r.district === selectedDistrict);
    }
    return Array.from(new Set(rtos.map((r) => r.rtoName))).sort();
  }, [selectedTerritory, selectedDistrict, summaryRowsTemplate]);

  // When District Changes -> Auto-sync Territory and Reset RTO
  const handleDistrictChange = (newDist: string) => {
    setSelectedDistrict(newDist);
    if (newDist !== "ALL") {
      if (KERALA_TERRITORIES["North Kerala"].includes(newDist)) {
        setSelectedTerritory("North Kerala");
      } else if (KERALA_TERRITORIES["South Kerala"].includes(newDist)) {
        setSelectedTerritory("South Kerala");
      }
    }
    setSelectedRto("ALL");
  };

  // Reset all cascading filters back to ALL
  const handleResetFilters = () => {
    setSelectedMonth("ALL");
    setSelectedTerritory("ALL");
    setSelectedDistrict("ALL");
    setSelectedRto("ALL");
    setSearchQuery("");
  };

  // Distinct RTO count in live scraper dataset
  const activeDatasetRtoCount = useMemo(() => {
    const rtoSet = new Set<string>();
    activeDatasetRows.forEach((r) => {
      const finalName = resolveRowToFinalRto(r);
      if (finalName) rtoSet.add(cleanRtoName(finalName));
    });
    return rtoSet.size;
  }, [activeDatasetRows, rtoDtLookup]);

  // Compute Active OEM Market Shares from Live Scraper Data (Month & Filters Applied)
  const activeOemBreakdown = useMemo(() => {
    if (!activeDatasetRows || activeDatasetRows.length === 0) return [];

    const groupMap: Record<string, number> = {};
    let totalVal = 0;

    activeDatasetRows.forEach((r) => {
      // 1. Year filter
      const rowYr = String(r.Year || r.FY || r.year || "").trim();
      if (rowYr && rowYr !== selectedYear) return;

      // 2. Territory & District filter on row
      const finalName = resolveRowToFinalRto(r);
      const cleanKey = cleanRtoName(finalName);

      // Check RTO filter
      if (selectedRto !== "ALL" && cleanKey !== cleanRtoName(selectedRto)) {
        return;
      }

      // Check District filter
      if (selectedDistrict !== "ALL") {
        const rowDist = r.district || r.District || "";
        if (rowDist && rowDist !== selectedDistrict) return;
      }

      // Check Territory filter
      if (selectedTerritory !== "ALL") {
        const rowTerr = r.territory || r.Territory || "";
        if (rowTerr && rowTerr !== selectedTerritory) return;
      }

      const { grouping } = resolveRowOem(r);
      const vol = getRowVolume(r, selectedMonth);
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
  }, [selectedYear, selectedMonth, selectedTerritory, selectedDistrict, selectedRto, activeDatasetRows, oemDb, rtoDtLookup]);

  // DYNAMIC SUMMARY ROWS ENGINE (Month & Cascading Filters Applied)
  const computedSummaryRows = useMemo(() => {
    // 1. Build volume map for each RTO from activeDatasetRows for selectedMonth
    const rtoMap = new Map<string, { total: number; mm: number }>();

    activeDatasetRows.forEach((row) => {
      const rowYr = String(row.Year || row.FY || row.year || "").trim();
      if (rowYr && rowYr !== selectedYear) return;

      const finalName = resolveRowToFinalRto(row);
      const key = cleanRtoName(finalName);
      const vol = getRowVolume(row, selectedMonth);
      const { isMahindra } = resolveRowOem(row);

      const curr = rtoMap.get(key) || { total: 0, mm: 0 };
      curr.total += vol;
      if (isMahindra) curr.mm += vol;
      rtoMap.set(key, curr);
    });

    // 2. Clone hierarchy template and calculate sub-totals
    const newRows: SummaryRow[] = [];
    const districtAccumulator: Record<string, { total: number; mm: number }> = {};
    const territoryAccumulator: Record<string, { total: number; mm: number }> = {
      "North Kerala": { total: 0, mm: 0 },
      "South Kerala": { total: 0, mm: 0 },
    };

    summaryRowsTemplate.forEach((templateRow) => {
      if (templateRow.district === "District") return; // skip header

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
  }, [selectedYear, selectedMonth, activeDatasetRows, summaryRowsTemplate, rtoDtLookup, oemDb]);

  // Compute Grand Totals & KPI Cards from live scraper data
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

  // Filtered Summary Table Rows (Respects Cascading Dropdown Selections)
  const filteredSummaryRows = useMemo(() => {
    return computedSummaryRows.filter((r) => {
      // 1. Hide Zero RTO filter
      if (hideZeroRtos && r.type === "rto") {
        const metrics = r.years[selectedYear];
        if (!metrics || metrics.total === 0) return false;
      }

      // 2. Specific RTO filter
      if (selectedRto !== "ALL") {
        if (r.type !== "rto") return false;
        if (cleanRtoName(r.rtoName) !== cleanRtoName(selectedRto)) return false;
      }

      // 3. Dependent Territory filter
      if (selectedTerritory !== "ALL" && r.territory !== selectedTerritory && r.type !== "grand_total") {
        return false;
      }

      // 4. Dependent District filter
      if (selectedDistrict !== "ALL") {
        if (r.type === "grand_total" || r.type === "territory_total") return false;
        if (r.district !== selectedDistrict && !r.label.startsWith(selectedDistrict)) return false;
      }

      // 5. Search filter
      if (searchQuery.trim() && searchQuery !== "ALL") {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          r.label.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.territory.toLowerCase().includes(q);
        if (!matches && r.type !== "grand_total") return false;
      }

      return true;
    });
  }, [computedSummaryRows, selectedTerritory, selectedDistrict, selectedRto, searchQuery, hideZeroRtos, selectedYear]);

  // Active Timeframe Label for headers and exports
  const timeframeLabel = selectedMonth === "ALL" ? `FY ${selectedYear}` : `${selectedMonth} ${selectedYear}`;

  // Export Summary Table as formatted Excel
  const handleExportSummaryExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Vahan Kerala Live Intelligence Dashboard";
      const sheet = workbook.addWorksheet(`Summary_${timeframeLabel.replace(/\s+/g, "_")}`);

      sheet.addRow([
        "Territory",
        "District",
        "Final RTO Name",
        `Total Registration (${timeframeLabel})`,
        `M&M Nos (${timeframeLabel})`,
        `M&M MS % (${timeframeLabel})`,
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
      a.download = `Vahan_Kerala_Live_${timeframeLabel.replace(/\s+/g, "_")}.xlsx`;
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
      {/* 1. DEDICATED LIVE SCRAPER ENGINE STATUS HEADER */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border transition ${
        isDark ? "bg-[#0a1120] border-[#1b2b48]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="p-1.5 rounded bg-[#0284c7]/20 border border-[#0284c7] text-[#38bdf8]">
              <Zap className="w-4 h-4 fill-[#38bdf8]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-black tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
                LIVE SCRAPER EXECUTIVE DASHBOARD
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#0284c7] text-white tracking-wider">
                KL • KERALA
              </span>
            </div>
            <p className={`text-[11px] ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              Direct real-time analytics computed strictly from your live scraped vehicle registration database
            </p>
          </div>
        </div>

        {/* Live Scraper Stats Badge & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-bold ${
            isDark ? "bg-[#070d18] border-[#18263e]" : "bg-slate-100 border-slate-300"
          }`}>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Activity className="w-3.5 h-3.5" />
              <span>{activeDatasetRows.length.toLocaleString()} Scraped Records</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[#38bdf8]">{activeDatasetRtoCount} RTOs Loaded</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400 font-black">{timeframeLabel}</span>
          </div>

          <button
            type="button"
            onClick={fetchDbRegistrations}
            title="Refresh latest scraped data from Hostinger database"
            className={`p-1.5 rounded border transition ${
              isDark
                ? "bg-[#0c1424] border-[#1e2e4f] text-[#94a3b8] hover:text-white hover:bg-[#131f38]"
                : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? "animate-spin text-[#38bdf8]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. CASCADING DEPENDENT CONTROLS & DRILL-DOWN TOOLBAR */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border ${
        isDark ? "bg-[#080e1b] border-[#18243b]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* A. FY Year Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-[#38bdf8]" : "text-sky-700"}`}>
              FY Year:
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

          {/* B. Month Dropdown (NEW!) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-amber-400" : "text-amber-700"}`}>
              Month:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs font-bold border focus:outline-none ${
                isDark
                  ? "bg-[#060c18] border-[#1f2f4c] text-amber-400 focus:border-amber-400"
                  : "bg-amber-50 border-amber-300 text-amber-900 focus:border-amber-500"
              }`}
            >
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <span className="hidden lg:inline text-slate-500">|</span>

          {/* C. Territory Dropdown (Parent 1) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              Territory:
            </span>
            <select
              value={selectedTerritory}
              onChange={(e) => handleTerritoryChange(e.target.value)}
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

          {/* D. District Dropdown (Dependent on Territory!) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              District:
            </span>
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold border focus:outline-none ${
                isDark
                  ? "bg-[#060c18] border-[#1f2f4c] text-white focus:border-[#38bdf8]"
                  : "bg-slate-100 border-slate-300 text-slate-900 focus:border-sky-500"
              }`}
            >
              <option value="ALL">
                {selectedTerritory === "ALL" ? "All 14 Districts" : `All ${selectedTerritory} Districts`}
              </option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* E. RTO Dropdown (Dependent on District & Territory!) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              RTO Office:
            </span>
            <select
              value={selectedRto}
              onChange={(e) => setSelectedRto(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold border focus:outline-none max-w-[170px] truncate ${
                isDark
                  ? "bg-[#060c18] border-[#1f2f4c] text-white focus:border-[#38bdf8]"
                  : "bg-slate-100 border-slate-300 text-slate-900 focus:border-sky-500"
              }`}
            >
              <option value="ALL">
                {selectedDistrict === "ALL"
                  ? selectedTerritory === "ALL"
                    ? "All 87 RTOs"
                    : `All ${selectedTerritory} RTOs (${availableRtos.length})`
                  : `All in ${selectedDistrict} (${availableRtos.length})`}
              </option>
              {availableRtos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Shortcut */}
          {(selectedMonth !== "ALL" || selectedTerritory !== "ALL" || selectedDistrict !== "ALL" || selectedRto !== "ALL") && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters back to All Kerala Full Year"
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border transition ${
                isDark
                  ? "bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700"
                  : "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300"
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportSummaryExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#38bdf8] shadow transition"
        >
          <Download className="w-3.5 h-3.5" />
          Export {timeframeLabel} Excel
        </button>
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
              Total Registrations ({timeframeLabel})
            </span>
            <Car className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="mt-2">
            <span className={`text-xl sm:text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
              {kpiData.totalVehicles.toLocaleString()}
            </span>
            <span className={`block text-[11px] font-medium mt-0.5 ${isDark ? "text-[#94a3b8]" : "text-slate-500"}`}>
              {selectedDistrict !== "ALL"
                ? `District: ${selectedDistrict}`
                : selectedTerritory !== "ALL"
                ? `Territory: ${selectedTerritory}`
                : `Across ${activeDatasetRtoCount} Scraped Kerala RTOs`}
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
              Vehicles Registered ({timeframeLabel})
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
              {selectedMonth === "ALL" ? "Cumulative" : selectedMonth}
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
              OEM Grouping Market Share Breakdown ({timeframeLabel})
            </h3>
          </div>
          <span className={`text-[11px] ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
            Scope: <span className="font-bold text-[#38bdf8]">
              {selectedRto !== "ALL"
                ? `RTO ${selectedRto}`
                : selectedDistrict !== "ALL"
                ? `District ${selectedDistrict}`
                : selectedTerritory}
            </span>
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

      {/* 5. Territory & District Summary Table (Image 4 replica) */}
      <div className={`flex flex-col gap-2 rounded-lg border p-3 ${
        isDark ? "bg-[#090f1d] border-[#18263e]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1f2f4c]/40">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#38bdf8]" />
            <h3 className={`text-xs font-extrabold uppercase tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
              Territory & District Registration Summary Table ({timeframeLabel})
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <th className="p-2 text-right w-36">Total Registration ({timeframeLabel})</th>
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
            Displaying {filteredSummaryRows.length} summary rows for {timeframeLabel}
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
