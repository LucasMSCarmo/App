import { api } from '@/src/libs/axios';

export const taskService = {
  // Busca todas as tarefas do usuário logado
  async getTasks() {
    try {
      const response = await api.get('/tasks');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      throw error;
    }
  },

  // Cria uma nova tarefa
  async createTask(data: any) {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  // Atualiza uma tarefa (Status, título, etc)
  async updateTask(taskId: string, data: any) {
    const response = await api.put(`/tasks/${taskId}`, data);
    return response.data;
  },

  // Deleta uma tarefa
  async deleteTask(taskId: string) {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  // Adiciona um membro (Lógica que fizemos no back-end)
  async addMember(taskId: string, memberId: string) {
    const response = await api.post(`/tasks/${taskId}/members`, { memberId });
    return response.data;
  },

  async removeMember(taskId: string, memberId: string) {
    const response = await api.delete(`/tasks/${taskId}/members/${memberId}`);
    return response.data;
  },

  async getComments(taskId: string) {
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  async createComment(taskId: string, body: string) {
    const response = await api.post(`/tasks/${taskId}/comments`, { body });
    return response.data;
  },
};
