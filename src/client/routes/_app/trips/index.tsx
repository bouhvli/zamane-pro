import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../components/Placeholder.tsx";

/** Trips: built in a later phase. */
export const Route = createFileRoute("/_app/trips/")({
  component: () => <Placeholder name="Trips" route="trips" />,
});
