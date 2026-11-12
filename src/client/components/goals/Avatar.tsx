import type { AvatarSlot } from "../../lib/people.ts";
import { initial } from "../Seat.tsx";

/** The prototype's Z.av: a decorative avatar beside a name that is always written out next to it. */
export function PartnerAvatarSm({
  slot,
  name,
  size = "sm",
}: {
  slot: AvatarSlot;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`zm-av zm-av-${slot} zm-av-${size}`} aria-hidden="true">
      {slot === "former" ? "?" : initial(name) || "?"}
    </span>
  );
}
