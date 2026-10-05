import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

function globalServerConfigPlugin() {
  return {
    name: 'global-server-config',
    configureServer(server: any) {
      server.middlewares.use('/api/drive/upload', async (req: any, res: any) => {
        try {
          const { default: handler } = await import('./api/drive/upload');
          await handler(req, res);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });

      server.middlewares.use('/api/drive/test-connection', async (req: any, res: any) => {
        try {
          const { default: handler } = await import('./api/drive/test-connection');
          await handler(req, res);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });

      server.middlewares.use('/api/server-config', (req: any, res: any) => {
        const filePath = path.resolve(__dirname, 'public/supabase-config.json');
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          if (fs.existsSync(filePath)) {
            return res.end(fs.readFileSync(filePath, 'utf8'));
          }
          return res.end(JSON.stringify({ url: 'https://seklcpvakyaakgbsnlzt.supabase.co', anonKey: '' }));
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (!fs.existsSync(path.resolve(__dirname, 'public'))) {
                fs.mkdirSync(path.resolve(__dirname, 'public'), { recursive: true });
              }
              fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        res.statusCode = 405;
        res.end();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), globalServerConfigPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
