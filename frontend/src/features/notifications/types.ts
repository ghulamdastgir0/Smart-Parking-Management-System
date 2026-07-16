export interface Notification {
  id: string;
  recipientRole: "USER" | "MANAGER";
  reservationId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
