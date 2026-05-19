import axios from 'axios';
import { Platform } from 'react-native';
import { FACE_API } from './config';
import type { FaceDetectResult } from '../types';

const client = axios.create({ baseURL: FACE_API });

// On web, use native fetch for multipart — Axios mangles mixed file+text FormData
async function webPost(path: string, form: FormData): Promise<Response> {
  const res = await fetch(`${FACE_API}${path}`, { method: 'POST', body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    const err: any = new Error(res.statusText);
    err.response = { data };
    throw err;
  }
  return res;
}

export const faceApi = {
  detect: async (imageUri: string): Promise<FaceDetectResult> => {
    if (Platform.OS === 'web') {
      const blob = await fetch(imageUri).then((r) => r.blob());
      const form = new FormData();
      form.append('file', blob, 'face.jpg');
      const res = await webPost('/face/detect', form);
      return res.json();
    }

    const form = new FormData();
    form.append('file', { uri: imageUri, name: 'face.jpg', type: 'image/jpeg' } as any);
    return client.post<FaceDetectResult>('/face/detect', form).then((r) => r.data);
  },

  tryon: async (faceUri: string, hairstyleId: string): Promise<string> => {
    if (Platform.OS === 'web') {
      const blob = await fetch(faceUri).then((r) => r.blob());
      const form = new FormData();
      form.append('face_image', blob, 'face.jpg');
      form.append('hairstyle_id', hairstyleId);
      const res = await webPost('/face/tryon', form);
      const resultBlob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
      });
    }

    const form = new FormData();
    form.append('face_image', { uri: faceUri, name: 'face.jpg', type: 'image/jpeg' } as any);
    form.append('hairstyle_id', hairstyleId);
    const res = await client.post('/face/tryon', form, { responseType: 'blob' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(res.data);
    });
  },
};
