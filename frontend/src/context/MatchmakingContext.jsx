import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from './ToastContext';

const MatchmakingContext = createContext();

const MATCHMAKING_CACHE_KEY = 'fcduongsinh-matchmaking-cache-v1';

const defaultGroupFormData = {
  name: '',
  url: '',
  homeArea: 'Hà Nội',
  description: ''
};

const defaultProgressState = {
  active: false,
  percent: 0,
  stepText: '',
  detailText: ''
};

function readMatchmakingCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(MATCHMAKING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeMatchmakingCache(nextState) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(MATCHMAKING_CACHE_KEY, JSON.stringify(nextState));
  } catch {
    // Ignore browser storage failures.
  }
}

export function MatchmakingProvider({ children }) {
  const toast = useToast();
  const cachedState = readMatchmakingCache();

  const [activeTab, setActiveTab] = useState(cachedState?.activeTab || 'scraped');
  const [apifyLimit, setApifyLimit] = useState(cachedState?.apifyLimit || 15);
  const [scrapedList, setScrapedList] = useState(Array.isArray(cachedState?.scrapedList) ? cachedState.scrapedList : []);
  const [filterDay, setFilterDay] = useState(cachedState?.filterDay || 'all'); 
  const [filterTime, setFilterTime] = useState(cachedState?.filterTime || 'all'); 
  const [progress, setProgress] = useState(defaultProgressState);
  
  const [groupFormData, setGroupFormData] = useState(
    cachedState?.groupFormData && typeof cachedState.groupFormData === 'object'
      ? { ...defaultGroupFormData, ...cachedState.groupFormData }
      : defaultGroupFormData
  );

  // Active groups count needed for progress UI
  const [activeGroupsCount, setActiveGroupsCount] = useState(2); // Will be updated by page

  useEffect(() => {
    writeMatchmakingCache({
      activeTab,
      apifyLimit,
      scrapedList,
      filterDay,
      filterTime,
      groupFormData,
    });
  }, [activeTab, apifyLimit, scrapedList, filterDay, filterTime, groupFormData]);

  const scrapeMutation = useMutation({
    mutationFn: () => api.get(`/opponents/scrape?limit=${apifyLimit}`),
    onMutate: () => {
      setProgress({
        active: true,
        percent: 15,
        stepText: '🚀 Bước 1/4: Đang kết nối hệ thống tìm kiếm...',
        detailText: 'Đang khởi động hệ thống tải bài viết'
      });
    },
    onSuccess: (res) => {
      const items = Array.isArray(res?.data) ? res.data : [];
      setScrapedList(items);
      setActiveTab('scraped');

      const finishedProgress = {
        active: true,
        percent: 100,
        stepText: `✨ Bước 4/4: Hoàn tất! Đã trích xuất ${items.length} bài đăng`,
        detailText: 'Đã phân tích tên sân & chuẩn hóa dữ liệu thành công'
      };

      setProgress(finishedProgress);
      writeMatchmakingCache({
        activeTab: 'scraped',
        apifyLimit,
        scrapedList: items,
        filterDay,
        filterTime,
        groupFormData,
      });

      toast.success(`Đã phân tích ${items.length} bài tìm đối thành công!`, 'Quét hoàn tất');

      setTimeout(() => {
        setProgress(prev => ({ ...prev, active: false }));
      }, 2000);
    },
    onError: (err) => {
      setProgress(prev => ({ ...prev, active: false }));
      toast.error(err.message || 'Lỗi khi cào dữ liệu bài đăng Facebook', 'Lỗi quét đối');
    }
  });

  // Effect to simulate live progress stages during scraping
  useEffect(() => {
    let t1, t2;
    if (scrapeMutation.isPending) {
      t1 = setTimeout(() => {
        setProgress(prev => prev.active ? {
          ...prev,
          percent: 55,
          stepText: `🌐 Bước 2/4: Đang cào song song dữ liệu từ ${activeGroupsCount || 2} Facebook Groups...`,
          detailText: 'Đang tải bài đăng mới & lịch sử tìm đối Thứ 3 trên Facebook'
        } : prev);
      }, 2500);

      t2 = setTimeout(() => {
        setProgress(prev => prev.active ? {
          ...prev,
          percent: 85,
          stepText: '⚡ Bước 3/4: Đang phân tích thông tin...',
          detailText: 'Đang nhận diện Tên Sân, Khung Giờ & SĐT'
        } : prev);
      }, 6500);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [scrapeMutation.isPending, activeGroupsCount]);

  const value = {
    activeTab, setActiveTab,
    apifyLimit, setApifyLimit,
    scrapedList, setScrapedList,
    filterDay, setFilterDay,
    filterTime, setFilterTime,
    progress, setProgress,
    groupFormData, setGroupFormData,
    activeGroupsCount, setActiveGroupsCount,
    scrapeMutation,
    defaultGroupFormData
  };

  return (
    <MatchmakingContext.Provider value={value}>
      {children}
    </MatchmakingContext.Provider>
  );
}

export function useMatchmaking() {
  const context = useContext(MatchmakingContext);
  if (!context) {
    throw new Error('useMatchmaking must be used within a MatchmakingProvider');
  }
  return context;
}
