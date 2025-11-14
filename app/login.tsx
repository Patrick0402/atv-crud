import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { setCurrentUserId } from '@/lib/session';
import { authenticateUser, createUser } from '@/lib/users';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const placeholderColor = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');

  async function handleLogin() {
    setError(null);
    const normalized = String(email ?? '').trim().toLowerCase();
    const user = await authenticateUser(normalized, password);
    if (!user) {
      setError('Credenciais inválidas');
      return;
    }
    await setCurrentUserId(user.id);
    router.replace('(tabs)' as any);
  }

  async function handleRegister() {
    setError(null);
    if (!name || !email || !password) {
      setError('Preencha nome, e-mail e senha');
      return;
    }
    const id = Date.now().toString();
    const normalized = String(email ?? '').trim().toLowerCase();
    try {
      await createUser({ id, name, email: normalized, password });
      await setCurrentUserId(id);
      router.replace('(tabs)' as any);
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao criar usuário');
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <AppHeader title={isRegister ? 'Cadastrar-se' : 'Entrar'} />
      <View style={styles.container}>
        <Card style={styles.card}>
          <ThemedText type="title" style={{ marginBottom: 8 }}>{isRegister ? 'Criar conta' : 'Bem-vindo'}</ThemedText>
          {isRegister ? (
            <TextInput placeholder="Nome" placeholderTextColor={placeholderColor} value={name} onChangeText={setName} style={[styles.input, { color: textColor }]} />
          ) : null}
          <TextInput placeholder="E-mail" placeholderTextColor={placeholderColor} value={email} onChangeText={setEmail} style={[styles.input, { color: textColor }]} autoCapitalize="none" keyboardType="email-address" />
          <TextInput placeholder="Senha" placeholderTextColor={placeholderColor} value={password} onChangeText={setPassword} style={[styles.input, { color: textColor }]} secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={isRegister ? 'Criar conta' : 'Entrar'} onPress={isRegister ? handleRegister : handleLogin} />
          <Button title={isRegister ? 'Já tenho conta' : 'Criar conta'} onPress={() => setIsRegister((s) => !s)} style={{ backgroundColor: '#ccc', marginTop: 8 }} />
        </Card>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    width: '100%'
  },
  error: {
    color: 'crimson',
    marginBottom: 6,
  },
  card: {
    padding: 12,
    width: '100%'
  }
});
