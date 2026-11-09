import "server-only";
import { getViewer } from "@/lib/viewer";
import { listAnonymousTrips, listTripsForUser } from "@/lib/planner/service";

/** Voyages modifiables par le visiteur courant (compte ou brouillons anonymes de cet appareil). */
export async function tripsForCurrentViewer(): Promise<{ id: string; title: string }[]> {
  const viewer = await getViewer();
  const rows = viewer.user ? await listTripsForUser(viewer.user.id) : viewer.anonHash ? await listAnonymousTrips(viewer.anonHash) : [];
  return rows.map((t) => ({ id: t.id, title: t.title }));
}
