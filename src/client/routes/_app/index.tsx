import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../components/Placeholder.tsx";

/** Home: built in a later phase. */
export const Route = createFileRoute("/_app/")({
  component: () => <Placeholder name="Home" route="home" />,
});
