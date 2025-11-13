import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
// buttons removed from Home quick actions
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency } from '@/lib/format';
import { subscribe } from '@/lib/pubsub';
import { getTransactions } from '@/lib/transactions';
import { Transaction } from '@/types/transaction';
// Link not used on Home anymore

export default function HomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  async function load() {
    const txs = await getTransactions();
    setTransactions(txs);
  }

  useEffect(() => {
    load();
    const unsub = subscribe('transactions:changed', () => load());
    return unsub;
  }, []);

  const balance = transactions.reduce((acc, t) => {
    const sign = t.type === 'expense' ? -1 : 1;
    return acc + sign * (t.amount || 0);
  }, 0);

  return (
    <ThemedView style={{ flex: 1 }}>
      <AppHeader title="Minha Carteira" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.balanceCard}>
          <ThemedText type="subtitle">Saldo Disponível</ThemedText>
          <ThemedText type="title">{formatCurrency(balance)}</ThemedText>
        </Card>

        <Card>
          <ThemedText type="subtitle">Resumo</ThemedText>
          {transactions.length === 0 ? (
            <ThemedText>Nenhuma transação registrada.</ThemedText>
          ) : (
            transactions.slice(0, 5).map((t) => (
              <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <ThemedText>{t.title}</ThemedText>
                <ThemedText style={{ fontWeight: '600' }}>{t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount)}</ThemedText>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  container: {
    padding: 12,
    gap: 12,
  },
  balanceCard: {
    backgroundColor: 'transparent',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
