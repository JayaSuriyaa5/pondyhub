import type {
  Role,
  VoteValue,
  ReportReason,
  ReportStatus,
} from "@prisma/client";
// ----------------------------------------------------------------------------
// Auth
// ----------------------------------------------------------------------------

export interface JwtAccessPayload {
  sub: string; // user id
  username: string;
  role: Role;
}

export interface JwtRefreshPayload {
  sub: string; // user id
  tokenVersion?: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: Role;
  isBanned: boolean;
  emailVerified: boolean;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// API response envelope
// ----------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

// ----------------------------------------------------------------------------
// Domain DTOs (shape returned by API, not raw Prisma models)
// ----------------------------------------------------------------------------

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount?: number;
  createdAt: string;
}

export interface AuthorDTO {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PostDTO {
  id: string;
  title: string;
  content: string;
  published: boolean;
  author: AuthorDTO;
  category: { id: string; name: string; slug: string };
  score: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  myVote: VoteValue | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentDTO {
  id: string;
  content: string;
  deleted: boolean;
  author: AuthorDTO;
  postId: string;
  parentId: string | null;
  score: number;
  upvotes: number;
  downvotes: number;
  myVote: VoteValue | null;
  createdAt: string;
  updatedAt: string;
  replies: CommentDTO[];
}

export interface ProfileDTO {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  postCount: number;
  commentCount: number;
  karma: number;
}

export interface ProfileCommentDTO {
  id: string;
  content: string;
  deleted: boolean;
  score: number;
  createdAt: string;
  post: { id: string; title: string };
}

export interface AdminUserDTO {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: Role;
  isBanned: boolean;
  createdAt: string;
  postCount: number;
  commentCount: number;
}

export interface AdminPostDTO {
  id: string;
  title: string;
  published: boolean;
  score: number;
  commentCount: number;
  author: { username: string };
  category: { name: string; slug: string };
  createdAt: string;
}

export interface NotificationPayload {
  id: string;
  type: "COMMENT_REPLY" | "POST_COMMENT" | "MENTION" | "POST_VOTE_MILESTONE";
  message: string;
  actorUsername: string;
  postId: string | null;
  commentId: string | null;
  read: boolean;
  createdAt: string;
}

export type PostSort = "new" | "top" | "hot";

export interface ReportDTO {
  id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  createdAt: string;
}

export interface AdminReportGroupDTO {
  targetType: "post" | "comment";
  targetId: string;
  contentPreview: string;
  contentHidden: boolean;
  postIdForComment?: string;
  author: AuthorDTO;
  reportCount: number;
  reporterIds: string[];
  reasons: ReportReason[];
  status: ReportStatus;
  latestReportAt: string;
}