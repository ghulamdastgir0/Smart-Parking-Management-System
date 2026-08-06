import { FileValidator } from '@nestjs/common';

export class PdfFileValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    return file?.mimetype === 'application/pdf';
  }

  buildErrorMessage(): string {
    return 'Only PDF files are accepted';
  }
}
