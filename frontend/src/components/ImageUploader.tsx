import React from 'react';
import {
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  uri: string | null;
  onPick: (uri: string) => void;
  label?: string;
}

export function ImageUploader({ uri, onPick, label = 'Upload Photo' }: Props) {
  const pick = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={pick} activeOpacity={0.8}>
      {uri ? (
        <Image source={{ uri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.icon}>📷</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      {uri && (
        <View style={styles.overlay}>
          <Text style={styles.changeText}>Tap to change</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#7c3aed',
    borderStyle: 'dashed',
    alignSelf: 'center',
  },
  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e3a',
    gap: 8,
  },
  icon: {
    fontSize: 40,
  },
  label: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 6,
    alignItems: 'center',
  },
  changeText: {
    color: '#fff',
    fontSize: 12,
  },
});
