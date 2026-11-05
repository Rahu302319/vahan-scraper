"""
PyQt6 Vahan Parivahan Dashboard - Kerala 87 RTO Batch Scraper
Combat & Compact Tactical UI/UX for Automotive Registration Analytics.
"""

import os
import re
import sys
import subprocess
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import pandas as pd
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QComboBox, QSpinBox, QDoubleSpinBox,
    QLineEdit, QFileDialog, QTableWidget, QTableWidgetItem, QHeaderView,
    QProgressBar, QTextEdit, QSplitter, QTabWidget, QCheckBox,
    QGroupBox, QDialog, QDialogButtonBox, QScrollArea, QMessageBox,
    QFrame, QSizePolicy
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QColor, QFont, QPalette

from vahan_core import (
    VahanScraper, DEFAULT_FUELS, ALL_FUELS_DICT,
    DEFAULT_VH_CATG, ALL_VH_CATG, ALL_VH_CATG_DICT,
    ALL_NORMS_DICT, ALL_VHCLASS_DICT, YAXIS_OPTIONS,
    consolidate_all_rtos
)
from worker import VahanFetchWorker


# =====================================================================
# Combat & Compact Tactical Dark Stylesheet (High-Density & Sleek)
# =====================================================================
COMBAT_COMPACT_QSS = """
QMainWindow {
    background-color: #060911;
}
QWidget {
    color: #cbd5e1;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    font-size: 12px;
}

/* Tactical Card Panels */
QFrame#tactical_header {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #0a1120, stop:1 #0f1a30);
    border: 1px solid #1e2c47;
    border-radius: 6px;
    padding: 4px 8px;
}
QFrame#tactical_deck {
    background-color: #0b1222;
    border: 1px solid #1c2a44;
    border-radius: 6px;
    padding: 6px 8px;
}
QFrame#panel_card {
    background-color: #090f1d;
    border: 1px solid #19253d;
    border-radius: 6px;
    padding: 6px;
}
QFrame#kpi_hud {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #0c1424, stop:1 #101b33);
    border: 1px solid #1e2e4f;
    border-radius: 5px;
    padding: 4px 8px;
}

/* Tactical Labels & Badges */
QLabel {
    color: #cbd5e1;
}
QLabel#badge_state {
    background-color: #0284c7;
    color: #ffffff;
    font-weight: 800;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.5px;
}
QLabel#badge_online {
    background-color: #064e3b;
    border: 1px solid #059669;
    color: #34d399;
    font-weight: 700;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
}
QLabel#hud_tag {
    background-color: #111c33;
    border: 1px solid #1e2e4f;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
}
QLabel#title_main {
    font-size: 15px;
    font-weight: 800;
    color: #38bdf8;
    letter-spacing: 0.5px;
}
QLabel#field_tag {
    font-size: 10px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.6px;
}
QLabel#kpi_hud_title {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
QLabel#kpi_hud_val {
    font-size: 16px;
    font-weight: 800;
    color: #f8fafc;
}

/* Compact Form Controls */
QLineEdit, QComboBox, QSpinBox {
    background-color: #070d1a;
    border: 1px solid #1f2f4c;
    border-radius: 4px;
    padding: 4px 6px;
    color: #f1f5f9;
    font-weight: 600;
    font-size: 11px;
    min-height: 22px;
}
QLineEdit:focus, QComboBox:focus, QSpinBox:focus {
    border: 1px solid #38bdf8;
    background-color: #0b152b;
}
QLineEdit#path_edit {
    font-family: 'Consolas', monospace;
    font-size: 11px;
    color: #7dd3fc;
    background-color: #060b17;
    border: 1px solid #1b2842;
    padding: 4px 7px;
}
QComboBox QAbstractItemView {
    background-color: #0b1324;
    color: #f8fafc;
    selection-background-color: #0284c7;
    selection-color: #ffffff;
    border: 1px solid #233454;
    padding: 2px;
    outline: none;
}

/* Compact Buttons */
QPushButton {
    background-color: #152238;
    color: #e2e8f0;
    border: 1px solid #253757;
    border-radius: 4px;
    padding: 4px 10px;
    font-weight: 700;
    font-size: 11px;
    min-height: 22px;
}
QPushButton:hover {
    background-color: #1e3152;
    border-color: #3b527d;
}
QPushButton:pressed {
    background-color: #0b1322;
}
QPushButton:disabled {
    background-color: #0a0f1d;
    color: #475569;
    border-color: #151e30;
}

/* Combat Command Buttons */
QPushButton#btn_run_action {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #0284c7, stop:1 #0d9488);
    border: 1px solid #38bdf8;
    color: #ffffff;
    font-size: 12px;
    font-weight: 800;
    padding: 5px 14px;
    border-radius: 4px;
}
QPushButton#btn_run_action:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #0369a1, stop:1 #0f766e);
    border-color: #7dd3fc;
}

QPushButton#btn_pause_action {
    background-color: #92400e;
    border: 1px solid #d97706;
    color: #ffffff;
    font-weight: 700;
}
QPushButton#btn_pause_action:hover {
    background-color: #78350f;
}

QPushButton#btn_stop_action {
    background-color: #991b1b;
    border: 1px solid #dc2626;
    color: #ffffff;
    font-weight: 700;
}
QPushButton#btn_stop_action:hover {
    background-color: #7f1d1d;
}

QPushButton#btn_retry_action {
    background-color: #1e3a8a;
    border: 1px solid #3b82f6;
    color: #ffffff;
    font-weight: 700;
}
QPushButton#btn_retry_action:hover {
    background-color: #1d4ed8;
}

QPushButton#btn_export_action {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #065f46, stop:1 #047857);
    border: 1px solid #10b981;
    color: #ffffff;
    font-weight: 700;
}
QPushButton#btn_export_action:hover {
    background: #059669;
}

/* Compact Tables */
QTableWidget {
    background-color: #070d18;
    alternate-background-color: #0c1424;
    gridline-color: #162238;
    color: #e2e8f0;
    selection-background-color: #0284c7;
    selection-color: #ffffff;
    border: 1px solid #1a2842;
    border-radius: 4px;
    font-size: 11px;
    outline: none;
}
QTableWidget::item {
    padding: 3px 6px;
    border-bottom: 1px solid #111a2d;
    color: #cbd5e1;
}
QTableWidget::item:selected {
    background-color: #0284c7;
    color: #ffffff;
}
QHeaderView::section {
    background-color: #0e172a;
    color: #818cf8;
    padding: 4px 6px;
    border: none;
    border-right: 1px solid #1c2b47;
    border-bottom: 1px solid #243555;
    font-weight: 800;
    font-size: 10px;
    text-transform: uppercase;
}

/* Compact Tabs */
QTabWidget::pane {
    border: 1px solid #1a2842;
    border-radius: 5px;
    background-color: #090f1d;
    padding: 4px;
}
QTabBar::tab {
    background-color: #070b14;
    color: #64748b;
    padding: 5px 12px;
    margin-right: 3px;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    font-weight: 700;
    font-size: 11px;
}
QTabBar::tab:selected {
    background-color: #090f1d;
    color: #38bdf8;
    border-bottom: 2px solid #38bdf8;
}
QTabBar::tab:hover:!selected {
    color: #94a3b8;
    background-color: #0d1527;
}

/* Slim Tactical Progress Bar */
QProgressBar {
    background-color: #090f1d;
    border: 1px solid #1a2944;
    border-radius: 4px;
    text-align: center;
    color: #ffffff;
    font-weight: 800;
    font-size: 10px;
    height: 18px;
}
QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #0284c7, stop:0.5 #06b6d4, stop:1 #10b981);
    border-radius: 3px;
}

/* Console Log */
QTextEdit#console_log {
    background-color: #04070e;
    border: 1px solid #162238;
    border-radius: 4px;
    font-family: 'Consolas', monospace;
    font-size: 11px;
    color: #cbd5e1;
    padding: 6px;
}

/* Compact Scrollbars */
QScrollBar:vertical {
    border: none;
    background-color: #070d18;
    width: 8px;
    margin: 0px;
}
QScrollBar::handle:vertical {
    background-color: #1e2e4a;
    min-height: 20px;
    border-radius: 4px;
}
QScrollBar::handle:vertical:hover {
    background-color: #38bdf8;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}
"""


def apply_dark_table_palette(table: QTableWidget):
    """Enforces dark palette colors on QTableWidget to prevent white zebra striping."""
    p = table.palette()
    p.setColor(QPalette.ColorRole.Base, QColor("#070d18"))
    p.setColor(QPalette.ColorRole.AlternateBase, QColor("#0c1424"))
    p.setColor(QPalette.ColorRole.Text, QColor("#f1f5f9"))
    p.setColor(QPalette.ColorRole.WindowText, QColor("#f1f5f9"))
    p.setColor(QPalette.ColorRole.Highlight, QColor("#0284c7"))
    p.setColor(QPalette.ColorRole.HighlightedText, QColor("#ffffff"))
    table.setPalette(p)


class FilterDialog(QDialog):
    """Dialog to customize Vehicle Categories, Fuel Types, Norms, and Vehicle Classes."""

    def __init__(
        self,
        selected_vh: List[str],
        selected_fuels: List[str],
        selected_norms: Optional[List[str]] = None,
        selected_vh_class: Optional[List[str]] = None,
        parent=None
    ):
        super().__init__(parent)
        self.setWindowTitle("Filter Configuration — Vehicle Categories, Fuels, Norms & Vehicle Classes")
        self.resize(780, 560)
        self.setStyleSheet(COMBAT_COMPACT_QSS)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        layout.setSpacing(8)

        lbl = QLabel("Customize Filter Parameters (LIGHT PASSENGER VEHICLE & LIGHT MOTOR VEHICLE are default required):")
        lbl.setStyleSheet("color: #38bdf8; font-size: 11px; font-weight: 600;")
        layout.addWidget(lbl)

        tabs = QTabWidget()

        # Tab 1: Vehicle Categories
        vh_tab = QWidget()
        vh_layout = QVBoxLayout(vh_tab)
        vh_layout.setContentsMargins(8, 8, 8, 8)

        notice_box = QLabel("⭐ Default Required Categories: LIGHT MOTOR VEHICLE (LMV) & LIGHT PASSENGER VEHICLE (LPV)")
        notice_box.setStyleSheet("background-color: rgba(56, 189, 248, 0.12); color: #7dd3fc; border: 1px solid #0284c7; border-radius: 4px; padding: 4px 8px; font-weight: 700;")
        vh_layout.addWidget(notice_box)

        vh_scroll = QScrollArea()
        vh_scroll.setWidgetResizable(True)
        vh_w = QWidget()
        vh_w_layout = QVBoxLayout(vh_w)
        self.vh_checkboxes: Dict[str, QCheckBox] = {}

        # Display priority: LMV and LPV first, then the rest
        priority_order = ['LMV', 'LPV'] + [c for c in ALL_VH_CATG if c not in ['LMV', 'LPV']]
        for catg in priority_order:
            full_name = ALL_VH_CATG_DICT.get(catg, catg)
            is_priority = catg in DEFAULT_VH_CATG
            prefix = "⭐ " if is_priority else "   "
            cb = QCheckBox(f"{prefix}{full_name} ({catg})")
            if is_priority:
                cb.setStyleSheet("font-weight: 700; color: #38bdf8;")
            cb.setChecked(catg in selected_vh)
            self.vh_checkboxes[catg] = cb
            vh_w_layout.addWidget(cb)
        vh_scroll.setWidget(vh_w)

        vh_btns = QHBoxLayout()
        btn_def_vh = QPushButton("Reset to LMV + LPV (Default Required)")
        btn_def_vh.setStyleSheet("font-weight: 700; background-color: #0369a1; color: #ffffff;")
        btn_def_vh.clicked.connect(self._reset_default_vh)
        btn_sel_all_vh = QPushButton("Select All")
        btn_sel_all_vh.clicked.connect(lambda: [cb.setChecked(True) for cb in self.vh_checkboxes.values()])
        btn_clr_vh = QPushButton("Clear All")
        btn_clr_vh.clicked.connect(lambda: [cb.setChecked(False) for cb in self.vh_checkboxes.values()])

        vh_btns.addWidget(btn_def_vh)
        vh_btns.addWidget(btn_sel_all_vh)
        vh_btns.addWidget(btn_clr_vh)
        vh_layout.addLayout(vh_btns)
        vh_layout.addWidget(vh_scroll)
        tabs.addTab(vh_tab, f"Vehicle Categories ({len(ALL_VH_CATG)})")

        # Tab 2: Fuel Types
        fuel_tab = QWidget()
        fuel_layout = QVBoxLayout(fuel_tab)
        fuel_layout.setContentsMargins(8, 8, 8, 8)
        fuel_scroll = QScrollArea()
        fuel_scroll.setWidgetResizable(True)
        fuel_w = QWidget()
        fuel_w_layout = QVBoxLayout(fuel_w)
        self.fuel_checkboxes: Dict[str, QCheckBox] = {}
        for f_code, f_name in ALL_FUELS_DICT.items():
            cb = QCheckBox(f"{f_name} (Code: {f_code})")
            cb.setChecked(f_code in selected_fuels)
            self.fuel_checkboxes[f_code] = cb
            fuel_w_layout.addWidget(cb)
        fuel_scroll.setWidget(fuel_w)

        fuel_btns = QHBoxLayout()
        btn_def_f = QPushButton("Reset to 34 Fuels (Default)")
        btn_def_f.clicked.connect(self._reset_default_fuels)
        btn_sel_all_f = QPushButton("Select All")
        btn_sel_all_f.clicked.connect(lambda: [cb.setChecked(True) for cb in self.fuel_checkboxes.values()])
        btn_clr_f = QPushButton("Clear All")
        btn_clr_f.clicked.connect(lambda: [cb.setChecked(False) for cb in self.fuel_checkboxes.values()])

        fuel_btns.addWidget(btn_def_f)
        fuel_btns.addWidget(btn_sel_all_f)
        fuel_btns.addWidget(btn_clr_f)
        fuel_layout.addLayout(fuel_btns)
        fuel_layout.addWidget(fuel_scroll)
        tabs.addTab(fuel_tab, f"Fuel Types ({len(ALL_FUELS_DICT)})")

        # Tab 3: Norms (Emission Standards)
        norm_tab = QWidget()
        norm_layout = QVBoxLayout(norm_tab)
        norm_layout.setContentsMargins(8, 8, 8, 8)
        norm_scroll = QScrollArea()
        norm_scroll.setWidgetResizable(True)
        norm_w = QWidget()
        norm_w_layout = QVBoxLayout(norm_w)
        self.norm_checkboxes: Dict[str, QCheckBox] = {}
        sel_norms_set = set(selected_norms or [])
        for n_code, n_name in ALL_NORMS_DICT.items():
            cb = QCheckBox(f"{n_name} (Code: {n_code})")
            cb.setChecked(n_code in sel_norms_set)
            self.norm_checkboxes[n_code] = cb
            norm_w_layout.addWidget(cb)
        norm_scroll.setWidget(norm_w)

        norm_btns = QHBoxLayout()
        btn_sel_all_n = QPushButton("Select All Norms")
        btn_sel_all_n.clicked.connect(lambda: [cb.setChecked(True) for cb in self.norm_checkboxes.values()])
        btn_clr_n = QPushButton("Clear All (No Filter)")
        btn_clr_n.clicked.connect(lambda: [cb.setChecked(False) for cb in self.norm_checkboxes.values()])
        norm_btns.addWidget(btn_sel_all_n)
        norm_btns.addWidget(btn_clr_n)
        norm_layout.addLayout(norm_btns)
        norm_layout.addWidget(norm_scroll)
        tabs.addTab(norm_tab, f"Norms ({len(ALL_NORMS_DICT)})")

        # Tab 4: Vehicle Classes
        class_tab = QWidget()
        class_layout = QVBoxLayout(class_tab)
        class_layout.setContentsMargins(8, 8, 8, 8)
        class_scroll = QScrollArea()
        class_scroll.setWidgetResizable(True)
        class_w = QWidget()
        class_w_layout = QVBoxLayout(class_w)
        self.class_checkboxes: Dict[str, QCheckBox] = {}
        sel_class_set = set(selected_vh_class or [])
        for c_code, c_name in ALL_VHCLASS_DICT.items():
            cb = QCheckBox(f"{c_name} (Code: {c_code})")
            cb.setChecked(c_code in sel_class_set)
            self.class_checkboxes[c_code] = cb
            class_w_layout.addWidget(cb)
        class_scroll.setWidget(class_w)

        class_btns = QHBoxLayout()
        btn_sel_all_c = QPushButton("Select All Classes")
        btn_sel_all_c.clicked.connect(lambda: [cb.setChecked(True) for cb in self.class_checkboxes.values()])
        btn_clr_c = QPushButton("Clear All (No Filter)")
        btn_clr_c.clicked.connect(lambda: [cb.setChecked(False) for cb in self.class_checkboxes.values()])
        class_btns.addWidget(btn_sel_all_c)
        class_btns.addWidget(btn_clr_c)
        class_layout.addLayout(class_btns)
        class_layout.addWidget(class_scroll)
        tabs.addTab(class_tab, f"Vehicle Classes ({len(ALL_VHCLASS_DICT)})")

        layout.addWidget(tabs)

        bbox = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        bbox.accepted.connect(self.accept)
        bbox.rejected.connect(self.reject)
        layout.addWidget(bbox)

    def _reset_default_vh(self):
        for catg, cb in self.vh_checkboxes.items():
            cb.setChecked(catg in DEFAULT_VH_CATG)

    def _reset_default_fuels(self):
        for f_code, cb in self.fuel_checkboxes.items():
            cb.setChecked(f_code in DEFAULT_FUELS)

    def get_selected(self) -> Tuple[List[str], List[str], List[str], List[str]]:
        vh = [c for c, cb in self.vh_checkboxes.items() if cb.isChecked()]
        fuels = [f for f, cb in self.fuel_checkboxes.items() if cb.isChecked()]
        norms = [n for n, cb in self.norm_checkboxes.items() if cb.isChecked()]
        vh_class = [c for c, cb in self.class_checkboxes.items() if cb.isChecked()]
        return vh, fuels, norms, vh_class


class MainWindow(QMainWindow):
    """Main Application Window with Combat & Compact Tactical UI/UX."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Vahan 4 Dashboard — Kerala 87 RTO Batch Scraper (Tactical UI)")
        self.resize(1340, 840)
        self.setMinimumSize(1080, 680)
        self.setStyleSheet(COMBAT_COMPACT_QSS)

        self.rtos_data: List[Dict[str, Any]] = []
        self.worker: Optional[VahanFetchWorker] = None
        self.active_dfs: Dict[str, pd.DataFrame] = {}
        self.active_dfs_by_year: Dict[str, Dict[str, pd.DataFrame]] = {}
        self.failed_rtos_list: List[Dict[str, Any]] = []

        # Filters & Output Directory
        self.selected_vh_catg = list(DEFAULT_VH_CATG)
        self.selected_fuels = list(DEFAULT_FUELS)
        self.selected_norms: List[str] = []
        self.selected_vh_class: List[str] = []
        self.output_dir = os.path.abspath(os.path.join(os.getcwd(), "output"))

        self._build_ui()
        QTimer.singleShot(150, self.load_kerala_rtos)

    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(8, 8, 8, 8)
        main_layout.setSpacing(6)

        # 1. Compact Header Bar
        main_layout.addWidget(self._build_compact_header())

        # 2. Combat Control Deck (2-Tier Compact Deck: Config + Path + Action Bar)
        main_layout.addWidget(self._build_combat_control_deck())

        # 3. Main Workspace Splitter (Left: RTO Table, Right: Studio Tabs)
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(self._build_rto_manager_panel())
        splitter.addWidget(self._build_studio_panel())
        splitter.setStretchFactor(0, 4)
        splitter.setStretchFactor(1, 6)
        main_layout.addWidget(splitter, 1)

        # 4. Slim Telemetry Footer Bar
        main_layout.addWidget(self._build_footer_bar())

    # -------------------------------------------------------------
    # 1. Compact Header Bar
    # -------------------------------------------------------------
    def _build_compact_header(self) -> QWidget:
        header = QFrame()
        header.setObjectName("tactical_header")
        layout = QHBoxLayout(header)
        layout.setContentsMargins(10, 4, 10, 4)
        layout.setSpacing(8)

        # Title & Badges
        badge_state = QLabel("KL • KERALA")
        badge_state.setObjectName("badge_state")
        layout.addWidget(badge_state)

        title = QLabel("VAHAN 4 DASHBOARD — 87 RTO BATCH SCRAPER")
        title.setObjectName("title_main")
        layout.addWidget(title)

        tag_desc = QLabel("| Maker Month-Wise Engine")
        tag_desc.setStyleSheet("color: #64748b; font-size: 11px; font-weight: 600;")
        layout.addWidget(tag_desc)

        layout.addStretch()

        # Server Status Badge
        self.lbl_server_status = QLabel("🟢 Portal: Ready")
        self.lbl_server_status.setObjectName("badge_online")
        layout.addWidget(self.lbl_server_status)

        return header

    # -------------------------------------------------------------
    # 2. Combat Control Deck (Config + Path Selector + Action Bar)
    # -------------------------------------------------------------
    def _build_combat_control_deck(self) -> QWidget:
        card = QFrame()
        card.setObjectName("tactical_deck")
        v_layout = QVBoxLayout(card)
        v_layout.setContentsMargins(8, 6, 8, 6)
        v_layout.setSpacing(6)

        # ---------------------------------------------------------
        # Row 1: Target RTO, Year, Speed, Auto-Retry, Filters, Path
        # ---------------------------------------------------------
        row1 = QHBoxLayout()
        row1.setSpacing(8)

        # Target RTO
        rto_box = QVBoxLayout()
        rto_box.setSpacing(2)
        lbl_rto = QLabel("Target RTO Selection:")
        lbl_rto.setObjectName("field_tag")
        self.combo_rto_target = QComboBox()
        self.combo_rto_target.setMinimumWidth(240)
        self.combo_rto_target.addItem("🚀 ALL 87 Kerala RTOs (Sequential Batch)", "ALL")
        self.combo_rto_target.currentIndexChanged.connect(self._on_rto_target_changed)
        rto_box.addWidget(lbl_rto)
        rto_box.addWidget(self.combo_rto_target)
        row1.addLayout(rto_box)

        # Year Dropdown
        year_box = QVBoxLayout()
        year_box.setSpacing(2)
        lbl_year = QLabel("Year:")
        lbl_year.setObjectName("field_tag")
        self.combo_year = QComboBox()
        self.combo_year.setMinimumWidth(85)
        for y in ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"]:
            self.combo_year.addItem(y, y)
        self.combo_year.setCurrentText("2026")
        self.combo_year.currentTextChanged.connect(self._on_year_changed)
        year_box.addWidget(lbl_year)
        year_box.addWidget(self.combo_year)
        row1.addLayout(year_box)

        # Dimension (Y-Axis) Dropdown
        yaxis_box = QVBoxLayout()
        yaxis_box.setSpacing(2)
        lbl_yaxis = QLabel("Dimension (Y-Axis):")
        lbl_yaxis.setObjectName("field_tag")
        self.combo_yaxis = QComboBox()
        self.combo_yaxis.setMinimumWidth(150)
        self.combo_yaxis.addItem("Maker (OEM Brands)", "Maker")
        self.combo_yaxis.addItem("Vehicle Category", "Vehicle Category")
        self.combo_yaxis.addItem("Norms (Emission)", "Norms")
        self.combo_yaxis.addItem("Vehicle Class", "Vehicle Class")
        self.combo_yaxis.addItem("Fuel Type", "Fuel")
        self.combo_yaxis.currentIndexChanged.connect(self._on_yaxis_changed)
        yaxis_box.addWidget(lbl_yaxis)
        yaxis_box.addWidget(self.combo_yaxis)
        row1.addLayout(yaxis_box)

        # Speed Mode
        speed_box = QVBoxLayout()
        speed_box.setSpacing(2)
        lbl_speed = QLabel("Speed Mode:")
        lbl_speed.setObjectName("field_tag")
        self.combo_speed = QComboBox()
        self.combo_speed.addItem("⚡ ULTRAFAST (6 Workers)", 6)
        self.combo_speed.addItem("🚀 MAX TURBO (8 Workers)", 8)
        self.combo_speed.addItem("⚡ FAST (4 Workers)", 4)
        self.combo_speed.addItem("🐢 SAFE (1 Worker)", 1)
        self.combo_speed.setCurrentIndex(0)
        self.combo_speed.setMinimumWidth(170)
        speed_box.addWidget(lbl_speed)
        speed_box.addWidget(self.combo_speed)
        row1.addLayout(speed_box)

        # Auto-Retry 3x
        retry_box = QVBoxLayout()
        retry_box.setSpacing(2)
        lbl_retry = QLabel("Auto-Retry:")
        lbl_retry.setObjectName("field_tag")
        self.spin_retries = QSpinBox()
        self.spin_retries.setRange(1, 10)
        self.spin_retries.setValue(3)
        self.spin_retries.setPrefix("🔁 Auto-Retry: ")
        self.spin_retries.setSuffix("x")
        self.spin_retries.setMinimumWidth(130)
        retry_box.addWidget(lbl_retry)
        retry_box.addWidget(self.spin_retries)
        row1.addLayout(retry_box)

        # Filters Button
        filter_box = QVBoxLayout()
        filter_box.setSpacing(2)
        lbl_f = QLabel("Filter Parameters:")
        lbl_f.setObjectName("field_tag")
        self.btn_filters = QPushButton("⚙ Filters (LMV, LPV Default)")
        self.btn_filters.clicked.connect(self._open_filters_dialog)
        filter_box.addWidget(lbl_f)
        filter_box.addWidget(self.btn_filters)
        row1.addLayout(filter_box)

        # PATH SELECTION OPTION (Directly in toolbar)
        path_box = QVBoxLayout()
        path_box.setSpacing(2)
        lbl_path = QLabel("Output Path (Save Location):")
        lbl_path.setObjectName("field_tag")

        path_h = QHBoxLayout()
        path_h.setSpacing(4)
        self.edit_output_path = QLineEdit()
        self.edit_output_path.setObjectName("path_edit")
        self.edit_output_path.setText(self.output_dir)
        self.edit_output_path.setPlaceholderText("Select or enter output directory...")
        self.edit_output_path.textChanged.connect(self._on_output_path_changed)

        btn_browse = QPushButton("📁 Browse...")
        btn_browse.clicked.connect(self._browse_output_path)
        btn_open = QPushButton("📂 Open")
        btn_open.clicked.connect(self._open_output_folder)

        path_h.addWidget(self.edit_output_path, 1)
        path_h.addWidget(btn_browse)
        path_h.addWidget(btn_open)

        path_box.addWidget(lbl_path)
        path_box.addLayout(path_h)
        row1.addLayout(path_box, 1)

        v_layout.addLayout(row1)

        # ---------------------------------------------------------
        # Row 2: Action Commander Toolbar + Live HUD Badges
        # ---------------------------------------------------------
        row2 = QHBoxLayout()
        row2.setSpacing(8)

        # PRIMARY RUN ACTION BUTTON
        self.btn_run = QPushButton("▶ START SCRAPING")
        self.btn_run.setObjectName("btn_run_action")
        self.btn_run.setFixedHeight(28)
        self.btn_run.clicked.connect(self.on_run_scraper_clicked)
        row2.addWidget(self.btn_run)

        # Pause Action
        self.btn_pause = QPushButton("⏸ Pause")
        self.btn_pause.setObjectName("btn_pause_action")
        self.btn_pause.setFixedHeight(28)
        self.btn_pause.setEnabled(False)
        self.btn_pause.clicked.connect(self.toggle_pause)
        row2.addWidget(self.btn_pause)

        # Stop Action
        self.btn_stop = QPushButton("⏹ Stop")
        self.btn_stop.setObjectName("btn_stop_action")
        self.btn_stop.setFixedHeight(28)
        self.btn_stop.setEnabled(False)
        self.btn_stop.clicked.connect(self.stop_fetch)
        row2.addWidget(self.btn_stop)

        # Retry Failed 3x
        self.btn_retry_failed = QPushButton("🔄 Retry Failed (3x)")
        self.btn_retry_failed.setObjectName("btn_retry_action")
        self.btn_retry_failed.setFixedHeight(28)
        self.btn_retry_failed.clicked.connect(self.retry_failed)
        row2.addWidget(self.btn_retry_failed)

        # Export Master Excel
        self.btn_export = QPushButton("📦 Export Master Excel Now")
        self.btn_export.setObjectName("btn_export_action")
        self.btn_export.setFixedHeight(28)
        self.btn_export.clicked.connect(self.export_master_excel_manual)
        row2.addWidget(self.btn_export)

        row2.addStretch()

        # Telemetry HUD Badges
        self.badge_queued = QLabel("Queued: 87")
        self.badge_queued.setObjectName("hud_tag")
        self.badge_done = QLabel("Done: 0")
        self.badge_done.setObjectName("hud_tag")
        self.badge_done.setStyleSheet("color: #34d399; border-color: #059669;")
        self.badge_failed = QLabel("Failed: 0")
        self.badge_failed.setObjectName("hud_tag")
        self.badge_failed.setStyleSheet("color: #f87171; border-color: #dc2626;")

        row2.addWidget(self.badge_queued)
        row2.addWidget(self.badge_done)
        row2.addWidget(self.badge_failed)

        v_layout.addLayout(row2)

        return card

    # -------------------------------------------------------------
    # 3. Left Panel: RTO Queue & Checkbox List
    # -------------------------------------------------------------
    def _build_rto_manager_panel(self) -> QWidget:
        panel = QFrame()
        panel.setObjectName("panel_card")
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        # Search Bar & Quick Select
        search_row = QHBoxLayout()
        search_row.setSpacing(4)
        self.edit_search = QLineEdit()
        self.edit_search.setPlaceholderText("🔍 Quick Filter RTO (e.g. KL26, Adoor, Ernakulam)...")
        self.edit_search.textChanged.connect(self._filter_rto_table)
        search_row.addWidget(self.edit_search, 1)

        btn_all = QPushButton("Select All")
        btn_all.clicked.connect(lambda: self._set_all_checked(True))
        btn_none = QPushButton("Clear")
        btn_none.clicked.connect(lambda: self._set_all_checked(False))
        search_row.addWidget(btn_all)
        search_row.addWidget(btn_none)
        layout.addLayout(search_row)

        # Table of 87 RTOs (Compact Row Height & Clear Dark Contrast)
        self.table_rtos = QTableWidget()
        self.table_rtos.setColumnCount(7)
        self.table_rtos.setHorizontalHeaderLabels([
            "✔", "#", "Code", "RTO Office Name", "Status", "Makers", "Vehicles"
        ])
        apply_dark_table_palette(self.table_rtos)
        self.table_rtos.setAlternatingRowColors(True)

        self.table_rtos.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.table_rtos.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.table_rtos.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        self.table_rtos.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.Stretch)
        self.table_rtos.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        self.table_rtos.horizontalHeader().setSectionResizeMode(5, QHeaderView.ResizeMode.ResizeToContents)
        self.table_rtos.horizontalHeader().setSectionResizeMode(6, QHeaderView.ResizeMode.ResizeToContents)

        self.table_rtos.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table_rtos.itemDoubleClicked.connect(self._on_table_row_double_clicked)
        self.table_rtos.itemChanged.connect(self._on_table_item_changed)
        layout.addWidget(self.table_rtos)

        # Footer counts
        self.lbl_table_counts = QLabel("Loaded: 0 Kerala RTOs | Selected: 0")
        self.lbl_table_counts.setStyleSheet("color: #94a3b8; font-size: 11px; font-weight: 600;")
        layout.addWidget(self.lbl_table_counts)

        return panel

    # -------------------------------------------------------------
    # 4. Right Panel: Studio (Tabs: Live Preview, Summary, Logs)
    # -------------------------------------------------------------
    def _build_studio_panel(self) -> QWidget:
        self.tabs = QTabWidget()

        # Tab 1: Live Data Preview
        prev_tab = QWidget()
        prev_layout = QVBoxLayout(prev_tab)
        prev_layout.setContentsMargins(6, 6, 6, 6)
        prev_layout.setSpacing(6)

        # Compact HUD KPI Cards
        kpi_row = QHBoxLayout()
        kpi_row.setSpacing(6)
        self.kpi_rto_name = self._create_kpi_card("Active RTO Office", "None Selected", accent_color="#38bdf8")
        self.kpi_makers = self._create_kpi_card("Active OEM Makers", "0", accent_color="#a78bfa")
        self.kpi_total_v = self._create_kpi_card("Total Vehicles", "0", accent_color="#34d399")
        self.kpi_top_maker = self._create_kpi_card("Top Brand", "N/A", accent_color="#fbbf24")
        kpi_row.addWidget(self.kpi_rto_name)
        kpi_row.addWidget(self.kpi_makers)
        kpi_row.addWidget(self.kpi_total_v)
        kpi_row.addWidget(self.kpi_top_maker)
        prev_layout.addLayout(kpi_row)

        # Clean Preview Table
        self.table_preview = QTableWidget()
        apply_dark_table_palette(self.table_preview)
        self.table_preview.setAlternatingRowColors(True)
        prev_layout.addWidget(self.table_preview)
        self.tabs.addTab(prev_tab, "📊 Live Data Preview")

        # Tab 2: Consolidated Summary
        summary_tab = QWidget()
        summ_layout = QVBoxLayout(summary_tab)
        summ_layout.setContentsMargins(6, 6, 6, 6)
        summ_layout.setSpacing(6)

        summ_kpis = QHBoxLayout()
        summ_kpis.setSpacing(6)
        self.kpi_state_total = self._create_kpi_card("Kerala Grand Total", "0", accent_color="#34d399")
        self.kpi_state_rtos = self._create_kpi_card("Completed RTOs", "0 / 87", accent_color="#38bdf8")
        self.kpi_state_makers = self._create_kpi_card("Total Unique Brands", "0", accent_color="#a78bfa")
        summ_kpis.addWidget(self.kpi_state_total)
        summ_kpis.addWidget(self.kpi_state_rtos)
        summ_kpis.addWidget(self.kpi_state_makers)
        summ_layout.addLayout(summ_kpis)

        self.table_summary = QTableWidget()
        apply_dark_table_palette(self.table_summary)
        self.table_summary.setAlternatingRowColors(True)
        summ_layout.addWidget(self.table_summary)
        self.tabs.addTab(summary_tab, "📈 Consolidated Summary")

        # Tab 3: Activity Log Console
        log_tab = QWidget()
        log_layout = QVBoxLayout(log_tab)
        log_layout.setContentsMargins(6, 6, 6, 6)
        log_layout.setSpacing(4)

        log_top = QHBoxLayout()
        lbl_console = QLabel("Real-Time Engine Execution Log:")
        lbl_console.setObjectName("field_tag")
        log_top.addWidget(lbl_console)
        log_top.addStretch()

        btn_copy = QPushButton("Copy Log")
        btn_copy.clicked.connect(lambda: QApplication.clipboard().setText(self.txt_log.toPlainText()))
        btn_clr = QPushButton("Clear")
        btn_clr.clicked.connect(lambda: self.txt_log.clear())
        log_top.addWidget(btn_copy)
        log_top.addWidget(btn_clr)
        log_layout.addLayout(log_top)

        self.txt_log = QTextEdit()
        self.txt_log.setObjectName("console_log")
        self.txt_log.setReadOnly(True)
        log_layout.addWidget(self.txt_log)
        self.tabs.addTab(log_tab, "📜 Activity Log")

        return self.tabs

    def _create_kpi_card(self, title: str, value: str, accent_color: str = "#38bdf8") -> QWidget:
        card = QFrame()
        card.setObjectName("kpi_hud")
        card.setStyleSheet(f"QFrame#kpi_hud {{ border-left: 3px solid {accent_color}; }}")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(8, 4, 8, 4)
        layout.setSpacing(1)

        lbl = QLabel(title)
        lbl.setObjectName("kpi_hud_title")
        val = QLabel(value)
        val.setObjectName("kpi_hud_val")
        val.setStyleSheet(f"color: {accent_color};")

        layout.addWidget(lbl)
        layout.addWidget(val)
        card.val_label = val
        return card

    # -------------------------------------------------------------
    # 5. Bottom Telemetry Bar
    # -------------------------------------------------------------
    def _build_footer_bar(self) -> QWidget:
        card = QFrame()
        card.setObjectName("panel_card")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(8, 4, 8, 4)
        layout.setSpacing(3)

        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        self.progress_bar.setFormat("Progress: 0 / 87 (0%)")
        layout.addWidget(self.progress_bar)

        stats_row = QHBoxLayout()
        self.lbl_stats = QLabel("Ready. Select Target RTO & Year, verify Save Path, then click 'START SCRAPING'.")
        self.lbl_stats.setStyleSheet("color: #94a3b8; font-size: 11px; font-weight: 600;")
        self.lbl_eta = QLabel("ETA: --:--")
        self.lbl_eta.setStyleSheet("color: #38bdf8; font-weight: 700; font-size: 11px;")
        stats_row.addWidget(self.lbl_stats)
        stats_row.addStretch()
        stats_row.addWidget(self.lbl_eta)
        layout.addLayout(stats_row)

        return card

    # -------------------------------------------------------------
    # Path Selection Handlers
    # -------------------------------------------------------------
    def _browse_output_path(self):
        """Opens native directory picker to change save location."""
        selected_dir = QFileDialog.getExistingDirectory(
            self,
            "Select Output Directory for Scraped Files",
            self.output_dir
        )
        if selected_dir:
            self.output_dir = os.path.abspath(selected_dir)
            self.edit_output_path.setText(self.output_dir)
            os.makedirs(self.output_dir, exist_ok=True)
            self.log_message(f"Output directory updated to: {self.output_dir}", "INFO")

    def _on_output_path_changed(self, text: str):
        """Triggered when user types or pastes a path directly."""
        path = text.strip()
        if path:
            self.output_dir = os.path.abspath(path)

    def _open_output_folder(self):
        """Opens output folder in system file explorer."""
        os.makedirs(self.output_dir, exist_ok=True)
        if sys.platform == "win32":
            os.startfile(self.output_dir)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", self.output_dir])
        else:
            subprocess.Popen(["xdg-open", self.output_dir])

    # -------------------------------------------------------------
    # RTO Loading & Target Sync
    # -------------------------------------------------------------
    def load_kerala_rtos(self):
        """Loads all 87 Kerala RTOs dynamically from portal."""
        self.log_message("Connecting to Vahan portal to retrieve Kerala RTO directory...", "INFO")
        self.lbl_server_status.setText("🟡 Connecting...")

        try:
            scraper = VahanScraper()
            scraper.init_session()
            rtos = scraper.select_state("KL")
            self.rtos_data = rtos
            self.lbl_server_status.setText(f"🟢 Portal Online ({len(rtos)} Kerala RTOs)")
            self.log_message(f"Successfully loaded all {len(rtos)} Kerala RTOs from portal!", "SUCCESS")

            # Populate Dropdown
            self.combo_rto_target.blockSignals(True)
            self.combo_rto_target.clear()
            self.combo_rto_target.addItem(f"🚀 ALL {len(rtos)} Kerala RTOs (Sequential Batch)", "ALL")
            for rto in rtos:
                self.combo_rto_target.addItem(f"{rto['code']} — {rto['name']}", rto["value"])
            self.combo_rto_target.blockSignals(False)

            # Populate Table
            self._populate_rto_table(rtos)

        except Exception as e:
            self.lbl_server_status.setText("🔴 Connection Failed")
            self.log_message(f"Error connecting to Vahan portal: {str(e)}", "ERROR")
            QMessageBox.warning(
                self,
                "Portal Connection Issue",
                f"Could not connect to Vahan portal: {str(e)}\nPlease check your network connection and retry."
            )

    def _populate_rto_table(self, rtos: List[Dict[str, Any]]):
        self.table_rtos.blockSignals(True)
        self.table_rtos.setRowCount(len(rtos))

        for row, rto in enumerate(rtos):
            # Checkbox
            chk = QTableWidgetItem()
            chk.setFlags(Qt.ItemFlag.ItemIsUserCheckable | Qt.ItemFlag.ItemIsEnabled)
            chk.setCheckState(Qt.CheckState.Checked)
            self.table_rtos.setItem(row, 0, chk)

            # Index
            idx_item = QTableWidgetItem(str(row + 1))
            idx_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_rtos.setItem(row, 1, idx_item)

            # Code
            code_item = QTableWidgetItem(rto["code"])
            code_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            code_item.setFont(QFont("Consolas", 10, QFont.Weight.Bold))
            code_item.setForeground(QColor("#38bdf8"))
            self.table_rtos.setItem(row, 2, code_item)

            # Name
            name_item = QTableWidgetItem(rto["name"])
            self.table_rtos.setItem(row, 3, name_item)

            # Status Badge
            status_item = QTableWidgetItem("Pending")
            status_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            status_item.setForeground(QColor("#64748b"))
            self.table_rtos.setItem(row, 4, status_item)

            # Makers count
            m_item = QTableWidgetItem("-")
            m_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table_rtos.setItem(row, 5, m_item)

            # Total vehicles
            v_item = QTableWidgetItem("-")
            v_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.table_rtos.setItem(row, 6, v_item)

        self.table_rtos.blockSignals(False)
        self._update_table_counts()

    def _on_rto_target_changed(self, index: int):
        """When RTO dropdown changes, sync with table selection."""
        target = self.combo_rto_target.currentData()
        self.table_rtos.blockSignals(True)
        if target == "ALL":
            for r in range(self.table_rtos.rowCount()):
                item = self.table_rtos.item(r, 0)
                if item:
                    item.setCheckState(Qt.CheckState.Checked)
        else:
            # Single RTO selected: check only this one
            for r in range(self.table_rtos.rowCount()):
                item = self.table_rtos.item(r, 0)
                if item:
                    rto_val = self.rtos_data[r]["value"]
                    if rto_val == target:
                        item.setCheckState(Qt.CheckState.Checked)
                        self.table_rtos.scrollToItem(item)
                    else:
                        item.setCheckState(Qt.CheckState.Unchecked)
        self.table_rtos.blockSignals(False)
        self._update_table_counts()

    def _filter_rto_table(self, text: str):
        query = text.strip().lower()
        for row in range(self.table_rtos.rowCount()):
            code = self.table_rtos.item(row, 2).text().lower()
            name = self.table_rtos.item(row, 3).text().lower()
            match = query in code or query in name
            self.table_rtos.setRowHidden(row, not match)

    def _set_all_checked(self, checked: bool):
        self.table_rtos.blockSignals(True)
        state = Qt.CheckState.Checked if checked else Qt.CheckState.Unchecked
        for row in range(self.table_rtos.rowCount()):
            item = self.table_rtos.item(row, 0)
            if item:
                item.setCheckState(state)
        self.table_rtos.blockSignals(False)
        self._update_table_counts()

    def _on_table_item_changed(self, item: QTableWidgetItem):
        if item.column() == 0:
            self._update_table_counts()

    def _update_table_counts(self):
        total = self.table_rtos.rowCount()
        selected = 0
        done_cnt = 0
        fail_cnt = 0
        for row in range(total):
            item = self.table_rtos.item(row, 0)
            if item and item.checkState() == Qt.CheckState.Checked:
                selected += 1
            st = self.table_rtos.item(row, 4)
            if st:
                txt = st.text().lower()
                if "done" in txt:
                    done_cnt += 1
                elif "fail" in txt:
                    fail_cnt += 1

        self.lbl_table_counts.setText(f"Loaded: {total} Kerala RTOs  |  Selected: {selected}")
        self.badge_queued.setText(f"Queued: {selected}")
        self.badge_done.setText(f"Done: {done_cnt}")
        self.badge_failed.setText(f"Failed: {fail_cnt}")

    # -------------------------------------------------------------
    # Execution & Auto-Retry Management
    # -------------------------------------------------------------
    def on_run_scraper_clicked(self):
        """Triggered when user clicks START SCRAPING."""
        if self.worker and self.worker.isRunning():
            QMessageBox.information(self, "Running", "A scrape job is already currently active.")
            return

        selected_items = []
        for row in range(self.table_rtos.rowCount()):
            chk = self.table_rtos.item(row, 0)
            if chk and chk.checkState() == Qt.CheckState.Checked:
                rto = dict(self.rtos_data[row])
                rto["table_index"] = row
                selected_items.append(rto)

        if not selected_items:
            QMessageBox.warning(self, "No RTO Selected", "Please select at least one RTO to run.")
            return

        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)

        max_retries = self.spin_retries.value()
        threads = int(self.combo_speed.currentData())
        config = {
            "state": "KL",
            "year": self.combo_year.currentText(),
            "yaxis": self.combo_yaxis.currentData() or "Maker",
            "xaxis": "Month Wise",
            "year_type": "C",
            "vh_catg": self.selected_vh_catg,
            "fuels": self.selected_fuels,
            "norms": self.selected_norms,
            "vh_class": self.selected_vh_class,
            "threads": threads,
            "output_dir": self.output_dir,
            "max_retries": max_retries,
        }

        target_desc = "All 87 RTOs" if len(selected_items) == len(self.rtos_data) else f"{len(selected_items)} selected RTO(s)"
        self.log_message(
            f"⚡ Initiating run for {target_desc} [{threads} Workers, Year: {config['year']}, Auto-Retry: {max_retries}x, Path: {self.output_dir}]...",
            "INFO"
        )

        # Isolate scraped data by year: only clear targeted RTOs for this specific year
        # Other years (e.g. 2025 vs 2026) are NEVER truncated or lost!
        curr_yr = str(config['year']).strip()
        if curr_yr not in self.active_dfs_by_year:
            self.active_dfs_by_year[curr_yr] = {}
        for target in selected_items:
            t_code = target.get("code")
            if t_code in self.active_dfs_by_year[curr_yr]:
                del self.active_dfs_by_year[curr_yr][t_code]
            if t_code in self.active_dfs:
                del self.active_dfs[t_code]

        # Update UI Controls
        self.btn_run.setEnabled(False)
        self.btn_pause.setEnabled(True)
        self.btn_pause.setText("⏸ Pause")
        self.btn_stop.setEnabled(True)
        self.progress_bar.setMaximum(len(selected_items))
        self.progress_bar.setValue(0)

        # Launch Worker
        self.worker = VahanFetchWorker(selected_items, config, self)
        self.worker.sig_log.connect(self.log_message)
        self.worker.sig_status.connect(self.lbl_stats.setText)
        self.worker.sig_rto_start.connect(self._on_worker_rto_start)
        self.worker.sig_rto_retry.connect(self._on_worker_rto_retry)
        self.worker.sig_rto_done.connect(self._on_worker_rto_done)
        self.worker.sig_progress.connect(self._on_worker_progress)
        self.worker.sig_finished.connect(self._on_worker_finished)
        self.worker.start()

    def toggle_pause(self):
        if not self.worker:
            return
        if self.worker.is_paused():
            self.worker.resume()
            self.btn_pause.setText("⏸ Pause")
            self.btn_pause.setObjectName("btn_pause_action")
        else:
            self.worker.pause()
            self.btn_pause.setText("▶ Resume")
            self.btn_pause.setObjectName("btn_run_action")
        self.btn_pause.setStyleSheet(self.btn_pause.styleSheet())

    def stop_fetch(self):
        if self.worker and self.worker.isRunning():
            self.worker.stop()
            self.btn_stop.setEnabled(False)

    def retry_failed(self):
        """Retries all failed RTOs with 3 automatic attempts."""
        if self.worker and self.worker.isRunning():
            QMessageBox.information(self, "Running", "A scrape job is already active.")
            return

        failed_rows = []
        for row in range(self.table_rtos.rowCount()):
            status_item = self.table_rtos.item(row, 4)
            if status_item and "fail" in status_item.text().lower():
                self.table_rtos.item(row, 0).setCheckState(Qt.CheckState.Checked)
                failed_rows.append(row)
            else:
                self.table_rtos.item(row, 0).setCheckState(Qt.CheckState.Unchecked)

        if not failed_rows:
            QMessageBox.information(self, "No Failures", "There are currently no failed RTOs to retry.")
            return

        self.log_message(f"Retrying {len(failed_rows)} failed RTO(s) with 3 auto-retry attempts...", "INFO")
        self.on_run_scraper_clicked()

    # -------------------------------------------------------------
    # Worker Event Handlers
    # -------------------------------------------------------------
    def _on_worker_rto_start(self, table_row: int, code: str, name: str):
        status_item = self.table_rtos.item(table_row, 4)
        if status_item:
            status_item.setText("Fetching...")
            status_item.setForeground(QColor("#38bdf8"))
        self.table_rtos.scrollToItem(status_item)

    def _on_worker_rto_retry(self, table_row: int, code: str, attempt: int, max_retries: int, err: str):
        status_item = self.table_rtos.item(table_row, 4)
        if status_item:
            status_item.setText(f"Retry {attempt}/{max_retries} 🔄")
            status_item.setForeground(QColor("#fbbf24"))

    def _on_worker_rto_done(
        self, table_row: int, code: str, name: str, success: bool,
        row_count: int, total_v: int, err: str, df: Optional[pd.DataFrame]
    ):
        status_item = self.table_rtos.item(table_row, 4)
        m_item = self.table_rtos.item(table_row, 5)
        v_item = self.table_rtos.item(table_row, 6)

        if success:
            if status_item:
                status_item.setText("Done ✓")
                status_item.setForeground(QColor("#10b981"))
            if m_item:
                m_item.setText(str(row_count))
            if v_item:
                v_item.setText(f"{total_v:,}")

            if df is not None:
                yr = str(self.combo_year.currentText()).strip()
                if yr not in self.active_dfs_by_year:
                    self.active_dfs_by_year[yr] = {}
                self.active_dfs_by_year[yr][code] = df
                self.active_dfs[code] = df
                self._display_preview_dataframe(df, f"{name} ({code})")
                self._update_consolidated_tab()
        else:
            if status_item:
                status_item.setText("Failed (3x) ✗")
                status_item.setForeground(QColor("#ef4444"))

        self._update_table_counts()

    def _on_year_changed(self, new_year: str):
        yr = str(new_year).strip()
        self.active_dfs = dict(self.active_dfs_by_year.get(yr, {}))
        # Update RTO table row statuses for the selected year
        for row in range(self.table_rtos.rowCount()):
            code_item = self.table_rtos.item(row, 2)
            if not code_item:
                continue
            code = code_item.text().strip()
            df = self.active_dfs.get(code)
            status_item = self.table_rtos.item(row, 4)
            m_item = self.table_rtos.item(row, 5)
            v_item = self.table_rtos.item(row, 6)
            if df is not None:
                if status_item:
                    status_item.setText("Done ✓")
                    status_item.setForeground(QColor("#10b981"))
                if m_item:
                    m_item.setText(str(len(df)))
                if v_item:
                    tot = int(df["TOTAL"].sum()) if "TOTAL" in df.columns else 0
                    v_item.setText(f"{tot:,}")
            else:
                if status_item:
                    status_item.setText("Pending")
                    status_item.setForeground(QColor("#94a3b8"))
                if m_item:
                    m_item.setText("-")
                if v_item:
                    v_item.setText("-")
        self._update_table_counts()
        self._update_consolidated_tab()

    def _on_worker_progress(self, current: int, total: int, eta_str: str):
        pct = int(current / total * 100) if total > 0 else 0
        self.progress_bar.setValue(current)
        self.progress_bar.setFormat(f"Progress: {current} / {total} ({pct}%)")
        self.lbl_eta.setText(f"ETA: {eta_str}")

    def _on_worker_finished(self, summary: dict):
        self.btn_run.setEnabled(True)
        self.btn_pause.setEnabled(False)
        self.btn_pause.setText("⏸ Pause")
        self.btn_stop.setEnabled(False)

        succ = summary.get("success", 0)
        fail = summary.get("failed", 0)
        tot_v = summary.get("total_vehicles", 0)
        elapsed = summary.get("elapsed", "0s")

        self.lbl_stats.setText(
            f"Finished in {elapsed}! Success: {succ} | Failed: {fail} | Total Vehicles: {tot_v:,}"
        )
        self.log_message(
            f"Batch completed in {elapsed}. Success: {succ}, Failed: {fail}, Total Vehicles: {tot_v:,}.",
            "SUCCESS" if fail == 0 else "WARNING"
        )
        self._update_table_counts()

        if fail > 0:
            ans = QMessageBox.question(
                self,
                "Batch Completed with Failures",
                f"Scraping completed with {fail} failed RTO(s).\n\n"
                f"Would you like to automatically retry all {fail} failed RTOs now (3 attempts each)?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            if ans == QMessageBox.StandardButton.Yes:
                self.retry_failed()
        else:
            QMessageBox.information(
                self,
                "Scraping Completed Successfully",
                f"All {succ} RTOs fetched successfully!\n\n"
                f"• Total Registered Vehicles: {tot_v:,}\n"
                f"• Time Elapsed: {elapsed}\n\n"
                f"Master Consolidated Excel has been saved to:\n{self.output_dir}"
            )

    # -------------------------------------------------------------
    # Live Data Preview and Consolidated Studio
    # -------------------------------------------------------------
    def _display_preview_dataframe(self, df: pd.DataFrame, title: str):
        """Displays clean data table WITHOUT redundant RTO_Code / RTO_Name columns."""
        self.kpi_rto_name.val_label.setText(title)
        self.kpi_makers.val_label.setText(str(len(df)))

        tot = int(df["TOTAL"].sum()) if "TOTAL" in df.columns else 0
        self.kpi_total_v.val_label.setText(f"{tot:,}")

        # Strip redundant columns: show S_No, Dimension, Months, TOTAL
        cols_to_show = [c for c in df.columns if c not in ["State", "RTO_Code", "RTO_Name", "Year"]]
        primary_dim = "Maker"
        if len(cols_to_show) > 1 and cols_to_show[1] not in ["TOTAL", "JAN", "FEB", "MAR", "APR", "MAY"]:
            primary_dim = cols_to_show[1]

        if primary_dim in df.columns and "TOTAL" in df.columns and len(df) > 0:
            top_row = df.sort_values(by="TOTAL", ascending=False).iloc[0]
            val_str = str(top_row[primary_dim])[:16]
            self.kpi_top_maker.title_label.setText(f"Top {primary_dim}")
            self.kpi_top_maker.val_label.setText(f"{val_str} ({top_row['TOTAL']:,})")
        self.kpi_makers.title_label.setText(f"Active {primary_dim}s")

        self.table_preview.setColumnCount(len(cols_to_show))
        self.table_preview.setHorizontalHeaderLabels(cols_to_show)
        self.table_preview.setRowCount(len(df))

        for r_idx, (_, row) in enumerate(df.iterrows()):
            for c_idx, col_name in enumerate(cols_to_show):
                val = row[col_name]
                if isinstance(val, (int, float)) and col_name != "S_No":
                    item = QTableWidgetItem(f"{int(val):,}")
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                    if col_name == "TOTAL":
                        item.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
                        item.setForeground(QColor("#38bdf8"))
                else:
                    item = QTableWidgetItem(str(val))
                    if col_name == "S_No":
                        item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                self.table_preview.setItem(r_idx, c_idx, item)

        self.table_preview.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        if primary_dim in cols_to_show:
            m_idx = cols_to_show.index(primary_dim)
            self.table_preview.horizontalHeader().setSectionResizeMode(m_idx, QHeaderView.ResizeMode.Stretch)

    def _update_consolidated_tab(self):
        if not self.active_dfs:
            return

        all_dfs = list(self.active_dfs.values())
        union_df = pd.concat(all_dfs, ignore_index=True).fillna(0)

        # Detect primary dimension column
        primary_dim = "Maker"
        if len(union_df.columns) > 5 and union_df.columns[5] not in ["TOTAL", "JAN", "FEB", "MAR", "APR", "MAY"]:
            primary_dim = union_df.columns[5]

        # Update KPIs
        grand_total = int(union_df["TOTAL"].sum()) if "TOTAL" in union_df.columns else 0
        self.kpi_state_total.val_label.setText(f"{grand_total:,}")
        self.kpi_state_rtos.val_label.setText(f"{len(self.active_dfs)} / {len(self.rtos_data)}")
        uniq_items = union_df[primary_dim].nunique() if primary_dim in union_df.columns else 0
        self.kpi_state_makers.val_label.setText(f"{uniq_items}")
        self.kpi_state_makers.title_label.setText(f"Unique {primary_dim}s")

        # Summary by RTO table
        rto_summary = (
            union_df.groupby(["RTO_Code", "RTO_Name"])
            .agg(Items=(primary_dim, "count"), Vehicles=("TOTAL", "sum"))
            .reset_index()
            .sort_values(by="Vehicles", ascending=False)
        )

        self.table_summary.setColumnCount(4)
        self.table_summary.setHorizontalHeaderLabels(["RTO Code", "Office Name", f"{primary_dim} Count", "Total Vehicles"])
        self.table_summary.setRowCount(len(rto_summary))

        for r_idx, (_, row) in enumerate(rto_summary.iterrows()):
            self.table_summary.setItem(r_idx, 0, QTableWidgetItem(str(row["RTO_Code"])))
            self.table_summary.setItem(r_idx, 1, QTableWidgetItem(str(row["RTO_Name"])))
            self.table_summary.setItem(r_idx, 2, QTableWidgetItem(str(row["Items"])))
            v_item = QTableWidgetItem(f"{int(row['Vehicles']):,}")
            v_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            v_item.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
            v_item.setForeground(QColor("#34d399"))
            self.table_summary.setItem(r_idx, 3, v_item)

        self.table_summary.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)

    def _on_table_row_double_clicked(self, item: QTableWidgetItem):
        row = item.row()
        code = self.table_rtos.item(row, 2).text()
        name = self.table_rtos.item(row, 3).text()
        if code in self.active_dfs:
            self._display_preview_dataframe(self.active_dfs[code], f"{name} ({code})")
            self.tabs.setCurrentIndex(0)
        else:
            self.log_message(f"RTO {code} ({name}) has not been fetched yet. Double-click after fetching.", "INFO")

    def _open_filters_dialog(self):
        dlg = FilterDialog(
            self.selected_vh_catg,
            self.selected_fuels,
            self.selected_norms,
            self.selected_vh_class,
            self
        )
        if dlg.exec():
            self.selected_vh_catg, self.selected_fuels, self.selected_norms, self.selected_vh_class = dlg.get_selected()
            self._update_filters_button_label()
            self.log_message(
                f"Updated filters: {len(self.selected_vh_catg)} categories, {len(self.selected_fuels)} fuel types, "
                f"{len(self.selected_norms)} norms, {len(self.selected_vh_class)} vehicle classes.",
                "INFO"
            )

    def _update_filters_button_label(self):
        catg_str = f"{len(self.selected_vh_catg)} Catg"
        fuel_str = f"{len(self.selected_fuels)} Fuels"
        extras = []
        if self.selected_norms:
            extras.append(f"{len(self.selected_norms)} Norms")
        if self.selected_vh_class:
            extras.append(f"{len(self.selected_vh_class)} Classes")
        extra_str = f", {', '.join(extras)}" if extras else ""
        self.btn_filters.setText(f"⚙ Filters ({catg_str}, {fuel_str}{extra_str})")

    def _on_yaxis_changed(self):
        dim = self.combo_yaxis.currentText()
        dim_data = self.combo_yaxis.currentData()
        self.kpi_makers.title_label.setText(f"Active {dim}")
        self.kpi_state_makers.title_label.setText(f"Unique {dim}")
        self.log_message(f"Primary report dimension set to: {dim_data}", "INFO")

    def export_master_excel_manual(self):
        if not self.active_dfs:
            QMessageBox.warning(self, "No Data", "No RTO data has been fetched yet.")
            return

        year = self.combo_year.currentText()
        os.makedirs(self.output_dir, exist_ok=True)
        
        # If single RTO active, name file <RTO Name without SRTO/RTO>-<Year>.xlsx
        if len(self.active_dfs) == 1:
            first_df = list(self.active_dfs.values())[0]
            rto_name = first_df["RTO_Name"].iloc[0] if "RTO_Name" in first_df.columns else "RTO"
            clean_name = re.sub(r'[\s\-_]+(?:SRTO|RTO)\s*$', '', str(rto_name), flags=re.IGNORECASE).strip() or str(rto_name).strip()
            safe_name = "".join(c for c in clean_name if c not in r'\/:*?"<>|').strip()
            xlsx_filename = f"{safe_name}-{year}.xlsx"
        else:
            xlsx_filename = f"KL_ALL_RTO_CONSOLIDATED_{year}.xlsx"

        xlsx_path = os.path.join(self.output_dir, xlsx_filename)

        try:
            consolidate_all_rtos(list(self.active_dfs.values()), xlsx_path, output_csv_path=None)
            self.log_message(f"Master Consolidated Excel successfully exported to {xlsx_path}", "SUCCESS")
            QMessageBox.information(
                self,
                "Export Successful",
                f"Excel file created:\n\n{xlsx_path}"
            )
        except Exception as e:
            self.log_message(f"Failed to export master Excel: {str(e)}", "ERROR")
            QMessageBox.critical(self, "Export Error", f"Error saving master files: {str(e)}")

    def log_message(self, message: str, level: str = "INFO"):
        now = datetime.now().strftime("%H:%M:%S")
        color_map = {
            "INFO": "#94a3b8",
            "SUCCESS": "#34d399",
            "WARNING": "#fbbf24",
            "ERROR": "#f87171"
        }
        color = color_map.get(level.upper(), "#e2e8f0")
        formatted = f'<span style="color: #64748b;">[{now}]</span> <span style="color: {color}; font-weight: 700;">[{level}]</span> {message}'
        self.txt_log.append(formatted)


def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    win = MainWindow()
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()