import axios from 'axios';
import { Platform } from 'react-native';
import { HAIRSTYLE_API } from './config';
import type { Hairstyle, HairstyleCreate, HairstyleUpdate } from '../types';

const client = axios.create({ baseURL: HAIRSTYLE_API });

async function webPostForm(path: string, form: FormData): Promise<any> {
  const res = await fetch(`${HAIRSTYLE_API}${path}`, { method: 'POST', body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    const err: any = new Error(res.statusText);
    err.response = { data };
    throw err;
  }
  return res.json();
}

export const hairstyleApi = {
  list: () =>
    client.get<Hairstyle[]>('/hairstyles/').then((r) => r.data),

  get: (id: string) =>
    client.get<Hairstyle>(`/hairstyles/${id}`).then((r) => r.data),

  create: (data: HairstyleCreate) =>
    client.post<Hairstyle>('/hairstyles/', data).then((r) => r.data),

  update: (id: string, data: HairstyleUpdate) =>
    client.patch<Hairstyle>(`/hairstyles/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/hairstyles/${id}`),

  uploadImage: async (id: string, uri: string, fileName: string): Promise<Hairstyle> => {
    if (Platform.OS === 'web') {
      const blob = await fetch(uri).then((r) => r.blob());
      const form = new FormData();
      form.append('file', blob, fileName);
      return webPostForm(`/hairstyles/${id}/upload`, form);
    }

    const form = new FormData();
    form.append('file', { uri, name: fileName, type: 'image/png' } as any);
    return client.post<Hairstyle>(`/hairstyles/${id}/upload`, form).then((r) => r.data);
  },
};
