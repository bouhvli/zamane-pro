import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatInviteCode } from "../../../shared/invite-code.ts";
import type { MySpace } from "../../../shared/schemas/spaces.ts";
import { api } from "../../lib/api.ts";
import { say } from "../../lib/announce.ts";
import { useOnline } from "../../lib/online.ts";
import { Button } from "../Button.tsx";
import { spaceKey } from "./space.ts";

/**
 * Shown only while the partner has not joined (the couple card hides it for a linked space).
 * The invite code as two set tiles in a grout well with a saffron diamond between. The hyphen stays in the text
 * (visually hidden) so copy, tests and screen readers see "K7QM-4XZP".
 */
export function InviteCode({ space, code: current }: { space: MySpace; code: string }) {
  const qc = useQueryClient();
  const online = useOnline();
  const [copied, setCopied] = useState(false);
  const rotate = useMutation({
    mutationFn: () => api<{ inviteCode: string }>("/api/spaces/mine/invite-code", { method: "POST", body: {} }),
    onSuccess: (r) => {
      setCopied(false);
      qc.setQueryData(spaceKey, { space: { ...space, inviteCode: r.inviteCode } });
      say(`New code: ${formatInviteCode(r.inviteCode).split("").join(" ")}`);
    },
  });
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(t);
  }, [copied]);

  const code = formatInviteCode(current);
  const [first, second] = code.split("-");
  const reason = online ? null : "pf-code-offline";
  return (
    <div className="pf-code">
      <p className="lbl" id="pf-code-label">
        Send this code to your partner
      </p>
      <p
        className={`pf-slip${copied ? " is-copied" : ""}`}
        dir="ltr"
        role="group"
        aria-labelledby="pf-code-label"
        data-testid="invite-code"
      >
        <span className="pf-g">{first}</span>
        <span className="pf-sep vh">-</span>
        <span className="pf-g">{second}</span>
      </p>
      <div className="pf-actions">
        <Button
          variant="primary"
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
          pending={rotate.isPending && "Making a new code…"}
          disabledReason={reason}
          onClick={() => rotate.mutate()}
        >
          New code
        </Button>
      </div>
      {!online && (
        <p className="help" id="pf-code-offline">
          A new code needs a connection.
        </p>
      )}
      {rotate.isError && <p className="err">Couldn&apos;t make a new code. Try again.</p>}
    </div>
  );
}
