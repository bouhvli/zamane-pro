import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import { parseInviteCode, type ParsedInviteCode } from "../../../../shared/invite-code.ts";
import { SPACE_MSG, type JoinResponse, type SoloSummary } from "../../../../shared/schemas/spaces.ts";
import { AuthShell, PageHead } from "../../../components/AuthShell.tsx";
import { Button } from "../../../components/Button.tsx";
import { ConfirmDialog } from "../../../components/ConfirmDialog.tsx";
import { Field } from "../../../components/Field.tsx";
import { FormAlert } from "../../../components/Notice.tsx";
import { initial, Seat, SeatPair } from "../../../components/Seat.tsx";
import { BackLink, ConnNotice, SignedUpAs } from "../../../components/SetupBits.tsx";
import { api, isApiError } from "../../../lib/api.ts";
import { setTitle } from "../../../lib/announce.ts";
import { carry } from "../../../lib/carry.ts";
import { focusEl, useArrival } from "../../../lib/nav.ts";
import { meQuery } from "../../../lib/session.ts";
import { useAuthForm } from "../../../lib/use-auth-form.ts";
import { useSignOut } from "../../../lib/use-sign-out.ts";

/**
 * Join with a code (setup.js "setup/join"), and the switch (?switch=true): someone alone in the space they started
 * joins their partner's instead, after a confirmation (D33).
 */
export const Route = createFileRoute("/_setup/setup/join")({
  validateSearch: (s: Record<string, unknown>): { switch?: true } =>
    s.switch === true || s.switch === "true" ? { switch: true } : {},
  component: Join,
});

const EXAMPLE = "K7QM-4XPA";
const C = {
  title: "Join with a code",
  swTitle: "Join your partner's space",
  back: "Back to set up your space",
  backHome: "Back to Home",
  code: "Invite code",
  codeHelp: "You can paste the whole message.",
  submit: "Join space",
  submitting: "Joining…",
  invalid: "That code didn't work. Check it with your partner, or ask them to share a new one.",
  swInvalid:
    "That code didn't work. Check it with your partner, or ask them to share a new one. Your space wasn't deleted.",
  offline: "You're offline. Joining needs a connection.",
  online: "Back online. You can join now.",
  network: "Couldn't reach Zamane. Your code is kept. Try again.",
  dialogTitle: "Join with this code?",
  keep: "Keep my space",
  confirm: "Join and delete my space",
};

const shapeMsg = (p: ParsedInviteCode) => (p.reason === "letters" ? SPACE_MSG.codeLetters : SPACE_MSG.codeLength);
const joinForm = z.object({
  code: z.string().superRefine((v, ctx) => {
    const p = parseInviteCode(v);
    if (!p.ok) ctx.addIssue({ code: "custom", message: shapeMsg(p) });
  }),
});

function plural(n: number, one: string, other: string) {
  const r = new Intl.PluralRules("en").select(n);
  return (r === "one" ? one : other).replace("#", String(n));
}
function soloText(s: SoloSummary): string {
  const parts: string[] = [];
  if (s.goals) parts.push(plural(s.goals, "# goal", "# goals"));
  if (s.trips) parts.push(plural(s.trips, "# trip", "# trips"));
  if (s.items) parts.push(plural(s.items, "# shopping item", "# shopping items"));
  if (!parts.length) return "The space you started will be deleted. This can't be undone.";
  const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(parts);
  return `The space you started will be deleted, with ${list}. This can't be undone.`;
}

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function cssMs(name: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /ms$/.test(v) ? parseFloat(v) : /s$/.test(v) ? parseFloat(v) * 1000 : parseFloat(v) || 0;
}

function Join() {
  const { me } = Route.useRouteContext();
  const sw = Route.useSearch().switch === true;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { signOut, offline } = useSignOut();
  const firstName = me.user.displayName;
  const mi = initial(firstName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // The value: the pending invite code (prefilled), else the draft kept across a reload (restored).
  const [start] = useState(() => {
    const pending = parseInviteCode(carry.get("code"));
    if (pending.ok) return { value: pending.display, prefilled: true };
    return { value: carry.get("joinDraft"), prefilled: false };
  });
  const fromSignUp = !sw && carry.get("intent") === "join";

  const [filled, setFilled] = useState<{ partner: string | null } | null>(null);
  const [confirm, setConfirm] = useState<{ code: string; text: string } | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const f = useAuthForm({
    formId: "join",
    schema: joinForm,
    defaultValues: { code: start.value },
    offlineText: C.offline,
    onlineText: C.online,
  });

  useArrival((first) => {
    setTitle(sw ? C.swTitle : C.title);
    if (!first) focusEl(start.prefilled ? btnRef.current : inputRef.current);
  });

  /** Shown back as XXXX-XXXX on blur and on paste, never while typing. */
  function showBack() {
    const el = inputRef.current;
    if (!el) return;
    const p = parseInviteCode(el.value);
    if (p.ok && el.value !== p.display) {
      f.form.setValue("code", p.display);
      carry.set("joinDraft", p.display);
    }
  }

  /** The signature moment: the partner's initial lands in the waiting seat, a short hold, then Home. */
  function land(r: JoinResponse) {
    (["code", "intent", "joinDraft"] as const).forEach((k) => carry.clear(k));
    setFilled({ partner: r.partnerName });
    const wait = reduced() ? 0 : cssMs("--dur-seat") + cssMs("--seat-hold");
    setTimeout(() => {
      void qc
        .fetchQuery({ ...meQuery, staleTime: 0 })
        .finally(() => void navigate({ to: "/", replace: true, state: { notice: "joined" } }));
    }, wait);
  }

  function failed(e: unknown) {
    f.setPending(false);
    if (isApiError(e, "invite_invalid")) {
      f.serverError("code", sw ? C.swInvalid : C.invalid);
      focusEl(inputRef.current);
      inputRef.current?.select(); // kept and selected, so it can be retyped
    } else if (isApiError(e, "already_in_space")) {
      void qc.fetchQuery({ ...meQuery, staleTime: 0 }).then(() => navigate({ to: "/", replace: true }));
    } else if (isApiError(e, "partner_joined")) {
      f.setAlert(e.message);
    } else if (isApiError(e, "validation_failed") && e.fields.code) {
      f.serverError("code", e.fields.code);
      focusEl(inputRef.current);
    } else f.fail(e, C.network);
  }

  async function send(code: string, replaceSolo = false) {
    f.setPending(C.submitting);
    try {
      land(await api<JoinResponse>("/api/spaces/join", { body: replaceSolo ? { code, replaceSolo } : { code } }));
    } catch (e) {
      failed(e);
    }
  }

  const onSubmit = f.onSubmit(async ({ code }) => {
    const p = parseInviteCode(code);
    f.form.setValue("code", p.display);
    carry.set("joinDraft", p.display);
    if (!sw) return send(p.code);
    try {
      const summary = await api<SoloSummary>("/api/spaces/mine/summary");
      setConfirm({ code: p.code, text: soloText(summary) });
    } catch (e) {
      failed(e);
    }
  });

  const reg = f.field("code", { quietWhenEmpty: true });
  const partnerInitial = filled ? initial(filled.partner) : "";
  const pair = sw ? (
    <SeatPair className="seat-pair--vt">
      {filled ? (
        <>
          {partnerInitial ? (
            <Seat role="a" initial={partnerInitial} filling />
          ) : (
            <span className="seat is-filling seat--neutral seat--md" />
          )}
          <Seat role="b" initial={mi} />
        </>
      ) : (
        <>
          <Seat role="a" initial={mi} />
          <Seat role="empty" />
        </>
      )}
    </SeatPair>
  ) : (
    <SeatPair className="seat-pair--vt">
      {filled ? (
        partnerInitial ? (
          <Seat role="a" initial={partnerInitial} filling />
        ) : (
          <span className="seat is-filling seat--neutral seat--md" />
        )
      ) : (
        <Seat role="taken" />
      )}
      <Seat role="b" initial={mi} />
    </SeatPair>
  );

  return (
    <AuthShell
      route="setup/join"
      header={{
        account: { firstName, onSignOut: signOut, offline },
        back: sw
          ? { label: C.backHome, render: <BackLink to="/" label={C.backHome} /> }
          : { label: C.back, render: <BackLink to="/setup" label={C.back} /> },
      }}
    >
      <PageHead title={sw ? C.swTitle : C.title} seats={pair} />
      <p className="lede">
        Enter the code your partner shared. It looks like{" "}
        <span className="nowrap" dir="ltr">
          {EXAMPLE}
        </span>
        .
      </p>
      <ConnNotice id="join" offline={offline}>
        {C.offline}
      </ConnNotice>
      <form id="join" className="auth-form" noValidate onSubmit={onSubmit}>
        <FormAlert formId="join" message={f.alert} />
        <Field
          id="invite-code"
          label={C.code}
          code
          help={C.codeHelp}
          error={f.err("code")}
          announce={f.form.formState.errors.code?.type === "server"}
          inputRef={(el) => {
            reg.ref(el);
            inputRef.current = el;
          }}
          input={{
            ...reg,
            type: "text",
            autoComplete: "off",
            required: true,
            autoCapitalize: "characters",
            autoCorrect: "off",
            spellCheck: false,
            inputMode: "text",
            enterKeyHint: "go",
            dir: "ltr",
            onChange: (e) => {
              carry.set("joinDraft", e.target.value); // survives the trip to the chat app
              void reg.onChange(e);
            },
            onBlur: (e) => {
              showBack();
              void reg.onBlur(e);
            },
            onPaste: () => setTimeout(showBack, 0),
          }}
        />
        <Button
          ref={btnRef}
          type="submit"
          variant="primary"
          block
          pending={filled ? C.submitting : f.pending}
          disabledReason={f.disabledReason}
        >
          {C.submit}
        </Button>
      </form>
      {!sw && (
        <div className="alt-links">
          <p>
            No code yet?{" "}
            <Link className="link-btn" to="/setup/start" replace>
              Start our space
            </Link>
          </p>
        </div>
      )}
      {fromSignUp && <SignedUpAs email={me.user.email} onSignOut={signOut} offline={offline} />}
      <ConfirmDialog
        open={!!confirm}
        title={C.dialogTitle}
        body={<p>{confirm?.text}</p>}
        ok={C.confirm}
        cancel={C.keep}
        pending={confirmPending && C.submitting}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm || confirmPending) return;
          setConfirmPending(true);
          try {
            const r = await api<JoinResponse>("/api/spaces/join", { body: { code: confirm.code, replaceSolo: true } });
            setConfirmPending(false);
            setConfirm(null);
            f.setPending(C.submitting);
            // The seat fills once the sheet (and its backdrop) has gone, so the moment isn't dimmed.
            setTimeout(() => land(r), reduced() ? 0 : cssMs("--dur-sheet"));
          } catch (e) {
            setConfirmPending(false);
            setConfirm(null);
            setTimeout(() => failed(e), 0);
          }
        }}
      />
    </AuthShell>
  );
}
