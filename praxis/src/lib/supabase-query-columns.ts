/**
 * Single source of truth for Supabase `.select(...)` column lists.
 * Prefer these over `*` on list/summary routes to reduce payload size.
 */

export const SIMULATION_DASHBOARD_LIST =
  "id, title, course_topic, mode, difficulty, preferences, updated_at" as const;

/** Full simulation row for the editor (explicit list avoids accidental wide reads). */
export const SIMULATION_EDITOR_ROW =
  "id, professor_id, title, course_topic, goal, target_decisions, background_content, ai_notes, mode, team_size, team_assignment, justification_type, difficulty, estimated_minutes, status, preferences, is_public, favorite_count, hidden_profiles_enabled, is_pinned, pinned_order, created_at, updated_at" as const;

export const SIMULATION_REPORTS_HEADER = "id, title, mode, justification_type" as const;

export const REFLECTION_QUESTION_EDITOR_ROW =
  "id, simulation_id, order_num, question, created_at" as const;

export const SIMULATION_DATA_BLOCK_EDITOR_ROW =
  "id, simulation_id, order_num, block_type, title, data, created_at" as const;

export const SIMULATION_PROFILE_EDITOR_ROW =
  "id, simulation_id, profile_name, private_briefing, order_num, created_at" as const;

export const SIMULATION_SOURCE_EDITOR_ROW =
  "id, simulation_id, label, url, source_type, created_at" as const;

export const SIMULATION_SCENARIO_IMAGE_ROW =
  "id, simulation_id, storage_path, alt_text, order_num, created_at" as const;

export const SESSION_LOBBY_ROW =
  "id, simulation_id, join_code, response_gallery_access_code, status, current_step, started_at, ended_at, debrief_guide, video_gallery_share_id, is_preview, student_flow_settings, created_at" as const;

export const SESSION_LOBBY_SIMULATION =
  "id, title, mode, team_assignment, team_size, hidden_profiles_enabled, preferences" as const;

export const SESSION_REPORTS_LIST = "id, status, started_at, ended_at, created_at" as const;

export const SESSION_REPORTS_SELECTED =
  "id, simulation_id, debrief_guide, status, video_gallery_share_id, response_gallery_access_code, join_code" as const;

export const PARTICIPANT_LOBBY_ROW =
  "id, session_id, team_id, user_id, profile_id, name, is_voter, joined_at" as const;

export const TEAM_LOBBY_ROW = "id, session_id, name, created_at" as const;

export const PROFILE_PAGE_ROW = "id, name, library_show_display_name" as const;

export const PARTICIPANT_REPORTS_ROW =
  "id, session_id, team_id, name, joined_at" as const;

export const TEAM_REPORTS_ROW = "id, session_id, name" as const;

export const RESPONSE_REPORTS_ROW =
  "id, session_id, participant_id, team_id, decision_id, option_id, justification, submitted_at" as const;

export const SIMULATION_PROFILE_LOBBY_ROW =
  "id, simulation_id, profile_name, private_briefing, order_num, created_at" as const;
