# Data Tables & Visual Data for Simulations — Brainstorm

Context: Praxis is a decision-based classroom simulation tool. Professors create scenarios (e.g. business cases) with background context, 3 decisions with options, and reflection questions. This doc brainstorms where and how to add **data tables** and **visual data** to make simulations richer and more realistic.

---

## 1. Where data tables make sense

### 1.1 Background / context (editor + student view)

- **Financial / ops cases:** Revenue, costs, headcount, timelines (e.g. quarterly figures, budget breakdown).
- **Market / strategy cases:** Market size, share, growth; competitor comparison; segment data.
- **HR / org cases:** Turnover, engagement scores, salary bands, team composition.
- **Compliance / risk:** Incident counts, audit findings, risk ratings by category.

Tables here let students **ground decisions in numbers** instead of only prose. The build spec already allows “Add table to organize data (optional)” in Section B.

**Implementation ideas:**

- In the simulation editor: rich-text or markdown with table support (e.g. markdown tables), or a dedicated “Data block” that renders as an accessible HTML table.
- Optional “Data appendix” section: separate tab or collapsible with 2–3 tables (e.g. “Exhibit 1”, “Exhibit 2”) that students can reference during decisions.

### 1.2 Decision options (professor authoring)

- Show **comparison tables** for options (e.g. Option A vs B vs C: cost, risk, timeline, impact).
- Not necessarily in the first version; could be a “summary table” the professor can optionally add below the options.

### 1.3 Reports (post-session)

- **Decision distribution:** Already planned (e.g. % A / B / C per decision). Could be a small table as well as a chart.
- **Scores by team/participant:** Table: Team name, Decision 1 choice, Decision 2 choice, Decision 3 choice, Total score, Optional link to justifications/reflections.
- **Export:** CSV is already planned; ensure columns align with a clear “data table” view (one row per team/participant, one column per decision and score).

---

## 2. Visual data (charts / graphs)

- **In background context:** Line chart (e.g. revenue over time), bar chart (e.g. segment performance), simple pie (e.g. budget split). Helps case feel like a real briefing.
- **In reports:** Bar chart for decision distribution; optional simple chart for score distribution (e.g. histogram of total scores).
- **Tech:** Use existing or lightweight charting (e.g. Recharts, or CSS-based bars for simple %). Keep images/figures optional so professors can upload a single “Exhibit” image if they prefer.

---

## 3. Suggested priority

| Priority | Feature | Rationale |
|----------|---------|-----------|
| P1 | Tables in background/context (markdown or data block) | Directly improves “simulation quality”; many cases need numbers. |
| P2 | Report table: teams × decisions × scores | Supports debrief and aligns with CSV export. |
| P2 | Charts in reports (decision distribution, score summary) | Already in build spec; visual and table complement each other. |
| P3 | Optional “Exhibit” images or data appendix | Flexibility for complex cases. |
| P3 | Comparison table for options (A/B/C) | Nice-to-have for professor authoring. |

---

## 4. Accessibility and mobile

- Tables: Use proper `<table>`, `<th>`, `<caption>` (or aria) so screen readers and narrow viewports work. Consider horizontal scroll wrapper for wide tables on mobile.
- Charts: Provide a text or table fallback (e.g. “52% chose B”) so the same info is available without the graphic.

---

## 5. Next steps

1. Confirm with product: which of the above to implement first (suggest: tables in context + report table).
2. If “tables in context”: decide markdown-only vs dedicated “Data block” component and add to editor + student view.
3. Add report table view (and optional chart) on the reports page and ensure CSV matches.
