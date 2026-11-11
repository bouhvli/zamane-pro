import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../components/Placeholder.tsx";

/** New goal: built in a later phase. */
export const Route = createFileRoute("/_app/goals/new")({
  component: () => <Placeholder name="New goal" route="goals/new" />,
});
