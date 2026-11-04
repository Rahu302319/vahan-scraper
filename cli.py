"""
Vahan Parivahan Dashboard - Kerala 87 RTO CLI Batch Scraper
Runs headlessly in the terminal with Ultrafast Multi-Threading.
"""

import os
import re
import sys
import time
import queue
import threading
import argparse
from typing import List, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from vahan_core import (
    VahanScraper, DEFAULT_FUELS, DEFAULT_VH_CATG, consolidate_all_rtos
)


def run_cli():
    parser = argparse.ArgumentParser(
        description="Vahan 4 Dashboard - Kerala 87 RTO Automated Data Scraper (Ultrafast Multi-threaded)"
    )
    parser.add_argument("--state", default="KL", help="State code (default: KL for Kerala)")
    parser.add_argument("--year", default="2026", help="Year (default: 2026)")
    parser.add_argument("--yaxis", default="Maker", help="Y-Axis grouping (default: Maker)")
    parser.add_argument("--xaxis", default="Month Wise", help="X-Axis grouping (default: Month Wise)")
    parser.add_argument("--threads", type=int, default=6, help="Number of concurrent worker threads (default: 6)")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of RTOs to fetch (0 for all 87)")
    parser.add_argument("--output", default="output", help="Output directory path (default: output)")
    parser.add_argument("--rto", nargs="*", help="Specific RTO codes to fetch (e.g. --rto KL26 KL04)")

    args = parser.parse_args()

    print("=" * 75)
    print("   ⚡ VAHAN 4 DASHBOARD - ULTRAFAST KERALA RTO BATCH SCRAPER")
    print(f"   State: {args.state} | Year: {args.year} | Workers: {args.threads} Threads")
    print(f"   Output Directory: {os.path.abspath(args.output)}")
    print("=" * 75)

    output_dir = os.path.abspath(args.output)
    os.makedirs(output_dir, exist_ok=True)

    scraper_init = VahanScraper()
    print("\n[1/3] Connecting to Vahan Parivahan Portal...")
    scraper_init.init_session()
    print("      ✓ Portal session established.")

    print(f"[2/3] Retrieving RTO directory for State: {args.state}...")
    rtos = scraper_init.select_state(args.state)
    print(f"      ✓ Loaded {len(rtos)} Kerala RTOs.")

    if args.rto:
        requested = [r.upper() for r in args.rto]
        rtos = [r for r in rtos if r["code"].upper() in requested or r["value"] in requested]
        print(f"      Filtered to {len(rtos)} matching RTOs: {[r['code'] for r in rtos]}")

    if args.limit > 0:
        rtos = rtos[:args.limit]
        print(f"      Limited to first {len(rtos)} RTOs.")

    total = len(rtos)
    if total == 0:
        print("No RTOs to fetch. Exiting.")
        return

    num_threads = min(args.threads, total)
    print(f"\n[3/3] Starting Ultrafast batch fetch with {num_threads} concurrent workers...")
    print("-" * 75)

    task_queue = queue.Queue()
    for rto in rtos:
        task_queue.put(rto)

    collected_dfs = []
    lock = threading.Lock()
    success_count = 0
    failed_count = 0
    total_vehicles = 0
    completed_count = 0
    start_time = time.time()

    def worker_job(worker_id):
        nonlocal success_count, failed_count, total_vehicles, completed_count
        scraper = VahanScraper()
        try:
            scraper.init_session()
            scraper.select_state(args.state)
        except Exception as e:
            print(f"[Worker {worker_id}] Init error: {e}")
            return

        while True:
            try:
                rto = task_queue.get_nowait()
            except queue.Empty:
                break

            rto_val = rto["value"]
            rto_code = rto["code"]
            rto_name = rto["name"]

            fetch_success = False
            last_error = ""
            df_result = None

            for attempt in range(1, 4):
                try:
                    raw_bytes, df_result = scraper.fetch_rto_data(
                        rto_value=rto_val,
                        rto_code=rto_code,
                        rto_name=rto_name,
                        year=args.year,
                        yaxis=args.yaxis,
                        xaxis=args.xaxis,
                        vh_catg=DEFAULT_VH_CATG,
                        fuels=DEFAULT_FUELS,
                    )

                    # Save only XLSX with strictly required format: <RTO Name without SRTO/RTO>-<Year>.xlsx
                    clean_name = re.sub(r'[\s\-_]+(?:SRTO|RTO)\s*$', '', rto_name, flags=re.IGNORECASE).strip() or rto_name.strip()
                    safe_name = "".join(c for c in clean_name if c not in r'\/:*?"<>|').strip()
                    xlsx_path = os.path.join(output_dir, f"{safe_name}-{args.year}.xlsx")

                    with open(xlsx_path, "wb") as f_out:
                        f_out.write(raw_bytes)

                    fetch_success = True
                    break

                except Exception as e:
                    last_error = str(e)
                    if attempt < 3:
                        time.sleep(1.0 * attempt)
                        try:
                            scraper.init_session()
                            scraper.select_state(args.state)
                        except:
                            pass

            with lock:
                completed_count += 1
                curr = completed_count
                if fetch_success and df_result is not None:
                    success_count += 1
                    collected_dfs.append(df_result)
                    tot_v = int(df_result["TOTAL"].sum()) if "TOTAL" in df_result.columns else 0
                    total_vehicles += tot_v
                    print(f"[{curr:2d}/{total:2d}] ✓ {rto_code:5s} - {rto_name[:26]:26s} | {len(df_result):2d} makers, {tot_v:6,d} vehicles (W{worker_id})")
                else:
                    failed_count += 1
                    print(f"[{curr:2d}/{total:2d}] ✗ {rto_code:5s} - {rto_name[:26]:26s} | FAILED (3 attempts): {last_error[:35]}")

            task_queue.task_done()

    threads = []
    for i in range(num_threads):
        t = threading.Thread(target=worker_job, args=(i + 1,), daemon=True)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    # Consolidate
    print("-" * 75)
    if collected_dfs:
        print("Generating Master Consolidated Excel (XLSX only)...")
        master_xlsx = os.path.join(output_dir, f"{args.state}_ALL_{total}_RTO_CONSOLIDATED_{args.year}.xlsx")
        consolidate_all_rtos(collected_dfs, master_xlsx, output_csv_path=None)
        print(f"★ Master Excel: {master_xlsx}")

    total_time = time.time() - start_time
    mins, secs = divmod(int(total_time), 60)
    speed = total / max(0.1, total_time)
    print("\n" + "=" * 75)
    print(f"   ⚡ ULTRAFAST SCRAPING COMPLETED IN {mins}m {secs:02d}s ({speed:.1f} RTOs/second)!")
    print(f"   Success: {success_count} / {total} | Failed: {failed_count}")
    print(f"   Total Vehicles Registered: {total_vehicles:,}")
    print("=" * 75)


if __name__ == "__main__":
    run_cli()
