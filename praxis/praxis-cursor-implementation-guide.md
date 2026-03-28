# Praxis — Cursor Implementation Guide
**4 Features, Ordered by Priority**

> Paste each section into Cursor's composer (Cmd+I / Ctrl+I) one feature at a time. Complete and test each feature before moving to the next.

---

## Feature 1 — Privacy / Data Deletion Notice on Upload
**Priority: Highest — 1 file change, zero risk, immediate user trust win.**

---

### What we're building
A small, clearly visible notice beneath the file upload area and the pasted-text box on the simulation creation page informing professors that uploaded materials are not used to train the AI model and will be deleted after the simulation is generated.

---

### Step 1 — Locate the creation page

Open `src/app/(dashboard)/create/page.tsx`. This is the main simulation creation form. Identify:
- The file upload input/dropzone component (where PDF, DOCX, TXT files are accepted).
- The pasted-text `<textarea>` or component.

---

### Step 2 — Create a reusable `PrivacyNotice` component

Create a new file at `src/components/ui/privacy-notice.tsx`:

```tsx
import { ShieldCheck } from "lucide-react";

export function PrivacyNotice() {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground mt-2 leading-relaxed">
      <ShieldCheck className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
      <span>
        <strong className="text-foreground font-medium">Your materials are private.</strong>{" "}
        These materials will not be used to train the model. All uploaded files
        are permanently deleted after your simulation is generated.
      </span>
    </p>
  );
}
```

---

### Step 3 — Add the notice to the creation form

In `src/app/(dashboard)/create/page.tsx` (or whatever component renders the upload section):

1. Import `PrivacyNotice` at the top:
   ```tsx
   import { PrivacyNotice } from "@/components/ui/privacy-notice";
   ```

2. Place `<PrivacyNotice />` **immediately below** the file upload dropzone/input area.

3. Place a **second** `<PrivacyNotice />` immediately below the pasted-text textarea.

---

### Step 4 — Verify

Run `pnpm dev`, navigate to `/create`, confirm the notice appears under both input areas. No database or API changes are needed.

---
---

## Feature 2 — Text-Based Course / Subject Field
**Priority: High — Broadens teacher diversity without breaking existing flow.**

---

### What we're building
Currently the creation form has a `courseTopic` field (likely a short text input or a limited category). We are expanding this into a richer, searchable **subject/discipline selector** with a free-text fallback so teachers from any field — not just the original target disciplines — can describe their course clearly. This improves AI prompt context significantly.

---

### Step 1 — Define the subject taxonomy

Create `src/lib/subjects.ts`:

```ts
export const SUBJECT_CATEGORIES = [
  {
    category: "Business & Management",
    subjects: [
      "Accounting", "Business Ethics", "Entrepreneurship", "Finance",
      "Human Resources", "Leadership", "Marketing", "Operations Management",
      "Organizational Behavior", "Strategy & Consulting", "Supply Chain",
    ],
  },
  {
    category: "Law & Policy",
    subjects: [
      "Constitutional Law", "Corporate Law", "Criminal Justice",
      "Environmental Policy", "Healthcare Policy", "International Law",
      "Public Administration", "Public Policy",
    ],
  },
  {
    category: "Health & Medicine",
    subjects: [
      "Clinical Ethics", "Healthcare Management", "Medicine",
      "Nursing", "Pharmacy", "Public Health", "Social Work",
    ],
  },
  {
    category: "Social Sciences",
    subjects: [
      "Anthropology", "Communications", "Economics", "Education",
      "Geography", "Political Science", "Psychology", "Sociology",
    ],
  },
  {
    category: "STEM",
    subjects: [
      "Biology", "Chemistry", "Computer Science", "Data Science",
      "Engineering", "Environmental Science", "Mathematics", "Physics",
    ],
  },
  {
    category: "Humanities & Arts",
    subjects: [
      "Architecture", "Art & Design", "English & Literature",
      "History", "Journalism", "Media Studies", "Philosophy",
    ],
  },
  {
    category: "Other",
    subjects: ["Other / Custom"],
  },
] as const;

export const ALL_SUBJECTS = SUBJECT_CATEGORIES.flatMap((c) => c.subjects);
```

---

### Step 2 — Build the `SubjectSelector` component

Create `src/components/ui/subject-selector.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBJECT_CATEGORIES } from "@/lib/subjects";

interface SubjectSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SubjectSelector({ value, onChange }: SubjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const handleSelect = (subject: string) => {
    if (subject === "Other / Custom") {
      setShowCustom(true);
      onChange("");
    } else {
      setShowCustom(false);
      onChange(subject);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="subject">Course Subject / Discipline</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value && !showCustom ? value : "Select a subject…"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search subjects…" />
            <CommandList>
              <CommandEmpty>No subject found. Choose "Other / Custom".</CommandEmpty>
              {SUBJECT_CATEGORIES.map((cat) => (
                <CommandGroup key={cat.category} heading={cat.category}>
                  {cat.subjects.map((subject) => (
                    <CommandItem
                      key={subject}
                      value={subject}
                      onSelect={() => handleSelect(subject)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === subject ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {subject}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showCustom && (
        <Input
          id="subject-custom"
          placeholder="Describe your course subject…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2"
        />
      )}
      <p className="text-xs text-muted-foreground">
        Helps the AI tailor terminology, examples, and context to your discipline.
      </p>
    </div>
  );
}
```

---

### Step 3 — Replace the existing `courseTopic` input in the creation form

Open `src/app/(dashboard)/create/page.tsx`:

1. Import the component:
   ```tsx
   import { SubjectSelector } from "@/components/ui/subject-selector";
   ```

2. In the form state, ensure there is a `courseTopic` string state variable (it likely already exists). Wire it to `SubjectSelector`:
   ```tsx
   <SubjectSelector
     value={courseTopic}
     onChange={setCoursetopic}
   />
   ```

3. Remove (or comment out) the old plain `<Input>` or `<Select>` that previously handled `courseTopic`.

4. Make sure the `courseTopic` value is still passed to the `FormData` in the submit handler — no API changes needed since the API already reads `courseTopic` as a string.

---

### Step 4 — Update the AI prompt to leverage the subject

Open `src/lib/openai.ts` in `generateSimulationContent()`. Find where the user prompt is built. Locate the line that inserts `courseTopic` and enhance it:

```ts
// BEFORE
`Course topic: ${courseTopic}`

// AFTER
`Course subject / discipline: ${courseTopic}
Please use discipline-appropriate terminology, real-world examples, realistic roles, and professional language conventions specific to the ${courseTopic} field.`
```

---

### Step 5 — Update the `simulations` DB column (optional but recommended)

If you want to filter the library by subject later, run this migration in your Supabase SQL editor:

```sql
-- Add subject column for better library filtering later
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS subject text;

-- Backfill from existing course_topic if the column exists
-- UPDATE simulations SET subject = course_topic WHERE subject IS NULL;
```

Then in `saveGeneratedSimulation()` in `create/page.tsx`, include `subject: courseTopic` in the insert payload.

---

### Step 6 — Verify

Run `pnpm dev`, go to `/create`. Confirm:
- The subject dropdown opens with grouped categories.
- Search filters the list.
- Selecting "Other / Custom" reveals the free-text input.
- The value flows correctly into the generate API call.

---
---

## Feature 3 — Sources Attached to the Simulation
**Priority: Medium-High — Adds academic credibility and transparency.**

---

### What we're building
After a simulation is generated, professors can see which source materials were used (file names + optional URLs/citations). Sources are stored in the DB, displayed in the editor, and shown to students during the background/intro step as "References."

---

### Step 1 — Database migration

Run in Supabase SQL editor:

```sql
-- Sources table
CREATE TABLE IF NOT EXISTS simulation_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  label text NOT NULL,          -- e.g. "HBR Case Study 2023" or filename
  url text,                     -- optional hyperlink
  source_type text NOT NULL DEFAULT 'file', -- 'file' | 'url' | 'text' | 'manual'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE simulation_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors manage own simulation sources"
  ON simulation_sources
  FOR ALL
  USING (
    simulation_id IN (
      SELECT id FROM simulations WHERE professor_id = auth.uid()
    )
  );

CREATE POLICY "Public simulations sources readable"
  ON simulation_sources
  FOR SELECT
  USING (
    simulation_id IN (
      SELECT id FROM simulations WHERE is_public = true
    )
  );
```

---

### Step 2 — Update types

In `src/types/index.ts` (or wherever your shared types live), add:

```ts
export interface SimulationSource {
  id: string;
  simulation_id: string;
  label: string;
  url?: string | null;
  source_type: "file" | "url" | "text" | "manual";
  created_at: string;
}
```

---

### Step 3 — Auto-save sources when simulation is created

Open `src/app/(dashboard)/create/page.tsx`, find `saveGeneratedSimulation()`. After inserting the simulation and related records, add:

```ts
// Build sources from uploaded files
const fileSources = uploadedFilePaths.map((path) => ({
  simulation_id: simulationId,
  label: path.split("/").pop() ?? path, // extract filename
  source_type: "file" as const,
}));

// If there was pasted text
if (pastedText?.trim()) {
  fileSources.push({
    simulation_id: simulationId,
    label: "Pasted course material",
    source_type: "text" as const,
  });
}

if (fileSources.length > 0) {
  await supabase.from("simulation_sources").insert(fileSources);
}
```

---

### Step 4 — Build the `SourcesEditor` component

Create `src/components/simulation/sources-editor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash2, Link, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SimulationSource } from "@/types";

interface SourcesEditorProps {
  simulationId: string;
  sources: SimulationSource[];
  onSave: (sources: SimulationSource[]) => Promise<void>;
}

export function SourcesEditor({ simulationId, sources: initial, onSave }: SourcesEditorProps) {
  const [sources, setSources] = useState(initial);
  const [saving, setSaving] = useState(false);

  const addSource = () => {
    setSources((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        simulation_id: simulationId,
        label: "",
        url: "",
        source_type: "manual",
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const update = (id: string, field: string, value: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const remove = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(sources);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Sources & References</h3>
          <p className="text-xs text-muted-foreground">
            Displayed to students on the background screen as academic references.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addSource}>
          <Plus className="h-4 w-4 mr-1" /> Add Source
        </Button>
      </div>

      {sources.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No sources added yet.</p>
      )}

      {sources.map((source, i) => (
        <div key={source.id} className="flex gap-2 items-start">
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">Label / Citation</Label>
              <Input
                placeholder="e.g. HBR (2023). Managing Crisis…"
                value={source.label}
                onChange={(e) => update(source.id, "label", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={source.source_type}
                onValueChange={(v) => update(source.id, "source_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="file">Uploaded File</SelectItem>
                  <SelectItem value="url">URL / Link</SelectItem>
                  <SelectItem value="text">Pasted Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="text-xs">URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={source.url ?? ""}
                onChange={(e) => update(source.id, "url", e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-5 text-destructive"
            onClick={() => remove(source.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {sources.length > 0 && (
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Sources"}
        </Button>
      )}
    </div>
  );
}
```

---

### Step 5 — Add a sources save handler in the editor

Open `src/app/(dashboard)/edit/[id]/page.tsx`. Add:

1. Fetch sources on load:
   ```ts
   const { data: sources } = await supabase
     .from("simulation_sources")
     .select("*")
     .eq("simulation_id", id);
   ```

2. Add the save handler:
   ```ts
   async function handleSavesSources(updated: SimulationSource[]) {
     // Delete all existing for this simulation, reinsert
     await supabase
       .from("simulation_sources")
       .delete()
       .eq("simulation_id", simulationId);
     if (updated.length > 0) {
       await supabase.from("simulation_sources").insert(
         updated.map(({ id, simulation_id, label, url, source_type }) => ({
           id,
           simulation_id,
           label,
           url,
           source_type,
         }))
       );
     }
   }
   ```

3. Render the editor in the appropriate tab (e.g., a "Sources" tab added to the existing tab list):
   ```tsx
   <SourcesEditor
     simulationId={simulationId}
     sources={sources ?? []}
     onSave={handleSavesSources}
   />
   ```

---

### Step 6 — Display sources to students during play

Open `src/app/play/[code]/page.tsx` (or the component that renders `current_step === 1`, the background step).

1. Fetch sources alongside the simulation:
   ```ts
   const { data: sources } = await supabase
     .from("simulation_sources")
     .select("*")
     .eq("simulation_id", simulation.id);
   ```

2. At the bottom of the background step content, render:
   ```tsx
   {sources && sources.length > 0 && (
     <div className="mt-6 pt-4 border-t border-border">
       <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
         References
       </h4>
       <ul className="space-y-1">
         {sources.map((s) => (
           <li key={s.id} className="text-xs text-muted-foreground">
             {s.url ? (
               <a
                 href={s.url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="underline hover:text-foreground"
               >
                 {s.label}
               </a>
             ) : (
               s.label
             )}
           </li>
         ))}
       </ul>
     </div>
   )}
   ```

---

### Step 7 — Verify

1. Create a new simulation with file uploads. After generation, go to `/edit/[id]` and confirm sources were auto-populated with filenames.
2. Manually add/edit a source with a URL and save.
3. Run a preview session — confirm the References section appears on the background step.

---
---

## Feature 4 — In-App AI Copilot Chatbot for Professors
**Priority: Medium — Significant scope. Build after the above are stable.**

---

### What we're building
A persistent AI chatbot that professors can access from anywhere in the dashboard. It understands Praxis context (what simulations are, how they work, what the professor is currently editing) and helps them create and refine simulations through conversation. Triggered by a small bot icon that appears on input fields to activate "AI mode" for that field.

The chatbot has two modes:
- **Global chat** — a floating panel accessible from any page via a fixed button.
- **Field-level AI** — a bot icon on key input fields that opens a focused prompt to fill that specific field using AI.

---

### Step 1 — Create the API route

Create `src/app/api/copilot/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are Praxis Copilot, an AI assistant built into Praxis — a platform that helps professors create interactive decision-based classroom simulations for higher education.

Simulations in Praxis have:
- A title and subject/discipline
- Background content (the scenario setup students read)
- 3 sequential decisions, each with 3 options (A, B, C) scored 1–3
- Consequences explaining the result of each option
- Reflection questions for post-session debrief
- Optional data blocks (tables, charts, KPI cards, timelines)
- Optional hidden student profiles for asymmetric info scenarios

Your job is to help professors:
1. Come up with simulation ideas for their course
2. Draft and improve background content
3. Write realistic, pedagogically sound decisions and options
4. Write consequences that feel authentic to the discipline
5. Suggest reflection questions
6. Troubleshoot and improve existing simulation content

Always be concise and practical. When writing simulation content, match the tone and terminology of the professor's discipline. Ask clarifying questions when the request is ambiguous.

If the professor gives you a field name (e.g. "write the background"), return the content clearly formatted, ready to paste.`;

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, context } = await req.json();

  // Build context message if provided
  const contextMessage = context
    ? `[Current context: ${JSON.stringify(context)}]\n\n`
    : "";

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...(context
        ? [{ role: "system" as const, content: contextMessage }]
        : []),
      ...messages,
    ],
    max_tokens: 1500,
    stream: false,
  });

  return NextResponse.json({
    message: completion.choices[0].message.content,
  });
}
```

---

### Step 2 — Create the chat state hook

Create `src/hooks/use-copilot.ts`:

```ts
"use client";

import { useState, useCallback } from "react";

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotContext {
  page?: string;
  simulationTitle?: string;
  subject?: string;
  currentField?: string;
}

export function useCopilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (userMessage: string, context?: CopilotContext) => {
      const newMessages: CopilotMessage[] = [
        ...messages,
        { role: "user", content: userMessage },
      ];
      setMessages(newMessages);
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, context }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
        return data.message as string;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  const reset = () => setMessages([]);

  return { messages, loading, error, send, reset };
}
```

---

### Step 3 — Build the global `CopilotPanel` component

Create `src/components/copilot/copilot-panel.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCopilot, type CopilotContext } from "@/hooks/use-copilot";

interface CopilotPanelProps {
  context?: CopilotContext;
}

export function CopilotPanel({ context }: CopilotPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, send, reset } = useCopilot();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    await send(msg, context);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          open && "rotate-12"
        )}
        aria-label="Open Praxis Copilot"
      >
        <Bot className="h-5 w-5" />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-22 right-6 z-50 flex w-[360px] flex-col rounded-xl border bg-background shadow-2xl overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Praxis Copilot</span>
              {context?.simulationTitle && (
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  · {context.simulationTitle}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset} title="Clear chat">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Hi! I'm your Praxis Copilot 👋</p>
                <p>I can help you:</p>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li>Brainstorm simulation ideas</li>
                  <li>Write background content & decisions</li>
                  <li>Draft consequences & reflection questions</li>
                  <li>Improve existing content</li>
                </ul>
                <p className="text-xs">Try: <em>"Give me 3 simulation ideas for a nursing ethics class."</em></p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "mb-3 max-w-[90%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {loading && (
              <div className="mb-3 max-w-[90%] rounded-lg px-3 py-2 text-sm bg-muted">
                <span className="animate-pulse">Thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your simulation…"
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
```

---

### Step 4 — Add CopilotPanel to the dashboard layout

Open `src/app/(dashboard)/layout.tsx`. Import and render the panel:

```tsx
import { CopilotPanel } from "@/components/copilot/copilot-panel";

// Inside the layout JSX, near the closing </body> or at the end of the dashboard shell:
<CopilotPanel context={{ page: "dashboard" }} />
```

For pages where a simulation is being edited, pass richer context. In `src/app/(dashboard)/edit/[id]/page.tsx`:

```tsx
<CopilotPanel
  context={{
    page: "editor",
    simulationTitle: simulation.title,
    subject: simulation.course_topic,
  }}
/>
```

---

### Step 5 — Build the field-level AI trigger (the bot icon on inputs)

Create `src/components/copilot/ai-field-trigger.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AiFieldTriggerProps {
  fieldLabel: string;         // e.g. "Background Content"
  onApply: (value: string) => void;
  context?: Record<string, string>;
  className?: string;
}

export function AiFieldTrigger({
  fieldLabel,
  onApply,
  context,
  className,
}: AiFieldTriggerProps) {
  const [active, setActive] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Write the "${fieldLabel}" for a simulation. Instructions: ${prompt}`,
            },
          ],
          context,
        }),
      });
      const data = await res.json();
      setResult(data.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setActive((a) => !a)}
        className={cn(
          "absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        )}
        title={`Use AI to write ${fieldLabel}`}
      >
        <Sparkles className="h-3.5 w-3.5" />
      </button>

      {active && (
        <div className="mt-1 rounded-lg border bg-muted/50 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            ✦ AI Mode — {fieldLabel}
          </p>
          <Textarea
            autoFocus
            placeholder={`Describe what you want in the ${fieldLabel}…`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="text-sm min-h-[60px]"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleGenerate} disabled={loading || !prompt.trim()}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {loading ? "Generating…" : "Generate"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setActive(false); setResult(""); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {result && (
            <div className="rounded-md bg-background border p-2 space-y-2">
              <p className="text-xs whitespace-pre-wrap">{result}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onApply(result);
                  setActive(false);
                  setResult("");
                  setPrompt("");
                }}
              >
                ✓ Apply to field
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### Step 6 — Add the AI trigger to key editor fields

Open `src/app/(dashboard)/edit/[id]` components. On each major text area (background content, decision descriptions, consequences), wrap the field with a relative container and add the trigger. Example for the background content field:

```tsx
// Wrap the textarea in a relative div
<div className="relative">
  <Textarea
    value={backgroundContent}
    onChange={(e) => setBackgroundContent(e.target.value)}
    className="pr-8" // make room for the icon
    rows={8}
    placeholder="Describe the scenario students will read…"
  />
  <AiFieldTrigger
    fieldLabel="Background Content"
    onApply={(val) => setBackgroundContent(val)}
    context={{
      simulationTitle: simulation.title,
      subject: simulation.course_topic,
    }}
  />
</div>
```

Repeat this pattern for:
- Each decision's `description` field
- Each option's `consequence` field
- Each reflection question's `question` field
- The `pastedText` field on the `/create` page

---

### Step 7 — Add suggestion chips to the global panel

In `copilot-panel.tsx`, add quick-start suggestion buttons below the empty state:

```tsx
{messages.length === 0 && (
  <div className="flex flex-wrap gap-1.5 mt-3">
    {[
      "Suggest 3 simulation ideas",
      "Help me write a decision",
      "What makes a good consequence?",
      "Write a reflection question",
    ].map((chip) => (
      <button
        key={chip}
        className="text-xs rounded-full border px-2.5 py-1 hover:bg-muted transition-colors"
        onClick={() => send(chip, context)}
      >
        {chip}
      </button>
    ))}
  </div>
)}
```

---

### Step 8 — Rate limiting (important for production)

In `src/app/api/copilot/route.ts`, add a simple per-user rate check using Supabase. Create a `copilot_usage` table to track daily message counts, or use an in-memory map for MVP. At minimum, add:

```ts
// At the top of the POST handler, after auth check
const today = new Date().toISOString().split("T")[0];
const { count } = await supabase
  .from("copilot_usage") // Create this table: id, user_id, date, count
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("date", today);

if ((count ?? 0) >= 100) {
  return NextResponse.json({ error: "Daily limit reached" }, { status: 429 });
}

// After successful response, upsert usage
await supabase.from("copilot_usage").upsert(
  { user_id: user.id, date: today, count: (count ?? 0) + 1 },
  { onConflict: "user_id,date" }
);
```

Create the `copilot_usage` table in Supabase:

```sql
CREATE TABLE IF NOT EXISTS copilot_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE copilot_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own usage" ON copilot_usage FOR ALL USING (user_id = auth.uid());
```

---

### Step 9 — Verify end-to-end

1. Navigate to `/dashboard` — confirm the floating bot button appears in the bottom-right.
2. Click the bot — panel opens, shows welcome message and suggestion chips.
3. Send a message — response streams back.
4. Navigate to `/edit/[id]` — confirm the `✦` sparkle icon appears on the background textarea.
5. Click the sparkle — AI mode panel opens below the field.
6. Enter a prompt, click Generate — content appears with "Apply to field" button.
7. Click Apply — the textarea updates with the generated content.
8. Confirm the global chat shows context-aware responses (mentions the simulation title/subject).

---

## Summary of All File Changes

| Feature | Files Created | Files Modified |
|---|---|---|
| 1. Privacy Notice | `src/components/ui/privacy-notice.tsx` | `src/app/(dashboard)/create/page.tsx` |
| 2. Subject Selector | `src/lib/subjects.ts`, `src/components/ui/subject-selector.tsx` | `create/page.tsx`, `src/lib/openai.ts` |
| 3. Sources | `src/components/simulation/sources-editor.tsx` | `create/page.tsx`, `edit/[id]/page.tsx`, `play/[code]/page.tsx` |
| 4. Copilot | `src/app/api/copilot/route.ts`, `src/hooks/use-copilot.ts`, `src/components/copilot/copilot-panel.tsx`, `src/components/copilot/ai-field-trigger.tsx` | `(dashboard)/layout.tsx`, `edit/[id]/page.tsx`, `create/page.tsx` |

## Database Migrations Required

Run these in order in your Supabase SQL editor before deploying:

1. `simulation_sources` table — Feature 3, Step 1
2. `copilot_usage` table — Feature 4, Step 8
3. Optional: `simulations.subject` column — Feature 2, Step 5
