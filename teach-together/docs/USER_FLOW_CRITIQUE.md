# User flow critique and suggestions

## Professor flow (current)

1. **Landing** → Login/Signup or Get Started  
2. **Dashboard** → List of simulations, Create New, filter by course  
3. **Create** → Upload materials + intent → Generate → redirect to Edit  
4. **Edit** → Tabs: Content, Decisions, Reflection, Run Settings → Save / Start Live Session  
5. **Session (new)** → Pick simulation → Generate join code → Lobby  
6. **Lobby** → Share code/QR, see participants → Start Simulation  
7. **Session (running)** → Progress, submission counts  
8. **Reports** → Distributions, scores, CSV export  

## Student flow (current)

1. **Join** → Enter code + name → (team selection if applicable) → Waiting  
2. **Play** → Background → Decision 1 → Consequence → … → Decision 3 → Reflection → Results  

---

## What works well

- **Low friction for students:** No account; code + name is enough.  
- **Clear professor path:** Create → Edit → Start Session → Reports.  
- **Run settings** (mode, team size, difficulty/time) are in one place.  
- **Course filter** on dashboard gives a simple “by course” view.  

---

## Pain points and suggestions

### 1. **Landing → app transition**

- **Issue:** “Get Started” and “Try It Now For Free” go to signup; “Join Session” goes to join. No clear “I’m a professor” vs “I’m a student” on the first screen.  
- **Suggestion:** Add a short line under the CTAs: “Instructor? Sign up. Student? Use Join Session with your class code.” Or two clear buttons: “I’m an instructor” → signup, “I’m a student” → join.  

### 2. **Create flow (intent → generate → edit)**

- **Issue:** After “Generate Simulation,” the user is dropped into the full editor. First-time professors may not know they should review every tab (Content, Decisions, Reflection, Settings) before running.  
- **Suggestion:** After first generation, show a one-time “Checklist” or short onboarding: “Review background, 3 decisions, reflection questions, and run settings before your first session.” Optional “Mark as reviewed” to collapse it.  

### 3. **Session start (new session)**

- **Issue:** “Start Live Session” from the editor goes to “new session” and generates a join code. If the professor expected to “resume” or “reuse” a previous code, the flow is not obvious.  
- **Suggestion:** From dashboard/editor, keep “Start Session” as “new session.” In Reports or a future “Past sessions” view, add “Run again” that creates a new session with the same simulation (no change to DB model).  

### 4. **Lobby → Start Simulation**

- **Issue:** Professor must remember to click “Start Simulation” when everyone has joined. No obvious reminder that students are waiting.  
- **Suggestion:** Prominent “Start Simulation” button and a line like “X students waiting. Start when ready.” Consider an optional “Start in 1 minute” countdown to give late joiners a heads-up.  

### 5. **Student: waiting screen**

- **Issue:** Students only see “Waiting for professor to start.” No indication of how many have joined or that their join was successful.  
- **Suggestion:** “You’re in. N students joined. Waiting for the instructor to start.” Reduces anxiety and confirms the code worked.  

### 6. **Student: step-by-step flow**

- **Issue:** After each decision, consequence is shown; then they move on. On small screens, “Next” or “Continue” could be easier to hit.  
- **Suggestion:** Ensure primary action (Continue / Next) is a large, touch-friendly button and that the estimated time (e.g. “Est. ~25 min”) is visible so students can pace themselves.  

### 7. **Post-session (professor)**

- **Issue:** After ending the session, the professor may look for “View report” or “See results.” The path (e.g. from dashboard → simulation card → View Reports) may not be obvious right after the session ends.  
- **Suggestion:** When the professor ends the session, show a clear “Session ended” state with a single CTA: “View report” that links to the report for that run.  

### 8. **Mobile (professor)**

- **Issue:** Creating/editing a simulation on a phone is heavy (lots of form fields and tabs).  
- **Suggestion:** Keep “create/edit” optimized for desktop; ensure “dashboard,” “join session,” “lobby,” and “reports” are fully usable on mobile so professors can at least start sessions and check results on the go.  

---

## Summary table

| Step | Issue | Suggestion |
|------|--------|------------|
| Landing | Unclear instructor vs student | Two paths: “Instructor” / “Student” or short explanatory line |
| After first generate | May skip reviewing content | Optional checklist / onboarding after first generation |
| New session | “Re-run” not obvious | “Run again” from reports or past sessions (same sim, new session) |
| Lobby | Professor may not start | Clear “X waiting” and prominent Start button |
| Student waiting | No confirmation | “You’re in. N joined. Waiting for instructor.” |
| Student play | Small tap targets / pacing | Large Continue button; show est. time |
| After session end | Where to see report? | “View report” CTA right after ending |
| Mobile | Edit on phone is heavy | Prioritize dashboard, lobby, reports on mobile |

Implementing these in order of impact (e.g. “View report” after end, student waiting message, then landing clarity) will make the flow feel more coherent and easier to use.
