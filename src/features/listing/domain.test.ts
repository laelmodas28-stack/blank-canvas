import { describe, it, expect } from 'vitest';
import { approvalErrors, initialRules, emptyContent, photoPlan, characterCount, validateReference } from './domain';
describe('listing rules',()=>{
 it('blocks approval above the configured title limit',()=>{const rule={...initialRules[0],title_limit:10};expect(approvalErrors({...emptyContent,title:'12345678901',description:'Peça'},rule)).toContain('Título acima de 10 caracteres.');expect(approvalErrors({...emptyContent,title:'1234567890',description:'Peça'},rule)).toEqual([]);});
 it('checks alternatives and complete description',()=>{const rule={...initialRules[0],title_limit:3,description_limit:5};expect(approvalErrors({...emptyContent,title:'Top',alternatives:['Longo'],description:'123',technical:'456'},rule)).toHaveLength(2);});
 it.each([6,7,8])('creates exactly %i independent slots',count=>expect(photoPlan(count,'')).toHaveLength(count));
 it('does not invent measurements',()=>{expect(photoPlan(6,'')[5].isMeasurement).toBe(false);expect(photoPlan(6,'Busto: 90 cm')[5].isMeasurement).toBe(true);});
 it('rejects unsupported photo counts',()=>expect(()=>photoPlan(5,'')).toThrow());
 it('counts unicode characters',()=>expect(characterCount('á🧵')).toBe(2));
 it('rejects oversized reference images',()=>expect(()=>validateReference({type:'image/png',size:10*1024*1024+1})).toThrow());
 it('requires supported reference formats',()=>expect(()=>validateReference({type:'text/plain',size:100})).toThrow());
});
