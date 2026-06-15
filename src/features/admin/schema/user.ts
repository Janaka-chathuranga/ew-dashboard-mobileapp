import { z } from "zod";

export const createUserSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(80).trim(),
  emailAddress: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  // Roles come from the user_roles master; the value must map to a system role
  // (validated server-side by the Edge Function against the user_role enum).
  roleId: z.string().min(1, "Role is required"),
  companyId: z.string().optional(),
  departmentId: z.string().optional(),
  groupId: z.string().optional(),
  designationId: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
