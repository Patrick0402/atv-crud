import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import { ThemedView } from './themed-view';

export function Card({ style, ...rest }: ViewProps) {
  return <ThemedView style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    backgroundColor: 'transparent',
  },
});
