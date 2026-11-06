import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import defaultOemDb from "@/lib/oem-db.json";
import defaultRtoDt from "@/lib/rto-dt.json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "oem";
    const year = searchParams.get("year");
    const segment = searchParams.get("segment");

    // 1. Fetch OEMs from MariaDB table 'oem_master'
    if (type === "oem") {
      try {
        const [rows] = await pool.query(
          "SELECT oem_name as oemName, oem_final as oemFinal, oem_group as oemGroup, oem_grouping as oemGrouping FROM oem_master ORDER BY oem_grouping, oem_name"
        );
        if (Array.isArray(rows) && rows.length > 0) {
          return NextResponse.json({ success: true, source: "mariadb", data: rows });
        }
      } catch (dbErr) {
        console.warn("MariaDB oem_master query warning:", dbErr);
      }
      return NextResponse.json({ success: true, source: "bundled", data: defaultOemDb });
    }

    // 2. Fetch RTOs from MariaDB table 'rto_master'
    if (type === "rto") {
      try {
        const [rows] = await pool.query(
          "SELECT srt_office as srtOffice, final_rto_name as finalRtoName, district, territory FROM rto_master ORDER BY territory, district, final_rto_name"
        );
        if (Array.isArray(rows) && rows.length > 0) {
          return NextResponse.json({ success: true, source: "mariadb", data: rows });
        }
      } catch (dbErr) {
        console.warn("MariaDB rto_master query warning:", dbErr);
      }
      return NextResponse.json({ success: true, source: "bundled", data: defaultRtoDt });
    }

    // 3. Fetch Vehicle Registrations directly from MariaDB table 'vahan_registrations'
    if (type === "registrations") {
      try {
        let sql = `
          SELECT state, rto_code as RTO_Code, rto_name as RTO_Name, final_rto_name as finalRtoName,
                 district, territory, year as Year, segment as segment, segment as Segment,
                 maker as Maker, oem_final as oemFinal,
                 oem_group as oemGroup, oem_grouping as oemGrouping,
                 jan as JAN, feb as FEB, mar as MAR, apr as APR, may as MAY, jun as JUN,
                 jul as JUL, aug as AUG, sep as SEP, oct as OCT, nov as NOV, dec_val as \`DEC\`, total as TOTAL
          FROM vahan_registrations
        `;
        const whereClauses: string[] = [];
        const params: any[] = [];
        if (year && year !== "ALL") {
          const yearList = year.split(",").map((y) => Number(y.trim())).filter((n) => !isNaN(n));
          if (yearList.length === 1) {
            whereClauses.push("year = ?");
            params.push(yearList[0]);
          } else if (yearList.length > 1) {
            whereClauses.push(`year IN (${yearList.map(() => "?").join(",")})`);
            params.push(...yearList);
          }
        }
        if (segment && segment !== "ALL") {
          whereClauses.push("segment = ?");
          params.push(segment.toUpperCase().trim());
        }
        if (whereClauses.length > 0) {
          sql += " WHERE " + whereClauses.join(" AND ");
        }
        sql += " ORDER BY rto_code, maker";

        const [rows] = await pool.query(sql, params);
        return NextResponse.json({ success: true, source: "mariadb_live", count: (rows as any[]).length, data: rows });
      } catch (dbErr: any) {
        return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
      }
    }

    // 4. Live Dynamic Aggregations directly from MariaDB table 'vahan_registrations' (Zero dummy tables)
    if (type === "summary" || type === "benchmarks") {
      try {
        const [rows] = await pool.query(`
          SELECT
            territory,
            district,
            final_rto_name as rtoName,
            year,
            segment,
            SUM(total) as total,
            SUM(CASE WHEN maker LIKE '%MAHINDRA%' OR oem_final LIKE '%MAHINDRA%' THEN total ELSE 0 END) as mm,
            ROUND(SUM(CASE WHEN maker LIKE '%MAHINDRA%' OR oem_final LIKE '%MAHINDRA%' THEN total ELSE 0 END) / NULLIF(SUM(total), 0) * 100, 2) as ms
          FROM vahan_registrations
          WHERE final_rto_name IS NOT NULL AND final_rto_name != ''
          GROUP BY territory, district, final_rto_name, year, segment
          ORDER BY territory, district, final_rto_name, year
        `);
        return NextResponse.json({ success: true, source: "mariadb_vahan_registrations", count: (rows as any[]).length, data: rows });
      } catch (dbErr: any) {
        console.warn("MariaDB dynamic summary query warning:", dbErr);
        return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: "Invalid type requested" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, action = "upsert", data, record } = body;

    // A. Single Record Deletion
    if (action === "delete") {
      if (type === "oem" && record?.oemName) {
        await pool.query("DELETE FROM oem_master WHERE oem_name = ?", [record.oemName]);
        return NextResponse.json({ success: true, deleted: record.oemName });
      }
      if (type === "rto" && record?.srtOffice) {
        await pool.query("DELETE FROM rto_master WHERE srt_office = ?", [record.srtOffice]);
        return NextResponse.json({ success: true, deleted: record.srtOffice });
      }
    }

    // B. Bulk Sync for OEM Master Table
    if (type === "oem" && Array.isArray(data)) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("TRUNCATE TABLE oem_master");
        if (data.length > 0) {
          const values = data.map((o: any) => [
            String(o.oemName || "").trim(),
            String(o.oemFinal || o.oemName || "").trim(),
            String(o.oemGroup || "Other OEM").trim(),
            String(o.oemGrouping || "Others").trim(),
          ]);
          await conn.query(
            "INSERT INTO oem_master (oem_name, oem_final, oem_group, oem_grouping) VALUES ?",
            [values]
          );
        }
        await conn.commit();
        return NextResponse.json({ success: true, count: data.length, source: "mariadb" });
      } catch (err: any) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    // C. Bulk Sync for RTO Master Table
    if (type === "rto" && Array.isArray(data)) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("TRUNCATE TABLE rto_master");
        if (data.length > 0) {
          const values = data.map((d: any) => [
            String(d.rtoCode || "").trim(),
            String(d.srtOffice || "").trim(),
            String(d.finalRtoName || "").trim(),
            String(d.district || "").trim(),
            String(d.territory || "").trim(),
          ]);
          await conn.query(
            "INSERT INTO rto_master (rto_code, srt_office, final_rto_name, district, territory) VALUES ?",
            [values]
          );
        }
        await conn.commit();
        return NextResponse.json({ success: true, count: data.length, source: "mariadb" });
      } catch (err: any) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    // D. Bulk Scraped Registrations Insertion directly into vahan_registrations
    if (type === "registrations" && Array.isArray(data) && data.length > 0) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const stmt = `
          INSERT INTO vahan_registrations
            (state, rto_code, rto_name, final_rto_name, district, territory, year, segment, maker,
             oem_final, oem_group, oem_grouping, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec_val, total)
          VALUES ?
          ON DUPLICATE KEY UPDATE
            jan = VALUES(jan), feb = VALUES(feb), mar = VALUES(mar), apr = VALUES(apr),
            may = VALUES(may), jun = VALUES(jun), jul = VALUES(jul), aug = VALUES(aug),
            sep = VALUES(sep), oct = VALUES(oct), nov = VALUES(nov), dec_val = VALUES(dec_val),
            total = VALUES(total), oem_final = VALUES(oem_final), oem_group = VALUES(oem_group),
            oem_grouping = VALUES(oem_grouping), segment = VALUES(segment)
        `;

        const values = data.map((r: any) => [
          r.State || "KL",
          r.RTO_Code || "",
          r.RTO_Name || "",
          r.finalRtoName || r.RTO_Name || "",
          r.district || "",
          r.territory || "",
          Number(r.Year || 2026),
          String(r.segment || r.Segment || "PV").toUpperCase().trim(),
          r.Maker || "",
          r.oemFinal || r.Maker || "",
          r.oemGroup || "Other OEM",
          r.oemGrouping || "Others",
          Number(r.JAN || 0),
          Number(r.FEB || 0),
          Number(r.MAR || 0),
          Number(r.APR || 0),
          Number(r.MAY || 0),
          Number(r.JUN || 0),
          Number(r.JUL || 0),
          Number(r.AUG || 0),
          Number(r.SEP || 0),
          Number(r.OCT || 0),
          Number(r.NOV || 0),
          Number(r.DEC || 0),
          Number(r.TOTAL || 0),
        ]);

        const chunkSize = 500;
        for (let i = 0; i < values.length; i += chunkSize) {
          await conn.query(stmt, [values.slice(i, i + chunkSize)]);
        }
        await conn.commit();
        return NextResponse.json({ success: true, count: values.length, source: "mariadb_live" });
      } catch (txErr: any) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }
    }

    return NextResponse.json({ success: true, message: "No action taken" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
