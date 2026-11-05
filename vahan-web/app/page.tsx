"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play, Pause, Square, RotateCw, Download, Settings,
  Search, CheckSquare, Square as UncheckedSquare,
  Activity, Car, Building2, Trophy, AlertTriangle, FileSpreadsheet,
  CheckCircle2, Folder, FolderOpen, ExternalLink, HardDrive, ShieldCheck, Zap,
  Sun, Moon, LayoutDashboard, Database as DatabaseIcon, Gauge, Sparkles
} from "lucide-react";
import ExecutiveDashboard from "@/components/ExecutiveDashboard";
import DatabaseManager, { OEMRecord, RTORecord } from "@/components/DatabaseManager";
import {
  RTOItem, RTORowData, DEFAULT_VH_CATG, ALL_VH_CATG, ALL_VH_CATG_DICT,
  DEFAULT_FUELS, ALL_FUELS_DICT, ALL_NORMS_DICT, ALL_VHCLASS_DICT, YAXIS_OPTIONS,
  SegmentType, SEGMENT_CONFIGS
} from "@/lib/vahan";
import { KERALA_RTOS } from "@/lib/kerala-rtos";

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

  // Main Tab Navigation: "scraper" | "dashboard" | "database"
  const [mainTab, setMainTab] = useState<"scraper" | "dashboard" | "database">("scraper");

  // Global Theme: "dark" | "light"
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Shared OEM and RTO database state (Direct live link to MariaDB eramsale_vahan)
  const [oemDb, setOemDb] = useState<OEMRecord[]>([]);
  const [rtoDt, setRtoDt] = useState<RTORecord[]>([]);

  // Automatically load OEM and RTO master tables on initial mount
  useEffect(() => {
    async function loadMasterTables() {
      try {
        const [oemRes, rtoRes] = await Promise.all([
          fetch("/api/db?type=oem"),
          fetch("/api/db?type=rto"),
        ]);
        const oemJson = await oemRes.json();
        const rtoJson = await rtoRes.json();
        if (oemJson.success && Array.isArray(oemJson.data)) {
          setOemDb(oemJson.data);
        }
        if (rtoJson.success && Array.isArray(rtoJson.data)) {
          setRtoDt(rtoJson.data);
        }
      } catch (err) {
        console.warn("MariaDB master tables initial fetch notice:", err);
      }
    }
    loadMasterTables();
  }, []);

  // Theme persistence & document class sync
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("vahan_theme") as "dark" | "light" | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("vahan_theme", nextTheme);
    } catch {}
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (theme === "light") {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
      }
    }
  }, [theme]);

  // Output Path Selection Option
  const [outputPath, setOutputPath] = useState<string>("C:\\Users\\Rah\\Desktop\\NEW VAHAN\\output");
  const [pathSaveStatus, setPathSaveStatus] = useState<string>("Ready (Saves to local disk)");
  const directoryHandleRef = useRef<any>(null);

  // Helper to save file directly into user-selected local directory handle
  const saveToLocalDirectory = async (fileName: string, data: Uint8Array | Blob | ArrayBuffer): Promise<boolean> => {
    if (!directoryHandleRef.current) return false;
    try {
      const fileHandle = await directoryHandleRef.current.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      return true;
    } catch (err) {
      console.warn(`Could not save ${fileName} to local folder handle:`, err);
      return false;
    }
  };

  // Helper to get clean filename: strictly strips trailing SRTO or RTO (e.g. VELLARIKUNDU SRTO -> VELLARIKUNDU-2026.xlsx)
  const getCleanRtoFileName = (name: string, yr: string): string => {
    const stripped = (name || "").replace(/[\s\-_]+(?:SRTO|RTO)\s*$/i, "").trim() || (name || "").trim();
    const safe = stripped.replace(/[\\/:*?"<>|]/g, "").trim();
    return `${safe}-${yr}.xlsx`;
  };

  // Filter state & Segment
  const [segment, setSegment] = useState<SegmentType>("PV");
  const [vhCatg, setVhCatg] = useState<string[]>(DEFAULT_VH_CATG);
  const [fuels, setFuels] = useState<string[]>(DEFAULT_FUELS);
  const [norms, setNorms] = useState<string[]>([]);
  const [vhClass, setVhClass] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<"catg" | "fuels" | "norms" | "class">("catg");

  // Handles Segment selection: PV, CV, BEV, or CUSTOM
  const handleSegmentChange = (seg: SegmentType) => {
    setSegment(seg);
    if (seg === "PV") {
      setVhCatg(["LMV", "LPV"]);
      setFuels(SEGMENT_CONFIGS.PV.fuels); // 34 non-EV fuels
      addLog("Segment changed to PV: LMV + LPV, 34 Fuels (ELECTRIC(BOV) & PURE EV unticked)", "INFO");
    } else if (seg === "CV") {
      setVhCatg(["LGV"]);
      setFuels(Object.keys(ALL_FUELS_DICT)); // Full tick (all 36 fuels)
      addLog("Segment changed to CV: LIGHT GOODS VEHICLE (LGV), All Fuels (Full Tick)", "INFO");
    } else if (seg === "BEV") {
      setVhCatg(["LMV", "LPV"]);
      setFuels(["4", "23"]); // Only ELECTRIC(BOV) & PURE EV
      addLog("Segment changed to BEV: LMV + LPV, Electric Fuels Only (BOV + Pure EV)", "INFO");
    }
    syncRtoTableStatuses(year, seg);
  };

  const updateSegmentFromSelections = (newCatg: string[], newFuels: string[]) => {
    const catgSet = new Set(newCatg);
    const fuelSet = new Set(newFuels);

    if (
      catgSet.size === 2 &&
      catgSet.has("LMV") &&
      catgSet.has("LPV") &&
      !fuelSet.has("4") &&
      !fuelSet.has("23") &&
      fuelSet.size === SEGMENT_CONFIGS.PV.fuels.length
    ) {
      setSegment("PV");
    } else if (
      catgSet.size === 1 &&
      catgSet.has("LGV") &&
      fuelSet.size === Object.keys(ALL_FUELS_DICT).length
    ) {
      setSegment("CV");
    } else if (
      catgSet.size === 2 &&
      catgSet.has("LMV") &&
      catgSet.has("LPV") &&
      fuelSet.size === 2 &&
      fuelSet.has("4") &&
      fuelSet.has("23")
    ) {
      setSegment("BEV");
    } else {
      setSegment("CUSTOM");
    }
  };

  // Scraper execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isStoppedRef = useRef<boolean>(false);

  // Multi-Year & Multi-Segment Scraped Data Partition (year -> segment -> rtoCode -> rows)
  // Ensures downloading 2026 CV never truncates 2026 PV, and 2025/2026 are completely preserved!
  const [scrapedDataByYearSeg, setScrapedDataByYearSeg] = useState<
    Record<string, Record<string, Record<string, RTORowData[]>>>
  >({});

  const allLiveScrapedRows = useMemo(() => {
    return Object.values(scrapedDataByYearSeg).flatMap((segMap) =>
      Object.values(segMap).flatMap((rtoMap) => Object.values(rtoMap).flat())
    );
  }, [scrapedDataByYearSeg]);

  const syncRtoTableStatuses = (currYear: string, currSeg: string) => {
    setRtos((prev) =>
      prev.map((r) => {
        const yearSegData = scrapedDataByYearSeg[currYear]?.[currSeg]?.[r.item.code];
        return {
          ...r,
          status: yearSegData ? "done" : "pending",
          data: yearSegData || undefined,
          makerCount: yearSegData ? yearSegData.length : undefined,
          totalVehicles: yearSegData ? yearSegData.reduce((s, row) => s + (row.TOTAL || 0), 0) : undefined,
        };
      })
    );
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    syncRtoTableStatuses(newYear, segment);
  };

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

  // Load Kerala RTOs on initial mount with guaranteed catalog fallback
  useEffect(() => {
    async function loadRTOs() {
      addLog("Connecting to Vahan Parivahan portal...", "INFO");

      const applyCatalog = (catalog: RTOItem[], src: string) => {
        const list: RTORecordState[] = catalog.map((r: RTOItem) => ({
          item: r,
          status: "pending",
        }));
        setRtos(list);
        const selMap: Record<string, boolean> = {};
        list.forEach((r) => {
          selMap[r.item.code] = true;
        });
        setSelectedRtosMap(selMap);
        addLog(`✓ Successfully initialized all ${list.length} Kerala RTOs (${src})!`, "SUCCESS");
      };

      try {
        const resp = await fetch("/api/rtos?state=KL");
        if (resp.ok) {
          const json = await resp.json();
          if (json.success && json.rtos && json.rtos.length > 0) {
            applyCatalog(json.rtos, json.source === "live" ? "Portal Live" : "Verified Database");
            return;
          }
        }
      } catch (err: any) {
        console.warn("API load note:", err.message);
      }
      // Instant guaranteed client-side fallback - 0ms, will never show 0 RTOs
      applyCatalog(KERALA_RTOS, "Verified 87 RTO Database");
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

  // Browse Folder Picker Handler:
  // In modern browsers (Chrome/Edge), opens the native OS Folder Picker dialog!
  // On localhost, also supports Windows Server FolderBrowserDialog.
  const handleBrowseFolder = async () => {
    // 1. Direct native browser directory picker (Works in Chrome/Edge on Vercel, Netlify, Localhost)
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        addLog("Opening native Windows folder browser...", "INFO");
        setPathSaveStatus("Selecting folder...");
        const dirHandle = await (window as any).showDirectoryPicker({
          id: "vahan_output_folder",
          mode: "readwrite",
        });
        if (dirHandle) {
          directoryHandleRef.current = dirHandle;
          const folderName = dirHandle.name;
          setOutputPath(`📁 ${folderName} (Selected Folder)`);
          setPathSaveStatus(`✓ Local Folder: ${folderName}`);
          addLog(`✓ Selected local PC folder: "${folderName}" (Files will save here automatically!)`, "SUCCESS");
          return;
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          setPathSaveStatus("Selection cancelled");
          addLog("Folder selection cancelled.", "WARNING");
          return;
        }
        console.warn("showDirectoryPicker notice:", err);
      }
    }

    // 2. If running locally on localhost, use PowerShell folder browser dialog
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (isLocalhost) {
      try {
        addLog("Opening Windows Folder Browser Dialog...", "INFO");
        setPathSaveStatus("Selecting folder...");
        const resp = await fetch("/api/browse-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPath: outputPath }),
        });
        const data = await resp.json();
        if (data.success && data.path && !data.isCloud) {
          setOutputPath(data.path);
          addLog(`✓ Output directory set to: ${data.path}`, "SUCCESS");
          setPathSaveStatus(`✓ Path selected: ${data.path}`);
          return;
        } else if (data.cancelled) {
          setPathSaveStatus("Selection cancelled");
          return;
        }
      } catch (e: any) {
        console.warn("Server browse-folder error:", e);
      }
    }

    // 3. Fallback prompt
    const manual = prompt(
      "Enter folder name or path on your computer where files should be saved:",
      outputPath.replace(/^📁\s*/, "").replace(/\s*\(Selected Folder\)$/, "")
    );
    if (manual && manual.trim()) {
      setOutputPath(manual.trim());
      addLog(`Output path set to: ${manual.trim()}`, "INFO");
      setPathSaveStatus(`✓ Path set: ${manual.trim()}`);
    }
  };

  // Open / inspect the selected output folder
  const handleOpenFolder = async () => {
    if (directoryHandleRef.current) {
      alert(
        `📁 Active Local Folder: "${directoryHandleRef.current.name}"\n\nAll scraped XLSX files are automatically saved directly into this folder on your computer.\n\nOpen Windows File Explorer to browse your files!`
      );
      addLog(`📂 Active local folder: ${directoryHandleRef.current.name}`, "SUCCESS");
      return;
    }

    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (isLocalhost) {
      try {
        const resp = await fetch("/api/open-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetDir: outputPath }),
        });
        const json = await resp.json();
        if (json.success && !json.isCloud) {
          addLog(`📂 Opened directory in Explorer: ${json.openedPath}`, "SUCCESS");
          return;
        }
      } catch (e: any) {
        console.warn("Open folder error:", e);
      }
    }

    alert(
      `Output Path: "${outputPath}"\n\nTip: Click "Browse Path..." to choose any folder on your computer so files are saved directly into it!`
    );
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

    // Clear old data for the targeted RTOs for this specific year (fresh mode)
    // Other years (e.g. 2025 when year=2026, or 2026 when year=2025) are NEVER touched!
    // Clear old data for targeted RTOs for this specific (year, segment)
    setScrapedDataByYearSeg((prev) => {
      const yearMap = { ...(prev[year] || {}) };
      const segMap = { ...(yearMap[segment] || {}) };
      targets.forEach((t) => {
        delete segMap[t.item.code];
      });
      yearMap[segment] = segMap;
      return { ...prev, [year]: yearMap };
    });

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
              resultData = json.rows.map((row: any) => ({
                ...row,
                segment,
                Segment: segment,
              }));
              totalV = json.totalVehicles || 0;
              accumulatedRows.push(...resultData);

              // If user selected a local folder via Browse Path, save XLSX directly to their PC!
              if (directoryHandleRef.current && json.xlsxBase64) {
                try {
                  const fileName = getCleanRtoFileName(target.item.name || target.item.code, year);
                  const byteCharacters = atob(json.xlsxBase64);
                  const byteNumbers = new Uint8Array(byteCharacters.length);
                  for (let b = 0; b < byteCharacters.length; b++) {
                    byteNumbers[b] = byteCharacters.charCodeAt(b);
                  }
                  const saved = await saveToLocalDirectory(fileName, byteNumbers);
                  if (saved) {
                    addLog(`💾 Auto-saved ${fileName} directly to local folder [${directoryHandleRef.current.name}]`, "SUCCESS");
                  }
                } catch (fsErr: any) {
                  console.warn("Auto-save to directory failed:", fsErr);
                }
              }
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
          resultData.forEach((row: any) => {
            row.segment = segment;
            row.Segment = segment;
          });
          setScrapedDataByYearSeg((prev) => ({
            ...prev,
            [year]: {
              ...(prev[year] || {}),
              [segment]: {
                ...((prev[year] && prev[year][segment]) || {}),
                [target.item.code]: resultData,
              },
            },
          }));
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

    // Automatically generate Excel into the chosen output path (XLSX only)
    if (accumulatedRows.length > 0) {
      addLog(`Generating Master Consolidated Excel in ${outputPath}...`, "INFO");
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
        if (saveJson.success && !saveJson.isCloud) {
          addLog(`★ Excel saved to disk: ${saveJson.savedXlsx}`, "SUCCESS");
          setPathSaveStatus("✓ Excel saved to disk!");
        }
      } catch (err: any) {
        addLog(`Notice on auto-saving Excel: ${err.message}`, "WARNING");
      }

      // Sync scraped rows directly to Hostinger MariaDB 'vahan'
      try {
        fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "registrations", data: accumulatedRows }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.success) {
              addLog(`★ Synced ${res.count} records directly to Hostinger MariaDB table [vahan_registrations]!`, "SUCCESS");
            }
          })
          .catch(() => {});
      } catch (dbSyncErr) {
        console.warn("DB sync warning:", dbSyncErr);
      }

      // If user selected a local folder via Browse Path, save Master Excel directly into it
      if (directoryHandleRef.current) {
        try {
          const completedRtos = rtos.filter((r) => r.data && r.data.length > 0);
          let masterName = `KL_ALL_${completedRtos.length}_RTO_CONSOLIDATED_${year}_${segment}.xlsx`;
          if (completedRtos.length === 1) {
            masterName = getCleanRtoFileName(completedRtos[0].item.name, year);
          }
          addLog(`Saving ${masterName} to local folder [${directoryHandleRef.current.name}]...`, "INFO");
          const resp = await fetch("/api/export-master", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ allRows: accumulatedRows, year, filename: masterName }),
          });
          if (resp.ok) {
            const blob = await resp.blob();
            const saved = await saveToLocalDirectory(masterName, blob);
            if (saved) {
              addLog(`★ Master Excel saved directly to local folder [${directoryHandleRef.current.name}]: ${masterName}`, "SUCCESS");
              setPathSaveStatus(`✓ Saved to ${directoryHandleRef.current.name}`);
            }
          }
        } catch (mErr: any) {
          console.warn("Master folder save error:", mErr);
        }
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

  // Download Excel & Save to Selected Path (XLSX only, format: <RTO Name>-<Year>.xlsx)
  const downloadMasterExcel = async () => {
    const allRows: RTORowData[] = [];
    const completedRtos = rtos.filter((r) => r.data && r.data.length > 0);
    completedRtos.forEach((r) => {
      if (r.data && r.data.length > 0) {
        allRows.push(...r.data);
      }
    });

    if (allRows.length === 0) {
      alert("No data available yet. Please click 'START BATCH SCRAPER' first!");
      return;
    }

    // Required format: If single RTO -> <RTO Name without SRTO/RTO>-<Year>.xlsx
    let targetFileName = `KL_ALL_${completedRtos.length}_RTO_CONSOLIDATED_${year}_${segment}.xlsx`;
    if (completedRtos.length === 1) {
      targetFileName = getCleanRtoFileName(completedRtos[0].item.name, year);
    }

    try {
      addLog(`Generating Excel: ${targetFileName} (Saving to: ${outputPath})...`, "INFO");

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
        body: JSON.stringify({ allRows, year, filename: targetFileName }),
      });

      if (!resp.ok) throw new Error("Export failed on server.");

      const blob = await resp.blob();

      // If user selected a local folder via Browse Path, save directly to their PC!
      if (directoryHandleRef.current) {
        try {
          await saveToLocalDirectory(targetFileName, blob);
          addLog(`✓ Saved to local folder [${directoryHandleRef.current.name}]: ${targetFileName}`, "SUCCESS");
        } catch (fsErr) {
          console.warn("Folder save notice:", fsErr);
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = targetFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      addLog(`★ ${targetFileName} downloaded successfully!`, "SUCCESS");
    } catch (e: any) {
      addLog(`Export error: ${e.message}`, "ERROR");
    }
  };

  // Instant 1-click Download for any single RTO with format: <RTO Name without SRTO/RTO>-<Year>.xlsx
  const downloadSingleRtoExcel = async (rtoItem: { code: string; name: string }, data: RTORowData[]) => {
    if (!data || data.length === 0) return;
    const fileName = getCleanRtoFileName(rtoItem.name, year);
    try {
      addLog(`Generating ${fileName}...`, "INFO");
      const resp = await fetch("/api/export-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allRows: data, year, filename: fileName }),
      });
      if (!resp.ok) throw new Error("Export failed.");
      const blob = await resp.blob();

      // If user selected a local folder via Browse Path, save directly to their PC!
      if (directoryHandleRef.current) {
        try {
          await saveToLocalDirectory(fileName, blob);
          addLog(`✓ Saved to local folder [${directoryHandleRef.current.name}]: ${fileName}`, "SUCCESS");
        } catch (fsErr) {
          console.warn("Folder save notice:", fsErr);
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      addLog(`✓ ${fileName} downloaded successfully!`, "SUCCESS");
    } catch (err: any) {
      addLog(`Download error: ${err.message}`, "ERROR");
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

  const isDark = theme === "dark";

  return (
    <div
      className={`flex flex-col min-h-screen p-2 sm:p-3 gap-2.5 max-w-[1750px] mx-auto transition-colors duration-200 ${
        isDark ? "bg-[#060911] text-[#cbd5e1]" : "bg-slate-100 text-slate-800"
      }`}
    >
      {/* 1. Tactical Compact Header Bar with Global Navigation & Theme Toggle */}
      <header
        className={`flex flex-wrap items-center justify-between p-2.5 px-3.5 border rounded-lg shadow-md transition-colors gap-2.5 ${
          isDark
            ? "bg-gradient-to-r from-[#0a1120] to-[#0f1a30] border-[#1e2c47]"
            : "bg-white border-slate-200 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[#0284c7] text-white tracking-wider">
            KL • KERALA
          </span>
          <h1
            className={`text-base sm:text-lg font-extrabold tracking-wide flex items-center gap-2 ${
              isDark ? "text-[#38bdf8]" : "text-sky-700"
            }`}
          >
            <Car className={`w-4 h-4 ${isDark ? "text-[#38bdf8]" : "text-sky-600"}`} />
            VAHAN 4 INTELLIGENCE PLATFORM
          </h1>
          <span className={`hidden xl:inline-block text-xs ${isDark ? "text-[#64748b]" : "text-slate-500"}`}>
            | 87 RTO Engine • Executive Dashboard • OEM Database
          </span>
        </div>

        {/* 2. Top-Level Main Navigation Pills */}
        <nav
          className={`flex items-center gap-1 p-1 rounded-lg border ${
            isDark ? "bg-[#070d18] border-[#1f2f4c]" : "bg-slate-100 border-slate-300"
          }`}
        >
          <button
            onClick={() => setMainTab("scraper")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              mainTab === "scraper"
                ? "bg-[#0284c7] text-white shadow-sm"
                : isDark
                ? "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>87 RTO Scraper</span>
          </button>

          <button
            onClick={() => setMainTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              mainTab === "dashboard"
                ? "bg-gradient-to-r from-[#0284c7] to-[#0d9488] text-white shadow-sm"
                : isDark
                ? "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Executive Dashboard</span>
            {completedRtosCount > 0 ? (
              <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-emerald-500 text-white animate-pulse">
                LIVE: {completedRtosCount}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                New
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab("database")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              mainTab === "database"
                ? "bg-[#0284c7] text-white shadow-sm"
                : isDark
                ? "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <DatabaseIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Database Manager</span>
            <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              OEM_DB
            </span>
          </button>
        </nav>

        {/* 3. Global Actions & Theme Switcher */}
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold border transition ${
              isDark
                ? "bg-[#111c33] border-[#1e2e4f] text-[#cbd5e1] hover:bg-[#1a2b4c]"
                : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
            }`}
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span>Dark</span>
              </>
            )}
          </button>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-[#064e3b]/60 text-[#34d399] border border-[#059669]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            Portal Online ({rtos.length} RTOs)
          </span>

          <button
            onClick={downloadMasterExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-gradient-to-r from-[#065f46] to-[#047857] hover:from-[#047857] hover:to-[#059669] text-white border border-[#10b981] transition shadow"
          >
            <Download className="w-3.5 h-3.5" />
            Download Master Excel
          </button>
        </div>
      </header>

      {mainTab === "scraper" && (
        <>
      {/* 2. Combat Control Deck (Two-Tier High-Density HUD) */}
      <section className={`flex flex-col gap-2 p-2.5 border rounded-lg shadow-md transition-colors ${
        isDark ? "bg-[#0b1222] border-[#1c2a44]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        {/* Tier 1: Parameters + OUTPUT PATH SELECTION OPTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-end">
          {/* A. Target RTO Selection */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isDark ? "text-[#64748b]" : "text-slate-500"
            }`}>
              Target RTO Selection:
            </label>
            <select
              value={selectedRtoTarget}
              onChange={(e) => handleRtoTargetChange(e.target.value)}
              disabled={isRunning}
              className={`w-full border rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none transition ${
                isDark
                  ? "bg-[#070d1a] border-[#1f2f4c] text-white focus:border-[#38bdf8]"
                  : "bg-slate-50 border-slate-300 text-slate-800 focus:border-sky-500"
              }`}
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
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isDark ? "text-[#64748b]" : "text-slate-500"
            }`}>
              Year:
            </label>
            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={isRunning}
              className={`w-full border rounded px-2 py-1.5 text-xs font-semibold focus:outline-none transition ${
                isDark
                  ? "bg-[#070d1a] border-[#1f2f4c] text-white focus:border-[#38bdf8]"
                  : "bg-slate-50 border-slate-300 text-slate-800 focus:border-sky-500"
              }`}
            >
              {["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Segment Selection (PV, CV, BEV) */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isDark ? "text-[#38bdf8]" : "text-sky-700"
            }`}>
              Segment:
            </label>
            <select
              value={segment}
              onChange={(e) => handleSegmentChange(e.target.value as SegmentType)}
              disabled={isRunning}
              className={`w-full border rounded px-2 py-1.5 text-xs font-bold focus:outline-none transition ${
                isDark
                  ? "bg-[#070d1a] border-[#1f2f4c] text-[#38bdf8] focus:border-[#38bdf8]"
                  : "bg-slate-50 border-slate-300 text-sky-800 focus:border-sky-500 font-bold"
              }`}
            >
              <option value="PV">🚗 PV (LMV+LPV, Non-EV)</option>
              <option value="CV">🚛 CV (LGV, Full Tick)</option>
              <option value="BEV">⚡ BEV (Pure EV & BOV)</option>
              <option value="CUSTOM">⚙ Custom Filters</option>
            </select>
          </div>

          {/* Dimension (Y-Axis) */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isDark ? "text-[#38bdf8]" : "text-sky-700"
            }`}>
              Dimension (Y-Axis):
            </label>
            <select
              value={yaxis}
              onChange={(e) => setYaxis(e.target.value)}
              disabled={isRunning}
              className={`w-full border rounded px-2 py-1.5 text-xs font-semibold focus:outline-none transition ${
                isDark
                  ? "bg-[#070d1a] border-[#1f2f4c] text-[#38bdf8] focus:border-[#38bdf8]"
                  : "bg-slate-50 border-slate-300 text-sky-700 focus:border-sky-500 font-bold"
              }`}
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
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isDark ? "text-[#64748b]" : "text-slate-500"
            }`}>
              Speed Mode:
            </label>
            <select
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              disabled={isRunning}
              className={`w-full border rounded px-2 py-1.5 text-xs font-semibold focus:outline-none transition ${
                isDark
                  ? "bg-[#070d1a] border-[#1f2f4c] text-white focus:border-[#38bdf8]"
                  : "bg-slate-50 border-slate-300 text-slate-800 focus:border-sky-500"
              }`}
            >
              <option value={6}>⚡ ULTRAFAST (6 Workers)</option>
              <option value={8}>🚀 MAX TURBO (8 Workers)</option>
              <option value={4}>⚡ FAST (4 Workers)</option>
              <option value={1}>🐢 SAFE (1 Worker)</option>
            </select>
          </div>

          {/* D. Filter Parameters (Vehicle Categories & Fuels) */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isDark ? "text-[#64748b]" : "text-slate-500"
            }`}>
              Filter Parameters:
            </label>
            <button
              onClick={() => setIsFilterOpen(true)}
              className={`flex items-center justify-between w-full border rounded px-2 py-1.5 text-xs font-semibold transition ${
                isDark
                  ? "bg-[#152238] hover:bg-[#1e3152] border-[#253757] text-[#cbd5e1]"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700"
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] truncate">
                <Settings className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-[#38bdf8]" : "text-sky-600"}`} />
                {segment === "PV" ? "PV (34 Fuels)" : segment === "CV" ? "CV (All Fuels)" : segment === "BEV" ? "BEV (EV Only)" : "Custom"}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                isDark ? "bg-[#0284c7]/20 text-[#38bdf8]" : "bg-sky-100 text-sky-700"
              }`}>
                {segment === "CV" ? "LGV" : "LMV+LPV"}
              </span>
            </button>
          </div>

          {/* E. BROWSE PATH SELECTION OPTION (EXPLICIT FOLDER PICKER & DISPLAY) */}
          <div className="md:col-span-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                isDark ? "text-[#38bdf8]" : "text-sky-700"
              }`}>
                <Folder className="w-3.5 h-3.5" />
                Browse Save Path (Excel Folder):
              </label>
              {pathSaveStatus && (
                <span className={`text-[10px] font-semibold truncate max-w-[170px] ${
                  isDark ? "text-[#34d399]" : "text-emerald-600"
                }`}>
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
                className={`flex-1 border rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none transition ${
                  isDark
                    ? "bg-[#070d1a] border-[#1f2f4c] text-[#7dd3fc] focus:border-[#38bdf8]"
                    : "bg-slate-50 border-slate-300 text-sky-800 focus:border-sky-500"
                }`}
                title="Enter local disk path to save Excel output files (<RTO Name>-<Year>.xlsx)"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded border border-[#38bdf8] transition whitespace-nowrap shadow"
                title="Click to browse and choose a folder from your PC"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Browse Path...
              </button>
              <button
                type="button"
                onClick={handleOpenFolder}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded border transition whitespace-nowrap ${
                  isDark
                    ? "bg-[#152238] hover:bg-[#1e3152] text-[#cbd5e1] border-[#253757]"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                }`}
                title="Open this folder in Windows File Explorer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Combat Command Action Toolbar & Telemetry Badges */}
        <div className={`flex flex-wrap items-center justify-between gap-2 pt-1 border-t ${
          isDark ? "border-[#162238]" : "border-slate-200"
        }`}>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold text-xs border transition ${
                isDark
                  ? "bg-[#152238] hover:bg-[#1e3152] text-[#38bdf8] border-[#253757]"
                  : "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-300"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Export Master Excel
            </button>

            {completedRtosCount > 0 && (
              <button
                type="button"
                onClick={() => setMainTab("dashboard")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-400 shadow transition animate-pulse"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                View in Executive Dashboard ({completedRtosCount}) →
              </button>
            )}
          </div>

          {/* Telemetry Live HUD Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded border font-semibold text-[11px] ${
              isDark ? "bg-[#111c33] border-[#1e2e4f] text-[#94a3b8]" : "bg-slate-100 border-slate-300 text-slate-600"
            }`}>
              Queued: <strong className={isDark ? "text-white" : "text-slate-900"}>{rtos.filter((r) => selectedRtosMap[r.item.code]).length}</strong>
            </span>
            <span className={`px-2 py-0.5 rounded border font-semibold text-[11px] ${
              isDark ? "bg-[#064e3b]/30 border-[#059669] text-[#34d399]" : "bg-emerald-50 border-emerald-300 text-emerald-700"
            }`}>
              Done: <strong>{completedRtosCount}</strong>
            </span>
            <span className={`px-2 py-0.5 rounded border font-semibold text-[11px] ${
              isDark ? "bg-[#7f1d1d]/30 border-[#dc2626] text-[#f87171]" : "bg-red-50 border-red-300 text-red-700"
            }`}>
              Failed: <strong>{failedRtosCount}</strong>
            </span>
            {isRunning && (
              <>
                <span className={`px-2 py-0.5 rounded border font-semibold text-[11px] animate-pulse ${
                  isDark ? "bg-[#0b1b33] border-[#1e3a8a] text-[#38bdf8]" : "bg-sky-50 border-sky-300 text-sky-700"
                }`}>
                  ⚡ {speedStr}
                </span>
                <span className={`px-2 py-0.5 rounded border font-semibold text-[11px] ${
                  isDark ? "bg-[#0b1b33] border-[#1e3a8a] text-[#fbbf24]" : "bg-amber-50 border-amber-300 text-amber-700"
                }`}>
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
        <div className={`lg:col-span-5 flex flex-col border rounded-lg p-2.5 shadow-md ${
          isDark ? "bg-[#090f1d] border-[#19253d]" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div className="relative flex-1">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2 ${isDark ? "text-[#64748b]" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder="🔍 Quick Filter RTO (e.g. KL26, Adoor)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded pl-8 pr-2 py-1 text-xs focus:outline-none transition ${
                  isDark
                    ? "bg-[#070d18] border-[#1c2b47] text-white focus:border-[#38bdf8]"
                    : "bg-slate-50 border-slate-300 text-slate-800 focus:border-sky-500"
                }`}
              />
            </div>
            <button
              onClick={() => handleSelectAll(true)}
              className={`text-[11px] px-2 py-1 font-bold rounded border transition ${
                isDark
                  ? "bg-[#152238] hover:bg-[#1e3152] text-[#cbd5e1] border-[#253757]"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className={`text-[11px] px-2 py-1 font-bold rounded border transition ${
                isDark
                  ? "bg-[#152238] hover:bg-[#1e3152] text-[#cbd5e1] border-[#253757]"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
            >
              Clear
            </button>
          </div>

          {/* Compact Tactical Table */}
          <div className={`flex-1 overflow-auto rounded border max-h-[580px] ${
            isDark ? "border-[#1a2842]" : "border-slate-200"
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`sticky top-0 font-bold border-b z-10 text-[10px] uppercase ${
                isDark ? "bg-[#0e172a] text-[#818cf8] border-[#243555]" : "bg-slate-100 text-slate-700 border-slate-300"
              }`}>
                <tr>
                  <th className="p-1.5 w-7 text-center">✔</th>
                  <th className="p-1.5 w-14 text-center">Code</th>
                  <th className="p-1.5">RTO Office Name</th>
                  <th className="p-1.5 text-center w-24">Status</th>
                  <th className="p-1.5 text-right w-16">Vehicles</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-[#111a2d]" : "divide-slate-200"}`}>
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
                          ? isDark
                            ? "bg-[#1e3a8a]/40"
                            : "bg-sky-100 text-sky-900 font-semibold"
                          : idx % 2 === 0
                          ? isDark
                            ? "bg-[#070d18] hover:bg-[#101b33]"
                            : "bg-white hover:bg-slate-50"
                          : isDark
                          ? "bg-[#0c1424] hover:bg-[#14223d]"
                          : "bg-slate-50/70 hover:bg-slate-100"
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
                          <CheckSquare className="w-3.5 h-3.5 text-[#0284c7] inline" />
                        ) : (
                          <UncheckedSquare className={`w-3.5 h-3.5 inline ${isDark ? "text-[#64748b]" : "text-slate-400"}`} />
                        )}
                      </td>
                      <td className={`p-1.5 font-mono font-bold text-center text-[11px] ${
                        isDark ? "text-[#38bdf8]" : "text-sky-700"
                      }`}>
                        {r.item.code}
                      </td>
                      <td className={`p-1.5 font-medium truncate max-w-[150px] text-[11px] ${
                        isDark ? "text-[#e2e8f0]" : "text-slate-800"
                      }`}>
                        {r.item.name}
                      </td>
                      <td className="p-1.5 text-center">
                        {r.status === "pending" && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isDark ? "bg-[#111c33] text-[#64748b]" : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            Pending
                          </span>
                        )}
                        {r.status === "fetching" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0284c7]/20 text-[#38bdf8] border border-[#0284c7] animate-pulse">
                            Fetching...
                          </span>
                        )}
                        {r.status === "retry" && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            isDark ? "bg-[#92400e]/30 text-[#fbbf24] border-[#d97706]" : "bg-amber-50 text-amber-700 border-amber-300"
                          }`}>
                            Retry {r.retryAttempt}/3 🔄
                          </span>
                        )}
                        {r.status === "done" && (
                          <div className="flex items-center justify-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              isDark ? "bg-[#064e3b]/40 text-[#34d399] border-[#059669]" : "bg-emerald-50 text-emerald-700 border-emerald-300"
                            }`}>
                              Done ✓
                            </span>
                            {r.data && r.data.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadSingleRtoExcel(r.item, r.data!);
                                }}
                                title={`Download ${getCleanRtoFileName(r.item.name, year)}`}
                                className="p-0.5 rounded bg-[#0284c7]/20 hover:bg-[#0284c7] text-[#0284c7] hover:text-white transition"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        {r.status === "failed" && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            isDark ? "bg-[#7f1d1d]/40 text-[#f87171] border-[#dc2626]" : "bg-red-50 text-red-700 border-red-300"
                          }`}>
                            Failed (3x) ✗
                          </span>
                        )}
                      </td>
                      <td className={`p-1.5 text-right font-mono font-bold text-[11px] ${
                        isDark ? "text-[#f1f5f9]" : "text-slate-900"
                      }`}>
                        {r.totalVehicles ? r.totalVehicles.toLocaleString() : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={`flex items-center justify-between text-[11px] pt-1.5 ${
            isDark ? "text-[#64748b]" : "text-slate-500"
          }`}>
            <span>Loaded: {rtos.length} Kerala RTOs</span>
            <span>Selected: {rtos.filter((r) => selectedRtosMap[r.item.code]).length}</span>
          </div>
        </div>

        {/* Right: Studio (Live Preview, Summary, Logs) (7 cols) */}
        <div className={`lg:col-span-7 flex flex-col border rounded-lg p-2.5 shadow-md ${
          isDark ? "bg-[#090f1d] border-[#19253d]" : "bg-white border-slate-200 shadow-sm"
        }`}>
          {/* Tabs */}
          <div className={`flex items-center gap-1 border-b pb-1.5 mb-2 ${
            isDark ? "border-[#1a2842]" : "border-slate-200"
          }`}>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition ${
                activeTab === "preview"
                  ? isDark
                    ? "bg-[#0b152b] text-[#38bdf8] border border-[#38bdf8]"
                    : "bg-sky-50 text-sky-700 border border-sky-400 shadow-sm"
                  : isDark
                  ? "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#0c1424]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Live Data Preview
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition ${
                activeTab === "summary"
                  ? isDark
                    ? "bg-[#0b152b] text-[#38bdf8] border border-[#38bdf8]"
                    : "bg-sky-50 text-sky-700 border border-sky-400 shadow-sm"
                  : isDark
                  ? "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#0c1424]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              State Summary
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition ${
                activeTab === "logs"
                  ? isDark
                    ? "bg-[#0b152b] text-[#38bdf8] border border-[#38bdf8]"
                    : "bg-sky-50 text-sky-700 border border-sky-400 shadow-sm"
                  : isDark
                  ? "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#0c1424]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
                <div className={`p-2 border-l-2 border-[#38bdf8] border rounded ${
                  isDark ? "bg-gradient-to-r from-[#0c1424] to-[#101b33] border-[#1e2e4f]" : "bg-slate-50 border-slate-200 shadow-sm"
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isDark ? "text-[#64748b]" : "text-slate-500"
                  }`}>
                    Active Office
                  </span>
                  <span className={`text-sm font-extrabold truncate block ${
                    isDark ? "text-[#38bdf8]" : "text-sky-700"
                  }`}>
                    {currentPreviewRecord?.item.name || "None Selected"}
                  </span>
                </div>
                <div className={`p-2 border-l-2 border-[#a78bfa] border rounded ${
                  isDark ? "bg-gradient-to-r from-[#0c1424] to-[#101b33] border-[#1e2e4f]" : "bg-slate-50 border-slate-200 shadow-sm"
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isDark ? "text-[#64748b]" : "text-slate-500"
                  }`}>
                    Active {yaxis}s
                  </span>
                  <span className={`text-sm font-extrabold ${
                    isDark ? "text-[#a78bfa]" : "text-purple-700"
                  }`}>
                    {currentPreviewData.length}
                  </span>
                </div>
                <div className={`p-2 border-l-2 border-[#34d399] border rounded ${
                  isDark ? "bg-gradient-to-r from-[#0c1424] to-[#101b33] border-[#1e2e4f]" : "bg-slate-50 border-slate-200 shadow-sm"
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isDark ? "text-[#64748b]" : "text-slate-500"
                  }`}>
                    Total Vehicles
                  </span>
                  <span className={`text-sm font-extrabold ${
                    isDark ? "text-[#34d399]" : "text-emerald-700"
                  }`}>
                    {(currentPreviewRecord?.totalVehicles || 0).toLocaleString()}
                  </span>
                </div>
                <div className={`p-2 border-l-2 border-[#fbbf24] border rounded ${
                  isDark ? "bg-gradient-to-r from-[#0c1424] to-[#101b33] border-[#1e2e4f]" : "bg-slate-50 border-slate-200 shadow-sm"
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isDark ? "text-[#64748b]" : "text-slate-500"
                  }`}>
                    Top {yaxis}
                  </span>
                  <span className={`text-sm font-extrabold truncate block ${
                    isDark ? "text-[#fbbf24]" : "text-amber-700"
                  }`}>
                    {currentPreviewData.length > 0
                      ? (currentPreviewData[0][yaxis] || currentPreviewData[0].Maker)?.substring(0, 20)
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Quick Single RTO Download Bar */}
              {currentPreviewRecord && currentPreviewData.length > 0 && (
                <div className={`flex items-center justify-between p-2 rounded shadow-sm border ${
                  isDark ? "bg-[#0c1629] border-[#1d2d4a]" : "bg-slate-50 border-slate-200"
                }`}>
                  <span className={`text-xs font-semibold ${isDark ? "text-[#94a3b8]" : "text-slate-600"}`}>
                    Selected RTO: <span className={`font-bold ${isDark ? "text-[#38bdf8]" : "text-sky-700"}`}>{currentPreviewRecord.item.name}</span> ({year})
                  </span>
                  <button
                    onClick={() => downloadSingleRtoExcel(currentPreviewRecord.item, currentPreviewData)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#38bdf8] transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download {getCleanRtoFileName(currentPreviewRecord.item.name, year)}
                  </button>
                </div>
              )}

              {/* Data Table */}
              <div className={`flex-1 overflow-auto rounded border max-h-[500px] ${
                isDark ? "border-[#1a2842]" : "border-slate-200"
              }`}>
                {currentPreviewData.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`sticky top-0 font-bold border-b z-10 text-[10px] ${
                      isDark ? "bg-[#0e172a] text-[#818cf8] border-[#243555]" : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}>
                      <tr>
                        <th className="p-1.5 text-center w-10">#</th>
                        <th className="p-1.5">{yaxis}</th>
                        {[
                          { code: "APR", label: `Apr-${String(Number(year) - 1).slice(-2)}` },
                          { code: "MAY", label: `May-${String(Number(year) - 1).slice(-2)}` },
                          { code: "JUN", label: `Jun-${String(Number(year) - 1).slice(-2)}` },
                          { code: "JUL", label: `Jul-${String(Number(year) - 1).slice(-2)}` },
                          { code: "AUG", label: `Aug-${String(Number(year) - 1).slice(-2)}` },
                          { code: "SEP", label: `Sep-${String(Number(year) - 1).slice(-2)}` },
                          { code: "OCT", label: `Oct-${String(Number(year) - 1).slice(-2)}` },
                          { code: "NOV", label: `Nov-${String(Number(year) - 1).slice(-2)}` },
                          { code: "DEC", label: `Dec-${String(Number(year) - 1).slice(-2)}` },
                          { code: "JAN", label: `Jan-${String(year).slice(-2)}` },
                          { code: "FEB", label: `Feb-${String(year).slice(-2)}` },
                          { code: "MAR", label: `Mar-${String(year).slice(-2)}` },
                        ].map((m) => (
                          <th key={m.code} className="p-1.5 text-right w-14 font-mono text-[10px] text-amber-400">
                            {m.label}
                          </th>
                        ))}
                        <th className={`p-1.5 text-right font-extrabold w-14 ${
                          isDark ? "text-[#38bdf8]" : "text-sky-700"
                        }`}>
                          TOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-[#111a2d]" : "divide-slate-200"}`}>
                      {currentPreviewData.map((row, idx) => (
                        <tr
                          key={idx}
                          className={idx % 2 === 0 ? (isDark ? "bg-[#070d18]" : "bg-white") : (isDark ? "bg-[#0c1424]" : "bg-slate-50/70")}
                        >
                          <td className={`p-1.5 text-center font-mono text-[10px] ${
                            isDark ? "text-[#64748b]" : "text-slate-400"
                          }`}>
                            {row.S_No}
                          </td>
                          <td className={`p-1.5 font-semibold truncate max-w-[200px] text-[11px] ${
                            isDark ? "text-white" : "text-slate-800"
                          }`}>
                            {row[yaxis] || row.Maker}
                          </td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.APR || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.MAY || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.JUN || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.JUL || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.AUG || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.SEP || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.OCT || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.NOV || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.DEC || row.dec_val || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.JAN || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.FEB || 0}</td>
                          <td className={`p-1.5 text-right font-mono text-[11px] ${isDark ? "text-[#cbd5e1]" : "text-slate-700"}`}>{row.MAR || 0}</td>
                          <td className={`p-1.5 text-right font-mono font-bold text-[11px] ${
                            isDark ? "text-[#38bdf8]" : "text-sky-700"
                          }`}>
                            {(row.TOTAL || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className={`flex flex-col items-center justify-center h-64 gap-2 ${
                    isDark ? "text-[#64748b]" : "text-slate-400"
                  }`}>
                    <Activity className={`w-8 h-8 animate-pulse ${isDark ? "text-[#334155]" : "text-slate-300"}`} />
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
                <div className={`p-2 border-l-2 border-[#34d399] border rounded ${
                  isDark ? "bg-[#0c1424] border-[#1e2e4f]" : "bg-slate-50 border-slate-200 shadow-sm"
                }`}>
                  <span className={`text-[10px] font-bold uppercase block ${
                    isDark ? "text-[#64748b]" : "text-slate-500"
                  }`}>
                    Kerala Grand Total
                  </span>
                  <span className={`text-base font-extrabold ${
                    isDark ? "text-[#34d399]" : "text-emerald-700"
                  }`}>
                    {totalVehiclesAll.toLocaleString()}
                  </span>
                </div>
                <div className={`p-2 border-l-2 border-[#38bdf8] border rounded ${
                  isDark ? "bg-[#0c1424] border-[#1e2e4f]" : "bg-slate-50 border-slate-200 shadow-sm"
                }`}>
                  <span className={`text-[10px] font-bold uppercase block ${
                    isDark ? "text-[#64748b]" : "text-slate-500"
                  }`}>
                    Completed RTOs
                  </span>
                  <span className={`text-base font-extrabold ${
                    isDark ? "text-[#38bdf8]" : "text-sky-700"
                  }`}>
                    {completedRtosCount} / {rtos.length}
                  </span>
                </div>
                <div className={`p-2 border-l-2 border-[#a78bfa] border rounded ${
                  isDark ? "bg-[#0c1424] border-[#1e2e4f]" : "bg-slate-50 border-slate-200 shadow-sm"
                }`}>
                  <span className={`text-[10px] font-bold uppercase block ${
                    isDark ? "text-[#64748b]" : "text-slate-500"
                  }`}>
                    Export Output Path
                  </span>
                  <span className={`text-xs font-mono font-bold truncate block ${
                    isDark ? "text-[#7dd3fc]" : "text-sky-800"
                  }`}>
                    {outputPath}
                  </span>
                </div>
              </div>

              <div className={`flex-1 overflow-auto rounded border max-h-[500px] ${
                isDark ? "border-[#1a2842]" : "border-slate-200"
              }`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={`sticky top-0 font-bold border-b z-10 text-[10px] uppercase ${
                    isDark ? "bg-[#0e172a] text-[#818cf8] border-[#243555]" : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}>
                    <tr>
                      <th className="p-1.5 w-16 text-center">Code</th>
                      <th className="p-1.5">RTO Office Name</th>
                      <th className="p-1.5 text-center w-24">Makers Count</th>
                      <th className={`p-1.5 text-right w-24 ${isDark ? "text-[#34d399]" : "text-emerald-700"}`}>Total Vehicles</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-[#111a2d]" : "divide-slate-200"}`}>
                    {rtos
                      .filter((r) => r.status === "done")
                      .sort((a, b) => (b.totalVehicles || 0) - (a.totalVehicles || 0))
                      .map((r, idx) => (
                        <tr
                          key={r.item.code}
                          className={idx % 2 === 0 ? (isDark ? "bg-[#070d18]" : "bg-white") : (isDark ? "bg-[#0c1424]" : "bg-slate-50/70")}
                        >
                          <td className={`p-1.5 font-mono font-bold text-center text-[11px] ${
                            isDark ? "text-[#38bdf8]" : "text-sky-700"
                          }`}>
                            {r.item.code}
                          </td>
                          <td className={`p-1.5 font-medium text-[11px] ${
                            isDark ? "text-[#e2e8f0]" : "text-slate-800"
                          }`}>
                            {r.item.name}
                          </td>
                          <td className={`p-1.5 text-center font-mono text-[11px] ${
                            isDark ? "text-[#a78bfa]" : "text-purple-700"
                          }`}>
                            {r.makerCount}
                          </td>
                          <td className={`p-1.5 text-right font-mono font-bold text-[11px] ${
                            isDark ? "text-[#34d399]" : "text-emerald-700"
                          }`}>
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
              <div className={`flex items-center justify-between text-[11px] ${
                isDark ? "text-[#64748b]" : "text-slate-500"
              }`}>
                <span>Real-Time Engine Log:</span>
                <button
                  onClick={() => setLogs([])}
                  className={`px-2 py-0.5 rounded border transition ${
                    isDark
                      ? "bg-[#152238] hover:bg-[#1e3152] text-[#cbd5e1] border-[#253757]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  }`}
                >
                  Clear Log
                </button>
              </div>
              <div className={`flex-1 rounded p-2.5 overflow-auto font-mono text-xs max-h-[500px] border ${
                isDark ? "bg-[#04070e] border-[#162238]" : "bg-slate-900 border-slate-800 text-slate-100"
              }`}>
                {logs.map((l, i) => {
                  const color =
                    l.level === "SUCCESS"
                      ? "text-[#34d399]"
                      : l.level === "WARNING"
                      ? "text-[#fbbf24]"
                      : l.level === "ERROR"
                      ? "text-[#f87171]"
                      : isDark ? "text-[#94a3b8]" : "text-slate-400";
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
      <footer className={`flex flex-col gap-1 p-2 border rounded-lg shadow-md transition-colors ${
        isDark ? "bg-[#090f1d] border-[#19253d]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className={`w-full rounded border h-[18px] overflow-hidden relative ${
          isDark ? "bg-[#070d18] border-[#1a2944]" : "bg-slate-100 border-slate-300"
        }`}>
          <div
            className="h-full bg-gradient-to-r from-[#0284c7] via-[#06b6d4] to-[#10b981] transition-all duration-300"
            style={{
              width: `${totalToProcess > 0 ? (processedCount / totalToProcess) * 100 : 0}%`,
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white drop-shadow">
            Progress: {processedCount} / {totalToProcess} ({totalToProcess > 0 ? Math.round((processedCount / totalToProcess) * 100) : 0}%)
          </span>
        </div>

        <div className={`flex items-center justify-between text-[11px] ${
          isDark ? "text-[#64748b]" : "text-slate-500"
        }`}>
          <span>
            {isRunning
              ? `⚡ Scraping Kerala RTOs in parallel (${speedStr})... Data saving to: ${outputPath}`
              : `Ready. Data will be saved to: ${outputPath}`}
          </span>
          <span className={`font-mono font-bold ${isDark ? "text-[#38bdf8]" : "text-sky-700"}`}>
            ETA: {etaStr}
          </span>
        </div>
      </footer>

      {/* Filter Modal Dialog */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`border rounded-xl max-w-3xl w-full p-4 shadow-2xl flex flex-col gap-3 max-h-[88vh] ${
            isDark ? "bg-[#0b1222] border-[#1c2a44]" : "bg-white border-slate-200"
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${
              isDark ? "border-[#162238]" : "border-slate-200"
            }`}>
              <h2 className={`text-sm font-extrabold flex items-center gap-2 ${
                isDark ? "text-[#38bdf8]" : "text-sky-700"
              }`}>
                <Settings className="w-4 h-4" />
                Filter Parameters (Vehicle Categories & Fuels)
              </h2>
              <button
                onClick={() => setIsFilterOpen(false)}
                className={`text-sm font-bold ${isDark ? "text-[#64748b] hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
              >
                ✕
              </button>
            </div>

            {/* Quick Segment Presets Toolbar */}
            <div className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs ${
              isDark ? "bg-[#0b1222] border-[#1c2a44]" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className={isDark ? "text-slate-200" : "text-slate-800"}>Segment Presets:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSegmentChange("PV")}
                  className={`px-3 py-1 rounded text-xs font-bold border transition shadow-sm ${
                    segment === "PV"
                      ? "bg-[#0284c7] text-white border-[#38bdf8] ring-2 ring-[#0284c7]/40"
                      : isDark
                      ? "bg-[#152238] hover:bg-[#1e3152] text-slate-300 border-[#253757]"
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  🚗 PV (LMV+LPV, Non-EV)
                </button>
                <button
                  type="button"
                  onClick={() => handleSegmentChange("CV")}
                  className={`px-3 py-1 rounded text-xs font-bold border transition shadow-sm ${
                    segment === "CV"
                      ? "bg-[#0284c7] text-white border-[#38bdf8] ring-2 ring-[#0284c7]/40"
                      : isDark
                      ? "bg-[#152238] hover:bg-[#1e3152] text-slate-300 border-[#253757]"
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  🚛 CV (LGV, Full Tick)
                </button>
                <button
                  type="button"
                  onClick={() => handleSegmentChange("BEV")}
                  className={`px-3 py-1 rounded text-xs font-bold border transition shadow-sm ${
                    segment === "BEV"
                      ? "bg-[#0284c7] text-white border-[#38bdf8] ring-2 ring-[#0284c7]/40"
                      : isDark
                      ? "bg-[#152238] hover:bg-[#1e3152] text-slate-300 border-[#253757]"
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  ⚡ BEV (LMV+LPV, Pure EV & BOV)
                </button>
              </div>
            </div>

            {/* Filter Sub-Tabs */}
            <div className={`flex gap-1 border-b pb-1 ${isDark ? "border-[#1c2a44]" : "border-slate-200"}`}>
              <button
                onClick={() => setFilterTab("catg")}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  filterTab === "catg"
                    ? "bg-[#0284c7] text-white"
                    : isDark
                    ? "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Vehicle Categories ({vhCatg.length})
              </button>
              <button
                onClick={() => setFilterTab("fuels")}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  filterTab === "fuels"
                    ? "bg-[#0284c7] text-white"
                    : isDark
                    ? "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Fuel Types ({fuels.length})
              </button>
              <button
                onClick={() => setFilterTab("norms")}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  filterTab === "norms"
                    ? "bg-[#0284c7] text-white"
                    : isDark
                    ? "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Norms ({norms.length > 0 ? `${norms.length} filtered` : "All"})
              </button>
              <button
                onClick={() => setFilterTab("class")}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  filterTab === "class"
                    ? "bg-[#0284c7] text-white"
                    : isDark
                    ? "text-[#94a3b8] hover:text-white hover:bg-[#152238]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Vehicle Classes ({vhClass.length > 0 ? `${vhClass.length} filtered` : "All"})
              </button>
            </div>

            <div className="flex-1 overflow-auto flex flex-col gap-3 pr-1 text-xs">
              {/* Tab 1: Vehicle Categories */}
              {filterTab === "catg" && (
                <div className="flex flex-col gap-2.5">
                  <div className={`p-2.5 border rounded text-[11px] font-semibold flex items-center justify-between ${
                    isDark
                      ? "bg-[#0284c7]/10 border-[#0284c7]/40 text-[#7dd3fc]"
                      : "bg-sky-50 border-sky-200 text-sky-800"
                  }`}>
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
                      className={`px-2 py-1 rounded text-[10px] transition ${
                        isDark ? "bg-[#152238] hover:bg-[#1e3152] text-[#94a3b8]" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      Select All ({ALL_VH_CATG.length})
                    </button>
                    <button
                      onClick={() => setVhCatg([])}
                      className={`px-2 py-1 rounded text-[10px] transition ${
                        isDark ? "bg-[#152238] hover:bg-[#1e3152] text-[#94a3b8]" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      Clear All
                    </button>
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded border max-h-[380px] overflow-auto ${
                    isDark ? "bg-[#070d18] border-[#1a2842]" : "bg-slate-50 border-slate-200"
                  }`}>
                    {(['LMV', 'LPV', ...ALL_VH_CATG.filter(c => !['LMV', 'LPV'].includes(c))]).map((catg) => {
                      const isDefault = DEFAULT_VH_CATG.includes(catg);
                      const fullName = ALL_VH_CATG_DICT[catg] || catg;
                      return (
                        <label
                          key={catg}
                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-[11px] border transition ${
                            isDefault
                              ? isDark
                                ? "bg-[#0e1f38] border-[#0284c7]/50 text-[#38bdf8] font-bold"
                                : "bg-sky-50 border-sky-300 text-sky-800 font-bold"
                              : isDark
                              ? "bg-[#0b1424] border-[#16233a] text-[#cbd5e1] hover:border-[#253757]"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={vhCatg.includes(catg)}
                            onChange={(e) => {
                              const newCatg = e.target.checked
                                ? [...vhCatg, catg]
                                : vhCatg.filter((c) => c !== catg);
                              setVhCatg(newCatg);
                              updateSegmentFromSelections(newCatg, fuels);
                            }}
                            className="rounded border-slate-300 text-[#0284c7]"
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
                    <span className={`text-[10px] font-bold uppercase ${isDark ? "text-[#818cf8]" : "text-indigo-600"}`}>
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
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          isDark ? "bg-[#152238] hover:bg-[#1e3152] text-[#94a3b8]" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setFuels([])}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          isDark ? "bg-[#152238] hover:bg-[#1e3152] text-[#94a3b8]" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className={`grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3 rounded border max-h-[380px] overflow-auto ${
                    isDark ? "bg-[#070d18] border-[#1a2842]" : "bg-slate-50 border-slate-200"
                  }`}>
                    {Object.entries(ALL_FUELS_DICT).map(([code, name]) => (
                      <label
                        key={code}
                        className={`flex items-center gap-1.5 p-1 rounded cursor-pointer text-[11px] transition ${
                          isDark
                            ? "hover:bg-[#0f1b30] text-[#cbd5e1]"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={fuels.includes(code)}
                          onChange={(e) => {
                            const newFuels = e.target.checked
                              ? [...fuels, code]
                              : fuels.filter((f) => f !== code);
                            setFuels(newFuels);
                            updateSegmentFromSelections(vhCatg, newFuels);
                          }}
                          className="rounded border-slate-300 text-[#0284c7]"
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
                    <span className={`text-[10px] font-bold uppercase ${isDark ? "text-[#818cf8]" : "text-indigo-600"}`}>
                      Emission Norms ({norms.length > 0 ? `${norms.length} filtered` : "All Norms"})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNorms(Object.keys(ALL_NORMS_DICT))}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          isDark ? "bg-[#152238] hover:bg-[#1e3152] text-[#94a3b8]" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setNorms([])}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          isDark ? "bg-[#152238] hover:bg-[#1e3152] text-[#94a3b8]" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        Clear All (No Filter)
                      </button>
                    </div>
                  </div>

                  <div className={`grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3 rounded border max-h-[380px] overflow-auto ${
                    isDark ? "bg-[#070d18] border-[#1a2842]" : "bg-slate-50 border-slate-200"
                  }`}>
                    {Object.entries(ALL_NORMS_DICT).map(([code, name]) => (
                      <label
                        key={code}
                        className={`flex items-center gap-1.5 p-1 rounded cursor-pointer text-[11px] transition ${
                          isDark
                            ? "hover:bg-[#0f1b30] text-[#cbd5e1]"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={norms.includes(code)}
                          onChange={(e) => {
                            if (e.target.checked) setNorms([...norms, code]);
                            else setNorms(norms.filter((n) => n !== code));
                          }}
                          className="rounded border-slate-300 text-[#0284c7]"
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
                    <span className={`text-[10px] font-bold uppercase ${isDark ? "text-[#818cf8]" : "text-indigo-600"}`}>
                      Vehicle Classes ({vhClass.length > 0 ? `${vhClass.length} filtered` : "All Classes"})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setVhClass(Object.keys(ALL_VHCLASS_DICT))}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          isDark ? "bg-[#152238] hover:bg-[#1e3152] text-[#94a3b8]" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setVhClass([])}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          isDark ? "bg-[#152238] hover:bg-[#1e3152] text-[#94a3b8]" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        Clear All (No Filter)
                      </button>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 rounded border max-h-[380px] overflow-auto ${
                    isDark ? "bg-[#070d18] border-[#1a2842]" : "bg-slate-50 border-slate-200"
                  }`}>
                    {Object.entries(ALL_VHCLASS_DICT).map(([code, name]) => (
                      <label
                        key={code}
                        className={`flex items-center gap-1.5 p-1 rounded cursor-pointer text-[11px] transition ${
                          isDark
                            ? "hover:bg-[#0f1b30] text-[#cbd5e1]"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={vhClass.includes(code)}
                          onChange={(e) => {
                            if (e.target.checked) setVhClass([...vhClass, code]);
                            else setVhClass(vhClass.filter((c) => c !== code));
                          }}
                          className="rounded border-slate-300 text-[#0284c7]"
                        />
                        <span className="truncate">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`flex justify-end gap-2 pt-2 border-t ${
              isDark ? "border-[#162238]" : "border-slate-200"
            }`}>
              <button
                onClick={() => {
                  handleSegmentChange("PV");
                  setNorms([]);
                  setVhClass([]);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded transition ${
                  isDark
                    ? "bg-[#152238] hover:bg-[#1e3152] text-[#94a3b8]"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Reset to PV (LMV+LPV, Non-EV)
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="px-4 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-xs font-bold rounded text-white shadow"
              >
                Save & Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* EXECUTIVE ANALYTICS DASHBOARD TAB */}
      {mainTab === "dashboard" && (
        <ExecutiveDashboard
          theme={theme}
          liveScrapedRows={allLiveScrapedRows.length > 0 ? allLiveScrapedRows : rtos.flatMap((r) => r.data || [])}
          oemDb={oemDb}
          rtoDt={rtoDt}
        />
      )}

      {/* OEM & RTO DATABASE MANAGER TAB */}
      {mainTab === "database" && (
        <DatabaseManager
          theme={theme}
          onOemDbChange={setOemDb}
          onRtoDtChange={setRtoDt}
        />
      )}
    </div>
  );
}
