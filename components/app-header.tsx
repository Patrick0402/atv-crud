import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function AppHeader({ title = 'Finanças' }: { title?: string }) {
  return (
    <ThemedView style={styles.container}>
      <View>
        <ThemedText type="title">{title}</ThemedText>
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
});
