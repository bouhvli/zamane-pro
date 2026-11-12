import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { changePasswordSchema } from "../../../shared/schemas/auth.ts";
import { api, isApiError } from "../../lib/api.ts";
import { say } from "../../lib/announce.ts";
import { useOnline } from "../../lib/online.ts";
import { useAuthForm } from "../../lib/use-auth-form.ts";
import { Button } from "../Button.tsx";
import { Field } from "../Field.tsx";
import { FormAlert, Notice } from "../Notice.tsx";
import { EmailRow } from "./EmailRow.tsx";
import { CardHead } from "./Zellige.tsx";

function PasswordRow() {
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
    <div className="pf-set" role="group" aria-labelledby="pf-pw-h">
      <h3 className="pf-h3" id="pf-pw-h">
        Password
      </h3>
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
    </div>
  );
}

/** Better Auth's revoke-other-sessions: every session but this one ends. */
function DevicesRow() {
  const online = useOnline();
  const [done, setDone] = useState(false);
  const revoke = useMutation({
    mutationFn: () => api("/api/auth/revoke-other-sessions", { method: "POST", body: {} }),
    onSuccess: () => {
      setDone(true);
      say("Signed out on your other devices.");
    },
  });
  const failed = revoke.isError && !(isApiError(revoke.error) && revoke.error.status === 429);
  return (
    <div className="pf-set" role="group" aria-labelledby="pf-dev-h">
      <h3 className="pf-h3" id="pf-dev-h">
        Other devices
      </h3>
      <div className="pf-reveal">
        <p className="muted">Ends every other session on your account. This device stays signed in.</p>
        <Button
          variant="secondary"
          id="pf-dev-out"
          pending={revoke.isPending && "Signing out…"}
          disabledReason={online ? null : "pf-dev-offline-msg"}
          onClick={() => {
            setDone(false);
            if (!online) {
              say("Signing out your other devices needs a connection.");
              return;
            }
            revoke.mutate();
          }}
        >
          Sign out other devices
        </Button>
        <Notice id="pf-dev-offline" icon="wifi-off" hidden={online}>
          Signing out your other devices needs a connection.
        </Notice>
        {done && (
          <p className="pf-status" data-state="saved" id="pf-dev-done">
            Signed out on your other devices.
          </p>
        )}
        {revoke.isError && (
          <p className="err" role="alert">
            {failed
              ? "Couldn't sign out your other devices. Try again."
              : "Too many tries. Wait a minute, then try again."}
          </p>
        )}
      </div>
    </div>
  );
}

export function SecurityCard({ email, emailChanged }: { email: string; emailChanged: "updated" | "failed" | null }) {
  return (
    <section className="pf-card" aria-labelledby="pf-sec-h">
      <CardHead id="pf-sec-h">Security</CardHead>
      <PasswordRow />
      <EmailRow email={email} changed={emailChanged} />
      <DevicesRow />
    </section>
  );
}
