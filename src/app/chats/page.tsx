export default function ChatsIndexPage() {
  return (
    <div className="hidden h-full flex-1 flex-col items-center justify-center gap-3 text-center md:flex">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-3xl dark:bg-zinc-800">
        💬
      </div>
      <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-200">Select a chat to start messaging</h2>
      <p className="max-w-xs text-sm text-zinc-400">
        Or tap the compose icon in the sidebar to start a new conversation or group.
      </p>
    </div>
  );
}
