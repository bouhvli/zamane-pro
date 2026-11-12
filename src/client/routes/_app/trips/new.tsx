import { createFileRoute } from "@tanstack/react-router";
import { TripForm } from "../../../components/trips/TripForm.tsx";

/** New trip (.ux-forge/trips form.js, create mode). */
export const Route = createFileRoute("/_app/trips/new")({ component: NewTrip });

function NewTrip() {
  const { me } = Route.useRouteContext();
  return <TripForm mode="create" currency={me.space.currency} />;
}
