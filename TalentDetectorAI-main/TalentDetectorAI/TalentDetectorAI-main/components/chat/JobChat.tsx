'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, MessageSquare, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

interface JobChatProps {
  jobId: string
  receiverId: string
  receiverName: string
}

export default function JobChat({ jobId, receiverId, receiverName }: JobChatProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    subscribeToMessages()
    getCurrentUser()
  }, [jobId])

  async function getCurrentUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || '')
  }

  async function fetchMessages() {
    const supabase = createClient()
    const { data } = await supabase
      .from('job_chat_messages')
      .select('*, profiles!job_chat_messages_sender_id_fkey(*)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
    
    setMessages(data || [])
    scrollToBottom()
  }

  function subscribeToMessages() {
    const supabase = createClient()
    const channel = supabase
      .channel('job-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'job_chat_messages',
        filter: `job_id=eq.${jobId}`
      }, () => {
        fetchMessages()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  async function handleSend() {
    if (!newMessage.trim()) return

    setSending(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('job_chat_messages').insert({
        job_id: jobId,
        sender_id: user?.id,
        receiver_id: receiverId,
        message: newMessage.trim()
      })

      if (error) throw error

      setNewMessage('')
      toast.success('Message sent!')
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6" />
          <div>
            <h3 className="font-bold">Job Discussion</h3>
            <p className="text-sm text-blue-100">Chat with {receiverName}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <AnimatePresence>
          {messages.map((msg, i) => {
            const isOwn = msg.sender_id === currentUserId
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    isOwn 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}>
                    {!isOwn && (
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        {msg.profiles?.full_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50">
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
