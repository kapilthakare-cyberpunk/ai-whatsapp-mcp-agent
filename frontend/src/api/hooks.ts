import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { ProcessAiSchema, SendSchema, type ProcessAiPayload, type SendPayload } from './schemas';

export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: async () => (await api.get('/status')).data,
    refetchInterval: 3000,
  });
}

export function useMonitoredMessages(limit = 100) {
  return useQuery({
    queryKey: ['monitored-messages', limit],
    queryFn: async () => (await api.get('/monitored-messages', { params: { limit } })).data,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendPayload) => {
      const parsed = SendSchema.parse(payload);
      return (await api.post('/send', parsed)).data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['monitored-messages'] });
    },
  });
}

export function useGenerateDraft() {
  return useMutation({
    mutationFn: async (payload: ProcessAiPayload) => {
      const parsed = ProcessAiSchema.parse(payload);
      return (await api.post('/process-ai', parsed)).data;
    },
  });
}
