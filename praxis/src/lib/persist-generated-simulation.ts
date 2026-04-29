import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/types/database";
import type { GeneratedSimulation } from "@/lib/openai";

export type UploadedFileRef = { path: string; originalName: string };

export type PersistGeneratedSimulationInput = {
  professorId: string;
  professorEmail: string;
  professorName: string | null;
  generated: GeneratedSimulation;
  /** Used when the model omits a title (e.g. create form title). */
  formTitle?: string;
  courseTopic: string;
  difficulty: "easy" | "hard" | "challenge";
  goal: string | null;
  targetDecisions: string | null;
  aiNotes: string | null;
  hiddenProfilesEnabled: boolean;
  /** Stored on `simulations.preferences` (JSON). Drives saved "style" tags from the create form when set. */
  preferences?: Json;
  uploadedFilePaths?: UploadedFileRef[];
  pastedText?: string | null;
};

/** Match create flow: ensure a professors row exists for this auth user. */
export async function ensureProfessorRow(
  supabase: SupabaseClient,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: { name?: string | null };
  }
): Promise<void> {
  const { data: professor } = await supabase
    .from("professors")
    .select("id")
    .eq("id", user.id)
    .single();
  if (professor) return;

  const { error: profError } = await supabase.from("professors").insert({
    id: user.id,
    email: user.email ?? "",
    name: (user.user_metadata?.name as string | undefined) ?? null,
  });
  if (profError) {
    throw new Error(profError.message || "Could not create professor profile");
  }
}

/**
 * Insert simulation graph from AI output (same shape as the Create page save path).
 */
export async function persistGeneratedSimulation(
  supabase: SupabaseClient,
  input: PersistGeneratedSimulationInput
): Promise<string> {
  const { generated } = input;
  const bgContent = generated.backgroundContent ?? "";

  const difficultyEstimates = { easy: 15, hard: 25, challenge: 40 } as const;
  const title =
    generated.title?.trim() ||
    input.formTitle?.trim() ||
    "Untitled Simulation";

  const { data: simulation, error: simError } = await supabase
    .from("simulations")
    .insert({
      professor_id: input.professorId,
      title,
      course_topic: input.courseTopic || "General",
      difficulty: input.difficulty || "hard",
      estimated_minutes: difficultyEstimates[input.difficulty] ?? 25,
      goal: input.goal,
      target_decisions: input.targetDecisions,
      background_content: bgContent,
      ai_notes: input.aiNotes,
      status: "draft",
      hidden_profiles_enabled: input.hiddenProfilesEnabled,
      ...(input.preferences !== undefined ? { preferences: input.preferences } : {}),
    })
    .select()
    .single();

  if (simError) throw new Error(simError.message || "Could not create simulation");

  if (input.uploadedFilePaths?.length) {
    for (const { path, originalName } of input.uploadedFilePaths) {
      const { error: fileError } = await supabase.from("simulation_uploaded_files").insert({
        simulation_id: simulation.id,
        storage_path: path,
        original_name: originalName,
      });
      if (fileError) logger.warn("Could not link uploaded file:", fileError);
    }
  }

  const decisions = Array.isArray(generated.decisions) ? generated.decisions : [];
  if (decisions.length === 0) throw new Error("Generated simulation has no decisions");

  for (let i = 0; i < decisions.length; i++) {
    const genDecision = decisions[i];
    const { data: decision, error: decError } = await supabase
      .from("decisions")
      .insert({
        simulation_id: simulation.id,
        order_num: i + 1,
        prompt: genDecision.prompt,
      })
      .select()
      .single();

    if (decError) throw new Error(decError.message || "Could not save decisions");

    const options = Array.isArray(genDecision.options) ? genDecision.options : [];
    for (const option of options) {
      const { error: optError } = await supabase.from("options").insert({
        decision_id: decision.id,
        label: option.label,
        title: option.title,
        description: option.description ?? null,
        consequence: option.consequence ?? null,
        score: option.score,
      });

      if (optError) throw new Error(optError.message || "Could not save options");
    }
  }

  const questions =
    generated.reflectionQuestions?.length > 0
      ? generated.reflectionQuestions
      : [
          "What were your key takeaways from this simulation?",
          "What did you learn that you can apply in real situations?",
        ];

  for (let i = 0; i < Math.min(questions.length, 2); i++) {
    const { error: refError } = await supabase.from("reflection_questions").insert({
      simulation_id: simulation.id,
      order_num: i + 1,
      question: questions[i],
    });

    if (refError) throw new Error(refError.message || "Could not save reflection questions");
  }

  const dataBlocks = Array.isArray(generated.dataBlocks) ? generated.dataBlocks : [];
  const validTypes = ["table", "bar_chart", "line_chart", "kpi_cards", "timeline", "pie_chart"];
  for (let i = 0; i < dataBlocks.length; i++) {
    const block = dataBlocks[i];
    if (!block || !validTypes.includes(block.block_type) || !block.data) continue;
    const { error: blockError } = await supabase.from("simulation_data_blocks").insert({
      simulation_id: simulation.id,
      order_num: i + 1,
      block_type: block.block_type,
      title: block.title || null,
      data: block.data as unknown as Json,
    });
    if (blockError) logger.warn("Could not save data block:", blockError);
  }

  const fileSources: { simulation_id: string; label: string; source_type: "file" | "text" }[] = [];
  if (input.uploadedFilePaths?.length) {
    for (const { originalName } of input.uploadedFilePaths) {
      fileSources.push({
        simulation_id: simulation.id,
        label: originalName,
        source_type: "file",
      });
    }
  }
  if (input.pastedText?.trim()) {
    fileSources.push({
      simulation_id: simulation.id,
      label: "Pasted course material",
      source_type: "text",
    });
  }
  if (fileSources.length > 0) {
    await supabase.from("simulation_sources").insert(fileSources);
  }

  if (input.hiddenProfilesEnabled) {
    const hp = Array.isArray(generated.hiddenProfiles) ? generated.hiddenProfiles : [];
    const roles =
      hp.length > 0
        ? hp.filter((p) => p?.profile_name?.trim() && p?.private_briefing != null).slice(0, 6)
        : [];
    const toInsert =
      roles.length > 0
        ? roles
        : [
            { profile_name: "Role 1", private_briefing: "Edit this briefing in Run Settings." },
            { profile_name: "Role 2", private_briefing: "Edit this briefing in Run Settings." },
          ];
    for (let i = 0; i < toInsert.length; i++) {
      const p = toInsert[i];
      await supabase.from("simulation_profiles").insert({
        simulation_id: simulation.id,
        profile_name: p.profile_name,
        private_briefing: p.private_briefing,
        order_num: i + 1,
      });
    }
  }

  return simulation.id;
}
