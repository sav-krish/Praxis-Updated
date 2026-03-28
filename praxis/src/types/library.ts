export interface LibrarySimulationRow {
  id: string;
  title: string;
  course_topic: string;
  difficulty: string | null;
  estimated_minutes: number | null;
  favorite_count: number;
  professor_id: string;
  created_at: string;
  professors: { name: string | null } | null;
}
