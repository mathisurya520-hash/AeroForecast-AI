import React from 'react';
import { Wind } from 'lucide-react';

export default function Header({ currentPage, setCurrentPage }) {
  const links = [
    { id: 'home', label: 'Overview' },
    { id: 'dashboard', label: 'Global' },
    { id: 'india', label: 'India' },
    { id: 'historical', label: 'Analytics' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'insights', label: 'Model Performance' },
    { id: 'about', label: 'About Data' },
  ];

  return (
    <header>
      <div className="header-container">
        <a href="#home" className="logo" onClick={() => setCurrentPage('home')}>
          <Wind size={28} style={{ stroke: 'url(#terracotta-sand-grad)', filter: 'drop-shadow(0 0 8px rgba(166, 106, 76, 0.6))' }} />
          <svg width="0" height="0">
            <linearGradient id="terracotta-sand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A66A4C" />
              <stop offset="100%" stopColor="#D2B06A" />
            </linearGradient>
          </svg>
          <span>AeroForecast AI</span>
        </a>
        <nav>
          <ul className="nav-links">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className={`nav-link ${currentPage === link.id ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(link.id);
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
