import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort } from "@/components/ui/sortable-table";
import { Badge } from "@/components/ui/badge";
import { MatPay } from "./types";
import { DT, METHOD_LABEL } from "./utils";

// Traçabilité des paiements d'appareillage (ventes client), calquée sur SubPaysTab.
export default function MatPaysTab({
  sales, profById,
}: {
  sales: MatPay[];
  profById: Record<string, any>;
  isAdmin: boolean;
}) {
  const { sorted, sort } = useTableSort(sales, {
    date: (s) => (s.created_at ? new Date(s.created_at) : null),
    user: (s) => {
      const u = profById[s.profile_id];
      return u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email : s.profile_id;
    },
    amount: (s) => s.amount_dt,
    method: (s) => METHOD_LABEL[s.payment_method] ?? s.payment_method,
    status: (s) => s.status,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Paiements appareillage</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="date" sort={sort}>Date</SortableHead>
              <SortableHead field="user" sort={sort}>Client</SortableHead>
              <SortableHead field="amount" sort={sort}>Montant</SortableHead>
              <SortableHead field="method" sort={sort}>Méthode</SortableHead>
              <SortableHead field="status" sort={sort}>Statut</SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s) => {
              const u = profById[s.profile_id];
              const paid = s.status === "confirme" || s.status === "valide";
              return (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell>{u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email : s.profile_id}</TableCell>
                  <TableCell className="font-semibold">{DT(s.amount_dt)}</TableCell>
                  <TableCell className="text-xs">{METHOD_LABEL[s.payment_method] ?? s.payment_method}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        paid
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
                          : s.status === "refuse"
                          ? "bg-red-500/15 text-red-700 border-red-300"
                          : "bg-orange-500/15 text-orange-700 border-orange-300"
                      }
                    >
                      {paid ? "payé" : s.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Aucun paiement appareillage
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
