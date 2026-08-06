import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../../common/embedding/embedding.module';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';

@Module({
  imports: [EmbeddingModule],
  controllers: [PolicyController],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}
