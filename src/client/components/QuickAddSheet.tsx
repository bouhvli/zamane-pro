import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { formatAmount, parseMoney } from "../../shared/money.ts";
import { progressRatio } from "../../shared/completion.ts";
import type { GoalKind } from "../../shared/enums.ts";
import { Icon } from "./Icon.tsx";

/**
 * The quick-add sheet (home.html #sheet): "Which goal?" then an amount (money goals) or the new total (general
 * goals). A bottom sheet on phones that sits on the keyboard, centred from 48rem. Its own live and alert regions,
 * because the page's region is inert while the modal is open. Backdrop dismissal only when the press both starts
 * and ends outside the sheet (WCAG 2.5.2). Shared by Home and a goal's page (opened at the amount step with the
 * goal pre-picked: one goal, so no "Change goal").
 */
export interface SheetGoal {
  id: string;
  kind: GoalKind;
  title: string;
  progress: number;
  target: number | null;
}
export type SheetStep = "pick" | "amount";

const MSG = {
  amountEmpty: "Enter an amount, for example 500.",
  amountFormat: "Use numbers only, for example 500 or 500,50.",
  amountZero: "Enter an amount greater than 0.",
  percentRange: "Enter a number from 0 to 100.",
  percentWhole: "Use whole numbers, for example 40.",
};

function parseAmount(raw: string, currency: string): { value?: number; error?: string } {
  const s = raw.replace(/[\s\u00a0\u202f]/g, "");
  if (s === "") return { error: MSG.amountEmpty };
  const v = parseMoney(s, currency);
  if (v === null) return { error: MSG.amountFormat };
  if (!(v > 0)) return { error: MSG.amountZero };
  return { value: v };
}
function parsePercent(raw: string): { value?: number; error?: string } {
  const s = raw.trim();
  if (s === "") return { error: MSG.percentRange };
  if (!/^\d+$/.test(s)) return { error: MSG.percentWhole };
  const n = parseInt(s, 10);
  if (n > 100) return { error: MSG.percentRange };
  return { value: n };
}

export function QuickAddSheet<G extends SheetGoal>({
  open,
  step,
  goal,
  openGoals,
  currency,
  onPick,
  onChangeGoal,
  onClose,
  onSubmit,
}: {
  open: boolean;
  step: SheetStep;
  goal: G | null;
  openGoals: G[];
  currency: string;
  onPick: (goalId: string) => void;
  onChangeGoal: () => void;
  onClose: () => void;
  onSubmit: (goal: G, value: number, note: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const alertEl = useRef<HTMLParagraphElement>(null);
  const pressedOutside = useRef(false);

  // Open and close the native modal with the prop.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Keep the sheet sitting on the on-screen keyboard (iOS ignores interactive-widget); ignore pinch-zoom.
  useEffect(() => {
    const vv = window.visualViewport;
    const d = dialog.current;
    if (!vv || !d || !open) return;
    const phone = window.matchMedia("(max-width: 47.99rem)");
    const place = () => {
      if (!d.open || !phone.matches || vv.scale > 1.01) {
        d.style.bottom = "";
        d.style.maxHeight = "";
        return;
      }
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      d.style.bottom = kb > 0 ? `${kb}px` : "";
      d.style.maxHeight = `${vv.height - 8}px`;
    };
    place();
    vv.addEventListener("resize", place);
    vv.addEventListener("scroll", place);
    return () => {
      vv.removeEventListener("resize", place);
      vv.removeEventListener("scroll", place);
    };
  }, [open, step]);

  const sheetSay = (msg: string, assertive = false) => {
    const r = assertive ? alertEl.current : live.current;
    if (!r) return;
    r.textContent = "";
    setTimeout(() => (r.textContent = msg), 50);
  };

  const outside = (e: { clientX: number; clientY: number }) => {
    const r = dialog.current!.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  return (
    <dialog
      ref={dialog}
      id="qa-sheet"
      className="sheet"
      aria-labelledby="sheet-h"
      onPointerDown={(e) => (pressedOutside.current = e.target === dialog.current && outside(e))}
      onClick={(e) => {
        if (e.target === dialog.current) {
          if (pressedOutside.current && outside(e)) onClose();
          pressedOutside.current = false;
        }
      }}
      onClose={() => {
        const d = dialog.current;
        if (d) {
          d.style.bottom = "";
          d.style.maxHeight = "";
        }
        if (live.current) live.current.textContent = "";
        if (alertEl.current) alertEl.current.textContent = "";
        if (open) onClose();
      }}
    >
      <div className="sheet-head">
        <div>
          <h2 id="sheet-h">Add to a goal</h2>
          <p id="sheet-sub" className="caption">
            {step === "amount" && goal ? `Adding to ${goal.title}` : ""}
          </p>
        </div>
        <button className="icon-btn" type="button" id="sheet-close" aria-label="Close" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      <div id="sheet-body">
        {open && step === "pick" && <Pick goals={openGoals} currency={currency} onPick={onPick} />}
        {open && step === "amount" && goal && (
          <AmountForm
            key={goal.id}
            goal={goal}
            currency={currency}
            canChange={openGoals.length > 1}
            onChangeGoal={onChangeGoal}
            onSubmit={onSubmit}
            say={sheetSay}
          />
        )}
      </div>
      <p id="sheet-live" className="vh" role="status" ref={live} />
      <p id="sheet-alert" className="vh" role="alert" ref={alertEl} />
    </dialog>
  );
}

function Pick({ goals, currency, onPick }: { goals: SheetGoal[]; currency: string; onPick: (id: string) => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => first.current?.focus(), []);
  const ratio = (g: SheetGoal) => progressRatio(g.kind, g.progress, g.target);
  const sorted = [...goals].sort((a, b) => ratio(b) - ratio(a));
  return (
    <>
      <h3 className="lbl" id="pick-h">
        Which goal?
      </h3>
      <ul className="pick-list" role="list" aria-labelledby="pick-h">
        {sorted.map((g, i) => (
          <li key={g.id}>
            <button className="pick-row" type="button" ref={i === 0 ? first : undefined} onClick={() => onPick(g.id)}>
              <span className="pick-main">
                <span className="pick-title">{g.title}</span>
                <span className="pick-meta num">
                  {g.kind === "money"
                    ? `${formatAmount(g.progress, currency)} of ${formatAmount(g.target ?? 0, currency)}`
                    : `${g.progress}%`}
                </span>
              </span>
              <Icon name="chevron-right" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function AmountForm<G extends SheetGoal>({
  goal,
  currency,
  canChange,
  onChangeGoal,
  onSubmit,
  say,
}: {
  goal: G;
  currency: string;
  canChange: boolean;
  onChangeGoal: () => void;
  onSubmit: (goal: G, value: number, note: string) => void;
  say: (msg: string, assertive?: boolean) => void;
}) {
  const money = goal.kind === "money";
  const form = useForm<{ amount: string; note: string }>({
    defaultValues: { amount: money ? "" : String(goal.progress), note: "" },
  });
  const amountRef = useRef<HTMLInputElement | null>(null);
  const noteRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [amount, setAmount] = useState(money ? "" : String(goal.progress));

  useLayoutEffect(() => {
    amountRef.current?.focus();
    if (!money) amountRef.current?.select();
  }, [money]);

  function showError(msg: string) {
    setError(msg);
    amountRef.current?.focus();
    say(msg, true); // a permanent role=alert node in the dialog, so it's announced reliably
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const raw = form.getValues("amount");
    const v = money ? parseAmount(raw, currency) : parsePercent(raw);
    if (v.error || v.value === undefined) return showError(v.error ?? MSG.amountFormat);
    onSubmit(goal, v.value, money ? form.getValues("note").trim() : "");
  };

  const parsed = money ? parseAmount(amount, currency) : null;
  const help = money
    ? parsed?.value
      ? `${goal.title} will be at ${formatAmount(goal.progress + parsed.value, currency)} of ${formatAmount(goal.target ?? 0, currency)}`
      : "For example 500 or 1 200"
    : "Enter the new total, not the amount to add.";

  const amountReg = form.register("amount", {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
      if (error) {
        setError(null);
        const a = document.getElementById("sheet-alert");
        if (a) a.textContent = "";
      }
    },
  });
  const noteReg = form.register("note");
  const change = canChange ? (
    <button className="link-btn" type="button" data-act="change" onClick={onChangeGoal}>
      Change goal
    </button>
  ) : null;

  const field = (
    <div className={`field${error ? " is-invalid" : ""}`} id="amt-field">
      <input
        {...amountReg}
        ref={(el) => {
          amountReg.ref(el);
          amountRef.current = el;
        }}
        id="amt"
        inputMode={money ? "decimal" : "numeric"}
        autoComplete="off"
        enterKeyHint="done"
        aria-invalid={error ? true : undefined}
        aria-describedby="sheet-sub amt-help amt-err"
      />
      <span className="suffix" aria-hidden="true">
        {money ? currency : "%"}
      </span>
    </div>
  );

  return (
    <form id="add-form" noValidate onSubmit={submit}>
      {money ? (
        <label className="field-label" htmlFor="amt">
          Amount<span className="vh"> in {currency}</span>
        </label>
      ) : (
        <>
          <label className="field-label" htmlFor="amt">
            Progress, from 0 to 100%
          </label>
          <p className="help now-at">Now at {goal.progress}%</p>
        </>
      )}
      {money ? (
        field
      ) : (
        <div className="stepper">
          <StepButton
            delta={-10}
            onStep={(d) => {
              const cur = parseInt(form.getValues("amount"), 10);
              const next = Math.max(0, Math.min(100, (Number.isNaN(cur) ? goal.progress : cur) + d));
              form.setValue("amount", String(next));
              setAmount(String(next));
              setError(null);
              say(`${next}%`);
            }}
          />
          {field}
          <StepButton
            delta={10}
            onStep={(d) => {
              const cur = parseInt(form.getValues("amount"), 10);
              const next = Math.max(0, Math.min(100, (Number.isNaN(cur) ? goal.progress : cur) + d));
              form.setValue("amount", String(next));
              setAmount(String(next));
              setError(null);
              say(`${next}%`);
            }}
          />
        </div>
      )}
      <p className={`help${money ? " num" : ""}`} id="amt-help">
        {help}
      </p>
      <p className="err" id="amt-err" hidden={!error}>
        {error}
      </p>
      <div className="sheet-actions">
        <button className="btn-primary" type="submit">
          {money ? "Add contribution" : "Update progress"}
        </button>
        {money ? (
          <div className="sheet-links">
            <button
              className="link-btn"
              type="button"
              data-act="note"
              aria-expanded={noteOpen}
              aria-controls="note-wrap"
              onClick={() => {
                const next = !noteOpen;
                setNoteOpen(next);
                if (next) requestAnimationFrame(() => noteRef.current?.focus());
              }}
            >
              Add a note
            </button>
            {change}
          </div>
        ) : (
          change
        )}
      </div>
      {money && (
        <div className="note-wrap" id="note-wrap" hidden={!noteOpen}>
          <label className="field-label" htmlFor="note">
            Note
          </label>
          <div className="field field-text">
            <input
              {...noteReg}
              ref={(el) => {
                noteReg.ref(el);
                noteRef.current = el;
              }}
              id="note"
              maxLength={120}
              autoComplete="off"
              enterKeyHint="done"
              aria-describedby="note-help"
            />
          </div>
          <p className="help" id="note-help">
            Optional. For example, bonus month
          </p>
        </div>
      )}
    </form>
  );
}

function StepButton({ delta, onStep }: { delta: number; onStep: (d: number) => void }) {
  return (
    <button className="btn-sec" type="button" data-step={delta} onClick={() => onStep(delta)}>
      {delta < 0 ? `−${-delta}` : `+${delta}`}
      <span className="vh"> percentage points</span>
    </button>
  );
}
