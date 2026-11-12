import { createFileRoute } from "@tanstack/react-router";
import { ShoppingList, type ShoppingSearch } from "../../components/shopping/ShoppingList.tsx";

/**
 * Shopping (.ux-forge/shopping): the shared list. The floating "Add item" button opens the new-item form at
 * `?item=new`, `?item=<id>` is the edit form. The item sheet has no URL: it has one history entry, so Back closes it.
 */
const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined);

export const Route = createFileRoute("/_app/shopping")({
  validateSearch: (s: Record<string, unknown>): ShoppingSearch => {
    const item = str(s.item);
    return { item, name: item === "new" ? str(s.name) : undefined };
  },
  component: Shopping,
});

function Shopping() {
  const search = Route.useSearch();
  return <ShoppingList search={search} />;
}
