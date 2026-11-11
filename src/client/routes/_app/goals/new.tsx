import { createFileRoute } from "@tanstack/react-router";
import { GoalForm } from "../../../components/goals/GoalForm.tsx";

/** New goal (.ux-forge/goals form.js, create mode). */
export const Route = createFileRoute("/_app/goals/new")({ component: NewGoal });

function NewGoal() {
  const { me } = Route.useRouteContext();
  return <GoalForm mode="create" currency={me.space.currency} />;
}
