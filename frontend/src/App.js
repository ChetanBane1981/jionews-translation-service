import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [headlines, setHeadlines] = useState([]);
  const [selectedHeadlines, setSelectedHeadlines] = useState([]);
  const [targetLanguage, setTargetLanguage] = useState('Hindi');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRSS, setFetchingRSS] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Available languages for translation
  const languages = ['Hindi', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Gujarati', 'Kannada', 'Malayalam'];

  // Fetch headlines on component mount
  useEffect(() => {
    fetchHeadlines();
    fetchStats();
  }, []);

  const fetchHeadlines = async () => {
    try {
      const response = await fetch('/api/headlines?limit=20');
      const data = await response.json();
      setHeadlines(data.headlines || []);
    } catch (err) {
      setError('Failed to fetch headlines. Make sure MongoDB is running.');
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchRSSFeed = async () => {
    setFetchingRSS(true);
    setError(null);

    try {
      const response = await fetch('/api/fetch-rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert(`RSS Feed fetched successfully!\n\nNew: ${data.stats.new}\nExisting: ${data.stats.existing}\nErrors: ${data.stats.errors}`);
        // Refresh headlines and stats
        await fetchHeadlines();
        await fetchStats();
      } else {
        setError(data.error || 'Failed to fetch RSS feed');
      }
    } catch (err) {
      setError('Failed to fetch RSS feed. Please check if the backend is running.');
      console.error(err);
    } finally {
      setFetchingRSS(false);
    }
  };

  const handleHeadlineSelect = (id) => {
    setSelectedHeadlines(prev =>
      prev.includes(id)
        ? prev.filter(hId => hId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedHeadlines.length === headlines.length) {
      setSelectedHeadlines([]);
    } else {
      setSelectedHeadlines(headlines.map(h => h._id));
    }
  };

  const processHeadlines = async () => {
    if (selectedHeadlines.length === 0) {
      setError('Please select at least one headline');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/process-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headlineIds: selectedHeadlines,
          targetLanguage
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
      } else {
        setError(data.error || 'Failed to process headlines');
      }
    } catch (err) {
      setError('Failed to process headlines. Please check if the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <h1>JioNews Translation Service</h1>
          <p>AI-Powered News Summarization & Translation from RSS Feed</p>
          {stats && (
            <div className="stats-bar">
              <span>📰 {stats.totalHeadlines} Headlines</span>
              {stats.latestHeadline && (
                <span>🕐 Latest: {new Date(stats.latestHeadline.pubDate).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="container main-content">
        {/* RSS Fetch Section */}
        <section className="panel rss-panel">
          <div className="rss-header">
            <div>
              <h3>📡 RSS Feed</h3>
              <p className="rss-url">Source: newsable.asianetnews.com/rss/special</p>
            </div>
            <button
              className="btn-primary"
              onClick={fetchRSSFeed}
              disabled={fetchingRSS}
            >
              {fetchingRSS ? 'Fetching...' : 'Fetch Latest Headlines'}
            </button>
          </div>
        </section>

        {/* Selection Panel */}
        <section className="panel selection-panel">
          <div className="panel-header">
            <h2>Select Headlines ({headlines.length})</h2>
            <button
              className="btn-secondary"
              onClick={handleSelectAll}
            >
              {selectedHeadlines.length === headlines.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {headlines.length === 0 ? (
            <div className="empty-state">
              <p>No headlines available.</p>
              <p>Click "Fetch Latest Headlines" to load data from the RSS feed.</p>
            </div>
          ) : (
            <div className="headlines-list">
              {headlines.map(headline => (
                <div
                  key={headline._id}
                  className={`headline-item ${selectedHeadlines.includes(headline._id) ? 'selected' : ''}`}
                  onClick={() => handleHeadlineSelect(headline._id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedHeadlines.includes(headline._id)}
                    onChange={() => {}}
                  />
                  {headline.imageUrl && (
                    <img src={headline.imageUrl} alt="" className="headline-image" />
                  )}
                  <div className="headline-content">
                    <span className="category-badge">{headline.category}</span>
                    <p className="headline-text">{headline.title}</p>
                    <div className="headline-meta">
                      <span className="creator">{headline.creator}</span>
                      <span className="date">{new Date(headline.pubDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="controls">
            <div className="language-selector">
              <label>Target Language:</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <button
              className="btn-primary"
              onClick={processHeadlines}
              disabled={loading || selectedHeadlines.length === 0}
            >
              {loading ? 'Processing...' : `Process ${selectedHeadlines.length} Headlines`}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </section>

        {/* Results Panel */}
        {(loading || results.length > 0) && (
          <section className="panel results-panel">
            <h2>Results</h2>

            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Processing headlines with Claude AI...</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="results-list">
                {results.map(result => (
                  <div key={result.id} className="result-item">
                    <div className="result-header">
                      <div>
                        <span className="category-badge">{result.category}</span>
                        <span className="creator">{result.creator}</span>
                      </div>
                      <span className="date">{new Date(result.pubDate).toLocaleDateString()}</span>
                    </div>

                    {result.imageUrl && (
                      <img src={result.imageUrl} alt="" className="result-image" />
                    )}

                    <div className="result-section">
                      <h4>Original Headline</h4>
                      <p className="original">{result.original}</p>
                    </div>

                    <div className="result-section">
                      <h4>English Summary (60 words)</h4>
                      <p className="summary">{result.summary}</p>
                    </div>

                    <div className="result-section">
                      <h4>{result.targetLanguage} Translation</h4>
                      <p className="translation">{result.translation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Powered by Claude AI | JioNews Hackathon 2026 | RSS: Asianet Newsable</p>
      </footer>
    </div>
  );
}

export default App;
