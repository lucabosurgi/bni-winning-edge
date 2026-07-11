export type Member = {
  id: string;
  slug: string;
  business_name: string;
  contact_person: string | null;
  category: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  photo_url: string | null;
  review_rating: number | null;
  review_count: number | null;
  review_source: string | null;
  review_url: string | null;
  review_quote: string | null;
  published: boolean;
  approved: boolean;
  created_at: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
