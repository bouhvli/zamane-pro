import { useState } from "react";
import { isIOS, LOGOS, setLogo, useLogo, type Logo } from "../../lib/logo.ts";
import { getTheme, setTheme, type Theme } from "../../lib/theme.ts";
import { Icon } from "../Icon.tsx";
import { Section } from "./Zellige.tsx";

const OPTIONS: [Theme, string][] = [
  ["system", "Automatic"],
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

/** A small screen in one theme's own colours: a zellige band and a card with two lines of text. */
function Mini({ theme }: { theme: "light" | "dark" }) {
  return (
    <span className={`pf-mini pf-mini-${theme}`}>
      <span className="zl pf-mini-band" />
      <span className="pf-mini-card">
        <span className="pf-mini-l1" />
        <span className="pf-mini-l2" />
      </span>
    </span>
  );
}

/**
 * The theme choice as three tiles, each a small screen in that theme (Automatic split diagonally), then the logo as
 * two tiles showing each app icon as it sits on a home screen. Real radio inputs sit on top of each tile, so arrow
 * keys, labels and 44px+ targets come for free. Both choices are per device.
 */
export function AppearanceCard() {
  const [theme, set] = useState<Theme>(getTheme);
  const logo = useLogo();
  const [logoChanged, setLogoChanged] = useState(false);
  return (
    <Section id="pf-look" title="Appearance">
      <div className="pf-list">
        <div className="pf-item">
          <fieldset className="pf-choice" aria-describedby="pf-theme-note">
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
                        <Mini theme="light" />
                        <Mini theme="dark" />
                      </>
                    ) : (
                      <Mini theme={value} />
                    )}
                    <span className="pf-sw-check">
                      <Icon name="check" />
                    </span>
                  </span>
                  <span className="pf-sw-label">{label}</span>
                </label>
              ))}
            </div>
            <p className="help" id="pf-theme-note">
              Automatic follows this device&apos;s light or dark setting. Saved on this device only.
            </p>
          </fieldset>
        </div>
        <div className="pf-item">
          <fieldset className="pf-choice" aria-describedby="pf-logo-note">
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
      </div>
    </Section>
  );
}
