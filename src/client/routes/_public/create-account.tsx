import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { parseInviteCode } from "../../../shared/invite-code.ts";
import { signUpSchema } from "../../../shared/schemas/auth.ts";
import { AuthShell, PageHead } from "../../components/AuthShell.tsx";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { Icon } from "../../components/Icon.tsx";
import { FormAlert, Notice } from "../../components/Notice.tsx";
import { initial, Seat } from "../../components/Seat.tsx";
import { api, isApiError } from "../../lib/api.ts";
import { say, setTitle } from "../../lib/announce.ts";
import { carry, normEmail } from "../../lib/carry.ts";
import { focusEl, useArrival } from "../../lib/nav.ts";
import { setupTarget, startSession } from "../../lib/session.ts";
import { useAuthForm } from "../../lib/use-auth-form.ts";

/** Create account (account.js "create-account"). Your seat sits beside "First name" and shows your initial. */
export const Route = createFileRoute("/_public/create-account")({ component: CreateAccount });

const C = {
  title: "Create your account",
  nameHelp: "As your partner will see it.",
  rule: "At least 10 characters.",
  submit: "Create account",
  submitting: "Creating your account…",
  codeOff: "Have a code from your partner?",
  codeOnSay: "You'll enter your partner's code next.",
  taken: "That email already has an account.",
  offline: "You're offline. Creating an account needs a connection.",
  online: "Back online. You can create your account now.",
};

function CreateAccount() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [intent, setIntent] = useState(() => carry.get("intent") === "join");
  const code = parseInviteCode(carry.get("code"));

  const f = useAuthForm({
    formId: "ca",
    schema: signUpSchema,
    defaultValues: { name: "", email: carry.get("email"), password: "" },
    offlineText: C.offline,
    onlineText: C.online,
  });

  useArrival((first) => {
    setTitle(C.title);
    if (!first) focusEl(document.querySelector<HTMLElement>("#main h1"));
  });

  function taken() {
    f.serverError("email", C.taken);
    focusEl(emailRef.current);
    emailRef.current?.select();
  }

  const onSubmit = f.onSubmit(async (values) => {
    carry.set("email", values.email);
    f.form.setValue("email", values.email);
    f.form.setValue("name", values.name);
    setName(values.name);
    f.setPending(C.submitting);
    try {
      await api("/api/auth/sign-up/email", {
        body: { name: values.name, email: values.email, password: values.password },
      });
      await startSession(qc);
      await navigate({ to: setupTarget(), replace: true });
    } catch (e) {
      f.setPending(false);
      if (isApiError(e, "email_taken")) taken();
      else if (isApiError(e, "validation_failed")) {
        for (const [k, m] of Object.entries(e.fields))
          if (k === "name" || k === "email" || k === "password") f.serverError(k, m);
      } else f.fail(e);
    }
  });

  const nameReg = f.field("name");
  const emailReg = f.field("email", { normalise: normEmail });
  const pwReg = f.field("password");
  const emailErr = f.err("email");
  const isTaken = f.form.formState.errors.email?.type === "server" && emailErr === C.taken;

  return (
    <AuthShell route="create-account">
      <PageHead title={C.title} />
      {code.ok && (
        <Notice id="ca-code" icon="info">
          Create your account, then you&apos;ll join with code{" "}
          <span className="nowrap" dir="ltr">
            {code.display}
          </span>
          .
        </Notice>
      )}
      <Notice id="ca-offline" icon="wifi-off" hidden={f.online}>
        {C.offline}
      </Notice>
      <form id="ca" className="auth-form" noValidate onSubmit={onSubmit}>
        <FormAlert formId="ca" message={f.alert} />
        <Field
          id="ca-name"
          label="First name"
          labelExtra={
            <span className="label-seat" id="ca-seat" aria-hidden="true">
              <Seat role="neutral" size="sm" initial={initial(name)} />
            </span>
          }
          help={C.nameHelp}
          error={f.err("name")}
          inputRef={nameReg.ref}
          input={{
            ...nameReg,
            type: "text",
            autoComplete: "given-name",
            required: true,
            autoCapitalize: "words",
            enterKeyHint: "next",
            onChange: (e) => {
              setName(e.target.value);
              void nameReg.onChange(e);
            },
          }}
        />
        <Field
          id="ca-email"
          label="Email"
          error={emailErr}
          announce={isTaken}
          errorExtra={
            isTaken ? (
              <>
                <Link to="/sign-in">Sign in instead</Link> or <Link to="/forgot-password">reset your password</Link>.
              </>
            ) : null
          }
          inputRef={(el) => {
            emailReg.ref(el);
            emailRef.current = el;
          }}
          input={{
            ...emailReg,
            type: "email",
            inputMode: "email",
            autoComplete: "email",
            required: true,
            autoCapitalize: "none",
            autoCorrect: "off",
            spellCheck: false,
            enterKeyHint: "next",
            dir: "ltr",
            onChange: (e) => {
              carry.set("email", normEmail(e.target.value));
              void emailReg.onChange(e);
            },
          }}
        />
        <Field
          id="ca-pw"
          label="Password"
          password
          capsHint
          help={C.rule}
          error={f.err("password")}
          inputRef={pwReg.ref}
          input={{
            ...pwReg,
            autoComplete: "new-password",
            required: true,
            enterKeyHint: "go",
            dir: "ltr",
            autoCapitalize: "none",
            spellCheck: false,
            // @ts-expect-error -- Safari's password rules attribute isn't in React's types
            passwordrules: "minlength: 10; maxlength: 128;",
          }}
        />
        <Button type="submit" variant="primary" block pending={f.pending} disabledReason={f.disabledReason}>
          {C.submit}
        </Button>
        {!code.ok && (
          <button
            className={`btn-sec btn-block intent${intent ? " is-on" : ""}`}
            type="button"
            id="ca-intent"
            onClick={() => {
              const on = !intent;
              if (on) carry.set("intent", "join");
              else carry.clear("intent");
              setIntent(on);
              say(on ? C.codeOnSay : C.codeOff);
            }}
          >
            {intent ? (
              <span>
                <Icon name="check" />
                You&apos;ll enter your partner&apos;s code next. <span className="intent-undo">Undo</span>
              </span>
            ) : (
              C.codeOff
            )}
          </button>
        )}
      </form>
      <div className="alt-links">
        <p>
          Have an account?{" "}
          <Link className="link-btn" to="/sign-in">
            Sign in
          </Link>
        </p>
      </div>
      <p className="fine">
        We use your name and email to run your account. <Link to="/privacy">Read how we handle your data</Link>
      </p>
    </AuthShell>
  );
}
