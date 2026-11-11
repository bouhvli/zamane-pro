import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../../components/Placeholder.tsx";

/** Edit trip: built in a later phase. */
export const Route = createFileRoute("/_app/trips/$tripId/edit")({
  component: () => <Placeholder name="Edit trip" route="trips/edit" />,
});
