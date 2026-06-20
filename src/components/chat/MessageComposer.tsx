'use client';

import { useRef, useState, useEffect } from 'react';
import { Paperclip, Send, Smile, X } from 'lucide-react';
import { api } from '@/lib/apiClient';
import type { MessageItem } from '@/types';

export function MessageComposer({
  chatId,
  replyTo,
  onClearReply,
  onSent,
}: {
  chatId: string;
  replyTo: MessageItem | null;
  onClearReply: () => void;
  onSent: () => void;
}) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingFileIds, setPendingFileIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notifyTyping(isTyping: boolean) {
    api.post(`/api/chats/${chatId}/typing`, { isTyping });
  }

  function handleTextChange(value: string) {
    setText(value);
    notifyTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => notifyTyping(false), 2000);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const { ok, data } = await api.upload('/api/upload', formData);
    if (ok) setPendingFileIds((prev) => [...prev, data.file._id]);
    e.target.value = '';
  }

  async function handleSend() {
    if (!text.trim() && pendingFileIds.length === 0) return;
    setIsSending(true);
    notifyTyping(false);

    const { ok } = await api.post(`/api/chats/${chatId}/messages`, {
      text: text.trim() || undefined,
      fileIds: pendingFileIds.length ? pendingFileIds : undefined,
      replyToMessageId: replyTo?._id,
    });

    setIsSending(false);
    if (ok) {
      setText('');
      setPendingFileIds([]);
      onClearReply();
      onSent();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => () => notifyTyping(false), [chatId]);

  return (
    <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5 text-sm dark:bg-zinc-800">
          <span className="truncate text-zinc-500">
            Replying to: {replyTo.text?.slice(0, 60) || 'Attachment'}
          </span>
          <button onClick={onClearReply}>
            <X size={14} />
          </button>
        </div>
      )}

      {pendingFileIds.length > 0 && (
        <div className="mb-2 text-xs text-zinc-400">{pendingFileIds.length} file(s) attached</div>
      )}

      <div className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Attach file"
        >
          <Paperclip size={20} />
        </button>

        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          rows={1}
          className="scroll-thin max-h-32 flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-zinc-700 dark:bg-zinc-800"
        />

        <button className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Emoji">
          <Smile size={20} />
        </button>

        <button
          onClick={handleSend}
          disabled={isSending || (!text.trim() && pendingFileIds.length === 0)}
          className="rounded-full bg-brand-600 p-2.5 text-white disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
