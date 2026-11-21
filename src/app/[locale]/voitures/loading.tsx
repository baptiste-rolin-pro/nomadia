import { PlaneLoader } from "@/components/ui/plane-loader";
import { getI18n } from "@/i18n/request";

/** Transition de route : avion de marque, affiché seulement si le rendu serveur dépasse 150 ms. */
export default async function Loading() {
  const { m } = await getI18n();
  return (
    <div className="container-page flex min-h-[55vh] items-center justify-center py-16">
      <PlaneLoader label={m.common.loading.cars} />
    </div>
  );
}
