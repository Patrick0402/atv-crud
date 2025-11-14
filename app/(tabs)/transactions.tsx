import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionForm } from '@/components/transaction-form';
import { TransactionItem } from '@/components/transaction-item';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getCurrentUserId } from '@/lib/session';
import { addTransaction, deleteTransaction, getTransactions, updateTransaction } from '@/lib/transactions';
import { Transaction } from '@/types/transaction';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const bg = useThemeColor({}, 'background');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // filters (draft inputs)
  const [titleFilter, setTitleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [notesFilter, setNotesFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // web-specific input strings (DD/MM/YYYY) for nicer UX
  const [webDateFromInput, setWebDateFromInput] = useState('');
  const [webDateToInput, setWebDateToInput] = useState('');
  // applied filters (used by the list)
  const [appliedTitle, setAppliedTitle] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('');
  const [appliedNotes, setAppliedNotes] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    const uid = await getCurrentUserId();
    if (!uid) {
      // no user - go to login
      router.replace('/login' as any);
      return;
    }
    const txs = await getTransactions(uid);
    setTransactions(txs);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (appliedTitle && !t.title.toLowerCase().includes(appliedTitle.toLowerCase())) return false;
      if (appliedCategory && !(t.category ?? '').toLowerCase().includes(appliedCategory.toLowerCase())) return false;
      if (appliedNotes && !(t.notes ?? '').toLowerCase().includes(appliedNotes.toLowerCase())) return false;

      // date range: make the comparison inclusive by using start of day / end of day
      if (appliedFrom) {
        try {
          const from = new Date(appliedFrom);
          from.setHours(0, 0, 0, 0);
          if (new Date(t.date) < from) return false;
        } catch {}
      }
      if (appliedTo) {
        try {
          const to = new Date(appliedTo);
          to.setHours(23, 59, 59, 999);
          if (new Date(t.date) > to) return false;
        } catch {}
      }

      return true;
    });
  }, [transactions, appliedTitle, appliedCategory, appliedNotes, appliedFrom, appliedTo]);

  // keep web inputs in sync with ISO date strings
  useEffect(() => {
    setWebDateFromInput(dateFrom ? new Date(dateFrom).toLocaleDateString('pt-BR') : '');
  }, [dateFrom]);
  useEffect(() => {
    setWebDateToInput(dateTo ? new Date(dateTo).toLocaleDateString('pt-BR') : '');
  }, [dateTo]);

  function parseDDMMYYYY(v: string) {
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return '';
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  }

  async function handleAdd(payload: Omit<Transaction, 'id'>) {
    const uid = await getCurrentUserId();
    await addTransaction(payload, uid ?? undefined);
    setModalVisible(false);
    setEditing(undefined);
    load();
  }

  async function handleUpdate(payload: Transaction) {
    await updateTransaction(payload);
    setModalVisible(false);
    setEditing(undefined);
    load();
  }

  async function handleDelete(id: string) {
    await deleteTransaction(id);
    load();
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <AppHeader title="Transações" />
      <ThemedView style={styles.container}>
      <Card style={[styles.filterCard, { backgroundColor: bg, borderColor: iconColor }]}>
        <Pressable style={styles.filterHeader} onPress={() => setFiltersOpen((s) => !s)}>
          <ThemedText type="defaultSemiBold">Filtros</ThemedText>
          <IconSymbol name="chevron.right" size={18} color={iconColor} style={{ transform: [{ rotate: filtersOpen ? '90deg' : '0deg' }] }} />
        </Pressable>
        {filtersOpen ? (
          <View style={styles.filterBody}>
            <TextInput placeholder="Título" placeholderTextColor={iconColor} value={titleFilter} onChangeText={setTitleFilter} style={[styles.filterInput, { color: textColor, borderColor: iconColor, backgroundColor: bg }]} />
            <TextInput placeholder="Categoria" placeholderTextColor={iconColor} value={categoryFilter} onChangeText={setCategoryFilter} style={[styles.filterInput, { color: textColor, borderColor: iconColor, backgroundColor: bg }]} />
            <TextInput placeholder="Notas" placeholderTextColor={iconColor} value={notesFilter} onChangeText={setNotesFilter} style={[styles.filterInput, { color: textColor, borderColor: iconColor, backgroundColor: bg }]} />
            <View style={styles.filterRow}>
              {Platform.OS === 'web' ? (
                <>
                  <TextInput placeholder="De (DD/MM/YYYY)" placeholderTextColor={iconColor} value={webDateFromInput} onChangeText={(v) => {
                    setWebDateFromInput(v);
                    const iso = parseDDMMYYYY(v);
                    setDateFrom(iso);
                  }} style={[styles.filterInput, { flex: 1, color: textColor, borderColor: iconColor, backgroundColor: bg }]} />
                  <TextInput placeholder="Até (DD/MM/YYYY)" placeholderTextColor={iconColor} value={webDateToInput} onChangeText={(v) => {
                    setWebDateToInput(v);
                    const iso = parseDDMMYYYY(v);
                    setDateTo(iso);
                  }} style={[styles.filterInput, { flex: 1, color: textColor, borderColor: iconColor, backgroundColor: bg }]} />
                </>
              ) : (
                <>
                  <Pressable onPress={() => setShowFromPicker(true)} style={[styles.filterInput, { flex: 1, justifyContent: 'center', borderColor: iconColor, backgroundColor: bg }] as any}>
                    <Text style={{ color: dateFrom ? textColor : iconColor }}>{dateFrom ? new Date(dateFrom).toLocaleDateString('pt-BR') : 'De'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowToPicker(true)} style={[styles.filterInput, { flex: 1, justifyContent: 'center', borderColor: iconColor, backgroundColor: bg }] as any}>
                    <Text style={{ color: dateTo ? textColor : iconColor }}>{dateTo ? new Date(dateTo).toLocaleDateString('pt-BR') : 'Até'}</Text>
                  </Pressable>
                </>
              )}
            </View>
            {showFromPicker && Platform.OS !== 'web' ? (
              <DateTimePicker
                value={dateFrom ? new Date(dateFrom) : new Date()}
                mode="date"
                display="default"
                onChange={(_e: any, selected: any) => {
                  setShowFromPicker(false);
                  if (selected) setDateFrom(new Date(selected).toISOString());
                }}
              />
            ) : null}
            {showToPicker && Platform.OS !== 'web' ? (
              <DateTimePicker
                value={dateTo ? new Date(dateTo) : new Date()}
                mode="date"
                display="default"
                onChange={(_e: any, selected: any) => {
                  setShowToPicker(false);
                  if (selected) setDateTo(new Date(selected).toISOString());
                }}
              />
            ) : null}
            <View style={styles.filterActions}>
              <Button title="Reset" onPress={() => {
                // clear drafts and applied filters
                setTitleFilter(''); setCategoryFilter(''); setNotesFilter(''); setDateFrom(''); setDateTo('');
                setAppliedTitle(''); setAppliedCategory(''); setAppliedNotes(''); setAppliedFrom(''); setAppliedTo('');
              }} style={{ backgroundColor: '#ccc' }} />
              <Button title="Aplicar" onPress={() => {
                // apply current draft inputs
                setAppliedTitle(titleFilter);
                setAppliedCategory(categoryFilter);
                setAppliedNotes(notesFilter);
                setAppliedFrom(dateFrom);
                setAppliedTo(dateTo);
              }} />
            </View>
          </View>
        ) : null}
      </Card>
      <FlatList
        data={filteredTransactions}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            onEdit={(t) => {
              setEditing(t);
              setModalVisible(true);
            }}
            onDelete={(id) => setConfirmDeleteId(id)}
          />
        )}
        ListEmptyComponent={<Card><ThemedText>Nenhuma transação. Toque + para adicionar.</ThemedText></Card>}
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <IconSymbol name="plus" size={20} color="#fff" />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <ThemedView style={styles.modalContainer}>
          <TransactionForm
            initial={editing}
            onCancel={() => {
              setModalVisible(false);
              setEditing(undefined);
            }}
            onSave={async (payload) => {
              if ((payload as Transaction).id) {
                await handleUpdate(payload as Transaction);
              } else {
                await handleAdd(payload as Omit<Transaction, 'id'>);
              }
            }}
          />
        </ThemedView>
      </Modal>

      <Modal visible={confirmDeleteId != null} transparent animationType="fade" onRequestClose={() => setConfirmDeleteId(null)}>
        <View style={styles.confirmBackdrop}>
          <Card style={[styles.confirmCard, { backgroundColor: bg }] }>
            <ThemedText type="title">Confirmar exclusão</ThemedText>
            <ThemedText>Tem certeza que deseja excluir esta transação?</ThemedText>
            <View style={styles.confirmActions}>
              <Button title="Cancelar" onPress={() => setConfirmDeleteId(null)} style={{ backgroundColor: '#ccc', marginRight: 8 }} />
              <Button title="Excluir" onPress={async () => {
                if (!confirmDeleteId) return;
                await handleDelete(confirmDeleteId);
                setConfirmDeleteId(null);
              }} />
            </View>
          </Card>
          </View>
      </Modal>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalContainer: {
    flex: 1,
    padding: 12,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 8,
    borderRadius: 6,
  },
  filterCard: {
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  filterBody: {
    marginTop: 8,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 480,
    padding: 12,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 120,
  },
});
