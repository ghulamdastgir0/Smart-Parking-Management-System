import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosError } from 'axios';
import { catchError, firstValueFrom, of } from 'rxjs';
import { Coordinates } from './location.service';

export interface DrivingEta {
  distanceKm: number | null;
  durationMinutes: number | null;
}

interface MatrixResponse {
  distances?: number[][];
  durations?: number[][];
}

const EMPTY_ETA: DrivingEta = { distanceKm: null, durationMinutes: null };

/**
 * Wraps the OpenRouteService Matrix API (driving-car profile) to enrich straight-line search
 * results with real driving distance/ETA. Falls back to `EMPTY_ETA` per destination — rather
 * than failing the whole nearby-search request — if the key is missing/invalid or the
 * provider is unreachable.
 */
@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly apiKey: string | undefined;
  private readonly matrixUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('MAPS_API_KEY');
    this.matrixUrl = this.configService.get<string>(
      'MAPS_MATRIX_URL',
      'https://api.openrouteservice.org/v2/matrix/driving-car',
    );
  }

  /**
   * Returns one `DrivingEta` per entry in `destinations`, in the same order.
   */
  async getDrivingEtas(
    origin: Coordinates,
    destinations: Coordinates[],
  ): Promise<DrivingEta[]> {
    if (destinations.length === 0) {
      return [];
    }

    // ORS expects [longitude, latitude] locations, with `origin` fixed as source index 0.
    const locations = [origin, ...destinations].map((coordinates) => [
      coordinates.longitude,
      coordinates.latitude,
    ]);

    const request$ = this.httpService
      .post<MatrixResponse>(
        this.matrixUrl,
        {
          locations,
          sources: [0],
          destinations: destinations.map((_, index) => index + 1),
          metrics: ['distance', 'duration'],
        },
        {
          headers: {
            Authorization: this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      )
      .pipe(
        catchError((error: AxiosError) => {
          this.logger.warn(
            `Maps provider matrix request failed: ${error.message}`,
          );
          return of({ data: null as MatrixResponse | null });
        }),
      );

    const response = await firstValueFrom(request$);
    const distancesMeters = response.data?.distances?.[0] ?? [];
    const durationsSeconds = response.data?.durations?.[0] ?? [];

    return destinations.map((_, index) =>
      this.toDrivingEta(distancesMeters[index], durationsSeconds[index]),
    );
  }

  private toDrivingEta(
    distanceMeters?: number,
    durationSeconds?: number,
  ): DrivingEta {
    if (
      typeof distanceMeters !== 'number' ||
      typeof durationSeconds !== 'number'
    ) {
      return EMPTY_ETA;
    }

    return {
      distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
      durationMinutes: Math.round(durationSeconds / 60),
    };
  }
}
