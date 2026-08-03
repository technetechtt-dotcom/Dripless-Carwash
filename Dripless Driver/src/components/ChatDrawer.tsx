import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, User } from 'lucide-react';
import { useDriverBookings } from '../contexts/DriverBookingContext';
import { GlassCard } from './ui/GlassCard';
interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
}
export function ChatDrawer({ isOpen, onClose, customerName }: ChatDrawerProps) {
  const { messages, sendMessage, markMessagesRead } = useDriverBookings();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) {
      markMessagesRead();
      scrollToBottom();
    }
  }, [isOpen, messages]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  };
  return (
    <AnimatePresence>
      {isOpen &&
      <>
          <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          onClick={onClose} />

          <motion.div
          initial={{
            y: '100%'
          }}
          animate={{
            y: 0
          }}
          exit={{
            y: '100%'
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300
          }}
          className="fixed bottom-0 left-0 right-0 z-50 h-[80vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {customerName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Online
                  </p>
                </div>
              </div>
              <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">

                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
              {messages.map((msg) =>
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'driver' ? 'justify-end' : 'justify-start'}`}>

                  <div
                className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.sender === 'driver' ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>

                    <p>{msg.text}</p>
                    <p
                  className={`text-[10px] mt-1 text-right ${msg.sender === 'driver' ? 'text-emerald-100' : 'text-slate-400'}`}>

                      {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                    </p>
                  </div>
                </div>
            )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
            onSubmit={handleSend}
            className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">

              <div className="flex items-center space-x-2">
                <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />

                <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-3 bg-emerald-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors">

                  <Send size={20} />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}