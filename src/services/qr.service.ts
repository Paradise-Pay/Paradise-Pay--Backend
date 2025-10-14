import QRCode from 'qrcode';
import crypto from 'crypto';

export interface QRCodeData {
  ticket_id: string;
  ticket_number: string;
  event_id: string;
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  timestamp: number;
  signature: string;
}

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

class QRService {
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.QR_SECRET_KEY || 'paradise-pay-qr-secret-key-change-in-production';
  }

  /**
   * Generate QR code data for a ticket
   */
  generateTicketQRData(ticketData: {
    ticket_id: string;
    ticket_number: string;
    event_id: string;
    user_id: string;
    attendee_name: string;
    attendee_email: string;
  }): QRCodeData {
    const timestamp = Date.now();
    const dataToSign = `${ticketData.ticket_id}:${ticketData.event_id}:${ticketData.user_id}:${timestamp}`;
    const signature = this.generateSignature(dataToSign);

    return {
      ticket_id: ticketData.ticket_id,
      ticket_number: ticketData.ticket_number,
      event_id: ticketData.event_id,
      user_id: ticketData.user_id,
      attendee_name: ticketData.attendee_name,
      attendee_email: ticketData.attendee_email,
      timestamp,
      signature
    };
  }

  /**
   * Generate a digital signature for QR code data
   */
  private generateSignature(data: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify the signature of QR code data
   */
  verifyQRSignature(qrData: QRCodeData): boolean {
    const dataToSign = `${qrData.ticket_id}:${qrData.event_id}:${qrData.user_id}:${qrData.timestamp}`;
    const expectedSignature = this.generateSignature(dataToSign);
    return expectedSignature === qrData.signature;
  }

  /**
   * Generate QR code as base64 string
   */
  async generateQRCode(
    data: string | QRCodeData, 
    options: QRCodeOptions = {}
  ): Promise<string> {
    const defaultOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M' as const
    };

    const qrOptions = { ...defaultOptions, ...options };

    try {
      const qrCodeDataURL = await QRCode.toDataURL(
        typeof data === 'string' ? data : JSON.stringify(data),
        qrOptions
      );
      
      // Extract base64 data from data URL
      return qrCodeDataURL.split(',')[1];
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code for a ticket with embedded data
   */
  async generateTicketQRCode(
    ticketData: {
      ticket_id: string;
      ticket_number: string;
      event_id: string;
      user_id: string;
      attendee_name: string;
      attendee_email: string;
    },
    options?: QRCodeOptions
  ): Promise<{ qrData: QRCodeData; qrCodeBase64: string }> {
    const qrData = this.generateTicketQRData(ticketData);
    const qrCodeBase64 = await this.generateQRCode(qrData, options);

    return {
      qrData,
      qrCodeBase64
    };
  }

  /**
   * Generate QR code URL for ticket verification
   */
  generateTicketVerificationURL(ticket_number: string, baseUrl?: string): string {
    const base = baseUrl || process.env.BASE_URL || 'https://paradisepay.com';
    return `${base}/verify-ticket/${ticket_number}`;
  }

  /**
   * Parse QR code data from string
   */
  parseQRCodeData(qrString: string): QRCodeData | null {
    try {
      const parsed = JSON.parse(qrString);
      
      // Validate required fields
      if (
        !parsed.ticket_id ||
        !parsed.ticket_number ||
        !parsed.event_id ||
        !parsed.user_id ||
        !parsed.attendee_name ||
        !parsed.attendee_email ||
        !parsed.timestamp ||
        !parsed.signature
      ) {
        return null;
      }

      return parsed as QRCodeData;
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      return null;
    }
  }

  /**
   * Check if QR code is expired (optional time-based validation)
   */
  isQRCodeExpired(qrData: QRCodeData, maxAgeHours: number = 24): boolean {
    const now = Date.now();
    const age = now - qrData.timestamp;
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
    return age > maxAge;
  }

  /**
   * Generate QR code for event check-in (for organizers)
   */
  async generateEventCheckInQR(
    event_id: string,
    organizer_id: string,
    options?: QRCodeOptions
  ): Promise<{ qrData: any; qrCodeBase64: string }> {
    const checkInData = {
      event_id,
      organizer_id,
      type: 'event_checkin',
      timestamp: Date.now(),
      signature: this.generateSignature(`${event_id}:${organizer_id}:${Date.now()}`)
    };

    const qrCodeBase64 = await this.generateQRCode(JSON.stringify(checkInData), options);

    return {
      qrData: checkInData,
      qrCodeBase64
    };
  }

  /**
   * Generate QR code for digital card integration
   */
  async generateDigitalCardQR(
    card_number: string,
    user_id: string,
    options?: QRCodeOptions
  ): Promise<{ qrData: any; qrCodeBase64: string }> {
    const cardData = {
      card_number,
      user_id,
      type: 'digital_card',
      timestamp: Date.now(),
      signature: this.generateSignature(`${card_number}:${user_id}:${Date.now()}`)
    };

    const qrCodeBase64 = await this.generateQRCode(JSON.stringify(cardData), options);

    return {
      qrData: cardData,
      qrCodeBase64
    };
  }

  /**
   * Generate multiple QR codes for batch ticket creation
   */
  async generateBatchTicketQRCodes(
    tickets: Array<{
      ticket_id: string;
      ticket_number: string;
      event_id: string;
      user_id: string;
      attendee_name: string;
      attendee_email: string;
    }>,
    options?: QRCodeOptions
  ): Promise<Array<{ ticket_id: string; qrData: QRCodeData; qrCodeBase64: string }>> {
    const promises = tickets.map(async (ticket) => {
      const { qrData, qrCodeBase64 } = await this.generateTicketQRCode(ticket, options);
      return {
        ticket_id: ticket.ticket_id,
        qrData,
        qrCodeBase64
      };
    });

    return Promise.all(promises);
  }

  /**
   * Generate QR code for event sharing
   */
  async generateEventShareQR(
    event_id: string,
    baseUrl?: string,
    options?: QRCodeOptions
  ): Promise<{ qrData: any; qrCodeBase64: string }> {
    const shareUrl = `${baseUrl || process.env.BASE_URL || 'https://paradisepay.com'}/events/${event_id}`;
    const shareData = {
      type: 'event_share',
      event_id,
      url: shareUrl,
      timestamp: Date.now()
    };

    const qrCodeBase64 = await this.generateQRCode(JSON.stringify(shareData), options);

    return {
      qrData: shareData,
      qrCodeBase64
    };
  }
}

// Export singleton instance
export const qrService = new QRService();
export default qrService;
