'use client';

import { useState } from 'react';

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-slate-900"
                aria-expanded={open}
                aria-controls={`faq-panel-${i}`}
                id={`faq-btn-${i}`}
                onClick={() => setOpenIndex(open ? null : i)}
              >
                {item.q}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </h3>
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-btn-${i}`}
              hidden={!open}
              className="px-5 pb-5 text-sm leading-7 text-slate-700"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
