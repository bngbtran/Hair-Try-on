import { useState, useCallback, useEffect } from 'react';
import { hairstyleApi } from '../services/hairstyleApi';
import type { Hairstyle } from '../types';

export function useHairstyles() {
  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHairstyles(await hairstyleApi.list());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load hairstyles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { hairstyles, loading, error, refresh };
}
