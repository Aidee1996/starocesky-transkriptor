
import React, { useState, useEffect } from 'react';
import { TranscriptionMode, TranscriptionResult } from '../types';
import { Button } from './Button';

interface TranscriptionViewerProps {
  result: TranscriptionResult;
  imageData?: {
    base64: string;
    mimeType: string;
  };
  fileName: string;
}

export const TranscriptionViewer: React.FC<TranscriptionViewerProps> = ({ result, imageData, fileName }) => {
  const [mode, setMode] = useState<TranscriptionMode>(TranscriptionMode.DIPLOMATIC);
  const [copied, setCopied] = useState(false);
  const [showImage, setShowImage] = useState(false);

  // Initialize mode based on available results
  useEffect(() => {
    if (result.diplomatic && !result.modern) {
      setMode(TranscriptionMode.DIPLOMATIC);
    } else if (!result.diplomatic && result.modern) {
      setMode(TranscriptionMode.MODERN);
    } else {
      setMode(TranscriptionMode.DIPLOMATIC);
    }
  }, [result]);

  const activeText = (mode === TranscriptionMode.DIPLOMATIC ? result.diplomatic : result.modern) || '';

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([activeText], {type: 'text/plain'});
    
    // Remove extension from original filename for cleaner output name
    const nameWithoutExt = fileName.lastIndexOf('.') > 0 
      ? fileName.substring(0, fileName.lastIndexOf('.')) 
      : fileName;
    
    element.href = URL.createObjectURL(file);
    element.download = `${nameWithoutExt}_${mode.toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showTabs = result.diplomatic && result.modern;

  return (
    <div className="bg-white rounded-xl shadow-xl border border-parchment-200 overflow-hidden flex flex-col h-[600px]">
      {/* File Header */}
      <div className="bg-white border-b border-parchment-200 px-4 py-3 flex items-center gap-2 shadow-sm z-10">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-parchment-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <h3 className="font-semibold text-stone-800 truncate" title={fileName}>
          {fileName}
        </h3>
      </div>

      {/* Toolbar */}
      <div className="bg-parchment-100 p-4 border-b border-parchment-200 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {showTabs ? (
            <div className="flex p-1 bg-parchment-200 rounded-lg">
              <button
                onClick={() => setMode(TranscriptionMode.DIPLOMATIC)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === TranscriptionMode.DIPLOMATIC
                    ? 'bg-white text-parchment-900 shadow-sm'
                    : 'text-parchment-600 hover:text-parchment-800'
                }`}
              >
                Diplomatický přepis
              </button>
              <button
                onClick={() => setMode(TranscriptionMode.MODERN)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === TranscriptionMode.MODERN
                    ? 'bg-white text-parchment-900 shadow-sm'
                    : 'text-parchment-600 hover:text-parchment-800'
                }`}
              >
                Moderní pravopis
              </button>
            </div>
          ) : (
            <div className="px-4 py-2 font-serif font-bold text-parchment-900">
              {mode === TranscriptionMode.DIPLOMATIC ? 'Diplomatický přepis' : 'Moderní pravopis'}
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {imageData && (
            <button 
              onClick={() => setShowImage(!showImage)}
              className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border ${
                showImage 
                ? 'bg-stone-700 text-white border-stone-700' 
                : 'bg-white text-stone-600 border-parchment-300 hover:bg-parchment-50'
              }`}
              title={showImage ? "Skrýt předlohu" : "Zobrazit předlohu vedle textu"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">{showImage ? 'Skrýt předlohu' : 'Porovnat'}</span>
            </button>
          )}

          <div className="h-6 w-px bg-parchment-300 mx-1"></div>

          <Button variant="secondary" onClick={handleCopy} className="!py-2 !px-3 text-sm">
            {copied ? 'Zkopírováno!' : 'Zkopírovat'}
          </Button>
          <Button variant="primary" onClick={handleDownload} className="!py-2 !px-3 text-sm">
            Stáhnout
          </Button>
        </div>
      </div>

      {/* Content Area - Split View Logic */}
      <div className="flex-1 overflow-hidden flex flex-row">
        
        {/* Image Panel (Optional) */}
        {showImage && imageData && (
          <div className="w-1/2 bg-stone-100 border-r border-parchment-300 overflow-auto flex items-start justify-center p-4 shadow-inner">
            <img 
              src={`data:${imageData.mimeType};base64,${imageData.base64}`} 
              alt="Original document" 
              className="max-w-full shadow-md rounded"
            />
          </div>
        )}

        {/* Text Panel */}
        <div className={`flex-1 overflow-auto p-8 bg-white ${showImage ? 'w-1/2' : 'w-full'}`}>
          <div className={`max-w-none ${mode === TranscriptionMode.DIPLOMATIC ? 'font-serif leading-relaxed' : 'font-sans leading-7'}`}>
            {mode === TranscriptionMode.DIPLOMATIC ? (
              <div className="whitespace-pre-wrap text-lg text-stone-800 font-serif">
                 {/* Render line numbers for diplomatic view */}
                 {activeText.split('\n').map((line, i) => (
                   <div key={i} className="flex">
                     <span className="w-8 text-xs text-parchment-400 select-none pt-1 text-right pr-2">{i + 1}</span>
                     <span className="flex-1 min-h-[1.5rem]">{line}</span>
                   </div>
                 ))}
              </div>
            ) : (
               <div className="prose prose-stone max-w-none text-lg text-stone-700">
                  {activeText.split('\n\n').map((para, i) => (
                    <p key={i} className="mb-4 last:mb-0">{para}</p>
                  ))}
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
