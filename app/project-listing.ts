import { and, eq, or, sql } from "drizzle-orm";
import { projects } from "../db/schema";

export const realProject = eq(projects.sample, 0);
export const publishedProject = and(realProject, eq(projects.archivedAt, ""),
  or(eq(projects.active, 1), eq(projects.visibility, "listed"), eq(projects.visibility, "paused")));
export const cardFields = {
  id: projects.id, title: projects.title, category: projects.category, description: projects.description,
  location: projects.location, pair: projects.pair, rate: projects.rate, active: projects.active,
  visibility: projects.visibility, targetStart: projects.targetStart, deadline: projects.deadline,
  languages: sql<string>`coalesce((select languages from project_recruitment where project_id=${projects.id}), '')`,
  devices: sql<string>`coalesce((select devices from project_recruitment where project_id=${projects.id}), '')`,
};
