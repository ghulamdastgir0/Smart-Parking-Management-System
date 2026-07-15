import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CheckpointController } from './checkpoint.controller';
import { CheckpointService } from './checkpoint.service';

@Module({
  imports: [AuthModule],
  controllers: [CheckpointController],
  providers: [CheckpointService],
})
export class CheckpointModule {}
