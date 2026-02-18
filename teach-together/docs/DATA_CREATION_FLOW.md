# How Data Blocks Are Created When a User Creates a Simulation

This document explains how **data blocks** (tables, charts, timelines, KPI cards, pie charts) are created and stored when a professor creates a simulation in Praxis.

---

## Overview

When a professor creates a simulation, they can either **Generate with AI** or **Create Manually**. Data blocks are created differently in each flow.

---

## 1. Generate with AI

When the professor clicks **"Generate with AI"** on the Create page:

1. **Inputs sent to OpenAI**
   - Simulation title, course/topic, goal, target decisions
   - Uploaded files (PDF, DOCX, TXT) — text is extracted
   - Pasted text and optional AI grounding notes

2. **AI generates content**
   The prompt instructs the model to produce:
   - `backgroundContent` — narrative scenario (1–2 pages)
   - `dataBlocks` — 1–3 structured visualizations
   - `decisions` — 3 decision points with 3 options each
   - `reflectionQuestions` — 2 questions

3. **Data block types and formats**
   The AI chooses block types based on the scenario:

   | Type        | When to use                          | Data format                                                                 |
   |-------------|--------------------------------------|-----------------------------------------------------------------------------|
   | `table`     | Lists, comparisons, financials       | `{ headers: string[], rows: string[][] }`                                  |
   | `bar_chart` | Category comparisons                 | `{ labels: string[], values: number[] }`                                    |
   | `line_chart`| Trends over time                     | `{ xLabel: string, series: [{ label, data: [{ x, y }] }] }`               |
   | `kpi_cards` | Key metrics                          | `{ items: [{ label, value, subtext? }] }`                                   |
   | `timeline`  | Event sequences                      | `{ events: [{ date, title, detail? }] }`                                   |
   | `pie_chart` | Parts of a whole (budget, share)      | `{ labels: string[], values: number[] }`                                    |

4. **Validation and persistence**
   - Block types are checked against the allowlist.
   - Invalid blocks are dropped; up to 5 blocks are kept.
   - Each block is inserted into `simulation_data_blocks` with `order_num`, `block_type`, `title`, and `data` (JSONB).

5. **Professor can edit**
   In the editor’s Background step, under **Data & Visuals**, professors can:
   - Add new blocks (table, bar chart, line chart, KPI cards, timeline, pie chart)
   - Edit AI-generated blocks
   - Delete blocks
   - Reorder by deleting and re-adding

---

## 2. Create Manually

When the professor clicks **"Create Manually"**:

1. A simulation record is created with the provided title, course, goal, and target decisions.
2. **No data blocks** are created. The professor must add them in the editor.
3. In the Background step, they use **"Add data block"** and choose a type.
4. Each type has its own editor:
   - **Table** — direct cell editing in a grid
   - **Bar chart** — labels and values (comma-separated)
   - **Line chart** — structured series data
   - **KPI cards** — per-card label, value, and optional subtext
   - **Timeline** — events with date, title, and optional detail
   - **Pie chart** — labels and values (same format as bar chart)

---

## 3. Storage

All data blocks are stored in the `simulation_data_blocks` table:

```sql
CREATE TABLE simulation_data_blocks (
  id UUID PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES simulations(id),
  order_num INTEGER NOT NULL,
  block_type TEXT NOT NULL,  -- table | bar_chart | line_chart | kpi_cards | timeline | pie_chart
  title TEXT,
  data JSONB NOT NULL,       -- structure depends on block_type
  created_at TIMESTAMPTZ
);
```

The `data` column holds the JSON structure for each block type. RLS policies allow professors to manage their own blocks; anyone can read (for the student play view).

---

## 4. Student View

When students play a simulation, they see:

1. **Background** — the narrative (`background_content`) plus any data blocks
2. Each block is rendered by `DataBlockRenderer`:
   - Tables as HTML tables
   - Bar/line/pie charts via Recharts
   - KPI cards as a grid
   - Timelines as a vertical event list

Data blocks appear in `order_num` sequence, interleaved with the narrative so students can use them for their decisions.
