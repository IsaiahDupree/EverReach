import { AgentChatInterface } from '@/components/Agent/AgentChatInterface'
import RequireAuth from '@/components/RequireAuth'

function ChatPageContent() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <AgentChatInterface showSidebar={true} />
    </div>
  )
}

export default function ChatPage() {
  return (
    <RequireAuth>
      <ChatPageContent />
    </RequireAuth>
  )
}
