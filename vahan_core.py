"""
Vahan Parivahan Dashboard - Core Scraper Engine
Handles communication with the JSF/PrimeFaces Vahan 4 Dashboard portal.
Features dynamic component ID resolution and resilient fallback table parsing.
"""

import io
import os
import re
import time
import logging
import warnings
from typing import List, Dict, Tuple, Optional, Any
import requests
from bs4 import BeautifulSoup
import openpyxl
import pandas as pd

# Suppress openpyxl stylesheet warnings for clean execution
warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

logger = logging.getLogger("vahan_core")

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# 34 fuel types matching the user's curl specification
DEFAULT_FUELS = [
    '33', '38', '32', '6', '2', '12', '21', '18', '19', '20',
    '13', '36', '35', '22', '34', '37', '17', '8', '15', '99',
    '1', '3', '16', '29', '31', '40', '30', '11', '39', '5',
    '14', '26', '10', '25'
]

ALL_FUELS_DICT = {
    '33': 'BIO-CNG/BIO-GAS',
    '38': 'BIO-DIESEL(B100)',
    '32': 'BIO-METHANE',
    '6':  'CNG ONLY',
    '2':  'DIESEL',
    '12': 'DIESEL/HYBRID',
    '21': 'DI-METHYL ETHER',
    '18': 'DUAL DIESEL/BIO CNG',
    '19': 'DUAL DIESEL/CNG',
    '20': 'DUAL DIESEL/LNG',
    '4':  'ELECTRIC(BOV)',
    '13': 'ETHANOL(E100)',
    '36': 'FLEX-FUEL(BIO-DIESEL)',
    '35': 'FLEX-FUEL(ETHANOL)',
    '22': 'FUEL CELL HYDROGEN',
    '34': 'HCNG',
    '37': 'HYDROGEN(ICE)',
    '17': 'LNG',
    '8':  'LPG ONLY',
    '15': 'METHANOL',
    '99': 'NOT APPLICABLE',
    '1':  'PETROL',
    '3':  'PETROL/CNG',
    '16': 'PETROL(E20)',
    '29': 'PETROL(E20)/CNG',
    '31': 'PETROL(E20)/HYBRID',
    '40': 'PETROL(E20)/HYBRID/CNG',
    '30': 'PETROL(E20)/LPG',
    '11': 'PETROL/HYBRID',
    '39': 'PETROL/HYBRID/CNG',
    '5':  'PETROL/LPG',
    '14': 'PETROL/METHANOL',
    '26': 'PLUG-IN HYBRID EV',
    '23': 'PURE EV',
    '10': 'SOLAR',
    '25': 'STRONG HYBRID EV'
}

# Vehicle Categories - LMV & LPV are the required defaults
DEFAULT_VH_CATG = ['LMV', 'LPV']

ALL_VH_CATG_DICT = {
    'LMV': 'LIGHT MOTOR VEHICLE',
    'LPV': 'LIGHT PASSENGER VEHICLE',
    '2WIC': 'TWO WHEELER (INVALID CARRIAGE)',
    '2WN': 'TWO WHEELER (NON-TRANSPORT)',
    '2WT': 'TWO WHEELER (TRANSPORT)',
    '3WIC': 'THREE WHEELER (INVALID CARRIAGE)',
    '3WN': 'THREE WHEELER (NON-TRANSPORT)',
    '3WT': 'THREE WHEELER (TRANSPORT)',
    '4WIC': 'FOUR WHEELER (INVALID CARRIAGE)',
    'HGV': 'HEAVY GOODS VEHICLE',
    'HMV': 'HEAVY MOTOR VEHICLE',
    'HPV': 'HEAVY PASSENGER VEHICLE',
    'LGV': 'LIGHT GOODS VEHICLE',
    'MGV': 'MEDIUM GOODS VEHICLE',
    'MMV': 'MEDIUM MOTOR VEHICLE',
    'MPV': 'MEDIUM PASSENGER VEHICLE',
    'OTH': 'OTHER'
}

ALL_VH_CATG = list(ALL_VH_CATG_DICT.keys())

ALL_NORMS_DICT = {
    '15': 'BHARAT STAGE VI',
    '4':  'BHARAT STAGE IV',
    '3':  'BHARAT STAGE III',
    '2':  'BHARAT STAGE II',
    '1':  'BHARAT STAGE I',
    '11': 'BHARAT STAGE III/IV',
    '18': 'BHARAT STAGE III (CEV)',
    '5':  'BHARAT (TREM) STAGE III',
    '6':  'BHARAT (TREM) STAGE III A',
    '26': 'BHARAT (TREM) STAGE III AA',
    '12': 'BHARAT (TREM) STAGE III B',
    '24': 'CEV STAGE IV',
    '25': 'CEV STAGE V',
    '17': 'EURO 6',
    '19': 'EURO 6A',
    '20': 'EURO 6B',
    '21': 'EURO 6C',
    '22': 'EURO 6D',
    '23': 'EURO 6AD',
    '10': 'EURO 4',
    '9':  'EURO 3',
    '8':  'EURO 2',
    '7':  'EURO 1',
    '13': 'TREM STAGE IV',
    '14': 'TREM STAGE V',
    '98': 'NOT APPLICABLE',
    '99': 'NOT AVAILABLE'
}

ALL_VHCLASS_DICT = {
    "1": "M-CYCLE/SCOOTER",
    "2": "M-CYCLE/SCOOTER-WITH SIDE CAR",
    "3": "MOPED",
    "4": "MOTORISED CYCLE (CC > 25CC)",
    "5": "ADAPTED VEHICLE",
    "6": "THREE WHEELER (PERSONAL)",
    "7": "MOTOR CAR",
    "8": "FORK LIFT",
    "9": "VEHICLE FITTED WITH RIG",
    "10": "VEHICLE FITTED WITH GENERATOR",
    "11": "VEHICLE FITTED WITH COMPRESSOR",
    "12": "CRANE MOUNTED VEHICLE",
    "13": "AGRICULTURAL TRACTOR",
    "14": "POWER TILLER",
    "15": "PRIVATE SERVICE VEHICLE (INDIVIDUAL USE)",
    "16": "CAMPER VAN / TRAILER (PRIVATE USE)",
    "17": "TOW TRUCK",
    "18": "BREAKDOWN VAN",
    "19": "RECOVERY VEHICLE",
    "20": "TOWER WAGON",
    "21": "TREE TRIMMING VEHICLE",
    "22": "CONSTRUCTION EQUIPMENT VEHICLE",
    "23": "OMNI BUS (PRIVATE USE)",
    "24": "ROAD ROLLER",
    "25": "EXCAVATOR (NT)",
    "26": "BULLDOZER",
    "27": "HARVESTER",
    "28": "TRAILER (AGRICULTURAL)",
    "29": "EARTH MOVING EQUIPMENT",
    "30": "TRAILER FOR PERSONAL USE",
    "31": "QUADRICYCLE (PRIVATE)",
    "32": "ARMOURED/SPECIALISED VEHICLE",
    "33": "MOTOR CARAVAN",
    "51": "MOTOR CYCLE/SCOOTER-SIDECAR(T)",
    "52": "MOTOR CYCLE/SCOOTER-WITH TRAILER",
    "53": "MOTOR CYCLE/SCOOTER-USED FOR HIRE",
    "54": "E-RICKSHAW WITH CART (G)",
    "55": "E-RICKSHAW(P)",
    "56": "LUXURY CAB",
    "57": "THREE WHEELER (PASSENGER)",
    "58": "THREE WHEELER (GOODS)",
    "59": "GOODS CARRIER",
    "62": "POWER TILLER (COMMERCIAL)",
    "63": "TRACTOR (COMMERCIAL)",
    "64": "MOBILE CLINIC",
    "65": "X-RAY VAN",
    "66": "LIBRARY VAN",
    "67": "MOBILE WORKSHOP",
    "68": "MOBILE CANTEEN",
    "69": "PRIVATE SERVICE VEHICLE",
    "70": "MAXI CAB",
    "71": "MOTOR CAB",
    "72": "PULLER TRACTOR",
    "73": "BUS",
    "74": "SCHOOL BUS",
    "75": "EDUCATIONAL INSTITUTION BUS",
    "76": "AMBULANCE",
    "77": "ANIMAL AMBULANCE",
    "78": "CAMPER VAN / TRAILER",
    "79": "CASH VAN",
    "80": "FIRE TENDERS",
    "81": "SNORKED LADDERS",
    "82": "AUXILIARY TRAILER",
    "83": "FIRE FIGHTING VEHICLE",
    "84": "ARTICULATED VEHICLE",
    "85": "HEARSES",
    "86": "OMNI BUS",
    "87": "DUMPER",
    "88": "EXCAVATOR (COMMERCIAL)",
    "89": "TRAILER (COMMERCIAL)",
    "90": "TRACTOR-TROLLEY(COMMERCIAL)",
    "91": "SEMI-TRAILER (COMMERCIAL)",
    "92": "CONSTRUCTION EQUIPMENT VEHICLE (COMMERCIAL)",
    "93": "QUADRICYCLE (COMMERCIAL)",
    "94": "MODULAR HYDRAULIC TRAILER",
    "157": "VINTAGE MOTOR VEHICLE"
}

YAXIS_OPTIONS = [
    "Maker",
    "Vehicle Category",
    "Norms",
    "Vehicle Class",
    "Fuel"
]


class VahanScraper:
    """
    Manages session state, PrimeFaces JSF ViewState transitions,
    dynamic component ID resolution, and data extraction for Vahan 4 Dashboard.
    """

    BASE_URL = "https://vahan.parivahan.gov.in/vahan4dashboard/vahan/view/reportview.xhtml"

    def __init__(self, user_agent: str = DEFAULT_USER_AGENT, timeout: int = 30):
        self.user_agent = user_agent
        self.timeout = timeout
        self.session: Optional[requests.Session] = None
        self.view_state: Optional[str] = None
        self.current_state: Optional[str] = None
        self.current_rtos: List[Dict[str, str]] = []
        # Dynamic component IDs (automatically discovered during init_session)
        self.state_select_id: str = "j_idt38"
        self.refresh_btn_id: str = "j_idt68"

    def _get_headers(self, is_ajax: bool = False) -> Dict[str, str]:
        headers = {
            "User-Agent": self.user_agent,
            "Origin": "https://vahan.parivahan.gov.in",
            "Referer": self.BASE_URL,
        }
        if is_ajax:
            headers.update({
                "Accept": "application/xml, text/xml, */*; q=0.01",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Faces-Request": "partial/ajax",
                "X-Requested-With": "XMLHttpRequest",
            })
        else:
            headers.update({
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Content-Type": "application/x-www-form-urlencoded",
            })
        return headers

    def init_session(self) -> str:
        """
        Initializes a fresh HTTP session, loads the base page,
        extracts initial ViewState, and dynamically resolves JSF component IDs.
        """
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.user_agent})
        logger.info("Initializing session with Vahan portal...")

        resp = self.session.get(self.BASE_URL, headers=self._get_headers(is_ajax=False), timeout=self.timeout)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        vs_elem = soup.find("input", {"name": "javax.faces.ViewState"})
        if not vs_elem or not vs_elem.get("value"):
            raise ValueError("Failed to extract initial javax.faces.ViewState from Vahan portal")

        self.view_state = vs_elem["value"]

        # Dynamically discover state select ID
        for sel in soup.find_all("select"):
            if any("vahan4 running states" in opt.text.lower() for opt in sel.find_all("option")):
                sel_id = sel.get("id", "")
                if sel_id:
                    self.state_select_id = sel_id.replace("_input", "")
                    break

        # Dynamically discover refresh button ID (has groupingTable in onclick)
        for btn in soup.find_all("button"):
            onclick = btn.get("onclick", "")
            if "groupingTable" in onclick:
                m = re.search(r's:"(.*?)"', onclick)
                if m:
                    self.refresh_btn_id = m.group(1)
                    break

        logger.info(
            f"Session established. ViewState: {self.view_state[:25]}... "
            f"(StateSelectID: {self.state_select_id}, RefreshBtnID: {self.refresh_btn_id})"
        )
        return self.view_state

    def get_states(self) -> List[Dict[str, str]]:
        """
        Fetches the list of states from the initial page.
        """
        if not self.session or not self.view_state:
            self.init_session()

        resp = self.session.get(self.BASE_URL, headers=self._get_headers(is_ajax=False), timeout=self.timeout)
        soup = BeautifulSoup(resp.text, "html.parser")
        state_select = soup.find("select", id=f"{self.state_select_id}_input")
        states = []
        if state_select:
            for opt in state_select.find_all("option"):
                code = opt.get("value")
                name = opt.text.strip()
                if code and code != "-1":
                    states.append({"code": code, "name": name})
        return states

    def select_state(self, state_code: str = "KL") -> List[Dict[str, str]]:
        """
        Triggers PrimeFaces AJAX event for State selection.
        Updates internal ViewState and returns the list of RTOs for that state.
        """
        if not self.session or not self.view_state:
            self.init_session()

        logger.info(f"Selecting state: {state_code} via {self.state_select_id}...")
        data = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": self.state_select_id,
            "javax.faces.partial.execute": self.state_select_id,
            "javax.faces.partial.render": "selectedRto yaxisVar",
            "javax.faces.behavior.event": "change",
            "javax.faces.partial.event": "change",
            "masterLayout_formlogin": "masterLayout_formlogin",
            f"{self.state_select_id}_focus": "",
            f"{self.state_select_id}_input": state_code,
            "javax.faces.ViewState": self.view_state,
        }

        resp = self.session.post(self.BASE_URL, headers=self._get_headers(is_ajax=True), data=data, timeout=self.timeout)
        resp.raise_for_status()

        # Parse XML response
        update_soup = BeautifulSoup(resp.text, "xml")
        vs_elem = update_soup.find("update", {"id": re.compile(r"ViewState")})
        if vs_elem and vs_elem.text.strip():
            self.view_state = vs_elem.text.strip()

        rto_update = update_soup.find("update", {"id": "selectedRto"})
        if not rto_update:
            raise ValueError(f"No selectedRto update received for state {state_code}")

        inner_soup = BeautifulSoup(rto_update.text, "html.parser")
        rtos = []
        for opt in inner_soup.find_all("option"):
            val = opt.get("value")
            text = opt.text.strip()
            if not val or val == "-1":
                continue

            match = re.search(r"^(.*?)\s*-\s*([A-Z0-9]+)\s*\(", text)
            if match:
                clean_name = match.group(1).strip()
                rto_code = match.group(2).strip()
            else:
                clean_name = text
                rto_code = f"{state_code}{val}"

            rtos.append({
                "value": val,
                "code": rto_code,
                "name": clean_name,
                "raw": text,
            })

        self.current_state = state_code
        self.current_rtos = rtos
        logger.info(f"Loaded {len(rtos)} RTOs for state {state_code}.")
        return rtos

    def fetch_rto_data(
        self,
        rto_value: str,
        rto_code: str,
        rto_name: str,
        year: str = "2026",
        yaxis: str = "Maker",
        xaxis: str = "Month Wise",
        year_type: str = "C",
        vh_catg: Optional[List[str]] = None,
        fuels: Optional[List[str]] = None,
        norms: Optional[List[str]] = None,
        vh_class: Optional[List[str]] = None,
    ) -> Tuple[bytes, pd.DataFrame]:
        """
        Fetches registration data for a single RTO.
        Steps:
        1. PrimeFaces AJAX call to select RTO -> updates ViewState
        2. PrimeFaces AJAX call to click dynamic Refresh button -> renders table & updates ViewState
        3. PrimeFaces POST call to export groupingTable:xls -> returns official XLSX
        4. Resilient Fallback: If export returns HTML, parses table HTML directly from combTablePnl!
        """
        if vh_catg is None:
            vh_catg = DEFAULT_VH_CATG
        if fuels is None:
            fuels = DEFAULT_FUELS

        if not self.session or not self.view_state:
            self.init_session()
            if self.current_state:
                self.select_state(self.current_state)

        # Step 1: Select RTO via AJAX
        data_rto = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": "selectedRto",
            "javax.faces.partial.execute": "selectedRto",
            "javax.faces.partial.render": "yaxisVar",
            "javax.faces.behavior.event": "change",
            "javax.faces.partial.event": "change",
            "masterLayout_formlogin": "masterLayout_formlogin",
            f"{self.state_select_id}_input": self.current_state or "KL",
            "selectedRto_focus": "",
            "selectedRto_input": rto_value,
            "javax.faces.ViewState": self.view_state,
        }
        resp_rto = self.session.post(
            self.BASE_URL, headers=self._get_headers(is_ajax=True), data=data_rto, timeout=self.timeout
        )
        resp_rto.raise_for_status()
        vs_elem = BeautifulSoup(resp_rto.text, "xml").find("update", {"id": re.compile(r"ViewState")})
        if vs_elem and vs_elem.text.strip():
            self.view_state = vs_elem.text.strip()

        # Step 2: Trigger dynamic Refresh button with filters
        refresh_payload = [
            ("javax.faces.partial.ajax", "true"),
            ("javax.faces.source", self.refresh_btn_id),
            ("javax.faces.partial.execute", "@all"),
            ("javax.faces.partial.render", "VhCatg norms fuel VhClass combTablePnl groupingTable msg vhCatgPnl"),
            (self.refresh_btn_id, self.refresh_btn_id),
            ("masterLayout_formlogin", "masterLayout_formlogin"),
            (f"{self.state_select_id}_input", self.current_state or "KL"),
            ("selectedRto_input", rto_value),
            ("yaxisVar_input", yaxis),
            ("xaxisVar_input", xaxis),
            ("selectedYearType_input", year_type),
            ("selectedYear_input", year),
        ]
        for vc in vh_catg:
            refresh_payload.append(("VhCatg", vc))
        for f in fuels:
            refresh_payload.append(("fuel", f))
        if norms:
            for n in norms:
                refresh_payload.append(("norms", n))
        if vh_class:
            for c in vh_class:
                refresh_payload.append(("VhClass", c))
        refresh_payload.append(("groupingTable_scrollState", "0,0"))
        refresh_payload.append(("javax.faces.ViewState", self.view_state))

        resp_refresh = self.session.post(
            self.BASE_URL, headers=self._get_headers(is_ajax=True), data=refresh_payload, timeout=self.timeout
        )
        resp_refresh.raise_for_status()

        # Extract updated ViewState and rendered table HTML
        upd_soup = BeautifulSoup(resp_refresh.text, "xml")
        vs_elem2 = upd_soup.find("update", {"id": re.compile(r"ViewState")})
        if vs_elem2 and vs_elem2.text.strip():
            self.view_state = vs_elem2.text.strip()

        comb_table_upd = upd_soup.find("update", {"id": "combTablePnl"})
        comb_table_html = comb_table_upd.text if comb_table_upd else ""

        # Step 3: Trigger XLS export
        export_payload = [
            ("masterLayout_formlogin", "masterLayout_formlogin"),
            (f"{self.state_select_id}_input", self.current_state or "KL"),
            ("selectedRto_input", rto_value),
            ("yaxisVar_input", yaxis),
            ("xaxisVar_input", xaxis),
            ("selectedYearType_input", year_type),
            ("selectedYear_input", year),
        ]
        for vc in vh_catg:
            export_payload.append(("VhCatg", vc))
        for f in fuels:
            export_payload.append(("fuel", f))
        if norms:
            for n in norms:
                export_payload.append(("norms", n))
        if vh_class:
            for c in vh_class:
                export_payload.append(("VhClass", c))
        export_payload.append(("groupingTable_scrollState", "0,0"))
        export_payload.append(("javax.faces.ViewState", self.view_state))
        export_payload.append(("groupingTable:xls", "groupingTable:xls"))

        resp_export = self.session.post(
            self.BASE_URL, headers=self._get_headers(is_ajax=False), data=export_payload, timeout=self.timeout
        )
        resp_export.raise_for_status()

        # Check if response is binary XLSX
        is_xlsx = resp_export.content.startswith(b"PK\x03\x04") or "spreadsheetml" in resp_export.headers.get("Content-Type", "")

        if is_xlsx:
            raw_xlsx_bytes = resp_export.content
            df = self.parse_xlsx_to_dataframe(
                raw_xlsx_bytes,
                rto_code=rto_code,
                rto_name=rto_name,
                state=self.current_state or "KL",
                year=year,
                yaxis=yaxis,
            )
        else:
            # Resilient Fallback: Parse table directly from combTablePnl HTML
            logger.info(f"Using HTML table parser fallback for {rto_code}...")
            if not comb_table_html:
                raise ValueError("Both XLSX export and combTablePnl HTML were empty.")

            df = self.parse_html_table_to_dataframe(
                comb_table_html,
                rto_code=rto_code,
                rto_name=rto_name,
                state=self.current_state or "KL",
                year=year,
                yaxis=yaxis,
            )

            # Generate XLSX bytes from DataFrame so output files remain intact
            out_buffer = io.BytesIO()
            with pd.ExcelWriter(out_buffer, engine="openpyxl") as writer:
                df.to_excel(writer, sheet_name="reportTable", index=False)
            raw_xlsx_bytes = out_buffer.getvalue()

        return raw_xlsx_bytes, df

    @staticmethod
    def parse_xlsx_to_dataframe(
        xlsx_bytes: bytes,
        rto_code: str = "",
        rto_name: str = "",
        state: str = "KL",
        year: str = "2026",
        yaxis: str = "Maker",
    ) -> pd.DataFrame:
        """
        Parses official Vahan Excel byte stream into a structured DataFrame.
        Dynamically adapts primary dimension column to Maker, Vehicle Category, Norms, etc.
        """
        wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), data_only=True)
        sheet = wb.active

        months = []
        for col in range(3, sheet.max_column):
            val = sheet.cell(4, col).value
            if val and str(val).strip():
                months.append(str(val).strip())

        header_val = sheet.cell(4, 2).value
        if header_val and str(header_val).strip() and "S NO" not in str(header_val).upper():
            primary_col = str(header_val).strip()
        else:
            primary_col = yaxis or "Maker"

        col_names = ["S_No", primary_col] + months + ["TOTAL"]
        data_rows = []

        for row_idx in range(5, sheet.max_row + 1):
            s_no = sheet.cell(row_idx, 1).value
            dim_val = sheet.cell(row_idx, 2).value
            if not dim_val or not str(dim_val).strip():
                continue

            dim_clean = str(dim_val).strip()
            if "TOTAL" in dim_clean.upper():
                continue

            row_data = [s_no, dim_clean]
            for col in range(3, sheet.max_column + 1):
                cell_v = sheet.cell(row_idx, col).value
                if cell_v is None:
                    val_int = 0
                else:
                    try:
                        clean_s = str(cell_v).replace(",", "").strip()
                        val_int = int(float(clean_s))
                    except (ValueError, TypeError):
                        val_int = 0
                row_data.append(val_int)

            if len(row_data) < len(col_names):
                row_data.extend([0] * (len(col_names) - len(row_data)))
            elif len(row_data) > len(col_names):
                row_data = row_data[:len(col_names)]

            data_rows.append(row_data)

        df = pd.DataFrame(data_rows, columns=col_names)
        df.insert(0, "State", state)
        df.insert(1, "RTO_Code", rto_code)
        df.insert(2, "RTO_Name", rto_name)
        df.insert(3, "Year", year)

        return df

    @staticmethod
    def parse_html_table_to_dataframe(
        table_html: str,
        rto_code: str = "",
        rto_name: str = "",
        state: str = "KL",
        year: str = "2026",
        yaxis: str = "Maker",
    ) -> pd.DataFrame:
        """
        Resilient parser for PrimeFaces dataTable HTML in combTablePnl.
        Extracts months, primary dimension values, and numbers.
        """
        soup = BeautifulSoup(table_html, "html.parser")
        table = soup.find("table")
        if not table:
            # Maybe inside div
            table = soup.find("div", id=re.compile(r"groupingTable"))

        rows = soup.find_all("tr")
        if len(rows) < 3:
            raise ValueError("HTML table does not contain enough rows.")

        # Header row with months is typically row index 1
        months = []
        for th in rows[1].find_all(["th", "td"]):
            t = th.text.strip()
            if t and t.upper() not in ["S NO", "MAKER", "VEHICLE CATEGORY", "NORMS", "VEHICLE CLASS", "TOTAL", ""]:
                months.append(t)

        primary_col = yaxis or "Maker"
        col_names = ["S_No", primary_col] + months + ["TOTAL"]
        data_rows = []

        # Data rows start from row index 2
        for tr in rows[2:]:
            cells = [c.text.strip() for c in tr.find_all(["th", "td"])]
            if len(cells) < 2:
                continue

            s_no = cells[0]
            dim_val = cells[1]
            if not dim_val or "TOTAL" in dim_val.upper():
                continue

            row_data = [s_no, dim_val]
            for val in cells[2:]:
                try:
                    clean_s = str(val).replace(",", "").strip()
                    v_int = int(float(clean_s))
                except (ValueError, TypeError):
                    v_int = 0
                row_data.append(v_int)

            if len(row_data) < len(col_names):
                row_data.extend([0] * (len(col_names) - len(row_data)))
            elif len(row_data) > len(col_names):
                row_data = row_data[:len(col_names)]

            data_rows.append(row_data)

        df = pd.DataFrame(data_rows, columns=col_names)
        df.insert(0, "State", state)
        df.insert(1, "RTO_Code", rto_code)
        df.insert(2, "RTO_Name", rto_name)
        df.insert(3, "Year", year)

        return df


def consolidate_all_rtos(
    all_dfs: List[pd.DataFrame],
    output_excel_path: str,
    output_csv_path: Optional[str] = None,
) -> pd.DataFrame:
    """
    Consolidates multiple RTO DataFrames into a single master Excel file with:
    - Sheet 1: 'All_Kerala_Data' (every single record with RTO code & name)
    - Sheet 2: 'RTO_Summary' (Total vehicles & item count per RTO)
    - Sheet 3: '<Dimension>_Share' (Total market share across entire state)
    """
    if not all_dfs:
        raise ValueError("No dataframes provided for consolidation.")

    master_df = pd.concat(all_dfs, ignore_index=True)
    master_df.fillna(0, inplace=True)

    # Detect primary dimension column name (col index 5: State, RTO_Code, RTO_Name, Year, S_No, <Dimension>)
    primary_dim = "Maker"
    if len(master_df.columns) > 5 and master_df.columns[5] not in ["TOTAL", "JAN", "FEB", "MAR", "APR", "MAY", "JUN"]:
        primary_dim = master_df.columns[5]

    non_numeric = ["State", "RTO_Code", "RTO_Name", "Year", "S_No", primary_dim]
    for col in master_df.columns:
        if col not in non_numeric:
            master_df[col] = pd.to_numeric(master_df[col], errors="coerce").fillna(0).astype(int)

    rto_summary = (
        master_df.groupby(["RTO_Code", "RTO_Name"])
        .agg(
            Total_Items=(primary_dim, "count"),
            Total_Vehicles=("TOTAL", "sum")
        )
        .reset_index()
        .sort_values(by="Total_Vehicles", ascending=False)
    )

    dim_summary = (
        master_df.groupby(primary_dim)
        .agg(
            Total_Registrations=("TOTAL", "sum"),
            RTO_Presence=("RTO_Code", "nunique")
        )
        .reset_index()
        .sort_values(by="Total_Registrations", ascending=False)
    )
    grand_total = dim_summary["Total_Registrations"].sum()
    if grand_total > 0:
        dim_summary["Market_Share_%"] = (dim_summary["Total_Registrations"] / grand_total * 100).round(2)
    else:
        dim_summary["Market_Share_%"] = 0.0

    sheet_share_name = f"{primary_dim[:18]}_Share"

    os.makedirs(os.path.dirname(os.path.abspath(output_excel_path)), exist_ok=True)
    with pd.ExcelWriter(output_excel_path, engine="openpyxl") as writer:
        master_df.to_excel(writer, sheet_name="All_Kerala_Data", index=False)
        rto_summary.to_excel(writer, sheet_name="RTO_Summary", index=False)
        dim_summary.to_excel(writer, sheet_name=sheet_share_name, index=False)

    if output_csv_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_csv_path)), exist_ok=True)
        master_df.to_csv(output_csv_path, index=False, encoding="utf-8-sig")

    return master_df
