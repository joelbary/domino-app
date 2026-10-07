import "server-only";
import Papa from "papaparse";
import { readSheet } from "read-excel-file/node";

export type ImportRow = { row: number; first: string; last: string; phone: string; team: string };

function norm(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  return String(v).trim();
}

// Reads the first sheet of an .xlsx or a .csv into rows of cells.
export async function readTable(file: File): Promise<unknown[][]> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const parsed = Papa.parse<string[]>(buf.toString("utf8").replace(/^﻿/, ""), { skipEmptyLines: true });
    return parsed.data;
  }
  return (await readSheet(buf)) as unknown[][];
}

// Finds the columns by header name (English or Spanish) and returns clean rows.
export function toPlayers(table: unknown[][]): { rows: ImportRow[] } | { error: "errNoColumns" } {
  if (!table.length) return { error: "errNoColumns" };
  const header = table[0].map(norm);
  const find = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h === k || h.includes(k)));
  const iPhone = find("phone", "telefono", "tel", "celular", "cel", "movil", "whatsapp", "access");
  const iFirst = find("first", "nombre", "given");
  const iLast = find("last", "apellido", "surname", "family");
  const iFull = find("full name", "jugador", "player", "name");
  const iTeam = find("team", "equipo");
  if (iFirst < 0 && iFull < 0) return { error: "errNoColumns" }; // Phone is optional (address book fills it)

  const rows: ImportRow[] = [];
  table.slice(1).forEach((r, idx) => {
    const get = (i: number) => (i >= 0 ? cell(r[i]) : "");
    let first = get(iFirst);
    let last = get(iLast);
    if ((!first || iFirst === iFull) && iFull >= 0 && iLast < 0) {
      const parts = get(iFull).split(/\s+/).filter(Boolean);
      first = parts.shift() ?? "";
      last = parts.join(" ");
    }
    const phone = get(iPhone);
    const team = get(iTeam);
    if (!first && !last && !phone) return; // blank line
    rows.push({ row: idx + 2, first, last, phone, team });
  });
  return { rows };
}
