import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MSG } from "../../../shared/schemas/auth.ts";
import type { LeaveResponse, MeResponse, MySpace } from "../../../shared/schemas/spaces.ts";
import { api, isApiError, isNetworkError } from "../../lib/api.ts";
import { say } from "../../lib/announce.ts";
import { useOnline } from "../../lib/online.ts";
import { afterLeavingSpace, endLocalSession } from "../../lib/session.ts";
import { Button } from "../Button.tsx";
import { ConfirmDialog } from "../ConfirmDialog.tsx";
import { Field } from "../Field.tsx";
import { Section } from "./Zellige.tsx";

type Mode = "leave" | "delete" | null;

const OFFLINE = {
  export: "Exporting your data needs a connection.",
  leave: "Leaving the space needs a connection.",
  delete: "Deleting your account needs a connection.",
} as const;

/** The file name the server chose (zamane-export-YYYY-MM-DD.json), or one built from today's date. */
function fileName(res: Response): string {
  const m = /filename="?([^";]+)"?/i.exec(res.headers.get("Content-Disposition") ?? "");
  return m?.[1] ?? `zamane-export-${new Date().toISOString().slice(0, 10)}.json`;
}

/**
 * "Your data": export, then the two danger actions (leave the space, delete the account) in their own list,
 * under a danger heading and edge. Each one needs a connection and says so. Both confirmations are the app's
 * ConfirmDialog; deleting also asks for the current password, inside the dialog.
 */
export function DataCard({ me, space }: { me: MeResponse; space: MySpace | undefined }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const online = useOnline();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const spaceName = space?.name ?? me.space?.name ?? "this space";
  const members = space?.members ?? [];
  const partner = members.find((m) => m.userId !== me.user.id);
  // Alone (or not yet known to be with a partner): leaving ends the space too.
  const alone = space ? members.length < 2 : (me.space?.memberCount ?? 1) < 2;

  async function exportData() {
    if (exporting) return;
    if (!online) {
      say(OFFLINE.export);
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/me/export", { credentials: "same-origin" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(res);
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      say("Your data was downloaded.");
    } catch (e) {
      const offline = e instanceof TypeError;
      setExportError(
        offline
          ? "Couldn't reach Zamane. Check your connection and try again."
          : e instanceof Error && e.message === "429"
            ? "Too many tries. Wait a minute, then try again."
            : "Couldn't prepare your export. Try again.",
      );
    } finally {
      setExporting(false);
    }
  }

  function open(m: Exclude<Mode, null>) {
    if (!online) {
      say(OFFLINE[m]);
      return;
    }
    setError(null);
    setPassword("");
    setPasswordError(undefined);
    setMode(m);
  }
  function cancel() {
    if (pending) return;
    setMode(null);
  }

  async function leave() {
    setPending(true);
    setError(null);
    try {
      await api<LeaveResponse>("/api/spaces/mine/leave", { method: "POST", body: {} });
      await afterLeavingSpace(qc, me);
      setMode(null);
      say("You left the space. Start a new one or join another.");
      await navigate({ to: "/setup", replace: true });
    } catch (e) {
      setError(
        isNetworkError(e)
          ? "Couldn't reach Zamane. Check your connection and try again."
          : "Couldn't leave the space. Try again in a moment.",
      );
    } finally {
      setPending(false);
    }
  }

  async function deleteAccount() {
    if (!password) {
      setPasswordError(MSG.pwEmpty);
      document.getElementById("pf-del-pw")?.focus();
      return;
    }
    setPending(true);
    setError(null);
    setPasswordError(undefined);
    try {
      await api("/api/me", { method: "DELETE", body: { password } });
      await endLocalSession(qc);
      setMode(null);
      await navigate({ to: "/sign-in", replace: true, state: { notice: "account-deleted" } });
    } catch (e) {
      if (isApiError(e, "validation_failed") && e.fields.password) {
        setPasswordError(e.fields.password);
        document.getElementById("pf-del-pw")?.focus();
      } else if (isApiError(e) && e.status === 429) setError("Too many tries. Wait a minute, then try again.");
      else
        setError(
          isNetworkError(e)
            ? "Couldn't reach Zamane. Check your connection and try again."
            : "Couldn't delete your account. Try again in a moment.",
        );
    } finally {
      setPending(false);
    }
  }

  const leaveBody = (
    <>
      {alone ? (
        <p>
          You&apos;re the only one in {spaceName}, so the space and everything in it is deleted: goals, trips and
          shopping. This can&apos;t be undone.
        </p>
      ) : (
        <>
          <p>
            You leave {spaceName}. {partner ? partner.displayName : "Your partner"} keeps the space and everything in
            it: goals, trips and shopping.
          </p>
          <p>
            What you added stays, shown as &quot;Former partner&quot;. The invite code is replaced, so your copy stops
            working and a new person can be invited.
          </p>
        </>
      )}
      <p>Your account stays. You can start a new space or join another with a code.</p>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
    </>
  );

  const deleteBody = (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!pending) void deleteAccount();
      }}
      noValidate
    >
      <p>This deletes your account and signs you out everywhere. It can&apos;t be undone.</p>
      {alone ? (
        <p>
          You&apos;re the only one in {spaceName}, so the space and everything in it is deleted too: goals, trips and
          shopping.
        </p>
      ) : (
        <p>
          {partner ? partner.displayName : "Your partner"} keeps {spaceName} and everything in it. What you added stays,
          shown as &quot;Former partner&quot;. Your name and email are removed.
        </p>
      )}
      <Field
        id="pf-del-pw"
        label="Your password"
        password
        help="Enter it to confirm."
        error={passwordError}
        announce
        input={{
          name: "password",
          value: password,
          onChange: (e) => {
            setPassword(e.target.value);
            setPasswordError(undefined);
          },
          autoComplete: "current-password",
          dir: "ltr",
          autoCapitalize: "none",
          spellCheck: false,
        }}
      />
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
    </form>
  );

  return (
    <Section id="pf-data" title="Your data">
      <div className="pf-list">
        <div className="pf-item" role="group" aria-labelledby="pf-export-h">
          <div className="pf-item-text">
            <h3 className="pf-h3" id="pf-export-h">
              Everything in your space
            </h3>
            <p className="pf-item-sub">Goals, trips and shopping, as one JSON file.</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="pf-item-act"
            id="pf-export"
            pending={exporting && "Preparing…"}
            disabledReason={online ? null : "pf-export-offline"}
            onClick={() => void exportData()}
          >
            Export<span className="vh"> my data</span>
          </Button>
          {!online && (
            <p className="help" id="pf-export-offline">
              {OFFLINE.export}
            </p>
          )}
          {exportError && (
            <p className="err" role="alert">
              {exportError}
            </p>
          )}
        </div>
      </div>

      <div className="pf-danger" role="group" aria-labelledby="pf-danger-h">
        <h3 className="pf-danger-h" id="pf-danger-h">
          Leave or delete
        </h3>
        <div className="pf-list pf-list-danger">
          <div className="pf-item">
            <div className="pf-item-text">
              <h4 className="pf-h3">
                Leave <bdi>{spaceName}</bdi>
              </h4>
              <p className="pf-item-sub">
                {alone
                  ? "You're on your own here, so leaving deletes the space."
                  : `${partner ? partner.displayName : "Your partner"} keeps the space and everything in it.`}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="pf-item-act"
              id="pf-leave"
              disabledReason={online ? null : "pf-leave-offline"}
              onClick={() => open("leave")}
            >
              Leave<span className="vh"> space</span>
            </Button>
            {!online && (
              <p className="help" id="pf-leave-offline">
                {OFFLINE.leave}
              </p>
            )}
          </div>
          <div className="pf-item">
            <div className="pf-item-text">
              <h4 className="pf-h3">Delete your account</h4>
              <p className="pf-item-sub">Signs you out everywhere. This can&apos;t be undone.</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="pf-item-act"
              id="pf-delete"
              disabledReason={online ? null : "pf-delete-offline"}
              onClick={() => open("delete")}
            >
              Delete<span className="vh"> my account</span>
            </Button>
            {!online && (
              <p className="help" id="pf-delete-offline">
                {OFFLINE.delete}
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={mode !== null}
        title={mode === "delete" ? "Delete your account?" : "Leave this space?"}
        body={mode === "delete" ? deleteBody : leaveBody}
        ok={mode === "delete" ? "Delete account" : "Leave space"}
        cancel="Cancel"
        pending={pending && (mode === "delete" ? "Deleting…" : "Leaving…")}
        onConfirm={() => void (mode === "delete" ? deleteAccount() : leave())}
        onCancel={cancel}
      />
    </Section>
  );
}
