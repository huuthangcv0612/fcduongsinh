import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Image as ImageIcon, Video, Link as LinkIcon, Plus, Trash2, UploadCloud, Download, X, Maximize2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function MediaPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const { t } = useTranslation();

  const [uploading, setUploading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: '', url: '' });
  const [selectedMedia, setSelectedMedia] = useState(null);

  useBodyScrollLock(showLinkModal || Boolean(selectedMedia));

  const { data: mediaRes, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => api.get('/media'),
    staleTime: 60000
  });

  const mediaList = Array.isArray(mediaRes?.data) ? mediaRes.data : [];

  const uploadMutation = useMutation({
    mutationFn: (data) => api.post('/media/upload', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success(t('media.upload_success'), t('media.title'));
    },
    onError: (err) => {
      toast.error(err.message || t('media.upload_error'));
    },
    onSettled: () => setUploading(false)
  });

  const addLinkMutation = useMutation({
    mutationFn: (data) => api.post('/media/link', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success(t('media.link_success'), t('media.title'));
      setShowLinkModal(false);
      setLinkForm({ title: '', url: '' });
    },
    onError: (err) => {
      toast.error(err.message || t('media.link_error'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/media/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success(t('media.delete_success'), t('media.title'));
    },
    onError: (err) => {
      toast.error(err.message || t('media.delete_error'));
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size < 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('media.file_too_large'), t('profile.error_title'));
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      uploadMutation.mutate({
        title: file.name,
        file: reader.result
      });
    };
    reader.readAsDataURL(file);
    
    // reset input
    e.target.value = '';
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!linkForm.url.trim()) return;
    addLinkMutation.mutate(linkForm);
  };

  const handleDelete = (media, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(t('media.delete_confirm'))) {
      deleteMutation.mutate(media._id);
      if (selectedMedia && selectedMedia._id === media._id) {
        setSelectedMedia(null);
      }
    }
  };

  const handleDownload = async (media, e) => {
    if (e) e.stopPropagation();
    try {
      toast.success(t('media.download_start'));
      const response = await fetch(media.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const ext = media.type === 'video' ? 'mp4' : 'jpg';
      const filename = media.title ? `${media.title}.${ext}` : `fcduongsinh-media-${media._id}.${ext}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      toast.error(t('media.download_error'), t('profile.error_title'));
    }
  };

  const isYouTube = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (isLoading) return <div className="text-center p-8 text-slate-500 font-bold animate-pulse">{t('media.loading')}</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-16 md:pb-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('media.title')}</h1>
          <p className="text-slate-500 font-bold text-sm">{t('media.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-[#2c3ec4] hover:bg-[#1f2ca3] text-white rounded-xl font-black text-sm shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? <span className="animate-spin text-lg">⏳</span> : <UploadCloud className="w-4 h-4" />}
            {uploading ? t('media.uploading') : t('media.upload')}
          </button>
          
          <button 
            onClick={() => setShowLinkModal(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-black text-sm shadow-sm transition flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            {t('media.add_link')}
          </button>
        </div>
      </div>

      {mediaList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-black text-slate-900 text-lg mb-1">{t('media.empty')}</h3>
          <p className="text-sm font-bold text-slate-500">{t('media.empty_sub')}</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {mediaList.map((item) => (
            <div key={item._id} className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
              
              {item.type === 'image' && (
                <div className="relative cursor-zoom-in" onClick={() => setSelectedMedia(item)}>
                  <img src={item.url} alt={item.title} className="w-full h-auto object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                </div>
              )}
              
              {item.type === 'video' && (
                <div className="relative">
                  <video src={item.url} controls className="w-full h-auto" />
                </div>
              )}

              {item.type === 'link' && isYouTube(item.url) ? (
                <div className="aspect-video w-full bg-slate-900">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${getYouTubeId(item.url)}`}
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
              ) : item.type === 'link' && (
                <a href={item.url} target="_blank" rel="noreferrer" className="block p-8 text-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                  <LinkIcon className="w-8 h-8 mx-auto mb-2" />
                  <span className="font-bold text-sm underline line-clamp-2">{item.title || item.url}</span>
                </a>
              )}

              {/* Overlay for metadata */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <img src={item.uploadedBy?.avatar} alt={item.uploadedBy?.name} className="w-6 h-6 rounded-full border border-white/50" />
                    <span className="text-xs font-bold text-white/90">{item.uploadedBy?.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.type !== 'link' && (
                      <button onClick={(e) => handleDownload(item, e)} className="p-2.5 bg-white/20 hover:bg-white/40 rounded-lg text-white transition backdrop-blur-sm" title="Tải xuống">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {(isAdmin || user._id === item.uploadedBy?._id) && (
                      <button onClick={(e) => handleDelete(item, e)} className="p-2.5 bg-rose-500/80 hover:bg-rose-500 rounded-lg text-white transition backdrop-blur-sm" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overscroll-contain">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative border border-slate-200 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <h3 className="text-lg font-black text-slate-900 mb-4">{t('media.add_link_modal')}</h3>
            <form onSubmit={handleAddLink}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('media.desc_label')}</label>
                  <input
                    type="text"
                    placeholder=""
                    value={linkForm.title}
                    onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-950 font-bold focus:outline-none focus:border-[#374df5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('media.link_label')}</label>
                  <input
                    type="url"
                    required
                    placeholder="https://"
                    value={linkForm.url}
                    onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-950 font-bold focus:outline-none focus:border-[#374df5]"
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600">{t('media.cancel')}</button>
                <button type="submit" disabled={addLinkMutation.isPending} className="px-5 py-2.5 bg-[#2c3ec4] text-white rounded-xl font-black text-sm shadow-md disabled:opacity-50">
                  {t('media.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm overscroll-contain">
          <button 
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full max-w-5xl max-h-[90dvh] p-4 flex flex-col items-center justify-center">
            {selectedMedia.type === 'image' && (
              <img src={selectedMedia.url} alt={selectedMedia.title} className="max-w-full max-h-[80dvh] object-contain rounded-lg shadow-2xl" />
            )}
            
            <div className="mt-6 flex items-center gap-4 bg-white/10 px-6 py-3 rounded-full backdrop-blur-md">
              <button onClick={() => handleDownload(selectedMedia)} className="flex items-center gap-2 text-white font-bold text-sm hover:text-blue-300 transition">
                <Download className="w-5 h-5" /> {t('media.download')}
              </button>
              {(isAdmin || user._id === selectedMedia.uploadedBy?._id) && (
                <>
                  <div className="w-px h-6 bg-white/20"></div>
                  <button onClick={() => handleDelete(selectedMedia)} className="flex items-center gap-2 text-rose-400 font-bold text-sm hover:text-rose-300 transition">
                    <Trash2 className="w-5 h-5" /> {t('media.delete')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
