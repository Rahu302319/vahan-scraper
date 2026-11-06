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
  Minus,
  Crown,
  Flame
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

export type PeriodType = "FY" | "CY";

export interface PeriodMonth {
  code: string;       // "APR", "MAY", ... "MAR" or "JAN", "FEB", ... "DEC"
  name: string;       // "Apr", "May", ...
  mmmYy: string;      // "Apr-26", "Nov-26", etc.
  calYear: number;    // 2026
  quarter: string;    // "Q1", "Q2", "Q3", "Q4"
  order: number;      // 1 to 12
}

export interface PeriodOption {
  id: string;             // "FY27", "FY26", "CY26", etc.
  type: PeriodType;       // "FY" | "CY"
  label: string;          // "FY 2026-27 (FY27)"
  subLabel: string;       // "Apr-26 to Mar-27"
  startYear?: number;     // 2026
  endYear?: number;       // 2027
  year?: number;          // for CY e.g. 2026
  yearsToFetch: number[]; // [2026, 2027] or [2026]
  months: PeriodMonth[];
}

export function buildFyOption(endYear: number): PeriodOption {
  const startYear = endYear - 1;
  const prevYY = String(startYear).slice(-2);
  const currYY = String(endYear).slice(-2);
  const id = `FY${currYY}`;
  const label = `FY ${startYear}-${currYY} (${id})`;
  const subLabel = `Apr-${prevYY} to Mar-${currYY}`;

  const months: PeriodMonth[] = [
    { code: "APR", name: "Apr", mmmYy: `Apr-${prevYY}`, calYear: startYear, quarter: "Q1", order: 1 },
    { code: "MAY", name: "May", mmmYy: `May-${prevYY}`, calYear: startYear, quarter: "Q1", order: 2 },
    { code: "JUN", name: "Jun", mmmYy: `Jun-${prevYY}`, calYear: startYear, quarter: "Q1", order: 3 },
    { code: "JUL", name: "Jul", mmmYy: `Jul-${prevYY}`, calYear: startYear, quarter: "Q2", order: 4 },
    { code: "AUG", name: "Aug", mmmYy: `Aug-${prevYY}`, calYear: startYear, quarter: "Q2", order: 5 },
    { code: "SEP", name: "Sep", mmmYy: `Sep-${prevYY}`, calYear: startYear, quarter: "Q2", order: 6 },
    { code: "OCT", name: "Oct", mmmYy: `Oct-${prevYY}`, calYear: startYear, quarter: "Q3", order: 7 },
    { code: "NOV", name: "Nov", mmmYy: `Nov-${prevYY}`, calYear: startYear, quarter: "Q3", order: 8 },
    { code: "DEC", name: "Dec", mmmYy: `Dec-${prevYY}`, calYear: startYear, quarter: "Q3", order: 9 },
    { code: "JAN", name: "Jan", mmmYy: `Jan-${currYY}`, calYear: endYear,   quarter: "Q4", order: 10 },
    { code: "FEB", name: "Feb", mmmYy: `Feb-${currYY}`, calYear: endYear,   quarter: "Q4", order: 11 },
    { code: "MAR", name: "Mar", mmmYy: `Mar-${currYY}`, calYear: endYear,   quarter: "Q4", order: 12 },
  ];

  return {
    id,
    type: "FY",
    label,
    subLabel,
    startYear,
    endYear,
    yearsToFetch: [startYear, endYear],
    months,
  };
}

export function buildCyOption(year: number): PeriodOption {
  const yy = String(year).slice(-2);
  const id = `CY${yy}`;
  const label = `CY ${year}`;
  const subLabel = `Jan-${yy} to Dec-${yy}`;

  const months: PeriodMonth[] = [
    { code: "JAN", name: "Jan", mmmYy: `Jan-${yy}`, calYear: year, quarter: "Q1", order: 1 },
    { code: "FEB", name: "Feb", mmmYy: `Feb-${yy}`, calYear: year, quarter: "Q1", order: 2 },
    { code: "MAR", name: "Mar", mmmYy: `Mar-${yy}`, calYear: year, quarter: "Q1", order: 3 },
    { code: "APR", name: "Apr", mmmYy: `Apr-${yy}`, calYear: year, quarter: "Q2", order: 4 },
    { code: "MAY", name: "May", mmmYy: `May-${yy}`, calYear: year, quarter: "Q2", order: 5 },
    { code: "JUN", name: "Jun", mmmYy: `Jun-${yy}`, calYear: year, quarter: "Q2", order: 6 },
    { code: "JUL", name: "Jul", mmmYy: `Jul-${yy}`, calYear: year, quarter: "Q3", order: 7 },
    { code: "AUG", name: "Aug", mmmYy: `Aug-${yy}`, calYear: year, quarter: "Q3", order: 8 },
    { code: "SEP", name: "Sep", mmmYy: `Sep-${yy}`, calYear: year, quarter: "Q3", order: 9 },
    { code: "OCT", name: "Oct", mmmYy: `Oct-${yy}`, calYear: year, quarter: "Q4", order: 10 },
    { code: "NOV", name: "Nov", mmmYy: `Nov-${yy}`, calYear: year, quarter: "Q4", order: 11 },
    { code: "DEC", name: "Dec", mmmYy: `Dec-${yy}`, calYear: year, quarter: "Q4", order: 12 },
  ];

  return {
    id,
    type: "CY",
    label,
    subLabel,
    year,
    yearsToFetch: [year],
    months,
  };
}

export const ALL_FY_OPTIONS: PeriodOption[] = [
  buildFyOption(2027), // FY 2026-27 (FY27) - Current active FY
  buildFyOption(2026), // FY 2025-26 (FY26)
  buildFyOption(2025), // FY 2024-25 (FY25)
  buildFyOption(2024), // FY 2023-24 (FY24)
  buildFyOption(2023), // FY 2022-23 (FY23)
  buildFyOption(2022), // FY 2021-22 (FY22)
  buildFyOption(2021), // FY 2020-21 (FY21)
];

export const ALL_CY_OPTIONS: PeriodOption[] = [
  buildCyOption(2026), // CY 2026 (Jan-26 to Dec-26)
  buildCyOption(2025), // CY 2025 (Jan-25 to Dec-25)
  buildCyOption(2024), // CY 2024
  buildCyOption(2023), // CY 2023
  buildCyOption(2022), // CY 2022
];

export type FYOption = PeriodOption;
export const AVAILABLE_FY_LIST = ALL_FY_OPTIONS;

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

export function getRowVolumeForPeriod(
  row: any,
  selectedMonth: string = "ALL",
  periodMonths: PeriodMonth[]
): number {
  const rowYear = Number(row.Year || row.year || row.FY || 0);

  if (selectedMonth && selectedMonth !== "ALL") {
    const targetMonth = periodMonths.find(
      (m) =>
        m.mmmYy.toUpperCase() === selectedMonth.toUpperCase() ||
        m.code.toUpperCase() === selectedMonth.toUpperCase() ||
        m.name.toUpperCase() === selectedMonth.toUpperCase()
    );
    if (!targetMonth) return 0;
    if (rowYear !== 0 && rowYear !== targetMonth.calYear) return 0;
    const colName = targetMonth.code;
    if (colName === "DEC") {
      return Number(row["DEC"] ?? row["dec_val"] ?? row["dec"] ?? 0) || 0;
    }
    return Number(row[colName] ?? row[colName.toLowerCase()] ?? 0) || 0;
  }

  let total = 0;
  for (const m of periodMonths) {
    if (rowYear === 0 || rowYear === m.calYear) {
      const colName = m.code;
      const v =
        colName === "DEC"
          ? (row["DEC"] ?? row["dec_val"] ?? row["dec"] ?? 0)
          : (row[colName] ?? row[colName.toLowerCase()] ?? 0);
      if (v !== undefined && !isNaN(Number(v))) {
        total += Number(v);
      }
    }
  }
  return total;
}

function getRowVolume(row: any, selectedMonth: string = "ALL", selectedFyYear: string = "2026"): number {
  if (selectedMonth && selectedMonth !== "ALL") {
    const colName = selectedMonth.slice(0, 3).toUpperCase();
    if (colName === "DEC") {
      return Number(row["DEC"] ?? row["dec_val"] ?? row["dec"] ?? 0) || 0;
    }
    return Number(row[colName] ?? row[colName.toLowerCase()] ?? 0) || 0;
  }

  if (row.TOTAL !== undefined && row.TOTAL !== null && !isNaN(Number(row.TOTAL))) {
    return Number(row.TOTAL);
  }
  if (row.total !== undefined && row.total !== null && !isNaN(Number(row.total))) {
    return Number(row.total);
  }
  const allMonths = ["APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "dec_val", "JAN", "FEB", "MAR"];
  let sum = 0;
  for (const m of allMonths) {
    const v = row[m] ?? row[m.toLowerCase()];
    if (v !== undefined && !isNaN(Number(v))) sum += Number(v);
  }
  return sum;
}

export default function ExecutiveDashboard({
  theme = "dark",
  liveScrapedRows = [],
  oemDb = [],
  rtoDt = [],
}: DashboardProps) {
  const isDark = theme === "dark";

  // MariaDB eramsale_vahan Live Masters & Benchmarks
  const [dbBenchmarks, setDbBenchmarks] = useState<any[]>([]);
  const [internalRtoDt, setInternalRtoDt] = useState<RTORecord[]>([]);
  const [internalOemDb, setInternalOemDb] = useState<OEMRecord[]>([]);

  // Automatically fetch benchmarks and master tables from MariaDB eramsale_vahan on mount
  useEffect(() => {
    async function fetchDbMasters() {
      try {
        const [benchRes, rtoRes, oemRes] = await Promise.all([
          fetch("/api/db?type=benchmarks"),
          fetch("/api/db?type=rto"),
          fetch("/api/db?type=oem"),
        ]);
        const benchJson = await benchRes.json();
        const rtoJson = await rtoRes.json();
        const oemJson = await oemRes.json();

        if (benchJson.success && Array.isArray(benchJson.data)) {
          setDbBenchmarks(benchJson.data);
        }
        if (rtoJson.success && Array.isArray(rtoJson.data)) {
          setInternalRtoDt(rtoJson.data);
        }
        if (oemJson.success && Array.isArray(oemJson.data)) {
          setInternalOemDb(oemJson.data);
        }
      } catch (err) {
        console.warn("MariaDB masters load warning in ExecutiveDashboard:", err);
      }
    }
    fetchDbMasters();
  }, []);

  const effectiveRtoDt = useMemo(() => {
    return rtoDt && rtoDt.length > 0 ? rtoDt : internalRtoDt;
  }, [rtoDt, internalRtoDt]);

  const effectiveOemDb = useMemo(() => {
    return oemDb && oemDb.length > 0 ? oemDb : internalOemDb;
  }, [oemDb, internalOemDb]);

  // Base summary template rows dynamically constructed from MariaDB eramsale_vahan table 'rto_summary_benchmarks'
  const summaryRowsTemplate = useMemo(() => {
    if (dbBenchmarks.length > 0) {
      const uniqueMap = new Map<string, SummaryRow>();
      dbBenchmarks.forEach((b) => {
        const key = `${b.territory}|${b.district}|${b.label}|${b.type}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            territory: b.territory,
            district: b.district,
            rtoName: b.rtoName || (b.type === "rto" ? b.label : ""),
            label: b.label,
            type: b.type,
            years: {},
          });
        }
      });
      return Array.from(uniqueMap.values());
    }
    return summaryDataRaw as SummaryRow[];
  }, [dbBenchmarks]);

  // 1. DEPENDENT FILTER STATES
  const [periodType, setPeriodType] = useState<PeriodType>("FY");
  const [selectedFyId, setSelectedFyId] = useState<string>("FY27");
  const [selectedCyId, setSelectedCyId] = useState<string>("CY26");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedSegment, setSelectedSegment] = useState<"PV" | "CV" | "BEV" | "ALL">("PV");
  const [selectedTerritory, setSelectedTerritory] = useState<string>("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [selectedRto, setSelectedRto] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hideZeroRtos, setHideZeroRtos] = useState<boolean>(false);
  const [tableMode, setTableMode] = useState<"summary" | "monthly">("summary");

  // Active Period Definition (Financial Year or Calendar Year)
  const currentPeriod = useMemo<PeriodOption>(() => {
    if (periodType === "FY") {
      return ALL_FY_OPTIONS.find((f) => f.id === selectedFyId) || ALL_FY_OPTIONS[0];
    }
    return ALL_CY_OPTIONS.find((c) => c.id === selectedCyId) || ALL_CY_OPTIONS[0];
  }, [periodType, selectedFyId, selectedCyId]);

  // Backward-compatible alias
  const selectedYear = currentPeriod.id;
  const fyMonths = currentPeriod.months;

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

  // Fetch live registrations from Hostinger database strictly for the selected period
  const fetchDbRegistrations = async () => {
    setIsLoadingDb(true);
    try {
      const yearsParam = currentPeriod.yearsToFetch.join(",");
      const res = await fetch(`/api/db?type=registrations&year=${yearsParam}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDbScrapedRows(json.data);
      } else {
        setDbScrapedRows([]);
      }
    } catch (err) {
      console.warn("DB registrations fetch note:", err);
      setDbScrapedRows([]);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbRegistrations();
  }, [currentPeriod.id]);

  // Combined dataset from database and current live scraper session (Zero stale cache)
  const allDatasetRows = useMemo(() => {
    const map = new Map<string, any>();

    // 1. MariaDB database registrations
    dbScrapedRows.forEach((r) => {
      const yr = String(r.Year || r.year || r.FY || "").trim();
      const seg = String(r.segment || r.Segment || "PV").toUpperCase().trim();
      const code = String(r.RTO_Code || r.rto_code || r.Code || "").toUpperCase().trim();
      const maker = String(r.Maker || r.maker || "").toUpperCase().trim();
      map.set(`${yr}_${seg}_${code}_${maker}`, r);
    });

    // 2. Current live scraping session
    liveScrapedRows.forEach((r) => {
      const yr = String(r.Year || r.year || r.FY || "").trim();
      const seg = String(r.segment || r.Segment || "PV").toUpperCase().trim();
      const code = String(r.RTO_Code || r.rto_code || r.Code || "").toUpperCase().trim();
      const maker = String(r.Maker || r.maker || "").toUpperCase().trim();
      map.set(`${yr}_${seg}_${code}_${maker}`, r);
    });

    return Array.from(map.values());
  }, [liveScrapedRows, dbScrapedRows]);

  // Real-time Segment registration volume totals
  const segmentStats = useMemo(() => {
    let pv = 0, cv = 0, bev = 0;
    allDatasetRows.forEach((r) => {
      const s = String(r.segment || r.Segment || "PV").toUpperCase().trim();
      const vol = getRowVolumeForPeriod(r, selectedMonth, currentPeriod.months);
      if (s === "PV") pv += vol;
      else if (s === "CV") cv += vol;
      else if (s === "BEV") bev += vol;
    });
    return { pv, cv, bev, all: pv + cv + bev };
  }, [allDatasetRows, selectedMonth, currentPeriod]);

  // Auto-switch to active segment if current segment has 0 records but another segment has scraped data
  useEffect(() => {
    if (segmentStats.all > 0) {
      if (selectedSegment === "PV" && segmentStats.pv === 0) {
        if (segmentStats.bev > 0) setSelectedSegment("BEV");
        else if (segmentStats.cv > 0) setSelectedSegment("CV");
        else setSelectedSegment("ALL");
      }
    }
  }, [segmentStats, selectedSegment]);

  // Filter rows strictly for the chosen segment
  const activeDatasetRows = useMemo(() => {
    if (selectedSegment === "ALL") {
      return allDatasetRows;
    }
    return allDatasetRows.filter((r) => {
      const s = String(r.segment || r.Segment || "PV").toUpperCase().trim();
      return s === selectedSegment;
    });
  }, [allDatasetRows, selectedSegment]);

  // Build RTO Name and Code Lookup Tables from effectiveRtoDt (loaded from MariaDB eramsale_vahan)
  const { rtoDtLookup, rtoCodeLookup } = useMemo(() => {
    const nameMap = new Map<string, string>();
    const codeMap = new Map<string, string>();

    effectiveRtoDt.forEach((d: any) => {
      const finalName = d.finalRtoName || d.srtOffice;
      if (d.rtoCode) codeMap.set(String(d.rtoCode).toUpperCase().trim(), finalName);
      if (d.rto_code) codeMap.set(String(d.rto_code).toUpperCase().trim(), finalName);
      if (d.srtOffice) nameMap.set(cleanRtoName(d.srtOffice), finalName);
      if (d.finalRtoName) nameMap.set(cleanRtoName(d.finalRtoName), finalName);
    });

    // Special hardcoded code mappings
    codeMap.set("KL42", "North Paravur");
    codeMap.set("KL15", "Thiruvananthapuram");
    codeMap.set("KL99", "Thiruvananthapuram");

    return { rtoDtLookup: nameMap, rtoCodeLookup: codeMap };
  }, [effectiveRtoDt]);

  // Helper to resolve row to Final RTO Name
  const resolveRowToFinalRto = (row: any): string => {
    const code = (row.RTO_Code || row["RTO Code"] || row.Code || row.rto_code || "").toUpperCase().trim();
    if (rtoCodeLookup.has(code)) {
      return rtoCodeLookup.get(code)!;
    }
    if (SPECIAL_CODE_TO_FINAL_RTO[code]) {
      return SPECIAL_CODE_TO_FINAL_RTO[code];
    }
    const directFinal = row["Final RTO Name"] || row.finalRtoName || row.final_rto_name;
    const rawName = String(row.RTO_Name || row["RTO Name"] || row.rto_name || row.srtOffice || row.RTO || "").trim();

    if (directFinal && cleanRtoName(directFinal) !== cleanRtoName(rawName)) {
      return String(directFinal).trim();
    }

    const c = cleanRtoName(rawName);
    if (rtoDtLookup.has(c)) {
      return rtoDtLookup.get(c)!;
    }
    return directFinal || rawName;
  };

  // Helper to identify OEM Grouping and Mahindra flag
  const resolveRowOem = (row: any): { grouping: string; isMahindra: boolean } => {
    const directGroup = row["OEM Group"] || row.oemGroup || row.oem_group;
    const directGrouping = row["OEM Grouping"] || row.oemGrouping || row.oem_grouping;
    if (directGroup === "M&M" || directGrouping === "Mahindra") {
      return { grouping: "Mahindra", isMahindra: true };
    }

    const rawMaker = String(row.Maker || row["OEM Name"] || row.OEM || row["Maker Name"] || row.maker || "").trim().toUpperCase();

    const matched = effectiveOemDb.find(
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
      const vol = getRowVolumeForPeriod(r, selectedMonth, currentPeriod.months);
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
  }, [currentPeriod, selectedMonth, selectedTerritory, selectedDistrict, selectedRto, activeDatasetRows, effectiveOemDb, rtoDtLookup, rtoCodeLookup]);

  // DYNAMIC SUMMARY ROWS ENGINE (Two-Pass Computation: Pre-accumulate leaf RTOs so totals are never zero)
  const computedSummaryRows = useMemo(() => {
    // 1. Build volume map for each RTO from activeDatasetRows for selectedMonth & individual period months
    const rtoMap = new Map<string, { total: number; mm: number; monthly: Record<string, number> }>();

    activeDatasetRows.forEach((row) => {
      const finalName = resolveRowToFinalRto(row);
      const key = cleanRtoName(finalName);
      const vol = getRowVolumeForPeriod(row, selectedMonth, currentPeriod.months);
      const { isMahindra } = resolveRowOem(row);

      const curr = rtoMap.get(key) || { total: 0, mm: 0, monthly: {} };
      curr.total += vol;
      if (isMahindra) curr.mm += vol;

      // Accumulate monthly volumes for all 12 months of this period (in mmm-yy format)
      currentPeriod.months.forEach((m) => {
        const mVol = getRowVolumeForPeriod(row, m.mmmYy, currentPeriod.months);
        curr.monthly[m.mmmYy] = (curr.monthly[m.mmmYy] || 0) + mVol;
      });

      rtoMap.set(key, curr);
    });

    // PASS 1: Accumulate leaf RTOs into district and territory accumulators
    const districtAccumulator: Record<string, { total: number; mm: number; monthly: Record<string, number> }> = {};
    const territoryAccumulator: Record<string, { total: number; mm: number; monthly: Record<string, number> }> = {
      "North Kerala": { total: 0, mm: 0, monthly: {} },
      "South Kerala": { total: 0, mm: 0, monthly: {} },
    };

    summaryRowsTemplate.forEach((templateRow) => {
      if (templateRow.type === "rto") {
        const key = cleanRtoName(templateRow.rtoName);
        const stats = rtoMap.get(key) || { total: 0, mm: 0, monthly: {} };

        // District Accumulator
        if (!districtAccumulator[templateRow.district]) {
          districtAccumulator[templateRow.district] = { total: 0, mm: 0, monthly: {} };
        }
        districtAccumulator[templateRow.district].total += stats.total;
        districtAccumulator[templateRow.district].mm += stats.mm;
        currentPeriod.months.forEach((m) => {
          districtAccumulator[templateRow.district].monthly[m.mmmYy] =
            (districtAccumulator[templateRow.district].monthly[m.mmmYy] || 0) + (stats.monthly[m.mmmYy] || 0);
        });

        // Territory Accumulator
        const terr = templateRow.territory === "South Kerala" ? "South Kerala" : "North Kerala";
        territoryAccumulator[terr].total += stats.total;
        territoryAccumulator[terr].mm += stats.mm;
        currentPeriod.months.forEach((m) => {
          territoryAccumulator[terr].monthly[m.mmmYy] =
            (territoryAccumulator[terr].monthly[m.mmmYy] || 0) + (stats.monthly[m.mmmYy] || 0);
        });
      }
    });

    const grandTotalAcc =
      (territoryAccumulator["North Kerala"]?.total || 0) +
      (territoryAccumulator["South Kerala"]?.total || 0);
    const grandMmAcc =
      (territoryAccumulator["North Kerala"]?.mm || 0) +
      (territoryAccumulator["South Kerala"]?.mm || 0);
    const grandMs = grandTotalAcc > 0 ? (grandMmAcc / grandTotalAcc) * 100 : 0;

    const grandMonthly: Record<string, number> = {};
    currentPeriod.months.forEach((m) => {
      grandMonthly[m.mmmYy] =
        (territoryAccumulator["North Kerala"]?.monthly[m.mmmYy] || 0) +
        (territoryAccumulator["South Kerala"]?.monthly[m.mmmYy] || 0);
    });

    // PASS 2: Populate all rows from pre-computed accumulators
    const newRows: SummaryRow[] = [];

    summaryRowsTemplate.forEach((templateRow) => {
      if (templateRow.district === "District") return; // skip header

      if (templateRow.type === "rto") {
        const key = cleanRtoName(templateRow.rtoName);
        const stats = rtoMap.get(key) || { total: 0, mm: 0, monthly: {} };
        const ms = stats.total > 0 ? (stats.mm / stats.total) * 100 : 0;

        newRows.push({
          ...templateRow,
          years: {
            [currentPeriod.id]: { total: stats.total, mm: stats.mm, ms },
          },
          monthly: stats.monthly,
        });
      } else if (templateRow.type === "district_total") {
        const distKey = templateRow.label.replace(/\s+Total$/i, "").trim();
        const distKeyClean = cleanRtoName(distKey);
        let distStats = districtAccumulator[distKey] || districtAccumulator[templateRow.district];
        if (!distStats) {
          const matchKey = Object.keys(districtAccumulator).find((k) => cleanRtoName(k) === distKeyClean);
          distStats = matchKey ? districtAccumulator[matchKey] : { total: 0, mm: 0, monthly: {} };
        }

        const finalTotal = distStats.total;
        const finalMm = distStats.mm;
        const finalMs = finalTotal > 0 ? (finalMm / finalTotal) * 100 : 0;

        newRows.push({
          ...templateRow,
          years: {
            [currentPeriod.id]: { total: finalTotal, mm: finalMm, ms: finalMs },
          },
          monthly: distStats.monthly,
        });
      } else if (templateRow.type === "territory_total") {
        const terrName = templateRow.label.replace(/\s+Total$/i, "").trim();
        const terrKey = terrName === "South Kerala" ? "South Kerala" : "North Kerala";
        const terrStats = territoryAccumulator[terrKey] || { total: 0, mm: 0, monthly: {} };
        const finalTotal = terrStats.total;
        const finalMm = terrStats.mm;
        const finalMs = finalTotal > 0 ? (finalMm / finalTotal) * 100 : 0;

        newRows.push({
          ...templateRow,
          years: {
            [currentPeriod.id]: { total: finalTotal, mm: finalMm, ms: finalMs },
          },
          monthly: terrStats.monthly,
        });
      } else if (templateRow.type === "grand_total") {
        newRows.push({
          ...templateRow,
          years: {
            [currentPeriod.id]: { total: grandTotalAcc, mm: grandMmAcc, ms: grandMs },
          },
          monthly: grandMonthly,
        });
      }
    });

    return newRows;
  }, [currentPeriod, selectedMonth, activeDatasetRows, summaryRowsTemplate, rtoDtLookup, rtoCodeLookup, effectiveOemDb]);

  // Compute Grand Totals & KPI Cards from live scraper data (Context-Aware for Cascading Slicers)
  const kpiData = useMemo(() => {
    let totalVehicles = 0;
    let mmVehicles = 0;

    if (selectedRto !== "ALL") {
      // Sliced by specific RTO
      const rtoRow = computedSummaryRows.find(
        (r) => r.type === "rto" && cleanRtoName(r.rtoName) === cleanRtoName(selectedRto)
      );
      const metrics = rtoRow?.years[currentPeriod.id] || { total: 0, mm: 0, ms: 0 };
      totalVehicles = metrics.total;
      mmVehicles = metrics.mm;
    } else if (selectedDistrict !== "ALL") {
      // Sliced by specific District
      const distRow = computedSummaryRows.find(
        (r) =>
          r.type === "district_total" &&
          (cleanRtoName(r.label) === cleanRtoName(`${selectedDistrict} Total`) || cleanRtoName(r.district) === cleanRtoName(selectedDistrict))
      );
      const metrics = distRow?.years[currentPeriod.id] || { total: 0, mm: 0, ms: 0 };
      totalVehicles = metrics.total;
      mmVehicles = metrics.mm;
    } else if (selectedTerritory !== "ALL") {
      // Sliced by specific Territory
      const terrRow = computedSummaryRows.find(
        (r) =>
          r.type === "territory_total" &&
          (cleanRtoName(r.label) === cleanRtoName(`${selectedTerritory} Total`) || r.territory === selectedTerritory)
      );
      const metrics = terrRow?.years[currentPeriod.id] || { total: 0, mm: 0, ms: 0 };
      totalVehicles = metrics.total;
      mmVehicles = metrics.mm;
    } else {
      // All Kerala Grand Total
      const grandRow = computedSummaryRows.find((r) => r.type === "grand_total");
      const metrics = grandRow?.years[currentPeriod.id] || { total: 0, mm: 0, ms: 0 };
      totalVehicles = metrics.total;
      mmVehicles = metrics.mm;
    }

    const mmMarketShare = totalVehicles > 0 ? (mmVehicles / totalVehicles) * 100 : 0;

    const northTotalRow = computedSummaryRows.find((r) => r.label === "North Kerala Total");
    const southTotalRow = computedSummaryRows.find((r) => r.label === "South Kerala Total");
    const north = northTotalRow?.years[currentPeriod.id] || { total: 0, mm: 0, ms: 0 };
    const south = southTotalRow?.years[currentPeriod.id] || { total: 0, mm: 0, ms: 0 };

    const topOem = activeOemBreakdown[0] || { name: "N/A", share: 0, count: 0 };

    return {
      totalVehicles,
      mmVehicles,
      mmMarketShare,
      topOemName: topOem.name,
      topOemShare: topOem.share.toFixed(1),
      northTotal: north.total,
      southTotal: south.total,
      northShare: totalVehicles > 0 ? ((north.total / totalVehicles) * 100).toFixed(1) : "0",
      southShare: totalVehicles > 0 ? ((south.total / totalVehicles) * 100).toFixed(1) : "0",
      northMm: north.mm,
      northMs: north.ms,
      southMm: south.mm,
      southMs: south.ms,
    };
  }, [computedSummaryRows, currentPeriod.id, activeOemBreakdown, selectedTerritory, selectedDistrict, selectedRto]);

  // Filtered Summary Table Rows (Respects Cascading Dropdown Selections)
  const filteredSummaryRows = useMemo(() => {
    return computedSummaryRows.filter((r) => {
      // 1. Hide Zero RTO filter
      if (hideZeroRtos && r.type === "rto") {
        const metrics = r.years[currentPeriod.id];
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          r.label.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.territory.toLowerCase().includes(q);
        if (!matches && r.type !== "grand_total") return false;
      }

      return true;
    });
  }, [computedSummaryRows, selectedTerritory, selectedDistrict, selectedRto, searchQuery, hideZeroRtos, currentPeriod.id]);

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
        const matchKey = Object.keys(terrMap[terr].districts).find(
          (k) => cleanRtoName(k) === cleanRtoName(distName)
        );
        const targetKey = matchKey || distName;
        if (!terrMap[terr].districts[targetKey]) {
          terrMap[terr].districts[targetKey] = {
            districtName: distName,
            territoryName: terr,
            rtos: [],
          };
        }
        terrMap[terr].districts[targetKey].totalRow = row;
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
    if (searchQuery.trim()) return true;
    return !!expandedDistricts[districtName];
  };

  const filteredTerritoryGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const hasSearch = q.length > 0;

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
                const tot = r.years[currentPeriod.id]?.total || 0;
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
              const distTot = dg.totalRow?.years[currentPeriod.id]?.total || 0;
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
  }, [territoryGroups, selectedTerritory, selectedDistrict, selectedRto, searchQuery, hideZeroRtos, currentPeriod.id]);

  const getDistrictRowCount = (dg: { districtName: string; rtos: SummaryRow[] }) => {
    const expanded = isDistrictExpanded(dg.districtName);
    return expanded ? 1 + dg.rtos.length : 1;
  };

  const grandTotalRow = useMemo(() => {
    return computedSummaryRows.find((r) => r.type === "grand_total");
  }, [computedSummaryRows]);

  // Active Timeframe Label: formatted strictly as mmm-yy when month is selected, or Full Period
  const activeMonthItem = useMemo(() => {
    if (selectedMonth === "ALL") return null;
    return currentPeriod.months.find(
      (m) => m.mmmYy.toUpperCase() === selectedMonth.toUpperCase() ||
             m.code.toUpperCase() === selectedMonth.toUpperCase() ||
             m.name.toUpperCase() === selectedMonth.toUpperCase()
    );
  }, [selectedMonth, currentPeriod]);

  const timeframeLabel = activeMonthItem
    ? activeMonthItem.mmmYy
    : `${currentPeriod.label} (${currentPeriod.subLabel})`;

  // Export Summary Table as formatted Excel
  const handleExportSummaryExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Vahan Kerala Live Intelligence Dashboard";
      const sheet = workbook.addWorksheet(`Summary_${timeframeLabel.replace(/[\s():/]+/g, "_")}`);

      if (tableMode === "monthly") {
        // Export 12-Month Grid for Selected Period in mmm-yy format
        const headers = [
          "Territory",
          "District",
          "Final RTO Name",
          ...currentPeriod.months.map((m) => m.mmmYy),
          `${currentPeriod.label} Total`,
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
          const metrics = r.years[currentPeriod.id] || { total: 0, mm: 0, ms: 0 };
          const isTotal = r.type !== "rto";
          const rowVals = [
            r.type === "rto" ? r.territory : "",
            r.type === "rto" ? r.district : r.type === "district_total" ? r.label : "",
            r.type === "rto" ? r.rtoName : r.type !== "district_total" ? r.label : "",
            ...currentPeriod.months.map((m) => r.monthly?.[m.mmmYy] || 0),
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
          const metrics = r.years[currentPeriod.id] || { total: 0, mm: 0, ms: 0 };
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
    <div className={`rounded-2xl border transition-all duration-300 shadow-sm ${
      isDark
        ? "bg-[#0a101d]/90 border-[#1a2744] text-slate-300"
        : "bg-white/95 border-slate-200/90 text-slate-700"
    }`}>
      {/* 1. HD STATUS HEADER */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b transition-colors ${
        isDark ? "border-[#16233b] bg-[#0c1424]/60" : "border-slate-100 bg-slate-50/60"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className={`p-1 rounded-md ${isDark ? "bg-sky-500/10 text-sky-400" : "bg-sky-50 text-sky-600"}`}>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xs font-semibold tracking-wide ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              Executive Analytics Console
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide ${
              isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200/70 text-slate-600"
            }`}>
              Kerala • Live
            </span>
          </div>
        </div>

        {/* Live Scraper Status Metadata & Refresh */}
        <div className="flex items-center gap-2">
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-normal border ${
            isDark ? "bg-[#070d18] border-[#18263e] text-slate-400" : "bg-white border-slate-200 text-slate-600 shadow-2xs"
          }`}>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-3 h-3" />
              <span>{activeDatasetRows.length.toLocaleString()} Records</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-sky-600 dark:text-sky-400">
              {selectedSegment === "ALL" ? "All Segments" : `${selectedSegment} Segment`}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 dark:text-slate-400">{activeDatasetRtoCount} RTOs</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-amber-600 dark:text-amber-400">{timeframeLabel}</span>
          </div>

          <button
            type="button"
            onClick={fetchDbRegistrations}
            title="Refresh latest data from database"
            className={`p-1.5 rounded-lg border transition-all duration-150 ${
              isDark
                ? "bg-[#0e172a] border-[#1f2d48] text-slate-400 hover:text-white hover:bg-[#16233b]"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? "animate-spin text-sky-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. HD CONTROLS SURFACE */}
      <div className="p-3 sm:p-4 flex flex-col gap-2.5">
        {/* ROW 1: Timeframe, Segment, and Export Button */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* FY / CY Mode Switch */}
            <div className={`flex items-center rounded-lg p-0.5 border ${
              isDark ? "bg-[#070d18] border-[#1b2844]" : "bg-slate-100 border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => {
                  setPeriodType("FY");
                  setSelectedMonth("ALL");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all ${
                  periodType === "FY"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 font-medium shadow-xs"
                    : isDark ? "text-slate-400 hover:text-slate-200 font-normal" : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
                title="Financial Year (Apr to Mar)"
              >
                <Calendar className="w-3 h-3 opacity-70" />
                FY
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriodType("CY");
                  setSelectedMonth("ALL");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all ${
                  periodType === "CY"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 font-medium shadow-xs"
                    : isDark ? "text-slate-400 hover:text-slate-200 font-normal" : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
                title="Calendar Year (Jan to Dec)"
              >
                <Calendar className="w-3 h-3 opacity-70" />
                CY
              </button>
            </div>

            {/* Period Dropdown */}
            {periodType === "FY" ? (
              <select
                value={selectedFyId}
                onChange={(e) => {
                  setSelectedFyId(e.target.value);
                  setSelectedMonth("ALL");
                }}
                className={`h-8 px-2.5 py-1 rounded-lg text-xs font-normal border focus:outline-none transition ${
                  isDark
                    ? "bg-[#070d18] border-[#1d2d4a] text-sky-400 focus:border-sky-500"
                    : "bg-white border-slate-200 text-slate-800 focus:border-sky-500 shadow-2xs"
                }`}
              >
                {ALL_FY_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.subLabel})
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedCyId}
                onChange={(e) => {
                  setSelectedCyId(e.target.value);
                  setSelectedMonth("ALL");
                }}
                className={`h-8 px-2.5 py-1 rounded-lg text-xs font-normal border focus:outline-none transition ${
                  isDark
                    ? "bg-[#070d18] border-[#1d2d4a] text-sky-400 focus:border-sky-500"
                    : "bg-white border-slate-200 text-slate-800 focus:border-sky-500 shadow-2xs"
                }`}
              >
                {ALL_CY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.subLabel})
                  </option>
                ))}
              </select>
            )}

            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`h-8 px-2.5 py-1 rounded-lg text-xs font-normal border focus:outline-none transition ${
                isDark
                  ? "bg-[#070d18] border-amber-900/60 text-amber-400 focus:border-amber-500"
                  : "bg-amber-50/50 border-amber-200 text-amber-900 focus:border-amber-500 shadow-2xs"
              }`}
            >
              <option value="ALL">
                All Months ({currentPeriod.type === "FY" ? "Apr-Mar • Full FY" : "Jan-Dec • Full CY"})
              </option>
              {currentPeriod.months.map((m) => (
                <option key={m.mmmYy} value={m.mmmYy}>
                  {String(m.order).padStart(2, "0")} • {m.mmmYy} ({m.name})
                </option>
              ))}
            </select>

            {/* Segment Selector Pills */}
            <div className={`flex items-center rounded-lg p-0.5 border ${
              isDark ? "bg-[#070d18] border-[#1b2844]" : "bg-slate-100 border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => setSelectedSegment("PV")}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                  selectedSegment === "PV"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 font-medium shadow-xs"
                    : isDark ? "text-slate-400 hover:text-slate-200 font-normal" : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
              >
                PV <span className="opacity-70 text-[11px]">{segmentStats.pv > 0 ? `(${segmentStats.pv.toLocaleString()})` : "(0)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSegment("CV")}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                  selectedSegment === "CV"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 font-medium shadow-xs"
                    : isDark ? "text-slate-400 hover:text-slate-200 font-normal" : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
              >
                CV <span className="opacity-70 text-[11px]">{segmentStats.cv > 0 ? `(${segmentStats.cv.toLocaleString()})` : "(0)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSegment("BEV")}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                  selectedSegment === "BEV"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 font-medium shadow-xs"
                    : isDark ? "text-slate-400 hover:text-slate-200 font-normal" : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
              >
                ⚡ BEV <span className="opacity-70 text-[11px]">{segmentStats.bev > 0 ? `(${segmentStats.bev.toLocaleString()})` : "(0)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSegment("ALL")}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                  selectedSegment === "ALL"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 font-medium shadow-xs"
                    : isDark ? "text-slate-400 hover:text-slate-200 font-normal" : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
              >
                All <span className="opacity-70 text-[11px]">{segmentStats.all > 0 ? `(${segmentStats.all.toLocaleString()})` : ""}</span>
              </button>
            </div>
          </div>

          {/* Export Button - Clean & Elegant */}
          <button
            onClick={handleExportSummaryExcel}
            className="h-8 flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all duration-150 hover:-translate-y-0.5 ml-auto shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>

        {/* ROW 2: Geographic Drill-Down + Scope */}
        <div className={`flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t ${
          isDark ? "border-[#16233b]" : "border-slate-100"
        }`}>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Territory Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Territory:
              </span>
              <select
                value={selectedTerritory}
                onChange={(e) => handleTerritoryChange(e.target.value)}
                className={`h-7.5 px-2.5 text-xs font-normal rounded-lg border focus:outline-none transition ${
                  isDark
                    ? "bg-[#070d18] border-[#1d2d4a] text-slate-200 focus:border-sky-500"
                    : "bg-white border-slate-200 text-slate-800 focus:border-sky-500 shadow-2xs"
                }`}
              >
                <option value="ALL">All Kerala</option>
                <option value="North Kerala">North Kerala</option>
                <option value="South Kerala">South Kerala</option>
              </select>
            </div>

            {/* District Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                District:
              </span>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className={`h-7.5 px-2.5 text-xs font-normal rounded-lg border focus:outline-none transition ${
                  isDark
                    ? "bg-[#070d18] border-[#1d2d4a] text-slate-200 focus:border-sky-500"
                    : "bg-white border-slate-200 text-slate-800 focus:border-sky-500 shadow-2xs"
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

            {/* RTO Office Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                RTO:
              </span>
              <select
                value={selectedRto}
                onChange={(e) => setSelectedRto(e.target.value)}
                className={`h-7.5 px-2.5 text-xs font-normal rounded-lg border focus:outline-none max-w-[190px] truncate transition ${
                  isDark
                    ? "bg-[#070d18] border-[#1d2d4a] text-slate-200 focus:border-sky-500"
                    : "bg-white border-slate-200 text-slate-800 focus:border-sky-500 shadow-2xs"
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
                title="Reset filters back to default"
                className={`h-7.5 flex items-center gap-1 px-2.5 rounded-lg text-[11px] font-normal border transition ${
                  isDark
                    ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
              >
                <RotateCcw className="w-3 h-3 text-sky-500" />
                Reset
              </button>
            )}
          </div>

          {/* Right Status Badge in Row 2 */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-normal border ${
              isDark ? "bg-[#070d18] border-[#18263e] text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600 shadow-2xs"
            }`}>
              📍 Scope: <span className="font-medium text-sky-600 dark:text-sky-400">
                {selectedRto !== "ALL"
                  ? `RTO ${selectedRto}`
                  : selectedDistrict !== "ALL"
                  ? `${selectedDistrict} District`
                  : selectedTerritory !== "ALL"
                  ? selectedTerritory
                  : "All Kerala"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

