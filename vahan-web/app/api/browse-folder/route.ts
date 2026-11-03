import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import path from "path";

const execAsync = util.promisify(exec);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let initialPath = "";
    try {
      const body = await req.json();
      initialPath = body.currentPath || "";
    } catch (_) {}

    if (process.platform === "win32") {
      // Native Windows Folder Browser Dialog
      const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select Output Directory for Vahan Parivahan Data"
$dialog.ShowNewFolderButton = $true
if ("${initialPath.replace(/\\/g, "\\\\")}" -and (Test-Path "${initialPath.replace(/\\/g, "\\\\")}")) {
    $dialog.SelectedPath = "${initialPath.replace(/\\/g, "\\\\")}"
}
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.SelectedPath
} else {
    Write-Output "CANCELLED"
}
      `.trim();

      const encoded = Buffer.from(psScript, "utf16le").toString("base64");
      const { stdout } = await execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`);
      const selected = stdout.trim();

      if (selected && selected !== "CANCELLED") {
        return NextResponse.json({ success: true, path: path.resolve(selected) });
      } else {
        return NextResponse.json({ success: false, cancelled: true });
      }
    } else {
      // Cloud/Linux environment (Netlify, Vercel, AWS)
      return NextResponse.json({
        success: true,
        isCloud: true,
        path: "Browser Downloads Folder (Cloud Mode)",
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to open folder picker dialog" },
      { status: 500 }
    );
  }
}
