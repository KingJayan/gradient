import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Assignment, PersonalTask, mergeTasks, groupByDate, getOverdueTasks } from '../utils/task-manager';
import { UI_COLORS, onPrimary } from '../utils/colors';
import { FONT, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';
import { useTheme } from '../hooks/use-theme';
import { Theme } from '../context/theme-context';
import { useDataCache } from '../context/data-context';
import { logWarning } from '../utils/error-logger';
import { Screen, AsyncContent, IconButton, Card } from '../components/screen';
import { LOCAL_KEYS } from '../utils/storage';

type Row = { type: 'header'; key: string; date: string } | { type: 'task'; key: string; task: Assignment };

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
        <IconButton
          name="chevron-back"
          size={22}
          color={currentTheme.text}
          label="Previous month"
          onPress={() => setViewMonth(new Date(year, month - 1, 1))}
        />
        <Text style={[styles.calMonthLabel, { color: currentTheme.text }]} accessibilityRole="header">
          {MONTH_NAMES[month]} {year}
        </Text>
        <IconButton
          name="chevron-forward"
          size={22}
          color={currentTheme.text}
          label="Next month"
          onPress={() => setViewMonth(new Date(year, month + 1, 1))}
        />
      </View>
      <View style={styles.calDowRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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
                  isSelected && { backgroundColor: currentTheme.primary, borderRadius: RADIUS.lg },
                  isToday && !isSelected && { borderWidth: 1, borderColor: currentTheme.primary, borderRadius: RADIUS.lg },
                ]}
                onPress={() => onChange(d)}
                accessibilityRole="button"
                accessibilityLabel={`${MONTH_NAMES[month]} ${day}, ${year}${isToday ? ', today' : ''}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.calDayText,
                    { color: isSelected ? onPrimary(currentTheme.primary) : isToday ? currentTheme.primary : currentTheme.text },
                  ]}
                  maxFontSizeMultiplier={1.4}
                >
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
  const { cache, loadGradesAndCourses } = useDataCache();
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filterSource, setFilterSource] = useState<'all' | 'hac' | 'personal'>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const tasksRef = useRef(personalTasks);
  tasksRef.current = personalTasks;

  useEffect(() => {
    loadPersonalTasks();
  }, []);

  const allTasks = useMemo(
    () => mergeTasks(cache.assignments ?? [], personalTasks),
    [cache.assignments, personalTasks]
  );

  const loadPersonalTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_KEYS.personalTasks);
      if (stored) setPersonalTasks(JSON.parse(stored));
    } catch (e) {
      logWarning('failed to load personal tasks', { error: e instanceof Error ? e.message : String(e) });
    }
  };

  const persistTasks = useCallback(async (tasks: PersonalTask[], rollback: PersonalTask[]) => {
    try {
      await AsyncStorage.setItem(LOCAL_KEYS.personalTasks, JSON.stringify(tasks));
    } catch (e) {
      logWarning('failed to save personal tasks', { error: e instanceof Error ? e.message : String(e) });
      setPersonalTasks(rollback);
      Alert.alert('Save Failed', 'Your change could not be saved. Please try again.');
    }
  }, []);

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
    const prev = tasksRef.current;
    const updated = [...prev, newTask];
    setPersonalTasks(updated);
    persistTasks(updated, prev);
    setNewTaskTitle('');
    setNewTaskDate(null);
    setNewTaskPriority('medium');
    setShowAddModal(false);
  };

  const handleToggleTask = useCallback(
    (taskId: string) => {
      const prev = tasksRef.current;
      if (!prev.some((t) => t.id === taskId)) return;
      const updated = prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
      setPersonalTasks(updated);
      persistTasks(updated, prev);
    },
    [persistTasks]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const prev = tasksRef.current;
      if (!prev.some((t) => t.id === taskId)) return;
      const updated = prev.filter((t) => t.id !== taskId);
      setPersonalTasks(updated);
      persistTasks(updated, prev);
    },
    [persistTasks]
  );

  const filteredTasks = useMemo(
    () =>
      allTasks.filter((task) => {
        const sourceMatch = filterSource === 'all' || task.source === filterSource;
        return sourceMatch && (showCompleted || !task.completed);
      }),
    [allTasks, filterSource, showCompleted]
  );

  const overdueTasks = useMemo(() => getOverdueTasks(filteredTasks), [filteredTasks]);

  const rows = useMemo<Row[]>(() => {
    const sorted = [...filteredTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const out: Row[] = [];
    for (const [dateStr, tasks] of groupByDate(sorted)) {
      out.push({ type: 'header', key: `h:${dateStr}`, date: dateStr });
      for (const task of tasks) out.push({ type: 'task', key: task.id, task });
    }
    return out;
  }, [filteredTasks]);

  return (
    <Screen>
      <AsyncContent
        loading={cache.loading}
        error={cache.error}
        onRetry={loadGradesAndCourses}
        hasData={cache.assignments != null}
      >
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
            <Text style={styles.overdueTitle} accessibilityRole="header">Overdue ({overdueTasks.length})</Text>
          </View>
          {overdueTasks.slice(0, 2).map((task) => (
            <TaskItem key={task.id} task={task} onToggle={handleToggleTask} isOverdue currentTheme={currentTheme} />
          ))}
        </View>
      )}

      <View style={[styles.filterBar, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
        {(['all', 'hac', 'personal'] as const).map((src) => (
          <TouchableOpacity
            key={src}
            style={[styles.filterButton, { borderColor: currentTheme.border }, filterSource === src && [styles.filterButtonActive, { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }]]}
            onPress={() => setFilterSource(src)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${src === 'hac' ? 'HAC' : src} tasks`}
            accessibilityState={{ selected: filterSource === src }}
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
            thumbColor={showCompleted ? UI_COLORS.white : currentTheme.textSecondary}
            accessibilityLabel="Show completed tasks"
          />
        </View>
      </View>

      <FlatList
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <Text style={[styles.dateHeader, { color: currentTheme.text }]} accessibilityRole="header">{item.date}</Text>
          ) : item.task.source === 'personal' ? (
            <SwipeableTaskRow
              task={item.task}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
              currentTheme={currentTheme}
            />
          ) : (
            <TaskItem task={item.task} onToggle={handleToggleTask} currentTheme={currentTheme} />
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color={currentTheme.primary} />
            <Text style={[styles.emptyStateText, { color: currentTheme.textSecondary }]}>All caught up!</Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => (showCalendar ? setShowCalendar(false) : setShowAddModal(false))}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            {showCalendar ? (
              <>
                <View style={styles.modalHeader}>
                  <IconButton
                    name="chevron-back"
                    color={currentTheme.text}
                    label="Back to task details"
                    onPress={() => setShowCalendar(false)}
                  />
                  <Text style={[styles.modalTitle, { color: currentTheme.text }]} accessibilityRole="header">Select Date</Text>
                  <View style={styles.modalHeaderSpacer} />
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
                  <Text style={[styles.modalTitle, { color: currentTheme.text }]} accessibilityRole="header">Add Task</Text>
                  <IconButton
                    name="close"
                    color={currentTheme.text}
                    label="Close add task"
                    onPress={() => setShowAddModal(false)}
                  />
                </View>
                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>Task Title</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: currentTheme.background, color: currentTheme.text }]}
                  placeholder="Enter task title"
                  placeholderTextColor={currentTheme.textSecondary}
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  accessibilityLabel="Task title"
                />
                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>Due Date</Text>
                <TouchableOpacity
                  style={[styles.modalInput, styles.datePickerButton, { backgroundColor: currentTheme.background }]}
                  onPress={() => setShowCalendar(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Due date: ${newTaskDate ? formatDate(newTaskDate) : 'not set'}`}
                  accessibilityHint="Opens the date picker"
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
                      accessibilityRole="button"
                      accessibilityLabel={`${p.charAt(0).toUpperCase() + p.slice(1)} priority`}
                      accessibilityState={{ selected: newTaskPriority === p }}
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
      </AsyncContent>
    </Screen>
  );
}

const SWIPE_THRESHOLD = 72;

const SwipeableTaskRow = React.memo(function SwipeableTaskRow({ task, onToggle, onDelete, currentTheme }: {
  task: Assignment;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  currentTheme: Theme;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const toggleRef = useRef(onToggle);
  const deleteRef = useRef(onDelete);
  const idRef = useRef(task.id);
  toggleRef.current = onToggle;
  deleteRef.current = onDelete;
  idRef.current = task.id;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -SWIPE_THRESHOLD) {
          Animated.timing(translateX, { toValue: -500, duration: 180, useNativeDriver: true }).start(() =>
            deleteRef.current(idRef.current)
          );
        } else {
          if (g.dx >= SWIPE_THRESHOLD) toggleRef.current(idRef.current);
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const completeOpacity = translateX.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const deleteOpacity = translateX.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.swipeRoot}>
      <View style={styles.swipeActions} pointerEvents="none">
        <Animated.View style={[styles.swipeAction, { opacity: completeOpacity }]}>
          <Ionicons name="checkmark-circle" size={24} color={currentTheme.primary} />
        </Animated.View>
        <Animated.View style={[styles.swipeAction, { opacity: deleteOpacity }]}>
          <Ionicons name="trash" size={22} color={UI_COLORS.danger} />
        </Animated.View>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TaskItem task={task} onToggle={onToggle} onDelete={onDelete} currentTheme={currentTheme} />
      </Animated.View>
    </View>
  );
});

const TaskItem = React.memo(function TaskItem({ task, onToggle, onDelete, isOverdue, currentTheme }: { task: Assignment; onToggle: (id: string) => void; onDelete?: (id: string) => void; isOverdue?: boolean; currentTheme: Theme }) {
  const priorityColor =
    task.source === 'personal'
      ? task.priority === 'high' ? UI_COLORS.danger : task.priority === 'medium' ? UI_COLORS.warning : currentTheme.textSecondary
      : currentTheme.primary;

  return (
    <Card style={[styles.taskItem, task.completed && styles.taskItemCompleted, isOverdue && styles.taskItemOverdue]}>
      <TouchableOpacity
        onPress={() => onToggle(task.id)}
        style={styles.checkbox}
        accessibilityRole="checkbox"
        accessibilityLabel={`${task.title}${task.priority ? `, ${task.priority} priority` : ''}${isOverdue ? ', overdue' : ''}`}
        accessibilityHint={onDelete ? 'Swipe right to complete, swipe left to delete' : undefined}
        accessibilityState={{ checked: task.completed }}
        accessibilityActions={onDelete ? [{ name: 'delete', label: 'Delete task' }] : undefined}
        onAccessibilityAction={onDelete ? (e) => { if (e.nativeEvent.actionName === 'delete') onDelete(task.id); } : undefined}
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
            <Text style={[styles.taskPoints, { backgroundColor: currentTheme.primary + '20', color: currentTheme.primary }]} maxFontSizeMultiplier={1.4}>{task.points} pts</Text>
          )}
          {task.source === 'personal' && (
            <View style={[styles.sourceBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.sourceBadgeText} maxFontSizeMultiplier={1.4}>
                {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Personal'}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.taskDate, { color: currentTheme.textSecondary }]}>
        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </Text>
    </Card>
  );
});

const styles = StyleSheet.create({
  addButton: { alignItems: 'center', borderRadius: RADIUS.pill, height: 48, justifyContent: 'center', width: 48 },
  calCell: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: TOUCH_TARGET },
  calDayText: { fontSize: FONT.base },
  calDowLabel: { flex: 1, fontSize: FONT.sm, fontWeight: '600', textAlign: 'center' },
  calDowRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  calHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  calMonthLabel: { fontSize: FONT.lg, fontWeight: '600' },
  calWeekRow: { flexDirection: 'row', marginBottom: SPACING.xxs },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
  },
  completedToggle: { alignItems: 'center', flexDirection: 'row', gap: SPACING.sm, marginLeft: 'auto' },
  completedToggleText: { fontSize: FONT.sm, fontWeight: '500' },
  dateHeader: { fontSize: FONT.base, fontWeight: '700', marginBottom: SPACING.sm, marginTop: SPACING.md },
  datePickerButton: { alignItems: 'center', flexDirection: 'row', gap: SPACING.md, minHeight: TOUCH_TARGET },
  datePickerText: { fontSize: FONT.lg },
  emptyState: { alignItems: 'center', marginTop: SPACING.giant },
  emptyStateText: { fontSize: FONT.lg, marginTop: SPACING.md },
  filterBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.md,
  },
  filterButtonActive: { borderColor: 'transparent' },
  filterButtonText: { fontSize: FONT.sm, fontWeight: '500' },
  greeting: { fontSize: FONT.base },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  modalButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
  },
  modalButtonText: { fontSize: FONT.lg, fontWeight: '600' },
  modalContent: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  modalHeaderSpacer: { width: 24 },
  modalInput: {
    borderRadius: RADIUS.sm,
    fontSize: FONT.lg,
    marginBottom: SPACING.lg,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.md,
  },
  modalLabel: { fontSize: FONT.base, fontWeight: '600', marginBottom: SPACING.sm },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
  modalTitle: { fontSize: FONT.xl, fontWeight: '700' },
  overdueHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: SPACING.sm },
  overdueSection: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderLeftColor: UI_COLORS.danger,
    borderLeftWidth: 4,
    borderRadius: RADIUS.sm,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  overdueTitle: { color: UI_COLORS.danger, fontSize: FONT.base, fontWeight: '700', marginLeft: SPACING.sm },
  priorityButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
  },
  priorityButtonActive: { borderColor: 'transparent' },
  priorityButtonText: { fontSize: FONT.sm, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  sourceBadge: { borderRadius: RADIUS.xs, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xxs },
  sourceBadgeText: { color: UI_COLORS.white, fontSize: FONT.xs, fontWeight: '600' },
  swipeAction: { paddingHorizontal: SPACING.xl },
  swipeActions: {
    alignItems: 'center',
    bottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  swipeRoot: { position: 'relative' },
  taskClass: { fontSize: FONT.sm, fontWeight: '500' },
  taskContent: { flex: 1 },
  taskCount: { fontSize: FONT.xl, fontWeight: '700', marginTop: SPACING.xs },
  taskDate: { fontSize: FONT.sm, marginLeft: SPACING.md },
  taskItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  taskItemCompleted: { opacity: 0.6 },
  taskItemOverdue: { borderLeftColor: UI_COLORS.danger, borderLeftWidth: 3 },
  taskList: { flex: 1 },
  taskListContent: { paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  taskMeta: { alignItems: 'center', flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  taskPoints: {
    borderRadius: RADIUS.xs,
    fontSize: FONT.xs,
    fontWeight: '600',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
  },
  taskTitle: { fontSize: FONT.lg, fontWeight: '600' },
  taskTitleCompleted: { textDecorationLine: 'line-through' },
});
