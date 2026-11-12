import { useEffect, useRef, useState } from "react";
import { changeEmailSchema } from "../../../shared/schemas/auth.ts";
import { api, isApiError } from "../../lib/api.ts";
import { say } from "../../lib/announce.ts";
import { normEmail } from "../../lib/carry.ts";
import { useAuthForm } from "../../lib/use-auth-form.ts";
import { Button } from "../Button.tsx";
import { Field } from "../Field.tsx";
import { FormAlert, Notice } from "../Notice.tsx";

/**
 * Change email: the new address and the current password. The server sends a link to the NEW address and the
 * account keeps its email until it is opened, so the success notice says exactly that. An address that already
 * has an account gets the same answer as a free one (nothing says which), so the notice is worded as "if".
 */
export function EmailRow({ email, changed }: { email: string; changed: "updated" | "failed" | null }) {
  const [open, setOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const focusAfter = useRef<"form" | "button" | null>(null);
  const f = useAuthForm({
    formId: "pf-email",
    schema: changeEmailSchema,
    defaultValues: { newEmail: "", password: "" },
    offlineText: "Changing your email needs a connection.",
    onlineText: "Back online.",
  });
  const next = f.field("newEmail", { normalise: normEmail });
  const pw = f.field("password");

  function close() {
    focusAfter.current = "button";
    setOpen(false);
  }
  function show() {
    if (!f.online) {
      say("Changing your email needs a connection.");
      return;
    }
    setSentTo(null);
    focusAfter.current = "form";
    setOpen(true);
  }
  useEffect(() => {
    const target = focusAfter.current;
    focusAfter.current = null;
    if (target === "form") document.getElementById("pf-email-new")?.focus();
    else if (target === "button") toggle.current?.focus();
  }, [open]);

  const onSubmit = f.onSubmit(async (v) => {
    setSentTo(null);
    f.setPending("Sending…");
    try {
      await api("/api/me/email", { body: { newEmail: v.newEmail, password: v.password } });
      f.form.reset({ newEmail: "", password: "" });
      setSentTo(v.newEmail);
      close();
      say(`If you can use ${v.newEmail}, a confirmation link is on its way.`);
    } catch (e) {
      if (isApiError(e, "validation_failed")) {
        if (e.fields.newEmail) f.serverError("newEmail", e.fields.newEmail);
        if (e.fields.password) f.serverError("password", e.fields.password);
      } else f.fail(e);
    } finally {
      f.setPending(false);
    }
  });

  return (
    <div className="pf-set" aria-labelledby="pf-email-h" role="group">
      <h3 className="pf-h3" id="pf-email-h">
        Email
      </h3>
      <Notice id="pf-email-offline" icon="wifi-off" hidden={f.online}>
        Changing your email needs a connection.
      </Notice>
      {changed === "updated" && (
        <Notice id="pf-email-updated" icon="check">
          Your email address was changed.
        </Notice>
      )}
      {changed === "failed" && (
        <Notice id="pf-email-failed" icon="alert">
          That confirmation link doesn&apos;t work any more. Ask for a new one.
        </Notice>
      )}
      {sentTo && (
        <Notice id="pf-email-sent" icon="check">
          If you can use <bdi dir="ltr">{sentTo}</bdi>, a confirmation link is on its way. Your email stays{" "}
          <bdi dir="ltr">{email}</bdi> until you open it.
        </Notice>
      )}
      {open ? (
        <form id="pf-email" className="auth-form pf-form" noValidate onSubmit={onSubmit}>
          <FormAlert formId="pf-email" message={f.alert} />
          <p className="muted pf-current">
            Your email is <bdi dir="ltr">{email}</bdi>.
          </p>
          <Field
            id="pf-email-new"
            label="New email"
            help="We send a link to this address. Your email changes when you open it."
            error={f.err("newEmail")}
            inputRef={next.ref}
            input={{
              ...next,
              type: "email",
              inputMode: "email",
              autoComplete: "email",
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: false,
              dir: "ltr",
              required: true,
            }}
          />
          <Field
            id="pf-email-pw"
            label="Current password"
            password
            capsHint
            error={f.err("password")}
            inputRef={pw.ref}
            input={{ ...pw, autoComplete: "current-password", dir: "ltr", autoCapitalize: "none", spellCheck: false }}
          />
          <div className="pf-row">
            <Button type="submit" variant="primary" pending={f.pending} disabledReason={f.disabledReason}>
              Change email
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                f.form.reset({ newEmail: "", password: "" });
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
          <p className="muted">
            Your email is <bdi dir="ltr">{email}</bdi>.
          </p>
          <Button
            ref={toggle}
            variant="secondary"
            id="pf-email-open"
            aria-expanded="false"
            aria-controls="pf-email"
            disabledReason={f.online ? null : "pf-email-offline-msg"}
            onClick={show}
          >
            Change email
          </Button>
        </div>
      )}
    </div>
  );
}
