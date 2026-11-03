"""
Vahan Parivahan Dashboard - Kerala 87 RTO Batch Scraper
Main Launcher Script
Usage:
    python run.py         (Launches the PyQt6 Graphical Interface)
    python run.py --cli   (Runs headlessly in Terminal/PowerShell)
"""

import sys

def main():
    if "--cli" in sys.argv:
        # Remove --cli flag and run CLI
        sys.argv.remove("--cli")
        from cli import run_cli
        run_cli()
    else:
        # Default to PyQt6 GUI
        from app import main as gui_main
        gui_main()

if __name__ == "__main__":
    main()

