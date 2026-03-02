import { FiBook, FiMapPin, FiUsers, FiGithub } from 'react-icons/fi';

const About = () => (
  <div className="min-h-screen bg-gray-50 py-12 px-4">
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">About MetroReads</h1>
      <p className="text-gray-500 mb-8">An open-source library management platform built for everyone.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <p className="text-gray-700 text-sm leading-relaxed">
          MetroReads is an open-source library management system built to make borrowing books as easy as ordering online.
          It connects readers with libraries across multiple cities, enabling seamless book discovery, online requests, and
          hassle-free pickups — no queues, no paperwork.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: FiBook, label: '4000+ Books', sub: 'In our catalog' },
          { icon: FiMapPin, label: '20 Cities', sub: 'Across India' },
          { icon: FiUsers, label: '100+ Members', sub: 'And growing' },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <Icon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Built by</h2>
        <p className="text-sm font-medium text-gray-800 mb-1">Yash Sidram Gajaksoh</p>
        <a
          href="https://github.com/06yash12"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors"
        >
          <FiGithub className="w-4 h-4" />
          github.com/06yash12
        </a>
      </div>
    </div>
  </div>
);

export default About;
