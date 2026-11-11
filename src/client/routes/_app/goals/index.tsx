import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../components/Placeholder.tsx";

/** Goals: built in a later phase. */
export const Route = createFileRoute("/_app/goals/")({
  component: () => <Placeholder name="Goals" route="goals" />,
});
