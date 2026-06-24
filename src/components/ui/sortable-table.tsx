import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";

export type SortDir = "asc" | "desc";

/** Valeur extraite d'une ligne pour le tri d'une colonne. */
type SortValue = string | number | Date | null | undefined;

/** Accesseurs : clé de colonne → fonction qui extrait la valeur triable de la ligne. */
export type SortAccessors<T> = Record<string, (row: T) => SortValue>;

export interface SortState {
  /** Clé de la colonne actuellement triée (null = aucun tri). */
  activeKey: string | null;
  /** Sens du tri actif. */
  direction: SortDir | null;
  /** Bascule le tri sur une colonne : asc → desc → aucun. */
  toggle: (key: string) => void;
}

/**
 * Tri générique et réutilisable pour les tables.
 *
 * Usage :
 *   const { sorted, sort } = useTableSort(rows, {
 *     name: (r) => r.name,
 *     date: (r) => r.createdAt ? new Date(r.createdAt) : null,
 *   });
 *   ...<SortableHead field="name" sort={sort}>Nom</SortableHead>
 *   ...{sorted.map(...)}
 *
 * Clic sur l'en-tête : ascendant → descendant → non trié (ordre d'origine).
 */
export function useTableSort<T>(
  rows: T[],
  accessors: SortAccessors<T>,
  initial?: { key: string; dir: SortDir },
): { sorted: T[]; sort: SortState } {
  const [state, setState] = React.useState<{ key: string; dir: SortDir } | null>(
    initial ?? null,
  );

  const toggle = React.useCallback((key: string) => {
    setState((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  const sorted = React.useMemo(() => {
    if (!state) return rows;
    const accessor = accessors[state.key];
    if (!accessor) return rows;
    const factor = state.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // valeurs vides toujours en dernier
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * factor;
      }
      if (va instanceof Date && vb instanceof Date) {
        return (va.getTime() - vb.getTime()) * factor;
      }
      return (
        String(va).localeCompare(String(vb), "fr", {
          numeric: true,
          sensitivity: "base",
        }) * factor
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, state]);

  return {
    sorted,
    sort: { activeKey: state?.key ?? null, direction: state?.dir ?? null, toggle },
  };
}

export interface SortableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Clé de colonne, doit correspondre à une clé des accesseurs. */
  field: string;
  /** État de tri renvoyé par useTableSort. */
  sort: SortState;
}

/**
 * En-tête de colonne cliquable affichant l'indicateur de tri (▲/▼).
 * Remplace `<TableHead>` pour les colonnes triables.
 */
export const SortableHead = React.forwardRef<
  HTMLTableCellElement,
  SortableHeadProps
>(({ field, sort, className, children, ...props }, ref) => {
  const active = sort.activeKey === field;
  return (
    <TableHead
      ref={ref}
      onClick={() => sort.toggle(field)}
      aria-sort={
        active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(
        "cursor-pointer select-none transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active ? (
          sort.direction === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
        )}
      </span>
    </TableHead>
  );
});
SortableHead.displayName = "SortableHead";
