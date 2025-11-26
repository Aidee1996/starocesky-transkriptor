
import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { TranscriptionViewer } from './components/TranscriptionViewer';
import { Button } from './components/Button';
import { transcribeDocument } from './services/geminiService';
import { AppStatus, FileData, BatchItem, RequestMode } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestMode, setRequestMode] = useState<RequestMode>(RequestMode.BOTH);

  const handleFilesSelected = (newFiles: FileData[]) => {
    const newItems: BatchItem[] = newFiles.map(f => ({
      ...f,
      status: AppStatus.QUEUED
    }));
    
    setBatchItems(prev => [...prev, ...newItems]);
    if (status === AppStatus.IDLE || status === AppStatus.COMPLETED) {
      setStatus(AppStatus.IDLE); // Ready to config
      if (!selectedItemId && newItems.length > 0) {
        setSelectedItemId(newItems[0].id);
      }
    }
  };

  const removeFile = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  };

  const handleBatchTranscribe = async () => {
    if (batchItems.length === 0) return;

    setStatus(AppStatus.PROCESSING);
    setError(null);

    // Clone array to update state
    const queue = [...batchItems];

    // Process sequentially to avoid rate limits and give good UX feedback
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      
      // Skip if already done
      if (item.status === AppStatus.COMPLETED) continue;

      // Update status to processing
      setBatchItems(prev => prev.map(p => p.id === item.id ? { ...p, status: AppStatus.PROCESSING } : p));

      try {
        const transcription = await transcribeDocument(item.base64, item.mimeType, requestMode);
        
        // Update success
        setBatchItems(prev => prev.map(p => p.id === item.id ? { 
          ...p, 
          status: AppStatus.COMPLETED, 
          result: transcription 
        } : p));

      } catch (err) {
        console.error(err);
        // Update error
        setBatchItems(prev => prev.map(p => p.id === item.id ? { 
          ...p, 
          status: AppStatus.ERROR, 
          error: "Chyba zpracování" 
        } : p));
      }
    }

    setStatus(AppStatus.COMPLETED);
  };

  const handleDownloadAll = () => {
    const completedItems = batchItems.filter(i => i.status === AppStatus.COMPLETED && i.result);
    if (completedItems.length === 0) return;

    let fullText = "";

    completedItems.forEach(item => {
      fullText += `==================================================\n`;
      fullText += `SOUBOR: ${item.file.name}\n`;
      fullText += `==================================================\n\n`;
      
      if (item.result?.diplomatic) {
        fullText += `--- DIPLOMATICKÝ PŘEPIS ---\n\n`;
        fullText += item.result.diplomatic + "\n\n";
      }
      
      if (item.result?.modern) {
        fullText += `--- MODERNÍ PRAVOPIS ---\n\n`;
        fullText += item.result.modern + "\n\n";
      }
      
      fullText += "\n\n";
    });

    const element = document.createElement("a");
    const file = new Blob([fullText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `kompletni_transkripce_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const resetApp = () => {
    setBatchItems([]);
    setSelectedItemId(null);
    setStatus(AppStatus.IDLE);
    setError(null);
  };

  // Identify if we are in "Results Mode" (at least one item attempted)
  const isResultsMode = status === AppStatus.PROCESSING || (status === AppStatus.COMPLETED && batchItems.some(i => i.status === AppStatus.COMPLETED || i.status === AppStatus.ERROR));
  
  // Get selected item data
  const selectedItem = batchItems.find(i => i.id === selectedItemId) || batchItems[0];
  const completedCount = batchItems.filter(i => i.status === AppStatus.COMPLETED).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-parchment-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📜</span>
            <div>
              <h1 className="font-display text-2xl font-bold text-stone-800">Staročeský Transkriptor</h1>
              <p className="text-xs text-stone-500 font-sans">Powered by Gemini 3 Pro</p>
            </div>
          </div>
          {batchItems.length > 0 && (
            <button onClick={resetApp} className="text-sm text-parchment-600 hover:text-stone-800 font-medium">
              Nová dávka
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        
        {batchItems.length === 0 && (
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl font-serif text-stone-800 mb-4">Digitalizace historie</h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Nahrajte obrazové soubory nebo PDF se staročeským textem. 
              Podpora hromadného zpracování (batch processing).
            </p>
          </div>
        )}

        <div className="space-y-8">
          
          {/* Upload & Config Section (Hidden if processing or viewing results) */}
          {!isResultsMode && (
            <div className="flex flex-col items-center max-w-4xl mx-auto">
              <FileUploader 
                onFilesSelected={handleFilesSelected} 
                disabled={status === AppStatus.PROCESSING}
              />
              
              {batchItems.length > 0 && (
                <div className="w-full mt-6 animate-fade-in-up bg-white p-6 rounded-xl border border-parchment-200 shadow-sm">
                  
                  <div className="mb-6">
                     <h3 className="text-lg font-semibold text-parchment-900 mb-3">Fronta souborů ({batchItems.length}):</h3>
                     <div className="bg-parchment-50 rounded-lg border border-parchment-200 max-h-60 overflow-y-auto">
                        {batchItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border-b border-parchment-100 last:border-0">
                             <span className="truncate font-mono text-sm text-stone-700">{item.file.name}</span>
                             <button onClick={() => removeFile(item.id)} className="text-red-400 hover:text-red-600 p-1">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                               </svg>
                             </button>
                          </div>
                        ))}
                     </div>
                  </div>

                  <h3 className="text-lg font-semibold text-parchment-900 mb-4 text-center">Vyberte typ zpracování pro celou dávku:</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <button 
                      onClick={() => setRequestMode(RequestMode.DIPLOMATIC)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${requestMode === RequestMode.DIPLOMATIC ? 'border-parchment-600 bg-parchment-50 ring-1 ring-parchment-600' : 'border-parchment-200 hover:border-parchment-400'}`}
                    >
                      <div className="font-serif font-bold text-stone-800 mb-1">Diplomatický</div>
                      <div className="text-xs text-stone-500">Přesný přepis řádek po řádce.</div>
                    </button>

                    <button 
                      onClick={() => setRequestMode(RequestMode.MODERN)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${requestMode === RequestMode.MODERN ? 'border-parchment-600 bg-parchment-50 ring-1 ring-parchment-600' : 'border-parchment-200 hover:border-parchment-400'}`}
                    >
                      <div className="font-sans font-bold text-stone-800 mb-1">Moderní</div>
                      <div className="text-xs text-stone-500">Převod do současného pravopisu.</div>
                    </button>

                    <button 
                      onClick={() => setRequestMode(RequestMode.BOTH)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${requestMode === RequestMode.BOTH ? 'border-parchment-600 bg-parchment-50 ring-1 ring-parchment-600' : 'border-parchment-200 hover:border-parchment-400'}`}
                    >
                      <div className="font-display font-bold text-stone-800 mb-1">Kompletní</div>
                      <div className="text-xs text-stone-500">Generuje obě varianty.</div>
                    </button>
                  </div>

                  <div className="flex justify-center">
                    <Button 
                      onClick={handleBatchTranscribe} 
                      isLoading={status === AppStatus.PROCESSING}
                      className="w-full md:w-auto min-w-[200px] text-lg"
                    >
                      Zpracovat {batchItems.length} {batchItems.length === 1 ? 'soubor' : (batchItems.length < 5 ? 'soubory' : 'souborů')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing & Results Section (Split View) */}
          {isResultsMode && (
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)] min-h-[600px]">
              
              {/* Left Sidebar: Batch List */}
              <div className="w-full lg:w-1/3 bg-white rounded-xl border border-parchment-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 bg-parchment-100 border-b border-parchment-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-parchment-900">Seznam souborů</h3>
                    <div className="text-xs text-parchment-600 mt-1">
                      {completedCount} / {batchItems.length} hotovo
                    </div>
                  </div>
                  {completedCount > 0 && (
                     <Button 
                       variant="secondary" 
                       onClick={handleDownloadAll} 
                       className="!py-1 !px-3 text-xs"
                       title="Stáhnout spojený text všech zpracovaných souborů"
                     >
                       Stáhnout vše
                     </Button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                  {batchItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                        selectedItemId === item.id
                          ? 'bg-parchment-50 border-parchment-400 shadow-sm ring-1 ring-parchment-300'
                          : 'bg-white border-transparent hover:bg-parchment-50 hover:border-parchment-200'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className={`font-medium text-sm truncate ${selectedItemId === item.id ? 'text-parchment-900' : 'text-stone-600'}`}>
                          {item.file.name}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                         {item.status === AppStatus.QUEUED && (
                           <span className="w-2 h-2 rounded-full bg-stone-300 block" title="Čeká ve frontě"></span>
                         )}
                         {item.status === AppStatus.PROCESSING && (
                           <svg className="animate-spin h-5 w-5 text-parchment-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                         )}
                         {item.status === AppStatus.COMPLETED && (
                           <svg className="w-5 h-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                           </svg>
                         )}
                         {item.status === AppStatus.ERROR && (
                           <svg className="w-5 h-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                           </svg>
                         )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Pane: Viewer */}
              <div className="w-full lg:w-2/3 h-full flex flex-col">
                {selectedItem ? (
                  selectedItem.status === AppStatus.COMPLETED && selectedItem.result ? (
                    <div className="h-full">
                       <TranscriptionViewer 
                          result={selectedItem.result} 
                          fileName={selectedItem.file.name}
                          imageData={{
                            base64: selectedItem.base64,
                            mimeType: selectedItem.mimeType
                          }}
                       />
                    </div>
                  ) : selectedItem.status === AppStatus.PROCESSING ? (
                    <div className="h-full bg-white rounded-xl border border-parchment-200 shadow-sm flex flex-col items-center justify-center text-parchment-800 p-8">
                      <div className="animate-bounce text-4xl mb-4">📜</div>
                      <h3 className="text-xl font-display mb-2">Zpracovávám dokument...</h3>
                      <p className="text-stone-500">Tento proces může trvat několik sekund.</p>
                      <p className="text-stone-400 font-mono mt-2 text-sm">{selectedItem.file.name}</p>
                    </div>
                  ) : selectedItem.status === AppStatus.ERROR ? (
                    <div className="h-full bg-white rounded-xl border border-parchment-200 shadow-sm flex flex-col items-center justify-center text-red-600 p-8">
                      <h3 className="text-xl font-bold mb-2">Chyba zpracování</h3>
                      <p>{selectedItem.error || "Dokument se nepodařilo přečíst."}</p>
                      <p className="text-red-400 font-mono mt-2 text-sm">{selectedItem.file.name}</p>
                    </div>
                  ) : (
                    <div className="h-full bg-white rounded-xl border border-parchment-200 shadow-sm flex flex-col items-center justify-center text-stone-400 p-8">
                      <p>Čeká na zpracování...</p>
                      <p className="font-mono mt-2 text-sm">{selectedItem.file.name}</p>
                    </div>
                  )
                ) : (
                  <div className="h-full bg-white rounded-xl border border-parchment-200 shadow-sm flex items-center justify-center text-stone-400">
                    Vyberte soubor ze seznamu
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg max-w-xl w-full text-center mx-auto">
              ⚠️ {error}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-parchment-100 border-t border-parchment-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-stone-500 text-sm">
          &copy; {new Date().getFullYear()} Staročeský Transkriptor. Všechna práva vyhrazena.
        </div>
      </footer>
    </div>
  );
};

export default App;
