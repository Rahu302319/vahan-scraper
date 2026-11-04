"""
PyQt6 Ultrafast Multi-Threaded Worker for Vahan Parivahan Scraper.
Runs concurrent persistent sessions for blazing-fast batch extraction across all 87 Kerala RTOs.
"""

import os
import time
import queue
import threading
from typing import List, Dict, Any, Optional
import pandas as pd
from PyQt6.QtCore import QThread, pyqtSignal

from vahan_core import VahanScraper, consolidate_all_rtos


class VahanFetchWorker(QThread):
    """
    Ultrafast Multi-Threaded background worker.
    Uses a pool of concurrent persistent worker threads (e.g. 5-8 workers)
    to process all 87 RTOs in parallel with auto-retry (3 attempts).
    """

    sig_log = pyqtSignal(str, str)                      # message, level ('INFO', 'SUCCESS', 'WARNING', 'ERROR')
    sig_status = pyqtSignal(str)                        # short status bar text
    sig_rto_start = pyqtSignal(int, str, str)           # table_index, code, name
    sig_rto_retry = pyqtSignal(int, str, int, int, str) # table_index, code, attempt, max_retries, err_msg
    sig_rto_done = pyqtSignal(int, str, str, bool, int, int, str, object) # table_index, code, name, success, rows, total, err, df
    sig_progress = pyqtSignal(int, int, str)            # current_done, total_count, eta_string
    sig_finished = pyqtSignal(dict)                     # summary dict

    def __init__(
        self,
        rtos_to_fetch: List[Dict[str, Any]],
        config: Dict[str, Any],
        parent=None,
    ):
        super().__init__(parent)
        self.rtos_to_fetch = rtos_to_fetch
        self.config = config
        self._is_stopped = False
        self._pause_event = threading.Event()
        self._pause_event.set()

        self.lock = threading.Lock()
        self.collected_dfs: List[pd.DataFrame] = []
        self.failed_rtos: List[Dict[str, Any]] = []
        self.completed_count = 0
        self.success_count = 0
        self.failed_count = 0
        self.total_vehicles = 0
        self.start_time = 0.0

    def pause(self):
        self._pause_event.clear()
        self.sig_log.emit("⏸ Scraper paused by user.", "WARNING")
        self.sig_status.emit("⏸ Paused")

    def resume(self):
        self._pause_event.set()
        self.sig_log.emit("▶ Scraper resumed.", "INFO")
        self.sig_status.emit("▶ Running...")

    def stop(self):
        self._is_stopped = True
        self._pause_event.set()
        self.sig_log.emit("⏹ Stopping scraper threads...", "WARNING")
        self.sig_status.emit("⏹ Stopping...")

    def is_paused(self) -> bool:
        return not self._pause_event.is_set()

    def run(self):
        total = len(self.rtos_to_fetch)
        if total == 0:
            self.sig_log.emit("No RTOs specified to fetch.", "WARNING")
            self.sig_finished.emit({"success": 0, "failed": 0, "total": 0})
            return

        # Number of concurrent workers (default: 6 for ultrafast speed, or single thread if user selected 1)
        num_workers = int(self.config.get("threads", 6))
        # Don't create more workers than items
        num_workers = max(1, min(num_workers, total))

        max_retries = int(self.config.get("max_retries", 3))
        year = str(self.config.get("year", "2026"))
        yaxis = str(self.config.get("yaxis", "Maker"))
        xaxis = str(self.config.get("xaxis", "Month Wise"))
        year_type = str(self.config.get("year_type", "C"))
        vh_catg = self.config.get("vh_catg")
        fuels = self.config.get("fuels")
        norms = self.config.get("norms")
        vh_class = self.config.get("vh_class")
        output_dir = self.config.get("output_dir", os.path.join(os.getcwd(), "output"))
        os.makedirs(output_dir, exist_ok=True)

        self.sig_log.emit(
            f"⚡ Launching ULTRAFAST engine with {num_workers} concurrent workers for {total} RTO(s) [Year: {year}]...",
            "SUCCESS"
        )
        self.sig_status.emit(f"Spawning {num_workers} parallel workers...")

        # Fill thread-safe task queue
        task_queue = queue.Queue()
        for rto in self.rtos_to_fetch:
            task_queue.put(rto)

        self.start_time = time.time()

        def worker_loop(worker_id: int):
            # Each worker thread maintains its OWN independent persistent session
            scraper = VahanScraper()
            try:
                scraper.init_session()
                scraper.select_state(self.config.get("state", "KL"))
            except Exception as init_err:
                self.sig_log.emit(f"[Worker {worker_id}] Session init failed: {init_err}", "ERROR")
                return

            while not self._is_stopped:
                try:
                    rto = task_queue.get_nowait()
                except queue.Empty:
                    break

                # Pause support
                self._pause_event.wait()
                if self._is_stopped:
                    task_queue.task_done()
                    break

                rto_val = rto["value"]
                rto_code = rto["code"]
                rto_name = rto["name"]
                table_idx = rto.get("table_index", 0)

                self.sig_rto_start.emit(table_idx, rto_code, rto_name)

                rto_success = False
                last_err = ""
                df_result = None

                # Auto-Retry Loop (3 attempts)
                for attempt in range(1, max_retries + 1):
                    if self._is_stopped:
                        break

                    if attempt > 1:
                        self.sig_rto_retry.emit(table_idx, rto_code, attempt, max_retries, last_err)
                        self.sig_log.emit(
                            f"🔄 [Worker {worker_id}] Auto-Retrying {rto_code} ({rto_name}) — Attempt {attempt}/{max_retries}...",
                            "WARNING"
                        )

                    try:
                        raw_bytes, df_result = scraper.fetch_rto_data(
                            rto_value=rto_val,
                            rto_code=rto_code,
                            rto_name=rto_name,
                            year=year,
                            yaxis=yaxis,
                            xaxis=xaxis,
                            year_type=year_type,
                            vh_catg=vh_catg,
                            fuels=fuels,
                            norms=norms,
                            vh_class=vh_class,
                        )

                        # Save only XLSX with strictly required format: <RTO Name>-<Year>.xlsx
                        safe_name = "".join(c for c in rto_name if c not in r'\/:*?"<>|').strip()
                        xlsx_filename = f"{safe_name}-{year}.xlsx"
                        xlsx_path = os.path.join(output_dir, xlsx_filename)

                        with open(xlsx_path, "wb") as f_out:
                            f_out.write(raw_bytes)

                        rto_success = True
                        break

                    except Exception as e:
                        last_err = str(e)
                        if attempt < max_retries and not self._is_stopped:
                            time.sleep(1.0 * attempt)
                            try:
                                scraper.init_session()
                                scraper.select_state(self.config.get("state", "KL"))
                            except:
                                pass

                # Update shared counters safely
                with self.lock:
                    self.completed_count += 1
                    done_now = self.completed_count

                    if rto_success and df_result is not None:
                        self.success_count += 1
                        self.collected_dfs.append(df_result)
                        tot_v = int(df_result["TOTAL"].sum()) if "TOTAL" in df_result.columns else 0
                        self.total_vehicles += tot_v
                        row_cnt = len(df_result)

                        self.sig_log.emit(
                            f"✓ [{done_now}/{total}] {rto_code} — {rto_name}: {row_cnt} makers, {tot_v:,} vehicles (Worker {worker_id})",
                            "SUCCESS"
                        )
                        self.sig_rto_done.emit(table_idx, rto_code, rto_name, True, row_cnt, tot_v, "", df_result)
                    else:
                        self.failed_count += 1
                        self.failed_rtos.append(rto)
                        self.sig_log.emit(
                            f"✗ [{done_now}/{total}] {rto_code} — {rto_name} failed after {max_retries} attempts: {last_err}",
                            "ERROR"
                        )
                        self.sig_rto_done.emit(table_idx, rto_code, rto_name, False, 0, 0, last_err, None)

                    # Compute Speed & ETA
                    elapsed = max(0.1, time.time() - self.start_time)
                    speed = done_now / elapsed  # RTOs per second
                    rem_items = total - done_now
                    eta_sec = int(rem_items / speed) if speed > 0 else 0
                    m, s = divmod(eta_sec, 60)
                    eta_str = f"{m}m {s:02d}s" if m > 0 else f"{s}s"
                    eta_display = f"{eta_str} ({speed:.1f} RTOs/s)"

                    self.sig_progress.emit(done_now, total, eta_display)
                    self.sig_status.emit(f"Processed: {done_now}/{total} ({speed:.1f} RTOs/sec) | ETA: {eta_str}")

                task_queue.task_done()

        # Spawn threads
        threads = []
        for i in range(num_workers):
            t = threading.Thread(target=worker_loop, args=(i + 1,), daemon=True)
            t.start()
            threads.append(t)

        for t in threads:
            t.join()

        # Generate Master Consolidated Excel (XLSX only, no CSV)
        if self.collected_dfs and not self._is_stopped:
            self.sig_status.emit("Generating 3-sheet master consolidated Excel...")
            self.sig_log.emit("Generating Master Consolidated Excel (XLSX only)...", "INFO")
            try:
                state_code = self.config.get("state", "KL")
                master_xlsx = os.path.join(output_dir, f"{state_code}_ALL_RTO_CONSOLIDATED_{year}.xlsx")
                consolidate_all_rtos(self.collected_dfs, master_xlsx, output_csv_path=None)
                self.sig_log.emit(f"★ Master Consolidated Excel: {master_xlsx}", "SUCCESS")
            except Exception as ce:
                self.sig_log.emit(f"Consolidation error: {str(ce)}", "ERROR")

        total_elapsed = time.time() - self.start_time
        mins, secs = divmod(int(total_elapsed), 60)
        overall_speed = total / max(0.1, total_elapsed)
        summary = {
            "success": self.success_count,
            "failed": self.failed_count,
            "total": total,
            "total_vehicles": self.total_vehicles,
            "elapsed": f"{mins}m {secs:02d}s",
            "speed": f"{overall_speed:.1f} RTOs/sec",
            "stopped": self._is_stopped,
            "failed_rtos": self.failed_rtos,
        }
        self.sig_status.emit(f"Completed in {summary['elapsed']} ({overall_speed:.1f} RTOs/s)! Success: {self.success_count} | Failed: {self.failed_count}")
        self.sig_finished.emit(summary)
