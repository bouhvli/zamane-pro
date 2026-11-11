import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../components/Placeholder.tsx";

/** New trip: built in a later phase. */
export const Route = createFileRoute("/_app/trips/new")({
  component: () => <Placeholder name="New trip" route="trips/new" />,
});
