/**
 * The one polite live region (#live, rendered by the root route): status messages such as "Sent again." or
 * "You can try again now.". Cleared first, then set, so the same sentence is read again.
 */
let timer: ReturnType<typeof setTimeout> | undefined;

export function say(message: string) {
  const live = document.getElementById("live");
  if (!live) return;
  live.textContent = "";
  clearTimeout(timer);
  timer = setTimeout(() => {
    live.textContent = message;
  }, 60);
}

/** Document titles are "{screen} – Zamane", unique per screen and state. */
export function setTitle(text: string) {
  document.title = `${text} – Zamane`;
}
