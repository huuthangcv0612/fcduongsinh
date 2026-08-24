import { useEffect } from 'react';

let lockCount = 0;
let originalBodyOverflow = '';
let originalDocOverflow = '';
let originalBodyOverscroll = '';
let originalDocOverscroll = '';

/**
 * Custom hook to lock body scrolling when a modal/popup is open.
 * Supports multiple concurrent modals using a global lock counter.
 * 
 * @param {boolean} isLocked Whether the body scroll should be locked
 */
export function useBodyScrollLock(isLocked = true) {
  useEffect(() => {
    if (!isLocked) return;

    lockCount++;
    if (lockCount === 1) {
      originalBodyOverflow = document.body.style.overflow;
      originalDocOverflow = document.documentElement.style.overflow;
      originalBodyOverscroll = document.body.style.overscrollBehavior;
      originalDocOverscroll = document.documentElement.style.overscrollBehavior;

      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        document.documentElement.style.overscrollBehavior = originalDocOverscroll;
      }
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
