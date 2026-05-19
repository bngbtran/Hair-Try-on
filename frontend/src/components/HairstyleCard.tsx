import React from 'react';
import {
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import type { Hairstyle } from '../types';

interface Props {
  item: Hairstyle;
  selected: boolean;
  onPress: (item: Hairstyle) => void;
}

export function HairstyleCard({ item, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.selected]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      {item.color && <Text style={styles.meta}>{item.color}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 110,
    margin: 6,
    borderRadius: 12,
    backgroundColor: '#1e1e3a',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: '#7c3aed',
  },
  thumbnail: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: '#2d2d50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 10,
  },
  name: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    padding: 6,
  },
  meta: {
    color: '#a78bfa',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
});
