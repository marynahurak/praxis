import { getCollection, type CollectionEntry } from 'astro:content';
import { t, type Lang } from './config';

export type Article = CollectionEntry<'articles'>;

/** Адреса з урахуванням базового шляху сайту (/praxis/ на GitHub Pages). */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return `${base}/${clean}`;
}

/** Адреса сторінки потрібною мовою: українська — без префікса, англійська — /en/. */
export function localePath(lang: Lang, path = ''): string {
  return url(`${lang === 'en' ? 'en/' : ''}${path.replace(/^\//, '')}`);
}

export function langOf(a: Article): Lang {
  return a.id.startsWith('en/') ? 'en' : 'uk';
}

export function slugOf(a: Article): string {
  return a.id.replace(/^(uk|en)\//, '');
}

export function articleUrl(a: Article): string {
  return localePath(langOf(a), `articles/${slugOf(a)}/`);
}

const visible = (a: Article) => !(import.meta.env.PROD && a.data.draft);

export async function getAllArticles(): Promise<Article[]> {
  return (await getCollection('articles')).filter(visible);
}

export async function getArticles(lang: Lang): Promise<Article[]> {
  return (await getAllArticles())
    .filter((a) => langOf(a) === lang)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function readingTime(body = ''): number {
  const words = body.replace(/---[\s\S]*?---/, '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(t[lang].locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}
