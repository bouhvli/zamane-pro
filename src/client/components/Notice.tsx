import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon.tsx";

/** A page notice (offline, signed out, session ended, password changed): .notice.page-notice, icon + one line. */
export function Notice({
  id,
  icon,
  children,
  hidden,
}: {
  id: string;
  icon: IconName;
  children: ReactNode;
  hidden?: boolean;
}) {
  return (
    <div className="notice page-notice" id={id} hidden={hidden}>
      <Icon name={icon} />
      <p id={`${id}-msg`}>{children}</p>
    </div>
  );
}

/**
 * The one alert slot per form (#{form}-alert, role="alert"), always in the DOM so screen readers pick up what
 * lands in it. Danger tone by default.
 */
export function FormAlert({ formId, message }: { formId: string; message: ReactNode | null }) {
  return (
    <div className="form-alert" id={`${formId}-alert`} role="alert">
      {message ? (
        <div className="notice notice-danger" id={`${formId}-alert-msg`}>
          <Icon name="alert" />
          <p>{message}</p>
        </div>
      ) : null}
    </div>
  );
}
