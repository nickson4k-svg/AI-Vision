import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Image as ImageIcon, Trash2, Cpu, Target, Plus, X } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as tmImage from '@teachablemachine/image';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type UploadedImage = {
  id: string;
  url: string;
};

// --- Sub-component for individual draggable images ---
function DraggablePhoto({ 
  image, 
  model, 
  onRemove, 
  index 
}: { 
  image: UploadedImage, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any, 
  onRemove: (id: string) => void,
  index: number
}) {
  const [prediction, setPrediction] = useState<{ className: string, probability: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const detectObjects = async () => {
    if (model && imageRef.current) {
      const img = imageRef.current;
      if (img.naturalWidth === 0) return;

      try {
        const preds = await model.predict(img);
        if (preds && preds.length > 0) {
          const sorted = [...preds].sort((a, b) => b.probability - a.probability);
          setPrediction(sorted[0]);
        }
      } catch (e) {
        console.error("Помилка під час predict:", e);
      }
    }
  };

  // Simple staggered initial position so they don't perfectly overlap
  const offsetX = (index % 5) * 40;
  const offsetY = (index % 5) * 40;

  return (
    <motion.div 
      drag 
      dragMomentum={false} 
      initial={{ opacity: 0, scale: 0.8, x: offsetX, y: offsetY }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      whileDrag={{ scale: 1.02, zIndex: 50 }}
      className="absolute cursor-grab active:cursor-grabbing inline-block"
      style={{ zIndex: 10 + index }}
    >
      <div className="relative group">
        <img
          ref={imageRef}
          src={image.url}
          alt="Uploaded item"
          className="max-w-none w-auto min-w-[30vw] max-h-[70vh] object-contain rounded-2xl pointer-events-none select-none shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/50"
          onLoad={detectObjects}
          crossOrigin="anonymous"
        />

        {/* Remove Button (Appears on hover) */}
        <button
          onClick={() => onRemove(image.id)}
          className="absolute -top-4 -right-4 bg-rose-500/90 hover:bg-rose-500 text-white p-2 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.5)] opacity-0 group-hover:opacity-100 transition-all duration-300 z-40 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Result Overlay directly on the photo */}
        {prediction && prediction.probability > 0.5 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Visual Targeting Box */}
            <div className="relative border-2 border-fuchsia-500/80 bg-fuchsia-500/10 shadow-[0_0_30px_rgba(217,70,239,0.3)] rounded-2xl w-[60%] h-[60%] flex items-center justify-center">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-fuchsia-400 rounded-tl-lg"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-fuchsia-400 rounded-br-lg"></div>

              {/* Label */}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-5 py-2 bg-slate-950/90 backdrop-blur-md border border-fuchsia-500/50 rounded-xl shadow-2xl flex items-center gap-3 whitespace-nowrap">
                <Target className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                <span className="text-lg font-bold text-slate-100">
                  {prediction.className}
                </span>
                <span className="text-base font-black text-fuchsia-400">
                  {Math.round(prediction.probability * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}


// --- Main App Component ---
export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [model, setModel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<UploadedImage[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadModel() {
      try {
        await tf.ready();
        const URL = "/model/tm-my-image-model/";
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        
        const loadedModel = await tmImage.load(modelURL, metadataURL);
        setModel(loadedModel);
      } catch (err) {
        console.error("Помилка завантаження моделі:", err);
      } finally {
        setLoading(false);
      }
    }
    loadModel();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      loadFiles(Array.from(files));
    }
    // Reset input so the same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      loadFiles(imageFiles);
    }
  };

  const loadFiles = (files: File[]) => {
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substring(7) + Date.now(),
      url: window.URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (idToRemove: string) => {
    setImages(prev => prev.filter(img => img.id !== idToRemove));
  };

  const clearAllImages = () => {
    setImages([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 sm:p-8 text-slate-200 selection:bg-fuchsia-500/30 font-sans overflow-hidden">
      <div className="w-full max-w-[95vw] 2xl:max-w-[85vw] flex flex-col items-center h-full">
        <h1 className="text-3xl sm:text-5xl font-extrabold mb-3 text-center text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-fuchsia-400 to-pink-600 drop-shadow-[0_0_15px_rgba(192,38,211,0.2)]">
          Multi-Vision Canvas
        </h1>
        <p className="text-slate-400 text-center mb-6 text-sm sm:text-lg flex items-center justify-center gap-2">
          <Cpu className="w-5 h-5 text-fuchsia-500" />
          Модель розпізнає: ESP32, Raspberry, Arduino
        </p>

        {/* Hidden File Input for Multiple Files */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-6 py-32 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-800 shadow-2xl w-full max-w-2xl mt-10">
            <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin" />
            <p className="text-fuchsia-400 font-medium tracking-wide animate-pulse">Завантаження кастомної нейромережі...</p>
          </div>
        ) : (
          <div className="w-full flex-grow flex flex-col">
            {images.length === 0 ? (
              <div
                className="max-w-3xl mx-auto w-full relative rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-dashed border-slate-700/50 flex flex-col items-center justify-center h-[26rem] mt-10 overflow-hidden group hover:border-fuchsia-500/50 hover:bg-slate-900/80 transition-all shadow-2xl cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center p-6 flex flex-col items-center text-slate-500 transition-colors group-hover:text-fuchsia-400/80 pointer-events-none">
                  <div className="p-5 bg-slate-950 rounded-full mb-5 group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(217,70,239,0.2)] transition-all duration-300">
                    <ImageIcon className="w-12 h-12 opacity-70 group-hover:opacity-100 group-hover:text-fuchsia-400" />
                  </div>
                  <p className="text-2xl font-semibold text-slate-300 mb-2 group-hover:text-fuchsia-300 transition-colors">Перетягніть фото сюди</p>
                  <p className="text-base font-medium text-slate-500">можна виділити одразу декілька</p>
                </div>
              </div>
            ) : (
              <div 
                className="relative w-full h-[80vh] sm:h-[82vh] overflow-hidden bg-slate-900/30 backdrop-blur-3xl rounded-[2rem] border border-slate-700/50 flex flex-col shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {/* Background Instruction */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <span className="text-3xl font-black tracking-widest uppercase text-slate-500">Нескінченне полотно</span>
                </div>

                {/* Interactive Canvas */}
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                  <AnimatePresence>
                    {images.map((img, idx) => (
                      <DraggablePhoto 
                        key={img.id} 
                        image={img} 
                        model={model} 
                        index={idx}
                        onRemove={removeImage} 
                      />
                    ))}
                  </AnimatePresence>
                </div>
                
                {/* Global Controls Overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-8 py-4 bg-fuchsia-600/90 hover:bg-fuchsia-500 backdrop-blur-2xl transition-all rounded-2xl text-white font-bold shadow-[0_0_30px_rgba(217,70,239,0.4)] group"
                  >
                    <Plus className="w-6 h-6 group-hover:scale-125 transition-transform" /> 
                    Додати фото
                  </button>
                  
                  <button
                    onClick={clearAllImages}
                    className="flex items-center justify-center p-4 bg-slate-950/90 hover:bg-rose-950 backdrop-blur-2xl transition-all rounded-2xl border border-slate-700/80 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 font-semibold shadow-2xl"
                    title="Очистити полотно"
                  >
                    <Trash2 className="w-6 h-6" /> 
                  </button>
                </div>
                
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
