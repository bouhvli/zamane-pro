import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../components/Placeholder.tsx";

/** Shopping: built in a later phase. */
export const Route = createFileRoute("/_app/shopping")({
  component: () => <Placeholder name="Shopping" route="shopping" />,
});
