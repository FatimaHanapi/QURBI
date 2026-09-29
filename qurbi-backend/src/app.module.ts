import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TasksService } from './TaskScheduling/task.service';
import { ScheduleModule } from '@nestjs/schedule';
import { GoogleDriveModule } from './google-drive/google-drive.module';
/*
  HOLD UP, looking and adding for modules/entities?
  use APP_MODULES and APP_ENTITIES instead
*/
import { APP_ENTITIES } from './app.entities';
import { APP_MODULES } from './app.modules';
import { jwtConstants } from './auth/jwt.constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      name: 'default',
      // XAMPP ships MariaDB, which rejects `NULL` on generated columns (see
      // Reservation.activeLivestockId) unless TypeORM knows it is MariaDB.
      type: process.env.DB_TYPE === 'mariadb' ? 'mariadb' : 'mysql',
      // logger: new TypeOrmLogger(),
      // logging: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      // maxQueryExecutionTime: 1000,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      charset: 'utf8mb4',
      // DEV ONLY when DB_SYNC=true: automatic schema changes can rewrite data.
      // Keep false outside local development and use reviewed migrations.
      synchronize: process.env.DB_SYNC === 'true',
      entities: APP_ENTITIES,
      // debug:true,
    }),
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: {
        expiresIn: jwtConstants.accessTtl,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.MINIT ? process.env.MINIT : '60000'),
        limit: parseInt(process.env.LIMIT ? process.env.LIMIT : '100'),
      },
    ]),
    ScheduleModule.forRoot(),
    GoogleDriveModule,
    ...APP_MODULES,
  ],
  controllers: [AppController],
  providers: [
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: DecryptPayloadInterceptor,
    // },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: encryptResponseInterceptor,
    // },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
    TasksService,
  ],
  exports: [AppService],
})
export class AppModule {}
