import { Module } from '@nestjs/common';
import { FacebookModule } from '../facebook/facebook.module';
import { UidFinderController } from './uid-finder.controller';
import { UidFinderService } from './uid-finder.service';

@Module({
  imports: [FacebookModule],
  controllers: [UidFinderController],
  providers: [UidFinderService],
})
export class UidFinderModule {}
