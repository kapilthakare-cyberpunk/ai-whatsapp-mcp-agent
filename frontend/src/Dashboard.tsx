import React, { useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useGenerateDraft, useMonitoredMessages, useSendMessage, useStatus } from './api/hooks';
import type { Tone } from './api/schemas';

type MonitoredMessage = {
  id: string;
  senderId: string;
  senderName?: string;
  type: string;
  content: any;
  timestamp: number;
  isGroupMessage?: boolean;
  groupId?: string | null;
  groupName?: string | null;
  fromMe?: boolean;
  unread?: boolean;
  priority?: string;
};

type Thread = {
  id: string; // JID or groupId
  name: string;
  isGroup: boolean;
  messages: MonitoredMessage[];
  unreadCount: number;
  hasUrgent: boolean;
  lastTimestamp: number;
};

export default function Dashboard() {
  const { data: status } = useStatus();
  const { data, isLoading, error } = useMonitoredMessages(200);
  const generateDraft = useGenerateDraft();
  const sendMessage = useSendMessage();

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { text: string; tone: Tone } | null>>({});
  const [editingDraft, setEditingDraft] = useState<{ msgId: string; text: string } | null>(null);

  const messages: MonitoredMessage[] = (data?.messages || []).filter((m: any) => m.type === 'text');

  const threads = useMemo(() => {
    const grouped: Record<string, Thread> = {};

    for (const msg of messages) {
      const jid = msg.isGroupMessage ? (msg.groupId as string) : msg.senderId;
      if (!jid) continue;

      if (!grouped[jid]) {
        grouped[jid] = {
          id: jid,
          name: msg.isGroupMessage
            ? msg.groupName || jid.replace('@g.us', '')
            : msg.senderName || jid.split('@')[0],
          isGroup: Boolean(msg.isGroupMessage),
          messages: [],
          unreadCount: 0,
          hasUrgent: false,
          lastTimestamp: 0,
        };
      }

      grouped[jid].messages.push(msg);
      if (msg.unread && !msg.fromMe) grouped[jid].unreadCount++;
      if (msg.priority === 'high' && !msg.fromMe) grouped[jid].hasUrgent = true;
      if (msg.timestamp > grouped[jid].lastTimestamp) grouped[jid].lastTimestamp = msg.timestamp;
    }

    const arr = Object.values(grouped);
    for (const t of arr) t.messages.sort((a, b) => a.timestamp - b.timestamp);
    arr.sort((a, b) => {
      if (a.hasUrgent && !b.hasUrgent) return -1;
      if (!a.hasUrgent && b.hasUrgent) return 1;
      return b.lastTimestamp - a.lastTimestamp;
    });

    return arr;
  }, [messages]);

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const onGenerate = async (tone: Tone) => {
    if (!selectedThread) return;
    const latestMsg = selectedThread.messages[selectedThread.messages.length - 1];
    if (!latestMsg?.content?.text) return;

    try {
      const res = await generateDraft.mutateAsync({
        userId: latestMsg.senderId,
        message: latestMsg.content.text,
        tone,
      });

      const text = res?.draft?.text || res?.draft || '';
      setDrafts((prev) => ({ ...prev, [latestMsg.id]: { text, tone } }));
      toast.success('Draft generated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate draft');
    }
  };

  const onSend = async (to: string, text: string) => {
    if (!text.trim()) return;
    if (!confirm(`Send this message?\n\n"${text}"`)) return;
    try {
      await sendMessage.mutateAsync({ to, message: text });
      toast.success('Message sent');
      setEditingDraft(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send message');
    }
  };

  if (error) {
    return <div style={{ padding: 16 }}>Error loading messages.</div>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Toaster richColors />

      <div style={{ width: 360, borderRight: '1px solid #eee', padding: 12, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>WhatsApp Dashboard</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              Status: {status?.connected ? 'Connected' : status?.status || 'Unknown'}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThreadId(t.id)}
                style={{
                  textAlign: 'left',
                  border: '1px solid #eee',
                  background: selectedThreadId === t.id ? '#f3f4f6' : 'white',
                  padding: 10,
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  {t.unreadCount > 0 && (
                    <div
                      style={{
                        fontSize: 12,
                        background: '#2563eb',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {t.unreadCount}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  {t.messages[t.messages.length - 1]?.content?.text?.slice(0, 80) || ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {!selectedThread ? (
          <div>Select a thread</div>
        ) : (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ margin: 0 }}>{selectedThread.name}</h2>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>To: {selectedThread.id}</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => onGenerate('professional')} disabled={generateDraft.isPending}>
                Generate (professional)
              </button>
              <button onClick={() => onGenerate('personal')} disabled={generateDraft.isPending}>
                Generate (personal)
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {selectedThread.messages.slice(-25).map((m) => {
                const draft = drafts[m.id];
                const isEditing = editingDraft?.msgId === m.id;
                return (
                  <div key={m.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                      {m.fromMe ? 'You' : m.senderName || m.senderId}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content?.text || ''}</div>

                    {draft && !isEditing && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee' }}>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Draft ({draft.tone})</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{draft.text}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => setEditingDraft({ msgId: m.id, text: draft.text })}>Edit</button>
                          <button onClick={() => onSend(selectedThread.id, draft.text)} disabled={sendMessage.isPending}>
                            Send
                          </button>
                        </div>
                      </div>
                    )}

                    {isEditing && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee' }}>
                        <textarea
                          style={{ width: '100%', minHeight: 100 }}
                          value={editingDraft.text}
                          onChange={(e) => setEditingDraft({ msgId: m.id, text: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => setEditingDraft(null)}>Cancel</button>
                          <button
                            onClick={() => onSend(selectedThread.id, editingDraft.text)}
                            disabled={sendMessage.isPending}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
