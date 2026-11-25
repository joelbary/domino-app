import AdminBar from "@/components/AdminBar";
import PrintButton from "@/components/PrintButton";
import { adminTournament } from "@/lib/access";
import { getT, makeT } from "@/lib/i18n";
import { qrSvg, tournamentUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function QrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tour } = await adminTournament(slug);
  const { t, lang } = await getT();
  const base = `/admin/t/${tour.slug}`;
  const url = tournamentUrl(tour.slug);
  const svg = await qrSvg(url);
  const en = makeT("en"), es = makeT("es");
  return (
    <>
      <div className="no-print">
        <AdminBar title={t("qrTitle")} sub={tour.name} back={{ href: base, label: tour.name }} lang={lang} here={`${base}/qr`} langLabel={t("langToggle")} />
      </div>
      <main className="page" style={{ maxWidth: 560 }}>
        <section className="card qr-poster" style={{ textAlign: "center", display: "grid", gap: 12, justifyItems: "center" }}>
          {tour.hasLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/t/${tour.slug}/logo`} alt="" style={{ maxHeight: 90, maxWidth: "60%", objectFit: "contain" }} />
          )}
          <h2 style={{ fontSize: 28, margin: 0 }}>{tour.name}</h2>
          <p style={{ margin: 0, fontWeight: 600 }}>{en("qrScan")}<br />{es("qrScan")}</p>
          <div style={{ width: "100%", maxWidth: 380 }} dangerouslySetInnerHTML={{ __html: svg }} />
          <p style={{ margin: 0, fontFamily: "var(--display)", fontWeight: 700, fontSize: 22, letterSpacing: "0.02em" }}>{url.replace("https://", "")}</p>
        </section>
        <div className="no-print stack" style={{ marginTop: 14 }}>
          <PrintButton label={t("qrPrint")} />
          <a className="btn ghost block" href={`${base}/qr/png`} download>{t("qrDownload")}</a>
          <p className="help">{t("qrHelp")}</p>
        </div>
      </main>
    </>
  );
}
