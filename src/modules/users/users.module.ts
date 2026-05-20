import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersAdminRepository } from './users-admin.repository';

@Module({
  imports: [AuthModule], // necesitamos USER_REPOSITORY desde AuthModule.
  controllers: [UsersController],
  providers: [UsersService, UsersAdminRepository],
  exports: [UsersService, UsersAdminRepository],
})
export class UsersModule {}
