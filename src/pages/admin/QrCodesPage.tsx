import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCodeStyling from "qr-code-styling";
import agritechIcon from "@/assets/agritech-icon.png";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Search, Download, Printer, MapPin, User as UserIcon, Cpu } from "lucide-react";
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

/**
 * Options du QR stylisé : points arrondis (pas de carrés pointus), coins
 * extra-arrondis, logo AgriTech incrusté au centre. Correction d'erreur H
 * pour que le logo ne gêne pas la lecture.
 */
const qrOptions = (data: string, size: number) => ({
  width: size,
  height: size,
  type: "svg" as const,
  data,
  image: agritechIcon,
  margin: 8,
  qrOptions: { errorCorrectionLevel: "H" as const },
  dotsOptions: { type: "rounded" as const, color: "#166534" },
  cornersSquareOptions: { type: "extra-rounded" as const, color: "#14532d" },
  cornersDotOptions: { type: "dot" as const, color: "#14532d" },
  backgroundOptions: { color: "#ffffff" },
  imageOptions: { crossOrigin: "anonymous", margin: 6, imageSize: 0.32, hideBackgroundDots: true },
});

// Génère le QR stylisé en PNG (blob URL) — même pipeline que l'impression.
// Si le logo empêche la génération, on retente sans logo (mieux que rien).
async function renderQrPng(payload: string, size: number): Promise<string | null> {
  const toUrl = (raw: Blob | Buffer | null) => {
    if (!raw) return null;
    const blob = raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: "image/png" });
    return URL.createObjectURL(blob);
  };
  try {
    return toUrl(await new QRCodeStyling(qrOptions(payload, size)).getRawData("png"));
  } catch (e) {
    console.error("QR avec logo KO, nouvel essai sans logo", e);
    const { image: _image, ...noLogo } = qrOptions(payload, size);
    return toUrl(await new QRCodeStyling(noLogo).getRawData("png"));
  }
}

export default function QrCodesPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<QrEntry | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const lastUrl = useRef<string | null>(null);

  // Génère l'image du QR à chaque sélection (et libère la précédente).
  useEffect(() => {
    let cancelled = false;
    setQrUrl(null);
    if (!selected) return;
    renderQrPng(selected.payload, 480)
      .then((url) => {
        if (cancelled || !url) return;
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = url;
        setQrUrl(url);
      })
      .catch((e) => console.error("QR render error", e));
    return () => { cancelled = true; };
  }, [selected]);

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

  // PNG 512×512 (points arrondis + logo) prêt à imprimer/coller.
  const downloadQr = (entry: QrEntry) => {
    new QRCodeStyling(qrOptions(entry.payload, 512)).download({
      name: `qr-${entry.itemName.replace(/\s+/g, "_")}-res${entry.reservationId}`,
      extension: "png",
    });
  };

  // Ouvre une fenêtre d'impression avec le QR + libellé.
  const printQr = async (entry: QrEntry) => {
    const raw = await new QRCodeStyling(qrOptions(entry.payload, 512)).getRawData("png");
    if (!raw) return;
    const blob = raw instanceof Blob ? raw : new Blob([raw as BlobPart]);
    const url = URL.createObjectURL(blob);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR — ${entry.itemName}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0;height:100vh;font-family:sans-serif">
        <img src="${url}" style="width:340px;height:340px" onload="setTimeout(function(){window.print()},200)" />
        <p style="margin-top:14px;font-size:15px;font-weight:600">${entry.itemName}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#555">Réservation #${entry.reservationId} — ${entry.clientName} — ${entry.surfaceName}</p>
      </body></html>`);
    w.document.close();
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
              <div className="flex items-center justify-center rounded-xl border bg-white p-4" style={{ minHeight: 272 }}>
                {qrUrl ? (
                  <img src={qrUrl} alt="QR code" className="h-60 w-60" />
                ) : (
                  <div className="h-60 w-60 animate-pulse rounded-lg bg-muted" />
                )}
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
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => downloadQr(selected)}>
                  <Download className="h-4 w-4 mr-2" /> Télécharger PNG
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => printQr(selected)}>
                  <Printer className="h-4 w-4 mr-2" /> Imprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
