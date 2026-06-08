import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/token";
import { getAdminUsersApi } from "@/services/auth-api";
import { getProfiles } from "@/services/data-service";
import { API_BASE_URL } from "@/services/api-config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Handshake, User as UserIcon, CheckCircle, Clock, Mail, Phone, UserPlus, Search, X } from "lucide-react";
import type { Profile } from "@/types/models";

export default function PartenaireDetailsPage() {
  const { partenaireId } = useParams<{ partenaireId: string }>();
  const navigate = useNavigate();
  const token = getToken() ?? "";
  const qc = useQueryClient();

  const [assignOpen, setAssignOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const { data: adminData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsersApi(token),
    enabled: !!token,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });

  const partenaire = adminData?.users.find((u) => u.id === partenaireId);
  const partenaireProfile = profiles.find(
    (p) => p.user_id === partenaireId || p.email?.toLowerCase() === partenaire?.email?.toLowerCase()
  );

  const clients = partenaireProfile
    ? profiles.filter((p) => p.user_role === "CLIENT" && String(p.created_by) === String(partenaireProfile.id))
    : [];

  // Clients sans partenaire (created_by null) disponibles à assigner
  const unassigned = profiles.filter(
    (p) => p.user_role === "CLIENT" && !p.created_by
  );

  const filteredUnassigned = unassigned.filter((p) =>
    `${p.first_name} ${p.last_name} ${p.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const assignMut = useMutation({
    mutationFn: async (profileIds: string[]) => {
      await Promise.all(
        profileIds.map((id) =>
          fetch(`${API_BASE_URL}/api/agri/profiles/${id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ created_by: Number(partenaireProfile!.id) }),
          })
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: `${selected.length} client(s) assigné(s)` });
      setAssignOpen(false);
      setSelected([]);
      setSearch("");
    },
    onError: () => toast({ title: "Erreur lors de l'assignation", variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: async (profileId: string) => {
      await fetch(`${API_BASE_URL}/api/agri/profiles/${profileId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ created_by: null }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Client retiré du partenaire" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  if (!partenaire) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Partenaire introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" />Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" />Retour aux utilisateurs
        </Button>
      </div>

      {/* Partenaire info card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Handshake className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {partenaire.firstName || partenaire.lastName
                  ? `${partenaire.firstName ?? ""} ${partenaire.lastName ?? ""}`.trim()
                  : partenaire.email}
              </CardTitle>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 mt-1">
                <Handshake className="h-3 w-3 mr-1" />Partenaire
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" /><span>{partenaire.email}</span>
            </div>
            {partenaire.phoneNumber && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" /><span>{partenaire.phoneNumber}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              {partenaire.emailVerified ? (
                <><CheckCircle className="h-4 w-4 text-emerald-600" /><span className="text-emerald-600">Email vérifié</span></>
              ) : (
                <><Clock className="h-4 w-4 text-amber-500" /><span className="text-amber-500">Email non vérifié</span></>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Inscrit le{" "}
            {partenaire.createdAt
              ? new Date(partenaire.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
              : "—"}
          </div>
        </CardContent>
      </Card>

      {/* Clients table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            Clients de ce partenaire{" "}
            <span className="text-muted-foreground font-normal text-sm">({clients.length})</span>
          </h3>
          {partenaireProfile && (
            <Button size="sm" onClick={() => setAssignOpen(true)} disabled={unassigned.length === 0}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assigner des clients{unassigned.length > 0 && ` (${unassigned.length} disponibles)`}
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Ce partenaire n'a pas encore de clients.
                    </TableCell>
                  </TableRow>
                )}
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.email}</TableCell>
                    <TableCell>{c.first_name || "—"}</TableCell>
                    <TableCell>{c.last_name || "—"}</TableCell>
                    <TableCell className="text-sm">{c.phone_number || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary"><UserIcon className="h-3 w-3 mr-1" />Client</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeMut.mutate(c.id)}
                        title="Retirer ce client"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={(o) => { setAssignOpen(o); if (!o) { setSelected([]); setSearch(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assigner des clients à ce partenaire</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Clients sans partenaire ({unassigned.length} disponibles)
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
            {filteredUnassigned.length === 0 && (
              <p className="text-center text-muted-foreground py-6 text-sm">Aucun client disponible.</p>
            )}
            {filteredUnassigned.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleSelect(p.id)}
              >
                <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-muted-foreground">
              {selected.length} sélectionné(s)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setAssignOpen(false); setSelected([]); setSearch(""); }}>
                Annuler
              </Button>
              <Button
                disabled={selected.length === 0 || assignMut.isPending}
                onClick={() => assignMut.mutate(selected)}
              >
                {assignMut.isPending ? "Assignation..." : "Assigner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
