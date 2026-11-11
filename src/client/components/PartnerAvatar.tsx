import { initial } from "./Seat.tsx";

/** The design system's PartnerAvatar (window.Zamane.PartnerAvatar), typed. Partner colours appear on avatars only. */
export function PartnerAvatar({
  name,
  partner,
  size = "md",
}: {
  name: string;
  partner: "a" | "b";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`zm-av zm-av-${partner} zm-av-${size}`} title={name} aria-label={name} role="img">
      {initial(name) || "?"}
    </span>
  );
}

export function AvatarPair({ a, b, size }: { a: string; b: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className="zm-pair">
      <PartnerAvatar name={a} partner="a" size={size} />
      <PartnerAvatar name={b} partner="b" size={size} />
    </span>
  );
}
