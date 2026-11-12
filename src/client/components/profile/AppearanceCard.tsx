import { useState } from "react";
import { getTheme, setTheme, type Theme } from "../../lib/theme.ts";
import { Icon } from "../Icon.tsx";
import { CardHead } from "./Zellige.tsx";

const OPTIONS: [Theme, string][] = [
  ["system", "Same as this phone"],
  ["light", "Light"],
  ["dark", "Dark"],
];

/**
 * The theme choice as three set tiles: star-and-cross in that theme's colours (the system one split diagonally).
 * Real radio inputs sit on top of each tile, so arrow keys, labels and 44px+ targets come for free.
 */
export function AppearanceCard() {
  const [theme, set] = useState<Theme>(getTheme);
  return (
    <section className="pf-card" aria-labelledby="pf-look-h">
      <CardHead id="pf-look-h">Appearance</CardHead>
      <fieldset className="pf-theme">
        <legend className="vh">Theme</legend>
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
    </section>
  );
}
