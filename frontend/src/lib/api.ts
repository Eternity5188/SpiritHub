import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// 请求拦截器：自动附带 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lj_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lj_token');
      localStorage.removeItem('lj_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── 认证相关 ──────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

// ── 帖子相关 ──────────────────────────────────────────
export const postsApi = {
  list: (params?: { page?: number; limit?: number; tag?: string; q?: string }) =>
    api.get('/posts', { params }),
  get: (id: number) => api.get(`/posts/${id}`),
  create: (data: { title: string; content: string; tags?: string[] }) =>
    api.post('/posts', data),
  like: (id: number) => api.post(`/posts/${id}/like`),
  comment: (id: number, content: string) =>
    api.post(`/posts/${id}/comments`, { content })
};

// ── CoLab 相关 ────────────────────────────────────────
export const colabApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/colab', { params }),
  get: (id: number) => api.get(`/colab/${id}`),
  create: (data: { name: string; description?: string; max_members?: number; tags?: string[] }) =>
    api.post('/colab', data),
  join: (id: number) => api.post(`/colab/${id}/join`),
  updateStatus: (id: number, status: string) => api.put(`/colab/${id}/status`, { status })
};

// ── 灵创值相关 ────────────────────────────────────────
export const pointsApi = {
  history: (params?: { page?: number; limit?: number }) =>
    api.get('/points/history', { params }),
  leaderboard: (limit?: number) =>
    api.get('/points/leaderboard', { params: { limit } }),
  packages: () =>
    api.get('/points/packages'),
  /** @deprecated 请改用 createOrder + confirmPayment */
  recharge: (packageId: number) =>
    api.post(`/points/recharge/${packageId}`),
  /** 创建充值订单（返回订单号+二维码信息） */
  createOrder: (packageId: number, payMethod: string = 'wechat') =>
    api.post('/points/create-order', { packageId, payMethod }),
  /** 用户确认已付款 */
  confirmPayment: (orderNo: string) =>
    api.post(`/points/confirm-payment/${orderNo}`),
};

// ── 用户相关 ──────────────────────────────────────────
export const usersApi = {
  profile: (username: string) => api.get(`/users/profile/${username}`),
  updateProfile: (data: { bio?: string; avatar?: string }) =>
    api.put('/users/profile', data)
};

// ── 好友相关 ──────────────────────────────────────────
export const friendsApi = {
  list: () => api.get('/friends'),
  requests: () => api.get('/friends/requests'),
  search: (q: string) => api.get(`/friends/search?q=${encodeURIComponent(q)}`),
  sendRequest: (username: string) => api.post(`/friends/request/${username}`),
  accept: (id: number) => api.post(`/friends/accept/${id}`),
  reject: (id: number) => api.post(`/friends/reject/${id}`),
  remove: (friendId: number) => api.delete(`/friends/${friendId}`),
  messages: (username: string) => api.get(`/friends/messages/${username}`),
  unread: () => api.get('/friends/unread')
};

// ── 聊天室相关 ────────────────────────────────────────
export const roomsApi = {
  list: () => api.get('/rooms'),
  get: (id: number) => api.get(`/rooms/${id}`),
  create: (data: { name: string; description?: string; community: string }) => api.post('/rooms', data),
  update: (id: number, data: { name: string; description?: string }) => api.put(`/rooms/${id}`, data),
  delete: (id: number) => api.delete(`/rooms/${id}`),
  join: (id: number) => api.post(`/rooms/${id}/join`),
  leave: (id: number) => api.post(`/rooms/${id}/leave`),
  kick: (roomId: number, userId: number) => api.delete(`/rooms/${roomId}/members/${userId}`),
  messages: (id: number) => api.get(`/rooms/${id}/messages`)
};

// ── GNN 推荐相关 ───────────────────────────────────────
export const recommendApi = {
  friends: () => api.get('/recommendations/friends'),
  posts: () => api.get('/recommendations/posts'),
};

// ── 科学组相关 ─────────────────────────────────────────
export const scienceApi = {
  list: () => api.get('/science'),
  get: (id: number) => api.get(`/science/${id}`),
  create: (data: { name: string; description?: string; research_domain: string; max_members?: number; tags?: string[] }) =>
    api.post('/science', data),
  apply: (id: number, data: { statement: string; research_background?: string }) =>
    api.post(`/science/${id}/apply`, data),
  myApplication: (id: number) => api.get(`/science/${id}/my-application`),
  getApplications: (id: number) => api.get(`/science/${id}/applications`),
  reviewApplication: (id: number, appId: number, action: 'approve' | 'reject', reviewer_note?: string) =>
    api.post(`/science/${id}/applications/${appId}/review`, { action, reviewer_note }),
  getFiles: (id: number) => api.get(`/science/${id}/files`),
  uploadFile: (id: number, formData: FormData) =>
    api.post(`/science/${id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadFile: (id: number, fileId: number) =>
    api.get(`/science/${id}/files/${fileId}/download`, { responseType: 'blob' }),
  deleteFile: (id: number, fileId: number) => api.delete(`/science/${id}/files/${fileId}`),
  summarizeFile: (id: number, fileId: number) => api.post(`/science/${id}/files/${fileId}/summarize`),
  getThreads: (id: number) => api.get(`/science/${id}/threads`),
  createThread: (id: number, data: { title: string; content: string; thread_type?: string; market?: string | null }) =>
    api.post(`/science/${id}/threads`, data),
  getThread: (id: number, threadId: number) => api.get(`/science/${id}/threads/${threadId}`),
  replyThread: (id: number, threadId: number, content: string) =>
    api.post(`/science/${id}/threads/${threadId}/replies`, { content }),
  deleteGroup: (id: number) => api.delete(`/science/${id}`),
};
