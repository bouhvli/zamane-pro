import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { createSpaceSchema, SPACE_MSG } from "../../../../shared/schemas/spaces.ts";
import { AuthShell, PageHead } from "../../../components/AuthShell.tsx";
import { Button } from "../../../components/Button.tsx";
import { Field } from "../../../components/Field.tsx";
import { Icon } from "../../../components/Icon.tsx";
import { FormAlert } from "../../../components/Notice.tsx";
import { initial, Seat, SeatPair } from "../../../components/Seat.tsx";
import { BackLink, ConnNotice } from "../../../components/SetupBits.tsx";
import { api, isApiError } from "../../../lib/api.ts";
import { setTitle } from "../../../lib/announce.ts";
import { carry } from "../../../lib/carry.ts";
import { focusHeading, useArrival } from "../../../lib/nav.ts";
import { meQuery } from "../../../lib/session.ts";
import { useAuthForm } from "../../../lib/use-auth-form.ts";
import { useSignOut } from "../../../lib/use-sign-out.ts";

/** Start our space (setup.js "setup/start"). Everything is prefilled; Start is one tap for the common case. */
export const Route = createFileRoute("/_setup/setup/start")({ component: Start });

const C = {
  title: "Start our space",
  back: "Back to set up your space",
  name: "Space name",
  nameDefault: "Our space",
  nameHelp: "Only you two see this.",
  currency: "Currency",
  other: "Another currency…",
  otherSelect: "Choose a currency",
  currencyHelp: "You can't change this later.",
  tz: "Time zone",
  tzChange: "Change",
  tzChangeLabel: "Change time zone",
  tzSelect: "Choose a time zone",
  submit: "Start our space",
  submitting: "Starting…",
  offline: "You're offline. Starting a space needs a connection.",
  online: "Back online. You can start your space now.",
  network: "Couldn't reach Zamane. Try again. Nothing is created twice.",
};

const REGION_CURRENCY: Record<string, string> = {
  MA: "MAD",
  FR: "EUR",
  BE: "EUR",
  NL: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  IE: "EUR",
  AT: "EUR",
  LU: "EUR",
  GB: "GBP",
  US: "USD",
  CA: "CAD",
  CH: "CHF",
  DZ: "DZD",
  TN: "TND",
  AE: "AED",
  SA: "SAR",
};

function localeRegion(): string {
  try {
    return new Intl.Locale(navigator.language).maximize().region ?? "";
  } catch {
    return "";
  }
}
export function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}
function currencyShortlist(): string[] {
  const list: string[] = [];
  for (const c of [REGION_CURRENCY[localeRegion()], "MAD", "EUR"]) if (c && !list.includes(c)) list.push(c);
  return list.slice(0, 3);
}
const DN = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" });
  } catch {
    return null;
  }
})();
const currencyName = (code: string) => {
  try {
    return DN?.of(code) ?? code;
  } catch {
    return code;
  }
};
const currencyLabel = (code: string) => `${currencyName(code)} (${code})`;
function allCurrencies() {
  let codes = ["MAD", "EUR", "USD", "GBP", "CAD", "CHF", "AED", "SAR", "DZD", "TND"];
  try {
    codes = Intl.supportedValuesOf("currency");
  } catch {
    /* older browsers: the short list */
  }
  return codes.map((code) => ({ code, name: currencyName(code) })).sort((a, b) => a.name.localeCompare(b.name, "en"));
}
function allZones(tz: string) {
  let z = [tz, "Europe/Paris", "Europe/Brussels", "Europe/London", "America/New_York", "UTC"].filter(Boolean);
  try {
    z = Intl.supportedValuesOf("timeZone");
  } catch {
    /* the short list */
  }
  if (tz && !z.includes(tz)) z = z.concat([tz]);
  return z;
}
const city = (tz: string) => (tz.split("/").pop() ?? "").replace(/_/g, " ");

/** Typed values survive the cross-link to Join and back: memory only, never persisted. */
type Draft = { id: string; name: string; currency: string; other: string; tz: string; tzOpen: boolean };
const drafts: { current: Draft | null } = { current: null };
function clearDraft() {
  drafts.current = null;
}
function saveDraft(patch: Partial<Draft>) {
  if (drafts.current) Object.assign(drafts.current, patch);
}

const startForm = z
  .object({
    name: createSpaceSchema.shape.name,
    currency: z.string(),
    other: z.string(),
    tz: z.string().refine((v) => v !== "", SPACE_MSG.tzEmpty),
  })
  .superRefine((v, ctx) => {
    if (v.currency === "other" && !v.other)
      ctx.addIssue({ code: "custom", path: ["other"], message: SPACE_MSG.currencyEmpty });
  });

function Start() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { signOut, offline } = useSignOut();
  const firstName = me.user.displayName;
  const zoneHere = useMemo(() => browserTz(), []);
  const shortlist = useMemo(() => currencyShortlist(), []);
  const currencies = useMemo(() => allCurrencies(), []);
  const [d] = useState<Draft>(() => {
    drafts.current ??= {
      id: uuidv7(),
      name: C.nameDefault,
      currency: shortlist[0] ?? "EUR",
      other: "",
      tz: zoneHere,
      tzOpen: false,
    };
    return drafts.current;
  });

  const [currency, setCurrency] = useState(d.currency);
  const [tz, setTz] = useState(d.tz);
  const [tzOpen, setTzOpen] = useState(d.tzOpen || !d.tz);
  const tzSelect = useRef<HTMLSelectElement>(null);

  const f = useAuthForm({
    formId: "start",
    schema: startForm,
    defaultValues: { name: d.name, currency: d.currency, other: d.other, tz: d.tz },
    offlineText: C.offline,
    onlineText: C.online,
  });

  useArrival((first) => {
    setTitle(C.title);
    if (!first) focusHeading();
  });

  const onSubmit = f.onSubmit(async (v) => {
    const body = { id: d.id, name: v.name, currency: v.currency === "other" ? v.other : v.currency, timezone: v.tz };
    f.setPending(C.submitting);
    try {
      await api("/api/spaces", { body });
      clearDraft();
      carry.clear("intent");
      await qc.fetchQuery({ ...meQuery, staleTime: 0 });
      await navigate({ to: "/", replace: true, state: { notice: "created" } });
    } catch (e) {
      f.setPending(false);
      if (isApiError(e, "already_in_space")) {
        await qc.fetchQuery({ ...meQuery, staleTime: 0 });
        await navigate({ to: "/", replace: true });
      } else if (isApiError(e, "validation_failed")) {
        const m = e.fields;
        if (m.name) f.serverError("name", m.name);
        if (m.currency) f.serverError("other", m.currency);
        if (m.timezone) {
          setTzOpen(true);
          f.serverError("tz", m.timezone);
        }
      } else f.fail(e, C.network); // input kept, same id on retry
    }
  });

  const nameReg = f.field("name");
  const currencyReg = f.form.register("currency");
  const otherReg = f.form.register("other");
  const tzReg = f.form.register("tz");
  const otherErr = f.err("other");
  const tzErr = f.err("tz");

  // If the browser gave no time zone, the select shows open and required.
  const tzLine = tz === zoneHere && tz ? `${city(tz)} (from this phone)` : city(tz);

  return (
    <AuthShell
      route="setup/start"
      header={{
        account: { firstName, onSignOut: signOut, offline },
        back: { label: C.back, render: <BackLink to="/setup" label={C.back} /> },
      }}
    >
      <PageHead
        title={C.title}
        seats={
          <SeatPair>
            <Seat role="a" initial={initial(firstName)} />
            <Seat role="empty" />
          </SeatPair>
        }
      />
      <ConnNotice id="start" offline={offline}>
        {C.offline}
      </ConnNotice>
      <form id="start" className="auth-form" noValidate onSubmit={onSubmit}>
        <FormAlert formId="start" message={f.alert} />
        <Field
          id="space-name"
          label={C.name}
          help={C.nameHelp}
          error={f.err("name")}
          inputRef={nameReg.ref}
          input={{
            ...nameReg,
            type: "text",
            autoComplete: "off",
            required: true,
            autoCapitalize: "sentences",
            enterKeyHint: "next",
            onChange: (e) => {
              saveDraft({ name: e.target.value });
              void nameReg.onChange(e);
            },
          }}
        />
        <fieldset className="fgroup radio-group" aria-describedby="currency-help">
          <legend className="field-label">{C.currency}</legend>
          <div className="radios">
            {[...shortlist, "other"].map((c) => (
              <label className="radio" key={c}>
                <input
                  type="radio"
                  {...currencyReg}
                  value={c}
                  aria-controls={c === "other" ? "currency-pick" : undefined}
                  onChange={(e) => {
                    void currencyReg.onChange(e);
                    saveDraft({ currency: c });
                    setCurrency(c);
                    if (c !== "other") f.form.clearErrors("other");
                  }}
                />
                <span>{c === "other" ? C.other : currencyLabel(c)}</span>
              </label>
            ))}
          </div>
          {/* Revealed without moving focus: it's the next Tab stop. */}
          <div className="currency-pick" id="currency-pick" hidden={currency !== "other"}>
            <SelectField id="currency-other" label={C.otherSelect} error={otherErr}>
              <select
                id="currency-other"
                autoComplete="off"
                required
                aria-invalid={otherErr ? true : undefined}
                aria-describedby={otherErr ? "currency-other-err" : undefined}
                {...otherReg}
                onChange={(e) => {
                  void otherReg.onChange(e);
                  saveDraft({ other: e.target.value });
                  if (e.target.value) f.form.clearErrors("other");
                }}
              >
                <option value="" />
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {currencyLabel(c.code)}
                  </option>
                ))}
              </select>
            </SelectField>
          </div>
          <p className="help" id="currency-help">
            {C.currencyHelp}
          </p>
        </fieldset>
        <div className="fgroup tz">
          <p className="field-label" id="tz-label">
            {C.tz}
          </p>
          <div className="tz-row">
            <p className="tz-value" id="tz-value">
              {tzLine}
            </p>
            <button
              className="link-btn disclosure"
              type="button"
              id="tz-toggle"
              aria-expanded={tzOpen}
              aria-controls="tz-pick"
              aria-label={C.tzChangeLabel}
              aria-describedby="tz-label tz-value"
              onClick={() => {
                const open = !tzOpen;
                saveDraft({ tzOpen: open });
                setTzOpen(open);
                if (open) requestAnimationFrame(() => tzSelect.current?.focus());
              }}
            >
              {C.tzChange}
              <Icon name="chevron-down" />
            </button>
          </div>
          <div className="tz-pick" id="tz-pick" hidden={!tzOpen}>
            <SelectField id="tz" label={C.tzSelect} error={tzErr}>
              <select
                id="tz"
                autoComplete="off"
                required
                aria-invalid={tzErr ? true : undefined}
                aria-describedby={tzErr ? "tz-err" : undefined}
                {...tzReg}
                ref={(el) => {
                  tzReg.ref(el);
                  tzSelect.current = el;
                }}
                onChange={(e) => {
                  void tzReg.onChange(e);
                  saveDraft({ tz: e.target.value });
                  setTz(e.target.value);
                  if (e.target.value) f.form.clearErrors("tz");
                }}
              >
                <TzOptions zones={allZones(zoneHere)} />
              </select>
            </SelectField>
          </div>
        </div>
        <Button type="submit" variant="primary" block pending={f.pending} disabledReason={f.disabledReason}>
          {C.submit}
        </Button>
      </form>
      <div className="alt-links">
        <p>
          Only one of you starts. Partner already has a code?{" "}
          <Link className="link-btn" to="/setup/join" replace>
            Join with their code
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function SelectField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fgroup" data-for={id}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className={`field field-select${error ? " is-invalid" : ""}`}>{children}</div>
      <p className="err" id={`${id}-err`} hidden={!error}>
        {error && (
          <>
            <Icon name="alert" />
            <span>{error}</span>
          </>
        )}
      </p>
    </div>
  );
}

function TzOptions({ zones }: { zones: string[] }) {
  const groups = new Map<string, { value: string; label: string }[]>();
  for (const z of zones) {
    const i = z.indexOf("/");
    const g = i < 0 ? "UTC" : z.slice(0, i);
    const label =
      i < 0
        ? z
        : z
            .slice(i + 1)
            .replace(/_/g, " ")
            .replace(/\//g, " / ");
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push({ value: z, label });
  }
  return (
    <>
      {[...groups].map(([g, opts]) => (
        <optgroup key={g} label={g}>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
