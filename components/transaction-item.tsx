import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatCurrency } from '@/lib/format';
import { Transaction } from '@/types/transaction';
import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { Card } from './card';

type Props = {
  item: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
};

export function TransactionItem({ item, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  // LayoutAnimation is used on press to animate expand/collapse.
  // On modern RN new-architecture the experimental enable call is a no-op
  // and emits a warning; avoid calling it to keep logs clean.

  const kind = item.type ?? 'income';
  const sign = kind === 'income' ? '+' : '-';
  const colorStyle = kind === 'income' ? styles.income : styles.expense;

  return (
    <Pressable onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded((s) => !s); }}>
      <Card style={[styles.row, expanded ? styles.expanded : undefined]}>
        <View style={styles.left}>
          <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
          <ThemedText>{new Date(item.date).toLocaleDateString()}</ThemedText>
          {expanded ? (
            <View style={styles.details}>
              <ThemedText>Categoria: {item.category ?? '—'}</ThemedText>
              <ThemedText>Notas: {item.notes ?? '—'}</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.right}>
          <ThemedText style={[styles.amount, colorStyle]}>{`${sign} ${formatCurrency(item.amount ?? 0)}`}</ThemedText>
          {expanded ? (
            <View style={styles.actions}>
              <Pressable onPress={() => onEdit(item)} style={styles.actionButton}>
                <IconSymbol name="pencil" size={18} color="#0a84ff" />
              </Pressable>
              <Pressable onPress={() => onDelete(item.id)} style={styles.actionButton}>
                <IconSymbol name="trash" size={18} color="#d9534f" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontWeight: '600',
  },
  income: {
    color: '#0a9e3a',
  },
  expense: {
    color: '#d9534f',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBtn: {
    marginTop: 6,
  },
  expanded: {
    backgroundColor: 'rgba(10,132,255,0.03)'
  },
  details: {
    marginTop: 8,
  },
});
