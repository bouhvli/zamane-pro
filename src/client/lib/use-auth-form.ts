import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import type { z } from "zod";
import { isApiError, isNetworkError } from "./api.ts";
import { say } from "./announce.ts";
import { focusEl } from "./nav.ts";
import { useOnline } from "./online.ts";

/** Copy shared by every form (account.js / setup.js, verbatim). */
export const FORM_COPY = {
  rateLimited: "Too many tries. Wait a minute, then try again.",
  network: "Couldn't reach Zamane. Check your connection and try again.",
  server: "Something went wrong on our side. Try again in a moment.",
  tryAgain: "You can try again now.",
  count: (n: number) => `${n} fields need your attention.`,
};

type AnyObject = z.ZodObject<z.ZodRawShape>;

/**
 * React Hook Form with the shared Zod schema, wired to the prototype's form behaviour (A.wireForm):
 * - a field is checked on blur only after it was typed in, and its error clears as soon as it's valid;
 * - leaving through a link (Back, a cross-link) doesn't validate;
 * - submit checks every field, shows inline errors, "N fields need your attention." at 2+, and focuses the first;
 * - one alert slot per form for failures (rate limit, network, server);
 * - the primary is aria-disabled while pending, offline (with the notice as its reason) or rate limited (with the
 *   alert as its reason); pressing it then says the reason again;
 * - going offline or back online is announced once.
 */
export function useAuthForm<S extends AnyObject>(o: {
  formId: string;
  schema: S;
  defaultValues: DefaultValues<z.input<S> & FieldValues>;
  offlineText?: string;
  onlineText?: string;
}) {
  type Values = z.input<S> & FieldValues;
  const form = useForm<Values, unknown, z.output<S>>({
    resolver: zodResolver(o.schema as never) as never,
    defaultValues: o.defaultValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    shouldFocusError: false,
  });
  const touched = useRef(new Set<string>());
  const leaving = useRef(false);
  const [alert, setAlertState] = useState<ReactNode | null>(null);
  const [countAlert, setCountAlert] = useState(false);
  const [alertField, setAlertField] = useState<string | null>(null);
  const [pending, setPending] = useState<string | false>(false);
  const [limited, setLimited] = useState(false);
  const online = useOnline();
  const firstOnline = useRef(online);

  const setAlert = useCallback((msg: ReactNode | null, field?: string) => {
    setAlertState(msg);
    setCountAlert(false);
    setAlertField(msg && field ? field : null);
  }, []);

  // Offline and back online are announced once per change.
  useEffect(() => {
    if (online === firstOnline.current) return;
    firstOnline.current = online;
    if (o.offlineText && o.onlineText) say(online ? o.onlineText : o.offlineText);
  }, [online, o.offlineText, o.onlineText]);

  // Leaving through a link doesn't validate the field being left.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.("a[href]")) leaving.current = true;
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);

  const fieldMessage = useCallback(
    (name: string, value: unknown): string => {
      const shape = o.schema.shape[name] as z.ZodType | undefined;
      if (!shape) return "";
      const r = shape.safeParse(value);
      return r.success ? "" : (r.error.issues[0]?.message ?? "");
    },
    [o.schema],
  );

  const clearField = useCallback(
    (name: Path<Values>) => {
      form.clearErrors(name);
      if (countAlert) {
        setAlertState(null);
        setCountAlert(false);
      }
    },
    [form, countAlert],
  );

  /** Input props for a field: RHF registration plus the prototype's timing. */
  function field(name: Path<Values>, opts: { normalise?: (v: string) => string; quietWhenEmpty?: boolean } = {}) {
    const reg = form.register(name);
    return {
      ...reg,
      onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
        await reg.onChange(e);
        touched.current.add(name);
        const err = form.getFieldState(name).error;
        if (err && !fieldMessage(name, e.target.value)) clearField(name);
        else if (err?.type === "server") clearField(name); // a server answer is stale once edited
      },
      onBlur: async (e: React.FocusEvent<HTMLInputElement>) => {
        await reg.onBlur(e);
        setTimeout(() => {
          if (leaving.current) {
            leaving.current = false;
            return;
          }
          if (!touched.current.has(name) || !e.target.isConnected) return;
          const v = opts.normalise ? opts.normalise(e.target.value) : e.target.value;
          const m = opts.quietWhenEmpty && v.trim() === "" ? "" : fieldMessage(name, v);
          if (m) form.setError(name, { type: "client", message: m });
          else if (form.getFieldState(name).error) clearField(name);
        }, 0);
      },
    };
  }

  /** A server answer on one field: kept until that field is edited (blur doesn't clear it). */
  function serverError(name: Path<Values>, message: string) {
    touched.current.delete(name);
    form.setError(name, { type: "server", message });
  }

  /** Rate limit: the alert, and the primary unavailable for Retry-After seconds, then "You can try again now.". */
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function rateLimit(seconds: number | null) {
    setAlert(FORM_COPY.rateLimited);
    setLimited(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setLimited(false);
        setAlertState(null);
        say(FORM_COPY.tryAgain);
      },
      (seconds ?? 60) * 1000,
    );
  }

  /** Form-level failures share the alert slot. Returns false when the error isn't one of them. */
  function fail(e: unknown, networkText = FORM_COPY.network): boolean {
    if (isApiError(e) && e.status === 429) rateLimit(e.retryAfter);
    else if (isNetworkError(e)) setAlert(networkText);
    else if (isApiError(e) && e.status >= 500) setAlert(FORM_COPY.server);
    else if (isApiError(e) || e instanceof Error) setAlert(FORM_COPY.server);
    else return false;
    return true;
  }

  const disabledReason = limited ? `${o.formId}-alert-msg` : !online ? `${o.formId}-offline-msg` : null;

  /** onSubmit for the <form>: checks availability, then every field, then calls `onValid`. */
  function onSubmit(onValid: (values: z.output<S>) => void | Promise<void>) {
    return (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (pending) return;
      if (disabledReason) {
        const r = document.getElementById(disabledReason);
        if (r) say(r.textContent ?? "");
        return;
      }
      setAlert(null);
      void form.handleSubmit(
        async (values) => {
          await onValid(values);
        },
        (errors) => {
          const names = Object.keys(errors);
          if (names.length >= 2) {
            setAlertState(FORM_COPY.count(names.length));
            setCountAlert(true);
          }
          const formEl = document.getElementById(o.formId);
          const first = names
            .map((n) => formEl?.querySelector<HTMLElement>(`[name="${n}"]`))
            .filter((x): x is HTMLElement => !!x)
            .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0];
          focusEl(first);
        },
      )(e);
    };
  }

  const err = (name: Path<Values>) => form.formState.errors[name]?.message as string | undefined;

  return {
    form,
    field,
    err,
    serverError,
    alert,
    setAlert,
    alertId: (name: string) => (alertField === name && alert ? `${o.formId}-alert-msg` : undefined),
    fail,
    rateLimit,
    pending,
    setPending,
    online,
    disabledReason,
    onSubmit,
  };
}
