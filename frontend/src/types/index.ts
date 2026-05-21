export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  lingjing_points: number;
  avatar?: string;
  bio?: string;
  created_at?: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  tags: string[];
  likes_count: number;
  views_count: number;
  comments_count: number;
  created_at: string;
  author_id: number;
  author_name: string;
  author_avatar?: string;
  author_points: number;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  avatar?: string;
  content: string;
  created_at: string;
}

export interface ColabProject {
  id: number;
  creator_id: number;
  creator_name: string;
  creator_avatar?: string;
  name: string;
  description: string;
  status: 'recruiting' | 'active' | 'completed';
  max_members: number;
  current_members: number;
  tags: string[];
  created_at: string;
}

export interface ColabMember {
  id: number;
  username: string;
  avatar?: string;
  lingjing_points: number;
  role: 'creator' | 'member';
  joined_at: string;
}

export interface PointsRecord {
  id: number;
  amount: number;
  reason: string;
  related_type?: string;
  related_id?: number;
  created_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// ── 科学组类型 ──────────────────────────────────────────
export interface ScienceGroup {
  id: number;
  name: string;
  description: string;
  research_domain: string;
  lead_id: number;
  lead_name: string;
  lead_avatar?: string;
  max_members: number;
  current_members: number;
  status: 'recruiting' | 'active' | 'closed';
  tags: string[];
  created_at: string;
}

export interface ScienceMember {
  id: number;
  username: string;
  avatar?: string;
  lingjing_points: number;
  role: 'lead' | 'member';
  joined_at: string;
}

export interface ScienceApplication {
  id: number;
  group_id: number;
  user_id: number;
  username?: string;
  avatar?: string;
  lingjing_points?: number;
  statement: string;
  research_background: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_note: string;
  created_at: string;
  reviewed_at?: string;
}

export interface ScienceFile {
  id: number;
  group_id: number;
  uploader_id: number;
  uploader_name: string;
  uploader_avatar?: string;
  original_name: string;
  stored_name: string;
  file_type: string;
  file_size: number;
  display_title: string;
  description: string;
  category: string;
  market_tags: string[];
  ai_summary: string | null;
  created_at: string;
}

export interface ScienceThread {
  id: number;
  group_id: number;
  creator_id: number;
  creator_name: string;
  creator_avatar?: string;
  title: string;
  content: string;
  thread_type: 'discussion' | 'research' | 'proposal' | 'report';
  market: string | null;
  pinned: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScienceReply {
  id: number;
  thread_id: number;
  user_id: number;
  username: string;
  avatar?: string;
  lingjing_points: number;
  content: string;
  created_at: string;
}
