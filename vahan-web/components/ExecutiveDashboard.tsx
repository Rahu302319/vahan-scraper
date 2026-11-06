"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  Table,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  Flame,
  Maximize2,
  Minimize2,
  X,
  Camera,
  Copy
} from "lucide-react";
import ExcelJS from "exceljs";

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
  const label = `FY-${currYY}`;
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
  const label = `CY-${yy}`;
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
    "Kasargode",
    "Kannur",
    "Calicut",
    "Wayanad",
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

export const matchDistrict = (rowDistrict: string, filterDistrict: string): boolean => {
  if (rowDistrict === filterDistrict) return true;
  const rd = (rowDistrict || "").toLowerCase().trim();
  const fd = (filterDistrict || "").toLowerCase().trim();
  if (rd === fd) return true;
  if ((rd.includes("kasar") || rd.includes("ksar")) && (fd.includes("kasar") || fd.includes("ksar"))) return true;
  if ((rd.includes("calicut") || rd.includes("kozhikode")) && (fd.includes("calicut") || fd.includes("kozhikode"))) return true;
  return false;
};

export const getNorthDistrictRank = (district: string): number => {
  const d = (district || "").toLowerCase().trim();
  if (d.includes("ksar") || d.includes("kasar")) return 1;
  if (d.includes("kannur")) return 2;
  if (d.includes("calicut") || d.includes("kozhikode")) return 3;
  if (d.includes("wayanad")) return 4;
  if (d.includes("malappuram")) return 5;
  if (d.includes("palakkad")) return 6;
  if (d.includes("thrissur")) return 7;
  return 99;
};

export const formatDistrictDisplayName = (district: string): string => {
  const d = (district || "").toLowerCase().trim();
  if (d.includes("calicut") || d.includes("kozhikode")) return "Calicut";
  if (d.includes("ksar") || d.includes("kasar")) return "Kasargode";
  return district;
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
  buttonClassName?: string;
  maxTriggerWidth?: string;
  menuWidth?: string;
  menuMaxHeight?: string;
  listMaxHeight?: string;
}

function MultiSelectDropdown({
  placeholder,
  options,
  selectedValues,
  onChange,
  colorScheme,
  isDark,
  allLabel,
  buttonClassName,
  maxTriggerWidth = "max-w-[170px]",
  menuWidth = "w-48",
  menuMaxHeight = "max-h-44",
  listMaxHeight = "max-h-32",
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
        ? "bg-amber-500/15 border-amber-500/80 text-amber-300 focus:border-amber-400"
        : "bg-amber-50/80 border-amber-400 text-amber-900 focus:border-amber-600",
      activeCheck: "bg-amber-500 border-amber-500 text-slate-950",
      badge: isDark ? "bg-amber-900/60 text-amber-300" : "bg-amber-100 text-amber-900",
      accent: "text-amber-500",
    },
    indigo: {
      trigger: isDark
        ? "bg-indigo-500/15 border-indigo-500/80 text-indigo-300 focus:border-indigo-400"
        : "bg-indigo-50/80 border-indigo-400 text-indigo-900 focus:border-indigo-600",
      activeCheck: "bg-indigo-600 border-indigo-600 text-white",
      badge: isDark ? "bg-indigo-900/60 text-indigo-300" : "bg-indigo-100 text-indigo-900",
      accent: "text-indigo-500",
    },
    rose: {
      trigger: isDark
        ? "bg-rose-500/15 border-rose-500/80 text-rose-300 focus:border-rose-400"
        : "bg-rose-50/80 border-rose-400 text-rose-900 focus:border-rose-600",
      activeCheck: "bg-rose-500 border-rose-500 text-white",
      badge: isDark ? "bg-rose-900/60 text-rose-300" : "bg-rose-100 text-rose-900",
      accent: "text-rose-500",
    },
    sky: {
      trigger: isDark
        ? "bg-sky-500/15 border-sky-500/80 text-sky-300 focus:border-sky-400"
        : "bg-sky-50/80 border-sky-400 text-sky-900 focus:border-sky-600",
      activeCheck: "bg-sky-500 border-sky-500 text-white",
      badge: isDark ? "bg-sky-900/60 text-sky-300" : "bg-sky-100 text-sky-900",
      accent: "text-sky-500",
    },
    teal: {
      trigger: isDark
        ? "bg-teal-500/15 border-teal-500/80 text-teal-300 focus:border-teal-400"
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
        } ${buttonClassName || ""}`}
      >
        <span className={`truncate ${maxTriggerWidth}`}>{triggerText}</span>
        {selectedValues.length > 0 && selectedValues.length < options.length && (
          <span className={`px-1 rounded-[2px] text-[10px] font-semibold ${themeStyles.badge}`}>
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1 ${menuWidth} ${menuMaxHeight} flex flex-col rounded-[2px] border shadow-2xl z-50 overflow-hidden ${
            isDark ? "bg-[#1e293b] border-slate-600 text-slate-100 shadow-2xl" : "bg-white border-slate-300 text-slate-800"
          }`}
        >
          {/* Quick Header: Search & Select All / Clear (Compact) */}
          <div className={`p-1.5 border-b flex flex-col gap-1 ${isDark ? "border-slate-700 bg-slate-900/90" : "border-slate-100 bg-slate-50"}`}>
            {options.length > 5 && (
              <div className="relative">
                <Search className="w-3 h-3 absolute left-1.5 top-1.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${placeholder.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-5 pr-2 py-0.5 text-[11px] font-semibold rounded-[2px] border focus:outline-none ${
                    isDark ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-400" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] font-semibold pt-0.5">
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

          {/* Options List with Checkboxes (Compact Length) */}
          <div className={`overflow-y-auto ${listMaxHeight} divide-y divide-slate-100/10 p-0.5`}>
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 text-center">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={`w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold rounded-[2px] text-left transition ${
                      isSelected
                        ? isDark
                          ? "bg-slate-700 text-white"
                          : "bg-sky-50 text-sky-900"
                        : isDark
                        ? "text-slate-200 hover:bg-slate-700/50"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <div
                        className={`w-3 h-3 rounded-[2px] border flex items-center justify-center transition-all ${
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
                      <span className="text-[9.5px] font-semibold text-slate-400 ml-1.5 shrink-0">{opt.subLabel}</span>
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

  // MariaDB eramsale_vahan Live Master Tables (RTO Master & OEM Master)
  const [internalRtoDt, setInternalRtoDt] = useState<RTORecord[]>([]);
  const [internalOemDb, setInternalOemDb] = useState<OEMRecord[]>([]);

  // Automatically fetch live master tables from MariaDB on mount
  useEffect(() => {
    async function fetchDbMasters() {
      try {
        const [rtoRes, oemRes] = await Promise.all([
          fetch("/api/db?type=rto"),
          fetch("/api/db?type=oem"),
        ]);
        const rtoJson = await rtoRes.json();
        const oemJson = await oemRes.json();

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

  // Base summary hierarchy dynamically constructed from MariaDB table 'rto_master' (87 RTOs, 14 Districts, 2 Territories)
  const summaryRowsTemplate = useMemo(() => {
    if (effectiveRtoDt && effectiveRtoDt.length > 0) {
      const rows: SummaryRow[] = [];
      const seenRtos = new Set<string>();
      const distSet = new Map<string, string>(); // district -> territory

      // 1. Leaf RTO Rows
      effectiveRtoDt.forEach((d: any) => {
        const finalName = d.finalRtoName || d.srtOffice;
        if (!finalName) return;
        const key = `${d.territory}|${d.district}|${finalName}`;
        if (!seenRtos.has(key)) {
          seenRtos.add(key);
          rows.push({
            territory: d.territory,
            district: d.district,
            rtoName: finalName,
            label: finalName,
            type: "rto",
            years: {},
          });
          distSet.set(d.district, d.territory);
        }
      });

      // 2. District Totals
      distSet.forEach((territory, district) => {
        rows.push({
          territory,
          district,
          rtoName: "",
          label: `${district} Total`,
          type: "district_total",
          years: {},
        });
      });

      // 3. Territory Totals
      rows.push({
        territory: "North Kerala",
        district: "North Kerala Total",
        rtoName: "",
        label: "North Kerala Total",
        type: "territory_total",
        years: {},
      });
      rows.push({
        territory: "South Kerala",
        district: "South Kerala Total",
        rtoName: "",
        label: "South Kerala Total",
        type: "territory_total",
        years: {},
      });

      // 4. Grand Total
      rows.push({
        territory: "All Kerala",
        district: "Grand Total",
        rtoName: "",
        label: "Grand Total",
        type: "grand_total",
        years: {},
      });

      return rows;
    }
    return [];
  }, [effectiveRtoDt]);

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

  // Focus Mode State for Tables: "North Kerala" | "South Kerala" | null
  const [focusedTable, setFocusedTable] = useState<"North Kerala" | "South Kerala" | null>(null);

  // Month-on-Month Table View Mode: "territory" | "district"
  const [momViewMode, setMomViewMode] = useState<"territory" | "district">("district");

  // Transient Copy-as-Image Feedback Status: territory -> message
  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocusedTable(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  // Fetch all live registrations directly from MariaDB table 'vahan_registrations'
  const fetchDbRegistrations = async () => {
    setIsLoadingDb(true);
    try {
      const res = await fetch(`/api/db?type=registrations`);
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
      rtos = rtos.filter((r) => selectedDistricts.some((d) => matchDistrict(r.district, d)));
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
        if (!selectedDistricts.some((d) => matchDistrict(rowDist, d))) return;
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

  const toggleAllDistrictsInTerritory = (districts: string[], shouldExpand: boolean) => {
    setExpandedDistricts((prev) => {
      const next = { ...prev };
      districts.forEach((d) => {
        next[d] = shouldExpand;
      });
      return next;
    });
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
    return currentPeriod.label;
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

  // -------------------------------------------------------------
  // COMBAT RTO SUMMARY TABLE LOGIC (Territory | District | Final RTO Name | Total Registration | M&M Nos | M&M MS)
  // -------------------------------------------------------------
  const [tableSearch, setTableSearch] = useState<string>("");
  const [tableSortField, setTableSortField] = useState<"territory" | "district" | "rtoName" | "total" | "mm" | "ms">("total");
  const [tableSortAsc, setTableSortAsc] = useState<boolean>(false);

  const handleTableSort = (field: "territory" | "district" | "rtoName" | "total" | "mm" | "ms") => {
    if (tableSortField === field) {
      setTableSortAsc((prev) => !prev);
    } else {
      setTableSortField(field);
      setTableSortAsc(field === "rtoName" || field === "district" || field === "territory");
    }
  };

  const combatTableRows = useMemo(() => {
    let rows = computedSummaryRows.filter(
      (r) => r.type === "rto" && r.district !== "District" && r.rtoName !== "Final RTO Name"
    );

    if (selectedTerritory !== "ALL") {
      rows = rows.filter((r) => r.territory === selectedTerritory);
    }

    if (selectedDistricts.length > 0) {
      rows = rows.filter((r) => selectedDistricts.some((d) => matchDistrict(r.district, d)));
    }

    if (selectedRtos.length > 0) {
      rows = rows.filter((r) => selectedRtos.some((sel) => cleanRtoName(sel) === cleanRtoName(r.rtoName)));
    }

    let mapped = rows.map((r) => {
      const metrics = r.years[currentPeriod.id] || { total: 0, mm: 0, ms: 0 };
      const ms = metrics.total > 0 ? (metrics.mm / metrics.total) * 100 : 0;
      return {
        territory: r.territory,
        district: r.district,
        rtoName: r.rtoName,
        total: metrics.total,
        mm: metrics.mm,
        ms,
      };
    });

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      mapped = mapped.filter(
        (r) =>
          r.rtoName.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.territory.toLowerCase().includes(q)
      );
    }

    mapped.sort((a, b) => {
      const valA = a[tableSortField];
      const valB = b[tableSortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return tableSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return tableSortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });

    return mapped;
  }, [computedSummaryRows, selectedTerritory, selectedDistricts, selectedRtos, currentPeriod.id, tableSearch, tableSortField, tableSortAsc]);

  const combatTableTotals = useMemo(() => {
    let total = 0;
    let mm = 0;
    combatTableRows.forEach((r) => {
      total += r.total;
      mm += r.mm;
    });
    const ms = total > 0 ? (mm / total) * 100 : 0;
    return { total, mm, ms, count: combatTableRows.length };
  }, [combatTableRows]);

  const renderSortIcon = (field: "territory" | "district" | "rtoName" | "total" | "mm" | "ms") => {
    if (tableSortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    }
    return tableSortAsc ? (
      <ArrowUp className="w-3 h-3 text-sky-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-400" />
    );
  };

  return (
    <>
      <div className={`rounded-2xl border transition-all duration-300 shadow-md ${
        isDark
          ? "bg-[#1e293b] border-slate-700/80 text-slate-100 shadow-md"
          : "bg-white border-slate-200/90 text-slate-800 shadow-slate-200/40"
      }`}>
        {/* COLORFUL COMPACT CONTROLS SURFACE (Radius: 2px, Semibold, Multi-Selection) */}
        <div className="p-3 sm:p-3.5 flex flex-col gap-2.5">
          {/* ROW 1: Timeframe, Segment Pills, and Export Button */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* FY / CY Mode Switch - Radius 2 */}
              <div className={`flex items-center rounded-[2px] p-0.5 border shadow-inner ${
                isDark ? "bg-slate-900/80 border-slate-700" : "bg-slate-100 border-slate-200"
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

              {/* Period Dropdown - Compact Vibrant Sky with Radius 2 */}
              {periodType === "FY" ? (
                <select
                  value={selectedFyId}
                  onChange={(e) => {
                    setSelectedFyId(e.target.value);
                    setSelectedMonths([]);
                  }}
                  className={`h-7.5 w-[85px] px-2 py-1 rounded-[2px] text-xs font-semibold border focus:outline-none transition-all shadow-xs ${
                    isDark
                      ? "bg-sky-500/15 border-sky-500/80 text-sky-300 focus:border-sky-400"
                      : "bg-sky-50/80 border-sky-400 text-sky-900 focus:border-sky-600"
                  }`}
                >
                  {ALL_FY_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
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
                  className={`h-7.5 w-[85px] px-2 py-1 rounded-[2px] text-xs font-semibold border focus:outline-none transition-all shadow-xs ${
                    isDark
                      ? "bg-sky-500/15 border-sky-500/80 text-sky-300 focus:border-sky-400"
                      : "bg-sky-50/80 border-sky-400 text-sky-900 focus:border-sky-600"
                  }`}
                >
                  {ALL_CY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Month MultiSelect Dropdown - Compact Amber */}
              <MultiSelectDropdown
                placeholder="Months"
                options={currentPeriod.months.map((m) => ({
                  label: m.mmmYy,
                  value: m.mmmYy,
                  subLabel: m.code,
                }))}
                selectedValues={selectedMonths}
                onChange={setSelectedMonths}
                colorScheme="amber"
                isDark={isDark}
                allLabel="All Months"
                buttonClassName="w-[98px]"
                maxTriggerWidth="max-w-[65px]"
                menuWidth="w-44"
                menuMaxHeight="max-h-40"
                listMaxHeight="max-h-28"
              />

              {/* Territory Dropdown - Same Line */}
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-semibold ${isDark ? "text-teal-400" : "text-teal-700"}`}>
                  Territory:
                </span>
                <select
                  value={selectedTerritory}
                  onChange={(e) => handleTerritoryChange(e.target.value)}
                  className={`h-7.5 px-2.5 py-1 text-xs font-semibold rounded-[2px] border focus:outline-none transition-all shadow-xs ${
                    isDark
                      ? "bg-teal-500/15 border-teal-500/80 text-teal-300 focus:border-teal-400"
                      : "bg-teal-50/80 border-teal-400 text-teal-900 focus:border-teal-600"
                  }`}
                >
                  <option value="ALL">All Kerala</option>
                  <option value="North Kerala">North Kerala</option>
                  <option value="South Kerala">South Kerala</option>
                </select>
              </div>

              {/* District MultiSelect Dropdown - Same Line */}
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
                  buttonClassName="max-w-[140px]"
                  maxTriggerWidth="max-w-[95px]"
                />
              </div>

              {/* RTO MultiSelect Dropdown - Same Line */}
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
                  buttonClassName="max-w-[150px]"
                  maxTriggerWidth="max-w-[105px]"
                />
              </div>

              {/* Segment Selector Colorful Pills - Radius 2 */}
              <div className={`flex items-center rounded-[2px] p-0.5 border shadow-inner ${
                isDark ? "bg-slate-900/80 border-slate-700" : "bg-slate-100 border-slate-200"
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

              {/* Reset Filters Shortcut - Same Line */}
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


          </div>
        </div>
      </div>
      {/* NORTH & SOUTH KERALA DISTRICT-WISE HIERARCHICAL TABLES */}
      {(() => {
        const northRows = combatTableRows.filter(r => r.territory === "North Kerala");
        const southRows = combatTableRows.filter(r => r.territory === "South Kerala");

        interface DistrictGroup {
          district: string;
          territory: string;
          rtos: Array<{
            rtoName: string;
            total: number;
            mm: number;
            ms: number;
          }>;
          districtTotal: {
            total: number;
            mm: number;
            ms: number;
          };
        }

        const groupRowsByDistrict = (rows: typeof combatTableRows, isNorth: boolean): DistrictGroup[] => {
          const map = new Map<string, {
            district: string;
            territory: string;
            rtos: Array<{
              rtoName: string;
              total: number;
              mm: number;
              ms: number;
            }>;
            total: number;
            mm: number;
          }>();

          rows.forEach((r) => {
            const key = isNorth ? formatDistrictDisplayName(r.district) : r.district;
            if (!map.has(key)) {
              map.set(key, {
                district: key,
                territory: r.territory,
                rtos: [],
                total: 0,
                mm: 0,
              });
            }
            const group = map.get(key)!;
            group.rtos.push({
              rtoName: r.rtoName,
              total: r.total,
              mm: r.mm,
              ms: r.ms,
            });
            group.total += r.total;
            group.mm += r.mm;
          });

          const groups: DistrictGroup[] = Array.from(map.values()).map((g) => {
            // Sort RTOs alphabetically within each district as shown in user specification
            g.rtos.sort((a, b) => a.rtoName.localeCompare(b.rtoName));

            return {
              district: g.district,
              territory: g.territory,
              rtos: g.rtos,
              districtTotal: {
                total: g.total,
                mm: g.mm,
                ms: g.total > 0 ? (g.mm / g.total) * 100 : 0,
              },
            };
          });

          // Sort district groups
          groups.sort((a, b) => {
            if (isNorth) {
              // North Kerala districts MUST ALWAYS strictly follow the user's requested geographic corridor:
              // 1. Ksaragode -> 2. Kannur -> 3. Calicut -> 4. Wayanad -> 5. Malappuram -> 6. Palakkad -> 7. Thrissur
              return getNorthDistrictRank(a.district) - getNorthDistrictRank(b.district);
            }

            // South Kerala districts in standard alphabetical order
            return a.district.localeCompare(b.district);
          });

          return groups;
        };

        const calcTotals = (rows: typeof combatTableRows) => ({
          count: rows.length,
          total: rows.reduce((s, r) => s + r.total, 0),
          mm: rows.reduce((s, r) => s + r.mm, 0),
          ms: rows.reduce((s, r) => s + r.total, 0) > 0
            ? (rows.reduce((s, r) => s + r.mm, 0) / rows.reduce((s, r) => s + r.total, 0)) * 100
            : 0,
        });

        const northTotals = calcTotals(northRows);
        const southTotals = calcTotals(southRows);

        // MULTI-YEAR TERRITORY PERFORMANCE SUMMARY DATA (Computed 100% Dynamically from MariaDB vahan_registrations)
        const multiYearData = useMemo(() => {
          // Helper to calculate volume for a set of months from a row
          const getRowMonthsVolume = (row: any, months: Array<{ col: string; year: number }>) => {
            const rowYear = Number(row.Year || row.year || row.FY || 0);
            let total = 0;
            for (const m of months) {
              if (rowYear === 0 || rowYear === m.year) {
                const colName = m.col.toUpperCase();
                const v = colName === "DEC"
                  ? (row["DEC"] ?? row["dec_val"] ?? row["dec"] ?? 0)
                  : (row[colName] ?? row[colName.toLowerCase()] ?? 0);
                if (v !== undefined && !isNaN(Number(v))) total += Number(v);
              }
            }
            return total;
          };

          // Define months for FY 23 (Apr 2022 to Mar 2023)
          const fy23_months = [
            { col: "apr", year: 2022 }, { col: "may", year: 2022 }, { col: "jun", year: 2022 },
            { col: "jul", year: 2022 }, { col: "aug", year: 2022 }, { col: "sep", year: 2022 },
            { col: "oct", year: 2022 }, { col: "nov", year: 2022 }, { col: "dec", year: 2022 },
            { col: "jan", year: 2023 }, { col: "feb", year: 2023 }, { col: "mar", year: 2023 }
          ];

          // Define months for FY 24 (Apr 2023 to Mar 2024)
          const fy24_months = [
            { col: "apr", year: 2023 }, { col: "may", year: 2023 }, { col: "jun", year: 2023 },
            { col: "jul", year: 2023 }, { col: "aug", year: 2023 }, { col: "sep", year: 2023 },
            { col: "oct", year: 2023 }, { col: "nov", year: 2023 }, { col: "dec", year: 2023 },
            { col: "jan", year: 2024 }, { col: "feb", year: 2024 }, { col: "mar", year: 2024 }
          ];

          // Define months for FY 25 (Apr 2024 to Mar 2025)
          const fy25_months = [
            { col: "apr", year: 2024 }, { col: "may", year: 2024 }, { col: "jun", year: 2024 },
            { col: "jul", year: 2024 }, { col: "aug", year: 2024 }, { col: "sep", year: 2024 },
            { col: "oct", year: 2024 }, { col: "nov", year: 2024 }, { col: "dec", year: 2024 },
            { col: "jan", year: 2025 }, { col: "feb", year: 2025 }, { col: "mar", year: 2025 }
          ];

          // Define months for FY 26 (Apr 2025 to Mar 2026)
          const fy26_months = [
            { col: "apr", year: 2025 }, { col: "may", year: 2025 }, { col: "jun", year: 2025 },
            { col: "jul", year: 2025 }, { col: "aug", year: 2025 }, { col: "sep", year: 2025 },
            { col: "oct", year: 2025 }, { col: "nov", year: 2025 }, { col: "dec", year: 2025 },
            { col: "jan", year: 2026 }, { col: "feb", year: 2026 }, { col: "mar", year: 2026 }
          ];

          // Fallback single-year full calendar year months if scraped by calendar year
          const cy25_months = [
            { col: "jan", year: 2025 }, { col: "feb", year: 2025 }, { col: "mar", year: 2025 },
            { col: "apr", year: 2025 }, { col: "may", year: 2025 }, { col: "jun", year: 2025 },
            { col: "jul", year: 2025 }, { col: "aug", year: 2025 }, { col: "sep", year: 2025 },
            { col: "oct", year: 2025 }, { col: "nov", year: 2025 }, { col: "dec", year: 2025 }
          ];

          const getMetrics = (territoryName: "North Kerala" | "South Kerala" | "Total") => {
            let tiv23 = 0, mm23 = 0;
            let tiv24 = 0, mm24 = 0;
            let tiv25 = 0, mm25 = 0;
            let tiv26 = 0, mm26 = 0;

            allDatasetRows.forEach((r) => {
              if (territoryName !== "Total" && r.territory !== territoryName) return;
              if (selectedSegment !== "ALL") {
                const s = String(r.segment || r.Segment || "PV").toUpperCase().trim();
                if (s !== selectedSegment) return;
              }
              const { isMahindra } = resolveRowOem(r);

              // 1. Pure Live DB Query for FY 23
              const v23 = getRowMonthsVolume(r, fy23_months);
              tiv23 += v23;
              if (isMahindra) mm23 += v23;

              // 2. Pure Live DB Query for FY 24
              const v24 = getRowMonthsVolume(r, fy24_months);
              tiv24 += v24;
              if (isMahindra) mm24 += v24;

              // 3. Pure Live DB Query for FY 25 (checks FY 25, or CY 25 if prior year not in DB)
              const v25_fy = getRowMonthsVolume(r, fy25_months);
              const v25 = v25_fy > 0 ? v25_fy : getRowMonthsVolume(r, cy25_months);
              tiv25 += v25;
              if (isMahindra) mm25 += v25;

              // 4. Pure Live DB Query for FY 26
              const v26 = getRowMonthsVolume(r, fy26_months);
              tiv26 += v26;
              if (isMahindra) mm26 += v26;
            });

            // 100% Pure live metrics calculated directly from database records (Zero JSON, Zero Hardcoding)
            const y23 = { total: tiv23, mm: mm23 };
            const y24 = { total: tiv24, mm: mm24 };
            const y25 = { total: tiv25, mm: mm25 };
            const y26 = { total: tiv26, mm: mm26 };

            const goly24_tiv = y23.total > 0 ? ((y24.total - y23.total) / y23.total) * 100 : 0;
            const goly24_mm  = y23.mm > 0 ? ((y24.mm - y23.mm) / y23.mm) * 100 : 0;

            const goly25_tiv = y24.total > 0 ? ((y25.total - y24.total) / y24.total) * 100 : 0;
            const goly25_mm  = y24.mm > 0 ? ((y25.mm - y24.mm) / y24.mm) * 100 : 0;

            const goly26_tiv = y25.total > 0 ? ((y26.total - y25.total) / y25.total) * 100 : 0;
            const goly26_mm  = y25.mm > 0 ? ((y26.mm - y25.mm) / y25.mm) * 100 : 0;

            return {
              name: territoryName,
              fy23: { tiv: y23.total, mm: y23.mm, ms: y23.total > 0 ? (y23.mm / y23.total) * 100 : 0 },
              fy24: { tiv: y24.total, mm: y24.mm, ms: y24.total > 0 ? (y24.mm / y24.total) * 100 : 0 },
              goly24: { tiv: goly24_tiv, mm: goly24_mm },
              fy25: { tiv: y25.total, mm: y25.mm, ms: y25.total > 0 ? (y25.mm / y25.total) * 100 : 0 },
              goly25: { tiv: goly25_tiv, mm: goly25_mm },
              fy26: { tiv: y26.total, mm: y26.mm, ms: y26.total > 0 ? (y26.mm / y26.total) * 100 : 0 },
              goly26: { tiv: goly26_tiv, mm: goly26_mm },
            };
          };

          return {
            north: getMetrics("North Kerala"),
            south: getMetrics("South Kerala"),
            total: getMetrics("Total"),
          };
        }, [allDatasetRows, selectedSegment]);

        // MONTH-ON-MONTH (MoM) PERFORMANCE SUMMARY DATA (Computed dynamically from MariaDB vahan_registrations)
        const momData = useMemo(() => {
          const resolveRowOem = (row: any) => {
            const rawOem = String(row.oemFinal || row.Maker || row.maker || "").trim().toUpperCase();
            const isMahindra = rawOem.includes("MAHINDRA") && !rawOem.includes("CHETAK");
            return { isMahindra };
          };

          const periodMonths = currentPeriod.months.map((m) => {
            const col = m.code.toUpperCase();
            const yr = m.calYear;
            return { id: m.code, label: m.mmmYy, col, yr };
          });

          const terrs: Array<"North Kerala" | "South Kerala" | "Total"> = ["North Kerala", "South Kerala", "Total"];

          const results = terrs.map((terr) => {
            let prevTiv: number | null = null;
            let prevMm: number | null = null;

            const months = periodMonths.map((m) => {
              let tiv = 0;
              let mm = 0;

              allDatasetRows.forEach((r) => {
                if (terr !== "Total" && r.territory !== terr) return;
                if (selectedSegment !== "ALL") {
                  const s = String(r.segment || r.Segment || "PV").toUpperCase().trim();
                  if (s !== selectedSegment) return;
                }
                const rowYr = Number(r.Year || r.year || r.FY || 0);
                if (rowYr !== m.yr) return;

                const colName = m.col;
                const v = colName === "DEC"
                  ? (r["DEC"] ?? r["dec_val"] ?? r["dec"] ?? 0)
                  : (r[colName] ?? r[colName.toLowerCase()] ?? 0);
                const num = Number(v) || 0;
                if (num > 0) {
                  tiv += num;
                  const { isMahindra } = resolveRowOem(r);
                  if (isMahindra) mm += num;
                }
              });

              const ms = tiv > 0 ? (mm / tiv) * 100 : 0;
              const momTiv = prevTiv !== null && prevTiv > 0 ? ((tiv - prevTiv) / prevTiv) * 100 : null;
              const momMm = prevMm !== null && prevMm > 0 ? ((mm - prevMm) / prevMm) * 100 : null;

              prevTiv = tiv;
              prevMm = mm;

              return {
                label: m.label,
                tiv,
                mm,
                ms,
                momTiv,
                momMm,
              };
            });

            return {
              name: terr,
              months,
            };
          });

          // Compute District-Wise MoM
          const allDistricts = [
            // North Kerala (7)
            { name: "Kasargod", territory: "North Kerala" },
            { name: "Kannur", territory: "North Kerala" },
            { name: "Wayanad", territory: "North Kerala" },
            { name: "Kozhikode", territory: "North Kerala" },
            { name: "Malappuram", territory: "North Kerala" },
            { name: "Palakkad", territory: "North Kerala" },
            { name: "Thrissur", territory: "North Kerala" },
            // South Kerala (7)
            { name: "Ernakulam", territory: "South Kerala" },
            { name: "Idukki", territory: "South Kerala" },
            { name: "Kottayam", territory: "South Kerala" },
            { name: "Alappuzha", territory: "South Kerala" },
            { name: "Pathanamthitta", territory: "South Kerala" },
            { name: "Kollam", territory: "South Kerala" },
            { name: "Thiruvananthapuram", territory: "South Kerala" },
          ];

          const districtResults = allDistricts.map((d) => {
            let prevTiv: number | null = null;
            let prevMm: number | null = null;

            const months = periodMonths.map((m) => {
              let tiv = 0;
              let mm = 0;

              allDatasetRows.forEach((r) => {
                const rDist = String(r.district || "").trim().toLowerCase();
                if (rDist !== d.name.toLowerCase()) return;
                if (selectedSegment !== "ALL") {
                  const s = String(r.segment || r.Segment || "PV").toUpperCase().trim();
                  if (s !== selectedSegment) return;
                }
                const rowYr = Number(r.Year || r.year || r.FY || 0);
                if (rowYr !== m.yr) return;

                const colName = m.col;
                const v = colName === "DEC"
                  ? (r["DEC"] ?? r["dec_val"] ?? r["dec"] ?? 0)
                  : (r[colName] ?? r[colName.toLowerCase()] ?? 0);
                const num = Number(v) || 0;
                if (num > 0) {
                  tiv += num;
                  const { isMahindra } = resolveRowOem(r);
                  if (isMahindra) mm += num;
                }
              });

              const ms = tiv > 0 ? (mm / tiv) * 100 : 0;
              const momTiv = prevTiv !== null && prevTiv > 0 ? ((tiv - prevTiv) / prevTiv) * 100 : null;
              const momMm = prevMm !== null && prevMm > 0 ? ((mm - prevMm) / prevMm) * 100 : null;

              prevTiv = tiv;
              prevMm = mm;

              return {
                label: m.label,
                tiv,
                mm,
                ms,
                momTiv,
                momMm,
              };
            });

            return {
              name: d.name,
              territory: d.territory,
              months,
            };
          });

          return {
            periodLabel: currentPeriod.label,
            monthsList: periodMonths.map((m) => m.label),
            north: results[0],
            south: results[1],
            total: results[2],
            districts: districtResults,
          };
        }, [allDatasetRows, selectedSegment, currentPeriod]);

                const buildMultiYearSheet = (ws: ExcelJS.Worksheet) => {
          ws.views = [{ showGridLines: true }];

          const titleRow = ws.addRow(["Territory Multi-Year Growth & Market Share Performance Summary (FY 23 - FY 26)"]);
          titleRow.font = { name: "Arial", size: 13, bold: true, color: { argb: "FF0F172A" } };
          ws.mergeCells(1, 1, 1, 19);

          const subRow = ws.addRow([
            `Generated: ${new Date().toLocaleDateString()} | Metrics: TIV, M&M Nos, Market Share (MS%), and Growth Over Last Year (GOLY%)`
          ]);
          subRow.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
          ws.mergeCells(2, 1, 2, 19);

          ws.addRow([]); // Blank

          // Row 4: Super Headers
          const r4 = ws.addRow([
            "Territory",
            "FY 23", "", "",
            "FY 24", "", "",
            "GOLY(%)", "",
            "FY 25", "", "",
            "GOLY(%)", "",
            "FY 26", "", "",
            "GOLY(%)", ""
          ]);
          r4.height = 24;

          // Row 5: Sub Headers
          const r5 = ws.addRow([
            "",
            "TIV", "M&M", "MS",
            "TIV", "M&M", "MS",
            "TIV", "M&M",
            "TIV", "M&M", "MS",
            "TIV", "M&M",
            "TIV", "M&M", "MS",
            "TIV", "M&M"
          ]);
          r5.height = 20;

          // Merge Header cells
          ws.mergeCells(4, 1, 5, 1);   // Territory
          ws.mergeCells(4, 2, 4, 4);   // FY 23
          ws.mergeCells(4, 5, 4, 7);   // FY 24
          ws.mergeCells(4, 8, 4, 9);   // GOLY FY24
          ws.mergeCells(4, 10, 4, 12); // FY 25
          ws.mergeCells(4, 13, 4, 14); // GOLY FY25
          ws.mergeCells(4, 15, 4, 17); // FY 26
          ws.mergeCells(4, 18, 4, 19); // GOLY FY26

          // Style headers: exact #0070c0 vibrant blue with bold white text
          [r4, r5].forEach((row) => {
            row.eachCell((cell) => {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0070C0" } };
              cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
              cell.alignment = { vertical: "middle", horizontal: "center" };
              cell.border = {
                top: { style: "thin", color: { argb: "FF004C82" } },
                bottom: { style: "thin", color: { argb: "FF004C82" } },
                left: { style: "thin", color: { argb: "FF004C82" } },
                right: { style: "thin", color: { argb: "FF004C82" } },
              };
            });
          });

          const appendRow = (item: typeof multiYearData.north, isTotal: boolean) => {
            const row = ws.addRow([
              item.name,
              item.fy23.tiv, item.fy23.mm, item.fy23.ms / 100,
              item.fy24.tiv, item.fy24.mm, item.fy24.ms / 100,
              item.goly24.tiv / 100, item.goly24.mm / 100,
              item.fy25.tiv, item.fy25.mm, item.fy25.ms / 100,
              item.goly25.tiv / 100, item.goly25.mm / 100,
              item.fy26.tiv, item.fy26.mm, item.fy26.ms / 100,
              item.goly26.tiv / 100, item.goly26.mm / 100,
            ]);
            row.height = 22;

            row.eachCell((cell, col) => {
              if (isTotal) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0070C0" } };
                cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
                cell.border = {
                  top: { style: "thin", color: { argb: "FF004C82" } },
                  bottom: { style: "double", color: { argb: "FF004C82" } },
                  left: { style: "thin", color: { argb: "FF004C82" } },
                  right: { style: "thin", color: { argb: "FF004C82" } },
                };
              } else {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
                cell.font = { name: "Arial", size: 9.5, bold: col === 1, color: { argb: "FF0F172A" } };
                cell.border = {
                  top: { style: "thin", color: { argb: "FFCBD5E1" } },
                  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
                  left: { style: "thin", color: { argb: "FFCBD5E1" } },
                  right: { style: "thin", color: { argb: "FFCBD5E1" } },
                };
              }

              cell.alignment = {
                vertical: "middle",
                horizontal: col === 1 ? "left" : "center",
              };

              if (col > 1) {
                if ([4, 7, 8, 9, 12, 13, 14, 17, 18, 19].includes(col)) {
                  cell.numFmt = "0.0%";
                } else {
                  cell.numFmt = "#,##0";
                }
              }
            });
          };

          appendRow(multiYearData.north, false);
          appendRow(multiYearData.south, false);
          appendRow(multiYearData.total, true);

          ws.getColumn(1).width = 16;
          for (let c = 2; c <= 19; c++) {
            ws.getColumn(c).width = 11;
          }
        };

        // Export Multi-Year Summary as Standalone Excel Workbook
        const handleExportMultiYearExcel = async () => {
          try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Vahan Kerala Live Intelligence";
            workbook.created = new Date();
            const ws = workbook.addWorksheet("FY Performance Summary");
            buildMultiYearSheet(ws);

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Kerala_Territory_MultiYear_Summary_FY23_FY26.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } catch (err: any) {
            console.error("Export multi-year Excel error:", err);
            alert(`Export Excel error: ${err.message}`);
          }
        };

        // Copy Multi-Year Summary Table as High-Resolution Retina Image to Clipboard
        const handleCopyMultiYearTableAsImage = () => {
          try {
            const canvas = document.createElement("canvas");
            const scale = 2;
            const width = 1260;
            const height = 180;
            canvas.width = width * scale;
            canvas.height = height * scale;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.scale(scale, scale);

            // Canvas Background
            ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
            ctx.fillRect(0, 0, width, height);

            const startX = 10;
            const startY = 10;
            const colWidths = [140, 58, 54, 54, 58, 54, 54, 64, 64, 58, 54, 54, 64, 64, 58, 54, 54, 64, 64];
            const colXs: number[] = [];
            let currX = startX;
            for (const w of colWidths) {
              colXs.push(currX);
              currX += w;
            }
            const totalTableWidth = currX - startX;

            const rowH1 = 28;
            const rowH2 = 24;
            const dataRowH = 28;

            // Header Row 1 & 2 Background: Exact #0070c0
            ctx.fillStyle = "#0070c0";
            ctx.fillRect(startX, startY, totalTableWidth, rowH1 + rowH2);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // Territory Cell (merged rows 1 & 2)
            ctx.fillText("Territory", colXs[0] + colWidths[0] / 2, startY + (rowH1 + rowH2) / 2);

            // Super Headers
            ctx.fillText("FY 23", colXs[1] + (58 + 54 + 54) / 2, startY + rowH1 / 2);
            ctx.fillText("FY 24", colXs[4] + (58 + 54 + 54) / 2, startY + rowH1 / 2);
            ctx.fillText("GOLY(%)", colXs[7] + (64 + 64) / 2, startY + rowH1 / 2);
            ctx.fillText("FY 25", colXs[9] + (58 + 54 + 54) / 2, startY + rowH1 / 2);
            ctx.fillText("GOLY(%)", colXs[12] + (64 + 64) / 2, startY + rowH1 / 2);
            ctx.fillText("FY 26", colXs[14] + (58 + 54 + 54) / 2, startY + rowH1 / 2);
            ctx.fillText("GOLY(%)", colXs[17] + (64 + 64) / 2, startY + rowH1 / 2);

            // Sub Headers Row 2
            const subHeaders = [
              "TIV", "M&M", "MS",
              "TIV", "M&M", "MS",
              "TIV", "M&M",
              "TIV", "M&M", "MS",
              "TIV", "M&M",
              "TIV", "M&M", "MS",
              "TIV", "M&M"
            ];
            ctx.font = "bold 10px system-ui, sans-serif";
            for (let i = 0; i < subHeaders.length; i++) {
              const cIdx = i + 1;
              ctx.fillText(subHeaders[i], colXs[cIdx] + colWidths[cIdx] / 2, startY + rowH1 + rowH2 / 2);
            }

            // Draw Data Rows: North Kerala, South Kerala, Total
            const items = [
              { data: multiYearData.north, isTotal: false },
              { data: multiYearData.south, isTotal: false },
              { data: multiYearData.total, isTotal: true },
            ];

            let rowY = startY + rowH1 + rowH2;
            items.forEach((item) => {
              const d = item.data;
              ctx.fillStyle = item.isTotal ? "#0070c0" : isDark ? "#1e293b" : "#ffffff";
              ctx.fillRect(startX, rowY, totalTableWidth, dataRowH);

              ctx.fillStyle = item.isTotal ? "#ffffff" : isDark ? "#f1f5f9" : "#0f172a";
              ctx.font = item.isTotal ? "bold 11px system-ui, sans-serif" : "bold 10.5px system-ui, sans-serif";

              // Territory Name
              ctx.textAlign = "left";
              ctx.fillText(d.name, colXs[0] + 8, rowY + dataRowH / 2);

              // Row metrics
              ctx.textAlign = "center";
              ctx.font = item.isTotal ? "bold 10.5px tabular-nums, sans-serif" : "normal 10px tabular-nums, sans-serif";

              const fmtG = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

              const rowVals = [
                d.fy23.tiv.toLocaleString(), d.fy23.mm.toLocaleString(), `${d.fy23.ms.toFixed(1)}%`,
                d.fy24.tiv.toLocaleString(), d.fy24.mm.toLocaleString(), `${d.fy24.ms.toFixed(1)}%`,
                fmtG(d.goly24.tiv), fmtG(d.goly24.mm),
                d.fy25.tiv.toLocaleString(), d.fy25.mm.toLocaleString(), `${d.fy25.ms.toFixed(1)}%`,
                fmtG(d.goly25.tiv), fmtG(d.goly25.mm),
                d.fy26.tiv.toLocaleString(), d.fy26.mm.toLocaleString(), `${d.fy26.ms.toFixed(1)}%`,
                fmtG(d.goly26.tiv), fmtG(d.goly26.mm),
              ];

              for (let i = 0; i < rowVals.length; i++) {
                const cIdx = i + 1;
                ctx.fillText(rowVals[i], colXs[cIdx] + colWidths[cIdx] / 2, rowY + dataRowH / 2);
              }

              rowY += dataRowH;
            });

            // Grid Lines in #005a9e
            ctx.strokeStyle = "#005a9e";
            ctx.lineWidth = 1;
            ctx.strokeRect(startX, startY, totalTableWidth, rowH1 + rowH2 + dataRowH * 3);

            ctx.beginPath();
            ctx.moveTo(colXs[1], startY + rowH1);
            ctx.lineTo(startX + totalTableWidth, startY + rowH1);

            ctx.moveTo(startX, startY + rowH1 + rowH2);
            ctx.lineTo(startX + totalTableWidth, startY + rowH1 + rowH2);

            ctx.moveTo(startX, startY + rowH1 + rowH2 + dataRowH);
            ctx.lineTo(startX + totalTableWidth, startY + rowH1 + rowH2 + dataRowH);

            ctx.moveTo(startX, startY + rowH1 + rowH2 + dataRowH * 2);
            ctx.lineTo(startX + totalTableWidth, startY + rowH1 + rowH2 + dataRowH * 2);
            ctx.stroke();

            // Vertical lines
            ctx.beginPath();
            for (let i = 1; i < colXs.length; i++) {
              ctx.moveTo(colXs[i], startY + (i === 1 ? 0 : rowH1));
              ctx.lineTo(colXs[i], startY + rowH1 + rowH2 + dataRowH * 3);
            }
            // Super header dividing lines
            [colXs[4], colXs[7], colXs[9], colXs[12], colXs[14], colXs[17]].forEach((xPos) => {
              ctx.moveTo(xPos, startY);
              ctx.lineTo(xPos, startY + rowH1);
            });
            ctx.stroke();

            // Copy to Clipboard
            canvas.toBlob(async (blob) => {
              if (!blob) return;
              try {
                if (navigator.clipboard && window.ClipboardItem) {
                  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                  setCopyStatus((prev) => ({ ...prev, multiyear: "✓ Copied!" }));
                  setTimeout(() => setCopyStatus((prev) => ({ ...prev, multiyear: "" })), 2500);
                  return;
                }
              } catch (clipErr) {
                console.warn("ClipboardItem write warning:", clipErr);
              }
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `Kerala_Territory_MultiYear_Summary_FY23_FY26.png`;
              a.click();
              setCopyStatus((prev) => ({ ...prev, multiyear: "✓ Saved PNG!" }));
              setTimeout(() => setCopyStatus((prev) => ({ ...prev, multiyear: "" })), 2500);
            }, "image/png", 1.0);
          } catch (err: any) {
            console.error("Copy multi-year image error:", err);
            alert(`Copy Image error: ${err.message}`);
          }
        };

        // Helper to render Multi-Year Data Row with Stylish Executive Look & Badges
        const renderMultiYearDataRow = (rowItem: typeof multiYearData.north, isTotal: boolean) => {
          const gridBrd = isTotal ? "border-[#005a9e]" : isDark ? "border-slate-700/80" : "border-slate-200";

          const renderMsBadge = (ms: number) => {
            if (isTotal) {
              return (
                <span className="inline-block px-2 py-0.5 rounded-[2px] font-black text-xs bg-white text-[#0070c0] shadow-xs">
                  {ms.toFixed(1)}%
                </span>
              );
            }
            const badgeCls = ms >= 7
              ? isDark ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50" : "bg-emerald-50 text-emerald-800 border border-emerald-300"
              : ms >= 4
              ? isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50" : "bg-cyan-50 text-cyan-800 border border-cyan-300"
              : isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-slate-100 text-slate-700 border border-slate-300";

            return (
              <span className={`inline-block px-1.5 py-0.5 rounded-[2px] font-bold text-[11px] tabular-nums ${badgeCls}`}>
                {ms.toFixed(1)}%
              </span>
            );
          };

          const renderGolyBadge = (val: number) => {
            if (isNaN(val) || !isFinite(val)) return <span className="text-slate-400 font-bold">0.0%</span>;
            const isPos = val >= 0;
            const text = `${isPos ? "+" : ""}${val.toFixed(1)}%`;

            if (isTotal) {
              return (
                <span className="inline-block px-1.5 py-0.5 rounded-[2px] font-bold text-[11px] bg-white/20 text-white border border-white/30 tabular-nums">
                  {text}
                </span>
              );
            }

            const badgeCls = isPos
              ? isDark ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40" : "bg-emerald-50 text-emerald-700 border border-emerald-300"
              : isDark ? "bg-rose-500/15 text-rose-300 border border-rose-500/40" : "bg-rose-50 text-rose-700 border border-rose-300";

            return (
              <span className={`inline-block px-1.5 py-0.5 rounded-[2px] font-bold text-[10.5px] tabular-nums ${badgeCls}`}>
                {text}
              </span>
            );
          };

          return (
            <tr
              key={rowItem.name}
              className={`transition-colors ${
                isTotal
                  ? "bg-[#0070c0] text-white font-extrabold shadow-inner"
                  : isDark
                  ? "bg-[#1e293b] hover:bg-[#27354f] text-slate-100"
                  : "bg-white hover:bg-slate-50/80 text-slate-800"
              }`}
            >
              {/* Territory Column */}
              <td className={`border px-3 py-2 text-left font-bold whitespace-nowrap text-xs ${gridBrd} ${
                isTotal ? "bg-[#0070c0] text-white font-black" : isDark ? "bg-slate-900/40" : "bg-slate-50/70"
              }`}>
                <div className="flex items-center gap-2">
                  {!isTotal ? (
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ${
                      rowItem.name === "North Kerala" ? "bg-teal-400 ring-teal-400/30" : "bg-indigo-400 ring-indigo-400/30"
                    }`} />
                  ) : (
                    <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  )}
                  <span className={isTotal ? "font-black tracking-wide text-white uppercase text-xs" : "font-bold"}>
                    {rowItem.name}
                  </span>
                </div>
              </td>

              {/* FY 23 */}
              <td className={`border px-2 py-1.5 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                isTotal ? "text-white" : "text-sky-500 dark:text-sky-400"
              }`}>
                {rowItem.fy23.tiv.toLocaleString()}
              </td>
              <td className={`border px-2 py-1.5 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                isTotal ? "text-white" : "text-rose-500 dark:text-rose-400"
              }`}>
                {rowItem.fy23.mm.toLocaleString()}
              </td>
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderMsBadge(rowItem.fy23.ms)}
              </td>

              {/* FY 24 */}
              <td className={`border px-2 py-1.5 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                isTotal ? "text-white" : "text-sky-500 dark:text-sky-400"
              }`}>
                {rowItem.fy24.tiv.toLocaleString()}
              </td>
              <td className={`border px-2 py-1.5 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                isTotal ? "text-white" : "text-rose-500 dark:text-rose-400"
              }`}>
                {rowItem.fy24.mm.toLocaleString()}
              </td>
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderMsBadge(rowItem.fy24.ms)}
              </td>

              {/* GOLY FY24 */}
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderGolyBadge(rowItem.goly24.tiv)}
              </td>
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderGolyBadge(rowItem.goly24.mm)}
              </td>

              {/* FY 25 */}
              <td className={`border px-2 py-1.5 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                isTotal ? "text-white" : "text-sky-500 dark:text-sky-400"
              }`}>
                {rowItem.fy25.tiv.toLocaleString()}
              </td>
              <td className={`border px-2 py-1.5 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                isTotal ? "text-white" : "text-rose-500 dark:text-rose-400"
              }`}>
                {rowItem.fy25.mm.toLocaleString()}
              </td>
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderMsBadge(rowItem.fy25.ms)}
              </td>

              {/* GOLY FY25 */}
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderGolyBadge(rowItem.goly25.tiv)}
              </td>
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderGolyBadge(rowItem.goly25.mm)}
              </td>

              {/* FY 26 */}
              <td className={`border px-2 py-1.5 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                isTotal ? "text-white" : "text-sky-500 dark:text-sky-400"
              }`}>
                {rowItem.fy26.tiv.toLocaleString()}
              </td>
              <td className={`border px-2 py-1.5 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                isTotal ? "text-white" : "text-rose-500 dark:text-rose-400"
              }`}>
                {rowItem.fy26.mm.toLocaleString()}
              </td>
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderMsBadge(rowItem.fy26.ms)}
              </td>

              {/* GOLY FY26 */}
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderGolyBadge(rowItem.goly26.tiv)}
              </td>
              <td className={`border px-1.5 py-1.5 text-center ${gridBrd}`}>
                {renderGolyBadge(rowItem.goly26.mm)}
              </td>
            </tr>
          );
        };

        // Export MoM Summary as Excel Workbook
        const handleExportMomExcel = async () => {
          try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Vahan Kerala Live Intelligence";
            workbook.created = new Date();
            const ws = workbook.addWorksheet("Month on Month Summary", { views: [{ showGridLines: true }] });

            const title = ws.addRow([`Kerala Month-on-Month (MoM) Registration & Market Share Performance Summary (${momData.periodLabel})`]);
            title.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F172A" } };

            const sub = ws.addRow([`Segment: ${selectedSegment} | Generated: ${new Date().toLocaleDateString()} | Metrics: TIV, M&M Nos, Market Share (MS%), MoM Growth (%)`]);
            sub.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
            ws.addRow([]); // Blank

            // Row 4: Super Headers (Territory + 12 Months)
            const r4Vals = ["Territory"];
            momData.monthsList.forEach((m) => {
              r4Vals.push(m, "", "", "", "");
            });
            const r4 = ws.addRow(r4Vals);
            r4.height = 24;

            // Row 5: Sub Headers
            const r5Vals = [""];
            momData.monthsList.forEach(() => {
              r5Vals.push("TIV", "M&M", "MS%", "MoM TIV", "MoM M&M");
            });
            const r5 = ws.addRow(r5Vals);
            r5.height = 20;

            ws.mergeCells(4, 1, 5, 1);
            let cIdx = 2;
            momData.monthsList.forEach(() => {
              ws.mergeCells(4, cIdx, 4, cIdx + 4);
              cIdx += 5;
            });

            [r4, r5].forEach((row) => {
              row.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0070C0" } };
                cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.border = {
                  top: { style: "thin", color: { argb: "FF004C82" } },
                  bottom: { style: "thin", color: { argb: "FF004C82" } },
                  left: { style: "thin", color: { argb: "FF004C82" } },
                  right: { style: "thin", color: { argb: "FF004C82" } },
                };
              });
            });

            const appendMomRow = (item: { name: string; months: typeof momData.north.months; territory?: string }, isTotal: boolean, isDistrict: boolean = false) => {
              const rowVals: any[] = [isDistrict ? `   ${item.name}` : item.name];
              item.months.forEach((m) => {
                rowVals.push(
                  m.tiv,
                  m.mm,
                  m.ms / 100,
                  m.momTiv !== null ? m.momTiv / 100 : "-",
                  m.momMm !== null ? m.momMm / 100 : "-"
                );
              });
              const row = ws.addRow(rowVals);
              row.height = isDistrict ? 19 : 22;

              row.eachCell((cell, col) => {
                if (isTotal) {
                  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0070C0" } };
                  cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
                  cell.border = {
                    top: { style: "thin", color: { argb: "FF004C82" } },
                    bottom: { style: "double", color: { argb: "FF004C82" } },
                    left: { style: "thin", color: { argb: "FF004C82" } },
                    right: { style: "thin", color: { argb: "FF004C82" } },
                  };
                } else if (isDistrict) {
                  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
                  cell.font = { name: "Arial", size: 8.5, bold: col === 1, color: { argb: "FF334155" } };
                  cell.border = {
                    top: { style: "thin", color: { argb: "FFE2E8F0" } },
                    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                    left: { style: "thin", color: { argb: "FFE2E8F0" } },
                    right: { style: "thin", color: { argb: "FFE2E8F0" } },
                  };
                } else {
                  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
                  cell.font = { name: "Arial", size: 9, bold: col === 1, color: { argb: "FF0F172A" } };
                  cell.border = {
                    top: { style: "thin", color: { argb: "FFCBD5E1" } },
                    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
                    left: { style: "thin", color: { argb: "FFCBD5E1" } },
                    right: { style: "thin", color: { argb: "FFCBD5E1" } },
                  };
                }
                cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "center" };

                if (col > 1) {
                  const rem = (col - 2) % 5;
                  if (rem === 0 || rem === 1) cell.numFmt = "#,##0";
                  else cell.numFmt = "0.0%";
                }
              });
            };

            appendMomRow(momData.north, false);
            momData.districts.filter(d => d.territory === "North Kerala").forEach(d => appendMomRow(d, false, true));
            appendMomRow(momData.south, false);
            momData.districts.filter(d => d.territory === "South Kerala").forEach(d => appendMomRow(d, false, true));
            appendMomRow(momData.total, true);

            ws.getColumn(1).width = 16;
            for (let c = 2; c <= r4Vals.length; c++) {
              ws.getColumn(c).width = 10;
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Kerala_Month_on_Month_Summary_${momData.periodLabel.replace(/\s+/g, "_")}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } catch (err: any) {
            alert(`Export MoM Excel error: ${err.message}`);
          }
        };

        // Styled Excel Export matching the table UI, colors, merged cells, and borders
        const handleExportStyledExcel = async (exportTarget: "North Kerala" | "South Kerala" | "ALL") => {
          try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Vahan Kerala Live Intelligence";
            workbook.created = new Date();

            const buildSheet = (
              sheetName: string,
              territoryName: "North Kerala" | "South Kerala",
              tRows: typeof combatTableRows,
              tTotals: ReturnType<typeof calcTotals>
            ) => {
              const ws = workbook.addWorksheet(sheetName, {
                views: [{ showGridLines: true }]
              });

              const isN = territoryName === "North Kerala";
              const groups = groupRowsByDistrict(tRows, isN);

              // 1. Title Banner
              const titleRow = ws.addRow([`${territoryName} Registration Summary Table`]);
              titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } };
              ws.mergeCells(1, 1, 1, 5);

              // 2. Subtitle Banner
              const subRow = ws.addRow([
                `Period: ${currentPeriod.label} (${currentPeriod.subLabel}) | Segment: ${selectedSegment} | Total RTOs: ${tTotals.count} | Generated: ${new Date().toLocaleDateString()}`
              ]);
              subRow.font = { name: "Arial", size: 9.5, italic: true, color: { argb: "FF64748B" } };
              ws.mergeCells(2, 1, 2, 5);

              ws.addRow([]); // Blank Row

              // 3. Table Column Header Row
              const headerRow = ws.addRow(["District", "RTO Name", "Total Reg.", "M&M Nos", "M&M MS"]);
              headerRow.height = 24;
              headerRow.eachCell((cell, colNumber) => {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FF1E293B" } // Slate Navy
                };
                cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
                cell.alignment = {
                  vertical: "middle",
                  horizontal: colNumber <= 2 ? "left" : "center",
                  indent: colNumber <= 2 ? 1 : 0
                };
                cell.border = {
                  top: { style: "medium", color: { argb: "FF0F172A" } },
                  bottom: { style: "medium", color: { argb: "FF0F172A" } },
                  left: { style: "thin", color: { argb: "FF334155" } },
                  right: { style: "thin", color: { argb: "FF334155" } }
                };
              });

              const thinBorder = {
                top: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
                bottom: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
                left: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
                right: { style: "thin" as const, color: { argb: "FFCBD5E1" } }
              };

              const districtFill = isN ? "FFF0FDFA" : "FFEEF2FF";
              const districtColor = isN ? "FF0F766E" : "FF4338CA";

              // 4. District Groups & RTO Rows
              groups.forEach((g) => {
                const displayDist = formatDistrictDisplayName(g.district);
                const startRowIdx = ws.rowCount + 1;

                g.rtos.forEach((r, rIdx) => {
                  const row = ws.addRow([
                    rIdx === 0 ? displayDist : "",
                    r.rtoName,
                    r.total,
                    r.mm,
                    r.total > 0 ? (r.mm / r.total) : 0
                  ]);
                  row.height = 20;

                  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.border = thinBorder;
                    cell.alignment = {
                      vertical: "middle",
                      horizontal: colNumber === 1 || colNumber === 2 ? "left" : "center",
                      indent: colNumber <= 2 ? 1 : 0
                    };
                    cell.font = { name: "Arial", size: 9.5 };

                    if (colNumber === 3) {
                      cell.numFmt = "#,##0";
                      cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF0284C7" } };
                    } else if (colNumber === 4) {
                      cell.numFmt = "#,##0";
                      cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFE11D48" } };
                    } else if (colNumber === 5) {
                      cell.numFmt = "0.0%";
                      const msVal = r.ms;
                      if (msVal >= 15) {
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
                        cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF065F46" } };
                      } else if (msVal >= 10) {
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCFFAFE" } };
                        cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF155E75" } };
                      }
                    }
                  });
                });

                const endRowIdx = ws.rowCount;

                // Merge District Cell Vertically
                if (endRowIdx >= startRowIdx) {
                  ws.mergeCells(startRowIdx, 1, endRowIdx, 1);
                  const mergedCell = ws.getCell(startRowIdx, 1);
                  mergedCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: districtFill } };
                  mergedCell.font = { name: "Arial", size: 10, bold: true, color: { argb: districtColor } };
                  mergedCell.alignment = { vertical: "middle", horizontal: "center" };
                }

                // Subtotal Row: [District] Total
                const subtotalRow = ws.addRow([
                  `${displayDist} Total`,
                  "",
                  g.districtTotal.total,
                  g.districtTotal.mm,
                  g.districtTotal.total > 0 ? (g.districtTotal.mm / g.districtTotal.total) : 0
                ]);
                const subtotalIdx = ws.rowCount;
                subtotalRow.height = 21;
                ws.mergeCells(subtotalIdx, 1, subtotalIdx, 2);

                subtotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
                  cell.border = {
                    top: { style: "thin", color: { argb: "FF94A3B8" } },
                    bottom: { style: "thin", color: { argb: "FF94A3B8" } },
                    left: thinBorder.left,
                    right: thinBorder.right
                  };
                  cell.alignment = {
                    vertical: "middle",
                    horizontal: colNumber === 1 ? "left" : "center",
                    indent: colNumber === 1 ? 1 : 0
                  };

                  if (colNumber === 1) {
                    cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
                  } else if (colNumber === 3) {
                    cell.numFmt = "#,##0";
                    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0284C7" } };
                  } else if (colNumber === 4) {
                    cell.numFmt = "#,##0";
                    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFE11D48" } };
                  } else if (colNumber === 5) {
                    cell.numFmt = "0.0%";
                    const msVal = g.districtTotal.ms;
                    if (msVal >= 15) {
                      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA7F3D0" } };
                      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF064E3B" } };
                    } else {
                      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBAE6FD" } };
                      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0369A1" } };
                    }
                  }
                });
              });

              // Territory Total Footer Row
              const footerRow = ws.addRow([
                `${territoryName} Total`,
                "",
                tTotals.total,
                tTotals.mm,
                tTotals.total > 0 ? (tTotals.mm / tTotals.total) : 0
              ]);
              const footerIdx = ws.rowCount;
              footerRow.height = 25;
              ws.mergeCells(footerIdx, 1, footerIdx, 2);

              footerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
                cell.border = {
                  top: { style: "medium", color: { argb: "FF0284C7" } },
                  bottom: { style: "double", color: { argb: "FF0284C7" } },
                  left: { style: "thin", color: { argb: "FF334155" } },
                  right: { style: "thin", color: { argb: "FF334155" } }
                };
                cell.alignment = {
                  vertical: "middle",
                  horizontal: colNumber === 1 ? "left" : "center",
                  indent: colNumber === 1 ? 1 : 0
                };

                if (colNumber === 1) {
                  cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
                } else if (colNumber === 3) {
                  cell.numFmt = "#,##0";
                  cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF38BDF8" } };
                } else if (colNumber === 4) {
                  cell.numFmt = "#,##0";
                  cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFB7185" } };
                } else if (colNumber === 5) {
                  cell.numFmt = "0.0%";
                  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
                  cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
                }
              });

              ws.columns = [
                { width: 18 },
                { width: 24 },
                { width: 15 },
                { width: 14 },
                { width: 14 }
              ];
            };

            if (exportTarget === "ALL") {
              const wsSummary = workbook.addWorksheet("FY Performance Summary");
              buildMultiYearSheet(wsSummary);
            }
            if (exportTarget === "North Kerala" || exportTarget === "ALL") {
              buildSheet("North Kerala", "North Kerala", northRows, northTotals);
            }
            if (exportTarget === "South Kerala" || exportTarget === "ALL") {
              buildSheet("South Kerala", "South Kerala", southRows, southTotals);
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const fileName = exportTarget === "ALL"
              ? `Kerala_Registration_Summary_${currentPeriod.id}_${selectedSegment}.xlsx`
              : `${exportTarget.replace(/\s+/g, "_")}_Registration_Summary_${currentPeriod.id}.xlsx`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } catch (err: any) {
            console.error("Export styled Excel failed:", err);
            alert(`Excel Export error: ${err.message}`);
          }
        };

        // Copy Table as High-Resolution Retina Image to Clipboard
        const handleCopyTableAsImage = async (territory: "North Kerala" | "South Kerala") => {
          try {
            const isN = territory === "North Kerala";
            const tRows = isN ? northRows : southRows;
            const tTotals = isN ? northTotals : southTotals;
            const groups = groupRowsByDistrict(tRows, isN);

            const scale = 2;
            const width = 640;

            let rowCount = 0;
            groups.forEach((g) => {
              rowCount += g.rtos.length + 1;
            });
            const headerHeight = 52;
            const colHeaderHeight = 30;
            const rowHeight = 25;
            const footerHeight = 36;
            const totalHeight = headerHeight + colHeaderHeight + (rowCount * rowHeight) + footerHeight + 16;

            const canvas = document.createElement("canvas");
            canvas.width = width * scale;
            canvas.height = totalHeight * scale;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.scale(scale, scale);

            // Canvas Background
            ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
            ctx.fillRect(0, 0, width, totalHeight);

            // Card Outer Background
            ctx.fillStyle = isDark ? "#1e293b" : "#ffffff";
            ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(8, 8, width - 16, totalHeight - 16, 4);
            ctx.fill();
            ctx.stroke();

            // Top Title Bar Gradient
            const titleGrad = ctx.createLinearGradient(8, 8, width - 16, 48);
            if (isN) {
              titleGrad.addColorStop(0, "#0d9488");
              titleGrad.addColorStop(1, "#0891b2");
            } else {
              titleGrad.addColorStop(0, "#4f46e5");
              titleGrad.addColorStop(1, "#7c3aed");
            }
            ctx.fillStyle = titleGrad;
            ctx.beginPath();
            ctx.roundRect(8, 8, width - 16, 42, [4, 4, 0, 0]);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
            ctx.fillText(`${territory} Registration Summary`, 20, 34);

            ctx.font = "normal 10px system-ui, sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            const metaStr = `${groups.length} Districts • ${tTotals.count} RTOs • ${currentPeriod.label}`;
            ctx.textAlign = "right";
            ctx.fillText(metaStr, width - 20, 34);

            const cols = [
              { name: "District", x: 8, w: 130, align: "left" },
              { name: "RTO Name", x: 138, w: 200, align: "left" },
              { name: "Total Reg.", x: 338, w: 100, align: "center" },
              { name: "M&M Nos", x: 438, w: 94, align: "center" },
              { name: "M&M MS", x: 532, w: 100, align: "center" },
            ];

            let curY = 50;

            // Column Header Row
            ctx.fillStyle = isDark ? "#141f33" : "#f1f5f9";
            ctx.fillRect(8, curY, width - 16, colHeaderHeight);
            ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
            ctx.strokeRect(8, curY, width - 16, colHeaderHeight);

            ctx.font = "bold 10px system-ui, sans-serif";
            ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
            cols.forEach((col) => {
              const textX = col.align === "left" ? col.x + 10 : col.x + col.w / 2;
              ctx.textAlign = col.align as CanvasTextAlign;
              ctx.fillText(col.name, textX, curY + 19);
            });

            curY += colHeaderHeight;

            // Render Rows
            groups.forEach((g) => {
              const displayDist = formatDistrictDisplayName(g.district);
              const distStartY = curY;
              const distHeight = g.rtos.length * rowHeight;

              g.rtos.forEach((r, idx) => {
                const rowY = curY;
                ctx.fillStyle = idx % 2 === 0
                  ? (isDark ? "#1e293b" : "#ffffff")
                  : (isDark ? "#182438" : "#f8fafc");
                ctx.fillRect(cols[1].x, rowY, width - 16 - cols[0].w, rowHeight);

                ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0";
                ctx.strokeRect(cols[1].x, rowY, cols[1].w, rowHeight);
                ctx.strokeRect(cols[2].x, rowY, cols[2].w, rowHeight);
                ctx.strokeRect(cols[3].x, rowY, cols[3].w, rowHeight);
                ctx.strokeRect(cols[4].x, rowY, cols[4].w, rowHeight);

                ctx.textAlign = "left";
                ctx.font = "normal 10px system-ui, sans-serif";
                ctx.fillStyle = isDark ? "#e2e8f0" : "#1e293b";
                ctx.fillText(r.rtoName, cols[1].x + 8, rowY + 16);

                ctx.textAlign = "center";
                ctx.font = "bold 10px tabular-nums, sans-serif";
                ctx.fillStyle = "#38bdf8";
                ctx.fillText(r.total.toLocaleString(), cols[2].x + cols[2].w / 2, rowY + 16);

                ctx.fillStyle = "#fb7185";
                ctx.fillText(r.mm.toLocaleString(), cols[3].x + cols[3].w / 2, rowY + 16);

                const msColor = r.ms >= 15 ? "#10b981" : r.ms >= 10 ? "#06b6d4" : "#64748b";
                ctx.fillStyle = msColor;
                ctx.font = "bold 9.5px tabular-nums, sans-serif";
                ctx.fillText(`${r.ms.toFixed(1)}%`, cols[4].x + cols[4].w / 2, rowY + 16);

                curY += rowHeight;
              });

              // Merged District Block
              ctx.fillStyle = isDark ? "#152238" : (isN ? "#f0fdfa" : "#eef2ff");
              ctx.fillRect(cols[0].x, distStartY, cols[0].w, distHeight);
              ctx.strokeStyle = isDark ? "#334155" : (isN ? "#99f6e4" : "#c7d2fe");
              ctx.strokeRect(cols[0].x, distStartY, cols[0].w, distHeight);

              ctx.textAlign = "center";
              ctx.fillStyle = isDark ? "#38bdf8" : (isN ? "#0f766e" : "#4338ca");
              ctx.font = "bold 11px system-ui, sans-serif";
              ctx.fillText(displayDist, cols[0].x + cols[0].w / 2, distStartY + distHeight / 2 - 4);

              ctx.font = "normal 9px system-ui, sans-serif";
              ctx.fillStyle = "#94a3b8";
              ctx.fillText(`(${g.rtos.length} RTOs)`, cols[0].x + cols[0].w / 2, distStartY + distHeight / 2 + 10);

              // District Subtotal Row
              const subY = curY;
              ctx.fillStyle = isDark ? "#18263e" : "#f1f5f9";
              ctx.fillRect(8, subY, width - 16, rowHeight);
              ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
              ctx.strokeRect(8, subY, width - 16, rowHeight);

              ctx.textAlign = "left";
              ctx.font = "bold 10px system-ui, sans-serif";
              ctx.fillStyle = isDark ? "#cbd5e1" : "#1e293b";
              ctx.fillText(`${displayDist} Total`, 16, subY + 16);

              ctx.textAlign = "center";
              ctx.fillStyle = "#38bdf8";
              ctx.fillText(g.districtTotal.total.toLocaleString(), cols[2].x + cols[2].w / 2, subY + 16);

              ctx.fillStyle = "#fb7185";
              ctx.fillText(g.districtTotal.mm.toLocaleString(), cols[3].x + cols[3].w / 2, subY + 16);

              ctx.fillStyle = g.districtTotal.ms >= 15 ? "#10b981" : "#06b6d4";
              ctx.fillText(`${g.districtTotal.ms.toFixed(1)}%`, cols[4].x + cols[4].w / 2, subY + 16);

              curY += rowHeight;
            });

            // Territory Total Footer
            const footY = curY;
            ctx.fillStyle = isDark ? "#0f172a" : "#1e293b";
            ctx.fillRect(8, footY, width - 16, footerHeight);
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(8, footY, width - 16, footerHeight);

            ctx.textAlign = "left";
            ctx.font = "bold 11.5px system-ui, sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(`${territory} Total`, 18, footY + 22);

            ctx.textAlign = "center";
            ctx.font = "bold 12px tabular-nums, sans-serif";
            ctx.fillStyle = "#38bdf8";
            ctx.fillText(tTotals.total.toLocaleString(), cols[2].x + cols[2].w / 2, footY + 22);

            ctx.fillStyle = "#fb7185";
            ctx.fillText(tTotals.mm.toLocaleString(), cols[3].x + cols[3].w / 2, footY + 22);

            ctx.fillStyle = "#34d399";
            ctx.fillText(`${tTotals.ms.toFixed(2)}%`, cols[4].x + cols[4].w / 2, footY + 22);

            // Copy to Clipboard
            canvas.toBlob(async (blob) => {
              if (!blob) return;
              try {
                if (navigator.clipboard && window.ClipboardItem) {
                  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                  setCopyStatus((prev) => ({ ...prev, [territory]: "✓ Copied!" }));
                  setTimeout(() => setCopyStatus((prev) => ({ ...prev, [territory]: "" })), 2500);
                  return;
                }
              } catch (clipErr) {
                console.warn("ClipboardItem write warning, downloading file:", clipErr);
              }
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${territory.replace(/\s+/g, "_")}_Registration_Summary.png`;
              a.click();
              setCopyStatus((prev) => ({ ...prev, [territory]: "✓ Saved PNG!" }));
              setTimeout(() => setCopyStatus((prev) => ({ ...prev, [territory]: "" })), 2500);
            }, "image/png", 1.0);
          } catch (err: any) {
            console.error("Copy image error:", err);
            alert(`Copy Image error: ${err.message}`);
          }
        };

        const renderTable = (
          rows: typeof combatTableRows,
          totals: ReturnType<typeof calcTotals>,
          territory: "North Kerala" | "South Kerala"
        ) => {
          const isNorth = territory === "North Kerala";
          const isFocused = focusedTable === territory;

          // If another table is in focus mode, hide this one
          if (focusedTable !== null && !isFocused) return null;

          const accentDark = isNorth ? "text-teal-300" : "text-indigo-300";
          const accentLight = isNorth ? "text-teal-700" : "text-indigo-700";
          const dotColor = isNorth ? "bg-teal-400" : "bg-indigo-400";
          const headerGrad = isNorth
            ? "from-teal-500 to-cyan-600"
            : "from-indigo-500 to-violet-600";
          const badgeDark = isNorth
            ? "bg-teal-500/15 border-teal-500/60 text-teal-300"
            : "bg-indigo-500/15 border-indigo-500/60 text-indigo-300";
          const badgeLight = isNorth
            ? "bg-teal-50 border-teal-300 text-teal-800"
            : "bg-indigo-50 border-indigo-300 text-indigo-800";

          const districtGroups = groupRowsByDistrict(rows, isNorth);
          const gridBorder = isDark ? "border-slate-700/80" : "border-slate-200";
          const allExpanded = districtGroups.length > 0 && districtGroups.every((g) => !!expandedDistricts[g.district]);

          return (
            <div className={`rounded-[2px] border transition-all duration-300 shadow-md flex flex-col overflow-hidden ${
              isFocused
                ? `fixed inset-2 sm:inset-4 z-50 shadow-2xl ${
                    isDark ? "bg-[#0f172a] border-slate-600 text-slate-100" : "bg-white border-slate-300 text-slate-800"
                  }`
                : `flex-1 min-w-[420px] ${
                    isDark ? "bg-[#1e293b] border-slate-700/80 text-slate-100" : "bg-white border-slate-200 text-slate-800"
                  }`
            }`}>
              {/* Table Header HUD: Heading Individually on Top (Above), Action Options Below */}
              <div className={`flex flex-col gap-2 border-b ${
                isFocused ? "px-4 py-3" : "px-3 py-2.5"
              } ${isDark ? "border-slate-700/80 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
                {/* 1. Heading Row (Individual Row Above) */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-[2px] bg-gradient-to-br ${headerGrad} text-white shadow-xs shrink-0 ${
                      isFocused ? "p-1.5" : "p-1"
                    }`}>
                      <Table className={isFocused ? "w-4 h-4" : "w-3.5 h-3.5"} />
                    </div>
                    <span className={`font-bold tracking-wide whitespace-nowrap ${
                      isFocused ? "text-sm sm:text-base font-extrabold" : "text-xs sm:text-sm font-bold"
                    }`}>
                      {territory} Registration Summary
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`rounded-[2px] font-semibold border ${
                      isFocused ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
                    } ${isDark ? badgeDark : badgeLight}`}>
                      {districtGroups.length} Districts ({totals.count} RTOs)
                    </span>
                    <span className={`rounded-[2px] font-semibold border ${
                      isFocused ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
                    } ${isDark ? "bg-sky-500/15 border-sky-500/60 text-sky-300" : "bg-sky-50 border-sky-200 text-sky-800"}`}>
                      {timeframeLabel}
                    </span>
                  </div>
                </div>

                {/* 2. Action Options Row (Below the Heading): Expand/Collapse All + Copy Image + Export Excel + Focus Mode */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/80 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleAllDistrictsInTerritory(districtGroups.map((g) => g.district), !allExpanded)}
                    title={allExpanded ? "Collapse All Districts in table" : "Expand All Districts in table"}
                    className={`flex items-center gap-1 rounded-[2px] font-semibold border transition-all shadow-xs ${
                      isFocused ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
                    } ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {allExpanded ? (
                      <>
                        <Minus className="w-2.5 h-2.5 text-amber-400 stroke-[2.5]" />
                        <span>Collapse All</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-2.5 h-2.5 text-sky-400 stroke-[2.5]" />
                        <span>Expand All</span>
                      </>
                    )}
                  </button>

                  {/* Copy Table as Image */}
                  <button
                    type="button"
                    onClick={() => handleCopyTableAsImage(territory)}
                    title={`Copy ${territory} table as high-resolution image to clipboard`}
                    className={`flex items-center gap-1 rounded-[2px] font-semibold border transition-all shadow-xs ${
                      isFocused ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
                    } ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-sky-300 hover:text-white hover:bg-slate-700"
                        : "bg-white border-slate-200 text-sky-700 hover:bg-sky-50"
                    }`}
                  >
                    <Camera className={isFocused ? "w-3.5 h-3.5 text-sky-400" : "w-3 h-3 text-sky-500"} />
                    <span>{copyStatus[territory] || "Copy Image"}</span>
                  </button>

                  {/* Export Styled Excel */}
                  <button
                    type="button"
                    onClick={() => handleExportStyledExcel(territory)}
                    title={`Export ${territory} to formatted Excel with exact UI colors`}
                    className={`flex items-center gap-1 rounded-[2px] font-semibold border transition-all shadow-xs ${
                      isFocused ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
                    } ${
                      isDark
                        ? "bg-emerald-950/60 border-emerald-600/70 text-emerald-300 hover:bg-emerald-900/80"
                        : "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                    }`}
                  >
                    <Download className={isFocused ? "w-3.5 h-3.5" : "w-3 h-3"} />
                    <span>Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFocusedTable(isFocused ? null : territory)}
                    title={isFocused ? "Exit Focus Mode (Esc)" : "Focus Mode (Full Screen)"}
                    className={`flex items-center gap-1.5 rounded-[2px] font-semibold border transition-all shadow-xs ${
                      isFocused
                        ? "px-3 py-1 text-xs bg-rose-500/20 border-rose-500 text-rose-300 hover:bg-rose-500/30"
                        : isDark
                        ? "px-2.5 py-0.5 text-[11px] bg-slate-800 border-slate-700 text-sky-400 hover:bg-sky-500/20 hover:border-sky-500"
                        : "px-2.5 py-0.5 text-[11px] bg-white border-slate-200 text-sky-700 hover:bg-sky-50 hover:border-sky-400"
                    }`}
                  >
                    {isFocused ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Exit Focus</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Focus Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Table Body with Complete Gridlines (Vertical & Horizontal) */}
              <div className={`overflow-x-auto ${isFocused ? "flex-1 overflow-y-auto" : "max-h-[340px] overflow-y-auto"}`}>
                <table className={`w-full text-left border-collapse ${isFocused ? "text-base" : "text-sm"}`}>
                  <thead className={`sticky top-0 z-10 font-semibold uppercase tracking-wider border-b shadow-xs ${
                    isFocused ? "text-xs sm:text-sm" : "text-[10px]"
                  } ${isDark ? "bg-[#182338] text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                    <tr>
                      <th
                        className={`border text-left font-bold select-none ${gridBorder} ${
                          isFocused ? "py-3 px-4" : "py-2 px-3"
                        } w-[24%]`}
                      >
                        District
                      </th>
                      <th
                        className={`border text-left font-bold select-none ${gridBorder} ${
                          isFocused ? "py-3 px-4" : "py-2 px-3"
                        } w-[30%]`}
                      >
                        RTO Name
                      </th>
                      <th
                        className={`border text-center font-bold select-none ${gridBorder} ${
                          isFocused ? "py-3 px-4" : "py-2 px-3"
                        } w-[16%]`}
                      >
                        Total Reg.
                      </th>
                      <th
                        className={`border text-center font-bold select-none ${gridBorder} ${
                          isFocused ? "py-3 px-4" : "py-2 px-3"
                        } w-[15%]`}
                      >
                        M&M Nos
                      </th>
                      <th
                        className={`border text-center font-bold select-none ${gridBorder} ${
                          isFocused ? "py-3 px-4" : "py-2 px-3"
                        } w-[15%]`}
                      >
                        M&M MS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30 font-semibold">
                    {districtGroups.map((group) => {
                      const displayDist = formatDistrictDisplayName(group.district);
                      const isExpanded = tableSearch.trim().length > 0 || !!expandedDistricts[group.district];

                      if (!isExpanded) {
                        return (
                          <tr
                            key={`collapsed-${group.district}`}
                            className={`cursor-pointer transition-colors ${
                              isDark ? "bg-[#18263e]/70 hover:bg-[#1f3150]" : "bg-slate-50/90 hover:bg-slate-100"
                            }`}
                            onClick={() => toggleDistrict(group.district)}
                          >
                            {/* District Cell with small + icon (colSpan 2) */}
                            <td
                              colSpan={2}
                              className={`text-left font-bold border ${gridBorder} ${
                                isFocused ? "py-3 px-4 text-sm sm:text-base" : "py-2 px-3 text-xs"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex items-center justify-center rounded-[2px] border transition-all ${
                                    isFocused ? "w-5 h-5" : "w-4 h-4"
                                  } ${
                                    isDark
                                      ? "bg-slate-800 border-slate-600 text-sky-400 hover:border-sky-400"
                                      : "bg-white border-slate-300 text-sky-600 hover:border-sky-500 shadow-2xs"
                                  }`}
                                  title={`Click to expand ${displayDist}`}
                                >
                                  <Plus className={isFocused ? "w-3 h-3 stroke-[2.5]" : "w-2.5 h-2.5 stroke-[2.5]"} />
                                </span>
                                <span className={`rounded-full ${dotColor} ${isFocused ? "w-2.5 h-2.5" : "w-2 h-2"}`} />
                                <span className={`font-bold ${isDark ? accentDark : accentLight}`}>
                                  {displayDist}
                                </span>
                                <span className={`font-normal text-slate-400 ${isFocused ? "text-xs" : "text-[10px]"}`}>
                                  ({group.rtos.length} RTOs)
                                </span>
                              </div>
                            </td>

                            {/* Total Registration - Centered */}
                            <td className={`text-center font-bold text-sky-400 whitespace-nowrap tabular-nums border ${gridBorder} ${
                              isFocused ? "py-3 px-4 text-base sm:text-lg font-extrabold" : "py-2 px-3 text-sm"
                            }`}>
                              {group.districtTotal.total.toLocaleString()}
                            </td>

                            {/* M&M Nos - Centered */}
                            <td className={`text-center font-bold text-rose-400 whitespace-nowrap tabular-nums border ${gridBorder} ${
                              isFocused ? "py-3 px-4 text-base sm:text-lg font-extrabold" : "py-2 px-3 text-sm"
                            }`}>
                              {group.districtTotal.mm.toLocaleString()}
                            </td>

                            {/* M&M MS % - Centered */}
                            <td className={`text-center whitespace-nowrap tabular-nums border ${gridBorder} ${
                              isFocused ? "py-3 px-4" : "py-2 px-3"
                            }`}>
                              <span className={`inline-block rounded-[2px] font-bold border ${
                                isFocused ? "px-3 py-1 text-sm sm:text-base font-extrabold" : "px-2 py-0.5 text-xs"
                              } ${
                                group.districtTotal.ms >= 15
                                  ? isDark ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-emerald-100 border-emerald-500 text-emerald-900"
                                  : isDark ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-cyan-100 border-cyan-500 text-cyan-900"
                              }`}>
                                {group.districtTotal.ms.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <React.Fragment key={group.district}>
                          {group.rtos.map((rto, rtoIdx) => (
                            <tr
                              key={`${group.district}-${rto.rtoName}-${rtoIdx}`}
                              className={`transition-colors ${
                                isDark
                                  ? rtoIdx % 2 === 0 ? "bg-[#1e293b]/60 hover:bg-slate-700/50" : "bg-slate-900/30 hover:bg-slate-700/50"
                                  : rtoIdx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/60 hover:bg-slate-100/70"
                              }`}
                            >
                              {/* 1. Merged District Cell with Collapse (-) Button on same line */}
                              {rtoIdx === 0 && (
                                <td
                                  rowSpan={group.rtos.length}
                                  className={`align-middle text-center font-bold border ${gridBorder} ${
                                    isFocused ? "py-3 px-4 text-base sm:text-lg" : "py-2 px-3 text-sm"
                                  } ${isDark ? "bg-[#152238]/70 text-slate-100" : "bg-slate-50/95 text-slate-900"}`}
                                >
                                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => toggleDistrict(group.district)}
                                      className={`flex items-center justify-center rounded-[2px] border transition-all ${
                                        isFocused ? "w-5 h-5" : "w-4 h-4"
                                      } ${
                                        isDark
                                          ? "bg-slate-800 border-slate-600 text-amber-400 hover:border-amber-400 hover:bg-slate-700"
                                          : "bg-white border-slate-300 text-amber-700 hover:border-amber-500 hover:bg-amber-50 shadow-2xs"
                                      }`}
                                      title={`Collapse ${displayDist}`}
                                    >
                                      <Minus className={isFocused ? "w-3 h-3 stroke-[2.5]" : "w-2.5 h-2.5 stroke-[2.5]"} />
                                    </button>
                                    <span className={`rounded-full ${dotColor} ${isFocused ? "w-2.5 h-2.5" : "w-2 h-2"}`} />
                                    <span className={`font-bold ${isDark ? accentDark : accentLight}`}>
                                      {displayDist}
                                    </span>
                                    <span className={`text-slate-400 font-normal ${isFocused ? "text-xs" : "text-[10px]"}`}>
                                      ({group.rtos.length} RTOs)
                                    </span>
                                  </div>
                                </td>
                              )}

                              {/* 2. RTO Name */}
                              <td className={`whitespace-nowrap font-semibold border ${gridBorder} text-left ${
                                isFocused ? "py-3 px-4 text-base" : "py-1.5 px-3 text-sm"
                              }`}>
                                {rto.rtoName}
                              </td>

                              {/* 3. Total Registration - Centered */}
                              <td className={`text-center font-semibold text-sky-400 dark:text-sky-300 whitespace-nowrap tabular-nums border ${gridBorder} ${
                                isFocused ? "py-3 px-4 text-base sm:text-lg font-bold" : "py-1.5 px-3 text-sm"
                              }`}>
                                {rto.total.toLocaleString()}
                              </td>

                              {/* 4. M&M Nos - Centered */}
                              <td className={`text-center font-semibold text-rose-500 dark:text-rose-400 whitespace-nowrap tabular-nums border ${gridBorder} ${
                                isFocused ? "py-3 px-4 text-base sm:text-lg font-bold" : "py-1.5 px-3 text-sm"
                              }`}>
                                {rto.mm.toLocaleString()}
                              </td>

                              {/* 5. M&M MS % - Centered */}
                              <td className={`text-center whitespace-nowrap tabular-nums border ${gridBorder} ${
                                isFocused ? "py-3 px-4" : "py-1.5 px-3"
                              }`}>
                                <span className={`inline-block rounded-[2px] font-semibold border ${
                                  isFocused ? "px-3 py-1 text-sm sm:text-base font-bold" : "px-2 py-0.5 text-xs"
                                } ${
                                  rto.ms >= 15
                                    ? isDark ? "bg-emerald-500/15 border-emerald-500/60 text-emerald-300" : "bg-emerald-50 border-emerald-400 text-emerald-800"
                                    : rto.ms >= 10
                                    ? isDark ? "bg-cyan-500/15 border-cyan-500/60 text-cyan-300" : "bg-cyan-50 border-cyan-400 text-cyan-800"
                                    : isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-700"
                                }`}>
                                  {rto.ms.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}

                          {/* District Subtotal Row: e.g. "Kannur Total" spanning colSpan 2 */}
                          <tr className={`font-bold transition-colors ${
                            isDark ? "bg-[#18263e] text-slate-200" : "bg-slate-100 text-slate-800"
                          }`}>
                            <td
                              colSpan={2}
                              className={`text-left font-bold uppercase tracking-wide border ${gridBorder} ${
                                isFocused ? "py-3 px-4 text-sm sm:text-base font-extrabold" : "py-1.5 px-3 text-xs"
                              }`}
                            >
                              <div className="flex items-center justify-between pr-2">
                                <span className="font-bold">
                                  {displayDist} Total
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleDistrict(group.district)}
                                  className={`flex items-center justify-center rounded-[2px] border transition-all ${
                                    isFocused ? "w-5 h-5" : "w-4 h-4"
                                  } ${
                                    isDark
                                      ? "bg-slate-800 border-slate-600 text-amber-400 hover:border-amber-400 hover:bg-slate-700"
                                      : "bg-white border-slate-300 text-amber-700 hover:border-amber-500 hover:bg-amber-50 shadow-2xs"
                                  }`}
                                  title={`Collapse ${displayDist}`}
                                >
                                  <Minus className={isFocused ? "w-3 h-3 stroke-[2.5]" : "w-2.5 h-2.5 stroke-[2.5]"} />
                                </button>
                              </div>
                            </td>
                            <td className={`text-center font-bold text-sky-400 whitespace-nowrap tabular-nums border ${gridBorder} ${
                              isFocused ? "py-3 px-4 text-base sm:text-lg font-extrabold" : "py-1.5 px-3 text-sm"
                            }`}>
                              {group.districtTotal.total.toLocaleString()}
                            </td>
                            <td className={`text-center font-bold text-rose-400 whitespace-nowrap tabular-nums border ${gridBorder} ${
                              isFocused ? "py-3 px-4 text-base sm:text-lg font-extrabold" : "py-1.5 px-3 text-sm"
                            }`}>
                              {group.districtTotal.mm.toLocaleString()}
                            </td>
                            <td className={`text-center whitespace-nowrap tabular-nums border ${gridBorder} ${
                              isFocused ? "py-3 px-4" : "py-1.5 px-3"
                            }`}>
                              <span className={`inline-block rounded-[2px] font-bold border ${
                                isFocused ? "px-3 py-1 text-sm sm:text-base font-extrabold" : "px-2 py-0.5 text-xs"
                              } ${
                                group.districtTotal.ms >= 15
                                  ? isDark ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-emerald-100 border-emerald-500 text-emerald-900"
                                  : isDark ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-cyan-100 border-cyan-500 text-cyan-900"
                              }`}>
                                {group.districtTotal.ms.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}

                    {districtGroups.length === 0 && (
                      <tr>
                        <td colSpan={5} className={`text-center text-slate-400 font-semibold border ${gridBorder} ${
                          isFocused ? "py-12 text-sm" : "py-6 text-xs"
                        }`}>
                          No data for {territory}.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Sticky Territory Total Footer */}
                  <tfoot className={`sticky bottom-0 z-10 font-bold border-t ${
                    isFocused ? "text-sm sm:text-base" : "text-xs"
                  } ${isDark ? "bg-[#141f33] border-slate-700 text-slate-100" : "bg-slate-100 border-slate-300 text-slate-900"}`}>
                    <tr>
                      <td colSpan={2} className={`uppercase tracking-wider text-slate-400 border ${gridBorder} ${
                        isFocused ? "py-3.5 px-4 text-sm sm:text-base font-extrabold" : "py-2 px-3 text-[10px]"
                      }`}>
                        {territory} Total
                      </td>
                      <td className={`text-center tabular-nums font-bold text-sky-400 whitespace-nowrap border ${gridBorder} ${
                        isFocused ? "py-3.5 px-4 text-lg sm:text-xl font-extrabold" : "py-2 px-3 text-sm"
                      }`}>
                        {totals.total.toLocaleString()}
                      </td>
                      <td className={`text-center tabular-nums font-bold text-rose-400 whitespace-nowrap border ${gridBorder} ${
                        isFocused ? "py-3.5 px-4 text-lg sm:text-xl font-extrabold" : "py-2 px-3 text-sm"
                      }`}>
                        {totals.mm.toLocaleString()}
                      </td>
                      <td className={`text-center tabular-nums font-bold border ${gridBorder} ${
                        isFocused ? "py-3.5 px-4" : "py-2 px-3"
                      }`}>
                        <span className={`inline-block rounded-[2px] font-bold border ${
                          isFocused ? "px-3.5 py-1.5 text-base font-extrabold" : "px-2 py-0.5 text-xs"
                        } ${
                          isDark ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-emerald-100 border-emerald-500 text-emerald-900"
                        }`}>
                          {totals.ms.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        };

        return (
          <>
            {focusedTable && (
              <div
                className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={() => setFocusedTable(null)}
              />
            )}


            {/* MULTI-YEAR TERRITORY PERFORMANCE SUMMARY TABLE (FY 23 - FY 26) */}
            {!focusedTable && (
              <div className="mt-2.5 rounded-[2px] border border-slate-200 dark:border-slate-700/80 shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                {/* HUD Header */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-[2px] bg-[#0070c0] text-white shadow-xs">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs tracking-wide text-slate-800 dark:text-slate-100">
                      Multi-Year Territory Performance Summary (FY 23 - FY 26)
                    </span>
                    <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold border bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800">
                      TIV • M&M • MS • GOLY(%)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Copy Image Button */}
                    <button
                      type="button"
                      onClick={handleCopyMultiYearTableAsImage}
                      title="Copy Multi-Year Summary Table as High-Resolution Image to Clipboard"
                      className="flex items-center gap-1 px-2.5 py-0.5 rounded-[2px] text-[10px] font-semibold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 shadow-xs"
                    >
                      <Camera className="w-3 h-3 text-sky-500" />
                      <span>{copyStatus["multiyear"] || "Copy Image"}</span>
                    </button>

                    {/* Export Excel Button */}
                    <button
                      type="button"
                      onClick={handleExportMultiYearExcel}
                      title="Export Multi-Year Summary Table to Styled Excel"
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-semibold border bg-[#0070c0] hover:bg-[#005fa3] text-white border-[#005a9e] shadow-xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>

                {/* Table matching the exact UI specification from the user */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      {/* Row 1 Super-Headers: Exact #0070c0 vibrant blue with bold white text */}
                      <tr className="bg-[#0070c0] text-white font-bold text-center border-b border-[#005a9e]">
                        <th rowSpan={2} className="border border-[#005a9e] px-3 py-2 text-left font-bold w-[120px] whitespace-nowrap bg-[#0070c0]">
                          Territory
                        </th>
                        <th colSpan={3} className="border border-[#005a9e] px-2 py-1.5 text-center font-bold tracking-wide">
                          FY 23
                        </th>
                        <th colSpan={3} className="border border-[#005a9e] px-2 py-1.5 text-center font-bold tracking-wide">
                          FY 24
                        </th>
                        <th colSpan={2} className="border border-[#005a9e] px-2 py-1.5 text-center font-bold tracking-wide">
                          GOLY(%)
                        </th>
                        <th colSpan={3} className="border border-[#005a9e] px-2 py-1.5 text-center font-bold tracking-wide">
                          FY 25
                        </th>
                        <th colSpan={2} className="border border-[#005a9e] px-2 py-1.5 text-center font-bold tracking-wide">
                          GOLY(%)
                        </th>
                        <th colSpan={3} className="border border-[#005a9e] px-2 py-1.5 text-center font-bold tracking-wide">
                          FY 26
                        </th>
                        <th colSpan={2} className="border border-[#005a9e] px-2 py-1.5 text-center font-bold tracking-wide">
                          GOLY(%)
                        </th>
                      </tr>

                      {/* Row 2 Sub-Headers */}
                      <tr className="bg-[#0070c0] text-white font-bold text-center border-b border-[#005a9e]">
                        {/* FY 23 */}
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">TIV</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">M&M</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">MS</th>
                        {/* FY 24 */}
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">TIV</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">M&M</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">MS</th>
                        {/* GOLY FY24 */}
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">TIV</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">M&M</th>
                        {/* FY 25 */}
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">TIV</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">M&M</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">MS</th>
                        {/* GOLY FY25 */}
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">TIV</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">M&M</th>
                        {/* FY 26 */}
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">TIV</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">M&M</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">MS</th>
                        {/* GOLY FY26 */}
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">TIV</th>
                        <th className="border border-[#005a9e] px-2 py-1 text-center font-bold text-[11px]">M&M</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 font-semibold">
                      {renderMultiYearDataRow(multiYearData.north, false)}
                      {renderMultiYearDataRow(multiYearData.south, false)}
                      {renderMultiYearDataRow(multiYearData.total, true)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MONTH-ON-MONTH (MoM) PERFORMANCE SUMMARY TABLE */}
            {!focusedTable && (
              <div className="mt-2.5 rounded-[2px] border border-slate-200 dark:border-slate-700/80 shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                {/* HUD Header */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="p-1 rounded-[2px] bg-[#0070c0] text-white shadow-xs">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs tracking-wide text-slate-800 dark:text-slate-100">
                      Month-on-Month (MoM) Performance Summary ({momData.periodLabel})
                    </span>
                    <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
                      TIV • M&M • MS% • MoM Growth (%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Mode Toggle: Territory View vs District-Wise View */}
                    <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-[2px] border border-slate-300 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setMomViewMode("district")}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] transition ${
                          momViewMode === "district"
                            ? "bg-[#0070c0] text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        District-Wise
                      </button>
                      <button
                        type="button"
                        onClick={() => setMomViewMode("territory")}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] transition ${
                          momViewMode === "territory"
                            ? "bg-[#0070c0] text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Territory-Only
                      </button>
                    </div>

                    {/* Export Excel Button */}
                    <button
                      type="button"
                      onClick={handleExportMomExcel}
                      title="Export Month-on-Month Summary Table to Excel"
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-semibold border bg-[#0070c0] hover:bg-[#005fa3] text-white border-[#005a9e] shadow-xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export MoM Excel</span>
                    </button>
                  </div>
                </div>

                {/* MoM Grid Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      {/* Row 1 Super-Headers */}
                      <tr className="bg-[#0070c0] text-white font-bold text-center border-b border-[#005a9e]">
                        <th rowSpan={2} className="border border-[#005a9e] px-3 py-2 text-left font-bold w-[140px] whitespace-nowrap bg-[#0070c0]">
                          {momViewMode === "district" ? "District / Territory" : "Territory"}
                        </th>
                        {momData.monthsList.map((m) => (
                          <th key={m} colSpan={5} className="border border-[#005a9e] px-2 py-1.5 text-center font-bold tracking-wide">
                            {m}
                          </th>
                        ))}
                      </tr>

                      {/* Row 2 Sub-Headers */}
                      <tr className="bg-[#0070c0] text-white font-bold text-center border-b border-[#005a9e]">
                        {momData.monthsList.map((m) => (
                          <React.Fragment key={`${m}-sub`}>
                            <th className="border border-[#005a9e] px-1.5 py-1 text-center font-bold text-[10.5px]">TIV</th>
                            <th className="border border-[#005a9e] px-1.5 py-1 text-center font-bold text-[10.5px]">M&M</th>
                            <th className="border border-[#005a9e] px-1.5 py-1 text-center font-bold text-[10.5px]">MS%</th>
                            <th className="border border-[#005a9e] px-1 py-1 text-center font-bold text-[10px]">MoM TIV</th>
                            <th className="border border-[#005a9e] px-1 py-1 text-center font-bold text-[10px]">MoM M&M</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 font-semibold">
                      {(() => {
                        const renderRow = (
                          rowItem: { name: string; months: typeof momData.north.months; territory?: string },
                          rowType: "total" | "territory" | "district"
                        ) => {
                          const isTotal = rowType === "total";
                          const isTerritory = rowType === "territory";
                          const isDistrict = rowType === "district";

                          const gridBrd = isTotal
                            ? "border-[#005a9e]"
                            : isTerritory
                            ? isDark ? "border-slate-600" : "border-slate-300"
                            : isDark ? "border-slate-700/60" : "border-slate-200";

                          return (
                            <tr
                              key={`${rowType}-${rowItem.name}`}
                              className={`transition-colors ${
                                isTotal
                                  ? "bg-[#0070c0] text-white font-extrabold shadow-inner"
                                  : isTerritory
                                  ? isDark ? "bg-[#152238] font-bold text-sky-200" : "bg-sky-50 font-bold text-sky-950"
                                  : isDark
                                  ? "bg-[#1e293b] hover:bg-[#27354f] text-slate-100"
                                  : "bg-white hover:bg-slate-50/80 text-slate-800"
                              }`}
                            >
                              {/* Label Column */}
                              <td className={`border px-3 py-1.5 text-left whitespace-nowrap text-xs ${gridBrd} ${
                                isTotal
                                  ? "bg-[#0070c0] text-white font-black"
                                  : isTerritory
                                  ? isDark ? "bg-[#152238] font-black" : "bg-sky-100/70 font-black"
                                  : isDark ? "bg-slate-900/30 font-semibold" : "bg-slate-50/50 font-semibold"
                              }`}>
                                <div className={`flex items-center gap-2 ${isDistrict ? "pl-3.5" : ""}`}>
                                  {isTotal ? (
                                    <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                  ) : isTerritory ? (
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ${
                                      rowItem.name === "North Kerala" ? "bg-teal-400 ring-teal-400/30" : "bg-indigo-400 ring-indigo-400/30"
                                    }`} />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                  )}
                                  <span className={
                                    isTotal
                                      ? "font-black tracking-wide text-white uppercase text-xs"
                                      : isTerritory
                                      ? "font-extrabold uppercase tracking-wide text-xs"
                                      : "font-semibold text-xs text-slate-700 dark:text-slate-200"
                                  }>
                                    {rowItem.name} {isTerritory && "Total"}
                                  </span>
                                </div>
                              </td>

                              {/* 12 Months Metrics */}
                              {rowItem.months.map((m) => {
                                const renderMomGrowth = (val: number | null) => {
                                  if (val === null) return <span className="text-slate-400 font-semibold text-[10px]">-</span>;
                                  const isPos = val >= 0;
                                  const text = `${isPos ? "+" : ""}${val.toFixed(1)}%`;
                                  if (isTotal) {
                                    return (
                                      <span className="inline-block px-1 py-0.5 rounded-[2px] font-bold text-[10px] bg-white/20 text-white border border-white/30 tabular-nums">
                                        {text}
                                      </span>
                                    );
                                  }
                                  const badge = isPos
                                    ? isDark ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40" : "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                    : isDark ? "bg-rose-500/15 text-rose-300 border border-rose-500/40" : "bg-rose-50 text-rose-700 border border-rose-300";
                                  return (
                                    <span className={`inline-block px-1 py-0.5 rounded-[2px] font-bold text-[9.5px] tabular-nums ${badge}`}>
                                      {text}
                                    </span>
                                  );
                                };

                                return (
                                  <React.Fragment key={m.label}>
                                    {/* TIV */}
                                    <td className={`border px-1.5 py-1 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                                      isTotal
                                        ? "text-white"
                                        : isTerritory
                                        ? "text-sky-600 dark:text-sky-300"
                                        : "text-sky-500 dark:text-sky-400"
                                    }`}>
                                      {m.tiv.toLocaleString()}
                                    </td>
                                    {/* M&M */}
                                    <td className={`border px-1.5 py-1 text-center font-bold text-xs tabular-nums ${gridBrd} ${
                                      isTotal
                                        ? "text-white"
                                        : isTerritory
                                        ? "text-rose-600 dark:text-rose-300"
                                        : "text-rose-500 dark:text-rose-400"
                                    }`}>
                                      {m.mm.toLocaleString()}
                                    </td>
                                    {/* MS% */}
                                    <td className={`border px-1 py-1 text-center ${gridBrd}`}>
                                      {isTotal ? (
                                        <span className="inline-block px-1.5 py-0.5 rounded-[2px] font-black text-xs bg-white text-[#0070c0]">
                                          {m.ms.toFixed(1)}%
                                        </span>
                                      ) : (
                                        <span className={`inline-block px-1 py-0.5 rounded-[2px] font-bold text-[10.5px] tabular-nums ${
                                          m.ms >= 7
                                            ? isDark ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50" : "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                            : m.ms >= 4
                                            ? isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50" : "bg-cyan-50 text-cyan-800 border border-cyan-300"
                                            : isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-slate-100 text-slate-700 border border-slate-300"
                                        }`}>
                                          {m.ms.toFixed(1)}%
                                        </span>
                                      )}
                                    </td>
                                    {/* MoM TIV */}
                                    <td className={`border px-1 py-0.5 text-center ${gridBrd}`}>
                                      {renderMomGrowth(m.momTiv)}
                                    </td>
                                    {/* MoM M&M */}
                                    <td className={`border px-1 py-0.5 text-center ${gridBrd}`}>
                                      {renderMomGrowth(m.momMm)}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          );
                        };

                        if (momViewMode === "territory") {
                          return (
                            <>
                              {renderRow(momData.north, "territory")}
                              {renderRow(momData.south, "territory")}
                              {renderRow(momData.total, "total")}
                            </>
                          );
                        }

                        // District-Wise View: Grouped with North Kerala and South Kerala
                        const northDistricts = momData.districts.filter((d) => d.territory === "North Kerala");
                        const southDistricts = momData.districts.filter((d) => d.territory === "South Kerala");

                        return (
                          <>
                            {/* North Kerala Section */}
                            <tr className="bg-teal-700 text-white font-extrabold text-xs">
                              <td colSpan={1 + momData.monthsList.length * 5} className="px-3 py-1 text-left tracking-wider uppercase bg-teal-800 text-teal-100">
                                North Kerala Region (7 Districts)
                              </td>
                            </tr>
                            {northDistricts.map((d) => renderRow(d, "district"))}
                            {renderRow(momData.north, "territory")}

                            {/* South Kerala Section */}
                            <tr className="bg-indigo-700 text-white font-extrabold text-xs">
                              <td colSpan={1 + momData.monthsList.length * 5} className="px-3 py-1 text-left tracking-wider uppercase bg-indigo-800 text-indigo-100">
                                South Kerala Region (7 Districts)
                              </td>
                            </tr>
                            {southDistricts.map((d) => renderRow(d, "district"))}
                            {renderRow(momData.south, "territory")}

                            {/* Grand Total */}
                            {renderRow(momData.total, "total")}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-2.5 flex gap-3 flex-wrap">
              {renderTable(northRows, northTotals, "North Kerala")}
              {renderTable(southRows, southTotals, "South Kerala")}
            </div>
          </>
        );
      })()}

    </>
  );
}
