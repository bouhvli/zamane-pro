import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { signInSchema } from "../../../shared/schemas/auth.ts";
import { AuthShell, PageHead } from "../../components/AuthShell.tsx";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { FormAlert, Notice } from "../../components/Notice.tsx";
import { api, isApiError } from "../../lib/api.ts";
import { say, setTitle } from "../../lib/announce.ts";
import { carry, normEmail } from "../../lib/carry.ts";
import { focusEl, useArrival } from "../../lib/nav.ts";
import { safeRedirect, setupTarget, startSession } from "../../lib/session.ts";
import { useAuthForm } from "../../lib/use-auth-form.ts";

/** Sign in (account.js "sign-in"): the landing screen for anyone signed out. */
export const Route = createFileRoute("/_public/sign-in")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => {
    const r = safeRedirect(s.redirect);
    return r ? { redirect: r } : {};
  },
  component: SignIn,
});

const C = {
  title: "Sign in",
  forgot: "Forgot password?",
  submit: "Sign in",
  submitting: "Signing in…",
  offline: "You're offline. Signing in needs a connection.",
  online: "Back online. You can sign in now.",
  signedOut: "You're signed out.",
  accountDeleted: "Your account was deleted.",
  sessionEnded: "You've been signed out. Sign in again to carry on.",
  resetDone: "Password changed. Sign in with your new password.",
};

function SignIn() {
  const { redirect } = Route.useSearch();
  const notice = useLocation({ select: (l) => l.state.notice });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pwRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  const keepCarried = notice !== "signed-out" && notice !== "reset-done" && notice !== "account-deleted";
  const f = useAuthForm({
    formId: "si",
    schema: signInSchema,
    defaultValues: { email: keepCarried ? carry.get("email") : "", password: "" },
    offlineText: C.offline,
    onlineText: C.online,
  });

  useArrival((first) => {
    setTitle(C.title);
    if (notice === "signed-out") say(C.signedOut);
    if (notice === "account-deleted") say(C.accountDeleted);
    if (first) return;
    const hasEmail = !!emailRef.current?.value;
    focusEl(hasEmail && !notice ? pwRef.current : document.querySelector<HTMLElement>("#main h1"));
  });

  function wrong() {
    f.setAlert(
      <>
        That email and password don&apos;t match. Check them and try again, or{" "}
        <Link to="/forgot-password">reset your password</Link>.
      </>,
      "password",
    );
    focusEl(pwRef.current);
    pwRef.current?.select(); // typing replaces it
  }

  const onSubmit = f.onSubmit(async (values) => {
    carry.set("email", values.email);
    f.form.setValue("email", values.email);
    f.setPending(C.submitting);
    try {
      await api("/api/auth/sign-in/email", { body: { email: values.email, password: values.password } });
      carry.clear("email");
      const me = await startSession(qc);
      if (me?.space) await navigate({ to: redirect ?? "/", replace: true });
      else await navigate({ to: setupTarget(), replace: true });
    } catch (e) {
      f.setPending(false);
      if (isApiError(e, "invalid_credentials")) wrong();
      else if (isApiError(e, "validation_failed")) {
        for (const [k, m] of Object.entries(e.fields)) if (k === "email" || k === "password") f.serverError(k, m);
      } else f.fail(e);
    }
  });

  const emailInput = f.field("email", { normalise: normEmail });
  const noticeEl =
    notice === "signed-out" ? (
      <Notice id="si-note" icon="info">
        {C.signedOut}
      </Notice>
    ) : notice === "account-deleted" ? (
      <Notice id="si-note" icon="check">
        {C.accountDeleted}
      </Notice>
    ) : notice === "session-ended" ? (
      <Notice id="si-note" icon="info">
        {C.sessionEnded}
      </Notice>
    ) : notice === "reset-done" ? (
      <Notice id="si-note" icon="check">
        {C.resetDone}
      </Notice>
    ) : null;

  return (
    <AuthShell route="sign-in" tiles="pair">
      <PageHead title={C.title} />
      {noticeEl}
      <Notice id="si-offline" icon="wifi-off" hidden={f.online}>
        {C.offline}
      </Notice>
      <form id="si" className="auth-form" noValidate onSubmit={onSubmit}>
        <FormAlert formId="si" message={f.alert} />
        <Field
          id="si-email"
          label="Email"
          error={f.err("email")}
          inputRef={(el) => {
            emailInput.ref(el);
            emailRef.current = el;
          }}
          input={{
            ...emailInput,
            type: "email",
            inputMode: "email",
            autoComplete: "username",
            required: true,
            autoCapitalize: "none",
            autoCorrect: "off",
            spellCheck: false,
            enterKeyHint: "next",
            dir: "ltr",
            onChange: (e) => {
              carry.set("email", normEmail(e.target.value));
              void emailInput.onChange(e);
            },
          }}
        />
        <PasswordInput f={f} pwRef={pwRef} />
        <Button type="submit" variant="primary" block pending={f.pending} disabledReason={f.disabledReason}>
          {C.submit}
        </Button>
      </form>
      <div className="alt-links new-here-wrap">
        <p className="new-here">
          New to Zamane?{" "}
          <Link className="btn-sec btn-block new-here-link" to="/create-account">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function PasswordInput({
  f,
  pwRef,
}: {
  f: ReturnType<typeof useAuthForm<typeof signInSchema>>;
  pwRef: React.RefObject<HTMLInputElement | null>;
}) {
  const reg = f.field("password");
  return (
    <Field
      id="si-pw"
      label="Password"
      password
      capsHint
      error={f.err("password")}
      alertId={f.alertId("password")}
      inputRef={(el) => {
        reg.ref(el);
        pwRef.current = el;
      }}
      input={{
        ...reg,
        autoComplete: "current-password",
        required: true,
        enterKeyHint: "go",
        dir: "ltr",
        autoCapitalize: "none",
        spellCheck: false,
      }}
      after={
        <p className="forgot-row">
          <Link className="link-btn" to="/forgot-password">
            {C.forgot}
          </Link>
        </p>
      }
    />
  );
}
