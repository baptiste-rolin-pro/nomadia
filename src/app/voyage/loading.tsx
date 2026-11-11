import { PlaneLoader } from "@/components/ui/plane-loader";

/** Transition de route : avion de marque, affiché seulement si le rendu serveur dépasse 150 ms. */
export default function Loading() {
  return (
    <div className="container-page flex min-h-[55vh] items-center justify-center py-16">
      <PlaneLoader label="Préparation du carnet de voyage…" />
    </div>
  );
}