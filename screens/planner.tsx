import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Assignment, PersonalTask, mergeTasks, groupByDate, getOverdueTasks } from '../utils/task-manager';
import { UI_COLORS, onPrimary } from '../utils/colors';
import { useTheme } from '../hooks/use-theme';
import { Theme } from '../context/theme-context';
import { useDataCache } from '../context/data-context';

const PERSONAL_TASKS_KEY = 'personalTasks';

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_LABELS = ['S','M','T','W','T','F','S'];

function CalendarPicker({ value, onChange, currentTheme }: {
  value: Date | null;
  onChange: (d: Date) => void;
  currentTheme: Theme;
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewMonth, setViewMonth] = useState(() => {
    const base = value ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => setViewMonth(new Date(year, month - 1, 1))}>
          <Ionicons name="chevron-back" size={22} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.calMonthLabel, { color: currentTheme.text }]}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity onPress={() => setViewMonth(new Date(year, month + 1, 1))}>
          <Ionicons name="chevron-forward" size={22} color={currentTheme.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.calDowRow}>
        {DOW_LABELS.map((d, i) => (
          <Text key={i} style={[styles.calDowLabel, { color: currentTheme.textSecondary }]}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.calWeekRow}>
          {week.map((day, di) => {
            if (day === null) return <View key={di} style={styles.calCell} />;
            const d = new Date(year, month, day);
            const isSelected = value !== null &&
              value.getFullYear() === year && value.getMonth() === month && value.getDate() === day;
            const isToday = d.getTime() === today.getTime();
            return (
              <TouchableOpacity
                key={di}
                style={[
                  styles.calCell,
                  isSelected && { backgroundColor: currentTheme.primary, borderRadius: 20 },
                  isToday && !isSelected && { borderWidth: 1, borderColor: currentTheme.primary, borderRadius: 20 },
                ]}
                onPress={() => onChange(d)}
              >
                <Text style={[
                  styles.calDayText,
                  { color: isSelected ? onPrimary(currentTheme.primary) : isToday ? currentTheme.primary : currentTheme.text },
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function PlannerScreen() {
  const { currentTheme } = useTheme();
  const { cache } = useDataCache();
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filterSource, setFilterSource] = useState<'all' | 'hac' | 'personal'>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    loadPersonalTasks();
  }, []);

  const allTasks = useMemo(
    () => mergeTasks(cache.assignments ?? [], personalTasks),
    [cache.assignments, personalTasks]
  );

  const loadPersonalTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem(PERSONAL_TASKS_KEY);
      if (stored) setPersonalTasks(JSON.parse(stored));
    } catch (e) {
      console.warn('failed to load personal tasks:', e instanceof Error ? e.message : String(e));
    }
  };

  const savePersonalTasks = async (tasks: PersonalTask[]) => {
    try {
      await AsyncStorage.setItem(PERSONAL_TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn('failed to save personal tasks:', e instanceof Error ? e.message : String(e));
    }
  };

  const handleAddTask = () => {
    if (!newTaskTitle || !newTaskDate) {
      Alert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }
    const newTask: PersonalTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      dueDate: formatDate(newTaskDate),
      priority: newTaskPriority,
      completed: false,
    };
    const updated = [...personalTasks, newTask];
    setPersonalTasks(updated);
    savePersonalTasks(updated);
    setNewTaskTitle('');
    setNewTaskDate(null);
    setNewTaskPriority('medium');
    setShowAddModal(false);
  };

  const handleToggleTask = (taskId: string) => {
    if (!personalTasks.some((t) => t.id === taskId)) return;
    const updated = personalTasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    setPersonalTasks(updated);
    savePersonalTasks(updated);
  };

  const filteredTasks = allTasks.filter((task) => {
    const sourceMatch = filterSource === 'all' || task.source === filterSource;
    return sourceMatch && (showCompleted || !task.completed);
  });

  const overdueTasks = getOverdueTasks(filteredTasks);
  const groupedTasks = groupByDate(
    filteredTasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  );

  if (cache.loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
        <View>
          <Text style={[styles.greeting, { color: currentTheme.textSecondary }]}>Planner</Text>
          <Text style={[styles.taskCount, { color: currentTheme.text }]}>
            {allTasks.filter((t) => !t.completed).length} tasks due
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: currentTheme.primary }]}
          onPress={() => setShowAddModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          <Ionicons name="add" size={24} color={onPrimary(currentTheme.primary)} />
        </TouchableOpacity>
      </View>

      {overdueTasks.length > 0 && (
        <View style={styles.overdueSection}>
          <View style={styles.overdueHeader}>
            <Ionicons name="alert-circle" size={20} color={UI_COLORS.danger} />
            <Text style={styles.overdueTitle}>Overdue ({overdueTasks.length})</Text>
          </View>
          {overdueTasks.slice(0, 2).map((task) => (
            <TaskItem key={task.id} task={task} onToggle={() => handleToggleTask(task.id)} isOverdue currentTheme={currentTheme} />
          ))}
        </View>
      )}

      <View style={[styles.filterBar, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
        {(['all', 'hac', 'personal'] as const).map((src) => (
          <TouchableOpacity
            key={src}
            style={[styles.filterButton, { borderColor: currentTheme.border }, filterSource === src && [styles.filterButtonActive, { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }]]}
            onPress={() => setFilterSource(src)}
          >
            <Text style={[styles.filterButtonText, { color: filterSource === src ? onPrimary(currentTheme.primary) : currentTheme.textSecondary }]}>
              {src.charAt(0).toUpperCase() + src.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.completedToggle}>
          <Text style={[styles.completedToggleText, { color: currentTheme.textSecondary }]}>Completed</Text>
          <Switch
            value={showCompleted}
            onValueChange={setShowCompleted}
            trackColor={{ false: currentTheme.border, true: currentTheme.primary }}
            thumbColor={showCompleted ? '#fff' : currentTheme.textSecondary}
          />
        </View>
      </View>

      <ScrollView style={styles.taskList}>
        {Array.from(groupedTasks.entries()).map(([dateStr, tasks]) => (
          <View key={dateStr} style={styles.dateGroup}>
            <Text style={[styles.dateHeader, { color: currentTheme.text }]}>{dateStr}</Text>
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={() => handleToggleTask(task.id)} currentTheme={currentTheme} />
            ))}
          </View>
        ))}
        {filteredTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color={currentTheme.primary} />
            <Text style={[styles.emptyStateText, { color: currentTheme.textSecondary }]}>All caught up!</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            {showCalendar ? (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowCalendar(false)}>
                    <Ionicons name="chevron-back" size={24} color={currentTheme.text} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Select Date</Text>
                  <View style={{ width: 24 }} />
                </View>
                <CalendarPicker
                  value={newTaskDate}
                  onChange={(d) => { setNewTaskDate(d); setShowCalendar(false); }}
                  currentTheme={currentTheme}
                />
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Add Task</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Ionicons name="close" size={24} color={currentTheme.text} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>Task Title</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: currentTheme.background, color: currentTheme.text }]}
                  placeholder="Enter task title"
                  placeholderTextColor={currentTheme.textSecondary}
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                />
                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>Due Date</Text>
                <TouchableOpacity
                  style={[styles.modalInput, styles.datePickerButton, { backgroundColor: currentTheme.background }]}
                  onPress={() => setShowCalendar(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={newTaskDate ? currentTheme.primary : currentTheme.textSecondary} />
                  <Text style={[styles.datePickerText, { color: newTaskDate ? currentTheme.text : currentTheme.textSecondary }]}>
                    {newTaskDate ? formatDate(newTaskDate) : 'Select a date'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>Priority</Text>
                <View style={styles.priorityRow}>
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityButton, { borderColor: currentTheme.border }, newTaskPriority === p && [styles.priorityButtonActive, { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }]]}
                      onPress={() => setNewTaskPriority(p)}
                    >
                      <Text style={[styles.priorityButtonText, { color: newTaskPriority === p ? onPrimary(currentTheme.primary) : currentTheme.textSecondary }]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: currentTheme.primary }]}
                  onPress={handleAddTask}
                  accessibilityRole="button"
                  accessibilityLabel="Create task"
                >
                  <Text style={[styles.modalButtonText, { color: onPrimary(currentTheme.primary) }]}>Create Task</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TaskItem({ task, onToggle, isOverdue, currentTheme }: { task: Assignment; onToggle: () => void; isOverdue?: boolean; currentTheme: Theme }) {
  const priorityColor =
    task.source === 'personal'
      ? task.priority === 'high' ? UI_COLORS.danger : task.priority === 'medium' ? UI_COLORS.warning : currentTheme.textSecondary
      : currentTheme.primary;

  return (
    <View style={[styles.taskItem, { backgroundColor: currentTheme.surface }, task.completed && styles.taskItemCompleted, isOverdue && styles.taskItemOverdue]}>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.checkbox}
        accessibilityRole="button"
        accessibilityLabel={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        <Ionicons
          name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={task.completed ? currentTheme.primary : isOverdue ? UI_COLORS.danger : priorityColor}
        />
      </TouchableOpacity>
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, { color: currentTheme.text }, task.completed && styles.taskTitleCompleted]}>{task.title}</Text>
        <View style={styles.taskMeta}>
          <Text style={[styles.taskClass, { color: currentTheme.textSecondary }]}>{task.class}</Text>
          {task.source === 'hac' && task.points && (
            <Text style={[styles.taskPoints, { backgroundColor: currentTheme.primary + '20', color: currentTheme.primary }]}>{task.points} pts</Text>
          )}
          {task.source === 'personal' && (
            <View style={[styles.sourceBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.sourceBadgeText}>Personal</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.taskDate, { color: currentTheme.textSecondary }]}>
        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  calCell: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingVertical: 7 },
  calDayText: { fontSize: 14 },
  calDowLabel: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  calDowRow: { flexDirection: 'row', marginBottom: 4 },
  calHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  calMonthLabel: { fontSize: 16, fontWeight: '600' },
  calWeekRow: { flexDirection: 'row', marginBottom: 2 },
  centerContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  checkbox: { marginRight: 12 },
  completedToggle: { alignItems: 'center', flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  completedToggleText: { fontSize: 12, fontWeight: '500' },
  container: { flex: 1 },
  dateGroup: { marginBottom: 20 },
  dateHeader: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  datePickerButton: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  datePickerText: { fontSize: 16 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyStateText: { fontSize: 16, marginTop: 12 },
  filterBar: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
  filterButton: { alignItems: 'center', borderRadius: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  filterButtonActive: { borderColor: 'transparent' },
  filterButtonText: { fontSize: 12, fontWeight: '500' },
  greeting: { fontSize: 14 },
  header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  modalButton: { alignItems: 'center', borderRadius: 8, paddingVertical: 14 },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingVertical: 20 },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalInput: { borderRadius: 8, fontSize: 16, marginBottom: 16, paddingHorizontal: 12, paddingVertical: 12 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  overdueHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
  overdueSection: { backgroundColor: 'rgba(239,68,68,0.12)', borderLeftColor: UI_COLORS.danger, borderLeftWidth: 4, borderRadius: 8, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, paddingVertical: 12 },
  overdueTitle: { color: UI_COLORS.danger, fontSize: 14, fontWeight: '700', marginLeft: 8 },
  priorityButton: { alignItems: 'center', borderRadius: 6, borderWidth: 1, flex: 1, paddingVertical: 10 },
  priorityButtonActive: { borderColor: 'transparent' },
  priorityButtonText: { fontSize: 12, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sourceBadge: { borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  sourceBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  taskClass: { fontSize: 12, fontWeight: '500' },
  taskContent: { flex: 1 },
  taskCount: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  taskDate: { fontSize: 12, marginLeft: 12 },
  taskItem: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', marginBottom: 8, paddingHorizontal: 12, paddingVertical: 12 },
  taskItemCompleted: { opacity: 0.6 },
  taskItemOverdue: { borderLeftColor: UI_COLORS.danger, borderLeftWidth: 3 },
  taskList: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  taskMeta: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  taskPoints: { borderRadius: 3, fontSize: 11, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2 },
  taskTitle: { fontSize: 15, fontWeight: '600' },
  taskTitleCompleted: { textDecorationLine: 'line-through' },
});
