/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import path from "path"

import fs from 'fs'

const localLoggerPlugin = () => ({
  name: 'local-logger',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/log' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const logFileName = `application-${dateStr}.txt`;
            const logEntry = `[${now.toISOString()}] [${data.level}] ${data.message}\n`;
            
            // Append log
            fs.appendFileSync(path.resolve(import.meta.dirname, logFileName), logEntry);
            
            // Auto delete logs older than 10 days
            const tenDaysAgo = now.getTime() - (10 * 24 * 60 * 60 * 1000);
            const files = fs.readdirSync(import.meta.dirname);
            
            files.forEach(file => {
              if (file.startsWith('application-') && file.endsWith('.txt')) {
                const datePart = file.replace('application-', '').replace('.txt', '');
                const fileDate = new Date(datePart);
                if (!isNaN(fileDate.getTime()) && fileDate.getTime() < tenDaysAgo) {
                  try {
                    fs.unlinkSync(path.resolve(import.meta.dirname, file));
                  } catch (e) {
                    console.error('Failed to delete old log', e);
                  }
                }
              }
            });

            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to log' }));
          }
        });
        return;
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  plugins: [
    localLoggerPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'MyBizz',
        short_name: 'MyBizz',
        description: 'Multi-business retail and exhibition platform',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-leaflet';
            }
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
