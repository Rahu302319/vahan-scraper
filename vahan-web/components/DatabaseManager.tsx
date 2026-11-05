"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  Search,
  RotateCcw,
  Download,
  Check,
  X,
  Building,
  MapPin,
  Filter,
  Save,
  AlertCircle
} from "lucide-react";
import defaultOemDb from "@/lib/oem-db.json";
import defaultRtoDt from "@/lib/rto-dt.json";

export interface OEMRecord {
  oemName: string;
  oemFinal: string;
  oemGroup: string;
  oemGrouping: string;
}

export interface RTORecord {
  srtOffice: string;
  finalRtoName: string;
  district: string;
  territory: string;
}

interface DatabaseManagerProps {
  theme?: "dark" | "light";
  onOemDbChange?: (db: OEMRecord[]) => void;
  onRtoDtChange?: (dt: RTORecord[]) => void;
}

const OEM_GROUP_OPTIONS = ["M&M", "Other OEM"];
const OEM_GROUPING_OPTIONS = [
  "Mahindra",
  "Maruti",
  "Hyundai",
  "Tata",
  "Toyota",
  "Kia",
  "MG",
  "Honda",
  "Premium",
  "Others",
];

const TERRITORY_OPTIONS = ["North Kerala", "South Kerala"];
const DISTRICT_OPTIONS = [
  "Kannur",
  "Kasargod",
  "Kozhikode",
  "Malappuram",
  "Palakkad",
  "Thrissur",
  "Wayanad",
  "Alappuzha",
  "Ernakulam",
  "Idukki",
  "Kollam",
  "Kottayam",
  "Pathanamthitta",
  "Thiruvananthapuram",
];

export default function DatabaseManager({
  theme = "dark",
  onOemDbChange,
  onRtoDtChange,
}: DatabaseManagerProps) {
  const isDark = theme === "dark";

  // Active sub-tab: OEM_DB or RTO_DT
  const [activeTab, setActiveTab] = useState<"oem" | "rto">("oem");

  // Databases state
  const [oemList, setOemList] = useState<OEMRecord[]>([]);
  const [rtoList, setRtoList] = useState<RTORecord[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupingFilter, setSelectedGroupingFilter] = useState<string>("ALL");
  const [selectedTerritoryFilter, setSelectedTerritoryFilter] = useState<string>("ALL");

  // Modal / Form state for Adding
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOem, setNewOem] = useState<OEMRecord>({
    oemName: "",
    oemFinal: "",
    oemGroup: "Other OEM",
    oemGrouping: "Others",
  });
  const [newRto, setNewRto] = useState<RTORecord>({
    srtOffice: "",
    finalRtoName: "",
    district: "Kannur",
    territory: "North Kerala",
  });

  // Modal / Form state for Editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editOem, setEditOem] = useState<OEMRecord | null>(null);
  const [editRto, setEditRto] = useState<RTORecord | null>(null);

  // Status notification
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showStatus = (text: string, type: "success" | "error" | "info" = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // 1. Initial Load from LocalStorage or default JSON
  useEffect(() => {
    // Load OEM DB
    try {
      const savedOem = localStorage.getItem("vahan_custom_oem_db");
      if (savedOem) {
        const parsed = JSON.parse(savedOem);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOemList(parsed);
          onOemDbChange?.(parsed);
        } else {
          setOemList(defaultOemDb as OEMRecord[]);
          onOemDbChange?.(defaultOemDb as OEMRecord[]);
        }
      } else {
        setOemList(defaultOemDb as OEMRecord[]);
        onOemDbChange?.(defaultOemDb as OEMRecord[]);
      }
    } catch {
      setOemList(defaultOemDb as OEMRecord[]);
      onOemDbChange?.(defaultOemDb as OEMRecord[]);
    }

    // Load RTO DT
    try {
      const savedRto = localStorage.getItem("vahan_custom_rto_dt");
      if (savedRto) {
        const parsed = JSON.parse(savedRto);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRtoList(parsed);
          onRtoDtChange?.(parsed);
        } else {
          setRtoList(defaultRtoDt as RTORecord[]);
          onRtoDtChange?.(defaultRtoDt as RTORecord[]);
        }
      } else {
        setRtoList(defaultRtoDt as RTORecord[]);
        onRtoDtChange?.(defaultRtoDt as RTORecord[]);
      }
    } catch {
      setRtoList(defaultRtoDt as RTORecord[]);
      onRtoDtChange?.(defaultRtoDt as RTORecord[]);
    }
  }, []);

  // Sync to LocalStorage & parent callback
  const saveOemList = (updated: OEMRecord[]) => {
    setOemList(updated);
    try {
      localStorage.setItem("vahan_custom_oem_db", JSON.stringify(updated));
    } catch {}
    onOemDbChange?.(updated);
    // Also save to server API if available
    fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "oem", data: updated }),
    }).catch(() => {});
  };

  const saveRtoList = (updated: RTORecord[]) => {
    setRtoList(updated);
    try {
      localStorage.setItem("vahan_custom_rto_dt", JSON.stringify(updated));
    } catch {}
    onRtoDtChange?.(updated);
    fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rto", data: updated }),
    }).catch(() => {});
  };

  // Reset to original defaults
  const handleResetOem = () => {
    if (confirm("Reset OEM Database to default 105 entries from 'New RTO working file - 2024.xlsx'?")) {
      saveOemList(defaultOemDb as OEMRecord[]);
      showStatus("OEM Database restored to original 105 entries.");
    }
  };

  const handleResetRto = () => {
    if (confirm("Reset RTO Database to default 165 entries from 'New RTO working file - 2024.xlsx'?")) {
      saveRtoList(defaultRtoDt as RTORecord[]);
      showStatus("RTO Database restored to original 165 entries.");
    }
  };

  // Add OEM
  const handleAddOem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOem.oemName.trim()) {
      alert("Please enter OEM Name (raw name from Vahan).");
      return;
    }
    const cleanFinal = newOem.oemFinal.trim() || newOem.oemName.trim();
    const updated = [
      {
        oemName: newOem.oemName.trim().toUpperCase(),
        oemFinal: cleanFinal,
        oemGroup: newOem.oemGroup,
        oemGrouping: newOem.oemGrouping,
      },
      ...oemList,
    ];
    saveOemList(updated);
    setNewOem({
      oemName: "",
      oemFinal: "",
      oemGroup: "Other OEM",
      oemGrouping: "Others",
    });
    setIsAddModalOpen(false);
    showStatus(`Added "${newOem.oemName}" to OEM Database successfully!`);
  };

  // Delete OEM
  const handleDeleteOem = (index: number, name: string) => {
    if (confirm(`Are you sure you want to delete OEM mapping for "${name}"?`)) {
      const updated = oemList.filter((_, idx) => idx !== index);
      saveOemList(updated);
      showStatus(`Deleted "${name}" from database.`);
    }
  };

  // Save Edit OEM
  const handleSaveEditOem = () => {
    if (editingIndex === null || !editOem) return;
    const updated = [...oemList];
    updated[editingIndex] = editOem;
    saveOemList(updated);
    setEditingIndex(null);
    setEditOem(null);
    showStatus(`Updated "${editOem.oemName}".`);
  };

  // Add RTO
  const handleAddRto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRto.finalRtoName.trim()) {
      alert("Please enter Final RTO Name.");
      return;
    }
    const updated = [
      {
        srtOffice: newRto.srtOffice.trim() || newRto.finalRtoName.trim(),
        finalRtoName: newRto.finalRtoName.trim(),
        district: newRto.district,
        territory: newRto.territory,
      },
      ...rtoList,
    ];
    saveRtoList(updated);
    setNewRto({
      srtOffice: "",
      finalRtoName: "",
      district: "Kannur",
      territory: "North Kerala",
    });
    setIsAddModalOpen(false);
    showStatus(`Added "${newRto.finalRtoName}" to RTO Database!`);
  };

  // Delete RTO
  const handleDeleteRto = (index: number, name: string) => {
    if (confirm(`Are you sure you want to delete RTO "${name}"?`)) {
      const updated = rtoList.filter((_, idx) => idx !== index);
      saveRtoList(updated);
      showStatus(`Deleted "${name}" from RTO Database.`);
    }
  };

  // Save Edit RTO
  const handleSaveEditRto = () => {
    if (editingIndex === null || !editRto) return;
    const updated = [...rtoList];
    updated[editingIndex] = editRto;
    saveRtoList(updated);
    setEditingIndex(null);
    setEditRto(null);
    showStatus(`Updated RTO "${editRto.finalRtoName}".`);
  };

  // Export Database to CSV
  const handleExportCsv = () => {
    if (activeTab === "oem") {
      const headers = ["OEM Name", "OEM Final", "OEM Group", "OEM Grouping"];
      const lines = [headers.join(",")];
      oemList.forEach((r) => {
        lines.push([`"${r.oemName}"`, `"${r.oemFinal}"`, `"${r.oemGroup}"`, `"${r.oemGrouping}"`].join(","));
      });
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OEM_DB_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["SRT Office", "Final RTO Name", "Revenue District", "Territory"];
      const lines = [headers.join(",")];
      rtoList.forEach((r) => {
        lines.push([`"${r.srtOffice}"`, `"${r.finalRtoName}"`, `"${r.district}"`, `"${r.territory}"`].join(","));
      });
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RTO_DT_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Filtered OEM records
  const filteredOems = useMemo(() => {
    return oemList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.oemName.toLowerCase().includes(q) ||
        item.oemFinal.toLowerCase().includes(q) ||
        item.oemGroup.toLowerCase().includes(q) ||
        item.oemGrouping.toLowerCase().includes(q);
      const matchesGroup =
        selectedGroupingFilter === "ALL" || item.oemGrouping === selectedGroupingFilter;
      return matchesSearch && matchesGroup;
    });
  }, [oemList, searchQuery, selectedGroupingFilter]);

  // Filtered RTO records
  const filteredRtos = useMemo(() => {
    return rtoList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.finalRtoName.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.srtOffice.toLowerCase().includes(q);
      const matchesTerritory =
        selectedTerritoryFilter === "ALL" || item.territory === selectedTerritoryFilter;
      return matchesSearch && matchesTerritory;
    });
  }, [rtoList, searchQuery, selectedTerritoryFilter]);

  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-3 sm:p-4 transition-colors ${
      isDark ? "bg-[#080e1b] border-[#1e2d4a] text-[#cbd5e1]" : "bg-white border-slate-200 text-slate-800 shadow-sm"
    }`}>
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#1f2f4c]/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#0284c7]/20 border border-[#0284c7] text-[#38bdf8]">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className={`text-base font-extrabold tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
              MASTER REFERENCE DATABASE MANAGER
            </h2>
            <p className={`text-[11px] ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
              Configure OEM Groupings & RTO Territory mappings used by the Executive Dashboard
            </p>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusMsg && (
          <span className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 animate-fadeIn ${
            statusMsg.type === "success"
              ? "bg-[#064e3b]/80 text-[#34d399] border border-[#059669]"
              : "bg-[#7f1d1d]/80 text-[#f87171] border border-[#dc2626]"
          }`}>
            <Check className="w-3.5 h-3.5" />
            {statusMsg.text}
          </span>
        )}

        {/* Global DB Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition ${
              isDark
                ? "bg-[#0f172a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border-[#334155]"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
            }`}
            title="Download CSV copy of active database"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={activeTab === "oem" ? handleResetOem : handleResetRto}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition ${
              isDark
                ? "bg-[#18181b] hover:bg-[#27272a] text-[#fbbf24] border-[#d97706]/40"
                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
            }`}
            title="Reset active table to template defaults from New RTO working file"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#38bdf8] shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            {activeTab === "oem" ? "+ Add OEM Mapping" : "+ Add RTO Mapping"}
          </button>
        </div>
      </div>

      {/* 2. Sub-Tab Switcher & Filter Deck */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab("oem");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition border ${
              activeTab === "oem"
                ? isDark
                  ? "bg-[#0284c7]/20 text-[#38bdf8] border-[#0284c7]"
                  : "bg-sky-100 text-sky-800 border-sky-400 font-extrabold"
                : isDark
                ? "text-[#64748b] hover:text-white border-transparent"
                : "text-slate-600 hover:text-slate-900 border-transparent"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            OEM Database (OEM_DB)
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              isDark ? "bg-[#1e293b] text-[#94a3b8]" : "bg-slate-200 text-slate-700"
            }`}>
              {oemList.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("rto");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition border ${
              activeTab === "rto"
                ? isDark
                  ? "bg-[#0284c7]/20 text-[#38bdf8] border-[#0284c7]"
                  : "bg-sky-100 text-sky-800 border-sky-400 font-extrabold"
                : isDark
                ? "text-[#64748b] hover:text-white border-transparent"
                : "text-slate-600 hover:text-slate-900 border-transparent"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            RTO & Territory Database (RTO_DT)
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              isDark ? "bg-[#1e293b] text-[#94a3b8]" : "bg-slate-200 text-slate-700"
            }`}>
              {rtoList.length}
            </span>
          </button>
        </div>

        {/* Search & Quick Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDark ? "text-[#64748b]" : "text-slate-400"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "oem" ? "Search OEM name or group..." : "Search RTO or district..."}
              className={`pl-8 pr-3 py-1.5 rounded text-xs border focus:outline-none transition w-56 sm:w-64 ${
                isDark
                  ? "bg-[#0b1322] border-[#1e2d4a] text-white focus:border-[#38bdf8]"
                  : "bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500"
              }`}
            />
          </div>

          {activeTab === "oem" ? (
            <select
              value={selectedGroupingFilter}
              onChange={(e) => setSelectedGroupingFilter(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold border focus:outline-none ${
                isDark
                  ? "bg-[#0b1322] border-[#1e2d4a] text-[#7dd3fc] focus:border-[#38bdf8]"
                  : "bg-slate-50 border-slate-300 text-slate-800 focus:border-sky-500"
              }`}
            >
              <option value="ALL">All Groupings</option>
              {OEM_GROUPING_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedTerritoryFilter}
              onChange={(e) => setSelectedTerritoryFilter(e.target.value)}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold border focus:outline-none ${
                isDark
                  ? "bg-[#0b1322] border-[#1e2d4a] text-[#7dd3fc] focus:border-[#38bdf8]"
                  : "bg-slate-50 border-slate-300 text-slate-800 focus:border-sky-500"
              }`}
            >
              <option value="ALL">All Territories</option>
              {TERRITORY_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. Table Display */}
      {activeTab === "oem" ? (
        /* OEM DATABASE TABLE */
        <div className={`overflow-auto rounded-lg border max-h-[600px] ${
          isDark ? "border-[#1e2d4a] bg-[#070c17]" : "border-slate-200 bg-white"
        }`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-10 font-bold border-b text-[11px] ${
              isDark ? "bg-[#0f172a] text-[#38bdf8] border-[#1e2d4a]" : "bg-slate-100 text-slate-700 border-slate-300"
            }`}>
              <tr>
                <th className="p-2 w-12 text-center">#</th>
                <th className="p-2">OEM Name (Raw Vahan Portal)</th>
                <th className="p-2">OEM Final</th>
                <th className="p-2 w-32">OEM Group</th>
                <th className="p-2 w-32">OEM Grouping</th>
                <th className="p-2 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-[#131f33]" : "divide-slate-200"}`}>
              {filteredOems.map((row, idx) => {
                const isEditing = editingIndex === idx;
                const isMM = row.oemGroup === "M&M" || row.oemGrouping === "Mahindra";
                return (
                  <tr
                    key={idx}
                    className={`transition ${
                      isEditing
                        ? isDark
                          ? "bg-[#1e3a8a]/30"
                          : "bg-sky-50"
                        : isMM
                        ? isDark
                          ? "bg-[#7f1d1d]/10 hover:bg-[#7f1d1d]/20"
                          : "bg-red-50/40 hover:bg-red-50"
                        : idx % 2 === 0
                        ? isDark
                          ? "bg-[#070d18] hover:bg-[#0c1424]"
                          : "bg-white hover:bg-slate-50"
                        : isDark
                        ? "bg-[#0a1120] hover:bg-[#0f192e]"
                        : "bg-slate-50/60 hover:bg-slate-100"
                    }`}
                  >
                    <td className={`p-2 text-center font-mono text-[10px] ${isDark ? "text-[#64748b]" : "text-slate-400"}`}>
                      {idx + 1}
                    </td>

                    {/* OEM Name */}
                    <td className="p-2 font-semibold">
                      {isEditing && editOem ? (
                        <input
                          type="text"
                          value={editOem.oemName}
                          onChange={(e) => setEditOem({ ...editOem, oemName: e.target.value })}
                          className={`w-full px-2 py-1 rounded text-xs border ${
                            isDark ? "bg-[#0b1322] border-[#38bdf8] text-white" : "bg-white border-sky-500 text-slate-900"
                          }`}
                        />
                      ) : (
                        <span className={isDark ? "text-white" : "text-slate-900"}>{row.oemName}</span>
                      )}
                    </td>

                    {/* OEM Final */}
                    <td className="p-2">
                      {isEditing && editOem ? (
                        <input
                          type="text"
                          value={editOem.oemFinal}
                          onChange={(e) => setEditOem({ ...editOem, oemFinal: e.target.value })}
                          className={`w-full px-2 py-1 rounded text-xs border ${
                            isDark ? "bg-[#0b1322] border-[#38bdf8] text-white" : "bg-white border-sky-500 text-slate-900"
                          }`}
                        />
                      ) : (
                        <span className={`font-medium ${isDark ? "text-[#94a3b8]" : "text-slate-600"}`}>
                          {row.oemFinal || "-"}
                        </span>
                      )}
                    </td>

                    {/* OEM Group */}
                    <td className="p-2">
                      {isEditing && editOem ? (
                        <select
                          value={editOem.oemGroup}
                          onChange={(e) => setEditOem({ ...editOem, oemGroup: e.target.value })}
                          className={`w-full px-2 py-1 rounded text-xs border ${
                            isDark ? "bg-[#0b1322] border-[#38bdf8] text-white" : "bg-white border-sky-500 text-slate-900"
                          }`}
                        >
                          {OEM_GROUP_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                            row.oemGroup === "M&M"
                              ? "bg-red-500/20 text-red-400 border border-red-500/40"
                              : isDark
                              ? "bg-slate-800 text-slate-300"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {row.oemGroup}
                        </span>
                      )}
                    </td>

                    {/* OEM Grouping */}
                    <td className="p-2">
                      {isEditing && editOem ? (
                        <select
                          value={editOem.oemGrouping}
                          onChange={(e) => setEditOem({ ...editOem, oemGrouping: e.target.value })}
                          className={`w-full px-2 py-1 rounded text-xs border ${
                            isDark ? "bg-[#0b1322] border-[#38bdf8] text-white" : "bg-white border-sky-500 text-slate-900"
                          }`}
                        >
                          {OEM_GROUPING_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                            row.oemGrouping === "Mahindra"
                              ? "bg-red-500/20 text-red-400 border border-red-500/40"
                              : row.oemGrouping === "Maruti"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                              : row.oemGrouping === "Hyundai"
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                              : row.oemGrouping === "Tata"
                              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40"
                              : row.oemGrouping === "Toyota"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : row.oemGrouping === "Premium"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                              : isDark
                              ? "bg-slate-800 text-slate-300"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {row.oemGrouping}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={handleSaveEditOem}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                            title="Save changes"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingIndex(null);
                              setEditOem(null);
                            }}
                            className={`p-1 rounded ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-700"}`}
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingIndex(idx);
                              setEditOem({ ...row });
                            }}
                            className={`p-1 rounded transition ${
                              isDark
                                ? "hover:bg-[#1e293b] text-[#38bdf8]"
                                : "hover:bg-slate-100 text-sky-600"
                            }`}
                            title="Edit this OEM mapping"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOem(idx, row.oemName)}
                            className={`p-1 rounded transition ${
                              isDark
                                ? "hover:bg-red-950/60 text-red-400 hover:text-red-300"
                                : "hover:bg-red-50 text-red-600 hover:text-red-700"
                            }`}
                            title="Delete this OEM mapping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* RTO DATABASE TABLE */
        <div className={`overflow-auto rounded-lg border max-h-[600px] ${
          isDark ? "border-[#1e2d4a] bg-[#070c17]" : "border-slate-200 bg-white"
        }`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-10 font-bold border-b text-[11px] ${
              isDark ? "bg-[#0f172a] text-[#38bdf8] border-[#1e2d4a]" : "bg-slate-100 text-slate-700 border-slate-300"
            }`}>
              <tr>
                <th className="p-2 w-12 text-center">#</th>
                <th className="p-2">SRT Office</th>
                <th className="p-2">Final RTO Name</th>
                <th className="p-2 w-44">Revenue District</th>
                <th className="p-2 w-36">Territory</th>
                <th className="p-2 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-[#131f33]" : "divide-slate-200"}`}>
              {filteredRtos.map((row, idx) => {
                const isEditing = editingIndex === idx;
                return (
                  <tr
                    key={idx}
                    className={`transition ${
                      isEditing
                        ? isDark
                          ? "bg-[#1e3a8a]/30"
                          : "bg-sky-50"
                        : idx % 2 === 0
                        ? isDark
                          ? "bg-[#070d18] hover:bg-[#0c1424]"
                          : "bg-white hover:bg-slate-50"
                        : isDark
                        ? "bg-[#0a1120] hover:bg-[#0f192e]"
                        : "bg-slate-50/60 hover:bg-slate-100"
                    }`}
                  >
                    <td className={`p-2 text-center font-mono text-[10px] ${isDark ? "text-[#64748b]" : "text-slate-400"}`}>
                      {idx + 1}
                    </td>

                    {/* SRT Office */}
                    <td className="p-2 font-medium">
                      {isEditing && editRto ? (
                        <input
                          type="text"
                          value={editRto.srtOffice}
                          onChange={(e) => setEditRto({ ...editRto, srtOffice: e.target.value })}
                          className={`w-full px-2 py-1 rounded text-xs border ${
                            isDark ? "bg-[#0b1322] border-[#38bdf8] text-white" : "bg-white border-sky-500 text-slate-900"
                          }`}
                        />
                      ) : (
                        <span className={isDark ? "text-[#94a3b8]" : "text-slate-600"}>{row.srtOffice}</span>
                      )}
                    </td>

                    {/* Final RTO Name */}
                    <td className="p-2 font-semibold">
                      {isEditing && editRto ? (
                        <input
                          type="text"
                          value={editRto.finalRtoName}
                          onChange={(e) => setEditRto({ ...editRto, finalRtoName: e.target.value })}
                          className={`w-full px-2 py-1 rounded text-xs border ${
                            isDark ? "bg-[#0b1322] border-[#38bdf8] text-white" : "bg-white border-sky-500 text-slate-900"
                          }`}
                        />
                      ) : (
                        <span className={isDark ? "text-white" : "text-slate-900"}>{row.finalRtoName}</span>
                      )}
                    </td>

                    {/* District */}
                    <td className="p-2">
                      {isEditing && editRto ? (
                        <select
                          value={editRto.district}
                          onChange={(e) => setEditRto({ ...editRto, district: e.target.value })}
                          className={`w-full px-2 py-1 rounded text-xs border ${
                            isDark ? "bg-[#0b1322] border-[#38bdf8] text-white" : "bg-white border-sky-500 text-slate-900"
                          }`}
                        >
                          {DISTRICT_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`font-semibold ${isDark ? "text-[#38bdf8]" : "text-sky-700"}`}>
                          {row.district}
                        </span>
                      )}
                    </td>

                    {/* Territory */}
                    <td className="p-2">
                      {isEditing && editRto ? (
                        <select
                          value={editRto.territory}
                          onChange={(e) => setEditRto({ ...editRto, territory: e.target.value })}
                          className={`w-full px-2 py-1 rounded text-xs border ${
                            isDark ? "bg-[#0b1322] border-[#38bdf8] text-white" : "bg-white border-sky-500 text-slate-900"
                          }`}
                        >
                          {TERRITORY_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                            row.territory === "North Kerala"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          }`}
                        >
                          {row.territory}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={handleSaveEditRto}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                            title="Save changes"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingIndex(null);
                              setEditRto(null);
                            }}
                            className={`p-1 rounded ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-700"}`}
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingIndex(idx);
                              setEditRto({ ...row });
                            }}
                            className={`p-1 rounded transition ${
                              isDark
                                ? "hover:bg-[#1e293b] text-[#38bdf8]"
                                : "hover:bg-slate-100 text-sky-600"
                            }`}
                            title="Edit this RTO mapping"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRto(idx, row.finalRtoName)}
                            className={`p-1 rounded transition ${
                              isDark
                                ? "hover:bg-red-950/60 text-red-400 hover:text-red-300"
                                : "hover:bg-red-50 text-red-600 hover:text-red-700"
                            }`}
                            title="Delete this RTO"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Footer Summary Stats */}
      <div className={`flex items-center justify-between text-[11px] pt-1 ${
        isDark ? "text-[#64748b]" : "text-slate-500"
      }`}>
        <span>
          Showing {activeTab === "oem" ? filteredOems.length : filteredRtos.length} of{" "}
          {activeTab === "oem" ? oemList.length : rtoList.length} records
        </span>
        <span>
          Auto-saved to Browser Storage • Changes immediately reflect in Executive Dashboard
        </span>
      </div>

      {/* 5. ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-xl border p-5 shadow-2xl transition ${
            isDark ? "bg-[#0b1322] border-[#1e2d4a] text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2f4c]/60 mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#38bdf8]" />
                {activeTab === "oem" ? "Add New OEM Mapping (OEM_DB)" : "Add New RTO Mapping (RTO_DT)"}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`p-1 rounded transition ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeTab === "oem" ? (
              <form onSubmit={handleAddOem} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">
                    OEM Name (Exact raw string from Vahan Portal) <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TESLA MOTORS INDIA PVT LTD"
                    value={newOem.oemName}
                    onChange={(e) => setNewOem({ ...newOem, oemName: e.target.value })}
                    className={`w-full px-3 py-2 rounded text-xs border focus:outline-none ${
                      isDark ? "bg-[#070d18] border-[#1f2f4c] text-white focus:border-[#38bdf8]" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">OEM Final (Standardized Clean Name):</label>
                  <input
                    type="text"
                    placeholder="e.g. TESLA INDIA"
                    value={newOem.oemFinal}
                    onChange={(e) => setNewOem({ ...newOem, oemFinal: e.target.value })}
                    className={`w-full px-3 py-2 rounded text-xs border focus:outline-none ${
                      isDark ? "bg-[#070d18] border-[#1f2f4c] text-white focus:border-[#38bdf8]" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold block mb-1">OEM Group:</label>
                    <select
                      value={newOem.oemGroup}
                      onChange={(e) => setNewOem({ ...newOem, oemGroup: e.target.value })}
                      className={`w-full px-3 py-2 rounded text-xs border focus:outline-none ${
                        isDark ? "bg-[#070d18] border-[#1f2f4c] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                    >
                      {OEM_GROUP_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">OEM Grouping:</label>
                    <select
                      value={newOem.oemGrouping}
                      onChange={(e) => setNewOem({ ...newOem, oemGrouping: e.target.value })}
                      className={`w-full px-3 py-2 rounded text-xs border focus:outline-none ${
                        isDark ? "bg-[#070d18] border-[#1f2f4c] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                    >
                      {OEM_GROUPING_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2f4c]/60 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${
                      isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow"
                  >
                    Save OEM Mapping
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddRto} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Final RTO Name <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kanhangad"
                    value={newRto.finalRtoName}
                    onChange={(e) => setNewRto({ ...newRto, finalRtoName: e.target.value })}
                    className={`w-full px-3 py-2 rounded text-xs border focus:outline-none ${
                      isDark ? "bg-[#070d18] border-[#1f2f4c] text-white focus:border-[#38bdf8]" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">SRT Office:</label>
                  <input
                    type="text"
                    placeholder="e.g. Kanhangad SRTO"
                    value={newRto.srtOffice}
                    onChange={(e) => setNewRto({ ...newRto, srtOffice: e.target.value })}
                    className={`w-full px-3 py-2 rounded text-xs border focus:outline-none ${
                      isDark ? "bg-[#070d18] border-[#1f2f4c] text-white focus:border-[#38bdf8]" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold block mb-1">Revenue District:</label>
                    <select
                      value={newRto.district}
                      onChange={(e) => setNewRto({ ...newRto, district: e.target.value })}
                      className={`w-full px-3 py-2 rounded text-xs border focus:outline-none ${
                        isDark ? "bg-[#070d18] border-[#1f2f4c] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                    >
                      {DISTRICT_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">Territory:</label>
                    <select
                      value={newRto.territory}
                      onChange={(e) => setNewRto({ ...newRto, territory: e.target.value })}
                      className={`w-full px-3 py-2 rounded text-xs border focus:outline-none ${
                        isDark ? "bg-[#070d18] border-[#1f2f4c] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                    >
                      {TERRITORY_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2f4c]/60 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${
                      isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow"
                  >
                    Save RTO Mapping
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

