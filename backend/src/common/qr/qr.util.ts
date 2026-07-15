import * as QRCode from 'qrcode';

/**
 * Renders a token as a scannable QR code image (base64 PNG data URI) for the client to
 * display as the user's digital parking ticket.
 */
export async function toQrCodeImage(token: string): Promise<string> {
  return QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 2 });
}
