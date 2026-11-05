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
  RotateCcw,
  Plus,
  Minus
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
  monthly?: Record<string, number>;
}

export interface FYOption {
  value: string; // e.g. "2026"
  label: string; // "FY 2025-26 (FY26)"
  startYear: number; // 2025
  endYear: number; // 2026
  prevYY: string; // "25"
  currYY: string; // "26"
}

export const AVAILABLE_FY_LIST: FYOption[] = [
  { value: "2027", label: "FY 2026-27 (FY27)", startYear: 2026, endYear: 2027, prevYY: "26", currYY: "27" },
  { value: "2026", label: "FY 2025-26 (FY26)", startYear: 2025, endYear: 2026, prevYY: "25", currYY: "26" },
  { value: "2025", label: "FY 2024-25 (FY25)", startYear: 2024, endYear: 2025, prevYY: "24", currYY: "25" },
  { value: "2024", label: "FY 2023-24 (FY24)", startYear: 2023, endYear: 2024, prevYY: "23", currYY: "24" },
  { value: "2023", label: "FY 2022-23 (FY23)", startYear: 2022, endYear: 2023, prevYY: "22", currYY: "23" },
  { value: "2022", label: "FY 2021-22 (FY22)", startYear: 2021, endYear: 2022, prevYY: "21", currYY: "22" },
  { value: "2021", label: "FY 2020-21 (FY21)", startYear: 2020, endYear: 2021, prevYY: "20", currYY: "21" },
];

export interface FYMonthItem {
  code: string;       // "APR", "MAY", ... "MAR"
  name: string;       // "Apr", "May", ... "Mar"
  mmmYy: string;      // "Apr-25", "May-25", ... "Jan-26", "Mar-26"
  calYear: number;    // 2025 for Apr-Dec, 2026 for Jan-Mar
  quarter: string;    // "Q1", "Q2", "Q3", "Q4"
  order: number;      // 1 to 12
}

export function getFyMonthSequence(selectedYear: string): FYMonthItem[] {
  const numYr = parseInt(selectedYear, 10) || 2026;
  const startYr = numYr - 1;
  const endYr = numYr;
  const prevYY = String(startYr).slice(-2);
  const currYY = String(endYr).slice(-2);

  return [
    { code: "APR", name: "Apr", mmmYy: `Apr-${prevYY}`, calYear: startYr, quarter: "Q1", order: 1 },
    { code: "MAY", name: "May", mmmYy: `May-${prevYY}`, calYear: startYr, quarter: "Q1", order: 2 },
    { code: "JUN", name: "Jun", mmmYy: `Jun-${prevYY}`, calYear: startYr, quarter: "Q1", order: 3 },
    { code: "JUL", name: "Jul", mmmYy: `Jul-${prevYY}`, calYear: startYr, quarter: "Q2", order: 4 },
    { code: "AUG", name: "Aug", mmmYy: `Aug-${prevYY}`, calYear: startYr, quarter: "Q2", order: 5 },
    { code: "SEP", name: "Sep", mmmYy: `Sep-${prevYY}`, calYear: startYr, quarter: "Q2", order: 6 },
    { code: "OCT", name: "Oct", mmmYy: `Oct-${prevYY}`, calYear: startYr, quarter: "Q3", order: 7 },
    { code: "NOV", name: "Nov", mmmYy: `Nov-${prevYY}`, calYear: startYr, quarter: "Q3", order: 8 },
    { code: "DEC", name: "Dec", mmmYy: `Dec-${prevYY}`, calYear: startYr, quarter: "Q3", order: 9 },
    { code: "JAN", name: "Jan", mmmYy: `Jan-${currYY}`, calYear: endYr,   quarter: "Q4", order: 10 },
    { code: "FEB", name: "Feb", mmmYy: `Feb-${currYY}`, calYear: endYr,   quarter: "Q4", order: 11 },
    { code: "MAR", name: "Mar", mmmYy: `Mar-${currYY}`, calYear: endYr,   quarter: "Q4", order: 12 },
  ];
}

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

function getRowVolume(row: any, selectedMonth: string = "ALL", selectedFyYear: string = "2026"): number {
  const fyMonths = getFyMonthSequence(selectedFyYear);
  const numYr = parseInt(selectedFyYear, 10) || 2026;
  const startYr = numYr - 1;
  const endYr = numYr;

  if (selectedMonth && selectedMonth !== "ALL") {
    // 1. Match month item from FY sequence
    const target = fyMonths.find(
      (m) => m.mmmYy.toUpperCase() === selectedMonth.toUpperCase() ||
             m.code.toUpperCase() === selectedMonth.toUpperCase() ||
             m.name.toUpperCase() === selectedMonth.toUpperCase()
    );

    if (target) {
      const rowYr = Number(row.Year || row.year || row.FY);
      // If dataset contains multi-year rows, ensure year matches the target FY calendar year
      if (rowYr && (rowYr === startYr || rowYr === endYr) && rowYr !== target.calYear) {
        return 0;
      }
      const col = target.code;
      if (col === "DEC") {
        return Number(row["DEC"] ?? row["dec_val"] ?? row["dec"] ?? 0) || 0;
      }
      return Number(row[col] ?? row[col.toLowerCase()] ?? row[target.mmmYy] ?? 0) || 0;
    }

    // Direct month abbreviation fallback (e.g. "APR")
    const colName = selectedMonth.slice(0, 3).toUpperCase();
    if (colName === "DEC") {
      return Number(row["DEC"] ?? row["dec_val"] ?? row["dec"] ?? 0) || 0;
    }
    return Number(row[colName] ?? row[colName.toLowerCase()] ?? 0) || 0;
  }

  // 2. Full Financial Year Cumulative (Apr to Mar):
  const rowYr = Number(row.Year || row.year || row.FY);
  if (rowYr === startYr) {
    // Months April - December of startYear
    const aprDec = ["APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "dec_val"];
    let s = 0;
    for (const m of aprDec) {
      const v = row[m] ?? row[m.toLowerCase()];
      if (v !== undefined && !isNaN(Number(v))) s += Number(v);
    }
    return s;
  } else if (rowYr === endYr) {
    // Months January - March of endYear
    const janMar = ["JAN", "FEB", "MAR"];
    let s = 0;
    for (const m of janMar) {
      const v = row[m] ?? row[m.toLowerCase()];
      if (v !== undefined && !isNaN(Number(v))) s += Number(v);
    }
    return s;
  }

  // If single-year dataset or row without Year: take TOTAL or sum all 12 FY months
  if (row.TOTAL !== undefined && row.TOTAL !== null && !isNaN(Number(row.TOTAL))) {
    return Number(row.TOTAL);
  }
  if (row.total !== undefined && row.total !== null && !isNaN(Number(row.total))) {
    return Number(row.total);
  }
  const allMonths = ["APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "dec_val", "JAN", "FEB", "MAR"];
  let sum = 0;
  let found = false;
  for (const m of allMonths) {
    const v = row[m] ?? row[m.toLowerCase()];
    if (v !== undefined && !isNaN(Number(v))) {
      sum += Number(v);
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
  const [selectedSegment, setSelectedSegment] = useState<"PV" | "CV" | "BEV" | "ALL">("PV");
  const [selectedTerritory, setSelectedTerritory] = useState<string>("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [selectedRto, setSelectedRto] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("ALL");
  const [hideZeroRtos, setHideZeroRtos] = useState<boolean>(false);
  const [tableMode, setTableMode] = useState<"summary" | "monthly">("summary");

  // FY Definition & 12 Month Financial Year Sequence (Apr to Mar)
  const fyOption = useMemo(
    () => AVAILABLE_FY_LIST.find((f) => f.value === selectedYear) || AVAILABLE_FY_LIST[1],
    [selectedYear]
  );
  const fyMonths = useMemo(() => getFyMonthSequence(selectedYear), [selectedYear]);

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

  // Fetch live registrations from Hostinger database (fetches both FY calendar years)
  const fetchDbRegistrations = async () => {
    setIsLoadingDb(true);
    try {
      const numYr = parseInt(selectedYear, 10) || 2026;
      const yearsNeeded = `${numYr - 1},${numYr}`;
      const res = await fetch(`/api/db?type=registrations&year=${yearsNeeded}`);
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
    fetchDbRegistrations();
  }, [selectedYear]);

  // Pure Live Scraper Data: Merge database registrations with fresh live session scraped rows
  // Ensures that when 2025 is scraped, 2026 is NEVER truncated/lost, and when 2026 is scraped, 2026 is cleanly updated!
  // Segments (PV, CV, BEV) are partitioned cleanly by composite key (year + segment + rto + maker)
  const activeDatasetRows = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Baseline from MariaDB database (holds 2025, 2026, and all historical years & segments)
    dbScrapedRows.forEach((r) => {
      const yr = String(r.Year || r.year || r.FY || "").trim();
      const seg = String(r.segment || r.Segment || "PV").toUpperCase().trim();
      const code = String(r.RTO_Code || r.rto_code || r.Code || "").toUpperCase().trim();
      const maker = String(r.Maker || r.maker || "").toUpperCase().trim();
      const key = `${yr}_${seg}_${code}_${maker}`;
      map.set(key, r);
    });

    // 2. Overlay cached scraped rows
    cachedScrapedRows.forEach((r) => {
      const yr = String(r.Year || r.year || r.FY || "").trim();
      const seg = String(r.segment || r.Segment || "PV").toUpperCase().trim();
      const code = String(r.RTO_Code || r.rto_code || r.Code || "").toUpperCase().trim();
      const maker = String(r.Maker || r.maker || "").toUpperCase().trim();
      const key = `${yr}_${seg}_${code}_${maker}`;
      map.set(key, r);
    });

    // 3. Overlay fresh live scraped rows from current session (highest priority for its specific year + segment + RTO)
    liveScrapedRows.forEach((r) => {
      const yr = String(r.Year || r.year || r.FY || "").trim();
      const seg = String(r.segment || r.Segment || "PV").toUpperCase().trim();
      const code = String(r.RTO_Code || r.rto_code || r.Code || "").toUpperCase().trim();
      const maker = String(r.Maker || r.maker || "").toUpperCase().trim();
      const key = `${yr}_${seg}_${code}_${maker}`;
      map.set(key, r);
    });

    const allRows = Array.from(map.values());
    if (selectedSegment === "ALL") {
      return allRows;
    }
    return allRows.filter((r) => {
      const s = String(r.segment || r.Segment || "PV").toUpperCase().trim();
      return s === selectedSegment;
    });
  }, [liveScrapedRows, cachedScrapedRows, dbScrapedRows, selectedSegment]);

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
      // 1. Territory & District filter on row
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
      const vol = getRowVolume(r, selectedMonth, selectedYear);
      if (vol === 0) return;
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
    // 1. Build volume map for each RTO from activeDatasetRows for selectedMonth & individual FY months
    const rtoMap = new Map<string, { total: number; mm: number; monthly: Record<string, number> }>();

    activeDatasetRows.forEach((row) => {
      const finalName = resolveRowToFinalRto(row);
      const key = cleanRtoName(finalName);
      const vol = getRowVolume(row, selectedMonth, selectedYear);
      const { isMahindra } = resolveRowOem(row);

      const curr = rtoMap.get(key) || { total: 0, mm: 0, monthly: {} };
      curr.total += vol;
      if (isMahindra) curr.mm += vol;

      // Accumulate monthly volumes for 12 FY months (Apr to Mar in mmm-yy format)
      fyMonths.forEach((m) => {
        const mVol = getRowVolume(row, m.mmmYy, selectedYear);
        curr.monthly[m.mmmYy] = (curr.monthly[m.mmmYy] || 0) + mVol;
      });

      rtoMap.set(key, curr);
    });

    // 2. Clone hierarchy template and calculate sub-totals
    const newRows: SummaryRow[] = [];
    const districtAccumulator: Record<string, { total: number; mm: number; monthly: Record<string, number> }> = {};
    const territoryAccumulator: Record<string, { total: number; mm: number; monthly: Record<string, number> }> = {
      "North Kerala": { total: 0, mm: 0, monthly: {} },
      "South Kerala": { total: 0, mm: 0, monthly: {} },
    };

    summaryRowsTemplate.forEach((templateRow) => {
      if (templateRow.district === "District") return; // skip header

      if (templateRow.type === "rto") {
        const key = cleanRtoName(templateRow.rtoName);
        const stats = rtoMap.get(key) || { total: 0, mm: 0, monthly: {} };
        const ms = stats.total > 0 ? (stats.mm / stats.total) * 100 : 0;

        // Accumulate into District & Territory
        if (!districtAccumulator[templateRow.district]) {
          districtAccumulator[templateRow.district] = { total: 0, mm: 0, monthly: {} };
        }
        districtAccumulator[templateRow.district].total += stats.total;
        districtAccumulator[templateRow.district].mm += stats.mm;
        fyMonths.forEach((m) => {
          districtAccumulator[templateRow.district].monthly[m.mmmYy] =
            (districtAccumulator[templateRow.district].monthly[m.mmmYy] || 0) + (stats.monthly[m.mmmYy] || 0);
        });

        if (territoryAccumulator[templateRow.territory]) {
          territoryAccumulator[templateRow.territory].total += stats.total;
          territoryAccumulator[templateRow.territory].mm += stats.mm;
          fyMonths.forEach((m) => {
            territoryAccumulator[templateRow.territory].monthly[m.mmmYy] =
              (territoryAccumulator[templateRow.territory].monthly[m.mmmYy] || 0) + (stats.monthly[m.mmmYy] || 0);
          });
        }

        const existingYears = templateRow.years || {};
        const finalTotal = activeDatasetRows.length > 0 ? stats.total : (existingYears[selectedYear]?.total || 0);
        const finalMm = activeDatasetRows.length > 0 ? stats.mm : (existingYears[selectedYear]?.mm || 0);
        const finalMs = finalTotal > 0 ? (finalMm / finalTotal) * 100 : 0;

        newRows.push({
          ...templateRow,
          years: {
            ...existingYears,
            [selectedYear]: { total: finalTotal, mm: finalMm, ms: finalMs },
          },
          monthly: stats.monthly,
        });
      } else if (templateRow.type === "district_total") {
        const distKey = templateRow.label.replace(/\s+Total$/i, "").trim();
        const distStats = districtAccumulator[distKey] || districtAccumulator[templateRow.district] || { total: 0, mm: 0, monthly: {} };
        const existingYears = templateRow.years || {};
        const finalTotal = activeDatasetRows.length > 0 ? distStats.total : (existingYears[selectedYear]?.total || 0);
        const finalMm = activeDatasetRows.length > 0 ? distStats.mm : (existingYears[selectedYear]?.mm || 0);
        const finalMs = finalTotal > 0 ? (finalMm / finalTotal) * 100 : 0;

        newRows.push({
          ...templateRow,
          years: {
            ...existingYears,
            [selectedYear]: { total: finalTotal, mm: finalMm, ms: finalMs },
          },
          monthly: distStats.monthly,
        });
      } else if (templateRow.type === "territory_total") {
        const terrName = templateRow.label.replace(/\s+Total$/i, "").trim();
        const terrStats = territoryAccumulator[terrName] || territoryAccumulator[templateRow.territory] || { total: 0, mm: 0, monthly: {} };
        const existingYears = templateRow.years || {};
        const finalTotal = activeDatasetRows.length > 0 ? terrStats.total : (existingYears[selectedYear]?.total || 0);
        const finalMm = activeDatasetRows.length > 0 ? terrStats.mm : (existingYears[selectedYear]?.mm || 0);
        const finalMs = finalTotal > 0 ? (finalMm / finalTotal) * 100 : 0;

        newRows.push({
          ...templateRow,
          years: {
            ...existingYears,
            [selectedYear]: { total: finalTotal, mm: finalMm, ms: finalMs },
          },
          monthly: terrStats.monthly,
        });
      } else if (templateRow.type === "grand_total") {
        const grandTotalAcc =
          (territoryAccumulator["North Kerala"]?.total || 0) +
          (territoryAccumulator["South Kerala"]?.total || 0);
        const grandMmAcc =
          (territoryAccumulator["North Kerala"]?.mm || 0) +
          (territoryAccumulator["South Kerala"]?.mm || 0);

        const existingYears = templateRow.years || {};
        const finalTotal = activeDatasetRows.length > 0 ? grandTotalAcc : (existingYears[selectedYear]?.total || 0);
        const finalMm = activeDatasetRows.length > 0 ? grandMmAcc : (existingYears[selectedYear]?.mm || 0);
        const finalMs = finalTotal > 0 ? (finalMm / finalTotal) * 100 : 0;

        const grandMonthly: Record<string, number> = {};
        fyMonths.forEach((m) => {
          grandMonthly[m.mmmYy] =
            (territoryAccumulator["North Kerala"]?.monthly[m.mmmYy] || 0) +
            (territoryAccumulator["South Kerala"]?.monthly[m.mmmYy] || 0);
        });

        newRows.push({
          ...templateRow,
          years: {
            ...existingYears,
            [selectedYear]: { total: finalTotal, mm: finalMm, ms: finalMs },
          },
          monthly: grandMonthly,
        });
      }
    });

    return newRows;
  }, [selectedYear, selectedMonth, activeDatasetRows, summaryRowsTemplate, rtoDtLookup, oemDb, fyMonths]);

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

  // Hierarchical Territory -> District -> RTO Groups for Merged & Collapsible Rendering
  const territoryGroups = useMemo(() => {
    const terrMap: Record<string, {
      territoryName: string;
      districts: Record<string, {
        districtName: string;
        territoryName: string;
        totalRow?: SummaryRow;
        rtos: SummaryRow[];
      }>;
      totalRow?: SummaryRow;
    }> = {
      "North Kerala": { territoryName: "North Kerala", districts: {} },
      "South Kerala": { territoryName: "South Kerala", districts: {} },
    };

    computedSummaryRows.forEach((row) => {
      if (row.type === "rto") {
        const terr = row.territory === "South Kerala" ? "South Kerala" : "North Kerala";
        if (!terrMap[terr].districts[row.district]) {
          terrMap[terr].districts[row.district] = {
            districtName: row.district,
            territoryName: terr,
            rtos: [],
          };
        }
        terrMap[terr].districts[row.district].rtos.push(row);
      } else if (row.type === "district_total") {
        const distName = row.label.replace(/\s+Total$/i, "").trim();
        const terr = row.territory === "South Kerala" ? "South Kerala" : "North Kerala";
        if (!terrMap[terr].districts[distName]) {
          terrMap[terr].districts[distName] = {
            districtName: distName,
            territoryName: terr,
            rtos: [],
          };
        }
        terrMap[terr].districts[distName].totalRow = row;
      } else if (row.type === "territory_total") {
        const terrName = row.label.replace(/\s+Total$/i, "").trim();
        if (terrMap[terrName]) {
          terrMap[terrName].totalRow = row;
        }
      }
    });

    return Object.values(terrMap).map((tg) => ({
      territoryName: tg.territoryName,
      districts: Object.values(tg.districts),
      totalRow: tg.totalRow,
    }));
  }, [computedSummaryRows]);

  // Expanded districts state: DEFAULT IS COLLAPSED (empty object)
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({});

  const toggleDistrict = (districtName: string) => {
    setExpandedDistricts((prev) => ({
      ...prev,
      [districtName]: !prev[districtName],
    }));
  };

  const expandAllDistricts = () => {
    const all: Record<string, boolean> = {};
    territoryGroups.forEach((tg) => {
      tg.districts.forEach((dg) => {
        all[dg.districtName] = true;
      });
    });
    setExpandedDistricts(all);
  };

  const collapseAllDistricts = () => {
    setExpandedDistricts({});
  };

  const isDistrictExpanded = (districtName: string): boolean => {
    if (selectedRto !== "ALL") return true;
    if (searchQuery.trim() && searchQuery.trim() !== "ALL") return true;
    return !!expandedDistricts[districtName];
  };

  const filteredTerritoryGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const hasSearch = q.length > 0 && q !== "all";

    return territoryGroups
      .map((tg) => {
        // Territory filter
        if (selectedTerritory !== "ALL" && tg.territoryName !== selectedTerritory) {
          return null;
        }

        const filteredDistricts = tg.districts
          .map((dg) => {
            // District filter
            if (selectedDistrict !== "ALL" && dg.districtName !== selectedDistrict) {
              return null;
            }

            // Filter child RTOs
            let rtos = dg.rtos;

            if (hideZeroRtos) {
              rtos = rtos.filter((r) => {
                const tot = r.years[selectedYear]?.total || 0;
                return tot > 0;
              });
            }

            if (selectedRto !== "ALL") {
              rtos = rtos.filter((r) => cleanRtoName(r.rtoName) === cleanRtoName(selectedRto));
              if (rtos.length === 0) return null;
            }

            if (hasSearch) {
              const districtMatches = dg.districtName.toLowerCase().includes(q) || tg.territoryName.toLowerCase().includes(q);
              if (!districtMatches) {
                rtos = rtos.filter((r) => r.rtoName.toLowerCase().includes(q) || r.label.toLowerCase().includes(q));
                if (rtos.length === 0) return null;
              }
            }

            if (hideZeroRtos) {
              const distTot = dg.totalRow?.years[selectedYear]?.total || 0;
              if (distTot === 0 && rtos.length === 0) return null;
            }

            return {
              ...dg,
              rtos,
            };
          })
          .filter(Boolean) as typeof tg.districts;

        if (filteredDistricts.length === 0) return null;

        return {
          ...tg,
          districts: filteredDistricts,
        };
      })
      .filter(Boolean) as typeof territoryGroups;
  }, [territoryGroups, selectedTerritory, selectedDistrict, selectedRto, searchQuery, hideZeroRtos, selectedYear]);

  const getDistrictRowCount = (dg: { districtName: string; rtos: SummaryRow[] }) => {
    const expanded = isDistrictExpanded(dg.districtName);
    return expanded ? 1 + dg.rtos.length : 1;
  };

  const grandTotalRow = useMemo(() => {
    return computedSummaryRows.find((r) => r.type === "grand_total");
  }, [computedSummaryRows]);

  // Active Timeframe Label: formatted strictly as mmm-yy when month is selected, or Full FY
  const activeMonthItem = useMemo(() => {
    if (selectedMonth === "ALL") return null;
    return fyMonths.find(
      (m) => m.mmmYy.toUpperCase() === selectedMonth.toUpperCase() ||
             m.code.toUpperCase() === selectedMonth.toUpperCase() ||
             m.name.toUpperCase() === selectedMonth.toUpperCase()
    );
  }, [selectedMonth, fyMonths]);

  const timeframeLabel = activeMonthItem
    ? activeMonthItem.mmmYy
    : `${fyOption.label} (Apr-${fyOption.prevYY} to Mar-${fyOption.currYY})`;

  // Export Summary Table as formatted Excel
  const handleExportSummaryExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Vahan Kerala Live Intelligence Dashboard";
      const sheet = workbook.addWorksheet(`Summary_${timeframeLabel.replace(/[\s():/]+/g, "_")}`);

      if (tableMode === "monthly") {
        // Export 12-Month Financial Year Grid (Apr to Mar in mmm-yy format)
        const headers = [
          "Territory",
          "District",
          "Final RTO Name",
          ...fyMonths.map((m) => m.mmmYy),
          "FY Total",
          "M&M Nos",
          "M&M MS %",
        ];
        sheet.addRow(headers);
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
          const rowVals = [
            r.type === "rto" ? r.territory : "",
            r.type === "rto" ? r.district : r.type === "district_total" ? r.label : "",
            r.type === "rto" ? r.rtoName : r.type !== "district_total" ? r.label : "",
            ...fyMonths.map((m) => r.monthly?.[m.mmmYy] || 0),
            metrics.total,
            metrics.mm,
            `${metrics.ms.toFixed(2)}%`,
          ];
          const row = sheet.addRow(rowVals);
          if (isTotal) {
            row.font = { bold: true };
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: r.type === "grand_total" ? "FFFEF3C7" : "FFF1F5F9" },
            };
          }
        });
      } else {
        // Export Focused Summary Table
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
      }

      sheet.columns = sheet.columns.map(() => ({ width: 18 }));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Vahan_Kerala_Live_${timeframeLabel.replace(/[\s():/]+/g, "_")}.xlsx`;
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
              <span>{activeDatasetRows.length.toLocaleString()} Records</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[#38bdf8] font-bold">
              {selectedSegment === "ALL" ? "All Segments" : `${selectedSegment} Segment`}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-sky-300">{activeDatasetRtoCount} RTOs</span>
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
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedMonth("ALL");
              }}
              className={`px-2.5 py-1.5 rounded text-xs font-bold border focus:outline-none ${
                isDark
                  ? "bg-[#060c18] border-[#1f2f4c] text-[#38bdf8] focus:border-[#38bdf8]"
                  : "bg-slate-100 border-slate-300 text-slate-900 focus:border-sky-500"
              }`}
            >
              {AVAILABLE_FY_LIST.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* B. Month Dropdown (Strictly Financial Year Apr to Mar in mmm-yy format) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-amber-400" : "text-amber-700"}`}>
              Month (Apr-Mar):
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
              <option value="ALL">
                All Months (Apr-{fyOption.prevYY} to Mar-{fyOption.currYY} • Full FY)
              </option>
              {fyMonths.map((m) => (
                <option key={m.mmmYy} value={m.mmmYy}>
                  {String(m.order).padStart(2, "0")} • {m.mmmYy} ({m.name})
                </option>
              ))}
            </select>
          </div>

          {/* C. Segment Selector (PV, CV, BEV, ALL) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
              Segment:
            </span>
            <div className={`flex items-center rounded border p-0.5 ${
              isDark ? "bg-[#060c18] border-[#1f2f4c]" : "bg-slate-100 border-slate-300"
            }`}>
              <button
                type="button"
                onClick={() => setSelectedSegment("PV")}
                className={`px-2.5 py-1 text-xs font-black rounded transition ${
                  selectedSegment === "PV"
                    ? "bg-[#0284c7] text-white shadow"
                    : isDark
                    ? "text-[#94a3b8] hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Filter by Passenger Vehicles (LMV+LPV, Non-EV)"
              >
                🚗 PV
              </button>
              <button
                type="button"
                onClick={() => setSelectedSegment("CV")}
                className={`px-2.5 py-1 text-xs font-black rounded transition ${
                  selectedSegment === "CV"
                    ? "bg-[#0284c7] text-white shadow"
                    : isDark
                    ? "text-[#94a3b8] hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Filter by Commercial Vehicles (LGV, Full Tick)"
              >
                🚛 CV
              </button>
              <button
                type="button"
                onClick={() => setSelectedSegment("BEV")}
                className={`px-2.5 py-1 text-xs font-black rounded transition ${
                  selectedSegment === "BEV"
                    ? "bg-[#0284c7] text-white shadow"
                    : isDark
                    ? "text-[#94a3b8] hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Filter by Battery Electric Vehicles (BOV + Pure EV)"
              >
                ⚡ BEV
              </button>
              <button
                type="button"
                onClick={() => setSelectedSegment("ALL")}
                className={`px-2 py-1 text-xs font-black rounded transition ${
                  selectedSegment === "ALL"
                    ? "bg-[#0284c7] text-white shadow"
                    : isDark
                    ? "text-[#94a3b8] hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Consolidated (All Segments Combined)"
              >
                All
              </button>
            </div>
          </div>

          <span className="hidden lg:inline text-slate-500">|</span>

          {/* D. Territory Dropdown (Parent 1) */}
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

      {/* 5. Territory & District Summary Table (Hierarchical, Merged, Expandable/Collapsible) */}
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
            {/* View Mode Switcher */}
            <div className={`flex items-center p-0.5 rounded border ${isDark ? "bg-[#060c18] border-[#1f2f4c]" : "bg-slate-100 border-slate-300"}`}>
              <button
                type="button"
                onClick={() => setTableMode("summary")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                  tableMode === "summary"
                    ? "bg-[#0284c7] text-white shadow-sm"
                    : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Focused Summary
              </button>
              <button
                type="button"
                onClick={() => setTableMode("monthly")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                  tableMode === "monthly"
                    ? "bg-[#0284c7] text-white shadow-sm"
                    : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                12-M Trend (Apr-Mar)
              </button>
            </div>

            {/* Expand / Collapse All Districts */}
            <div className={`flex items-center p-0.5 rounded border ${isDark ? "bg-[#060c18] border-[#1f2f4c]" : "bg-slate-100 border-slate-300"}`}>
              <button
                type="button"
                onClick={expandAllDistricts}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                  isDark ? "text-sky-400 hover:bg-[#132038]" : "text-sky-700 hover:bg-sky-100"
                }`}
                title="Expand all 14 districts to show child RTOs"
              >
                <Plus className="w-3.5 h-3.5" />
                Expand All
              </button>
              <span className={`px-1 text-xs ${isDark ? "text-slate-600" : "text-slate-300"}`}>|</span>
              <button
                type="button"
                onClick={collapseAllDistricts}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                  isDark ? "text-slate-400 hover:bg-[#132038]" : "text-slate-600 hover:bg-slate-200"
                }`}
                title="Collapse all districts to summary level (Default)"
              >
                <Minus className="w-3.5 h-3.5" />
                Collapse All
              </button>
            </div>

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
              {hideZeroRtos ? "Active RTOs Only" : "All 87 RTOs"}
            </button>

            {/* Search within table */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDark ? "text-[#64748b]" : "text-slate-400"}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick filter RTO or District..."
                className={`pl-8 pr-3 py-1 rounded text-xs border focus:outline-none w-44 sm:w-52 ${
                  isDark
                    ? "bg-[#060c18] border-[#1f2f4c] text-white focus:border-[#38bdf8]"
                    : "bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Summary Table */}
        <div className={`overflow-auto rounded border max-h-[650px] ${
          isDark ? "border-[#1b2842] bg-[#060a14]" : "border-slate-200 bg-white"
        }`}>
          <table className="w-full text-left border-collapse">
            <thead className={`sticky top-0 z-10 font-black border-b text-xs ${
              isDark ? "bg-[#0d1627] text-[#38bdf8] border-[#1f2f4c]" : "bg-slate-100 text-slate-800 border-slate-300"
            }`}>
              {tableMode === "monthly" ? (
                <tr>
                  <th className="p-3 w-36 text-center border-r border-[#1f2f4c]/30">Territory</th>
                  <th className="p-3 w-44 text-center border-r border-[#1f2f4c]/30">District</th>
                  <th className="p-3 min-w-[170px]">Final RTO Name</th>
                  {fyMonths.map((m) => (
                    <th key={m.mmmYy} className="p-2 text-right w-16 font-mono text-[11px] text-amber-400">
                      {m.mmmYy}
                    </th>
                  ))}
                  <th className="p-3 text-right w-28 text-[#38bdf8] uppercase">FY Total</th>
                  <th className="p-3 text-right w-24 text-red-400 uppercase">M&M Nos</th>
                  <th className="p-3 text-right w-24 text-[#34d399] uppercase">M&M MS %</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-3 w-36 text-center border-r border-[#1f2f4c]/30">Territory</th>
                  <th className="p-3 w-48 text-center border-r border-[#1f2f4c]/30">District</th>
                  <th className="p-3 min-w-[180px]">Final RTO Name</th>
                  <th className="p-3 text-right w-52 uppercase">Total Registration ({timeframeLabel})</th>
                  <th className="p-3 text-right w-36 text-red-400 uppercase">M&M Nos</th>
                  <th className="p-3 text-right w-32 text-[#34d399] uppercase">M&M MS %</th>
                </tr>
              )}
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-[#131f33]" : "divide-slate-200"}`}>
              {filteredTerritoryGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableMode === "monthly" ? 18 : 6}
                    className={`p-8 text-center text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    No matching registration records found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTerritoryGroups.map((tg) => {
                  const tgDistricts = tg.districts;
                  const showTerrTotal = selectedDistrict === "ALL" && selectedRto === "ALL";
                  const territoryRowCount =
                    tgDistricts.reduce((acc, dg) => acc + getDistrictRowCount(dg), 0) +
                    (tg.totalRow && showTerrTotal ? 1 : 0);

                  return (
                    <React.Fragment key={tg.territoryName}>
                      {tgDistricts.map((dg, distIdx) => {
                        const isExpanded = isDistrictExpanded(dg.districtName);
                        const distRowCount = getDistrictRowCount(dg);
                        const distTotalMetrics = dg.totalRow?.years[selectedYear] || { total: 0, mm: 0, ms: 0 };

                        return (
                          <React.Fragment key={dg.districtName}>
                            {/* Row 0: The District Summary Row (With Expand/Collapse Button & District Total) */}
                            <tr
                              className={`transition ${
                                isDark
                                  ? "bg-[#0b1424] hover:bg-[#101c33] border-b border-[#1b2b48]"
                                  : "bg-sky-50/70 hover:bg-sky-100/80 border-b border-sky-200"
                              }`}
                            >
                              {/* Territory (Merged with rowSpan on the very first row of this territory) */}
                              {distIdx === 0 && (
                                <td
                                  rowSpan={territoryRowCount}
                                  className={`align-middle text-center p-3 border-r ${
                                    isDark
                                      ? "bg-[#070e1b] border-[#1e2f4c] text-white"
                                      : "bg-slate-100 border-slate-300 text-slate-900"
                                  }`}
                                >
                                  <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                                    <Building2 className="w-5 h-5 text-sky-500 dark:text-[#38bdf8]" />
                                    <span className="font-black text-sm uppercase tracking-wider block">
                                      {tg.territoryName}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                        isDark
                                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                          : "bg-sky-100 text-sky-800"
                                      }`}
                                    >
                                      {tg.districts.length} Districts
                                    </span>
                                  </div>
                                </td>
                              )}

                              {/* District (Merged with rowSpan for all rows in this district when expanded) */}
                              <td
                                rowSpan={distRowCount}
                                className={`align-middle text-center p-2.5 border-r ${
                                  isDark
                                    ? "bg-[#0a1220] border-[#1e2f4c]"
                                    : "bg-slate-50 border-slate-200"
                                }`}
                              >
                                <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleDistrict(dg.districtName)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm ${
                                      isExpanded
                                        ? isDark
                                          ? "bg-sky-600 text-white hover:bg-sky-500"
                                          : "bg-sky-600 text-white hover:bg-sky-700"
                                        : isDark
                                        ? "bg-[#152238] text-sky-300 hover:bg-[#1e3252] border border-sky-500/30"
                                        : "bg-white text-sky-800 hover:bg-sky-50 border border-sky-300"
                                    }`}
                                    title={isExpanded ? "Click to collapse RTOs" : "Click to expand RTOs"}
                                  >
                                    {isExpanded ? (
                                      <Minus className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                      <Plus className="w-3.5 h-3.5 text-sky-400" />
                                    )}
                                    <span className="text-sm font-black">{dg.districtName}</span>
                                  </button>
                                  <span className="text-[11px] font-semibold text-slate-400">
                                    {dg.rtos.length} RTOs
                                  </span>
                                </div>
                              </td>

                              {/* Final RTO Name Cell for District Summary */}
                              <td className="p-3 font-black">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs uppercase tracking-wide font-black ${
                                      isDark ? "text-sky-300" : "text-sky-800"
                                    }`}
                                  >
                                    {isExpanded
                                      ? `📊 ${dg.districtName} District Total`
                                      : `All ${dg.rtos.length} RTOs (${dg.districtName} Total)`}
                                  </span>
                                  <span
                                    className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                                      isDark
                                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                        : "bg-sky-200 text-sky-900"
                                    }`}
                                  >
                                    Total
                                  </span>
                                </div>
                              </td>

                              {/* Monthly columns for District Total (if monthly mode) */}
                              {tableMode === "monthly" &&
                                fyMonths.map((m) => {
                                  const mVal = dg.totalRow?.monthly?.[m.mmmYy] || 0;
                                  return (
                                    <td key={m.mmmYy} className="p-2.5 text-right font-mono text-sm font-bold">
                                      {mVal > 0 ? (
                                        <span className={isDark ? "text-slate-200" : "text-slate-800"}>
                                          {mVal.toLocaleString()}
                                        </span>
                                      ) : (
                                        <span className={isDark ? "text-slate-600" : "text-slate-300"}>-</span>
                                      )}
                                    </td>
                                  );
                                })}

                              {/* Total Registration */}
                              <td className="p-3 text-right font-mono text-sm sm:text-base font-black">
                                <span className={isDark ? "text-white" : "text-slate-900"}>
                                  {distTotalMetrics.total.toLocaleString()}
                                </span>
                              </td>

                              {/* M&M Nos */}
                              <td className="p-3 text-right font-mono text-sm sm:text-base font-black text-red-400">
                                {distTotalMetrics.mm.toLocaleString()}
                              </td>

                              {/* M&M MS % */}
                              <td className="p-3 text-right font-mono">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-xs font-black ${
                                    distTotalMetrics.ms >= 4.0
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                      : distTotalMetrics.ms >= 3.0
                                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                                      : distTotalMetrics.ms >= 2.0
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                      : isDark
                                      ? "bg-slate-800 text-slate-400"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {distTotalMetrics.ms.toFixed(2)}%
                                </span>
                              </td>
                            </tr>

                            {/* Child RTO Rows (Rendered only when expanded) */}
                            {isExpanded &&
                              dg.rtos.map((rtoRow, rtoIdx) => {
                                const rtoMetrics = rtoRow.years[selectedYear] || { total: 0, mm: 0, ms: 0 };
                                const isEven = rtoIdx % 2 === 0;

                                return (
                                  <tr
                                    key={rtoRow.rtoName}
                                    className={`transition ${
                                      isEven
                                        ? isDark
                                          ? "bg-[#060a14] hover:bg-[#0c1424]"
                                          : "bg-white hover:bg-slate-50"
                                        : isDark
                                        ? "bg-[#080e1a] hover:bg-[#0e172a]"
                                        : "bg-slate-50/70 hover:bg-slate-100"
                                    }`}
                                  >
                                    {/* Territory: Spanned, so omitted */}
                                    {/* District: Spanned, so omitted */}

                                    {/* Final RTO Name */}
                                    <td className="p-2.5 font-semibold pl-6">
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-400 font-mono text-xs">↳</span>
                                        <span className={`text-xs ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                          {rtoRow.rtoName}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Monthly columns */}
                                    {tableMode === "monthly" &&
                                      fyMonths.map((m) => {
                                        const mVal = rtoRow.monthly?.[m.mmmYy] || 0;
                                        return (
                                          <td
                                            key={m.mmmYy}
                                            className="p-2.5 text-right font-mono text-xs font-semibold"
                                          >
                                            {mVal > 0 ? (
                                              <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                                                {mVal.toLocaleString()}
                                              </span>
                                            ) : (
                                              <span className={isDark ? "text-slate-700" : "text-slate-300"}>-</span>
                                            )}
                                          </td>
                                        );
                                      })}

                                    {/* Total Registration */}
                                    <td className="p-2.5 text-right font-mono text-sm font-bold">
                                      <span className={isDark ? "text-slate-100" : "text-slate-800"}>
                                        {rtoMetrics.total.toLocaleString()}
                                      </span>
                                    </td>

                                    {/* M&M Nos */}
                                    <td className="p-2.5 text-right font-mono text-sm font-bold text-red-400">
                                      {rtoMetrics.mm.toLocaleString()}
                                    </td>

                                    {/* M&M MS % */}
                                    <td className="p-2.5 text-right font-mono">
                                      <span
                                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                          rtoMetrics.ms >= 4.0
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : rtoMetrics.ms >= 3.0
                                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                            : rtoMetrics.ms >= 2.0
                                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                            : isDark
                                            ? "bg-slate-800/80 text-slate-400"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {rtoMetrics.ms.toFixed(2)}%
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}

                      {/* Territory Total Row */}
                      {tg.totalRow && showTerrTotal && (() => {
                        const terrMetrics = tg.totalRow.years[selectedYear] || { total: 0, mm: 0, ms: 0 };
                        return (
                          <tr
                            className={`border-t-2 font-black transition ${
                              isDark
                                ? "bg-[#182338] hover:bg-[#1e2c45] border-sky-500/50 text-[#38bdf8]"
                                : "bg-sky-100 hover:bg-sky-200/80 border-sky-400 text-sky-950"
                            }`}
                          >
                            {/* Territory is spanned above, so colSpan covers District and Final RTO Name */}
                            <td colSpan={2} className="p-3 text-left">
                              <div className="flex items-center gap-2 pl-2">
                                <span className="text-base uppercase tracking-wider font-black">
                                  🏢 {tg.territoryName} Summary Total
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                                    isDark
                                      ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40"
                                      : "bg-sky-200 text-sky-900"
                                  }`}
                                >
                                  Territory Total
                                </span>
                              </div>
                            </td>

                            {/* Monthly columns */}
                            {tableMode === "monthly" &&
                              fyMonths.map((m) => {
                                const mVal = tg.totalRow?.monthly?.[m.mmmYy] || 0;
                                return (
                                  <td key={m.mmmYy} className="p-2.5 text-right font-mono text-sm font-black">
                                    {mVal > 0 ? mVal.toLocaleString() : "-"}
                                  </td>
                                );
                              })}

                            {/* Total */}
                            <td className="p-3 text-right font-mono text-sm sm:text-base font-black">
                              {terrMetrics.total.toLocaleString()}
                            </td>

                            {/* M&M */}
                            <td className="p-3 text-right font-mono text-sm sm:text-base font-black text-red-400">
                              {terrMetrics.mm.toLocaleString()}
                            </td>

                            {/* MS % */}
                            <td className="p-3 text-right font-mono">
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-black bg-sky-500/20 text-[#38bdf8] border border-sky-500/40">
                                {terrMetrics.ms.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })
              )}

              {/* State-Wide Grand Total Row */}
              {grandTotalRow &&
                selectedTerritory === "ALL" &&
                selectedDistrict === "ALL" &&
                selectedRto === "ALL" &&
                (() => {
                  const grand = grandTotalRow.years[selectedYear] || { total: 0, mm: 0, ms: 0 };
                  return (
                    <tr
                      className={`border-t-4 font-black transition ${
                        isDark
                          ? "bg-gradient-to-r from-emerald-950/60 via-[#0d1f2d] to-emerald-950/60 border-emerald-500/80 text-emerald-400"
                          : "bg-emerald-100 hover:bg-emerald-200/90 border-emerald-500 text-emerald-950"
                      }`}
                    >
                      <td colSpan={3} className="p-3.5 text-left">
                        <div className="flex items-center gap-2 pl-2">
                          <span className="text-base uppercase tracking-wider font-black">
                            🏆 GRAND TOTAL ({timeframeLabel} • Kerala State)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            State Total • 14 Districts • 85 RTOs
                          </span>
                        </div>
                      </td>

                      {/* Monthly columns */}
                      {tableMode === "monthly" &&
                        fyMonths.map((m) => {
                          const mVal = grandTotalRow.monthly?.[m.mmmYy] || 0;
                          return (
                            <td
                              key={m.mmmYy}
                              className="p-2.5 text-right font-mono text-sm sm:text-base font-black text-emerald-400"
                            >
                              {mVal > 0 ? mVal.toLocaleString() : "-"}
                            </td>
                          );
                        })}

                      {/* Total */}
                      <td className="p-3.5 text-right font-mono text-base font-black text-emerald-400">
                        {grand.total.toLocaleString()}
                      </td>

                      {/* M&M */}
                      <td className="p-3.5 text-right font-mono text-base font-black text-red-400">
                        {grand.mm.toLocaleString()}
                      </td>

                      {/* MS % */}
                      <td className="p-3.5 text-right font-mono">
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs sm:text-sm font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {grand.ms.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })()}
            </tbody>
          </table>
        </div>

        <div className={`flex items-center justify-between text-xs pt-1.5 font-semibold ${
          isDark ? "text-[#94a3b8]" : "text-slate-600"
        }`}>
          <span>
            Displaying Kerala Registration Hierarchy ({timeframeLabel}) • Click <span className="text-sky-400 font-bold">[+]</span> on any district to expand child RTOs
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
