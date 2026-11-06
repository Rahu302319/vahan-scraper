"use client";

import { createPortal } from "react-dom";

import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  ChevronDown,
  BarChart3,
  PieChart,
  Car,
  Award,
  Layers,
  MapPin,
  Download,
  Filter,
  Search,
  Check,
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
  selectedMonth: string | string[] = "ALL",
  periodMonths: PeriodMonth[]
): number {
  const rowYear = Number(row.Year || row.year || row.FY || 0);

  if (Array.isArray(selectedMonth)) {
    if (selectedMonth.length === 0 || selectedMonth.includes("ALL")) {
      let total = 0;
      for (const m of periodMonths) {
        if (rowYear === 0 || rowYear === m.calYear) {
          const colName = m.code;
          const v =
            colName === "DEC"
              ? (row["DEC"] ?? row["dec_val"] ?? row["dec"] ?? 0)
              : (row[colName] ?? row[colName.toLowerCase()] ?? 0);
          if (v !== undefined && !isNaN(Number(v))) total += Number(v);
        }
      }
      return total;
    }
    let total = 0;
    for (const sm of selectedMonth) {
      const targetMonth = periodMonths.find(
        (m) =>
          m.mmmYy.toUpperCase() === sm.toUpperCase() ||
          m.code.toUpperCase() === sm.toUpperCase() ||
          m.name.toUpperCase() === sm.toUpperCase()
      );
      if (targetMonth && (rowYear === 0 || rowYear === targetMonth.calYear)) {
        const colName = targetMonth.code;
        const v =
          colName === "DEC"
            ? (row["DEC"] ?? row["dec_val"] ?? row["dec"] ?? 0)
            : (row[colName] ?? row[colName.toLowerCase()] ?? 0);
        if (v !== undefined && !isNaN(Number(v))) total += Number(v);
      }
    }
    return total;
  }

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

interface MultiSelectOption {
  label: string;
  value: string;
  subLabel?: string;
}

interface MultiSelectDropdownProps {
  placeholder: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  colorScheme: "sky" | "amber" | "indigo" | "rose" | "teal";
  isDark: boolean;
  allLabel: string;
}

function MultiSelectDropdown({
  placeholder,
  options,
  selectedValues,
  onChange,
  colorScheme,
  isDark,
  allLabel,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Color schemes for triggers and tags (Radius: 2px, Semibold)
  const themeStyles = {
    amber: {
      trigger: isDark
        ? "bg-amber-950/40 border-amber-500/80 text-amber-300 focus:border-amber-400"
        : "bg-amber-50/80 border-amber-400 text-amber-900 focus:border-amber-600",
      activeCheck: "bg-amber-500 border-amber-500 text-slate-950",
      badge: isDark ? "bg-amber-900/60 text-amber-300" : "bg-amber-100 text-amber-900",
      accent: "text-amber-500",
    },
    indigo: {
      trigger: isDark
        ? "bg-indigo-950/40 border-indigo-500/80 text-indigo-300 focus:border-indigo-400"
        : "bg-indigo-50/80 border-indigo-400 text-indigo-900 focus:border-indigo-600",
      activeCheck: "bg-indigo-600 border-indigo-600 text-white",
      badge: isDark ? "bg-indigo-900/60 text-indigo-300" : "bg-indigo-100 text-indigo-900",
      accent: "text-indigo-500",
    },
    rose: {
      trigger: isDark
        ? "bg-rose-950/40 border-rose-500/80 text-rose-300 focus:border-rose-400"
        : "bg-rose-50/80 border-rose-400 text-rose-900 focus:border-rose-600",
      activeCheck: "bg-rose-500 border-rose-500 text-white",
      badge: isDark ? "bg-rose-900/60 text-rose-300" : "bg-rose-100 text-rose-900",
      accent: "text-rose-500",
    },
    sky: {
      trigger: isDark
        ? "bg-sky-950/40 border-sky-500/80 text-sky-300 focus:border-sky-400"
        : "bg-sky-50/80 border-sky-400 text-sky-900 focus:border-sky-600",
      activeCheck: "bg-sky-500 border-sky-500 text-white",
      badge: isDark ? "bg-sky-900/60 text-sky-300" : "bg-sky-100 text-sky-900",
      accent: "text-sky-500",
    },
    teal: {
      trigger: isDark
        ? "bg-teal-950/40 border-teal-500/80 text-teal-300 focus:border-teal-400"
        : "bg-teal-50/80 border-teal-400 text-teal-900 focus:border-teal-600",
      activeCheck: "bg-teal-500 border-teal-500 text-white",
      badge: isDark ? "bg-teal-900/60 text-teal-300" : "bg-teal-100 text-teal-900",
      accent: "text-teal-500",
    },
  }[colorScheme];

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [options, search]);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const handleClear = () => {
    onChange([]);
  };

  // Determine trigger display text
  let triggerText = allLabel;
  if (selectedValues.length === 1) {
    const found = options.find((o) => o.value === selectedValues[0]);
    triggerText = found ? found.label : selectedValues[0];
  } else if (selectedValues.length === 2) {
    const o1 = options.find((o) => o.value === selectedValues[0]);
    const o2 = options.find((o) => o.value === selectedValues[1]);
    const m1 = o1 ? o1.label.split(" ")[0] : selectedValues[0];
    const m2 = o2 ? o2.label.split(" ")[0] : selectedValues[1];
    triggerText = `${m1}, ${m2}`;
  } else if (selectedValues.length > 2 && selectedValues.length < options.length) {
    triggerText = `${selectedValues.length} Selected`;
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-7.5 flex items-center justify-between gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-[2px] border transition-all shadow-xs ${
          themeStyles.trigger
        }`}
      >
        <span className="truncate max-w-[170px]">{triggerText}</span>
        {selectedValues.length > 0 && selectedValues.length < options.length && (
          <span className={`px-1 rounded-[2px] text-[10px] font-semibold ${themeStyles.badge}`}>
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1 w-64 max-h-72 flex flex-col rounded-[2px] border shadow-2xl z-50 overflow-hidden ${
            isDark ? "bg-[#0b1322] border-[#1f2d48] text-slate-200" : "bg-white border-slate-300 text-slate-800"
          }`}
        >
          {/* Quick Header: Search & Select All / Clear */}
          <div className={`p-2 border-b flex flex-col gap-1.5 ${isDark ? "border-[#19263e] bg-[#080e19]" : "border-slate-100 bg-slate-50"}`}>
            {options.length > 5 && (
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${placeholder.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-6 pr-2 py-0.5 text-xs font-semibold rounded-[2px] border focus:outline-none ${
                    isDark ? "bg-[#0f172a] border-[#243555] text-slate-100 placeholder-slate-500" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] font-semibold pt-0.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sky-600 hover:text-sky-500 dark:text-sky-400 font-semibold transition"
              >
                Select All ({options.length})
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-500 hover:text-rose-500 dark:text-slate-400 font-semibold transition"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Options List with Checkboxes */}
          <div className="overflow-y-auto max-h-52 divide-y divide-slate-100/10 p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 text-center">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-[2px] text-left transition ${
                      isSelected
                        ? isDark
                          ? "bg-slate-800/80 text-white"
                          : "bg-sky-50 text-sky-900"
                        : isDark
                        ? "text-slate-300 hover:bg-slate-800/40"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center transition-all ${
                          isSelected
                            ? themeStyles.activeCheck
                            : isDark
                            ? "border-slate-600 bg-slate-900"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {opt.subLabel && (
                      <span className="text-[10px] font-semibold text-slate-400 ml-2 shrink-0">{opt.subLabel}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
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

  // Header Slot for Status Badges (placed on same line as Download Master Excel)
  const [headerSlotEl, setHeaderSlotEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById("dashboard-header-status-slot");
    if (el) setHeaderSlotEl(el);
  }, []);

  // 1. DEPENDENT FILTER STATES (Supports Multi-Selection)
  const [periodType, setPeriodType] = useState<PeriodType>("FY");
  const [selectedFyId, setSelectedFyId] = useState<string>("FY27");
  const [selectedCyId, setSelectedCyId] = useState<string>("CY26");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<"PV" | "CV" | "BEV" | "ALL">("PV");
  const [selectedTerritory, setSelectedTerritory] = useState<string>("ALL");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedRtos, setSelectedRtos] = useState<string[]>([]);

  // Backward-compatibility single-selection aliases
  const selectedMonth = selectedMonths.length === 1 ? selectedMonths[0] : (selectedMonths.length > 1 ? selectedMonths.join(",") : "ALL");
  const selectedDistrict = selectedDistricts.length === 1 ? selectedDistricts[0] : (selectedDistricts.length > 1 ? selectedDistricts.join(",") : "ALL");
  const selectedRto = selectedRtos.length === 1 ? selectedRtos[0] : (selectedRtos.length > 1 ? selectedRtos.join(",") : "ALL");
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
      const vol = getRowVolumeForPeriod(r, selectedMonths.length > 0 ? selectedMonths : "ALL", currentPeriod.months);
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
      setSelectedDistricts((prev) => prev.filter((d) => allowedDistricts.includes(d)));
      setSelectedRtos([]);
    }
  };

  // B. Available RTOs depends on selected District and Territory (supports multi-district)
  const availableRtos = useMemo(() => {
    let rtos = summaryRowsTemplate.filter((r) => r.type === "rto");
    if (selectedTerritory !== "ALL") {
      rtos = rtos.filter((r) => r.territory === selectedTerritory);
    }
    if (selectedDistricts.length > 0) {
      rtos = rtos.filter((r) => selectedDistricts.includes(r.district));
    }
    return Array.from(new Set(rtos.map((r) => r.rtoName))).sort();
  }, [selectedTerritory, selectedDistricts, summaryRowsTemplate]);

  // Reset all cascading filters back to ALL
  const handleResetFilters = () => {
    setSelectedMonths([]);
    setSelectedTerritory("ALL");
    setSelectedDistricts([]);
    setSelectedRtos([]);
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

      // Check RTO filter (supports multi-selection)
      if (selectedRtos.length > 0 && !selectedRtos.some((sel) => cleanRtoName(sel) === cleanKey)) {
        return;
      }

      // Check District filter (supports multi-selection)
      if (selectedDistricts.length > 0) {
        const rowDist = r.district || r.District || "";
        if (!selectedDistricts.includes(rowDist)) return;
      }

      // Check Territory filter
      if (selectedTerritory !== "ALL") {
        const rowTerr = r.territory || r.Territory || "";
        if (rowTerr && rowTerr !== selectedTerritory) return;
      }

      const { grouping } = resolveRowOem(r);
      const vol = getRowVolumeForPeriod(r, selectedMonths.length > 0 ? selectedMonths : "ALL", currentPeriod.months);
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
  }, [currentPeriod, selectedMonths, selectedTerritory, selectedDistricts, selectedRtos, activeDatasetRows, effectiveOemDb, rtoDtLookup, rtoCodeLookup]);

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
  const timeframeLabel = useMemo(() => {
    if (selectedMonths.length === 1) {
      return selectedMonths[0];
    }
    if (selectedMonths.length > 1) {
      return `${selectedMonths.length} Months (${selectedMonths.join(", ")})`;
    }
    return `${currentPeriod.label} (${currentPeriod.subLabel})`;
  }, [selectedMonths, currentPeriod]);

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

  const statusBadgesContent = (
    <div className="flex flex-wrap items-center gap-1.5 ml-1">
      <span className={`px-2.5 py-1 rounded-[2px] text-xs font-semibold border ${
        isDark ? "bg-emerald-950/30 border-emerald-800 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
      }`}>
        🟢 {activeDatasetRows.length.toLocaleString()} Records
      </span>
      <span className={`px-2.5 py-1 rounded-[2px] text-xs font-semibold border ${
        isDark ? "bg-sky-950/30 border-sky-800 text-sky-400" : "bg-sky-50 border-sky-200 text-sky-700"
      }`}>
        ⚡ {selectedSegment === "ALL" ? "All Segments" : `${selectedSegment} Segment`}
      </span>
      <span className={`px-2.5 py-1 rounded-[2px] text-xs font-semibold border ${
        isDark ? "bg-purple-950/30 border-purple-800 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-700"
      }`}>
        📍 {activeDatasetRtoCount} RTOs
      </span>
      <span className={`px-2.5 py-1 rounded-[2px] text-xs font-semibold border ${
        isDark ? "bg-amber-950/30 border-amber-800 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"
      }`}>
        📅 {timeframeLabel}
      </span>
      <button
        type="button"
        onClick={fetchDbRegistrations}
        title="Refresh latest data from database"
        className={`p-1.5 rounded-[2px] border transition-all duration-150 shadow-xs ${
          isDark
            ? "bg-[#0e172a] border-[#243555] text-sky-400 hover:text-white hover:bg-[#16233b]"
            : "bg-white border-slate-200 text-sky-600 hover:text-sky-800 hover:bg-sky-50"
        }`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? "animate-spin text-sky-500" : ""}`} />
      </button>
    </div>
  );

  return (
    <>
      {/* Teleport Status Badges to same line as Download Master Excel button */}
      {headerSlotEl && createPortal(statusBadgesContent, headerSlotEl)}

      <div className={`rounded-2xl border transition-all duration-300 shadow-md ${
        isDark
          ? "bg-[#0a101d] border-[#1d2d4d] text-slate-200 shadow-black/40"
          : "bg-white border-slate-200/90 text-slate-800 shadow-slate-200/40"
      }`}>
        {/* If slot is not available yet, show status badges here as fallback */}
        {!headerSlotEl && (
          <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b ${
            isDark ? "border-[#16233b] bg-gradient-to-r from-[#0d1628] to-[#0a1120]" : "border-slate-100 bg-slate-50"
          }`}>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                KL • Kerala
              </span>
            </div>
            {statusBadgesContent}
          </div>
        )}

        {/* COLORFUL COMPACT CONTROLS SURFACE (Radius: 2px, Semibold, Multi-Selection) */}
        <div className="p-3 sm:p-3.5 flex flex-col gap-2.5">
          {/* ROW 1: Timeframe, Segment Pills, and Export Button */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* FY / CY Mode Switch - Radius 2 */}
              <div className={`flex items-center rounded-[2px] p-0.5 border shadow-inner ${
                isDark ? "bg-[#070d18] border-[#1d2d4d]" : "bg-slate-100 border-slate-200"
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodType("FY");
                    setSelectedMonths([]);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[2px] transition-all ${
                    periodType === "FY"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                      : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Financial Year (Apr to Mar)"
                >
                  <Calendar className="w-3 h-3" />
                  FY
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodType("CY");
                    setSelectedMonths([]);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[2px] transition-all ${
                    periodType === "CY"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                      : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Calendar Year (Jan to Dec)"
                >
                  <Calendar className="w-3 h-3" />
                  CY
                </button>
              </div>

              {/* Period Dropdown - Vibrant Sky with Radius 2 */}
              {periodType === "FY" ? (
                <select
                  value={selectedFyId}
                  onChange={(e) => {
                    setSelectedFyId(e.target.value);
                    setSelectedMonths([]);
                  }}
                  className={`h-7.5 px-2.5 py-1 rounded-[2px] text-xs font-semibold border focus:outline-none transition-all shadow-xs ${
                    isDark
                      ? "bg-sky-950/40 border-sky-500/80 text-sky-300 focus:border-sky-400"
                      : "bg-sky-50/80 border-sky-400 text-sky-900 focus:border-sky-600"
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
                    setSelectedMonths([]);
                  }}
                  className={`h-7.5 px-2.5 py-1 rounded-[2px] text-xs font-semibold border focus:outline-none transition-all shadow-xs ${
                    isDark
                      ? "bg-sky-950/40 border-sky-500/80 text-sky-300 focus:border-sky-400"
                      : "bg-sky-50/80 border-sky-400 text-sky-900 focus:border-sky-600"
                  }`}
                >
                  {ALL_CY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.subLabel})
                    </option>
                  ))}
                </select>
              )}

              {/* Month MultiSelect Dropdown - Vibrant Amber with Radius 2 */}
              <MultiSelectDropdown
                placeholder="Months"
                options={currentPeriod.months.map((m) => ({
                  label: `${m.mmmYy} (${m.name})`,
                  value: m.mmmYy,
                  subLabel: m.code,
                }))}
                selectedValues={selectedMonths}
                onChange={setSelectedMonths}
                colorScheme="amber"
                isDark={isDark}
                allLabel={`All Months (${currentPeriod.type === "FY" ? "Apr-Mar" : "Jan-Dec"})`}
              />

              {/* Segment Selector Colorful Pills - Radius 2 */}
              <div className={`flex items-center rounded-[2px] p-0.5 border shadow-inner ${
                isDark ? "bg-[#070d18] border-[#1d2d4d]" : "bg-slate-100 border-slate-200"
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedSegment("PV")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[2px] transition-all ${
                    selectedSegment === "PV"
                      ? "bg-blue-600 text-white shadow-sm"
                      : isDark ? "text-blue-400 hover:text-blue-200" : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  🚗 PV <span className="opacity-80 text-[11px] font-normal">{segmentStats.pv > 0 ? `(${segmentStats.pv.toLocaleString()})` : "(0)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSegment("CV")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[2px] transition-all ${
                    selectedSegment === "CV"
                      ? "bg-amber-600 text-white shadow-sm"
                      : isDark ? "text-amber-400 hover:text-amber-200" : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  🚚 CV <span className="opacity-80 text-[11px] font-normal">{segmentStats.cv > 0 ? `(${segmentStats.cv.toLocaleString()})` : "(0)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSegment("BEV")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[2px] transition-all ${
                    selectedSegment === "BEV"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/30"
                      : isDark ? "text-cyan-400 hover:text-cyan-200" : "text-sky-700 hover:bg-sky-50"
                  }`}
                >
                  ⚡ BEV <span className="opacity-80 text-[11px] font-normal">{segmentStats.bev > 0 ? `(${segmentStats.bev.toLocaleString()})` : "(0)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSegment("ALL")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[2px] transition-all ${
                    selectedSegment === "ALL"
                      ? "bg-purple-600 text-white shadow-sm"
                      : isDark ? "text-purple-400 hover:text-purple-200" : "text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  🌐 All <span className="opacity-80 text-[11px] font-normal">{segmentStats.all > 0 ? `(${segmentStats.all.toLocaleString()})` : ""}</span>
                </button>
              </div>
            </div>

            {/* Export Button - Vibrant Emerald Gradient with Radius 2 */}
            <button
              onClick={handleExportSummaryExcel}
              className="h-7.5 flex items-center gap-1.5 px-3.5 py-1 rounded-[2px] text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-sm shadow-emerald-500/30 transition-all duration-150 hover:-translate-y-0.5 ml-auto shrink-0"
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
              {/* Territory Dropdown - Vibrant Teal with Radius 2 */}
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-semibold ${isDark ? "text-teal-400" : "text-teal-700"}`}>
                  Territory:
                </span>
                <select
                  value={selectedTerritory}
                  onChange={(e) => handleTerritoryChange(e.target.value)}
                  className={`h-7.5 px-2.5 py-1 text-xs font-semibold rounded-[2px] border focus:outline-none transition-all shadow-xs ${
                    isDark
                      ? "bg-teal-950/40 border-teal-500/80 text-teal-300 focus:border-teal-400"
                      : "bg-teal-50/80 border-teal-400 text-teal-900 focus:border-teal-600"
                  }`}
                >
                  <option value="ALL">All Kerala</option>
                  <option value="North Kerala">North Kerala</option>
                  <option value="South Kerala">South Kerala</option>
                </select>
              </div>

              {/* District MultiSelect Dropdown - Vibrant Indigo with Radius 2 */}
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-semibold ${isDark ? "text-indigo-400" : "text-indigo-700"}`}>
                  District:
                </span>
                <MultiSelectDropdown
                  placeholder="Districts"
                  options={availableDistricts.map((d) => ({ label: d, value: d }))}
                  selectedValues={selectedDistricts}
                  onChange={setSelectedDistricts}
                  colorScheme="indigo"
                  isDark={isDark}
                  allLabel={selectedTerritory === "ALL" ? "All 14 Districts" : `All ${selectedTerritory} Districts`}
                />
              </div>

              {/* RTO MultiSelect Dropdown - Vibrant Rose with Radius 2 */}
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-semibold ${isDark ? "text-rose-400" : "text-rose-700"}`}>
                  RTO:
                </span>
                <MultiSelectDropdown
                  placeholder="RTOs"
                  options={availableRtos.map((r) => ({ label: r, value: r }))}
                  selectedValues={selectedRtos}
                  onChange={setSelectedRtos}
                  colorScheme="rose"
                  isDark={isDark}
                  allLabel={
                    selectedDistricts.length > 0
                      ? `All in ${selectedDistricts.length} Districts (${availableRtos.length})`
                      : selectedTerritory === "ALL"
                      ? `All 87 RTOs`
                      : `All ${selectedTerritory} RTOs (${availableRtos.length})`
                  }
                />
              </div>

              {/* Reset Filters Shortcut - Radius 2 */}
              {(selectedMonths.length > 0 || selectedTerritory !== "ALL" || selectedDistricts.length > 0 || selectedRtos.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Reset all filters back to default"
                  className={`h-7.5 flex items-center gap-1 px-2.5 py-0.5 rounded-[2px] text-[11px] font-semibold border transition-all ${
                    isDark
                      ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <RotateCcw className="w-3 h-3 text-sky-500" />
                  Reset
                </button>
              )}
            </div>

            {/* Right Status Badge in Row 2 - Radius 2 */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className={`px-2.5 py-1 rounded-[2px] text-xs font-semibold border shadow-2xs ${
                isDark ? "bg-indigo-950/40 border-indigo-700 text-indigo-300" : "bg-sky-50/80 border-sky-200 text-sky-800"
              }`}>
                📍 Scope: <span className="font-semibold text-sky-600 dark:text-sky-300">
                  {selectedRtos.length > 0
                    ? `${selectedRtos.length} RTOs (${selectedRtos.slice(0, 2).join(", ")}${selectedRtos.length > 2 ? "..." : ""})`
                    : selectedDistricts.length > 0
                    ? `${selectedDistricts.length} Districts (${selectedDistricts.slice(0, 2).join(", ")}${selectedDistricts.length > 2 ? "..." : ""})`
                    : selectedTerritory !== "ALL"
                    ? selectedTerritory
                    : "All Kerala"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
