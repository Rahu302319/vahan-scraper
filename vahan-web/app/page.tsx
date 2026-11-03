"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play, Pause, Square, RotateCw, Download, Settings,
  Search, CheckSquare, Square as UncheckedSquare,
  Activity, Car, Building2, Trophy, AlertTriangle, FileSpreadsheet,
  CheckCircle2, Folder, FolderOpen, ExternalLink, HardDrive, ShieldCheck, Zap
} from "lucide-react";
import {
  RTOItem, RTORowData, DEFAULT_VH_CATG, ALL_VH_CATG, ALL_VH_CATG_DICT,
  DEFAULT_FUELS, ALL_FUELS_DICT, ALL_NORMS_DICT, ALL_VHCLASS_DICT, YAXIS_OPTIONS
} from "@/lib/vahan";

interface RTORecordState {
  item: RTOItem;
  status: "pending" | "fetching" | "retry" | "done" | "failed";
  retryAttempt?: number;
  makerCount?: number;
  totalVehicles?: number;
  error?: string;
  data?: RTORowData[];
}

export default function VahanDashboardPage() {
  const [rtos, setRtos] = useState<RTORecordState[]>([]);
  const [selectedRtoTarget, setSelectedRtoTarget] = useState<string>("ALL");
  const [year, setYear] = useState<string>("2026");
  const [yaxis, setYaxis] = useState<string>("Maker");
  const [concurrency, setConcurrency] = useState<number>(6);
  const [selectedRtosMap, setSelectedRtosMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activePreviewRTO, setActivePreviewRTO] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "summary" | "logs">("preview");

  // Output Path Selection Option
  const [outputPath, setOutputPath] = useState<string>("C:\\Users\\Rah\\Desktop\\NEW VAHAN\\output");
  const [pathSaveStatus, setPathSaveStatus] = useState<string>("Ready (Saves to local disk)");

  // Filter state
  const [vhCatg, setVhCatg] = useState<string[]>(DEFAULT_VH_CATG);
  const [fuels, setFuels] = useState<string[]>(DEFAULT_FUELS);
  const [norms, setNorms] = useState<string[]>([]);
  const [vhClass, setVhClass] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<"catg" | "fuels" | "norms" | "class">("catg");

  // Scraper execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isStoppedRef = useRef<boolean>(false);

  // Progress metrics
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalToProcess, setTotalToProcess] = useState<number>(0);
  const [speedStr, setSpeedStr] = useState<string>("0.0 RTOs/s");
  const [etaStr, setEtaStr] = useState<string>("--:--");
  const [logs, setLogs] = useState<{ time: string; level: string; msg: string }[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, level: "INFO" | "SUCCESS" | "WARNING" | "ERROR" = "INFO") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, level, msg }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Load Kerala RTOs on initial mount
  useEffect(() => {
    async function loadRTOs() {
      addLog("Connecting to Vahan Parivahan portal...", "INFO");
      try {
        const resp = await fetch("/api/rtos?state=KL");
        const json = await resp.json();
        if (json.success && json.rtos) {
          const list: RTORecordState[] = json.rtos.map((r: RTOItem) => ({
            item: r,
            status: "pending",
          }));
          setRtos(list);
          const selMap: Record<string, boolean> = {};
          list.forEach((r) => {
            selMap[r.item.code] = true;
          });
          setSelectedRtosMap(selMap);
          addLog(`✓ Successfully loaded all ${list.length} Kerala RTOs from portal!`, "SUCCESS");
        } else {
          addLog(`Error loading RTOs: ${json.error}`, "ERROR");
        }
      } catch (err: any) {
        addLog(`Network connection error: ${err.message}`, "ERROR");
      }
    }
    loadRTOs();
  }, []);

  // When RTO Target Dropdown changes
  const handleRtoTargetChange = (target: string) => {
    setSelectedRtoTarget(target);
    const newMap: Record<string, boolean> = {};
    if (target === "ALL") {
      rtos.forEach((r) => {
        newMap[r.item.code] = true;
      });
    } else {
      rtos.forEach((r) => {
        newMap[r.item.code] = r.item.code === target;
      });
      setActivePreviewRTO(target);
    }
    setSelectedRtosMap(newMap);
  };

  const handleSelectAll = (check: boolean) => {
    const newMap: Record<string, boolean> = {};
    rtos.forEach((r) => {
      newMap[r.item.code] = check;
    });
    setSelectedRtosMap(newMap);
    setSelectedRtoTarget(check ? "ALL" : "CUSTOM");
  };

  const toggleRowCheckbox = (code: string) => {
    setSelectedRtosMap((prev) => {
      const updated = { ...prev, [code]: !prev[code] };
      setSelectedRtoTarget("CUSTOM");
      return updated;
    });
  };

  // Browse Folder Picker Handler (triggers native Windows FolderBrowserDialog via server API)
  const handleBrowseFolder = async () => {
    addLog("Opening Windows Folder Browser Dialog...", "INFO");
    setPathSaveStatus("Selecting folder...");

    try {
      const resp = await fetch("/api/browse-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPath: outputPath }),
      });
      const data = await resp.json();

      if (data.success && data.path) {
        setOutputPath(data.path);
        addLog(`✓ Output directory set to: ${data.path}`, "SUCCESS");
        setPathSaveStatus(`✓ Path selected: ${data.path}`);
      } else if (data.cancelled) {
        setPathSaveStatus("Selection cancelled");
      } else {
        // Fallback: prompt user for folder path
        const manual = prompt("Enter full folder path to save data:", outputPath);
        if (manual && manual.trim()) {
          setOutputPath(manual.trim());
          addLog(`Output path set to: ${manual.trim()}`, "INFO");
          setPathSaveStatus(`✓ Path set to: ${manual.trim()}`);
        }
      }
    } catch (e: any) {
      const manual = prompt("Enter full folder path to save data:", outputPath);
      if (manual && manual.trim()) {
        setOutputPath(manual.trim());
        addLog(`Output path set to: ${manual.trim()}`, "INFO");
        setPathSaveStatus(`✓ Path set to: ${manual.trim()}`);
      }
    }
  };

  // Open the selected output folder in Windows File Explorer
  const handleOpenFolder = async () => {
    try {
      const resp = await fetch("/api/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDir: outputPath }),
      });
      const json = await resp.json();
      if (json.success) {
        addLog(`📂 Opened directory in Explorer: ${json.openedPath}`, "SUCCESS");
      } else {
        addLog(`Error opening folder: ${json.error}`, "ERROR");
      }
    } catch (e: any) {
      addLog(`Error opening folder: ${e.message}`, "ERROR");
    }
  };

  // Start Scraper with Concurrency, 3 Auto-Retries & Live Disk Saving
  const startScraping = async (retryOnlyFailed: boolean = false) => {
    if (isRunning) return;

    let targets = rtos.filter((r) => selectedRtosMap[r.item.code]);
    if (retryOnlyFailed) {
      targets = rtos.filter((r) => r.status === "failed");
    }

    if (targets.length === 0) {
      alert("Please select at least one RTO to run.");
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isStoppedRef.current = false;

    setProcessedCount(0);
    setTotalToProcess(targets.length);
    addLog(`🚀 Starting Ultrafast batch scraper for ${targets.length} RTO(s) [Concurrency: ${concurrency} workers, Year: ${year}]...`, "SUCCESS");
    addLog(`💾 All data files will be written to: ${outputPath}`, "INFO");

    const startTime = Date.now();
    let completed = 0;
    const queue = [...targets];
    const accumulatedRows: RTORowData[] = [];

    const worker = async (workerId: number) => {
      while (queue.length > 0 && !isStoppedRef.current) {
        // Handle pause
        while (isPausedRef.current && !isStoppedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        if (isStoppedRef.current) break;

        const target = queue.shift();
        if (!target) break;

        // Set status fetching
        setRtos((prev) =>
          prev.map((r) =>
            r.item.code === target.item.code ? { ...r, status: "fetching" } : r
          )
        );

        let success = false;
        let lastErr = "";
        let resultData: RTORowData[] = [];
        let totalV = 0;

        // 3 Auto-Retries
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (isStoppedRef.current) break;

          if (attempt > 1) {
            setRtos((prev) =>
              prev.map((r) =>
                r.item.code === target.item.code
                  ? { ...r, status: "retry", retryAttempt: attempt }
                  : r
              )
            );
            addLog(`🔄 [Worker ${workerId}] Auto-Retry ${attempt}/3 for ${target.item.code} (${target.item.name})...`, "WARNING");
            await new Promise((res) => setTimeout(res, 1200 * attempt));
          }

          try {
            const resp = await fetch("/api/scrape-rto", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                rtoValue: target.item.value,
                rtoCode: target.item.code,
                rtoName: target.item.name,
                year,
                yaxis,
                vhCatg,
                fuels,
                norms,
                vhClass,
                outputDir: outputPath, // Real-time disk writing!
              }),
            });

            const json = await resp.json();
            if (json.success && json.rows) {
              success = true;
              resultData = json.rows;
              totalV = json.totalVehicles || 0;
              accumulatedRows.push(...resultData);
              break;
            } else {
              lastErr = json.error || "Unknown server response";
            }
          } catch (err: any) {
            lastErr = err.message || "Network error";
          }
        }

        // Finalize RTO record in state
        setRtos((prev) =>
          prev.map((r) => {
            if (r.item.code === target.item.code) {
              if (success) {
                return {
                  ...r,
                  status: "done",
                  makerCount: resultData.length,
                  totalVehicles: totalV,
                  data: resultData,
                };
              } else {
                return {
                  ...r,
                  status: "failed",
                  error: lastErr,
                };
              }
            }
            return r;
          })
        );

        completed++;
        setProcessedCount(completed);

        if (success) {
          addLog(`✓ [${completed}/${targets.length}] ${target.item.code} — ${target.item.name}: ${resultData.length} makers, ${totalV.toLocaleString()} vehicles [Saved to: ${outputPath}]`, "SUCCESS");
          setActivePreviewRTO(target.item.code);
        } else {
          addLog(`✗ [${completed}/${targets.length}] ${target.item.code} failed after 3 attempts: ${lastErr}`, "ERROR");
        }

        // Speed & ETA calculation
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speed = completed / Math.max(0.1, elapsedSec);
        setSpeedStr(`${speed.toFixed(1)} RTOs/s`);
        const remItems = targets.length - completed;
        const etaSec = Math.round(remItems / Math.max(0.1, speed));
        const m = Math.floor(etaSec / 60);
        const s = etaSec % 60;
        setEtaStr(`${m}m ${s.toString().padStart(2, "0")}s`);
      }
    };

    // Run parallel workers
    const activeWorkers = Math.min(concurrency, targets.length);
    const workerPromises = Array.from({ length: activeWorkers }, (_, i) => worker(i + 1));
    await Promise.all(workerPromises);

    setIsRunning(false);
    setIsPaused(false);
    isPausedRef.current = false;
    isStoppedRef.current = false;

    const totalElapsedSec = Math.round((Date.now() - startTime) / 1000);
    const mins = Math.floor(totalElapsedSec / 60);
    const secs = totalElapsedSec % 60;
    addLog(`★ Scraping batch finished in ${mins}m ${secs}s!`, "SUCCESS");

    // Automatically generate Master Excel and Master CSV into the chosen output path!
    if (accumulatedRows.length > 0) {
      addLog(`Generating 3-sheet Master Consolidated Excel in ${outputPath}...`, "INFO");
      try {
        const localSaveResp = await fetch("/api/save-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allRows: accumulatedRows,
            year,
            targetDir: outputPath,
          }),
        });
        const saveJson = await localSaveResp.json();
        if (saveJson.success) {
          addLog(`★ Master Excel saved to disk: ${saveJson.savedXlsx}`, "SUCCESS");
          addLog(`★ Master CSV saved to disk:   ${saveJson.savedCsv}`, "SUCCESS");
          setPathSaveStatus("✓ Master Excel & CSV saved to disk!");
        }
      } catch (err: any) {
        addLog(`Notice on auto-saving master files: ${err.message}`, "WARNING");
      }
    }
  };

  const togglePause = () => {
    isPausedRef.current = !isPaused;
    setIsPaused(!isPaused);
    addLog(isPaused ? "Scraper resumed." : "Scraper paused.", "WARNING");
  };

  const stopScraping = () => {
    isStoppedRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
    addLog("Scraping stopped by user.", "WARNING");
  };

  // Download Master Excel & Save to Selected Path
  const downloadMasterExcel = async () => {
    const allRows: RTORowData[] = [];
    rtos.forEach((r) => {
      if (r.data && r.data.length > 0) {
        allRows.push(...r.data);
      }
    });

    if (allRows.length === 0) {
      alert("No data available yet. Please click 'START BATCH SCRAPER' first!");
      return;
    }

    try {
      addLog(`Generating 3-sheet Master Consolidated Excel (Saving to: ${outputPath})...`, "INFO");

      // 1. Save directly to chosen folder on disk
      try {
        const localSaveResp = await fetch("/api/save-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allRows,
            year,
            targetDir: outputPath,
          }),
        });
        const localSaveJson = await localSaveResp.json();
        if (localSaveJson.success) {
          addLog(`✓ Excel file saved directly to disk: ${localSaveJson.savedXlsx}`, "SUCCESS");
          setPathSaveStatus(`✓ Saved: ${localSaveJson.savedXlsx}`);
        }
      } catch (err: any) {
        console.warn("Server path save notice:", err);
      }

      // 2. Trigger instant browser download
      const resp = await fetch("/api/export-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allRows, year }),
      });

      if (!resp.ok) throw new Error("Export failed on server.");

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `KL_ALL_${rtos.filter((r) => r.data).length}_RTO_CONSOLIDATED_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      addLog("★ Master Consolidated Excel downloaded successfully to your browser!", "SUCCESS");
    } catch (e: any) {
      addLog(`Export error: ${e.message}`, "ERROR");
    }
  };

  // Filtered RTO rows
  const filteredRtos = rtos.filter(
    (r) =>
      r.item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active preview data
  const currentPreviewData = rtos.find((r) => r.item.code === activePreviewRTO)?.data || [];
  const currentPreviewRecord = rtos.find((r) => r.item.code === activePreviewRTO);

  // Consolidated summary calculation
  const totalVehiclesAll = rtos.reduce((sum, r) => sum + (r.totalVehicles || 0), 0);
  const completedRtosCount = rtos.filter((r) => r.status === "done").length;
  const failedRtosCount = rtos.filter((r) => r.status === "failed").length;

  return (
    <div className="flex flex-col min-h-screen p-2 sm:p-3 gap-2.5 max-w-[1750px] mx-auto bg-[#060911] text-[#cbd5e1]">
      {/* 1. Tactical Compact Header Bar */}
      <header className="flex flex-wrap items-center justify-between p-2.5 px-3.5 bg-gradient-to-r from-[#0a1120] to-[#0f1a30] border border-[#1e2c47] rounded-lg shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[#0284c7] text-white tracking-wider">
            KL • KERALA
          </span>
          <h1 className="text-base sm:text-lg font-extrabold text-[#38bdf8] tracking-wide flex items-center gap-2">
            <Car className="w-4 h-4 text-[#38bdf8]" />
            VAHAN 4 DASHBOARD — 87 RTO ENGINE
          </h1>
          <span className="hidden md:inline-block text-xs text-[#64748b]">
            | Maker Month-Wise Registration Analytics
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-[#064e3b]/60 text-[#34d399] border border-[#059669]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            Portal Online ({rtos.length} RTOs)
          </span>
          <button
            onClick={downloadMasterExcel}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-gradient-to-r from-[#065f46] to-[#047857] hover:from-[#047857] hover:to-[#059669] text-white border border-[#10b981] transition shadow"
          >
            <Download className="w-3.5 h-3.5" />
            Download Master Excel
          </button>
        </div>
      </header>

      {/* 2. Combat Control Deck (Two-Tier High-Density HUD) */}
      <section className="flex flex-col gap-2 p-2.5 bg-[#0b1222] border border-[#1c2a44] rounded-lg shadow-md">
        {/* Tier 1: Parameters + OUTPUT PATH SELECTION OPTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-end">
          {/* A. Target RTO Selection */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider">
              Target RTO Selection:
            </label>
            <select
              value={selectedRtoTarget}
              onChange={(e) => handleRtoTargetChange(e.target.value)}
              disabled={isRunning}
              className="w-full bg-[#070d1a] border border-[#1f2f4c] rounded px-2.5 py-1.5 text-xs font-semibold text-white focus:border-[#38bdf8] focus:outline-none"
            >
              <option value="ALL">🚀 ALL 87 Kerala RTOs (Sequential Batch)</option>
              {rtos.map((r) => (
                <option key={r.item.code} value={r.item.code}>
                  {r.item.code} — {r.item.name}
                </option>
              ))}
            </select>
          </div>

          {/* B. Select Year */}
          <div className="md:col-span-1 flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider">
              Year:
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={isRunning}
              className="w-full bg-[#070d1a] border border-[#1f2f4c] rounded px-2 py-1.5 text-xs font-semibold text-white focus:border-[#38bdf8] focus:outline-none"
            >
              {["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Dimension (Y-Axis) */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-[#38bdf8] uppercase tracking-wider">
              Dimension (Y-Axis):
            </label>
            <select
              value={yaxis}
              onChange={(e) => setYaxis(e.target.value)}
              disabled={isRunning}
              className="w-full bg-[#070d1a] border border-[#1f2f4c] rounded px-2 py-1.5 text-xs font-semibold text-[#38bdf8] focus:border-[#38bdf8] focus:outline-none"
            >
              {YAXIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* C. Speed Engine */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider">
              Speed Mode:
            </label>
            <select
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              disabled={isRunning}
              className="w-full bg-[#070d1a] border border-[#1f2f4c] rounded px-2 py-1.5 text-xs font-semibold text-white focus:border-[#38bdf8] focus:outline-none"
            >
              <option value={6}>⚡ ULTRAFAST (6 Workers)</option>
              <option value={8}>🚀 MAX TURBO (8 Workers)</option>
              <option value={4}>⚡ FAST (4 Workers)</option>
              <option value={1}>🐢 SAFE (1 Worker)</option>
            </select>
          </div>

          {/* D. Filter Parameters (Vehicle Categories & Fuels) */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider">
              Filter Parameters:
            </label>
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center justify-between w-full bg-[#152238] hover:bg-[#1e3152] border border-[#253757] rounded px-2.5 py-1.5 text-xs font-semibold text-[#cbd5e1] transition"
            >
              <span className="flex items-center gap-1.5 text-[11px] truncate">
                <Settings className="w-3.5 h-3.5 text-[#38bdf8]" />
                Filters ({vhCatg.length} Catg, {fuels.length} Fuels)
              </span>
              <span className="text-[9px] bg-[#0284c7]/20 text-[#38bdf8] px-1 py-0.5 rounded font-bold">
                LMV+LPV
              </span>
            </button>
          </div>

          {/* E. BROWSE PATH SELECTION OPTION (EXPLICIT FOLDER PICKER & DISPLAY) */}
          <div className="md:col-span-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-[#38bdf8]" />
                Browse Save Path (Excel & CSV Folder):
              </label>
              {pathSaveStatus && (
                <span className="text-[10px] font-semibold text-[#34d399] truncate max-w-[170px]">
                  {pathSaveStatus}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="C:\Users\...\Desktop\NEW VAHAN\output"
                className="flex-1 bg-[#070d1a] border border-[#1f2f4c] rounded px-2.5 py-1.5 text-xs font-mono text-[#7dd3fc] focus:border-[#38bdf8] focus:outline-none"
                title="Enter local disk path to save Excel and CSV output files"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded border border-[#3b82f6] transition whitespace-nowrap shadow"
                title="Click to browse and choose a folder from your PC"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Browse Path...
              </button>
              <button
                type="button"
                onClick={handleOpenFolder}
                className="flex items-center gap-1 px-2 py-1.5 bg-[#152238] hover:bg-[#1e3152] text-[#cbd5e1] text-xs font-bold rounded border border-[#253757] transition whitespace-nowrap"
                title="Open this folder in Windows File Explorer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Combat Command Action Toolbar & Telemetry Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#162238]">
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={() => startScraping(false)}
                className="flex items-center gap-2 py-1.5 px-4 rounded bg-gradient-to-r from-[#0284c7] to-[#0d9488] hover:from-[#0369a1] hover:to-[#0f766e] text-white font-extrabold text-xs border border-[#38bdf8] shadow-md transition"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                START BATCH SCRAPER
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className="flex items-center gap-1 py-1.5 px-3 rounded bg-[#92400e] hover:bg-[#78350f] text-white font-bold text-xs border border-[#d97706] transition"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={stopScraping}
                  className="flex items-center gap-1 py-1.5 px-3 rounded bg-[#991b1b] hover:bg-[#7f1d1d] text-white font-bold text-xs border border-[#dc2626] transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop
                </button>
              </>
            )}

            {failedRtosCount > 0 && !isRunning && (
              <button
                onClick={() => startScraping(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-bold text-xs border border-[#3b82f6] transition whitespace-nowrap"
              >
                <RotateCw className="w-3 h-3" />
                Retry Failed ({failedRtosCount})
              </button>
            )}

            <button
              onClick={downloadMasterExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#152238] hover:bg-[#1e3152] text-[#38bdf8] font-bold text-xs border border-[#253757] transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export Master Excel
            </button>
          </div>

          {/* Telemetry Live HUD Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-[#111c33] border border-[#1e2e4f] text-[#94a3b8] font-semibold text-[11px]">
              Queued: <strong className="text-white">{rtos.filter((r) => selectedRtosMap[r.item.code]).length}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-[#064e3b]/30 border border-[#059669] text-[#34d399] font-semibold text-[11px]">
              Done: <strong>{completedRtosCount}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-[#7f1d1d]/30 border border-[#dc2626] text-[#f87171] font-semibold text-[11px]">
              Failed: <strong>{failedRtosCount}</strong>
            </span>
            {isRunning && (
              <>
                <span className="px-2 py-0.5 rounded bg-[#0b1b33] border border-[#1e3a8a] text-[#38bdf8] font-semibold text-[11px] animate-pulse">
                  ⚡ {speedStr}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0b1b33] border border-[#1e3a8a] text-[#fbbf24] font-semibold text-[11px]">
                  ⏱ ETA: {etaStr}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 3. Central Studio Splitter (Left: RTO List, Right: Studio) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1">
        {/* Left: RTO Manager & Queue Table (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-[#090f1d] border border-[#19253d] rounded-lg p-2.5 shadow-md">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#64748b]" />
              <input
                type="text"
                placeholder="🔍 Quick Filter RTO (e.g. KL26, Adoor)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#070d18] border border-[#1c2b47] rounded pl-8 pr-2 py-1 text-xs text-white focus:border-[#38bdf8] focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleSelectAll(true)}
              className="text-[11px] px-2 py-1 bg-[#152238] hover:bg-[#1e3152] text-[#cbd5e1] font-bold rounded border border-[#253757]"
            >
              All
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="text-[11px] px-2 py-1 bg-[#152238] hover:bg-[#1e3152] text-[#cbd5e1] font-bold rounded border border-[#253757]"
            >
              Clear
            </button>
          </div>

          {/* Compact Tactical Table */}
          <div className="flex-1 overflow-auto rounded border border-[#1a2842] max-h-[580px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#0e172a] text-[#818cf8] font-bold border-b border-[#243555] z-10 text-[10px] uppercase">
                <tr>
                  <th className="p-1.5 w-7 text-center">✔</th>
                  <th className="p-1.5 w-14 text-center">Code</th>
                  <th className="p-1.5">RTO Office Name</th>
                  <th className="p-1.5 text-center w-24">Status</th>
                  <th className="p-1.5 text-right w-16">Vehicles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111a2d]">
                {filteredRtos.map((r, idx) => {
                  const isChecked = !!selectedRtosMap[r.item.code];
                  const isSelected = activePreviewRTO === r.item.code;
                  return (
                    <tr
                      key={r.item.code}
                      onClick={() => {
                        setActivePreviewRTO(r.item.code);
                        setActiveTab("preview");
                      }}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? "bg-[#1e3a8a]/40"
                          : idx % 2 === 0
                          ? "bg-[#070d18] hover:bg-[#101b33]"
                          : "bg-[#0c1424] hover:bg-[#14223d]"
                      }`}
                    >
                      <td
                        className="p-1.5 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowCheckbox(r.item.code);
                        }}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#38bdf8] inline" />
                        ) : (
                          <UncheckedSquare className="w-3.5 h-3.5 text-[#64748b] inline" />
                        )}
                      </td>
                      <td className="p-1.5 font-mono font-bold text-[#38bdf8] text-center text-[11px]">
                        {r.item.code}
                      </td>
                      <td className="p-1.5 text-[#e2e8f0] font-medium truncate max-w-[150px] text-[11px]">
                        {r.item.name}
                      </td>
                      <td className="p-1.5 text-center">
                        {r.status === "pending" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#111c33] text-[#64748b]">
                            Pending
                          </span>
                        )}
                        {r.status === "fetching" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0284c7]/20 text-[#38bdf8] border border-[#0284c7] animate-pulse">
                            Fetching...
                          </span>
                        )}
                        {r.status === "retry" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#92400e]/30 text-[#fbbf24] border border-[#d97706]">
                            Retry {r.retryAttempt}/3 🔄
                          </span>
                        )}
                        {r.status === "done" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#064e3b]/40 text-[#34d399] border border-[#059669]">
                            Done ✓
                          </span>
                        )}
                        {r.status === "failed" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#7f1d1d]/40 text-[#f87171] border border-[#dc2626]">
                            Failed (3x) ✗
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 text-right font-mono font-bold text-[#f1f5f9] text-[11px]">
                        {r.totalVehicles ? r.totalVehicles.toLocaleString() : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#64748b] pt-1.5">
            <span>Loaded: {rtos.length} Kerala RTOs</span>
            <span>Selected: {rtos.filter((r) => selectedRtosMap[r.item.code]).length}</span>
          </div>
        </div>

        {/* Right: Studio (Live Preview, Summary, Logs) (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-[#090f1d] border border-[#19253d] rounded-lg p-2.5 shadow-md">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-[#1a2842] pb-1.5 mb-2">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition ${
                activeTab === "preview"
                  ? "bg-[#0b152b] text-[#38bdf8] border border-[#38bdf8]"
                  : "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#0c1424]"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Live Data Preview
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition ${
                activeTab === "summary"
                  ? "bg-[#0b152b] text-[#38bdf8] border border-[#38bdf8]"
                  : "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#0c1424]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              State Summary
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition ${
                activeTab === "logs"
                  ? "bg-[#0b152b] text-[#38bdf8] border border-[#38bdf8]"
                  : "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#0c1424]"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Execution Log
            </button>
          </div>

          {/* TAB 1: Live Data Preview */}
          {activeTab === "preview" && (
            <div className="flex flex-col gap-2 flex-1">
              {/* Compact HUD KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 bg-gradient-to-r from-[#0c1424] to-[#101b33] border-l-2 border-[#38bdf8] border border-[#1e2e4f] rounded">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
                    Active Office
                  </span>
                  <span className="text-sm font-extrabold text-[#38bdf8] truncate block">
                    {currentPreviewRecord?.item.name || "None Selected"}
                  </span>
                </div>
                <div className="p-2 bg-gradient-to-r from-[#0c1424] to-[#101b33] border-l-2 border-[#a78bfa] border border-[#1e2e4f] rounded">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
                    Active {yaxis}s
                  </span>
                  <span className="text-sm font-extrabold text-[#a78bfa]">
                    {currentPreviewData.length}
                  </span>
                </div>
                <div className="p-2 bg-gradient-to-r from-[#0c1424] to-[#101b33] border-l-2 border-[#34d399] border border-[#1e2e4f] rounded">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
                    Total Vehicles
                  </span>
                  <span className="text-sm font-extrabold text-[#34d399]">
                    {(currentPreviewRecord?.totalVehicles || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-gradient-to-r from-[#0c1424] to-[#101b33] border-l-2 border-[#fbbf24] border border-[#1e2e4f] rounded">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
                    Top {yaxis}
                  </span>
                  <span className="text-sm font-extrabold text-[#fbbf24] truncate block">
                    {currentPreviewData.length > 0
                      ? (currentPreviewData[0][yaxis] || currentPreviewData[0].Maker)?.substring(0, 20)
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto rounded border border-[#1a2842] max-h-[500px]">
                {currentPreviewData.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#0e172a] text-[#818cf8] font-bold border-b border-[#243555] z-10 text-[10px]">
                      <tr>
                        <th className="p-1.5 text-center w-10">#</th>
                        <th className="p-1.5">{yaxis}</th>
                        {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map(
                          (m) => (
                            <th key={m} className="p-1.5 text-right w-11">
                              {m}
                            </th>
                          )
                        )}
                        <th className="p-1.5 text-right font-extrabold text-[#38bdf8] w-14">
                          TOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111a2d]">
                      {currentPreviewData.map((row, idx) => (
                        <tr
                          key={idx}
                          className={idx % 2 === 0 ? "bg-[#070d18]" : "bg-[#0c1424]"}
                        >
                          <td className="p-1.5 text-center text-[#64748b] font-mono text-[10px]">
                            {row.S_No}
                          </td>
                          <td className="p-1.5 font-semibold text-white truncate max-w-[200px] text-[11px]">
                            {row[yaxis] || row.Maker}
                          </td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.JAN || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.FEB || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.MAR || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.APR || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.MAY || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.JUN || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.JUL || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.AUG || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.SEP || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.OCT || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.NOV || 0}</td>
                          <td className="p-1.5 text-right font-mono text-[#cbd5e1] text-[11px]">{row.DEC || 0}</td>
                          <td className="p-1.5 text-right font-mono font-bold text-[#38bdf8] text-[11px]">
                            {(row.TOTAL || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-[#64748b] gap-2">
                    <Activity className="w-8 h-8 text-[#334155] animate-pulse" />
                    <p className="text-xs">
                      {currentPreviewRecord
                        ? `Office ${currentPreviewRecord.item.code} (${currentPreviewRecord.item.name}) selected. Click 'START BATCH SCRAPER' to fetch data.`
                        : "Click any completed RTO on the left table to view its Maker Month-Wise data."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: State Consolidated Summary */}
          {activeTab === "summary" && (
            <div className="flex flex-col gap-2 flex-1">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-[#0c1424] border-l-2 border-[#34d399] border border-[#1e2e4f] rounded">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase block">
                    Kerala Grand Total
                  </span>
                  <span className="text-base font-extrabold text-[#34d399]">
                    {totalVehiclesAll.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-[#0c1424] border-l-2 border-[#38bdf8] border border-[#1e2e4f] rounded">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase block">
                    Completed RTOs
                  </span>
                  <span className="text-base font-extrabold text-[#38bdf8]">
                    {completedRtosCount} / {rtos.length}
                  </span>
                </div>
                <div className="p-2 bg-[#0c1424] border-l-2 border-[#a78bfa] border border-[#1e2e4f] rounded">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase block">
                    Export Output Path
                  </span>
                  <span className="text-xs font-mono font-bold text-[#7dd3fc] truncate block">
                    {outputPath}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto rounded border border-[#1a2842] max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#0e172a] text-[#818cf8] font-bold border-b border-[#243555] z-10 text-[10px] uppercase">
                    <tr>
                      <th className="p-1.5 w-16 text-center">Code</th>
                      <th className="p-1.5">RTO Office Name</th>
                      <th className="p-1.5 text-center w-24">Makers Count</th>
                      <th className="p-1.5 text-right w-24 text-[#34d399]">Total Vehicles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111a2d]">
                    {rtos
                      .filter((r) => r.status === "done")
                      .sort((a, b) => (b.totalVehicles || 0) - (a.totalVehicles || 0))
                      .map((r, idx) => (
                        <tr
                          key={r.item.code}
                          className={idx % 2 === 0 ? "bg-[#070d18]" : "bg-[#0c1424]"}
                        >
                          <td className="p-1.5 font-mono font-bold text-[#38bdf8] text-center text-[11px]">
                            {r.item.code}
                          </td>
                          <td className="p-1.5 text-[#e2e8f0] font-medium text-[11px]">
                            {r.item.name}
                          </td>
                          <td className="p-1.5 text-center font-mono text-[#a78bfa] text-[11px]">
                            {r.makerCount}
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-[#34d399] text-[11px]">
                            {(r.totalVehicles || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Execution Log */}
          {activeTab === "logs" && (
            <div className="flex flex-col flex-1 gap-2">
              <div className="flex items-center justify-between text-[11px] text-[#64748b]">
                <span>Real-Time Engine Log:</span>
                <button
                  onClick={() => setLogs([])}
                  className="px-2 py-0.5 bg-[#152238] hover:bg-[#1e3152] text-[#cbd5e1] rounded border border-[#253757]"
                >
                  Clear Log
                </button>
              </div>
              <div className="flex-1 bg-[#04070e] border border-[#162238] rounded p-2.5 overflow-auto font-mono text-xs max-h-[500px]">
                {logs.map((l, i) => {
                  const color =
                    l.level === "SUCCESS"
                      ? "text-[#34d399]"
                      : l.level === "WARNING"
                      ? "text-[#fbbf24]"
                      : l.level === "ERROR"
                      ? "text-[#f87171]"
                      : "text-[#94a3b8]";
                  return (
                    <div key={i} className="py-0.5 leading-relaxed">
                      <span className="text-[#64748b]">[{l.time}]</span>{" "}
                      <span className={`font-bold ${color}`}>[{l.level}]</span>{" "}
                      <span className="text-[#e2e8f0]">{l.msg}</span>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Slim Tactical Progress Telemetry Bar */}
      <footer className="flex flex-col gap-1 p-2 bg-[#090f1d] border border-[#19253d] rounded-lg shadow-md">
        <div className="w-full bg-[#070d18] rounded border border-[#1a2944] h-[18px] overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#0284c7] via-[#06b6d4] to-[#10b981] transition-all duration-300"
            style={{
              width: `${totalToProcess > 0 ? (processedCount / totalToProcess) * 100 : 0}%`,
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white">
            Progress: {processedCount} / {totalToProcess} ({totalToProcess > 0 ? Math.round((processedCount / totalToProcess) * 100) : 0}%)
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#64748b]">
          <span>
            {isRunning
              ? `⚡ Scraping Kerala RTOs in parallel (${speedStr})... Data saving to: ${outputPath}`
              : `Ready. Data will be saved to: ${outputPath}`}
          </span>
          <span className="font-mono font-bold text-[#38bdf8]">
            ETA: {etaStr}
          </span>
        </div>
      </footer>

      {/* Filter Modal Dialog */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1222] border border-[#1c2a44] rounded-xl max-w-3xl w-full p-4 shadow-2xl flex flex-col gap-3 max-h-[88vh]">
            <div className="flex items-center justify-between border-b border-[#162238] pb-2">
              <h2 className="text-sm font-extrabold text-[#38bdf8] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#38bdf8]" />
                Filter Parameters (Vehicle Categories & Fuels)
              </h2>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="text-[#64748b] hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Filter Sub-Tabs */}
            <div className="flex gap-1 border-b border-[#1c2a44] pb-1">
              <button
                onClick={() => setFilterTab("catg")}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  filterTab === "catg"
                    ? "bg-[#0284c7] text-white"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                }`}
              >
                Vehicle Categories ({vhCatg.length})
              </button>
              <button
                onClick={() => setFilterTab("fuels")}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  filterTab === "fuels"
                    ? "bg-[#0284c7] text-white"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                }`}
              >
                Fuel Types ({fuels.length})
              </button>
              <button
                onClick={() => setFilterTab("norms")}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  filterTab === "norms"
                    ? "bg-[#0284c7] text-white"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                }`}
              >
                Norms ({norms.length > 0 ? `${norms.length} filtered` : "All"})
              </button>
              <button
                onClick={() => setFilterTab("class")}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  filterTab === "class"
                    ? "bg-[#0284c7] text-white"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                }`}
              >
                Vehicle Classes ({vhClass.length > 0 ? `${vhClass.length} filtered` : "All"})
              </button>
            </div>

            <div className="flex-1 overflow-auto flex flex-col gap-3 pr-1 text-xs">
              {/* Tab 1: Vehicle Categories */}
              {filterTab === "catg" && (
                <div className="flex flex-col gap-2.5">
                  <div className="p-2.5 bg-[#0284c7]/10 border border-[#0284c7]/40 rounded text-[11px] text-[#7dd3fc] font-semibold flex items-center justify-between">
                    <span>
                      ⭐ <strong>Default Required:</strong> LIGHT MOTOR VEHICLE (LMV) & LIGHT PASSENGER VEHICLE (LPV)
                    </span>
                    <button
                      onClick={() => setVhCatg(DEFAULT_VH_CATG)}
                      className="px-2 py-0.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded text-[10px]"
                    >
                      Reset to LMV + LPV
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVhCatg(ALL_VH_CATG)}
                      className="px-2 py-1 bg-[#152238] hover:bg-[#1e3152] rounded text-[10px] text-[#94a3b8]"
                    >
                      Select All ({ALL_VH_CATG.length})
                    </button>
                    <button
                      onClick={() => setVhCatg([])}
                      className="px-2 py-1 bg-[#152238] hover:bg-[#1e3152] rounded text-[10px] text-[#94a3b8]"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#070d18] p-3 rounded border border-[#1a2842] max-h-[380px] overflow-auto">
                    {/* Priority LMV & LPV first */}
                    {(['LMV', 'LPV', ...ALL_VH_CATG.filter(c => !['LMV', 'LPV'].includes(c))]).map((catg) => {
                      const isDefault = DEFAULT_VH_CATG.includes(catg);
                      const fullName = ALL_VH_CATG_DICT[catg] || catg;
                      return (
                        <label
                          key={catg}
                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-[11px] border transition ${
                            isDefault
                              ? "bg-[#0e1f38] border-[#0284c7]/50 text-[#38bdf8] font-bold"
                              : "bg-[#0b1424] border-[#16233a] text-[#cbd5e1] hover:border-[#253757]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={vhCatg.includes(catg)}
                            onChange={(e) => {
                              if (e.target.checked) setVhCatg([...vhCatg, catg]);
                              else setVhCatg(vhCatg.filter((c) => c !== catg));
                            }}
                            className="rounded border-[#1f2f4c] text-[#0284c7]"
                          />
                          <span className="truncate">
                            {isDefault ? "⭐ " : ""}{fullName} ({catg})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Fuel Types */}
              {filterTab === "fuels" && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#818cf8] uppercase">
                      Select Fuel Types ({fuels.length} / {Object.keys(ALL_FUELS_DICT).length} Active)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFuels(DEFAULT_FUELS)}
                        className="px-2 py-0.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded text-[10px]"
                      >
                        Reset to 34 Fuels
                      </button>
                      <button
                        onClick={() => setFuels(Object.keys(ALL_FUELS_DICT))}
                        className="px-2 py-0.5 bg-[#152238] hover:bg-[#1e3152] rounded text-[10px] text-[#94a3b8]"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setFuels([])}
                        className="px-2 py-0.5 bg-[#152238] hover:bg-[#1e3152] rounded text-[10px] text-[#94a3b8]"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-[#070d18] p-3 rounded border border-[#1a2842] max-h-[380px] overflow-auto">
                    {Object.entries(ALL_FUELS_DICT).map(([code, name]) => (
                      <label key={code} className="flex items-center gap-1.5 p-1 rounded hover:bg-[#0f1b30] cursor-pointer text-[11px] text-[#cbd5e1]">
                        <input
                          type="checkbox"
                          checked={fuels.includes(code)}
                          onChange={(e) => {
                            if (e.target.checked) setFuels([...fuels, code]);
                            else setFuels(fuels.filter((f) => f !== code));
                          }}
                          className="rounded border-[#1f2f4c] text-[#0284c7]"
                        />
                        <span className="truncate">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Norms */}
              {filterTab === "norms" && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#818cf8] uppercase">
                      Emission Norms ({norms.length > 0 ? `${norms.length} filtered` : "All Norms"})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNorms(Object.keys(ALL_NORMS_DICT))}
                        className="px-2 py-0.5 bg-[#152238] hover:bg-[#1e3152] rounded text-[10px] text-[#94a3b8]"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setNorms([])}
                        className="px-2 py-0.5 bg-[#152238] hover:bg-[#1e3152] rounded text-[10px] text-[#94a3b8]"
                      >
                        Clear All (No Filter)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-[#070d18] p-3 rounded border border-[#1a2842] max-h-[380px] overflow-auto">
                    {Object.entries(ALL_NORMS_DICT).map(([code, name]) => (
                      <label key={code} className="flex items-center gap-1.5 p-1 rounded hover:bg-[#0f1b30] cursor-pointer text-[11px] text-[#cbd5e1]">
                        <input
                          type="checkbox"
                          checked={norms.includes(code)}
                          onChange={(e) => {
                            if (e.target.checked) setNorms([...norms, code]);
                            else setNorms(norms.filter((n) => n !== code));
                          }}
                          className="rounded border-[#1f2f4c] text-[#0284c7]"
                        />
                        <span className="truncate">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Vehicle Classes */}
              {filterTab === "class" && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#818cf8] uppercase">
                      Vehicle Classes ({vhClass.length > 0 ? `${vhClass.length} filtered` : "All Classes"})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setVhClass(Object.keys(ALL_VHCLASS_DICT))}
                        className="px-2 py-0.5 bg-[#152238] hover:bg-[#1e3152] rounded text-[10px] text-[#94a3b8]"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setVhClass([])}
                        className="px-2 py-0.5 bg-[#152238] hover:bg-[#1e3152] rounded text-[10px] text-[#94a3b8]"
                      >
                        Clear All (No Filter)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-[#070d18] p-3 rounded border border-[#1a2842] max-h-[380px] overflow-auto">
                    {Object.entries(ALL_VHCLASS_DICT).map(([code, name]) => (
                      <label key={code} className="flex items-center gap-1.5 p-1 rounded hover:bg-[#0f1b30] cursor-pointer text-[11px] text-[#cbd5e1]">
                        <input
                          type="checkbox"
                          checked={vhClass.includes(code)}
                          onChange={(e) => {
                            if (e.target.checked) setVhClass([...vhClass, code]);
                            else setVhClass(vhClass.filter((c) => c !== code));
                          }}
                          className="rounded border-[#1f2f4c] text-[#0284c7]"
                        />
                        <span className="truncate">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#162238]">
              <button
                onClick={() => {
                  setVhCatg(DEFAULT_VH_CATG);
                  setFuels(DEFAULT_FUELS);
                  setNorms([]);
                  setVhClass([]);
                }}
                className="px-3 py-1 bg-[#152238] hover:bg-[#1e3152] text-xs font-semibold rounded text-[#94a3b8]"
              >
                Reset Required Defaults (LMV+LPV)
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="px-4 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-xs font-bold rounded text-white"
              >
                Save & Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
