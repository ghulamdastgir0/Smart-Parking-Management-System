import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosError } from 'axios';
import { catchError, firstValueFrom, of } from 'rxjs';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface AddressVerificationResult {
  verified: boolean;
  formattedAddress?: string;
}

interface GeocodeFeature {
  properties: {
    label?: string;
    confidence?: number;
    match_type?: string;
  };
}

interface GeocodeResponse {
  features?: GeocodeFeature[];
}

const MIN_CONFIDENCE = 0.7;
// Pelias returns a best-effort text match (e.g. a venue named "Gibberish") even for garbage
// input, tagged as "fallback" — only "exact"/"interpolated" reflect an actual address match.
const REJECTED_MATCH_TYPES = new Set(['fallback']);

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly mapsApiKey: string | undefined;
  private readonly mapsApiBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mapsApiKey = this.configService.get<string>('MAPS_API_KEY');
    this.mapsApiBaseUrl = this.configService.get<string>(
      'MAPS_API_BASE_URL',
      'https://api.openrouteservice.org',
    );
  }

  /**
   * Verifies an address via the OpenRouteService (Pelias) geocoder. Failures — including a
   * missing/invalid key or no confident match — degrade to `verified: false` so lot creation
   * never hard-fails on a third-party outage.
   */
  async verifyAddress(address: string): Promise<AddressVerificationResult> {
    const request$ = this.httpService
      .get<GeocodeResponse>(`${this.mapsApiBaseUrl}/geocode/search`, {
        params: { api_key: this.mapsApiKey, text: address, size: 1 },
      })
      .pipe(
        catchError((error: AxiosError) => {
          this.logger.warn(
            `Maps provider address verification failed: ${error.message}`,
          );
          return of({ data: null as GeocodeResponse | null });
        }),
      );

    const response = await firstValueFrom(request$);
    const topMatch = response.data?.features?.[0];
    const confidence = topMatch?.properties.confidence ?? 0;
    const matchType = topMatch?.properties.match_type;

    if (
      !topMatch ||
      confidence < MIN_CONFIDENCE ||
      (matchType && REJECTED_MATCH_TYPES.has(matchType))
    ) {
      return { verified: false };
    }

    return { verified: true, formattedAddress: topMatch.properties.label };
  }
}
