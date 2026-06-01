import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/data/countries";
import { useLanguage } from "@/contexts/LanguageContext";

interface LocationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const { t } = useLanguage();

  // Parse existing value "Pays,Gouvernorat,Ville" or "Pays,Gouvernorat,Ville,Village"
  const parts = value ? value.split(",").map((s) => s.trim()) : [];
  const [selectedCountry, setSelectedCountry] = useState(parts[0] || "");
  const [selectedGov, setSelectedGov] = useState(parts[1] || "");
  const [selectedCity, setSelectedCity] = useState(parts[2] || "");
  const [village, setVillage] = useState(parts[3] || "");

  const country = useMemo(() => countries.find((c) => c.name === selectedCountry), [selectedCountry]);
  const governorate = useMemo(() => country?.governorates.find((g) => g.name === selectedGov), [country, selectedGov]);

  // Build the final value whenever any field changes
  useEffect(() => {
    if (!selectedCountry) { onChange(""); return; }
    const parts = [selectedCountry, selectedGov, selectedCity].filter(Boolean);
    if (village.trim()) parts.push(village.trim());
    onChange(parts.join(","));
  }, [selectedCountry, selectedGov, selectedCity, village]);

  const handleCountryChange = (v: string) => {
    setSelectedCountry(v);
    setSelectedGov("");
    setSelectedCity("");
    setVillage("");
  };

  const handleGovChange = (v: string) => {
    setSelectedGov(v);
    setSelectedCity("");
    setVillage("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <Label>{t("location.country")}</Label>
        <Select value={selectedCountry} onValueChange={handleCountryChange}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("location.governorate")}</Label>
        <Select value={selectedGov} onValueChange={handleGovChange} disabled={!country}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {country?.governorates.map((g) => (
              <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("location.city")}</Label>
        <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!governorate}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {governorate?.cities.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("location.village")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></Label>
        <Input value={village} onChange={(e) => setVillage(e.target.value)} placeholder={t("location.villagePlaceholder")} />
      </div>
    </div>
  );
}
