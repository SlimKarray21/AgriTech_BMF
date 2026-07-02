import { useState } from "react";
import geo from "@/assets/tunisia-adm1.json";

type Feature = { properties: { shapeName: string }; geometry: { type: string; coordinates: any } };
const FEATURES = (geo as any).features as Feature[];

/** Noms canoniques des 24 gouvernorats (depuis le GeoJSON). */
export const TN_GOVERNORATES: string[] = FEATURES.map((f) => f.properties.shapeName);

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Déduit le gouvernorat depuis une localisation libre (ex. "El Amra,Sfax,Tunisie"). */
export function governorateFromLocalisation(loc?: string | null): string | null {
  if (!loc) return null;
  // « Tunisie » contient « Tunis » : on retire le pays avant de comparer,
  // sinon toutes les parcelles matchaient le gouvernorat de Tunis.
  const l = norm(loc).replace(/tunisie|tunisia/g, " ");
  // On garde la correspondance la plus longue (la plus spécifique).
  let best: string | null = null;
  let bestLen = 0;
  for (const f of FEATURES) {
    const n = norm(f.properties.shapeName);
    const hit = l.includes(n) || (n.includes("kef") && l.includes("kef"));
    if (hit && n.length > bestLen) {
      best = f.properties.shapeName;
      bestLen = n.length;
    }
  }
  return best;
}

// ── Projection lng/lat → x/y (équirectangulaire corrigée par la latitude) ──
function ringsOf(geom: { type: string; coordinates: any }): number[][][] {
  if (geom.type === "Polygon") return geom.coordinates;
  if (geom.type === "MultiPolygon") return geom.coordinates.flat();
  return [];
}

let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
FEATURES.forEach((f) => ringsOf(f.geometry).forEach((r) => r.forEach((pt: number[]) => {
  const [lng, lat] = pt;
  if (lng < minLng) minLng = lng;
  if (lng > maxLng) maxLng = lng;
  if (lat < minLat) minLat = lat;
  if (lat > maxLat) maxLat = lat;
})));
const KX = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
const SC = 1000;
const VBW = (maxLng - minLng) * KX * SC;
const VBH = (maxLat - minLat) * SC;
const project = (pt: number[]) => [ (pt[0] - minLng) * KX * SC, (maxLat - pt[1]) * SC ];

// Chemins SVG pré-calculés (une fois).
const PATHS: { name: string; d: string }[] = FEATURES.map((f) => {
  const d = ringsOf(f.geometry)
    .map((ring) => "M" + ring.map((pt) => { const [x, y] = project(pt); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join("L") + "Z")
    .join(" ");
  return { name: f.properties.shapeName, d };
});

// Vert clair → vert foncé selon l'intensité (0..1).
function greenScale(t: number): string {
  const light = 82 - Math.round(t * 46); // 82% (faible) → 36% (fort)
  return `hsl(150, 55%, ${light}%)`;
}

const HOVER_FILL = "#2fbf82";     // survol : vert plus vif
const SELECTED_FILL = "#008a5c";  // sélection : vert de référence (comme l'image)

export default function TunisiaGovMap({
  counts, selected, onSelect, height = 340,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (gov: string | null) => void;
  height?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const values = Object.values(counts);
  const max = Math.max(1, ...(values.length ? values : [1]));
  const active = hover ?? selected;
  const activeCount = active ? (counts[active] ?? 0) : 0;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        style={{ background: "transparent" }}
      >
        {PATHS.map((p) => {
          const c = counts[p.name] ?? 0;
          const isSel = selected === p.name;
          const isHover = hover === p.name;
          const fill = isSel ? SELECTED_FILL : isHover ? HOVER_FILL : greenScale(c / max);
          return (
            <path
              key={p.name}
              d={p.d}
              fill={fill}
              stroke={isSel ? "#0f5132" : "#ffffff"}
              strokeWidth={isSel ? 2.5 : 1}
              style={{ cursor: "pointer", transition: "fill .12s ease" }}
              onClick={() => onSelect(isSel ? null : p.name)}
              onMouseEnter={() => setHover(p.name)}
              onMouseLeave={() => setHover((h) => (h === p.name ? null : h))}
            >
              <title>{p.name} — {c} parcelle(s)</title>
            </path>
          );
        })}
      </svg>

      {/* Étiquette du gouvernorat survolé / sélectionné */}
      {active && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border bg-background/90 px-2.5 py-1 text-xs shadow-sm backdrop-blur">
          <span className="font-semibold text-foreground">{active}</span>
          <span className="text-muted-foreground"> — {activeCount} parcelle(s)</span>
        </div>
      )}
    </div>
  );
}
