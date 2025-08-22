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
  priority: Priority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  dueDate?: string;
  customer: UserDto;
  assignedAgent?: UserDto;
  category?: CategoryDto;
  comments: CommentDto[];
  attachments: AttachmentDto[];
}

// Request DTOs
export interface CreateTicketDto {
  title: string;
  description: string;
  customerId: number;
  categoryId?: number;
  priority?: Priority;
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
}
