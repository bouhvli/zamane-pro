import { createFileRoute } from "@tanstack/react-router";
import { GoalForm } from "../../../../components/goals/GoalForm.tsx";

/** Edit goal (.ux-forge/goals form.js, edit mode). */
export const Route = createFileRoute("/_app/goals/$goalId/edit")({ component: EditGoal });

function EditGoal() {
  const { me } = Route.useRouteContext();
  const { goalId } = Route.useParams();
  return <GoalForm mode="edit" goalId={goalId} currency={me.space.currency} />;
}
