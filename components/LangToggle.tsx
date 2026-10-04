import { setLang } from "@/app/admin/actions";
import type { Lang } from "@/lib/i18n";

// Two-button EN/ES switch. `back` is the page to return to.
export default function LangToggle({ lang, back, label }: { lang: Lang; back: string; label: string }) {
  return (
    <form action={setLang} className="lang" aria-label={label}>
      <input type="hidden" name="back" value={back} />
      <button name="lang" value="en" aria-pressed={lang === "en"}>EN</button>
      <button name="lang" value="es" aria-pressed={lang === "es"}>ES</button>
    </form>
  );
}
