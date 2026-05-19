import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { TryOnStatus } from '../types';

const CONFIG: Record<TryOnStatus, { label: string; color: string; spin?: boolean }> = {
  idle:       { label: 'Ready',       color: '#6b7280' },
  detecting:  { label: 'Detecting…',  color: '#f59e0b', spin: true },
  processing: { label: 'Processing…', color: '#3b82f6', spin: true },
  done:       { label: 'Done!',       color: '#10b981' },
  error:      { label: 'Error',       color: '#ef4444' },
};

export function StatusBadge({ status }: { status: TryOnStatus }) {
  const cfg = CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '22', borderColor: cfg.color }]}>
      {cfg.spin && <ActivityIndicator size="small" color={cfg.color} style={{ marginRight: 6 }} />}
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
