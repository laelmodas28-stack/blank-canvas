import { Camera } from 'lucide-react';
import { AccountGate } from '@/features/listing/AccountGate';
import { Workspace } from '@/features/listing/Workspace';
export default function CriadorInteligente(){return <div className="max-w-[1440px] mx-auto min-w-0"><header className="mb-4"><div className="flex items-start gap-3"><Camera className="h-7 w-7 text-primary shrink-0 mt-1"/><div><h1 className="text-xl sm:text-2xl font-semibold">Criador de Anúncio Inteligente</h1><p className="text-sm text-muted-foreground mt-1">Moda e vestuário · Shopee, Mercado Livre, TikTok Shop e SHEIN</p></div></div></header><AccountGate>{userId=><Workspace userId={userId}/>}</AccountGate></div>;}
