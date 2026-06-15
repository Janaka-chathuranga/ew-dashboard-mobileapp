import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .or(z.literal(""))
  .optional();

// Strict duration: ordered, integer units w → d → h → m, each optional, at
// least one present. Examples: "2w 4d 6h 45m", "6h 30m", "45m". Rejects bare
// numbers, decimals, wrong order, and unknown units.
const DURATION_RE = /^(\d+w)?(\s*\d+d)?(\s*\d+h)?(\s*\d+m)?$/i;
const durationString = z
  .string()
  .optional()
  .refine(
    (v) => {
      if (!v) return true;
      const t = v.trim();
      if (t === "") return true;
      return DURATION_RE.test(t) && /\d/.test(t);
    },
    "Use the format: 2w 4d 6h 45m  (w=weeks, d=days, h=hours, m=minutes)"
  );

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  description: z.string().max(5000).optional(),
  projectId: z.string().optional(), // optional → defaults to first project
  statusKey: z.string().min(1, "Status is required"),
  assigneeId: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  type: z.enum(["story", "task", "bug", "epic", "subtask"]),
  startDate: dateString,
  dueDate: dateString,
  estimate: durationString,
  spent: durationString,
});

export type TaskInputType = z.infer<typeof taskSchema>;
