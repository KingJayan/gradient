import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { useCreds } from '../hooks/use-creds';
import { fetchTeachers } from '../services/hac-api';
import { logError } from '../utils/error-logger';

interface Teacher {
  id: string;
  name: string;
  email: string;
  class: string;
  room: string;
}

export default function EmailTeachersScreen() {
  const { currentTheme } = useTheme();
  const creds = useCreds();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    loadTeachers();
  }, [creds]);

  const loadTeachers = async () => {
    if (!creds) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      setTeachers(await fetchTeachers(creds.hacUrl, creds.username, creds.password));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load teachers';
      logError(e instanceof Error ? e : new Error(String(e)), { action: 'loadTeachers' });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={[styles.errorText, { color: currentTheme.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: currentTheme.primary }]} onPress={loadTeachers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.title, { color: currentTheme.text }]}>Teachers</Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            Your current class teachers
          </Text>
        </View>

        <View style={styles.section}>
          {teachers.length === 0 && (
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              No teacher data available from your district's HAC portal.
            </Text>
          )}
          {teachers.map((teacher) => (
            <View
              key={teacher.id}
              style={[styles.teacherCard, { backgroundColor: currentTheme.surface }]}
            >
              <View style={styles.teacherHeader}>
                <View style={[styles.teacherAvatar, { backgroundColor: currentTheme.primary }]}>
                  <Ionicons name="person" size={28} color="#fff" />
                </View>
                <View style={styles.teacherInfo}>
                  <Text style={[styles.teacherName, { color: currentTheme.text }]}>{teacher.name}</Text>
                  <Text style={[styles.teacherClass, { color: currentTheme.textSecondary }]}>{teacher.class}</Text>
                </View>
              </View>
              {teacher.room ? (
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={14} color={currentTheme.primary} />
                  <Text style={[styles.metaText, { color: currentTheme.textSecondary }]}>Room {teacher.room}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center' },
  errorText: { fontSize: 14, paddingHorizontal: 32, textAlign: 'center' },
  retryButton: { borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  container: { flex: 1 },
  emptyText: { fontSize: 14, lineHeight: 20, marginTop: 40, textAlign: 'center' },
  header: { marginBottom: 16, paddingHorizontal: 16, paddingVertical: 20 },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  metaText: { fontSize: 12 },
  section: { paddingHorizontal: 16 },
  spacer: { height: 40 },
  subtitle: { fontSize: 14, marginTop: 4 },
  teacherAvatar: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', marginRight: 12, width: 48 },
  teacherCard: { borderRadius: 12, elevation: 1, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  teacherClass: { fontSize: 12, marginTop: 2 },
  teacherHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700' },
});
