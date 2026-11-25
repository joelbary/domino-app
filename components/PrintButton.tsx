"use client";

export default function PrintButton({ label }: { label: string }) {
  return <button type="button" className="btn block" onClick={() => window.print()}>{label}</button>;
}
