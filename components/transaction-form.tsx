import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getCategories } from "@/lib/categories";
import { getCurrentUserId } from "@/lib/session";
import { Category } from "@/types/category";
import { Transaction } from "@/types/transaction";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "./button";
import { Card } from "./card";

type Props = {
  initial?: Partial<Transaction>;
  onCancel: () => void;
  onSave: (payload: Omit<Transaction, "id"> | Transaction) => void;
  currentUserId?: string;
};

export function TransactionForm({ initial = {}, onCancel, onSave }: Props) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [amount, setAmount] = useState(
    initial.amount != null ? String(initial.amount) : ""
  );
  const [date, setDate] = useState(initial.date ?? new Date().toISOString());
  const [category, setCategory] = useState(
    (initial as any).categoryName ?? (initial as any).category ?? ""
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [type, setType] = useState<"income" | "expense">(
    (initial.type as any) ?? "income"
  );

  const textColor = useThemeColor({}, "text");
  const borderC = useThemeColor({}, "icon");
  const bg = useThemeColor({}, "background");
  const tint = useThemeColor({}, "tint");
  const [showPicker, setShowPicker] = useState(false);
  const [inputLayout, setInputLayout] = useState<any | null>(null);
  const [suggestionsLayout, setSuggestionsLayout] = useState<any | null>(null);
  const [inputWrapperLayout, setInputWrapperLayout] = useState<any | null>(
    null
  );

  const formattedDate = useMemo(() => {
    try {
      return new Date(date).toLocaleDateString("pt-BR");
    } catch {
      return date;
    }
  }, [date]);

  // validation
  const [touched, setTouched] = useState({ title: false, amount: false });
  const titleValid = title.trim().length > 0;
  const amountN = Number(String(amount).replace(",", ".")) || 0;
  const amountValid = amountN > 0;
  const canSave = titleValid && amountValid;

  // load categories for current user to show suggestions
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const uid = await getCurrentUserId();
        if (!uid) return;
        const cats = await getCategories(uid);
        if (mounted) setCategories(cats);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function handleSave() {
    const payload: any = {
      title: title || "Untitled",
      amount: Number(Number(amount) || 0),
      type,
      date: date || new Date().toISOString(),
      // categoryName -> resolve to categoryId later in onSave wrapper
      categoryName: category || undefined,
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
      <View
        style={[{ position: "relative" }, styles.inner]}
        onStartShouldSetResponder={() => true}
        onResponderStart={(e) => {
          if (!showSuggestions) return;
          try {
            const { locationX, locationY } = e.nativeEvent;
            // if inside suggestions or input, ignore
            if (suggestionsLayout && inputWrapperLayout) {
              const s = {
                x: inputWrapperLayout.x + suggestionsLayout.x,
                y: inputWrapperLayout.y + suggestionsLayout.y,
                width: suggestionsLayout.width,
                height: suggestionsLayout.height,
              };
              if (
                locationX >= s.x &&
                locationX <= s.x + s.width &&
                locationY >= s.y &&
                locationY <= s.y + s.height
              ) {
                return;
              }
            }
            if (inputLayout && inputWrapperLayout) {
              const i = {
                x: inputWrapperLayout.x + inputLayout.x,
                y: inputWrapperLayout.y + inputLayout.y,
                width: inputLayout.width,
                height: inputLayout.height,
              };
              if (
                locationX >= i.x &&
                locationX <= i.x + i.width &&
                locationY >= i.y &&
                locationY <= i.y + i.height
              ) {
                return;
              }
            }
            setShowSuggestions(false);
          } catch {}
        }}
      >
        <ThemedText type="title" style={styles.title}>
          Nova transação
        </ThemedText>

        <TextInput
          placeholder="Título"
          placeholderTextColor={textColor}
          value={title}
          onChangeText={(v) => setTitle(v)}
          onBlur={() => setTouched((s) => ({ ...s, title: true }))}
          style={[
            styles.input,
            styles.inputSpacing,
            { color: textColor, borderColor: borderC },
          ]}
        />
        {!titleValid && touched.title ? (
          <Text style={styles.error}>Título é obrigatório.</Text>
        ) : null}

        <TextInput
          placeholder="Valor"
          placeholderTextColor={textColor}
          value={amount}
          onChangeText={(v) => {
            const cleaned = v.replace(/[^0-9,\.]/g, "");
            setAmount(cleaned);
          }}
          onBlur={() => setTouched((s) => ({ ...s, amount: true }))}
          keyboardType="numeric"
          style={[
            styles.input,
            styles.inputSpacing,
            { color: textColor, borderColor: borderC },
          ]}
        />
        {!amountValid && touched.amount ? (
          <Text style={styles.error}>Informe um valor maior que 0.</Text>
        ) : null}

        <Pressable
          onPress={() => setShowPicker(true)}
          style={
            [
              styles.input,
              styles.inputSpacing,
              { justifyContent: "center", borderColor: borderC },
            ] as any
          }
        >
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

        {Platform.OS === "web" ? (
          <TextInput
            placeholder="Data (YYYY-MM-DD)"
            placeholderTextColor={textColor}
            value={date}
            onChangeText={setDate}
            style={[
              styles.input,
              styles.inputSpacing,
              { color: textColor, borderColor: borderC },
            ]}
          />
        ) : null}

        {/* Category input + overlay suggestions */}
        <View
          style={[styles.inputWrapper, styles.inputSpacing]}
          onLayout={(e) => setInputWrapperLayout(e.nativeEvent.layout)}
        >
          <TextInput
            placeholder="Categoria"
            placeholderTextColor={textColor}
            value={category}
            onChangeText={(v) => {
              setCategory(v);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            style={[styles.input, { color: textColor, borderColor: borderC }]}
            onLayout={(e) => setInputLayout(e.nativeEvent.layout)}
          />

          {showSuggestions ? (
            <View
              style={[
                styles.suggestions,
                { borderColor: borderC, backgroundColor: bg } as any,
              ]}
              onLayout={(e) => setSuggestionsLayout(e.nativeEvent.layout)}
            >
              {(() => {
                const q = category.trim().toLowerCase();
                const filtered = categories
                  .filter((c) => c.name.toLowerCase().includes(q))
                  .slice(0, 6);
                const exactMatch =
                  q.length > 0 &&
                  categories.some((c) => c.name.toLowerCase() === q);

                return (
                  <>
                    {filtered.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setCategory(c.name);
                          setShowSuggestions(false);
                        }}
                        style={styles.suggestionItem}
                      >
                        <ThemedText>{c.name}</ThemedText>
                      </Pressable>
                    ))}

                    {!exactMatch && q.length > 0 ? (
                      <Pressable
                        onPress={() => {
                          setCategory(category.trim());
                          setShowSuggestions(false);
                        }}
                        style={[styles.suggestionItem, styles.createItem]}
                      >
                        <Text
                          style={{ color: tint, fontWeight: "600" }}
                        >{`Criar categoria "${category.trim()}"`}</Text>
                      </Pressable>
                    ) : null}
                  </>
                );
              })()}
            </View>
          ) : null}
        </View>

        <TextInput
          placeholder="Notes"
          placeholderTextColor={textColor}
          value={notes}
          onChangeText={setNotes}
          style={[
            styles.input,
            styles.inputSpacing,
            { color: textColor, borderColor: borderC },
          ]}
        />

        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setType("income")}
            style={[
              styles.typeBtn,
              type === "income" ? styles.activeType : undefined,
            ]}
          >
            <ThemedText style={{ textAlign: "center" }}>Entrada</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setType("expense")}
            style={[
              styles.typeBtn,
              type === "expense" ? styles.activeType : undefined,
            ]}
          >
            <ThemedText style={{ textAlign: "center" }}>Saída</ThemedText>
          </Pressable>
        </View>
        <View style={styles.actions}>
          <Button
            title="Cancelar"
            onPress={onCancel}
            style={[styles.actionBtn, styles.cancelBtn]}
          />
          <Button
            title="Salvar"
            onPress={() => {
              const normalized = Number(String(amount).replace(/,/g, ".")) || 0;
              const payload: any = {
                title: title.trim() || "Untitled",
                amount: Math.abs(normalized),
                type,
                date: date || new Date().toISOString(),
                categoryName: category || undefined,
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
            }}
            disabled={!canSave}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingVertical: 20,
    gap: 16,
    minHeight: 420,
    flex: 1,
  },
  inner: {
    flex: 1,
    display: "flex",
  },
  title: {
    marginBottom: 20,
  },
  inputSpacing: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 12,
    borderRadius: 8,
  },
  inputWrapper: {
    position: "relative",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: "auto",
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
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
  },
  cancelBtn: {
    marginRight: 8,
    backgroundColor: "#ccc",
  },
  typeBtn: {
    flex: 1,
  },
  activeType: {
    borderWidth: 1,
    borderColor: "#0a84ff",
  },
  error: {
    color: "#d9534f",
    fontSize: 12,
    marginTop: 8,
  },
  suggestions: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    borderWidth: 1,
    borderRadius: 6,
    maxHeight: 160,
    overflow: "hidden",
    zIndex: 999,
    elevation: 6,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    backgroundColor: "transparent",
  },
  createItem: {
    backgroundColor: "transparent",
  },
});
