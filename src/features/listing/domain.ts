import { z } from 'zod';
export const marketplaces = ['Shopee', 'Mercado Livre', 'TikTok Shop', 'SHEIN'] as const;
export const factsSchema = z.object({ name: z.string().trim().min(1).max(200), fabric: z.string().max(500), composition: z.string().max(500), sizes: z.string().max(500), measurements: z.string().max(1800), colors: z.string().max(500), fit: z.string().max(500), differentials: z.string().max(1500), benefits: z.string().max(1500), additional: z.string().max(1800), observed: z.string().max(1800) });
export type Facts = z.infer<typeof factsSchema>;
export const emptyFacts: Facts = { name: '', fabric: '', composition: '', sizes: '', measurements: '', colors: '', fit: '', differentials: '', benefits: '', additional: '', observed: '' };
export const contentSchema = z.object({ title: z.string(), alternatives: z.array(z.string()).max(3), primaryKeyword: z.string(), keywords: z.array(z.string()), searches: z.array(z.string()), description: z.string(), technical: z.string(), benefits: z.string(), objections: z.string(), looks: z.string() });
export type ListingContent = z.infer<typeof contentSchema>;
export const emptyContent: ListingContent = { title: '', alternatives: [], primaryKeyword: '', keywords: [], searches: [], description: '', technical: '', benefits: '', objections: '', looks: '' };
export interface Rule { marketplace: string; title_limit: number; description_limit: number; source: string; verified_at: string | null; rules: string; version: number }
// Editable provisional starting settings, never presented as official marketplace rules.
export const initialRules: Rule[] = marketplaces.map(marketplace => ({ marketplace, title_limit: marketplace === 'Mercado Livre' ? 60 : 120, description_limit: 5000, source: 'Configuração provisória da loja — confirmar com o marketplace', verified_at: null, rules: '', version: 1 }));
export const characterCount = (text: string) => Array.from(text).length;
export const fullDescription = (c: ListingContent) => [c.description, c.technical, c.benefits, c.objections, c.looks].filter(Boolean).join('\n\n');
export function approvalErrors(content: ListingContent, rule: Rule) {
 const errors: string[] = [];
 if (!content.title.trim()) errors.push('Informe o título principal.');
 if ([content.title, ...content.alternatives].some(t => characterCount(t) > rule.title_limit)) errors.push(`Título acima de ${rule.title_limit} caracteres.`);
 if (!content.description.trim()) errors.push('Informe a descrição.');
 if (characterCount(fullDescription(content)) > rule.description_limit) errors.push(`Descrição acima de ${rule.description_limit} caracteres.`);
 return errors;
}
export const photoLabels = ['Foto principal', 'Outro enquadramento', 'Detalhes e acabamento', 'Caimento e modelagem', 'Sugestão de look', 'Tabela de medidas', 'Estilo de vida', 'Benefícios visíveis'];
export function photoPlan(count: number, measurements: string) { if (![6,7,8].includes(count)) throw new Error('Selecione 6, 7 ou 8 fotos.'); return photoLabels.slice(0,count).map((label,position)=>({ position, label: position===5 && !measurements.trim() ? 'Enquadramento complementar' : label, isMeasurement: position===5 && !!measurements.trim() })); }
export function validateReference(file: { type: string; size: number }) { if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Envie uma foto PNG, JPG ou WEBP.'); if (file.size > 10*1024*1024 || file.size===0) throw new Error('Cada foto deve ter até 10 MB.'); }
