import { Article, ResearchContext, Variant } from '@/types';

export const extractResearchContext = (articles: Article[]): ResearchContext => {
  const text = articles.map(a => `${a.title} ${a.abstract}`).join(' ');
  
  // Gene Extraction
  const geneMatch = text.match(/\b(TP53|BRCA1|BRCA2|EGFR|KRAS|PIK3CA|PTEN|RB1|APC|VHL|BRAF|MLH1|MSH2|CDH1|PALB2)\b/i);
  const gene = geneMatch ? geneMatch[1].toUpperCase() : null;

  // Variant Extraction (e.g., R175H)
  const variantRegex = /\b([A-Z]\d{2,4}[A-Z])\b/g;
  const matches = [...new Set(text.match(variantRegex) || [])].slice(0, 4);
  const variants: Variant[] = matches.map(id => ({
    id,
    freq: '—',
    status: text.toLowerCase().includes('pathogenic') ? 'PATHOGENIC' : 'VUS',
    cls: text.toLowerCase().includes('pathogenic') ? 'bg-error/10 text-error border-error/20' : 'bg-tertiary/10 text-tertiary border-tertiary/20'
  }));

  return {
    gene,
    variants,
    proteinName: gene ? (gene === 'TP53' ? 'P53' : gene) : null
  };
};
