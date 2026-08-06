import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PolicyDocumentResponseDto } from './dto/policy-document-response.dto';
import { UploadPolicyDto } from './dto/upload-policy.dto';
import { PdfFileValidator } from './pdf-file.validator';
import { PolicyService } from './policy.service';

const MAX_POLICY_PDF_BYTES = 20 * 1024 * 1024;

@ApiTags('Policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('policies')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload a company policy PDF (Admin only)',
    description:
      'Extracts the PDF text, splits it into chunks, embeds each chunk locally, and stores ' +
      'them so the AI assistant can answer policy questions grounded in this document.',
  })
  @ApiResponse({ status: 201, description: 'Policy uploaded and indexed' })
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_POLICY_PDF_BYTES }),
          new PdfFileValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadPolicyDto,
    @Req() req: Request,
  ): Promise<PolicyDocumentResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.policyService.upload(file, dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List uploaded policy documents (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Policy documents',
    type: [PolicyDocumentResponseDto],
  })
  findAll(): Promise<PolicyDocumentResponseDto[]> {
    return this.policyService.findAll();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a policy document and its chunks (Admin only)',
  })
  @ApiResponse({ status: 204, description: 'Policy document deleted' })
  @ApiResponse({ status: 404, description: 'Policy document not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.policyService.remove(id);
  }
}
