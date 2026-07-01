import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Les 24 gouvernorats de Tunisie + centroïdes approximatifs (lat, lng).
export const TN_GOVERNORATES: { name: string; lat: number; lng: number }[] = [
  { name: "Tunis", lat: 36.806, lng: 10.181 },
  { name: "Ariana", lat: 36.86, lng: 10.16 },
  { name: "Ben Arous", lat: 36.72, lng: 10.28 },
  { name: "Manouba", lat: 36.81, lng: 9.98 },
  { name: "Nabeul", lat: 36.45, lng: 10.68 },
  { name: "Zaghouan", lat: 36.4, lng: 10.14 },
  { name: "Bizerte", lat: 37.16, lng: 9.78 },
  { name: "Béja", lat: 36.68, lng: 9.06 },
  { name: "Jendouba", lat: 36.5, lng: 8.68 },
  { name: "Le Kef", lat: 36.1, lng: 8.66 },
  { name: "Siliana", lat: 36.05, lng: 9.36 },
  { name: "Kairouan", lat: 35.65, lng: 9.95 },
  { name: "Kasserine", lat: 35.1, lng: 8.75 },
  { name: "Sidi Bouzid", lat: 35.0, lng: 9.5 },
  { name: "Sousse", lat: 35.82, lng: 10.5 },
  { name: "Monastir", lat: 35.7, lng: 10.85 },
  { name: "Mahdia", lat: 35.35, lng: 11.0 },
  { name: "Sfax", lat: 34.74, lng: 10.6 },
  { name: "Gafsa", lat: 34.42, lng: 8.78 },
  { name: "Tozeur", lat: 33.92, lng: 8.13 },
  { name: "Kébili", lat: 33.55, lng: 9.0 },
  { name: "Gabès", lat: 33.88, lng: 10.05 },
  { name: "Médenine", lat: 33.35, lng: 10.5 },
  { name: "Tataouine", lat: 32.7, lng: 10.3 },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Déduit le gouvernorat à partir d'une chaîne de localisation libre (ex. "El Amra,Sfax,Tunisie"). */
export function governorateFromLocalisation(loc?: string | null): string | null {
  if (!loc) return null;
  const l = norm(loc);
  const found = TN_GOVERNORATES.find((g) => l.includes(norm(g.name)));
  return found?.name ?? null;
}

export default function TunisiaGovMap({
  counts, selected, onSelect, height = 340,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (gov: string | null) => void;
  height?: number;
}) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border">
      <MapContainer
        center={[34.6, 9.6]}
        zoom={6}
        minZoom={5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {TN_GOVERNORATES.map((g) => {
          const c = counts[g.name] ?? 0;
          const isSel = selected === g.name;
          const radius = c > 0 ? 6 + (c / max) * 16 : 4;
          return (
            <CircleMarker
              key={g.name}
              center={[g.lat, g.lng]}
              radius={radius}
              pathOptions={{
                color: isSel ? "#0f5132" : "#1f7a42",
                weight: isSel ? 3 : 1,
                fillColor: "#2ea15f",
                fillOpacity: selected && !isSel ? 0.2 : 0.65,
              }}
              eventHandlers={{ click: () => onSelect(isSel ? null : g.name) }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <span className="text-xs font-medium">{g.name}</span>
                <span className="text-xs text-muted-foreground"> — {c}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
