import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Droplets, FlaskConical } from "lucide-react";

export default function RapportsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{t("nav.rapports")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-blue-300"
          onClick={() => navigate("/admin/rapport-eau")}
        >
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Droplets className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{t("rapports.waterReport")}</h3>
            <p className="text-sm text-muted-foreground">{t("rapports.waterDesc")}</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-emerald-300"
          onClick={() => navigate("/admin/rapport-sol")}
        >
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <FlaskConical className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{t("rapports.soilReport")}</h3>
            <p className="text-sm text-muted-foreground">{t("rapports.soilDesc")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
