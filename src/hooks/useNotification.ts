import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuração global de notificações ────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Constantes ──────────────────────────────────────────────────────────────
const GEOFENCE_TASK = 'task-geofence';
const GEOFENCE_REGIONS_KEY = 'geofence_regions';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface GeofenceRegion {
  taskId: string;
  taskTitle: string;
  latitude: number;
  longitude: number;
  radius: number;
}

// ─── Persistência das regiões ativas ─────────────────────────────────────────
// A API do Expo não expõe getGeofencingRegionsAsync, então mantemos
// as regiões ativas no AsyncStorage para poder fazer merge ao adicionar/remover.

async function loadRegions(): Promise<GeofenceRegion[]> {
  try {
    const raw = await AsyncStorage.getItem(GEOFENCE_REGIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRegions(regions: GeofenceRegion[]): Promise<void> {
  await AsyncStorage.setItem(GEOFENCE_REGIONS_KEY, JSON.stringify(regions));
}

// ─── Task de background (escopo do módulo, fora de qualquer hook/componente) ──
// O guard isTaskDefined evita erro caso o módulo seja avaliado mais de uma vez
// (hot reload, fast refresh, etc.).
if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
    if (error || !data) return;

    const { eventType, region } = data;

    if (eventType === Location.GeofencingEventType.Enter) {
      // identifier segue o padrão "taskId::taskTitle"
      const [taskId, taskTitle] = (region.identifier as string).split('::');

      await Notifications.scheduleNotificationAsync({
        identifier: `${taskId}-geofence-${Crypto.randomUUID()}`,
        content: {
          title: '📍 Você está perto!',
          body: `Há uma tarefa para fazer aqui: "${taskTitle}"`,
          sound: true,
          data: { taskId, type: 'geofence' },
        },
        trigger: null,
      });
    }
  });
}

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Aplica a lista de regiões ao geofencing nativo.
 * Se a lista estiver vazia, para o monitoramento para liberar recursos.
 */
async function applyGeofencingRegions(regions: GeofenceRegion[]): Promise<void> {
  if (regions.length === 0) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
    return;
  }

  const nativeRegions = regions.map((r) => ({
    identifier: `${r.taskId}::${r.taskTitle}`,
    latitude: r.latitude,
    longitude: r.longitude,
    radius: r.radius,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK, nativeRegions);
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useTaskNotification() {

  /**
   * Agenda uma notificação de aviso antes do prazo de uma tarefa.
   *
   * @param taskId       - Identificador único da tarefa
   * @param taskTitle    - Título exibido na notificação
   * @param deadline     - Data/hora do prazo
   * @param minutesBefore - Com quantos minutos de antecedência avisar (padrão: 60)
   */
  const scheduleDeadlineWarning = async (
    taskId: string,
    taskTitle: string,
    deadline: Date,
    minutesBefore: number = 60,
  ): Promise<void> => {
    const triggerDate = new Date(deadline.getTime() - minutesBefore * 60 * 1000);
    // Não agenda notificações no passado
    if (triggerDate <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      identifier: `${taskId}-deadline-${minutesBefore}min`,
      content: {
        title: minutesBefore >= 1440 ? '📅 Prazo amanhã!' : '⚠️ Prazo se aproximando!',
        body:
          minutesBefore >= 1440
            ? `A tarefa "${taskTitle}" vence amanhã.`
            : `A tarefa "${taskTitle}" vence em ${minutesBefore} minutos.`,
        sound: true,
        data: { taskId, type: 'deadline' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  };

  /**
   * Registra (ou atualiza) o geofence de uma tarefa.
   *
   * As permissões de localização (foreground + background) devem ser
   * solicitadas antes via `usePermissions.requestLocationPermission()`.
   * Este hook não pede permissões para não duplicar responsabilidades.
   *
   * @param taskId    - Identificador único da tarefa
   * @param taskTitle - Título exibido na notificação ao entrar na região
   * @param latitude  - Latitude do local da tarefa
   * @param longitude - Longitude do local da tarefa
   * @param radius    - Raio em metros (padrão: 200)
   */
  const registerGeofence = async (
    taskId: string,
    taskTitle: string,
    latitude: number,
    longitude: number,
    radius: number = 200,
  ): Promise<void> => {
    const regions = await loadRegions();

    // Remove entrada anterior da mesma tarefa (se existir) antes de adicionar
    const updated: GeofenceRegion[] = [
      ...regions.filter((r) => r.taskId !== taskId),
      { taskId, taskTitle, latitude, longitude, radius },
    ];

    await saveRegions(updated);
    await applyGeofencingRegions(updated);
  };

  /**
   * Cancela todas as notificações (deadline + geofence) de uma tarefa.
   *
   * @param taskId - Identificador único da tarefa
   */
  const cancelTaskNotifications = async (taskId: string): Promise<void> => {
    // 1. Cancela notificações de deadline agendadas
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(taskId))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );

    // 2. Remove a região do geofencing e persiste a lista atualizada
    const regions = await loadRegions();
    const updated = regions.filter((r) => r.taskId !== taskId);
    await saveRegions(updated);
    await applyGeofencingRegions(updated);
  };

  return {
    scheduleDeadlineWarning,
    /** @alias registerGeofence — registra ou atualiza o geofence de uma tarefa */
    sendGeofenceNotification: registerGeofence,
    cancelTaskNotifications,
  };
}