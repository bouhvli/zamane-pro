import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../../components/Placeholder.tsx";

/** Goal: built in a later phase. */
export const Route = createFileRoute("/_app/goals/$goalId/")({
  component: () => <Placeholder name="Goal" route="goals/detail" />,
});
