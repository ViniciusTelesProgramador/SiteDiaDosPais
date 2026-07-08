'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Heart, 
  Upload, 
  Trash2, 
  Palette, 
  Sparkles, 
  Check, 
  Loader2, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface PhotoFile {
  file: File;
  previewUrl: string;
}

export default function CriarPresente() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [nomePai, setNomePai] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [tema, setTema] = useState<'classico' | 'divertido'>('classico');
  const [plano, setPlano] = useState<'basico' | 'completo'>('basico');

  // UI / Logic States
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Supabase is properly configured
  const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && !url.includes('placeholder') && key && !key.includes('placeholder');
  };

  // Image validation and handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setError(null);

    const filesArray = Array.from(e.target.files);
    
    // Check if total photos would exceed 5
    if (photos.length + filesArray.length > 5) {
      setError('Você pode enviar no máximo 5 fotos.');
      return;
    }

    const validPhotos: PhotoFile[] = [];

    for (const file of filesArray) {
      // Validate type (must be image)
      if (!file.type.startsWith('image/')) {
        setError(`O arquivo ${file.name} não é uma imagem válida.`);
        continue;
      }

      // Validate size (max 5MB = 5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        setError(`A imagem ${file.name} excede o limite de tamanho de 5MB.`);
        continue;
      }

      validPhotos.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setPhotos((prev) => [...prev, ...validPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Convert files to base64 for simulation storage
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePai.trim()) {
      setError('Por favor, informe o nome do seu pai.');
      return;
    }
    if (!mensagem.trim()) {
      setError('Por favor, escreva uma mensagem especial.');
      return;
    }
    if (photos.length === 0) {
      setError('Por favor, adicione pelo menos uma foto.');
      return;
    }

    setLoading(true);
    setError(null);

    const configured = isSupabaseConfigured();

    try {
      if (!configured) {
        console.log('Supabase not configured. Running in simulation mode...');

        // Convert photos to base64 to store in localStorage for simulation preview
        const base64Photos = await Promise.all(
          photos.map(p => fileToBase64(p.file))
        );

        const mockId = crypto.randomUUID();
        const mockDraft = {
          id: mockId,
          nome_destinatario: nomePai,
          mensagem: mensagem,
          midias: base64Photos,
          tema,
          pago: false,
          plano,
          criado_em: new Date().toISOString(),
          isMock: true
        };

        // Save to localStorage
        localStorage.setItem(`draft_${mockId}`, JSON.stringify(mockDraft));
        
        // Wait a second to simulate server delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        router.push(`/preview/${mockId}`);
        return;
      }

      // 1. Upload files directly to Supabase Storage
      const uploadedUrls: string[] = [];
      const pageId = crypto.randomUUID();

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileExt = photo.file.name.split('.').pop() || 'jpg';
        const fileName = `${crypto.randomUUID()}-${i}.${fileExt}`;
        const filePath = `${pageId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos')
          .upload(filePath, photo.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Falha no upload da foto ${i + 1}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('fotos')
          .getPublicUrl(filePath);

        if (!publicUrlData.publicUrl) {
          throw new Error('Falha ao obter URL pública para a imagem enviada.');
        }

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      // 2. Insert record into `paginas` table in Supabase
      const { error: dbError } = await supabase
        .from('paginas')
        .insert({
          id: pageId,
          nome_destinatario: nomePai,
          mensagem: mensagem,
          midias: uploadedUrls,
          tema: tema,
          pago: false, // Initial status is unpaid (draft)
          plano: plano
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      router.push(`/preview/${pageId}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Ocorreu um erro ao salvar o presente. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-sm font-semibold mb-3">
            <Heart className="w-4 h-4 fill-current" />
            <span>Dia dos Pais 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Crie um Recado Surpresa
          </h1>
          <p className="mt-2 text-base text-gray-600">
            Monte uma página personalizada e emocionante para o seu pai, gerando um cartão com QR Code exclusivo.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-8 px-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Conteúdo</span>
          </div>
          <div className="h-0.5 flex-1 bg-gray-200 mx-2">
            <div className={`h-full bg-indigo-600 transition-all duration-300`} style={{ width: step > 1 ? '100%' : '0%' }}></div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Design & Plano</span>
          </div>
        </div>

        {/* Form Box */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {!isSupabaseConfigured() && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-semibold block mb-0.5">Modo de Simulação Ativo</span>
                As credenciais do Supabase não foram configuradas. A página será salva temporariamente no navegador para permitir que você teste o fluxo por completo!
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Nome do Pai */}
                <div>
                  <label htmlFor="nomePai" className="block text-sm font-semibold text-gray-700 mb-1">
                    Nome do seu pai *
                  </label>
                  <input
                    type="text"
                    id="nomePai"
                    value={nomePai}
                    onChange={(e) => setNomePai(e.target.value)}
                    placeholder="Ex: Carlos, Pai, Coroa..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white"
                    required
                  />
                </div>

                {/* Mensagem */}
                <div>
                  <label htmlFor="mensagem" className="block text-sm font-semibold text-gray-700 mb-1">
                    Mensagem de afeto *
                  </label>
                  <div className="relative">
                    <textarea
                      id="mensagem"
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      placeholder="Escreva tudo o que ele significa para você..."
                      rows={5}
                      maxLength={1000}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white resize-none"
                      required
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                      {mensagem.length}/1000
                    </div>
                  </div>
                </div>

                {/* Photo Upload Area */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Fotos de recordação * (máx. 5 fotos)
                  </label>
                  
                  {/* Custom Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer bg-gray-50/30 hover:bg-indigo-50/20 transition-all group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        Clique para enviar ou arraste suas fotos
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG ou WEBP de até 5MB cada
                      </p>
                    </div>
                  </div>

                  {/* Thumbnail Previews */}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-5 gap-3 mt-4">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-150 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.previewUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover foto"
                          >
                            <Trash2 className="w-5 h-5 text-rose-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Next Step Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!nomePai.trim() || !mensagem.trim() || photos.length === 0) {
                      setError('Preencha o nome do pai, a mensagem e adicione fotos antes de prosseguir.');
                      return;
                    }
                    setError(null);
                    setStep(2);
                  }}
                  className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-100 hover:shadow-lg flex items-center justify-center gap-2 group"
                >
                  <span>Continuar para Visual & Plano</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-fadeIn">
                {/* Seleção de Tema */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-indigo-600" />
                    <span>Escolha o Estilo Visual (Tema)</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Clássico */}
                    <div
                      onClick={() => setTema('classico')}
                      className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
                        tema === 'classico'
                          ? 'border-indigo-600 bg-indigo-50/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-900">Clássico Elegant</span>
                        {tema === 'classico' && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Tipografia elegante (serifa), cores sóbrias e transições suaves. Ideal para pais tradicionais.
                      </p>
                      <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                        <div className="h-full w-1/3 bg-slate-800"></div>
                        <div className="h-full w-1/3 bg-stone-300"></div>
                        <div className="h-full w-1/3 bg-amber-100"></div>
                      </div>
                    </div>

                    {/* Divertido */}
                    <div
                      onClick={() => setTema('divertido')}
                      className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
                        tema === 'divertido'
                          ? 'border-indigo-600 bg-indigo-50/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-900">Descontraído</span>
                        {tema === 'divertido' && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-xs text-gray-500 leading-normal">
                        Cores vibrantes, ícones dinâmicos e design descolado. Perfeito para pais modernos.
                      </p>
                      <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                        <div className="h-full w-1/3 bg-emerald-500"></div>
                        <div className="h-full w-1/3 bg-yellow-400"></div>
                        <div className="h-full w-1/3 bg-sky-400"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seleção de Plano */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Selecione o Plano</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Básico */}
                    <div
                      onClick={() => setPlano('basico')}
                      className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex items-center justify-between ${
                        plano === 'basico'
                          ? 'border-indigo-600 bg-indigo-50/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${plano === 'basico' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'}`}>
                          {plano === 'basico' && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 text-sm sm:text-base">Plano Básico</span>
                          <span className="text-xs text-gray-500 block">Mensagem + Fotos + QR Code para imprimir</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-gray-950">R$ 9,90</span>
                        <span className="text-xxs text-gray-400 block font-medium">pagamento único</span>
                      </div>
                    </div>

                    {/* Completo */}
                    <div
                      onClick={() => setPlano('completo')}
                      className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex items-center justify-between ${
                        plano === 'completo'
                          ? 'border-indigo-600 bg-indigo-50/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${plano === 'completo' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'}`}>
                          {plano === 'completo' && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-sm sm:text-base">Plano Completo</span>
                            <span className="bg-amber-100 text-amber-700 text-xxs font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Premium</span>
                          </div>
                          <span className="text-xs text-gray-500 block">Tudo do Básico + Envio por e-mail + Alta Resolução</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-gray-950">R$ 14,90</span>
                        <span className="text-xxs text-gray-400 block font-medium">pagamento único</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back and Submit Actions */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep(1);
                    }}
                    className="flex-1 py-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-100 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Criando...</span>
                      </>
                    ) : (
                      <>
                        <span>Gerar Prévia</span>
                        <Sparkles className="w-5 h-5 fill-current" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
