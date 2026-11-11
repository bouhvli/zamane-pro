import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../../components/Placeholder.tsx";

/** Edit goal: built in a later phase. */
export const Route = createFileRoute("/_app/goals/$goalId/edit")({
  component: () => <Placeholder name="Edit goal" route="goals/edit" />,
});
