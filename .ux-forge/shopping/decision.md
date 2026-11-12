# Decision: Shopping, direction A · Aisle ledger, with C's pencil stroke on bought names

Chosen by the user (Thu 12 Nov 2026) from the three directions in `directions.md`.

- **Direction:** A. Flat rows on the sand, hairlines, Young Serif group heads with a dotted leader and the subtotal flush right; the summary breakdown is the same dotted-leader slip. Figtree tabular numbers for every amount.
- **Graft (recommended by the Art Director, accepted):** C's pencil stroke across a ticked name (one 180 ms stroke, `::after`, no layout change; the word stays readable at 6:1 or better and the meta line still says "Bought by …"; a queued tick draws it dashed; reduced motion: no animation).
- **Design system role:** skipped, as for Goals and Trips. The tokens exist; additions (`--row-min`, `--tick-hit`, `--dock-h`, `--leader`, and `--ease-out` only if missing) go in `build-notes.md`.
- **Rules held:** zellige = done, no saffron, terracotta is partner B only, no arch, 44 px targets in rows of at least 56 px, rows never move under the thumb (only on Tidy up, route entry or foreground).
- **Build split:** (1) shared layer + list (add row, summary, groups, done group, states); (2) item sheet, item form, confirmations. Then one review round (Critic + Accessibility), one fix pass, then the React port.
