// TEMP: awaiting design. Profile/Settings has no design yet. This page holds only what auth needs, built from the
// existing components and tokens, so it can be replaced wholesale when the design lands.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { formatInviteCode } from "../../../shared/invite-code.ts";
import { changePasswordSchema, updateMeSchema } from "../../../shared/schemas/auth.ts";
import type { MySpace } from "../../../shared/schemas/spaces.ts";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { FormAlert, Notice } from "../../components/Notice.tsx";
import { PartnerAvatar } from "../../components/PartnerAvatar.tsx";
import { api, isApiError } from "../../lib/api.ts";
import { say, setTitle } from "../../lib/announce.ts";
import { meKey } from "../../lib/session.ts";
import { focusHeading, useArrival } from "../../lib/nav.ts";
import { getTheme, setTheme, type Theme } from "../../lib/theme.ts";
import { useAuthForm } from "../../lib/use-auth-form.ts";
import { useSignOut } from "../../lib/use-sign-out.ts";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

const spaceKey = ["space", "mine"] as const;

function Profile() {
  useArrival((first) => {
    setTitle("Profile");
    if (!first) focusHeading();
  });
  const { me } = Route.useRouteContext();
  const { signOut, offline } = useSignOut();
  // Always fresh on open: until realtime (Phase 5), nothing else tells this page that the partner joined.
  const space = useQuery({
    queryKey: spaceKey,
    queryFn: () => api<{ space: MySpace }>("/api/spaces/mine"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  return (
    <div className="temp-page">
      <h1 className="title-lg">Profile</h1>
      <NameForm displayName={me.user.displayName} />
      <PasswordForm />
      <section className="temp-section" aria-labelledby="space-h">
        <h2 className="title" id="space-h">
          Your space
        </h2>
        {space.data ? (
          <SpaceDetails space={space.data.space} />
        ) : (
          <p className="muted">{space.isError ? "Couldn't load your space." : "Loading…"}</p>
        )}
      </section>
      <ThemeChoice />
      <section className="temp-section" aria-labelledby="out-h">
        <h2 className="title" id="out-h">
          Sign out
        </h2>
        <p className="muted">Signs you out on this device.</p>
        <Button variant="secondary" id="sign-out" disabledReason={offline ? "signout-reason" : null} onClick={signOut}>
          Sign out
        </Button>
        {offline && (
          <p className="help" id="signout-reason">
            Signing out needs a connection.
          </p>
        )}
      </section>
    </div>
  );
}

function NameForm({ displayName }: { displayName: string }) {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const f = useAuthForm({ formId: "pf-name", schema: updateMeSchema, defaultValues: { displayName } });
  const reg = f.field("displayName");
  const onSubmit = f.onSubmit(async ({ displayName: name }) => {
    setSaved(false);
    f.setPending("Saving…");
    try {
      const me = await api("/api/me", { method: "PATCH", body: { displayName: name } });
      qc.setQueryData(meKey, me);
      void qc.invalidateQueries({ queryKey: spaceKey });
      setSaved(true);
      say("Name saved.");
    } catch (e) {
      if (isApiError(e, "validation_failed") && e.fields.displayName)
        f.serverError("displayName", e.fields.displayName);
      else f.fail(e);
    } finally {
      f.setPending(false);
    }
  });
  return (
    <section className="temp-section" aria-labelledby="name-h">
      <h2 className="title" id="name-h">
        Your name
      </h2>
      <form id="pf-name" className="auth-form" noValidate onSubmit={onSubmit}>
        <FormAlert formId="pf-name" message={f.alert} />
        <Field
          id="pf-display-name"
          label="First name"
          help="As your partner will see it."
          error={f.err("displayName")}
          inputRef={reg.ref}
          input={{ ...reg, type: "text", autoComplete: "given-name", autoCapitalize: "words", required: true }}
        />
        <Button type="submit" variant="primary" pending={f.pending} disabledReason={f.disabledReason}>
          Save name
        </Button>
        {saved && <p className="help">Saved.</p>}
      </form>
    </section>
  );
}

function PasswordForm() {
  const [done, setDone] = useState(false);
  const f = useAuthForm({
    formId: "pf-pw",
    schema: changePasswordSchema,
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const cur = f.field("currentPassword");
  const next = f.field("newPassword");
  const onSubmit = f.onSubmit(async (v) => {
    setDone(false);
    f.setPending("Saving…");
    try {
      await api("/api/auth/change-password", {
        body: { currentPassword: v.currentPassword, newPassword: v.newPassword },
      });
      f.form.reset({ currentPassword: "", newPassword: "" });
      setDone(true);
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
    <section className="temp-section" aria-labelledby="pw-h">
      <h2 className="title" id="pw-h">
        Password
      </h2>
      {done && (
        <Notice id="pf-pw-done" icon="check">
          Password changed. You&apos;ve been signed out on your other devices.
        </Notice>
      )}
      <form id="pf-pw" className="auth-form" noValidate onSubmit={onSubmit}>
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
        <Button type="submit" variant="primary" pending={f.pending} disabledReason={f.disabledReason}>
          Change password
        </Button>
      </form>
    </section>
  );
}

function SpaceDetails({ space }: { space: MySpace }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const rotate = useMutation({
    mutationFn: () => api<{ inviteCode: string }>("/api/spaces/mine/invite-code", { method: "POST", body: {} }),
    onSuccess: (r) => {
      qc.setQueryData(spaceKey, { space: { ...space, inviteCode: r.inviteCode } });
      say(`New code: ${formatInviteCode(r.inviteCode).split("").join(" ")}`);
    },
  });
  const code = formatInviteCode(space.inviteCode);
  return (
    <>
      <p>
        <span className="lbl">Name</span>
        <br />
        {space.name}
      </p>
      <ul className="temp-members">
        {space.members.map((m) => (
          <li key={m.userId}>
            <PartnerAvatar name={m.displayName} partner={m.slot} />
            <span>
              {m.displayName} <span className="muted">· partner {m.slot}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="lbl" id="code-label">
        Invite code
      </p>
      <p className="temp-code num" dir="ltr" aria-labelledby="code-label" data-testid="invite-code">
        {code}
      </p>
      <div className="temp-actions">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              say("Code copied.");
            } catch {
              say("Couldn't copy. Select the code instead.");
            }
          }}
        >
          {copied ? "Copied" : "Copy code"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          pending={rotate.isPending && "Making a new code…"}
          onClick={() => rotate.mutate()}
        >
          New code
        </Button>
      </div>
      {rotate.isError && <p className="err">Couldn&apos;t make a new code. Try again.</p>}
    </>
  );
}

function ThemeChoice() {
  const [theme, set] = useState<Theme>(getTheme);
  const options: [Theme, string][] = [
    ["system", "Same as this phone"],
    ["light", "Light"],
    ["dark", "Dark"],
  ];
  return (
    <section className="temp-section">
      <fieldset className="fgroup radio-group">
        <legend className="title">Theme</legend>
        <div className="radios">
          {options.map(([value, label]) => (
            <label className="radio" key={value}>
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => {
                  setTheme(value);
                  set(value);
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="help">Saved on this device only.</p>
      </fieldset>
    </section>
  );
}
