/* eslint-disable react-native/no-color-literals */
// shadow colors intentionally hardcoded (always black on iOS)
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { useCreds } from '../hooks/use-creds';
import { fetchTeachers } from '../services/hac-api';

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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTeachers();
  }, [creds]);

  const loadTeachers = async () => {
    if (!creds) { setLoading(false); return; }
    try {
      setLoading(true);
      setTeachers(await fetchTeachers(creds.hacUrl, creds.username, creds.password));
    } catch (e) {
      console.error('teachers load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedTeacher || !subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!selectedTeacher.email) {
      Alert.alert('No Email', 'This teacher\'s email address is not available in HAC.');
      return;
    }
    const emailUrl = `mailto:${selectedTeacher.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    try {
      if (await Linking.canOpenURL(emailUrl)) {
        await Linking.openURL(emailUrl);
        setShowComposeModal(false);
        setSubject('');
        setMessage('');
      } else {
        Alert.alert('Error', 'Cannot open mail on this device');
      }
    } catch {
      Alert.alert('Error', 'Failed to open email');
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.title, { color: currentTheme.text }]}>Email Teachers</Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            Contact your teachers directly
          </Text>
        </View>

        <View style={styles.section}>
          {teachers.length === 0 && (
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              No teacher data available from your district's HAC portal.
            </Text>
          )}
          {teachers.map((teacher) => (
            <TouchableOpacity
              key={teacher.id}
              style={[styles.teacherCard, { backgroundColor: currentTheme.surface }]}
              onPress={() => { setSelectedTeacher(teacher); setShowComposeModal(true); }}
              activeOpacity={0.7}
              disabled={!teacher.email}
            >
              <View style={styles.teacherHeader}>
                <View style={[styles.teacherAvatar, { backgroundColor: currentTheme.primary }]}>
                  <Ionicons name="person" size={28} color="#fff" />
                </View>
                <View style={styles.teacherInfo}>
                  <Text style={[styles.teacherName, { color: currentTheme.text }]}>{teacher.name}</Text>
                  <Text style={[styles.teacherClass, { color: currentTheme.textSecondary }]}>{teacher.class}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={currentTheme.textSecondary} />
              </View>
              <View style={styles.teacherMeta}>
                {teacher.room && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location" size={14} color={currentTheme.primary} />
                    <Text style={[styles.metaText, { color: currentTheme.textSecondary }]}>Room {teacher.room}</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Ionicons name="mail" size={14} color={currentTheme.primary} />
                  <Text style={[styles.metaText, { color: currentTheme.textSecondary }]}>
                    {teacher.email || 'Email not in HAC'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <Modal visible={showComposeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                Email {selectedTeacher?.name}
              </Text>
              <TouchableOpacity onPress={() => { setShowComposeModal(false); setSubject(''); setMessage(''); }}>
                <Ionicons name="close" size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalLabel, { color: currentTheme.text }]}>Subject</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: currentTheme.background, color: currentTheme.text, borderColor: currentTheme.border }]}
              placeholder="Enter subject"
              placeholderTextColor={currentTheme.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />
            <Text style={[styles.modalLabel, { color: currentTheme.text }]}>Message</Text>
            <TextInput
              style={[styles.modalMessageInput, { backgroundColor: currentTheme.background, color: currentTheme.text, borderColor: currentTheme.border }]}
              placeholder="Enter your message"
              placeholderTextColor={currentTheme.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
            />
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentTheme.primary }]} onPress={handleSendEmail}>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.modalButtonText}>Send Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  container: { flex: 1 },
  emptyText: { fontSize: 14, lineHeight: 20, marginTop: 40, textAlign: 'center' },
  header: { marginBottom: 16, paddingHorizontal: 16, paddingVertical: 20 },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  metaText: { fontSize: 12 },
  modalButton: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 14 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingVertical: 20 },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalInput: { borderRadius: 8, borderWidth: 1, fontSize: 16, marginBottom: 16, paddingHorizontal: 12, paddingVertical: 12 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  modalMessageInput: { borderRadius: 8, borderWidth: 1, fontSize: 16, marginBottom: 20, paddingHorizontal: 12, paddingVertical: 12, textAlignVertical: 'top' },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  section: { paddingHorizontal: 16 },
  spacer: { height: 40 },
  subtitle: { fontSize: 14, marginTop: 4 },
  teacherAvatar: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', marginRight: 12, width: 48 },
  teacherCard: { borderRadius: 12, elevation: 1, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  teacherClass: { fontSize: 12, marginTop: 2 },
  teacherHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  teacherInfo: { flex: 1 },
  teacherMeta: { gap: 8 },
  teacherName: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700' },
});
