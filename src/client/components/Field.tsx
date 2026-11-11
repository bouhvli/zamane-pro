import { useCallback, useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { Icon } from "./Icon.tsx";

/**
 * A labelled input, port of the prototype's A.field: label, the field box, the inline error (.err) and help.
 * - The description order follows A.describe: error, the form alert that names this field, help, extras.
 * - `password` adds the Show/Hide toggle inside the box; its visible label and accessible name change together
 *   (no aria-pressed). Submitting the form turns the field back into a password field so browsers offer to save.
 * - `capsHint` adds "Caps Lock is on" to the description while it's on (never announced per key).
 */
export interface FieldProps {
  id: string;
  label: ReactNode;
  /** Rendered inside the label, after the text (the Create account seat). */
  labelExtra?: ReactNode;
  help?: ReactNode;
  error?: string;
  /** Links after the error text (email-taken). */
  errorExtra?: ReactNode;
  /** role="alert" on the error (server answers that arrive after submit). */
  announce?: boolean;
  /** id of the form alert message that describes this field (wrong password). */
  alertId?: string;
  /** Other description ids, e.g. a note under the field. */
  describedBy?: string[];
  password?: boolean;
  code?: boolean;
  capsHint?: boolean;
  after?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  input: InputHTMLAttributes<HTMLInputElement> & { name: string };
}

function assignRef<T>(ref: Ref<T> | undefined, v: T | null) {
  if (typeof ref === "function") ref(v);
  else if (ref) (ref as { current: T | null }).current = v;
}

export function Field(p: FieldProps) {
  const { id, input } = p;
  const el = useRef<HTMLInputElement | null>(null);
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);

  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      el.current = node;
      assignRef(p.inputRef, node);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the RHF ref is stable per field
    [],
  );

  // Back to type=password on submit, so the browser offers to save it.
  useEffect(() => {
    const form = el.current?.form;
    if (!p.password || !form) return;
    const hide = () => setShown(false);
    form.addEventListener("submit", hide, true);
    return () => form.removeEventListener("submit", hide, true);
  }, [p.password]);

  const errId = `${id}-err`;
  const helpId = `${id}-help`;
  const capsId = `${id}-caps`;
  const described = [
    p.error ? errId : null,
    p.alertId ?? null,
    p.help ? helpId : null,
    p.capsHint && caps ? capsId : null,
    ...(p.describedBy ?? []),
  ].filter(Boolean);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (p.capsHint && e.getModifierState) {
      const on = e.getModifierState("CapsLock");
      if (on !== caps) setCaps(on);
    }
  };

  function toggle() {
    const i = el.current;
    const s = i?.selectionStart ?? null;
    const e = i?.selectionEnd ?? null;
    setShown((v) => !v);
    requestAnimationFrame(() => {
      try {
        if (i && s !== null && e !== null) i.setSelectionRange(s, e);
      } catch {
        /* type=email has no selection API */
      }
    });
  }

  const type = p.password ? (shown ? "text" : "password") : (input.type ?? "text");

  return (
    <div className={`fgroup${p.code ? " fgroup--code" : ""}`} data-for={id}>
      <label className="field-label" htmlFor={id}>
        {p.label}
        {p.labelExtra}
      </label>
      <div
        className={`field${p.password ? " field-pw" : ""}${p.code ? " field-code" : ""}${p.error ? " is-invalid" : ""}`}
      >
        <input
          {...input}
          id={id}
          ref={setRef}
          type={type}
          aria-invalid={p.error ? true : undefined}
          aria-describedby={described.length ? described.join(" ") : undefined}
          onKeyDown={(e) => {
            onKey(e);
            input.onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            onKey(e);
            input.onKeyUp?.(e);
          }}
          onBlur={(e) => {
            if (caps) setCaps(false);
            input.onBlur?.(e);
          }}
        />
        {p.password && (
          <button
            className="pw-toggle"
            type="button"
            aria-controls={id}
            aria-label={shown ? "Hide password" : "Show password"}
            onClick={toggle}
          >
            {shown ? "Hide" : "Show"}
          </button>
        )}
      </div>
      <p className="err" id={errId} hidden={!p.error} role={p.error && p.announce ? "alert" : undefined}>
        {p.error && (
          <>
            <Icon name="alert" />
            <span>
              {p.error}
              {p.errorExtra ? <> {p.errorExtra}</> : null}
            </span>
          </>
        )}
      </p>
      {p.help && (
        <p className="help" id={helpId}>
          {p.help}
        </p>
      )}
      {p.capsHint && (
        <p className="help caps" id={capsId} hidden={!caps}>
          Caps Lock is on
        </p>
      )}
      {p.after}
    </div>
  );
}
