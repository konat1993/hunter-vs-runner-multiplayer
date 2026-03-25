import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthModule } from './health/health.module';
import { ColyseusModule } from './colyseus/colyseus.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    HealthModule,
    ColyseusModule,
  ],
})
export class AppModule {}
