import Link from "next/link";
import LangToggle from "@/components/LangToggle";
import type { Lang } from "@/lib/i18n";

export function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export default function AdminBar(props: {
  title: string; sub?: string; kicker?: string; back?: { href: string; label: string };
  lang: Lang; here: string; langLabel: string; children?: React.ReactNode;
}) {
  return (
    <header className="bar">
      <div className="bar-inner">
        {props.back && (
          <Link href={props.back.href} className="icon-btn" aria-label={props.back.label}><BackIcon /></Link>
        )}
        <div className="title">
          {props.kicker && <div className="kicker">{props.kicker}</div>}
          <h1>{props.title}</h1>
          {props.sub && <div className="sub">{props.sub}</div>}
        </div>
        {props.children}
        <LangToggle lang={props.lang} back={props.here} label={props.langLabel} />
      </div>
    </header>
  );
}
