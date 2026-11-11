import { initial } from "../Seat.tsx";

/** The prototype's Z.av: a decorative avatar beside a name that is always written out next to it. */
export function PartnerAvatarSm({
  slot,
  name,
  size = "sm",
}: {
  slot: "a" | "b";
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`zm-av zm-av-${slot} zm-av-${size}`} aria-hidden="true">
      {initial(name) || "?"}
    </span>
  );
}
