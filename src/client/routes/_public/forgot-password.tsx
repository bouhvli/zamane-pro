import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { forgotPasswordSchema } from "../../../shared/schemas/auth.ts";
import { AuthShell, PageHead } from "../../components/AuthShell.tsx";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { Icon } from "../../components/Icon.tsx";
import { FormAlert, Notice } from "../../components/Notice.tsx";
import { api } from "../../lib/api.ts";
import { say, setTitle } from "../../lib/announce.ts";
import { carry, normEmail } from "../../lib/carry.ts";
import { focusEl, focusHeading, useArrival } from "../../lib/nav.ts";
import { useAuthForm } from "../../lib/use-auth-form.ts";

/**
 * Forgot password → Check your email (account.js "forgot-password"). One route: the sent step swaps in place, so a
 * reload or a URL never resends and the email never sits in the URL. Same answer whether or not the account exists.
 */
export const Route = createFileRoute("/_public/forgot-password")({ component: ForgotPassword });

const C = {
  title: "Reset your password",
  intro: "We'll email you a link to set a new one.",
  submit: "Send reset link",
  submitting: "Sending…",
  back: "Back to sign in",
  offline: "You're offline. Sending a link needs a connection.",
  online: "Back online. You can send the link now.",
  sentTitle: "Check your email",
  nothing: "Nothing yet? Check your spam folder, or send it again.",
  resend: "Send again",
  resending: "Sending…",
  resent: "Sent again.",
  different: "Use a different email",
};

async function requestReset(email: string) {
  await api("/api/auth/request-password-reset", { body: { email } });
}

function ForgotPassword() {
  const [sent, setSent] = useState<string | null>(null);
  const [selectOnShow, setSelectOnShow] = useState(false);
  return (
    <AuthShell route="forgot-password" tiles="pair">
      {sent === null ? (
        <ResetForm initialEmail={carry.get("email")} select={selectOnShow} onSent={(email) => setSent(email)} />
      ) : (
        <Sent
          email={sent}
          onDifferent={() => {
            setSelectOnShow(true);
            setSent(null);
          }}
        />
      )}
    </AuthShell>
  );
}

function ResetForm({
  initialEmail,
  select,
  onSent,
}: {
  initialEmail: string;
  select: boolean;
  onSent: (email: string) => void;
}) {
  const emailRef = useRef<HTMLInputElement | null>(null);
  const f = useAuthForm({
    formId: "fp",
    schema: forgotPasswordSchema,
    defaultValues: { email: initialEmail },
    offlineText: C.offline,
    onlineText: C.online,
  });

  useArrival((first) => {
    setTitle(C.title);
    if (select) {
      focusEl(emailRef.current);
      emailRef.current?.select();
    } else if (!first) focusEl(emailRef.current); // Forgot → Email, value kept
  });

  const onSubmit = f.onSubmit(async ({ email }) => {
    carry.set("email", email);
    f.form.setValue("email", email);
    f.setPending(C.submitting);
    try {
      await requestReset(email);
      onSent(email);
    } catch (e) {
      f.setPending(false);
      f.fail(e);
    }
  });

  const reg = f.field("email", { normalise: normEmail });
  return (
    <>
      <PageHead title={C.title} className="has-lede" />
      <p className="lede">{C.intro}</p>
      <Notice id="fp-offline" icon="wifi-off" hidden={f.online}>
        {C.offline}
      </Notice>
      <form id="fp" className="auth-form" noValidate onSubmit={onSubmit}>
        <FormAlert formId="fp" message={f.alert} />
        <Field
          id="fp-email"
          label="Email"
          error={f.err("email")}
          inputRef={(el) => {
            reg.ref(el);
            emailRef.current = el;
          }}
          input={{
            ...reg,
            type: "email",
            inputMode: "email",
            autoComplete: "username",
            required: true,
            autoCapitalize: "none",
            autoCorrect: "off",
            spellCheck: false,
            enterKeyHint: "go",
            dir: "ltr",
            onChange: (e) => {
              carry.set("email", normEmail(e.target.value));
              void reg.onChange(e);
            },
          }}
        />
        <Button type="submit" variant="primary" block pending={f.pending} disabledReason={f.disabledReason}>
          {C.submit}
        </Button>
      </form>
      <div className="alt-links">
        <p>
          <Link className="link-btn" to="/sign-in">
            {C.back}
          </Link>
        </p>
      </div>
    </>
  );
}

function Sent({ email, onDifferent }: { email: string; onDifferent: () => void }) {
  const [resent, setResent] = useState(false);
  // The Send again form has no fields: the shared form behaviour (alert slot, rate limit, offline) still applies.
  const f = useAuthForm({
    formId: "fs",
    schema: forgotPasswordSchema.pick({}),
    defaultValues: {},
    offlineText: C.offline,
    onlineText: C.online,
  });

  useArrival(() => {
    setTitle(C.sentTitle);
    focusHeading();
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (f.pending) return;
    if (f.disabledReason) {
      say(document.getElementById(f.disabledReason)?.textContent ?? "");
      return;
    }
    f.setAlert(null);
    setResent(false);
    f.setPending(C.resending);
    try {
      await requestReset(email);
      f.setPending(false);
      setResent(true);
      say(C.resent);
    } catch (err) {
      f.setPending(false);
      f.fail(err);
    }
  }

  return (
    <>
      <PageHead title={C.sentTitle} className="has-lede" />
      <div className="sent-body">
        <p>
          If there&apos;s a Zamane account for{" "}
          <b className="email-addr" dir="ltr">
            {email}
          </b>
          , we&apos;ve sent a link to reset your password. It works once, for 1 hour.
        </p>
        <p>{C.nothing}</p>
      </div>
      <Notice id="fs-offline" icon="wifi-off" hidden={f.online}>
        {C.offline}
      </Notice>
      <form id="fs" className="auth-form sent-actions" noValidate onSubmit={onSubmit}>
        <FormAlert formId="fs" message={f.alert} />
        <Button type="submit" variant="secondary" block pending={f.pending} disabledReason={f.disabledReason}>
          {C.resend}
        </Button>
        <p className="resent" id="fs-resent" hidden={!resent}>
          <Icon name="check" />
          <span>{C.resent}</span>
        </p>
      </form>
      <div className="alt-links">
        <p>
          <button className="link-btn" type="button" id="fs-different" onClick={onDifferent}>
            {C.different}
          </button>
        </p>
        <p>
          <Link className="link-btn" to="/sign-in">
            {C.back}
          </Link>
        </p>
      </div>
    </>
  );
}
