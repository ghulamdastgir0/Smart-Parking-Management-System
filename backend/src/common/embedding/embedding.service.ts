import { Injectable } from '@nestjs/common';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'; // 384-dim sentence embeddings, runs locally (ONNX/CPU)

// Local, offline embedding model — no external embedding API. `@huggingface/transformers`
// (the maintained successor to `@xenova/transformers`, same author/model hub) ships as
// ESM-only, so it's loaded via dynamic import() rather than require() from this CommonJS
// build; the pipeline itself is loaded lazily (first call, not module init) since it's slow
// and downloads/caches the model weights on first use.
@Injectable()
export class EmbeddingService {
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = import('@huggingface/transformers').then(
        ({ pipeline }) => pipeline('feature-extraction', MODEL_ID),
      );
    }
    return this.pipelinePromise;
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const extractor = await this.getPipeline();
    const results: number[][] = [];
    for (const text of texts) {
      const output = await extractor(text, {
        pooling: 'mean',
        normalize: true,
      });
      results.push(Array.from(output.data as Float32Array));
    }
    return results;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
