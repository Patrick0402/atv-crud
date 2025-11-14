import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionItem } from "@/components/transaction-item";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryUsageCounts,
  getOrCreateCategoryByName,
  updateCategory,
} from "@/lib/categories";
import { publish, subscribe } from "@/lib/pubsub";
import { getCurrentUserId } from "@/lib/session";
import {
  addTransaction,
  deleteTransaction,
  getTransactionsByCategory,
  updateTransaction,
} from "@/lib/transactions";
import { Category } from "@/types/category";
import { Transaction } from "@/types/transaction";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [inspectModal, setInspectModal] = useState(false);
  const [inspectedCategory, setInspectedCategory] = useState<Category | null>(
    null
  );
  const [inspectedTransactions, setInspectedTransactions] = useState<
    Transaction[]
  >([]);
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txEditing, setTxEditing] = useState<Transaction | undefined>(
    undefined
  );
  const textColor = useThemeColor({}, "text");
  const borderC = useThemeColor({}, "icon");

  async function load() {
    const uid = await getCurrentUserId();
    if (!uid) return;
    // load usage counts first so we can sort categories by popularity
    let counts: Record<string, number> = {};
    try {
      counts = await getCategoryUsageCounts(uid);
    } catch {
      counts = {};
    }

    const cats = await getCategories(uid);
    // sort categories by usage (descending)
    const sorted = cats
      .slice()
      .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
    setCategories(sorted);
    setUsageCounts(counts);
  }

  useEffect(() => {
    load();
    const unsubCategories = subscribe("categories:changed", () => load());
    const unsubTransactions = subscribe("transactions:changed", () => load());
    return () => {
      try {
        unsubCategories();
      } catch {}
      try {
        unsubTransactions();
      } catch {}
    };
  }, []);

  async function handleSave() {
    const uid = await getCurrentUserId();
    if (!uid) return;
    const value = name.trim();
    if (!value) return;
    try {
      if (editing) {
        await updateCategory({ ...editing, name: value });
      } else {
        // create
        const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
        await createCategory({ id, name: value, userId: uid });
      }
      setModalVisible(false);
      setEditing(null);
      setName("");
      publish("categories:changed");
      // categories affect transaction displays, ask transactions/home to refresh
      publish("transactions:changed");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível salvar a categoria.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory(id);
      publish("categories:changed");
      publish("transactions:changed");
      load();
    } catch (e: any) {
      Alert.alert(
        "Erro",
        e?.message ?? "Não foi possível excluir a categoria."
      );
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <AppHeader title="Categorias" />
      <ThemedView style={styles.container}>
        <FlatList
          data={categories}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const used = (usageCounts[item.id] ?? 0) > 0;
            const onRowPress = async () => {
              if (used) {
                setInspectedCategory(item);
                const uid = await getCurrentUserId();
                if (!uid) return;
                const txs = await getTransactionsByCategory(uid, item.id);
                setInspectedTransactions(txs);
                setInspectModal(true);
              } else {
                setEditing(item);
                setName(item.name);
                setModalVisible(true);
              }
            };

            return (
              <Pressable
                onPress={onRowPress}
                android_ripple={{ color: "rgba(0,0,0,0.04)" }}
                style={{ borderRadius: 8 }}
              >
                <Card style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                    {used ? (
                      <ThemedText
                        style={{ fontSize: 12, color: "#666" }}
                      >{`Possui ${
                        usageCounts[item.id]
                      } transação(ões)`}</ThemedText>
                    ) : (
                      <ThemedText style={{ fontSize: 12, color: "#666" }}>
                        Nenhuma transação relacionada
                      </ThemedText>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => {
                        setEditing(item);
                        setName(item.name);
                        setModalVisible(true);
                      }}
                      style={{ padding: 8 }}
                    >
                      <ThemedText>Editar</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        if (used) {
                          // show explanatory dialog with option to view related transactions
                          Alert.alert(
                            "Categoria em uso",
                            `Esta categoria possui ${
                              usageCounts[item.id] ?? 0
                            } transação(ões) atribuída(s). Não é possível excluir até remover ou reatribuir as transações.`,
                            [
                              { text: "Ver transações", onPress: onRowPress },
                              { text: "OK", style: "cancel" },
                            ]
                          );
                        } else {
                          // confirm deletion
                          Alert.alert(
                            "Confirmar exclusão",
                            "Deseja realmente excluir esta categoria? Esta ação não poderá ser desfeita.",
                            [
                              { text: "Cancelar", style: "cancel" },
                              {
                                text: "Excluir",
                                style: "destructive",
                                onPress: () => handleDelete(item.id),
                              },
                            ]
                          );
                        }
                      }}
                      style={{ padding: 8, opacity: used ? 0.9 : 1 }}
                    >
                      <ThemedText style={{ color: used ? "#999" : "#d9534f" }}>
                        Excluir
                      </ThemedText>
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Card>
              <ThemedText>
                Nenhuma categoria. Toque + para adicionar.
              </ThemedText>
            </Card>
          }
        />

        <Pressable
          style={styles.fab}
          onPress={() => {
            setEditing(null);
            setName("");
            setModalVisible(true);
          }}
        >
          <ThemedText style={{ color: "#fff", fontSize: 20 }}>+</ThemedText>
        </Pressable>

        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <ThemedView style={{ flex: 1, padding: 12 }}>
            <Card>
              <ThemedText type="title">
                {editing ? "Editar Categoria" : "Nova Categoria"}
              </ThemedText>
              <TextInput
                placeholder="Nome"
                placeholderTextColor={borderC}
                value={name}
                onChangeText={setName}
                style={[
                  { borderWidth: 1, borderRadius: 6, padding: 8, marginTop: 8 },
                  { color: textColor, borderColor: borderC },
                ]}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <Button
                  title="Cancelar"
                  onPress={() => {
                    setModalVisible(false);
                    setEditing(null);
                    setName("");
                  }}
                  style={{ backgroundColor: "#ccc" }}
                />
                <Button title="Salvar" onPress={handleSave} />
              </View>
            </Card>
          </ThemedView>
        </Modal>
        <Modal
          visible={inspectModal}
          animationType="slide"
          onRequestClose={() => setInspectModal(false)}
        >
          <ThemedView style={{ flex: 1, padding: 12 }}>
            <Card>
              <ThemedText type="title">
                Transações em "{inspectedCategory?.name ?? ""}"
              </ThemedText>
              <View style={{ maxHeight: 360, marginTop: 8 }}>
                {inspectedTransactions.length === 0 ? (
                  <ThemedText>Nenhuma transação encontrada.</ThemedText>
                ) : (
                  <FlatList
                    data={inspectedTransactions}
                    keyExtractor={(i) => i.id}
                    renderItem={({ item }) => (
                      <TransactionItem
                        item={item}
                        onEdit={(t) => {
                          setTxEditing({
                            ...(t as any),
                            categoryName: inspectedCategory?.name,
                          });
                          setTxModalVisible(true);
                        }}
                        onDelete={(id) => {
                          Alert.alert(
                            "Confirmar exclusão",
                            "Deseja realmente excluir esta transação?",
                            [
                              { text: "Cancelar", style: "cancel" },
                              {
                                text: "Excluir",
                                style: "destructive",
                                onPress: async () => {
                                  await deleteTransaction(id);
                                  publish("transactions:changed");
                                  // refresh both lists
                                  await load();
                                  // refresh inspected transactions if modal still open
                                  try {
                                    const uid2 = await getCurrentUserId();
                                    if (
                                      inspectModal &&
                                      inspectedCategory &&
                                      uid2
                                    ) {
                                      const txs2 =
                                        await getTransactionsByCategory(
                                          uid2,
                                          inspectedCategory.id
                                        );
                                      setInspectedTransactions(txs2);
                                    }
                                  } catch {}
                                },
                              },
                            ]
                          );
                        }}
                        categoryName={inspectedCategory?.name ?? null}
                      />
                    )}
                  />
                )}
              </View>
            </Card>
            <View
              style={{
                marginTop: "auto",
              }}
            >
              <Button
                title="Fechar"
                onPress={() => {
                  setInspectModal(false);
                  setInspectedCategory(null);
                  setInspectedTransactions([]);
                }}
                style={{
                  width: "100%",
                  alignSelf: "stretch",
                }}
              />
            </View>
          </ThemedView>
        </Modal>
        <Modal
          visible={txModalVisible}
          animationType="slide"
          onRequestClose={() => {
            setTxModalVisible(false);
            setTxEditing(undefined);
          }}
        >
          <ThemedView style={styles.modalContainer}>
            <TransactionForm
              initial={txEditing}
              onCancel={() => {
                setTxModalVisible(false);
                setTxEditing(undefined);
              }}
              onSave={async (payload) => {
                const p: any = { ...payload };
                const uid = await getCurrentUserId();
                if (p.categoryName && uid) {
                  const cat = await getOrCreateCategoryByName(
                    p.categoryName,
                    uid
                  );
                  p.categoryId = cat.id;
                  delete p.categoryName;
                }
                if (p.id) {
                  await updateTransaction(p as Transaction);
                } else {
                  await addTransaction(
                    p as Omit<Transaction, "id">,
                    uid ?? undefined
                  );
                }
                setTxModalVisible(false);
                setTxEditing(undefined);
                publish("transactions:changed");
                publish("categories:changed");
                await load();
                // refresh inspected transactions if modal still open (the edited tx may have moved)
                try {
                  const uid2 = await getCurrentUserId();
                  if (inspectModal && inspectedCategory && uid2) {
                    const txs2 = await getTransactionsByCategory(
                      uid2,
                      inspectedCategory.id
                    );
                    setInspectedTransactions(txs2);
                  }
                } catch {}
              }}
            />
          </ThemedView>
        </Modal>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  modalContainer: {
    flex: 1,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    marginBottom: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0a84ff",
    alignItems: "center",
    justifyContent: "center",
  },
});
