import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { resetPasswordSchema } from "../../shared/schemas/auth.ts";
import { AuthShell, PageHead } from "../components/AuthShell.tsx";
import { Button, ButtonLink } from "../components/Button.tsx";
import { Field } from "../components/Field.tsx";
import { FormAlert, Notice } from "../components/Notice.tsx";
import { api, isApiError } from "../lib/api.ts";
import { say, setTitle } from "../lib/announce.ts";
import { carry } from "../lib/carry.ts";
import { focusEl, focusHeading, useArrival } from "../lib/nav.ts";
import { clearQueryCache } from "../lib/query.ts";
import { meKey, meQuery } from "../lib/session.ts";
import { useAuthForm } from "../lib/use-auth-form.ts";

/**
 * Reset password (account.js "reset-password"), reached from the email: /reset-password?token=….
 * Three views of one route: the form; "Link doesn't work" (expired or already used, which look the same); and
 * "Password changed". It renders whether or not someone is signed in on this device.
 */
export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): { token?: string } =>
    typeof s.token === "string" && s.token ? { token: s.token } : {},
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps, context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery).catch(() => null);
    if (!deps.token) return { valid: false, me };
    try {
      const r = await api<{ valid: boolean }>(`/api/password-reset/check?token=${encodeURIComponent(deps.token)}`);
      return { valid: r.valid, me };
    } catch {
      return { valid: true, me }; // can't check now: show the form, the submit will tell
    }
  },
  component: ResetPassword,
});

const C = {
  title: "Set a new password",
  rule: "At least 10 characters.",
  note: "This signs you out on your other devices.",
  submit: "Set new password",
  submitting: "Saving…",
  offline: "You're offline. Saving a new password needs a connection.",
  online: "Back online. You can save your password now.",
  invalidTitle: "Link doesn't work",
  invalidH1: "This link doesn't work any more",
  invalidBody: "Reset links work once, for 1 hour. Ask for a new one.",
  invalidPrimary: "Send a new link",
  back: "Back to sign in",
  invalidAnnounce: "This link doesn't work any more.",
  doneTitle: "Password changed",
  doneBody: "Sign in to Zamane with your new password.",
  donePrimary: "Sign in",
  doneOthers: "You've been signed out on your other devices.",
  doneHomeScreen: "Use Zamane from your home screen? Open it there and sign in.",
};

type View = "form" | "invalid" | "done";

function ResetPassword() {
  const { token } = Route.useSearch();
  const data = Route.useLoaderData();
  const [view, setView] = useState<View>(data.valid ? "form" : "invalid");
  const [diedOnSubmit, setDiedOnSubmit] = useState(false);

  return (
    <AuthShell route="reset-password" tiles="pair">
      {view === "form" && token ? (
        <ResetForm
          token={token}
          signedInAs={data.me?.user.displayName ?? null}
          onDone={() => setView("done")}
          onInvalid={() => {
            setDiedOnSubmit(true);
            setView("invalid");
            say(C.invalidAnnounce);
          }}
        />
      ) : view === "done" ? (
        <Done />
      ) : (
        <Invalid focus={diedOnSubmit} />
      )}
    </AuthShell>
  );
}

function ResetForm({
  token,
  signedInAs,
  onDone,
  onInvalid,
}: {
  token: string;
  signedInAs: string | null;
  onDone: () => void;
  onInvalid: () => void;
}) {
  const qc = useQueryClient();
  const pwRef = useRef<HTMLInputElement | null>(null);
  const f = useAuthForm({
    formId: "rp",
    schema: resetPasswordSchema,
    defaultValues: { password: "" },
    offlineText: C.offline,
    onlineText: C.online,
  });

  // A single task, and the link from the email is always a first load: focus goes to New password.
  useArrival(() => {
    setTitle(C.title);
    focusEl(pwRef.current);
  });

  const onSubmit = f.onSubmit(async ({ password }) => {
    f.setPending(C.submitting);
    try {
      await api("/api/auth/reset-password", { body: { newPassword: password, token } });
      if (signedInAs) {
        // Signed out here too: every session was revoked; clear this device's cookies and caches.
        await api("/api/auth/sign-out", { method: "POST", body: {} }).catch(() => undefined);
        await clearQueryCache();
        qc.setQueryData(meKey, null);
        carry.clearAll();
      }
      onDone();
    } catch (e) {
      f.setPending(false);
      if (isApiError(e, "invalid_token")) {
        if (pwRef.current) pwRef.current.value = ""; // never kept
        onInvalid();
      } else if (isApiError(e, "validation_failed") && e.fields.password) f.serverError("password", e.fields.password);
      else f.fail(e);
    }
  });

  const reg = f.field("password");
  return (
    <>
      <PageHead title={C.title} />
      {signedInAs && (
        <Notice id="rp-signed" icon="info">
          You&apos;re signed in as {signedInAs} here. Setting a new password signs you out here too.
        </Notice>
      )}
      <Notice id="rp-offline" icon="wifi-off" hidden={f.online}>
        {C.offline}
      </Notice>
      <form id="rp" className="auth-form" noValidate onSubmit={onSubmit}>
        <FormAlert formId="rp" message={f.alert} />
        <Field
          id="rp-pw"
          label="New password"
          password
          capsHint
          help={C.rule}
          error={f.err("password")}
          describedBy={["rp-note"]}
          inputRef={(el) => {
            reg.ref(el);
            pwRef.current = el;
          }}
          input={{
            ...reg,
            autoComplete: "new-password",
            required: true,
            enterKeyHint: "go",
            dir: "ltr",
            autoCapitalize: "none",
            spellCheck: false,
            // @ts-expect-error -- Safari's password rules attribute isn't in React's types
            passwordrules: "minlength: 10; maxlength: 128;",
          }}
          after={
            <p className="help" id="rp-note">
              {C.note}
            </p>
          }
        />
        <Button type="submit" variant="primary" block pending={f.pending} disabledReason={f.disabledReason}>
          {C.submit}
        </Button>
      </form>
    </>
  );
}

function Invalid({ focus }: { focus: boolean }) {
  useArrival((first) => {
    setTitle(C.invalidTitle);
    if (focus || !first) focusHeading();
  });
  return (
    <>
      <PageHead title={C.invalidH1} className="has-lede" />
      <div className="result">
        <p className="lede">{C.invalidBody}</p>
        {/* A new tab from the email knows no email: Forgot opens empty. */}
        <ButtonLink variant="primary" block to="/forgot-password" id="ri-new" onClick={() => carry.clear("email")}>
          {C.invalidPrimary}
        </ButtonLink>
      </div>
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

function Done() {
  useArrival(() => {
    setTitle(C.doneTitle);
    focusHeading();
  });
  return (
    <>
      <PageHead title={C.doneTitle} className="has-lede" />
      <div className="result">
        <p className="lede">{C.doneBody}</p>
        <ButtonLink variant="primary" block to="/sign-in" replace state={{ notice: "reset-done" }}>
          {C.donePrimary}
        </ButtonLink>
        <p className="result-note">{C.doneOthers}</p>
        <p className="result-note muted">{C.doneHomeScreen}</p>
      </div>
    </>
  );
}
