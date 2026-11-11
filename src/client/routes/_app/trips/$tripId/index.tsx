import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../../components/Placeholder.tsx";

/** Trip: built in a later phase. */
export const Route = createFileRoute("/_app/trips/$tripId/")({
  component: () => <Placeholder name="Trip" route="trips/detail" />,
});
