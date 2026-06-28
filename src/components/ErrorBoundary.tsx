import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Capture les erreurs de rendu d'une page pour éviter l'écran blanc total
 * (sans error boundary, la moindre erreur — souvent une donnée encore
 * `undefined` pendant le chargement — démonte tout l'arbre React).
 *
 * On l'utilise avec `key={location.pathname}` autour de l'<Outlet> : à chaque
 * changement de page le boundary est remonté, donc une erreur sur une page ne
 * « colle » pas sur les suivantes et la navigation suffit à récupérer.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Garde une trace en console pour le debug.
    console.error("[ErrorBoundary] erreur de rendu capturée :", error, info);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Une erreur est survenue</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Cette page n'a pas pu s'afficher correctement. Réessaie — si le
              problème persiste, recharge la page.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={this.reset}>Réessayer</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recharger la page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
