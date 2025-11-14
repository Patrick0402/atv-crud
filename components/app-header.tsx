import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function AppHeader({ title = 'Finanças', right }: { title?: string; right?: React.ReactNode }) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.row}>
        <ThemedText type="title">{title}</ThemedText>
        <View style={styles.right}>{right}</View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 40,
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  right: {
    marginLeft: 12,
  },
});
