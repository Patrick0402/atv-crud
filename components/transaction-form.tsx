import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Transaction } from '@/types/transaction';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './button';
import { Card } from './card';

type Props = {
  initial?: Partial<Transaction>;
  onCancel: () => void;
  onSave: (payload: Omit<Transaction, 'id'> | Transaction) => void;
};

export function TransactionForm({ initial = {}, onCancel, onSave }: Props) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [amount, setAmount] = useState(
    initial.amount != null ? String(initial.amount) : ''
  );
  const [date, setDate] = useState(initial.date ?? new Date().toISOString());
  const [category, setCategory] = useState(initial.category ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [type, setType] = useState<'income' | 'expense'>((initial.type as any) ?? 'income');

  const textColor = useThemeColor({}, 'text');
  const borderC = useThemeColor({}, 'icon');
  const [showPicker, setShowPicker] = useState(false);

  const formattedDate = useMemo(() => {
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return date;
    }
  }, [date]);

  // validation
  const [touched, setTouched] = useState({ title: false, amount: false });
  const titleValid = title.trim().length > 0;
  const amountN = Number(String(amount).replace(',', '.')) || 0;
  const amountValid = amountN > 0;
  const canSave = titleValid && amountValid;

  function handleSave() {
    const payload: any = {
      title: title || 'Untitled',
      amount: Number(Number(amount) || 0),
      type,
      date: date || new Date().toISOString(),
      category: category || undefined,
      notes: notes || undefined,
    };
    if ((initial as Transaction).id) {
      onSave({ ...(initial as Transaction), ...payload });
    } else {
      onSave(payload);
    }
  }

  return (
    <Card style={styles.container}>
      <ThemedText type="title">Nova transação</ThemedText>
      <TextInput
        placeholder="Título"
        placeholderTextColor={textColor}
        value={title}
        onChangeText={(v) => {
          setTitle(v);
        }}
        onBlur={() => setTouched((s) => ({ ...s, title: true }))}
        style={[styles.input, { color: textColor, borderColor: borderC }]}
      />
      {!titleValid && touched.title ? <Text style={styles.error}>Título é obrigatório.</Text> : null}
      <TextInput
        placeholder="Valor"
        placeholderTextColor={textColor}
        value={amount}
        onChangeText={(v) => {
          // allow digits, comma, dot
          const cleaned = v.replace(/[^0-9,\.]/g, '');
          setAmount(cleaned);
        }}
        onBlur={() => setTouched((s) => ({ ...s, amount: true }))}
        keyboardType="numeric"
        style={[styles.input, { color: textColor, borderColor: borderC }]}
      />
      {!amountValid && touched.amount ? <Text style={styles.error}>Informe um valor maior que 0.</Text> : null}
      <Pressable onPress={() => setShowPicker(true)} style={[styles.input, { justifyContent: 'center', borderColor: borderC }] as any}>
        <Text style={{ color: textColor }}>{formattedDate}</Text>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display="default"
          onChange={(_e: any, selected: any) => {
            setShowPicker(false);
            if (selected) setDate(new Date(selected).toISOString());
          }}
        />
      ) : null}
      {Platform.OS === 'web' ? (
        <TextInput
          placeholder="Data (YYYY-MM-DD)"
          placeholderTextColor={textColor}
          value={date}
          onChangeText={setDate}
          style={[styles.input, { color: textColor, borderColor: borderC }]}
        />
      ) : null}
      <TextInput placeholder="Category" placeholderTextColor={textColor} value={category} onChangeText={setCategory} style={[styles.input, { color: textColor, borderColor: borderC }]} />
      <TextInput placeholder="Notes" placeholderTextColor={textColor} value={notes} onChangeText={setNotes} style={[styles.input, { color: textColor, borderColor: borderC }]} />

      <View style={styles.typeRow}>
        <Pressable onPress={() => setType('income')} style={[styles.typeBtn, type === 'income' ? styles.activeType : undefined]}>
          <ThemedText style={{ textAlign: 'center' }}>Entrada</ThemedText>
        </Pressable>
        <Pressable onPress={() => setType('expense')} style={[styles.typeBtn, type === 'expense' ? styles.activeType : undefined]}>
          <ThemedText style={{ textAlign: 'center' }}>Saída</ThemedText>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Button title="Cancelar" onPress={onCancel} style={{ marginRight: 8, backgroundColor: '#ccc' }} />
        <Button title="Salvar" onPress={() => {
          // normalize amount and call onSave with parsed values
          const normalized = Number(String(amount).replace(/,/g, '.')) || 0;
          const payload: any = {
            title: title.trim() || 'Untitled',
            amount: Math.abs(normalized),
            type,
            date: date || new Date().toISOString(),
            category: category || undefined,
            notes: notes || undefined,
          };
          if (canSave) {
            if ((initial as Transaction).id) {
              onSave({ ...(initial as Transaction), ...payload });
            } else {
              onSave(payload);
            }
          } else {
            setTouched({ title: true, amount: true });
          }
        }} disabled={!canSave} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 8,
    borderRadius: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  typeBtn: {
    flex: 1,
  },
  activeType: {
    borderWidth: 1,
    borderColor: '#0a84ff',
  },
  error: {
    color: '#d9534f',
    fontSize: 12,
    marginTop: 4,
  },
});
