import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { makeDevSalonGalleryDataUrls } from "../../lib/devSeedRandomSalonImages";
import { emptySalonPersonalPageData, writeSalonPersonalPageData } from "../../lib/salonPersonalPageStorage";
import { emptySalonShowcase, readSalonShowcaseAsync, writeSalonShowcaseAsync } from "../../lib/salonShowcaseStorage";

/** Sopravvive al remount di React StrictMode (evita doppio seed nella stessa sessione). */
let devShowcaseSeedAutoSession = false;

function hairBolognaDemoPersonal() {
  const p = emptySalonPersonalPageData();
  p.heroTitle = "Hair Bologna";
  p.heroSubtitle =
    "Taglio, colore e trattamenti nel centro di Bologna — team dedicato, consulenza su misura e prodotti professionali.";
  p.ownerIntro =
    "Siamo Hair Bologna: parrucchieri e coloristi che lavorano insieme da anni. Ti accogliamo in salone per ascoltare i tuoi obiettivi e proporti un look realistico sulla tua texture e sul tuo stile di vita.";
  p.about =
    "Il salone nasce dalla passione per il colore naturale e le pieghe che durano. Crediamo in un servizio trasparente: tempi chiari, preventivo quando serve e follow-up dopo il colore.";
  p.strengths =
    "· Colore e balayage su misura\n· Trattamenti ristrutturanti\n· Taglio donna/uomo e styling evento\n· Consulenza viso e forma taglio";
  p.openingHours = "Lun–Ven 9:00–20:00 · Sab 9:00–19:00 · Dom chiuso (eccezioni su appuntamento)";
  p.contactsNote = "Scrivici dalla scheda salone su Saloni Luxury o passa in salone in zona centro.";
  p.bookingNote = "Prenota online in pochi click: scegli operatore, servizio e fascia oraria.";
  p.bookingCtaLabel = "Prenota ora";
  p.instagramUrl = "https://instagram.com/";
  p.facebookUrl = "";
  return p;
}

export default function DevSeedSalonShowcasePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slug = useMemo(() => (searchParams.get("slug") ?? "hair-bologna").trim().toLowerCase(), [searchParams]);
  const autoGo = searchParams.get("go") === "1";
  const stay = searchParams.get("stay") === "1";

  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const runSeed = useCallback(async () => {
    if (!import.meta.env.DEV) {
      setStatus("error");
      setMessage("Disponibile solo in modalità sviluppo.");
      return;
    }
    setStatus("working");
    setMessage("");
    try {
      const urls = makeDevSalonGalleryDataUrls(slug);
      if (urls.length !== 6) {
        throw new Error("Canvas non disponibile in questo ambiente.");
      }
      writeSalonPersonalPageData(slug, hairBolognaDemoPersonal());

      const prev = (await readSalonShowcaseAsync(slug)) ?? emptySalonShowcase();
      const next = {
        ...prev,
        exploreGalleryImageDataUrls: [
          urls[0]!,
          urls[1]!,
          urls[2]!,
          urls[3]!,
          urls[4]!,
          urls[5]!,
        ] as typeof prev.exploreGalleryImageDataUrls,
      };
      const res = await writeSalonShowcaseAsync(slug, next);
      if (!res.ok) {
        throw new Error(res.error);
      }
      setStatus("done");
      setMessage(`Dati di prova salvati per slug «${slug}» (IndexedDB / localStorage).`);
      if (!stay) {
        navigate(`/s/${encodeURIComponent(slug)}/esplora#gallery`, { replace: true });
      }
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, [navigate, slug, stay]);

  useEffect(() => {
    if (!import.meta.env.DEV || !autoGo || devShowcaseSeedAutoSession) return;
    devShowcaseSeedAutoSession = true;
    void runSeed();
  }, [autoGo, runSeed]);

  if (!import.meta.env.DEV) {
    return (
      <main className="luxury-page-main" style={{ padding: "2rem", color: "#fffbeb" }}>
        <p>Questa pagina è disponibile solo in build di sviluppo.</p>
        <Link to="/">Home</Link>
      </main>
    );
  }

  return (
    <main className="luxury-page-main" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem)", maxWidth: "36rem", color: "#fffbeb" }}>
      <h1 className="luxury-page-title" style={{ marginTop: 0 }}>
        Seed dev — Crea il tuo sito / Esplora
      </h1>
      <p style={{ lineHeight: 1.55, opacity: 0.88 }}>
        Genera <strong>6 immagini JPEG casuali</strong> (canvas) e testi demo per <code style={{ opacity: 0.9 }}>{slug}</code>, come in «Crea il tuo sito»,
        poi apre la pagina pubblica <strong>Esplora</strong> sulla gallery.
      </p>
      <ul style={{ lineHeight: 1.5, opacity: 0.82, paddingLeft: "1.2rem" }}>
        <li>
          Slug: parametro URL <code>?slug=tuo-slug</code> (default <code>hair-bologna</code>).
        </li>
        <li>
          Resta su questa pagina: <code>?stay=1</code> (con <code>go=1</code> se usi avvio automatico).
        </li>
      </ul>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "1.25rem" }}>
        <button type="button" className="luxury-btn luxury-btn--primary" disabled={status === "working"} onClick={() => void runSeed()}>
          {status === "working" ? "Salvataggio…" : "Carica dati di prova"}
        </button>
        <Link className="luxury-btn luxury-btn--secondary" to={`/s/${encodeURIComponent(slug)}/esplora#gallery`}>
          Apri Esplora (gallery)
        </Link>
        <Link className="luxury-btn luxury-btn--secondary" to={`/s/${encodeURIComponent(slug)}/il-tuo-salone`}>
          Apri Il tuo sito
        </Link>
        <Link className="luxury-btn luxury-btn--secondary" to="/account/salone/tuo-salone">
          Editor account
        </Link>
      </div>
      {message ? (
        <p
          className={status === "error" ? "luxury-alert luxury-alert--error" : "luxury-alert luxury-alert--success"}
          style={{ marginTop: "1rem" }}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </main>
  );
}
