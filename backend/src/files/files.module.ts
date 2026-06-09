import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FirebaseConfig } from '../config/firebase.config';

@Module({
    controllers: [FilesController],
    providers: [
        FilesService,
        // TRANSITIONAL: enables the R2 → Firebase mirror in FilesService.
        // Provided by class (not via FichiersModule) to avoid a module cycle —
        // FichiersModule imports FilesModule for the reverse mirror.
        { provide: 'FirebaseConfig', useClass: FirebaseConfig },
    ],
    exports: [FilesService],
})
export class FilesModule { }
