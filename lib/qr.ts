import "server-only";
import QRCode from "qrcode";

export const PUBLIC_HOST = "https://domino.joelbary.com";
export const tournamentUrl = (slug: string) => `${PUBLIC_HOST}/${slug}`;
const opts = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#0f4d32", light: "#ffffff" } };

export const qrSvg = (url: string) => QRCode.toString(url, { ...opts, type: "svg" });
export const qrPng = (url: string) => QRCode.toBuffer(url, { ...opts, width: 1200 });
