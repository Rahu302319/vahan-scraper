import * as cheerio from "cheerio";
import ExcelJS from "exceljs";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const DEFAULT_FUELS = [
  "33", "38", "32", "6", "2", "12", "21", "18", "19", "20",
  "13", "36", "35", "22", "34", "37", "17", "8", "15", "99",
  "1", "3", "16", "29", "31", "40", "30", "11", "39", "5",
  "14", "26", "10", "25"
];

export const ALL_FUELS_DICT: Record<string, string> = {
  "33": "BIO-CNG/BIO-GAS",
  "38": "BIO-DIESEL(B100)",
  "32": "BIO-METHANE",
  "6": "CNG ONLY",
  "2": "DIESEL",
  "12": "DIESEL/HYBRID",
  "21": "DI-METHYL ETHER",
  "18": "DUAL DIESEL/BIO CNG",
  "19": "DUAL DIESEL/CNG",
  "20": "DUAL DIESEL/LNG",
  "4": "ELECTRIC(BOV)",
  "13": "ETHANOL(E100)",
  "36": "FLEX-FUEL(BIO-DIESEL)",
  "35": "FLEX-FUEL(ETHANOL)",
  "22": "FUEL CELL HYDROGEN",
  "34": "HCNG",
  "37": "HYDROGEN(ICE)",
  "17": "LNG",
  "8": "LPG ONLY",
  "15": "METHANOL",
  "99": "NOT APPLICABLE",
  "1": "PETROL",
  "3": "PETROL/CNG",
  "16": "PETROL(E20)",
  "29": "PETROL(E20)/CNG",
  "31": "PETROL(E20)/HYBRID",
  "40": "PETROL(E20)/HYBRID/CNG",
  "30": "PETROL(E20)/LPG",
  "11": "PETROL/HYBRID",
  "39": "PETROL/HYBRID/CNG",
  "5": "PETROL/LPG",
  "14": "PETROL/METHANOL",
  "26": "PLUG-IN HYBRID EV",
  "23": "PURE EV",
  "10": "SOLAR",
  "25": "STRONG HYBRID EV"
};

export const DEFAULT_VH_CATG = ["LMV", "LPV"];

export const ALL_VH_CATG_DICT: Record<string, string> = {
  LMV: "LIGHT MOTOR VEHICLE",
  LPV: "LIGHT PASSENGER VEHICLE",
  "2WIC": "TWO WHEELER (INVALID CARRIAGE)",
  "2WN": "TWO WHEELER (NON-TRANSPORT)",
  "2WT": "TWO WHEELER (TRANSPORT)",
  "3WIC": "THREE WHEELER (INVALID CARRIAGE)",
  "3WN": "THREE WHEELER (NON-TRANSPORT)",
  "3WT": "THREE WHEELER (TRANSPORT)",
  "4WIC": "FOUR WHEELER (INVALID CARRIAGE)",
  HGV: "HEAVY GOODS VEHICLE",
  HMV: "HEAVY MOTOR VEHICLE",
  HPV: "HEAVY PASSENGER VEHICLE",
  LGV: "LIGHT GOODS VEHICLE",
  MGV: "MEDIUM GOODS VEHICLE",
  MMV: "MEDIUM MOTOR VEHICLE",
  MPV: "MEDIUM PASSENGER VEHICLE",
  OTH: "OTHER"
};

export const ALL_VH_CATG = Object.keys(ALL_VH_CATG_DICT);

export const ALL_NORMS_DICT: Record<string, string> = {
  "15": "BHARAT STAGE VI",
  "4":  "BHARAT STAGE IV",
  "3":  "BHARAT STAGE III",
  "2":  "BHARAT STAGE II",
  "1":  "BHARAT STAGE I",
  "11": "BHARAT STAGE III/IV",
  "18": "BHARAT STAGE III (CEV)",
  "5":  "BHARAT (TREM) STAGE III",
  "6":  "BHARAT (TREM) STAGE III A",
  "26": "BHARAT (TREM) STAGE III AA",
  "12": "BHARAT (TREM) STAGE III B",
  "24": "CEV STAGE IV",
  "25": "CEV STAGE V",
  "17": "EURO 6",
  "19": "EURO 6A",
  "20": "EURO 6B",
  "21": "EURO 6C",
  "22": "EURO 6D",
  "23": "EURO 6AD",
  "10": "EURO 4",
  "9":  "EURO 3",
  "8":  "EURO 2",
  "7":  "EURO 1",
  "13": "TREM STAGE IV",
  "14": "TREM STAGE V",
  "98": "NOT APPLICABLE",
  "99": "NOT AVAILABLE"
};

export const ALL_VHCLASS_DICT: Record<string, string> = {
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
};

export const YAXIS_OPTIONS = [
  { label: "Maker (OEM Brands)", value: "Maker" },
  { label: "Vehicle Category", value: "Vehicle Category" },
  { label: "Norms (Emission)", value: "Norms" },
  { label: "Vehicle Class", value: "Vehicle Class" },
  { label: "Fuel Type", value: "Fuel" }
];

export interface RTOItem {
  value: string;
  code: string;
  name: string;
  raw: string;
}

export interface RTORowData {
  State: string;
  RTO_Code: string;
  RTO_Name: string;
  Year: string;
  S_No: string | number;
  Maker: string;
  [key: string]: any; // Months: JAN, FEB... TOTAL
  TOTAL: number;
}

export class VahanWebSession {
  private cookies: Map<string, string> = new Map();
  public viewState: string = "";
  public stateSelectId: string = "j_idt38";
  public refreshBtnId: string = "j_idt68";
  public filterBtnId: string = "j_idt73";
  public currentState: string = "KL";

  private baseUrl = "https://vahan.parivahan.gov.in/vahan4dashboard/vahan/view/reportview.xhtml";

  private updateCookies(resp: Response) {
    const rawCookies = resp.headers.getSetCookie?.() || [];
    for (const c of rawCookies) {
      const parts = c.split(";")[0].split("=");
      if (parts.length >= 2) {
        this.cookies.set(parts[0].trim(), parts.slice(1).join("=").trim());
      }
    }
    // Also check single set-cookie
    const single = resp.headers.get("set-cookie");
    if (single && rawCookies.length === 0) {
      const parts = single.split(";")[0].split("=");
      if (parts.length >= 2) {
        this.cookies.set(parts[0].trim(), parts.slice(1).join("=").trim());
      }
    }
  }

  private getCookieHeader(): string {
    const arr: string[] = [];
    this.cookies.forEach((v, k) => arr.push(`${k}=${v}`));
    return arr.join("; ");
  }

  async initSession(): Promise<string> {
    const resp = await fetch(this.baseUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to initialize Vahan portal session: ${resp.status} ${resp.statusText}`);
    }

    this.updateCookies(resp);
    const html = await resp.text();
    const $ = cheerio.load(html);

    const vs = $('input[name="javax.faces.ViewState"]').val();
    if (!vs || typeof vs !== "string") {
      throw new Error("Could not extract javax.faces.ViewState from Vahan portal.");
    }
    this.viewState = vs;

    // Dynamically discover state select id
    $("select").each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes("vahan4 running states")) {
        const id = $(el).attr("id");
        if (id) {
          this.stateSelectId = id.replace("_input", "");
        }
      }
    });

    // Dynamically discover refresh button id
    $("button").each((_, el) => {
      const onclick = $(el).attr("onclick") || "";
      if (onclick.includes("groupingTable")) {
        const m = onclick.match(/s:"(.*?)"/);
        if (m && m[1]) {
          this.refreshBtnId = m[1];
        }
      }
    });

    // Dynamically discover filter refresh button id
    $("#filterLayout button, .ui-layout-west button").each((_, el) => {
      const onclick = $(el).attr("onclick") || "";
      if (onclick.includes("combTablePnl")) {
        const id = $(el).attr("id");
        if (id) {
          this.filterBtnId = id;
        }
      }
    });

    return this.viewState;
  }

  async selectState(stateCode: string = "KL"): Promise<RTOItem[]> {
    if (!this.viewState) {
      await this.initSession();
    }

    const body = new URLSearchParams({
      "javax.faces.partial.ajax": "true",
      "javax.faces.source": this.stateSelectId,
      "javax.faces.partial.execute": this.stateSelectId,
      "javax.faces.partial.render": "selectedRto yaxisVar",
      "javax.faces.behavior.event": "change",
      "javax.faces.partial.event": "change",
      masterLayout_formlogin: "masterLayout_formlogin",
      [`${this.stateSelectId}_focus`]: "",
      [`${this.stateSelectId}_input`]: stateCode,
      "javax.faces.ViewState": this.viewState,
    });

    const resp = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/xml, text/xml, */*; q=0.01",
        "Faces-Request": "partial/ajax",
        "X-Requested-With": "XMLHttpRequest",
        Referer: this.baseUrl,
        Origin: "https://vahan.parivahan.gov.in",
        Cookie: this.getCookieHeader(),
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      throw new Error(`Failed to select state ${stateCode}: ${resp.status}`);
    }

    this.updateCookies(resp);
    const xml = await resp.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    // Update ViewState
    $('update[id*="ViewState"]').each((_, el) => {
      const val = $(el).text().trim();
      if (val) this.viewState = val;
    });

    const rtoUpdate = $('update[id="selectedRto"]').text();
    if (!rtoUpdate) {
      throw new Error("No selectedRto update received in partial response");
    }

    const $rto = cheerio.load(rtoUpdate);
    const rtos: RTOItem[] = [];

    $rto("option").each((_, opt) => {
      const val = $rto(opt).attr("value");
      const text = $rto(opt).text().trim();
      if (!val || val === "-1") return;

      const m = text.match(/^(.*?)\s*-\s*([A-Z0-9]+)\s*\(/);
      let cleanName = text;
      let rtoCode = `${stateCode}${val}`;
      if (m) {
        cleanName = m[1].trim();
        rtoCode = m[2].trim();
      }

      rtos.push({
        value: val,
        code: rtoCode,
        name: cleanName,
        raw: text,
      });
    });

    this.currentState = stateCode;
    return rtos;
  }

  async fetchRTO(
    rtoValue: string,
    rtoCode: string,
    rtoName: string,
    year: string = "2026",
    yaxis: string = "Maker",
    vhCatg: string[] = DEFAULT_VH_CATG,
    fuels: string[] = DEFAULT_FUELS,
    norms: string[] = [],
    vhClass: string[] = []
  ): Promise<{ rows: RTORowData[]; xlsxBuffer?: ArrayBuffer }> {
    if (!this.viewState) {
      await this.initSession();
      await this.selectState(this.currentState);
    }

    // Step 1: Select RTO via AJAX
    const bodyRto = new URLSearchParams({
      "javax.faces.partial.ajax": "true",
      "javax.faces.source": "selectedRto",
      "javax.faces.partial.execute": "selectedRto",
      "javax.faces.partial.render": "yaxisVar",
      "javax.faces.behavior.event": "change",
      "javax.faces.partial.event": "change",
      masterLayout_formlogin: "masterLayout_formlogin",
      [`${this.stateSelectId}_input`]: this.currentState,
      selectedRto_focus: "",
      selectedRto_input: rtoValue,
      "javax.faces.ViewState": this.viewState,
    });

    const respRto = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/xml, text/xml, */*; q=0.01",
        "Faces-Request": "partial/ajax",
        "X-Requested-With": "XMLHttpRequest",
        Referer: this.baseUrl,
        Origin: "https://vahan.parivahan.gov.in",
        Cookie: this.getCookieHeader(),
      },
      body: bodyRto.toString(),
    });

    this.updateCookies(respRto);
    const xmlRto = await respRto.text();
    const $rto = cheerio.load(xmlRto, { xmlMode: true });
    $rto('update[id*="ViewState"]').each((_, el) => {
      const v = $rto(el).text().trim();
      if (v) this.viewState = v;
    });

    // Step 2a: Main toolbar refresh to initialize vhCatgPnl and component tree
    const initParams = new URLSearchParams();
    initParams.append("javax.faces.partial.ajax", "true");
    initParams.append("javax.faces.source", this.refreshBtnId);
    initParams.append("javax.faces.partial.execute", "@all");
    initParams.append("javax.faces.partial.render", "VhCatg norms fuel VhClass combTablePnl groupingTable msg vhCatgPnl");
    initParams.append(this.refreshBtnId, this.refreshBtnId);
    initParams.append("masterLayout_formlogin", "masterLayout_formlogin");
    initParams.append(`${this.stateSelectId}_input`, this.currentState);
    initParams.append("selectedRto_input", rtoValue);
    initParams.append("yaxisVar_input", yaxis);
    initParams.append("xaxisVar_input", "Month Wise");
    initParams.append("selectedYearType_input", "C");
    initParams.append("selectedYear_input", year);
    initParams.append("javax.faces.ViewState", this.viewState);

    const respInit = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/xml, text/xml, */*; q=0.01",
        "Faces-Request": "partial/ajax",
        "X-Requested-With": "XMLHttpRequest",
        Referer: this.baseUrl,
        Origin: "https://vahan.parivahan.gov.in",
        Cookie: this.getCookieHeader(),
      },
      body: initParams.toString(),
    });

    this.updateCookies(respInit);
    const xmlInit = await respInit.text();
    const $init = cheerio.load(xmlInit, { xmlMode: true });
    $init('update[id*="ViewState"]').each((_, el) => {
      const v = $init(el).text().trim();
      if (v) this.viewState = v;
    });

    // Step 2b: Filter panel refresh (filterBtnId) to apply VhCatg, fuel, norms, VhClass
    const filterParams = new URLSearchParams();
    filterParams.append("javax.faces.partial.ajax", "true");
    filterParams.append("javax.faces.source", this.filterBtnId);
    filterParams.append("javax.faces.partial.execute", "@all");
    filterParams.append("javax.faces.partial.render", "combTablePnl");
    filterParams.append(this.filterBtnId, this.filterBtnId);
    filterParams.append("masterLayout_formlogin", "masterLayout_formlogin");
    filterParams.append(`${this.stateSelectId}_input`, this.currentState);
    filterParams.append("selectedRto_input", rtoValue);
    filterParams.append("yaxisVar_input", yaxis);
    filterParams.append("xaxisVar_input", "Month Wise");
    filterParams.append("selectedYearType_input", "C");
    filterParams.append("selectedYear_input", year);

    for (const vc of vhCatg) filterParams.append("VhCatg", vc);
    for (const f of fuels) filterParams.append("fuel", f);
    for (const n of norms) filterParams.append("norms", n);
    for (const c of vhClass) filterParams.append("VhClass", c);
    filterParams.append("javax.faces.ViewState", this.viewState);

    const respFilter = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/xml, text/xml, */*; q=0.01",
        "Faces-Request": "partial/ajax",
        "X-Requested-With": "XMLHttpRequest",
        Referer: this.baseUrl,
        Origin: "https://vahan.parivahan.gov.in",
        Cookie: this.getCookieHeader(),
      },
      body: filterParams.toString(),
    });

    this.updateCookies(respFilter);
    const xmlFilter = await respFilter.text();
    const $filter = cheerio.load(xmlFilter, { xmlMode: true });
    $filter('update[id*="ViewState"]').each((_, el) => {
      const v = $filter(el).text().trim();
      if (v) this.viewState = v;
    });

    const combTableHtml = $filter('update[id="combTablePnl"]').text();

    // Step 3: Trigger XLS export
    const exportParams = new URLSearchParams();
    exportParams.append("masterLayout_formlogin", "masterLayout_formlogin");
    exportParams.append(`${this.stateSelectId}_input`, this.currentState);
    exportParams.append("selectedRto_input", rtoValue);
    exportParams.append("yaxisVar_input", yaxis);
    exportParams.append("xaxisVar_input", "Month Wise");
    exportParams.append("selectedYearType_input", "C");
    exportParams.append("selectedYear_input", year);

    for (const vc of vhCatg) exportParams.append("VhCatg", vc);
    for (const f of fuels) exportParams.append("fuel", f);
    for (const n of norms) exportParams.append("norms", n);
    for (const c of vhClass) exportParams.append("VhClass", c);
    exportParams.append("javax.faces.ViewState", this.viewState);
    exportParams.append("groupingTable:xls", "groupingTable:xls");

    const respExport = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: this.baseUrl,
        Origin: "https://vahan.parivahan.gov.in",
        Cookie: this.getCookieHeader(),
      },
      body: exportParams.toString(),
    });

    this.updateCookies(respExport);
    const contentType = respExport.headers.get("content-type") || "";
    const buf = await respExport.arrayBuffer();

    // Verify if valid XLSX
    const uint8 = new Uint8Array(buf.slice(0, 4));
    const isZip = uint8[0] === 0x50 && uint8[1] === 0x4b; // 'PK'

    let rows: RTORowData[] = [];

    if (isZip || contentType.includes("spreadsheetml")) {
      rows = await this.parseXlsxBuffer(buf, rtoCode, rtoName, this.currentState, year, yaxis);
      return { rows, xlsxBuffer: buf };
    } else {
      // Fallback: parse combTableHtml
      if (!combTableHtml) {
        throw new Error("Server returned non-Excel response and combTablePnl HTML was empty.");
      }
      rows = this.parseHtmlTable(combTableHtml, rtoCode, rtoName, this.currentState, year, yaxis);
      return { rows };
    }
  }

  private async parseXlsxBuffer(
    buf: ArrayBuffer,
    rtoCode: string,
    rtoName: string,
    state: string,
    year: string,
    yaxis: string = "Maker"
  ): Promise<RTORowData[]> {
    const workbook = new ExcelJS.Workbook();
    // @ts-ignore
    await workbook.xlsx.load(Buffer.from(buf));
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    // Row 4 has month names starting at col 3
    const months: string[] = [];
    const row4 = sheet.getRow(4);
    for (let c = 3; c < sheet.columnCount; c++) {
      const val = row4.getCell(c).value;
      if (val && typeof val === "string" && val.trim()) {
        months.push(val.trim());
      }
    }

    const rows: RTORowData[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber < 5) return;
      const sNo = row.getCell(1).value;
      const maker = row.getCell(2).value;
      if (!maker || typeof maker !== "string" || !maker.trim()) return;

      const makerStr = maker.trim();
      if (makerStr.toUpperCase().includes("TOTAL")) return;

      const item: RTORowData = {
        State: state,
        RTO_Code: rtoCode,
        RTO_Name: rtoName,
        Year: year,
        S_No: sNo ? String(sNo) : "",
        Maker: makerStr,
        TOTAL: 0,
      };
      item[yaxis] = makerStr;

      let colIdx = 3;
      for (const m of months) {
        const rawV = row.getCell(colIdx).value;
        item[m] = this.cleanInt(rawV);
        colIdx++;
      }

      const totalVal = row.getCell(colIdx).value;
      item.TOTAL = this.cleanInt(totalVal);
      rows.push(item);
    });

    return rows;
  }

  private parseHtmlTable(
    html: string,
    rtoCode: string,
    rtoName: string,
    state: string,
    year: string,
    yaxis: string = "Maker"
  ): RTORowData[] {
    const $ = cheerio.load(html);
    const rows: RTORowData[] = [];

    const trs = $("tr");
    if (trs.length < 3) return rows;

    const months: string[] = [];
    $(trs[1]).find("th, td").each((_, el) => {
      const t = $(el).text().trim();
      if (t && !["S NO", "MAKER", "VEHICLE CATEGORY", "NORMS", "VEHICLE CLASS", "TOTAL", ""].includes(t.toUpperCase())) {
        months.push(t);
      }
    });

    trs.slice(2).each((_, tr) => {
      const cells: string[] = [];
      $(tr).find("th, td").each((_, c) => {
        cells.push($(c).text().trim());
      });
      if (cells.length < 2) return;

      const sNo = cells[0];
      const maker = cells[1];
      if (!maker || maker.toUpperCase().includes("TOTAL")) return;

      const item: RTORowData = {
        State: state,
        RTO_Code: rtoCode,
        RTO_Name: rtoName,
        Year: year,
        S_No: sNo,
        Maker: maker,
        TOTAL: 0,
      };
      item[yaxis] = maker;

      let cIdx = 2;
      for (const m of months) {
        item[m] = cIdx < cells.length ? this.cleanInt(cells[cIdx]) : 0;
        cIdx++;
      }
      if (cIdx < cells.length) {
        item.TOTAL = this.cleanInt(cells[cIdx]);
      }
      rows.push(item);
    });

    return rows;
  }

  private cleanInt(val: any): number {
    if (val === null || val === undefined) return 0;
    try {
      const s = String(val).replace(/,/g, "").trim();
      const num = parseFloat(s);
      return isNaN(num) ? 0 : Math.round(num);
    } catch {
      return 0;
    }
  }
}

