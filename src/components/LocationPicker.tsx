import { useState, useEffect, lazy, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { MapPin, Search, Loader2 } from "lucide-react";

const LazyMap = lazy(() => import("@/components/LeafletMap"));

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function LocationPicker({ value, onChange, placeholder = "Localisation" }: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<[number, number]>([36.8, 10.18]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addressLabel, setAddressLabel] = useState(value);

  useEffect(() => {
    setAddressLabel(value);
  }, [value]);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`);
      const data = await res.json();
      const label = data.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAddressLabel(label);
      onChange(label);
    } catch {
      const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAddressLabel(label);
      onChange(label);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&accept-language=fr`);
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition([lat, lng]);
        handleLocationSelect(lat, lng);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input value={addressLabel} onChange={(e) => { setAddressLabel(e.target.value); onChange(e.target.value); }} placeholder={placeholder} className="flex-1" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon">
              <MapPin className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Choisir la localisation</DialogTitle>
              <DialogDescription>Cliquez sur la carte ou recherchez un lieu pour sélectionner la localisation.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Rechercher un lieu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button type="button" variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-[400px] rounded-lg overflow-hidden border">
              {open && (
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                  <LazyMap position={position} onLocationSelect={handleLocationSelect} />
                </Suspense>
              )}
            </div>
            <div className="flex justify-end mt-2">
              <Button onClick={() => setOpen(false)}>Confirmer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
