import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { EmbeddingService } from '../../common/embedding/embedding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { chunkText } from './chunk-text.util';
import { PolicyDocumentResponseDto } from './dto/policy-document-response.dto';
import { UploadPolicyDto } from './dto/upload-policy.dto';

export interface PolicySearchResult {
  documentTitle: string;
  content: string;
  score: number;
}

@Injectable()
export class PolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: UploadPolicyDto,
    uploadedBy: string,
  ): Promise<PolicyDocumentResponseDto> {
    const parser = new PDFParse({ data: file.buffer });
    const { text } = await parser.getText();
    await parser.destroy();

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new BadRequestException(
        'No extractable text found in this PDF — it may be a scanned image without a text layer',
      );
    }

    const embeddings = await this.embeddingService.embedBatch(chunks);

    const document = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.policyDocument.create({
        data: {
          title: dto.title,
          filename: file.originalname,
          uploadedBy,
        },
      });
      await tx.policyChunk.createMany({
        data: chunks.map((content, index) => ({
          documentId: doc.id,
          content,
          chunkIndex: index,
          embedding: embeddings[index],
        })),
      });
      return doc;
    });

    return {
      id: document.id,
      title: document.title,
      filename: document.filename,
      chunkCount: chunks.length,
      createdAt: document.createdAt,
    };
  }

  async findAll(): Promise<PolicyDocumentResponseDto[]> {
    const documents = await this.prisma.policyDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    });

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      chunkCount: doc._count.chunks,
      createdAt: doc.createdAt,
    }));
  }

  async remove(id: string): Promise<void> {
    const document = await this.prisma.policyDocument.findUnique({
      where: { id },
    });
    if (!document) {
      throw new NotFoundException('Policy document not found');
    }
    await this.prisma.policyDocument.delete({ where: { id } });
  }

  async search(query: string, topK = 5): Promise<PolicySearchResult[]> {
    const chunks = await this.prisma.policyChunk.findMany({
      select: {
        content: true,
        embedding: true,
        document: { select: { title: true } },
      },
    });
    if (chunks.length === 0) return [];

    const queryEmbedding = await this.embeddingService.embed(query);

    return chunks
      .map((chunk) => ({
        documentTitle: chunk.document.title,
        content: chunk.content,
        score: this.embeddingService.cosineSimilarity(
          queryEmbedding,
          chunk.embedding,
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
