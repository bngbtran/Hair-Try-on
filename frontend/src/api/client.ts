import { Platform } from 'react-native';

export const BASE_URL = 'http://localhost:8000';

export interface Hairstyle {
  id: number;
  name: string;
  image_path: string;
  preview_path?: string;
  created_at?: string;
}

export function hairImageUrl(imagePath: string): string {
  return `${BASE_URL}/${imagePath.replace(/\\/g, '/')}`;
}

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

async function appendImage(form: FormData, key: string, uri: string, mimeType = 'image/jpeg') {
  if (Platform.OS === 'web') {
    const blob = await uriToBlob(uri);
    form.append(key, blob, `${key}.jpg`);
  } else {
    (form as any).append(key, { uri, name: `${key}.jpg`, type: mimeType });
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Hairstyle CRUD ────────────────────────────────────────────────────────────

export async function getHairstyles(): Promise<Hairstyle[]> {
  const res = await fetch(`${BASE_URL}/admin/hairstyles`);
  if (!res.ok) throw new Error('Không tải được danh sách kiểu tóc');
  return res.json();
}

export async function uploadHairstyle(name: string, imageUri: string): Promise<Hairstyle> {
  const form = new FormData();
  form.append('name', name);
  await appendImage(form, 'image', imageUri);
  const res = await fetch(`${BASE_URL}/admin/upload-hairstyle`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload thất bại');
  }
  return res.json();
}

export async function updateHairstyle(id: number, name?: string, imageUri?: string): Promise<Hairstyle> {
  const form = new FormData();
  if (name) form.append('name', name);
  if (imageUri) await appendImage(form, 'image', imageUri);
  const res = await fetch(`${BASE_URL}/admin/hairstyles/${id}`, { method: 'PUT', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Cập nhật thất bại');
  }
  return res.json();
}

export async function deleteHairstyle(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/admin/hairstyles/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Xoá thất bại');
  }
}

// ── Try-On ────────────────────────────────────────────────────────────────────

export async function tryOnHairstyle(personUri: string, hairstyleId: number): Promise<string> {
  const form = new FormData();
  form.append('hairstyle_id', String(hairstyleId));
  await appendImage(form, 'person_image', personUri);
  const res = await fetch(`${BASE_URL}/tryon`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Xử lý thất bại');
  }
  const blob = await res.blob();
  return blobToDataUrl(blob);
}
