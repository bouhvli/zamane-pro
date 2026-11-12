import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { renameSpaceSchema, type MeResponse, type MySpace } from "../../../shared/schemas/spaces.ts";
import { api, isApiError } from "../../lib/api.ts";
import { say } from "../../lib/announce.ts";
import { meKey } from "../../lib/session.ts";
import { useAuthForm } from "../../lib/use-auth-form.ts";
import { Field } from "../Field.tsx";
import { Loader } from "../Loader.tsx";
import { FormAlert, Notice } from "../Notice.tsx";
import { spaceKey } from "./space.ts";

type Status = "idle" | "saving" | "saved";

/** "Euro (EUR)" from the code; the code alone when the browser doesn't know it. */
function currencyLabel(code: string): string {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "currency" }).of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

/**
 * Inside the couple card: the space's name, which saves by itself when the field loses focus (same pattern and
 * status as the first name), and the currency and time zone, read only because they were chosen when it was created.
 */
export function SpaceSettings({ space }: { space: MySpace }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("idle");
  const saved = useRef(space.name);
  const waiting = useRef(false);
  const busy = useRef(false);
  const f = useAuthForm({
    formId: "pf-space",
    schema: renameSpaceSchema,
    defaultValues: { name: space.name },
    offlineText: "Saving the space name needs a connection.",
    onlineText: "Back online.",
  });
  const reg = f.field("name");

  async function save() {
    if (busy.current) return;
    const parsed = renameSpaceSchema.safeParse({ name: f.form.getValues("name") });
    if (!parsed.success) return; // the field shows its error (blur validation)
    const name = parsed.data.name;
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
      const r = await api<{ space: MySpace }>("/api/spaces/mine", { method: "PATCH", body: { name } });
      saved.current = r.space.name;
      qc.setQueryData(spaceKey, r);
      qc.setQueryData<MeResponse | null>(meKey, (me) =>
        me?.space ? { ...me, space: { ...me.space, name: r.space.name } } : me,
      );
      setStatus("saved");
      say("Space name saved.");
    } catch (e) {
      setStatus("idle");
      if (isApiError(e, "validation_failed") && e.fields.name) f.serverError("name", e.fields.name);
      else f.fail(e);
    } finally {
      busy.current = false;
    }
  }

  // The partner renamed it: show their name unless this field is being edited.
  useEffect(() => {
    if (space.name === saved.current || document.activeElement?.id === "pf-space-name") return;
    saved.current = space.name;
    f.form.setValue("name", space.name);
  }, [space.name]); // eslint-disable-line react-hooks/exhaustive-deps -- f.form is stable

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (f.online && waiting.current) void saveRef.current();
  }, [f.online]);

  return (
    <div className="pf-space-set">
      <Notice id="pf-space-offline" icon="wifi-off" hidden={f.online}>
        Saving the space name needs a connection.
      </Notice>
      <form
        id="pf-space"
        className="auth-form pf-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <FormAlert formId="pf-space" message={f.alert} />
        <Field
          id="pf-space-name"
          label="Space name"
          help="Either of you can change it. It saves when you leave the field."
          error={f.err("name")}
          inputRef={reg.ref}
          input={{
            ...reg,
            type: "text",
            autoComplete: "off",
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
      <dl className="pf-facts" aria-describedby="pf-facts-help">
        <div>
          <dt>Currency</dt>
          <dd>{currencyLabel(space.currency)}</dd>
        </div>
        <div>
          <dt>Time zone</dt>
          <dd dir="ltr">{space.timezone.replace(/_/g, " ")}</dd>
        </div>
      </dl>
      <p className="help pf-facts-help" id="pf-facts-help">
        Chosen when the space was created.
      </p>
    </div>
  );
}
