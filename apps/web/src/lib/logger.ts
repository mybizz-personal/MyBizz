import { supabase } from './supabase';

export const logToFile = async (level: 'INFO' | 'WARN' | 'ERROR', message: string, metadata?: Record<string, any>) => {
  try {
    if (import.meta.env.DEV) {
      try {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level, message, metadata })
        });
      } catch {
        // Fallback silently if dev server logger isn't active
      }
    } else if (level === 'ERROR') {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          await supabase.from('audit_logs').insert({
            action: 'CLIENT_ERROR',
            entity_type: 'System',
            metadata: { message, ...metadata, timestamp: new Date().toISOString() }
          });
        }
      } catch {
        // ignore telemetry errors to not block user interaction
      }
    }
  } catch (err) {
    console.error('Logger failure:', err);
  }
};
