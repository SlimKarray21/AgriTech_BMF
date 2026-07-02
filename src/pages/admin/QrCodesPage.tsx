import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Search, Download, MapPin, User as UserIcon, Cpu } from "lucide-react";
import {
  getProfiles,
  getSurfaces,
  getStockItems,
  getMaterialReservations,
  getReservationItems,
} from "@/services/data-service";

/**
 * Page « QR Codes » — liste les appareils réservés pour une parcelle dont le
 * matériel nécessite un QR code d'appairage (coche « Nécessite un QR code »
 * dans le Stock, ex. carte ESP32).
 *
 * Le QR encode l'identité de l'affectation (réservation + appareil + parcelle
 * + client). À terme, un seul scan depuis l'app mobile connectera directement
 * l'application avec l'appareil.
 */

// Toute réservation active compte (non connectée, en attente, connectée) ;
// on exclut seulement les réservations abandonnées.
const EXCLUDED_STATUSES = new Set(["annule", "refuse"]);

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  nouvelle_demande: { label: "Non connectée", cls: "bg-orange-500/15 text-orange-700 border-orange-300" },
  reserve: { label: "En attente", cls: "bg-blue-500/15 text-blue-700 border-blue-300" },
  confirme: { label: "En attente", cls: "bg-blue-500/15 text-blue-700 border-blue-300" },
  installe: { label: "Connectée", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
};

type QrEntry = {
  key: string;
  reservationId: string;
  status: string;
  itemName: string;
  quantity: number;
  clientName: string;
  clientEmail: string;
  surfaceName: string;
  payload: string;
};

export default function QrCodesPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<QrEntry | null>(null);

  const { data: reservations = [] } = useQuery<any[]>({ queryKey: ["reservations-all"], queryFn: getMaterialReservations, refetchInterval: 10000 });
  const { data: resItems = [] } = useQuery<any[]>({ queryKey: ["reservation-items-all"], queryFn: getReservationItems, refetchInterval: 10000 });
  const { data: stockItems = [] } = useQuery<any[]>({ queryKey: ["stock-items-all"], queryFn: getStockItems, refetchInterval: 10000 });
  const { data: profiles = [] } = useQuery<any[]>({ queryKey: ["profiles-all"], queryFn: getProfiles });
  const { data: surfaces = [] } = useQuery<any[]>({ queryKey: ["surfaces-all"], queryFn: getSurfaces });

  const entries: QrEntry[] = useMemo(() => {
    const stockById = Object.fromEntries(stockItems.map((s) => [String(s.id), s]));
    const resById = Object.fromEntries(reservations.map((r) => [String(r.id), r]));
    const profById = Object.fromEntries(profiles.map((p) => [String(p.id), p]));
    const surfById = Object.fromEntries(surfaces.map((s: any) => [String(s.id), s]));

    return resItems.flatMap((ri) => {
      const stock = stockById[String(ri.stock_item_id)];
      const res = resById[String(ri.reservation_id)];
      if (!stock?.requires_qr || !res || EXCLUDED_STATUSES.has(res.status)) return [];

      const prof = res.profile_id != null ? profById[String(res.profile_id)] : null;
      const surf = res.surface_id != null ? surfById[String(res.surface_id)] : null;
      const payload = JSON.stringify({
        v: 1,
        type: "agritech_device",
        reservation_id: Number(ri.reservation_id),
        reservation_item_id: Number(ri.id),
        stock_item_id: Number(ri.stock_item_id),
        item_name: stock.name,
        surface_id: res.surface_id != null ? Number(res.surface_id) : null,
        profile_id: res.profile_id != null ? Number(res.profile_id) : null,
      });

      return [{
        key: String(ri.id),
        reservationId: String(ri.reservation_id),
        status: res.status,
        itemName: stock.name,
        quantity: Number(ri.quantity ?? 1),
        clientName: prof ? `${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim() : "—",
        clientEmail: prof?.email ?? "",
        surfaceName: surf?.nom_surface ?? "—",
        payload,
      }];
    });
  }, [resItems, stockItems, reservations, profiles, surfaces]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.itemName, e.clientName, e.clientEmail, e.surfaceName].some((v) => v.toLowerCase().includes(q)),
    );
  }, [entries, search]);

  // Télécharge le QR affiché dans la fiche (SVG → PNG via canvas).
  const downloadQr = (entry: QrEntry) => {
    const svg = document.getElementById(`qr-svg-${entry.key}`);
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 16, 16, 480, 480);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `qr-${entry.itemName.replace(/\s+/g, "_")}-res${entry.reservationId}.png`;
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" /> QR Codes matériel
          </h2>
          <p className="text-sm text-muted-foreground">
            Appareils réservés nécessitant un QR code d'appairage (ex. carte ESP32)
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Rechercher appareil, client, parcelle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Appareil</TableHead>
                <TableHead>Qté</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Parcelle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-36">QR Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.key}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-violet-600" /> {e.itemName}
                    </div>
                  </TableCell>
                  <TableCell>{e.quantity}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <div>{e.clientName}</div>
                        {e.clientEmail && <div className="text-xs text-muted-foreground">{e.clientEmail}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {e.surfaceName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_BADGE[e.status]?.cls ?? ""}>
                      {STATUS_BADGE[e.status]?.label ?? e.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelected(e)}>
                      <QrCode className="h-4 w-4 mr-1" /> Afficher
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    <QrCode className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Aucun appareil réservé nécessitant un QR code.
                    <div className="text-xs mt-1">
                      Cochez « Nécessite un QR code » sur le matériel concerné dans le Stock,
                      puis réservez-le pour une parcelle.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> {selected?.itemName}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex justify-center rounded-xl border bg-white p-6">
                <QRCode id={`qr-svg-${selected.key}`} value={selected.payload} size={220} />
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  {selected.clientName} {selected.clientEmail && <span className="text-muted-foreground">({selected.clientEmail})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Parcelle : {selected.surfaceName}
                </div>
                <div className="text-xs text-muted-foreground">
                  Réservation #{selected.reservationId} — scanner ce code depuis l'app mobile
                  pour connecter l'appareil.
                </div>
              </div>
              <Button className="w-full" onClick={() => downloadQr(selected)}>
                <Download className="h-4 w-4 mr-2" /> Télécharger PNG
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
