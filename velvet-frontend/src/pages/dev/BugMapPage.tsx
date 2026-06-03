import { useMemo, useState } from "react";
import { BUG_AREA_MAP, resolveBugAreasFromText } from "../../data/bugAreaMap";
import "../../styles/velvet-bug-map.css";

function PathList({ paths }: { paths: string[] }) {
  if (paths.length === 0) {
    return <p className="velvet-bug-map__empty">—</p>;
  }
  return (
    <ul className="velvet-bug-map__path-list">
      {paths.map((path) => (
        <li key={path}>
          <code>{path}</code>
        </li>
      ))}
    </ul>
  );
}

function routeExamples(entry: (typeof BUG_AREA_MAP)[number]): string[] {
  return entry.surfaces.filter((surface) => surface.startsWith("/"));
}

export default function BugMapPage() {
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BUG_AREA_MAP;
    const fromResolver = resolveBugAreasFromText(query);
    if (fromResolver.length > 0) return fromResolver;
    return BUG_AREA_MAP.filter((entry) => {
      const haystack = [
        entry.tag,
        entry.label,
        entry.surfaces.join(" "),
        entry.aliases.join(" "),
        entry.example,
        ...entry.frontend,
        ...entry.backend,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1600);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <main className="velvet-bug-map">
      <header className="velvet-bug-map__header">
        <p className="velvet-bug-map__eyebrow">Solo sviluppo</p>
        <h1>Mappa bug Luxury</h1>
        <p className="velvet-bug-map__lead">
          In chat puoi scrivere solo <code>/piani</code>, <code>@piani</code> o{" "}
          <code>@piani c&apos;è un bug, controlla</code>. Se puoi, aggiungi <em>Atteso … / Ottenuto …</em>.
        </p>
        <label className="velvet-bug-map__search">
          <span className="velvet-bug-map__search-label">Prova un segnale reale (route, @tag, parola chiave)</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="/piani · @premium · registrazione · MeSalonController"
            autoComplete="off"
          />
        </label>
        <p className="velvet-bug-map__count">
          {filtered.length} aree
          {query.trim() ? ` per «${query.trim()}»` : ` · ${BUG_AREA_MAP.length} totali`}
        </p>
      </header>

      <div className="velvet-bug-map__grid">
        {filtered.map((entry) => {
          const routes = routeExamples(entry);
          const routeKey = `${entry.tag}:route`;
          const tagKey = `${entry.tag}:tag`;
          const primaryRoute = routes[0] ?? entry.surfaces[0];
          return (
            <article key={entry.tag} className="velvet-bug-map__card">
              <div className="velvet-bug-map__card-head">
                <span className="velvet-bug-map__tag">@{entry.tag}</span>
                <h2>{entry.label}</h2>
              </div>
              <p className="velvet-bug-map__surfaces">
                {entry.surfaces.map((surface) => (
                  <code key={surface}>{surface}</code>
                ))}
              </p>
              {entry.aliases.length > 0 ? (
                <p className="velvet-bug-map__aliases">
                  {entry.aliases.map((alias) => (
                    <span key={alias}>{alias}</span>
                  ))}
                </p>
              ) : null}
              <div className="velvet-bug-map__example-row">
                <code className="velvet-bug-map__example">{entry.example}</code>
                <button type="button" onClick={() => copyText(tagKey, entry.example)}>
                  {copiedKey === tagKey ? "Copiato" : "Copia @tag"}
                </button>
                {primaryRoute.startsWith("/") ? (
                  <button type="button" onClick={() => copyText(routeKey, primaryRoute)}>
                    {copiedKey === routeKey ? "Copiato" : `Copia ${primaryRoute}`}
                  </button>
                ) : null}
              </div>
              <section>
                <h3>Frontend</h3>
                <PathList paths={entry.frontend} />
              </section>
              <section>
                <h3>Backend</h3>
                <PathList paths={entry.backend} />
              </section>
              {entry.tests.length > 0 ? (
                <section>
                  <h3>Test</h3>
                  <PathList paths={entry.tests} />
                </section>
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}
