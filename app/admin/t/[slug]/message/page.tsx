import AdminBar from "@/components/AdminBar";
import MessagePlayers from "@/components/MessagePlayers";
import { adminTournament } from "@/lib/access";
import { getT } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { listEntries } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export default async function MessagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tour } = await adminTournament(slug);
  const { t, lang } = await getT();
  const ents = await listEntries(tour.id);
  const base = `/admin/t/${tour.slug}`;
  const date = tour.eventDate
    ? tour.eventDate.toLocaleDateString(lang === "es" ? "es" : "en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    : "";
  const defaultMessage = t("defaultReminder", { tournament: tour.name, date: date ? (lang === "es" ? `el ${date}` : `on ${date}`) : t("reminderSoon"), link: `https://domino.joelbary.com/${tour.slug}` });
  const labels = Object.fromEntries(keys.map((k) => [k, t(`msg_${k}` as Parameters<typeof t>[0])])) as Record<(typeof keys)[number], string>;
  return (
    <>
      <AdminBar title={t("messagePlayersTitle")} sub={tour.name} back={{ href: base, label: tour.name }} lang={lang} here={`${base}/message`} langLabel={t("langToggle")} />
      <main className="page">
        <MessagePlayers
          storeKey={`domino:msg:${tour.id}`}
          defaultMessage={defaultMessage}
          players={ents.filter((e) => e.phone).map((e) => ({ id: e.entryId, first: e.firstName, name: `${e.firstName} ${e.lastName}`.trim(), phone: e.phone!, display: formatPhone(e.phone) }))}
          noPhone={ents.filter((e) => !e.phone).map((e) => `${e.firstName} ${e.lastName}`.trim())}
          labels={labels}
        />
      </main>
    </>
  );
}
