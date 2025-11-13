import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';

type Props = {
  title: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function Button({ title, onPress, style, disabled }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, style, disabled ? styles.disabled : undefined]} disabled={disabled}>
      <ThemedText type="defaultSemiBold" style={[styles.txt, disabled ? styles.txtDisabled : undefined]}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
  },
  txt: {
    color: 'white',
  },
  disabled: {
    opacity: 0.5,
  },
  txtDisabled: {
    color: 'rgba(255,255,255,0.8)'
  }
});
