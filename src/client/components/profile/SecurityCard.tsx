import { useEffect, useRef, useState } from "react";
import { changePasswordSchema } from "../../../shared/schemas/auth.ts";
import { api, isApiError } from "../../lib/api.ts";
import { say } from "../../lib/announce.ts";
import { useAuthForm } from "../../lib/use-auth-form.ts";
import { Button } from "../Button.tsx";
import { Field } from "../Field.tsx";
import { FormAlert, Notice } from "../Notice.tsx";
import { CardHead } from "./Zellige.tsx";

export function SecurityCard() {
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const focusAfter = useRef<"form" | "button" | null>(null);
  const f = useAuthForm({
    formId: "pf-pw",
    schema: changePasswordSchema,
    defaultValues: { currentPassword: "", newPassword: "" },
    offlineText: "Changing your password needs a connection.",
    onlineText: "Back online.",
  });
  const cur = f.field("currentPassword");
  const next = f.field("newPassword");
  function close() {
    focusAfter.current = "button";
    setOpen(false);
  }
  function show() {
    if (!f.online) {
      say("Changing your password needs a connection.");
      return;
    }
    setDone(false);
    focusAfter.current = "form";
    setOpen(true);
  }
  // Focus follows the disclosure: into the first field when it opens, back to the button when it closes.
  useEffect(() => {
    const target = focusAfter.current;
    focusAfter.current = null;
    if (target === "form") document.getElementById("pf-current")?.focus();
    else if (target === "button") toggle.current?.focus();
  }, [open]);
  const onSubmit = f.onSubmit(async (v) => {
    setDone(false);
    f.setPending("Saving…");
    try {
      await api("/api/auth/change-password", {
        body: { currentPassword: v.currentPassword, newPassword: v.newPassword },
      });
      f.form.reset({ currentPassword: "", newPassword: "" });
      setDone(true);
      close();
      say("Password changed. You've been signed out on your other devices.");
    } catch (e) {
      if (isApiError(e, "validation_failed")) {
        for (const [k, m] of Object.entries(e.fields)) {
          if (k === "currentPassword") f.serverError("currentPassword", m);
          if (k === "newPassword" || k === "password") f.serverError("newPassword", m);
        }
      } else f.fail(e);
    } finally {
      f.setPending(false);
    }
  });
  return (
    <section className="pf-card" aria-labelledby="pf-pw-h">
      <CardHead id="pf-pw-h">Security</CardHead>
      <Notice id="pf-pw-offline" icon="wifi-off" hidden={f.online}>
        Changing your password needs a connection.
      </Notice>
      {done && (
        <Notice id="pf-pw-done" icon="check">
          Password changed. You&apos;ve been signed out on your other devices.
        </Notice>
      )}
      {open ? (
        <form id="pf-pw" className="auth-form pf-form" noValidate onSubmit={onSubmit}>
          <FormAlert formId="pf-pw" message={f.alert} />
          <Field
            id="pf-current"
            label="Current password"
            password
            capsHint
            error={f.err("currentPassword")}
            inputRef={cur.ref}
            input={{ ...cur, autoComplete: "current-password", dir: "ltr", autoCapitalize: "none", spellCheck: false }}
          />
          <Field
            id="pf-new"
            label="New password"
            password
            capsHint
            help="At least 10 characters."
            describedBy={["pf-new-note"]}
            error={f.err("newPassword")}
            inputRef={next.ref}
            input={{ ...next, autoComplete: "new-password", dir: "ltr", autoCapitalize: "none", spellCheck: false }}
            after={
              <p className="help" id="pf-new-note">
                This signs you out on your other devices.
              </p>
            }
          />
          <div className="pf-row">
            <Button type="submit" variant="primary" pending={f.pending} disabledReason={f.disabledReason}>
              Change password
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                f.form.reset({ currentPassword: "", newPassword: "" });
                f.setAlert(null);
                close();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="pf-reveal">
          <p className="muted">This signs you out on your other devices.</p>
          <Button
            ref={toggle}
            variant="secondary"
            id="pf-pw-open"
            aria-expanded="false"
            aria-controls="pf-pw"
            disabledReason={f.online ? null : "pf-pw-offline-msg"}
            onClick={show}
          >
            Change password
          </Button>
        </div>
      )}
    </section>
  );
}
