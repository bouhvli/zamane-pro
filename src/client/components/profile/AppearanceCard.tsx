import { useState } from "react";
import { isIOS, LOGOS, setLogo, useLogo, type Logo } from "../../lib/logo.ts";
import { getTheme, setTheme, type Theme } from "../../lib/theme.ts";
import { Icon } from "../Icon.tsx";
import { CardHead } from "./Zellige.tsx";

const OPTIONS: [Theme, string][] = [
  ["system", "Same as this phone"],
  ["light", "Light"],
  ["dark", "Dark"],
];

const LOGO_OPTIONS: [Logo, string][] = [
  ["classic", "Calligraphy"],
  ["tiles", "Tiles"],
];

/** What happens to the installed app's icon after a change: browsers update it themselves, iOS never does. */
function logoNote(changed: boolean): string {
  if (!changed) return "Used in the app and for its icon on this device's home screen. Saved on this device only.";
  if (isIOS()) {
    return "Changed in the app. On iPhone and iPad, the home-screen icon changes only if you remove Zamane and add it again (Share, then Add to Home Screen).";
  }
  return "Changed in the app. The home-screen icon follows when your browser next updates the app, usually within a day. It may ask you to confirm.";
}

/**
 * The theme choice as three set tiles: star-and-cross in that theme's colours (the system one split diagonally).
 * Then the logo as two tiles showing each app icon, as it sits on a home screen. Real radio inputs sit on top of
 * each tile, so arrow keys, labels and 44px+ targets come for free. Both choices are per device.
 */
export function AppearanceCard() {
  const [theme, set] = useState<Theme>(getTheme);
  const logo = useLogo();
  const [logoChanged, setLogoChanged] = useState(false);
  return (
    <section className="pf-card" aria-labelledby="pf-look-h">
      <CardHead id="pf-look-h">Appearance</CardHead>
      <fieldset className="pf-theme">
        <legend className="pf-h3">Theme</legend>
        <div className="pf-swatches">
          {OPTIONS.map(([value, label]) => (
            <label className={`pf-sw pf-sw-${value}`} key={value}>
              <input
                className="pf-sw-in"
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => {
                  setTheme(value);
                  set(value);
                }}
              />
              <span className="pf-sw-tile" aria-hidden="true">
                {value === "system" ? (
                  <>
                    <span className="zl pf-sw-pane pf-sw-light-pane" />
                    <span className="zl pf-sw-pane pf-sw-dark-pane" />
                  </>
                ) : (
                  <span className={`zl pf-sw-pane pf-sw-${value}-pane`} />
                )}
                <span className="pf-sw-check">
                  <Icon name="check" />
                </span>
              </span>
              <span className="pf-sw-label">{label}</span>
            </label>
          ))}
        </div>
        <p className="help">Saved on this device only.</p>
      </fieldset>
      <div className="pf-look-set">
        <fieldset className="pf-theme" aria-describedby="pf-logo-note">
          <legend className="pf-h3">Logo</legend>
          <div className="pf-swatches pf-logos">
            {LOGO_OPTIONS.map(([value, label]) => (
              <label className={`pf-sw pf-sw-logo pf-sw-logo-${value}`} key={value}>
                <input
                  className="pf-sw-in"
                  type="radio"
                  name="logo"
                  value={value}
                  checked={logo === value}
                  onChange={() => {
                    setLogo(value);
                    setLogoChanged(true);
                  }}
                />
                <span className="pf-sw-tile pf-logo-tile" aria-hidden="true">
                  <img className="pf-logo-icon" src={LOGOS[value].icon} alt="" width={64} height={64} />
                  <span className="pf-sw-check">
                    <Icon name="check" />
                  </span>
                </span>
                <span className="pf-sw-label">{label}</span>
              </label>
            ))}
          </div>
          <p className="help" id="pf-logo-note" aria-live="polite">
            {logoNote(logoChanged)}
          </p>
        </fieldset>
      </div>
    </section>
  );
}
