import { createLink, type LinkComponent } from "@tanstack/react-router";
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

/**
 * The design system's Button (window.Zamane.Button), typed. The variants map to the shared layer's classes
 * (.btn-primary, .btn-sec, .btn-ghost, .btn-danger). `pending` swaps the label and keeps the button focusable
 * (aria-disabled), like the prototype's A.pending; `disabledReason` is the id of the text that says why
 * (A.disable), and pressing it then announces that reason instead of acting.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-sec",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export function buttonClass(o: { variant?: ButtonVariant; size?: "md" | "sm"; block?: boolean; className?: string }) {
  return [VARIANT[o.variant ?? "secondary"], o.size === "sm" && "btn-sm", o.block && "btn-block", o.className]
    .filter(Boolean)
    .join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
  /** Label shown while a request runs ("Signing in…"). */
  pending?: string | false;
  /** id of the element that says why the button can't be used right now. */
  disabledReason?: string | null;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    block,
    className,
    pending,
    disabledReason,
    children,
    type = "button",
    onClick,
    "aria-describedby": describedBy,
    ...rest
  },
  ref,
) {
  const busy = !!pending;
  const unavailable = busy || !!disabledReason;
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, block, className })}
      {...rest}
      aria-disabled={unavailable || undefined}
      aria-describedby={disabledReason ?? describedBy}
      data-busy={busy || undefined}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        if (unavailable && type !== "submit") {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {busy ? pending : children}
    </button>
  );
});

/** An anchor styled as a Button (a TanStack Router link when created with createLink). */
const ButtonAnchor = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; block?: boolean }
>(function ButtonAnchor({ variant, block, className, ...rest }, ref) {
  return <a ref={ref} className={buttonClass({ variant, block, className })} {...rest} />;
});

export const ButtonLink: LinkComponent<typeof ButtonAnchor> = createLink(ButtonAnchor);
