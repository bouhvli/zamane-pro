/**
 * The loader: three zellige shapes (a khatam star, a hexagon, a four-point star) that turn in different directions
 * (clockwise, anti-clockwise, and a flip on the vertical axis). It replaces visible "Loading…" text. The shapes are
 * pure CSS (`.zload` in base.css), so index.html can use the same markup before React starts.
 *
 * `label` is spoken (polite status) and never drawn. Without a label the loader is decorative and the caller says
 * what is happening some other way (a button's hidden pending text, for instance). `mono` draws the shapes in the
 * surrounding text colour, for filled buttons where the zellige colours would disappear.
 */
export function Loader({
  label,
  mono,
  size,
  className,
}: {
  label?: string;
  mono?: boolean;
  /** CSS size of one shape, in px (default 16). */
  size?: number;
  className?: string;
}) {
  const cls = ["zload", mono && "zload--mono", className].filter(Boolean).join(" ");
  const style = size ? ({ "--zload-size": `${size}px` } as React.CSSProperties) : undefined;
  const shapes = (
    <>
      <i />
      <i />
      <i />
    </>
  );
  return label ? (
    <span className={cls} style={style} role="status">
      {shapes}
      <span className="vh">{label}</span>
    </span>
  ) : (
    <span className={cls} style={style} aria-hidden="true">
      {shapes}
    </span>
  );
}
