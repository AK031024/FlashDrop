import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { webrtcService } from '../services/webrtc';
import { Send, Copy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TextShare: React.FC = () => {
  const [text, setText] = useState('');
  const { sharedTexts, me } = useStore();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    webrtcService.sendText(text);
    setText('');
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const isUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="w-full h-96 flex flex-col">
      <div className="mb-4">
        <h3 className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Shared Text & Links</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
        <AnimatePresence mode="popLayout">
          {sharedTexts.length > 0 ? (
            sharedTexts.map(msg => {
              const isMe = msg.senderId === me?.id;
              const isLink = isUrl(msg.text);
              
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex flex-col max-w-[90%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <div className={`p-4 rounded-3xl text-sm font-medium shadow-sm transition-all ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-secondary/80 text-foreground border border-border/50 rounded-tl-sm'
                  }`}>
                    {isLink ? (
                      <a href={msg.text} target="_blank" rel="noreferrer" className="underline underline-offset-4 decoration-2 decoration-primary/30 hover:decoration-primary break-all flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        {msg.text}
                      </a>
                    ) : (
                      <p className="break-words leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-3 mt-2 px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60`}>
                    <button onClick={() => handleCopy(msg.text)} className="hover:text-foreground transition-colors flex items-center gap-1.5 active:scale-90">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    {isLink && (
                      <a href={msg.text} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1.5 active:scale-90">
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center px-6"
            >
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center mb-4 rotate-3">
                <Send className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="font-bold text-sm text-foreground/60">No shared content</p>
              <p className="text-[10px] font-medium text-muted-foreground/60 mt-1 uppercase tracking-widest leading-relaxed">
                Send notes or links to everyone in the room instantly
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSend} className="mt-auto relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/5 to-primary/10 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex gap-2 p-1 bg-secondary/50 rounded-2xl border border-border/50 focus-within:border-primary/40 focus-within:bg-secondary/80 transition-all shadow-inner">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a thought or link..."
            className="flex-1 bg-transparent px-5 py-3.5 focus:outline-none text-sm font-medium placeholder:font-bold placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest placeholder:opacity-40"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-0 disabled:scale-90 hover:opacity-90 active:scale-95 transition-all shadow-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default TextShare;
