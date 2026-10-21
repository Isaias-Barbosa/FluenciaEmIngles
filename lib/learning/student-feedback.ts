export type StudentFeedback = { id: string; user_id: string; user_name: string; user_email: string | null; message: string; created_at: string };
export type FeedbackPage = { feedbacks: StudentFeedback[]; total: number; page: number; pageSize: number };
export function validateFeedback(message: string) {
  const text = message.trim();
  if (text.length < 10 || text.length > 3000) throw new Error("Escreva um feedback com 10 a 3000 caracteres.");
  return text;
}
