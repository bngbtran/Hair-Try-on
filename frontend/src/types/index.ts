export interface Hairstyle {
  id: string;
  name: string;
  description?: string;
  color?: string;
  style_type?: string;
  tags: string[];
  image_url?: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

export interface HairstyleCreate {
  name: string;
  description?: string;
  color?: string;
  style_type?: string;
  tags?: string[];
}

export interface HairstyleUpdate {
  name?: string;
  description?: string;
  color?: string;
  style_type?: string;
  tags?: string[];
}

export interface FaceDetectResult {
  detected: boolean;
  bbox: { x: number; y: number; w: number; h: number };
  left_eye: [number, number];
  right_eye: [number, number];
  nose_tip: [number, number];
  landmark_count: number;
}

export type TryOnStatus = 'idle' | 'detecting' | 'processing' | 'done' | 'error';
