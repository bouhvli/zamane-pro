import { createFileRoute } from "@tanstack/react-router";
import { TripForm } from "../../../../components/trips/TripForm.tsx";

/** Edit trip (.ux-forge/trips form.js, edit mode). ?focus=dates|budget: arriving from "Add dates" / "Set a budget". */
export const Route = createFileRoute("/_app/trips/$tripId/edit")({
  validateSearch: (s: Record<string, unknown>): { focus?: "dates" | "budget" } => ({
    focus: s.focus === "dates" || s.focus === "budget" ? s.focus : undefined,
  }),
  component: EditTrip,
});

function EditTrip() {
  const { me } = Route.useRouteContext();
  const { tripId } = Route.useParams();
  const { focus } = Route.useSearch();
  return <TripForm mode="edit" tripId={tripId} currency={me.space.currency} focus={focus} />;
}
