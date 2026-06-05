import { API_BASE_URL } from "./api-config";

export interface LoginResponse {
  token: string;
  userId: string;
  role: string;
}

export interface ApiError {
  status: number;
  error?: string;
  message?: string;
  userId?: string;
  otpLength?: number;
  expiresInMinutes?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, ...data } as ApiError;
  }
  return data as T;
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<LoginResponse>(res);
}

export async function verifyEmailApi(userId: string, code: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code }),
  });
  return handleResponse<LoginResponse>(res);
}

export async function resendCodeApi(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/resend-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw { status: res.status, ...data } as ApiError;
  }
}

export async function getUserProfileApi(token: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/user/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<UserProfile>(res);
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  location: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export async function getAdminUsersApi(token: string, limit = 200, offset = 0): Promise<{ users: AdminUser[]; total: number }> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateUserRoleApi(token: string, userId: string, role: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  return handleResponse(res);
}

export async function deleteAdminUserApi(token: string, userId: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function registerUserApi(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdBy?: number;
}): Promise<{ userId: string; message: string; otpLength?: number }> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
