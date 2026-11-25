import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { updateMeSchema } from "../../../shared/schemas/auth.ts";
import { api, isApiError } from "../../lib/api.ts";
import { say } from "../../lib/announce.ts";
import { meKey } from "../../lib/session.ts";
import { useAuthForm } from "../../lib/use-auth-form.ts";
import { Field } from "../Field.tsx";
import { Loader } from "../Loader.tsx";
import { FormAlert } from "../Notice.tsx";
import { EmailRow } from "./EmailRow.tsx";
import { spaceKey } from "./space.ts";
import { Section } from "./Zellige.tsx";

type Status = "idle" | "saving" | "saved";

/** The first name saves by itself when the field loses focus, if it changed and is valid. */
function NameRow({ displayName }: { displayName: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("idle");
  const saved = useRef(displayName); // the last value the server has
  const waiting = useRef(false); // changed while offline: save when the connection is back
  const busy = useRef(false);
  const f = useAuthForm({
    formId: "pf-name",
    schema: updateMeSchema,
    defaultValues: { displayName },
    offlineText: "Saving your name needs a connection.",
    onlineText: "Back online.",
  });
  const reg = f.field("displayName");

  async function save() {
    if (busy.current) return;
    const parsed = updateMeSchema.safeParse({ displayName: f.form.getValues("displayName") });
    if (!parsed.success) return; // the field shows its error (blur validation)
    const name = parsed.data.displayName;
    if (name === saved.current) {
      waiting.current = false;
      return;
    }
    if (!f.online) {
      waiting.current = true; // the notice above says it needs a connection; saves when back online
      return;
    }
    waiting.current = false;
    busy.current = true;
    setStatus("saving");
    f.setAlert(null);
    try {
      const me = await api("/api/me", { method: "PATCH", body: { displayName: name } });
      saved.current = name;
      qc.setQueryData(meKey, me);
      void qc.invalidateQueries({ queryKey: spaceKey });
      setStatus("saved");
      say("Name saved.");
    } catch (e) {
      setStatus("idle");
      if (isApiError(e, "validation_failed") && e.fields.displayName)
        f.serverError("displayName", e.fields.displayName);
      else f.fail(e);
    } finally {
      busy.current = false;
    }
  }

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (f.online && waiting.current) void saveRef.current();
  }, [f.online]);

  return (
    <div className="pf-item">
      <form
        id="pf-name"
        className="auth-form pf-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <FormAlert formId="pf-name" message={f.alert} />
        <Field
          id="pf-display-name"
          label="First name"
          help="As your partner will see it. It saves when you leave the field."
          error={f.err("displayName")}
          inputRef={reg.ref}
          input={{
            ...reg,
            type: "text",
            autoComplete: "given-name",
            autoCapitalize: "words",
            required: true,
            onChange: (e) => {
              setStatus("idle");
              return reg.onChange(e);
            },
            onBlur: async (e) => {
              await reg.onBlur(e);
              void save();
            },
          }}
        />
        <p className="pf-status" data-state={status}>
          {status === "saving" ? <Loader label="Saving" /> : status === "saved" ? "Saved." : null}
        </p>
      </form>
      <p className="help" id="pf-name-offline-msg" hidden={f.online}>
        Saving your name needs a connection.
      </p>
    </div>
  );
}

/** Who you are to the app: the first name your partner sees and the email you sign in with. */
export function YouCard({
  displayName,
  email,
  emailChanged,
}: {
  displayName: string;
  email: string;
  emailChanged: "updated" | "failed" | null;
}) {
  return (
    <Section id="pf-you" title="You">
      <div className="pf-list">
        <NameRow displayName={displayName} />
        <EmailRow email={email} changed={emailChanged} />
      </div>
    </Section>
  );
}
