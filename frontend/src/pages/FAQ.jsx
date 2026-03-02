import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const faqs = [
  { q: 'Is it free to join?', a: 'Yes, membership is completely free. Just sign up and start borrowing.' },
  { q: 'How do I borrow a book?', a: 'Browse the catalog, request a book online, and pick it up at your nearest library using your unique code.' },
  { q: 'How long can I keep a book?', a: 'Loan periods are set by your library, but typically 14 days. Check your library\'s policy for details.' },
  { q: 'Can I renew a book?', a: 'Renewal options depend on your library. Contact your librarian or check your dashboard for renewal options.' },
  { q: 'What if I return a book late?', a: 'Late return policies vary by library. Some may have fines, others may simply restrict future borrowing until the book is returned.' },
  { q: 'How many books can I borrow at once?', a: 'This depends on your library\'s policy. Most libraries allow 2–5 books at a time.' },
];

const FAQ = () => {
  const [open, setOpen] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-500 mb-8">Everything you need to know about MetroReads.</p>
        <div className="space-y-3">
          {faqs.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                {item.q}
                <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-4 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
