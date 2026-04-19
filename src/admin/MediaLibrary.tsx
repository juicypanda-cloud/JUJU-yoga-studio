import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { Upload, Film, Music, Trash2, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';

type MediaType = 'image' | 'video' | 'audio';

const MAX_FILE_SIZE_BYTES: Record<MediaType, number> = {
  image: 2 * 1024 * 1024,
  video: 20 * 1024 * 1024,
  audio: 10 * 1024 * 1024,
};

const STORAGE_FOLDER_BY_TYPE: Record<MediaType, string> = {
  image: 'images',
  video: 'videos',
  audio: 'audio',
};

const FILE_SIZE_LABEL_BY_TYPE: Record<MediaType, string> = {
  image: '2MB',
  video: '20MB',
  audio: '10MB',
};

const resolveMediaType = (file: File): MediaType | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return null;
};

export const MediaLibrary: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number, percent: number }>({ current: 0, total: 0, percent: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMediaItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'media');
    });
    return () => unsubscribe();
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    setUploading(true);
    setUploadProgress({ current: 0, total: acceptedFiles.length, percent: 0 });
    
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      setUploadProgress(prev => ({ ...prev, current: i + 1, percent: 0 }));
      
      try {
        const mediaType = resolveMediaType(file);
        if (!mediaType) {
          toast.error(`${file.name} файл дэмжигдэхгүй төрөл байна`);
          continue;
        }

        let fileToUpload = file;

        // Compress image if it's an image
        if (mediaType === 'image') {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          };
          try {
            fileToUpload = await imageCompression(file, options);
          } catch (compressionError) {
            console.error("Compression error:", compressionError);
          }
        }

        const maxBytes = MAX_FILE_SIZE_BYTES[mediaType];
        if (fileToUpload.size > maxBytes) {
          toast.error(`${file.name} хэтэрхий том байна (Макс ${FILE_SIZE_LABEL_BY_TYPE[mediaType]})`);
          continue;
        }

        const storageRef = ref(storage, `${STORAGE_FOLDER_BY_TYPE[mediaType]}/${Date.now()}_${file.name}`);
        console.log(`[MediaLibrary] Starting resumable upload for: ${file.name}`);
        
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        const url = await new Promise<string>((resolve, reject) => {
          // Timeout handling (60 seconds)
          const timeout = setTimeout(() => {
            uploadTask.cancel();
            reject(new Error('Upload timeout after 60s'));
          }, 60000);

          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({ ...prev, percent: Math.round(progress) }));
              console.log(`[MediaLibrary] Uploading ${file.name}: ${Math.round(progress)}%`);
            }, 
            (error) => {
              clearTimeout(timeout);
              reject(error);
            }, 
            async () => {
              clearTimeout(timeout);
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (err) {
                reject(err);
              }
            }
          );
        });
        
        console.log(`[MediaLibrary] Upload successful, URL: ${url}`);

        try {
          await addDoc(collection(db, 'media'), {
            filename: file.name,
            name: file.name,
            url,
            type: mediaType,
            size: fileToUpload.size,
            path: storageRef.fullPath,
            createdAt: serverTimestamp(),
          });
        } catch (error: any) {
          console.error('[MediaLibrary] Firestore media save failed:', error);
          handleFirestoreError(error, OperationType.CREATE, 'media');
        }
        
        toast.success(`${file.name} амжилттай хуулагдлаа`);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(`${file.name} хуулахад алдаа гарлаа: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    setUploading(false);
    setUploadProgress({ current: 0, total: 0, percent: 0 });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': [],
      'audio/*': [],
    },
  });

  const handleDelete = async (file: any) => {
    if (!window.confirm('Та энэ файлыг устгахдаа итгэлтэй байна уу?')) return;
    try {
      if (file.path) {
        const storageRef = ref(storage, file.path);
        await deleteObject(storageRef);
      }
      try {
        await deleteDoc(doc(db, 'media', file.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `media/${file.id}`);
      }
      toast.success('Файл устгагдлаа');
    } catch (error) {
      console.error("Delete error:", error);
      toast.error('Файл устгахад алдаа гарлаа');
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('URL хуулагдлаа');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Медиа сан</h1>
      </div>

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer mb-12 ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {uploading ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
          </div>
          <div>
            <p className="text-lg font-medium">
              {uploading 
                ? `Хуулж байна... (${uploadProgress.current} / ${uploadProgress.total}) - ${uploadProgress.percent}%` 
                : isDragActive ? 'Файлуудыг энд оруулна уу' : 'Файлуудыг энд чирж оруулах эсвэл дарж сонгоно уу'}
            </p>
            {uploading && (
              <div className="w-full max-w-xs mx-auto mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300" 
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            )}
            <p className="text-sm text-accent/40 mt-2">Зураг, видео болон аудио файлууд дэмжигдэнэ (Зургийг автоматаар оновчтой болгоно)</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-accent/40">Loading...</div>
      ) : mediaItems.length === 0 ? (
        <div className="py-16 text-center text-accent/40">No media uploaded yet</div>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {mediaItems.map((file) => (
          <Card key={file.id} className="group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all rounded-2xl">
            <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
              {file.type === 'image' ? (
                <img
                  src={file.url}
                  alt={file.filename || file.name || 'Media item'}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : file.type === 'video' ? (
                <video src={file.url} controls className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-3">
                  <Music size={28} className="text-accent/50" />
                  <audio src={file.url} controls className="w-full" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-medium truncate mb-1">{file.filename || file.name}</p>
              {file.createdAt == null && (
                <p className="text-[10px] text-accent/30 mb-1">Syncing...</p>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-accent/40">{file.type}</span>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => copyToClipboard(file.url, file.id)}
                  >
                    {copiedId === file.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(file)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
};
