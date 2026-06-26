import { z } from "zod";

// ----------------------------------------------------------------------------
// Auth
// ----------------------------------------------------------------------------

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email("Enter a valid email address"),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ----------------------------------------------------------------------------
// Category
// ----------------------------------------------------------------------------

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  description: z.string().max(300).optional().nullable(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ----------------------------------------------------------------------------
// Post
// ----------------------------------------------------------------------------

export const createPostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(300),
  content: z.string().min(10, "Content must be at least 10 characters").max(40000),
  categoryId: z.string().min(1, "Category is required"),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  title: z.string().min(5).max(300).optional(),
  content: z.string().min(10).max(40000).optional(),
  categoryId: z.string().min(1).optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const postQuerySchema = z.object({
  categorySlug: z.string().optional(),
  sort: z.enum(["new", "top", "hot"]).default("new"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().optional(), // search query
  authorUsername: z.string().optional(),
});
export type PostQueryInput = z.infer<typeof postQuerySchema>;

// ----------------------------------------------------------------------------
// Comment
// ----------------------------------------------------------------------------

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(10000),
  postId: z.string().min(1),
  parentId: z.string().optional().nullable(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

// ----------------------------------------------------------------------------
// Voting
// ----------------------------------------------------------------------------

export const voteSchema = z.object({
  value: z.enum(["UP", "DOWN", "NONE"]), // NONE = retract vote
});
export type VoteInput = z.infer<typeof voteSchema>;
// ----------------------------------------------------------------------------
// Reporting
// ----------------------------------------------------------------------------

export const reportReasonSchema = z.enum([
  "SPAM",
  "SCAM_FRAUD",
  "HARASSMENT",
  "FAKE_INFORMATION",
  "NSFW",
  "OTHER",
]);

export const createReportSchema = z
  .object({
    reason: reportReasonSchema,
    detail: z.string().max(500).optional(),
    postId: z.string().optional(),
    commentId: z.string().optional(),
  })
  .refine((data) => Boolean(data.postId) !== Boolean(data.commentId), {
    message: "Provide exactly one of postId or commentId.",
  });

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const resolveReportSchema = z.object({
  action: z.enum(["DISMISS", "DELETE_CONTENT", "BAN_USER"]),
});

export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
