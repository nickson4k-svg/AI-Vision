import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Image as ImageIcon, Trash2, Cpu, Target, Plus, X, Hand, MousePointer2, Minus, Camera, MonitorPlay } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as tmImage from '@teachablemachine/image';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import localforage from 'localforage';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// --- Types ---
type UploadedImage = {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
};

// Helper to convert File to Base64
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Live Camera Component ---
function LiveCamera({ model }: { model: any }) {
  const [prediction, setPrediction] = useState<{ className: string, probability: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const webcamRef = useRef<tmImage.Webcam | null>(null);
  const requestRef = useRef<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function setupWebcam() {
      // 400x400 default internal resolution for the model
      const flip = true; 
      const width = 400;
      const height = 400;
      const webcam = new tmImage.Webcam(width, height, flip);
      
      try {
        await webcam.setup(); 
        if (!isMounted) return;
        setHasPermission(true);
        
        await webcam.play();
        webcamRef.current = webcam;
        
        if (containerRef.current && containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        if (containerRef.current) {
          containerRef.current.appendChild(webcam.canvas);
          webcam.canvas.className = "w-full h-full object-cover shadow-2xl opacity-80 mix-blend-screen";
        }
        
        const loop = async () => {
          if (!isMounted) return;
          webcam.update(); 
          const preds = await model.predict(webcam.canvas);
          if (preds && preds.length > 0) {
            const sorted = [...preds].sort((a, b) => b.probability - a.probability);
            setPrediction(sorted[0]);
          }
          requestRef.current = window.requestAnimationFrame(loop);
        };
        
        requestRef.current = window.requestAnimationFrame(loop);
      } catch (err) {
        console.error("Camera setup failed", err);
        if (isMounted) setHasPermission(false);
      }
    }
    
    if (model) {
      setupWebcam();
    }
    
    return () => {
      isMounted = false;
      if (requestRef.current) window.cancelAnimationFrame(requestRef.current);
      if (webcamRef.current) webcamRef.current.stop();
    };
  }, [model]);

  return (
    <div className="relative w-full max-w-5xl mx-auto h-[65vh] bg-black rounded-[2rem] flex items-center justify-center overflow-hidden border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] group">
      
      {hasPermission === false && (
        <div className="text-rose-400 text-lg flex flex-col items-center gap-4">
          <Camera className="w-12 h-12" />
          <p>Немає доступу до камери. Будь ласка, дозвольте доступ у браузері.</p>
        </div>
      )}
      
      {hasPermission === null && (
         <div className="text-fuchsia-400 text-lg flex flex-col items-center gap-4 animate-pulse">
           <Loader2 className="w-10 h-10 animate-spin" />
           <p>Ініціалізація веб-камери...</p>
         </div>
      )}

      {/* Camera Viewport */}
      <div ref={containerRef} className="absolute inset-0 flex items-center justify-center bg-slate-950">
        {/* Canvas is injected here */}
      </div>

      {/* Target Overlay */}
      {hasPermission && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]">
          
          <div className="absolute top-6 left-6 flex items-center gap-3 bg-red-500/20 text-red-400 px-4 py-2 rounded-full border border-red-500/30 backdrop-blur-md">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
            <span className="font-bold tracking-widest text-sm uppercase">Live</span>
          </div>

          <AnimatePresence>
            {prediction && prediction.probability > 0.5 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="relative border-4 border-fuchsia-500/80 bg-fuchsia-500/10 shadow-[0_0_50px_rgba(217,70,239,0.2)] rounded-3xl w-[60%] h-[60%] sm:w-[300px] sm:h-[300px] flex items-center justify-center"
              >
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-fuchsia-400 rounded-tl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-fuchsia-400 rounded-br-xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-fuchsia-400 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-fuchsia-400 rounded-bl-xl"></div>

                {/* Status Badge */}
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-950/90 backdrop-blur-xl border border-fuchsia-500/50 rounded-2xl shadow-2xl flex items-center gap-4 whitespace-nowrap">
                  <Target className="w-5 h-5 text-fuchsia-400 animate-[spin_3s_linear_infinite]" />
                  <span className="text-xl font-bold text-slate-100 uppercase">
                    {prediction.className}
                  </span>
                  <span className="text-lg font-black text-slate-950 bg-fuchsia-400 px-2 py-1 rounded-lg">
                    {Math.round(prediction.probability * 100)}%
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// --- Sub-component for individual draggable images ---
function DraggablePhoto({ 
  image, 
  model, 
  onRemove,
  onPositionChange,
  index 
}: { 
  image: UploadedImage, 
  model: any, 
  onRemove: (id: string) => void,
  onPositionChange: (id: string, x: number, y: number) => void,
  index: number
}) {
  const [prediction, setPrediction] = useState<{ className: string, probability: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const x = useMotionValue(image.x);
  const y = useMotionValue(image.y);

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

  return (
    <motion.div 
      style={{ x, y, zIndex: 10 + index }}
      drag 
      dragMomentum={false}
      onDragEnd={() => onPositionChange(image.id, x.get(), y.get())}
      onPointerDown={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      whileDrag={{ scale: 1.02, zIndex: 50 }}
      className="absolute cursor-grab active:cursor-grabbing inline-block"
    >
      <div className="relative group">
        <img
          ref={imageRef}
          src={image.dataUrl}
          alt="Uploaded item"
          className="max-w-none w-auto min-w-[30vw] max-h-[70vh] object-contain rounded-2xl pointer-events-none select-none shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/50"
          onLoad={detectObjects}
          crossOrigin="anonymous"
        />

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(image.id); }}
          className="absolute -top-4 -right-4 bg-rose-500/90 hover:bg-rose-500 text-white p-2 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.5)] opacity-0 group-hover:opacity-100 transition-all duration-300 z-40 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {prediction && prediction.probability > 0.5 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative border-2 border-fuchsia-500/80 bg-fuchsia-500/10 shadow-[0_0_30px_rgba(217,70,239,0.3)] rounded-2xl w-[60%] h-[60%] flex items-center justify-center">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-fuchsia-400 rounded-tl-lg"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-fuchsia-400 rounded-br-lg"></div>

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
  const [model, setModel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [activeMode, setActiveMode] = useState<'canvas' | 'camera'>('canvas');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const STORAGE_KEY = 'vision_canvas_images';

  useEffect(() => {
    async function loadModel() {
      try {
        await tf.ready();
        const URL = "/model/tm-my-image-model/";
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        
        const loadedModel = await tmImage.load(modelURL, metadataURL);
        setModel(loadedModel);
        
        const savedImages = await localforage.getItem<UploadedImage[]>(STORAGE_KEY);
        if (savedImages) setImages(savedImages);
      } catch (err) {
        console.error("Помилка завантаження моделі чи даних:", err);
      } finally {
        setLoading(false);
      }
    }
    loadModel();
  }, []);

  const saveToStorage = async (newImages: UploadedImage[]) => {
    try { await localforage.setItem(STORAGE_KEY, newImages); } 
    catch (e) { console.error("Failed to save to localforage", e); }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) loadFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (activeMode !== 'canvas') return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      loadFiles(imageFiles);
    }
  };

  const loadFiles = async (files: File[]) => {
    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const dataUrl = await fileToDataUrl(files[i]);
      newImages.push({
        id: Math.random().toString(36).substring(7) + Date.now(),
        dataUrl,
        x: (images.length + i) * 50, 
        y: (images.length + i) * 50,
      });
    }
    const updated = [...images, ...newImages];
    setImages(updated);
    saveToStorage(updated);
  };

  const removeImage = (idToRemove: string) => {
    const updated = images.filter(img => img.id !== idToRemove);
    setImages(updated);
    saveToStorage(updated);
  };

  const clearAllImages = () => {
    setImages([]);
    saveToStorage([]);
  };

  const handlePositionChange = (id: string, x: number, y: number) => {
    const updated = images.map(img => img.id === id ? { ...img, x, y } : img);
    setImages(updated);
    saveToStorage(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 sm:p-6 text-slate-200 selection:bg-fuchsia-500/30 font-sans overflow-hidden">
      <div className="w-full max-w-[95vw] flex flex-col items-center h-full">
        
        {/* Header & Toggles */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-5xl z-10 mb-6 gap-6">
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-3xl font-extrabold mb-1 text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-fuchsia-400 to-pink-600 drop-shadow-[0_0_15px_rgba(192,38,211,0.2)]">
              AI Vision
            </h1>
            <p className="text-slate-400 flex items-center gap-2 text-sm">
              <Cpu className="w-4 h-4 text-fuchsia-500" />
              ESP32, Raspberry, Arduino
            </p>
          </div>

          <div className="flex bg-slate-900 border border-slate-700/50 p-1.5 rounded-2xl shadow-xl">
            <button 
              onClick={() => setActiveMode('canvas')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${activeMode === 'canvas' ? 'bg-fuchsia-600/20 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.1)]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <MonitorPlay className="w-5 h-5" />
              Фото-Полотно
            </button>
            <button 
              onClick={() => setActiveMode('camera')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${activeMode === 'camera' ? 'bg-fuchsia-600/20 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.1)]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Camera className="w-5 h-5" />
              Live Камера
            </button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />

        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-6 py-32 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-800 shadow-2xl w-full max-w-2xl mt-10">
            <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin" />
            <p className="text-fuchsia-400 font-medium tracking-wide animate-pulse">Завантаження кастомної нейромережі...</p>
          </div>
        ) : (
          <div className="w-full flex-grow flex flex-col items-center">
            
            {activeMode === 'camera' ? (
              <LiveCamera model={model} />
            ) : (
              // CANVAS MODE
              <div className="w-full">
                {images.length === 0 ? (
                  <div
                    className="max-w-3xl mx-auto w-full relative rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-dashed border-slate-700/50 flex flex-col items-center justify-center h-[26rem] mt-4 overflow-hidden group hover:border-fuchsia-500/50 hover:bg-slate-900/80 transition-all shadow-2xl cursor-pointer"
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
                    className="relative w-full h-[75vh] overflow-hidden bg-[#0a0a0f] rounded-[2rem] border border-slate-700/50 flex flex-col shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] group"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.2 }}></div>

                    <TransformWrapper
                      initialScale={1}
                      minScale={0.1}
                      maxScale={4}
                      centerOnInit={true}
                    >
                      {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                          <div className="absolute top-6 left-6 z-50 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-700/50 shadow-xl flex flex-col gap-2">
                              <button onClick={() => zoomIn()} className="p-2 text-slate-400 hover:text-fuchsia-400 hover:bg-slate-800 rounded-lg transition-colors" title="Наблизити"><Plus className="w-5 h-5" /></button>
                              <div className="w-full h-px bg-slate-700/50"></div>
                              <button onClick={() => zoomOut()} className="p-2 text-slate-400 hover:text-fuchsia-400 hover:bg-slate-800 rounded-lg transition-colors" title="Віддалити"><Minus className="w-5 h-5" /></button>
                              <div className="w-full h-px bg-slate-700/50"></div>
                              <button onClick={() => resetTransform()} className="p-2 text-slate-400 hover:text-fuchsia-400 hover:bg-slate-800 rounded-lg transition-colors" title="Центрувати полотно"><Target className="w-5 h-5" /></button>
                            </div>
                          </div>

                          <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full !flex !items-center !justify-center relative">
                            <AnimatePresence>
                              {images.map((img, idx) => (
                                <DraggablePhoto key={img.id} image={img} model={model} index={idx} onRemove={removeImage} onPositionChange={handlePositionChange} />
                              ))}
                            </AnimatePresence>
                          </TransformComponent>
                        </>
                      )}
                    </TransformWrapper>
                    
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
                      <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-8 py-4 bg-fuchsia-600/90 hover:bg-fuchsia-500 backdrop-blur-2xl transition-all rounded-2xl text-white font-bold shadow-[0_0_30px_rgba(217,70,239,0.4)] hover:shadow-[0_0_50px_rgba(217,70,239,0.6)]">
                        <Plus className="w-6 h-6" /> Додати фото
                      </button>
                      
                      <button onClick={clearAllImages} className="flex items-center justify-center p-4 bg-slate-900/90 hover:bg-rose-950 backdrop-blur-2xl transition-all rounded-2xl border border-slate-700/80 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 font-semibold shadow-2xl" title="Очистити полотно">
                        <Trash2 className="w-6 h-6" /> 
                      </button>
                    </div>

                    <div className="absolute bottom-6 right-6 z-50 bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl px-4 py-2 text-slate-400 text-xs flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-1.5"><Hand className="w-3.5 h-3.5 text-slate-500"/> Pan</div>
                      <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                      <div className="flex items-center gap-1.5"><MousePointer2 className="w-3.5 h-3.5 text-slate-500"/> Drag</div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
