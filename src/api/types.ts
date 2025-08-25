export enum UserRole {
  Customer = 1,
  Agent = 2,
  Admin = 3,
}

export enum TicketStatus {
  New = 1,
  InProgress = 2,
  Resolved = 3,
  Closed = 4,
}

export enum Priority {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

export interface UserDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  company?: string;
  skills?: string[]; // For agents
}

export interface CategoryDto {
  id: number;
  name: string;
  description?: string;
  parentCategoryId?: number;
  level: number;
  isActive: boolean;
  createdAt: string;
  parentCategory?: CategoryDto;
  subCategories: CategoryDto[];
}

export interface AttachmentDto {
  id: number;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: UserDto;
}

export interface CommentDto {
  id: number;
  commentText: string;
  isInternal: boolean;
  createdAt: string;
  user: UserDto;
}

export interface TicketResponseDto {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  resolvedAt?: string;
  customer: UserDto;
  assignedAgent?: UserDto;
  category?: CategoryDto;
  comments: CommentDto[];
  attachments: AttachmentDto[];
  businessImpact?: BusinessImpactDto;
  aiAnalysis?: AiAnalysisDto;
  feedback?: FeedbackDto;
}

// Business Impact Assessment
export enum BlockingLevel {
  NotBlocking = 1,
  Partially = 2,
  Completely = 3,
  SystemDown = 4,
}

export enum AffectedUsers {
  JustMe = 1,
  MyTeam = 2,
  Department = 3,
  WholeCompany = 4,
}

export interface BusinessImpactDto {
  blockingLevel: BlockingLevel;
  affectedUsers: AffectedUsers;
  urgentDeadline?: string;
  additionalContext?: string;
}

// AI Analysis
export interface AiAnalysisDto {
  category: string;
  categoryConfidence: number;
  priority: Priority;
  sentiment: number; // 0-1 scale
  keywords: string[];
  suggestedResponse?: string;
}

export interface FeedbackDto {
  id: number;
  ticketId: number;
  customerId: number;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: string;
}

// Request DTOs
export interface CreateTicketDto {
  title: string;
  description: string;
  customerId: number;
  businessImpact: BusinessImpactDto;
  categoryId?: number;
  dueDate?: string;
}

export interface AddCommentDto {
  commentText: string;
  isInternal?: boolean;
}

// Filters and helpers
export interface TicketFilters {
  status?: TicketStatus;
  customerId?: number;
  agentId?: number;
  search?: string;
  includeEscalated?: boolean;
}
