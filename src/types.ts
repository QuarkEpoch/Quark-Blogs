export type Category = 'law' | 'literature' | 'current-affairs' | 'socio-economic' | 'poems' | 'all';

export interface Post {
  id: string;
  title: string;
  category: Exclude<Category, 'all'>;
  lang: 'en' | 'bn';
  excerpt: string;
  content: string;
  image?: string;
  date: string;
  author: string;
}

export const CATEGORY_LABELS: Record<Exclude<Category, 'all'>, string> = {
  'law': 'Law',
  'literature': 'Literature',
  'current-affairs': 'Current Affairs',
  'socio-economic': 'Socio-Economic',
  'poems': 'Poems'
};

export const CATEGORY_ICONS: Record<Exclude<Category, 'all'>, string> = {
  'law': 'scale',
  'literature': 'book-open',
  'current-affairs': 'newspaper',
  'socio-economic': 'trending-up',
  'poems': 'feather'
};
