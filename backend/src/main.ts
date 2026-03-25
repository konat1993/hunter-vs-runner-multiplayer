import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Server } from '@colyseus/core';
import { GameRoom } from './colyseus/rooms/game.room';
import { SupabaseService } from './supabase/supabase.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const port = parseInt(process.env.PORT ?? '2567', 10);
  const supabaseService = app.get(SupabaseService);
  const allowedCorsOrigins = (
    process.env.CORS_ORIGIN ?? 'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isOriginAllowed = (origin: string) => {
    return allowedCorsOrigins.some((allowedOrigin) => {
      if (allowedOrigin === origin) return true;
      if (!allowedOrigin.includes('*')) return false;

      // Supports values like "https://*.vercel.app"
      const escaped = allowedOrigin
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      return new RegExp(`^${escaped}$`).test(origin);
    });
  };

  const gameServer = new Server({
    express: (expressApp) => {
      expressApp.use((req, res, next) => {
        const requestOrigin = req.headers.origin;
        const resolvedOrigin =
          requestOrigin && isOriginAllowed(requestOrigin)
            ? requestOrigin
            : allowedCorsOrigins[0];

        res.header('Access-Control-Allow-Origin', resolvedOrigin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header(
          'Access-Control-Allow-Headers',
          'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        );
        res.header(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        );
        if (req.method === 'OPTIONS') {
          res.sendStatus(204);
          return;
        }
        next();
      });

      expressApp.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok' });
      });

      expressApp.get('/session/active-game', async (req, res) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
          ? authHeader.slice('Bearer '.length)
          : null;

        if (!token) {
          res.status(401).json({ error: 'Missing bearer token' });
          return;
        }

        try {
          const user = await supabaseService.verifyToken(token);
          const roomId = GameRoom.getActiveRoomIdForUser(user.id);
          res.status(200).json({ active: !!roomId, roomId: roomId ?? null });
        } catch {
          res.status(401).json({ error: 'Invalid token' });
        }
      });
    },
  });

  gameServer
    .define('game', GameRoom, { supabase: supabaseService })
    .sortBy({ clients: -1, createdAt: 1 });
  await gameServer.listen(port);

  console.log(
    `Colyseus server running on port ${port} (CORS origins: ${allowedCorsOrigins.join(', ')})`,
  );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
