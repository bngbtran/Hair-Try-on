import Constants from 'expo-constants';

// Override via app.json extra or environment
const extra = Constants.expoConfig?.extra ?? {};

export const HAIRSTYLE_API = (extra.hairstyleApi as string) ?? 'http://localhost:8001';
export const FACE_API      = (extra.faceApi as string)      ?? 'http://localhost:8002';
