'use client';

import { useCallback, useEffect, useRef } from 'react';

export const UNSAVED_MESSAGE = 'فيه تعديلات ما انحفظت. تبغى تتركها؟';

/**
 * تنبيه قبل ترك بيانات غير محفوظة: عند إغلاق/تحديث التبويب، وعند الضغط على أي
 * رابط داخل المنصة (القائمة الجانبية مثلًا). يرجع دالة تأكيد لأزرار الإغلاق/الإلغاء:
 * `if (confirmLeave()) onClose()`.
 * ملاحظة: زر الرجوع بالمتصفح لا يمر من هنا (تنقل Next الداخلي لا يطلق beforeunload).
 */
export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // capture على document يسبق معالج Link في React — لو رفض نوقف التنقل
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return; // رابط خارجي: beforeunload يتكفل
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(UNSAVED_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  return useCallback(() => !dirtyRef.current || window.confirm(UNSAVED_MESSAGE), []);
}

/** هل تغيّرت القيمة عن أول render؟ (مقارنة JSON — للنوافذ اللي حالتها كائن واحد) */
export function useChangedSince(value: unknown) {
  const current = JSON.stringify(value);
  const initial = useRef(current);
  return current !== initial.current;
}
