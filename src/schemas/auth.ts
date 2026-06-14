import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

// Self-signup creates a profile (handle_new_user trigger; role defaults to
// "member") with the chosen company/department/designation. Permission flags
// remain an admin concern (Hard Rule #2) and are never collected here.
export const signUpSchema = z
  .object({
    display_name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must be less than 80 characters")
      .trim(),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
    company_id: z.string().optional(),
    department_id: z.string().optional(),
    designation_id: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

// TypeScript types for the schemas
export type SignInInputType = z.infer<typeof signInSchema>;
export type SignUpInputType = z.infer<typeof signUpSchema>;
export type ForgotPasswordInputType = z.infer<typeof forgotPasswordSchema>;
