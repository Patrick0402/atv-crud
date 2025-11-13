import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  const router = useRouter();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayBalance, setDisplayBalance] = useState(0);

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

  // Animate balance when it changes
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: balance,
      duration: 600,
      useNativeDriver: false,
    }).start();
    const id = animatedValue.addListener(({ value }) => {
      setDisplayBalance(Math.round((value + Number.EPSILON) * 100) / 100);
    });
    return () => animatedValue.removeListener(id);
  }, [balance]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <AppHeader title="Minha Carteira" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.balanceCard}>
          <ThemedText type="subtitle">Saldo Disponível</ThemedText>
          <ThemedText type="title">{formatCurrency(displayBalance)}</ThemedText>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText type="subtitle">Resumo</ThemedText>
            <Pressable onPress={() => router.push('/transactions')}>
              <ThemedText type="link">Exibir todas</ThemedText>
            </Pressable>
          </View>
          {transactions.length === 0 ? (
            <ThemedText>Nenhuma transação registrada.</ThemedText>
          ) : (
            transactions.slice(0, 3).map((t) => (
              <View key={t.id} style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{t.title}</ThemedText>
                  <ThemedText>{t.category ?? ''}</ThemedText>
                </View>
                <ThemedText style={[styles.summaryAmount, { color: t.type === 'expense' ? '#d9534f' : '#0a9e3a' }]}>{t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount)}</ThemedText>
              </View>
            ))
          )}
        </Card>

        {/* By-category totals: top 3 categories by most recent transaction */}
        <Card>
          <ThemedText type="subtitle">Por Categoria</ThemedText>
          {(() => {
            const byCat: Record<string, { income: number; expense: number; mostRecent: number }> = {};
            transactions.forEach((t) => {
              const key = t.category ?? 'Sem categoria';
              if (!byCat[key]) byCat[key] = { income: 0, expense: 0, mostRecent: 0 };
              if (t.type === 'expense') byCat[key].expense += t.amount || 0;
              else byCat[key].income += t.amount || 0;
              const d = new Date(t.date).getTime();
              if (!byCat[key].mostRecent || d > byCat[key].mostRecent) byCat[key].mostRecent = d;
            });
            const cats = Object.entries(byCat).map(([name, vals]) => ({ name, ...vals }));
            cats.sort((a, b) => b.mostRecent - a.mostRecent);
            const top3 = cats.slice(0, 5);
            if (top3.length === 0) return <ThemedText>Nenhuma categoria registrada.</ThemedText>;
            return top3.map((c) => (
              <View key={c.name} style={styles.categoryRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{c.name}</ThemedText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText style={{ color: '#0a9e3a' }}>Entrada: {formatCurrency(c.income)}</ThemedText>
                  <ThemedText style={{ color: '#d9534f' }}>Saída: {formatCurrency(c.expense)}</ThemedText>
                </View>
              </View>
            ));
          })()}
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
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)'
  },
  summaryAmount: {
    fontWeight: '700'
  }
  ,
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)'
  }
});
