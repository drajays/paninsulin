import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { modules, appSources } from './data';
import { mcqs, visualScenarios } from './quiz';
import './styles.css';

const STORAGE_KEY = 'paninsulin-progress-v1';
const navItems = [
  { id: 'home', label: 'Overview', icon: '⌂' },
  { id: 'learn', label: 'Learn modules', icon: '▤' },
  { id: 'visuals', label: 'Visual quiz', icon: '◉' },
  { id: 'quiz', label: 'MCQ practice', icon: '✓' },
  { id: 'notes', label: 'Training notes', icon: '✎' }
];

function blankProgress() {
  return { completed: [], viewed: {}, quiz: {}, visual: {} };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...blankProgress(), ...JSON.parse(raw) } : blankProgress();
  } catch {
    return blankProgress();
  }
}

function App() {
  const [view, setView] = useState('home');
  const [selectedId, setSelectedId] = useState(1);
  const [progress, setProgress] = useState(loadProgress);
  const [search, setSearch] = useState('');
  const [dark, setDark] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const selected = modules.find((m) => m.id === selectedId) || modules[0];
  const qasViewed = Object.values(progress.viewed || {}).reduce((sum, arr) => sum + arr.length, 0);
  const mcqAnswered = Object.values(progress.quiz || {}).reduce((sum, score) => sum + (score?.answered || 0), 0);
  const completion = Math.round((progress.completed.length / modules.length) * 100);

  function go(nextView, moduleId = selectedId) {
    setView(nextView);
    setSelectedId(moduleId);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function markViewed(moduleId, qaId) {
    setProgress((p) => {
      const old = p.viewed[moduleId] || [];
      return old.includes(qaId) ? p : { ...p, viewed: { ...p.viewed, [moduleId]: [...old, qaId] } };
    });
  }

  function markComplete(moduleId) {
    setProgress((p) => p.completed.includes(moduleId) ? p : { ...p, completed: [...p.completed, moduleId] });
  }

  function updateQuiz(moduleId, update) {
    setProgress((p) => ({ ...p, quiz: { ...p.quiz, [moduleId]: { ...(p.quiz[moduleId] || {}), ...update } } }));
  }

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    const results = [];
    modules.forEach((module) => {
      module.qas.forEach((qa) => {
        if (`${qa.question} ${qa.answer}`.toLowerCase().includes(term)) {
          results.push({ moduleId: module.id, moduleTitle: module.title, ...qa });
        }
      });
    });
    return results.slice(0, 8);
  }, [search]);

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <Sidebar view={view} go={go} selectedId={selectedId} setSelectedId={setSelectedId} progress={progress} completion={completion} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} />
      <div className="shell">
        <Topbar search={search} setSearch={setSearch} dark={dark} setDark={setDark} setMobileMenu={setMobileMenu} go={go} />
        {search && searchResults.length > 0 && (
          <div className="search-results">
            <div className="search-title">Search results <span>{searchResults.length}</span></div>
            {searchResults.map((result) => (
              <button key={result.id} className="search-result" onClick={() => { go('learn', result.moduleId); setSearch(''); }}>
                <span className="result-dot">{result.moduleId}</span>
                <span><strong>{result.question}</strong><small>{result.moduleTitle}</small></span>
                <span className="arrow">→</span>
              </button>
            ))}
          </div>
        )}
        <main className="main">
          {view === 'home' && <Home modules={modules} progress={progress} completion={completion} qasViewed={qasViewed} mcqAnswered={mcqAnswered} go={go} selected={selected} />}
          {view === 'learn' && <ModuleView module={selected} allModules={modules} progress={progress} markViewed={markViewed} markComplete={markComplete} go={go} />}
          {view === 'notes' && <NotesView module={selected} allModules={modules} markComplete={markComplete} go={go} />}
          {view === 'quiz' && <QuizView module={selected} allModules={modules} progress={progress} updateQuiz={updateQuiz} go={go} />}
          {view === 'visuals' && <VisualQuiz progress={progress} setProgress={setProgress} go={go} />}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Sidebar({ view, go, selectedId, setSelectedId, progress, completion, mobileMenu, setMobileMenu }) {
  const [filter, setFilter] = useState('');
  const term = filter.trim().toLowerCase();
  const matches = (module) => !term || module.short.toLowerCase().includes(term) || module.title.toLowerCase().includes(term);
  const coreModules = modules.filter((m) => m.core && matches(m));
  const relatedModules = modules.filter((m) => !m.core && matches(m));
  const noMatches = term && coreModules.length === 0 && relatedModules.length === 0;

  function renderModuleList(list) {
    return list.map((module) => {
      const done = progress.completed.includes(module.id);
      return <button key={module.id} className={selectedId === module.id && (view === 'learn' || view === 'notes' || view === 'quiz') ? 'module-nav-item active' : 'module-nav-item'} onClick={() => go('learn', module.id)}>
        <span className="module-number" style={{ '--accent': module.accent }}>{done ? '✓' : String(module.id).padStart(2, '0')}</span>
        <span className="module-nav-text"><strong>{module.short}</strong><small>{module.title}</small></span>
        {done && <span className="done-dot" />}
      </button>;
    });
  }

  return (
    <aside className={mobileMenu ? 'sidebar mobile-open' : 'sidebar'}>
      <div className="brand" onClick={() => go('home')} role="button" tabIndex="0">
        <div className="brand-mark"><span>P</span><i /></div>
        <div><strong>PanInsulin</strong><small>inject • monitor • thrive</small></div>
      </div>
      <div className="sidebar-top">
        <div className="side-label">Your learning space</div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button className={view === item.id ? 'nav-item active' : 'nav-item'} key={item.id} onClick={() => go(item.id)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
              {item.id === 'quiz' && <em>{mcqs.length}</em>}
            </button>
          ))}
        </nav>
      </div>
      <div className="sidebar-scroll">
        <div className="module-filter">
          <span>⌕</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Jump to a module…" aria-label="Filter modules" />
        </div>
        {noMatches && <div className="module-nav-empty">No modules match “{filter}”.</div>}
        {coreModules.length > 0 && <div className="side-label module-label">Core insulin modules</div>}
        <div className="module-nav">{renderModuleList(coreModules)}</div>
        {relatedModules.length > 0 && <div className="side-label module-label">Related diabetes topics</div>}
        <div className="module-nav">{renderModuleList(relatedModules)}</div>
      </div>
      <div className="sidebar-bottom">
        <div className="progress-label"><span>Overall progress</span><strong>{completion}%</strong></div>
        <div className="progress-track"><span style={{ width: `${completion}%` }} /></div>
        <div className="safety-mini"><span>♥</span><p>Education supports care. It never replaces your clinical team.</p></div>
      </div>
    </aside>
  );
}

function Topbar({ search, setSearch, dark, setDark, setMobileMenu, go }) {
  return <header className="topbar">
    <button className="mobile-menu" onClick={() => setMobileMenu(true)} aria-label="Open menu">☰</button>
    <div className="breadcrumb"><button className="breadcrumb-link" onClick={() => go('home')}>Patient education</button><b>/</b><strong>Insulin therapy</strong></div>
    <div className="top-actions">
      <label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions, topics…" aria-label="Search questions" />{search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}</label>
      <button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? '☀' : '◐'}</button>
      <div className="avatar">PI</div>
    </div>
  </header>;
}

function Home({ modules, progress, completion, qasViewed, mcqAnswered, go, selected }) {
  const coreModules = modules.filter((m) => m.core);
  const relatedModules = modules.filter((m) => !m.core);
  const nextId = coreModules.find((m) => !progress.completed.includes(m.id))?.id
    || modules.find((m) => !progress.completed.includes(m.id))?.id
    || 2;
  const nextModule = modules.find((m) => m.id === nextId);
  return <>
    <section className="hero-card">
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse-dot" /> PERSONALIZED INSULIN LEARNING PATH</div>
        <h1>Confidence with<br /><span>every insulin dose.</span></h1>
        <p>A calm, visual guide to insulin therapy—injection technique, dosing safety, hypoglycemia and sick-day rules—built for patients, families and caregivers.</p>
        <div className="hero-buttons"><button className="primary-button" onClick={() => go('learn', nextId)}>Continue learning <span>→</span></button><button className="ghost-button" onClick={() => go('visuals')}>Try a visual quiz</button></div>
        <div className="hero-trust"><span>✓ Evidence-informed</span><span>✓ Patient-friendly</span><span>✓ {coreModules.length} core insulin modules</span></div>
      </div>
      <div className="hero-art"><HeroIllustration /></div>
    </section>

    <section className="welcome-row"><div><p className="section-kicker">YOUR DASHBOARD</p><h2>Welcome back, learner</h2><p className="muted">Choose a path that feels useful today.</p></div><div className="date-chip">July 2026 <span>⌄</span></div></section>
    <section className="stats-grid">
      <StatCard icon="◒" label="Learning progress" value={`${completion}%`} detail={`${progress.completed.length} of ${modules.length} modules complete`} color="indigo" />
      <StatCard icon="?" label="Questions explored" value={qasViewed} detail={`from ${modules.reduce((sum, m) => sum + m.qas.length, 0)} patient Q&As`} color="teal" />
      <StatCard icon="✓" label="MCQ practice" value={mcqAnswered} detail="answers completed" color="orange" />
      <StatCard icon="↗" label="Next focus" value={String(nextId).padStart(2, '0')} detail={nextModule?.short || 'Review'} color="pink" />
    </section>

    <section className="section-head"><div><p className="section-kicker">CORE INSULIN THERAPY</p><h2>Master the essentials of insulin use</h2></div><button className="text-button" onClick={() => go('learn', 2)}>View all <span>→</span></button></section>
    <section className="module-grid">
      {coreModules.map((module) => <ModuleCard key={module.id} module={module} done={progress.completed.includes(module.id)} onClick={() => go('learn', module.id)} />)}
    </section>
    <section className="lower-grid">
      <div className="challenge-card"><div className="challenge-visual"><TopicIllustration kind="hypo" accent="#dc2626" /></div><div><p className="section-kicker">TODAY’S SAFETY CHECK</p><h3>What is the first step for a conscious low?</h3><p>Practice the 15 g / 15 minute approach in the visual quiz.</p><button className="small-button" onClick={() => go('visuals')}>Practice now <span>→</span></button></div></div>
      <div className="care-card"><div className="care-icon">♥</div><div><p className="section-kicker">A GENTLE REMINDER</p><h3>You do not have to do this perfectly.</h3><p>Bring patterns, questions and barriers to your care team. Progress is built together.</p></div></div>
    </section>

    <section className="section-head"><div><p className="section-kicker">BROADER CONTEXT</p><h2>Related diabetes self-management topics</h2></div></section>
    <section className="module-grid">
      {relatedModules.map((module) => <ModuleCard key={module.id} module={module} done={progress.completed.includes(module.id)} onClick={() => go('learn', module.id)} />)}
    </section>
  </>;
}

function StatCard({ icon, label, value, detail, color }) {
  return <div className={`stat-card ${color}`}><div className="stat-top"><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span></div><strong>{value}</strong><small>{detail}</small></div>;
}

function ModuleCard({ module, done, onClick }) {
  return <button className="module-card" onClick={onClick} style={{ '--accent': module.accent }}>
    <div className="card-top"><span className="topic-icon">{module.icon}</span><span className={done ? 'status done' : 'status'}>{done ? 'Completed' : 'Start module'}</span></div>
    <div className="card-illustration"><TopicIllustration kind={module.kind} accent={module.accent} /></div>
    <div className="module-card-copy"><span>MODULE {String(module.id).padStart(2, '0')}</span><h3>{module.short}</h3><p>{module.tagline}</p></div>
    <div className="card-footer"><span>{module.qas.length} Q&As</span><span className="circle-arrow">→</span></div>
  </button>;
}

function ModuleView({ module, allModules, progress, markViewed, markComplete, go }) {
  const [qaIndex, setQaIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [tab, setTab] = useState('qa');
  const qa = module.qas[qaIndex];
  const viewed = progress.viewed[module.id]?.length || 0;
  useEffect(() => { setQaIndex(0); setShowAnswer(false); }, [module.id]);
  function openAnswer() {
    setShowAnswer(true);
    markViewed(module.id, qa.id);
  }
  function nextQuestion() {
    setShowAnswer(false);
    setQaIndex((n) => (n + 1) % module.qas.length);
  }
  return <>
    <ModuleHero module={module} viewed={viewed} onComplete={() => markComplete(module.id)} onVisual={() => go('visuals')} />
    <div className="module-tabs">
      <button className={tab === 'qa' ? 'active' : ''} onClick={() => setTab('qa')}>Q&A <span>{module.qas.length}</span></button>
      <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}>Training notes</button>
      <button className={tab === 'mcq' ? 'active' : ''} onClick={() => go('quiz', module.id)}>MCQ practice</button>
    </div>
    <ModuleQuickNav module={module} allModules={allModules} go={go} />
    {tab === 'qa' && <section className="qa-layout"><div className="qa-main"><div className="qa-header"><div><p className="section-kicker">PATIENT QUESTION {String(qaIndex + 1).padStart(2, '0')} / {module.qas.length}</p><h2>Learn through everyday questions</h2></div><span className="qa-count">{viewed} viewed</span></div><div className="qa-card"><div className="qa-number" style={{ '--accent': module.accent }}>{String(qaIndex + 1).padStart(2, '0')}</div><h3>{qa.question}</h3>{!showAnswer ? <button className="reveal-button" onClick={openAnswer}>Reveal patient-friendly answer <span>→</span></button> : <div className="answer-box"><div className="answer-label">ANSWER</div><p>{qa.answer}</p><button className="next-button" onClick={nextQuestion}>Next question <span>→</span></button></div>}</div><div className="qa-nav"><button onClick={() => { setShowAnswer(false); setQaIndex((n) => (n - 1 + module.qas.length) % module.qas.length); }}>← Previous</button><div className="question-dots">{module.qas.slice(0, 10).map((item, index) => <button key={item.id} aria-label={`Question ${index + 1}`} className={index === qaIndex ? 'active' : (progress.viewed[module.id]?.includes(item.id) ? 'viewed' : '')} onClick={() => { setQaIndex(index); setShowAnswer(false); }} />)}{module.qas.length > 10 && <span>+{module.qas.length - 10}</span>}</div><button onClick={nextQuestion}>Next →</button></div></div><aside className="qa-aside"><div className="aside-art"><TopicIllustration kind={module.kind} accent={module.accent} /></div><p className="section-kicker">VISUAL MEMORY</p><h3>See it, then say it back.</h3><p>Use the visual quiz to practice recognising safe actions, warning signs and everyday choices.</p><button className="outline-button" onClick={() => go('visuals')}>Open visual quiz <span>↗</span></button><div className="teach-back"><span>✦</span><div><strong>Teach-back prompt</strong><p>“Can you show me how you would explain this to a family member?”</p></div></div></aside></section>}
    {tab === 'notes' && <NotesView module={module} allModules={allModules} markComplete={markComplete} go={go} />}
  </>;
}

function ModuleQuickNav({ module, allModules, go }) {
  const index = allModules.findIndex((m) => m.id === module.id);
  const prev = allModules[(index - 1 + allModules.length) % allModules.length];
  const next = allModules[(index + 1) % allModules.length];
  return <div className="module-quicknav">
    <button className="quicknav-prev" onClick={() => go('learn', prev.id)}>
      <span className="quicknav-arrow">←</span>
      <span><span className="quicknav-label">Previous module</span><span className="quicknav-title">{prev.short}</span></span>
    </button>
    <button className="quicknav-next" onClick={() => go('learn', next.id)}>
      <span><span className="quicknav-label">Next module</span><span className="quicknav-title">{next.short}</span></span>
      <span className="quicknav-arrow">→</span>
    </button>
  </div>;
}

function ModuleHero({ module, viewed, onComplete, onVisual }) {
  return <section className="module-hero" style={{ '--accent': module.accent }}><div className="module-hero-copy"><div className="eyebrow"><span className="module-chip">MODULE {String(module.id).padStart(2, '0')}</span><span>{module.short}</span></div><h1>{module.title}</h1><p>{module.tagline}. Build knowledge you can use in real life, one question at a time.</p><div className="module-hero-actions"><button className="primary-button" onClick={onVisual}>Practice visual quiz <span>→</span></button><button className="hero-link" onClick={onComplete}>Mark module complete <span>✓</span></button></div></div><div className="module-hero-art"><TopicIllustration kind={module.kind} accent={module.accent} /><div className="hero-progress"><strong>{viewed}/{module.qas.length}</strong><span>Q&As viewed</span></div></div></section>;
}

function NotesView({ module, allModules, markComplete, go }) {
  return <section className="notes-view"><div className="notes-heading"><div><p className="section-kicker">DETAILED TRAINING NOTES</p><h2>{module.short}: make it usable</h2><p className="muted">Use these notes for patient education, family teaching and teach-back conversations.</p></div><button className="primary-button" onClick={() => markComplete(module.id)}>Mark complete <span>✓</span></button></div><div className="notes-grid"><div className="notes-main"><div className="learning-objectives"><div className="note-icon">◎</div><div><p className="section-kicker">BY THE END OF THIS MODULE</p><ul>{module.learning.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="note-panel"><div className="panel-title"><span className="numbered">01</span><div><p className="section-kicker">CORE EXPLANATION</p><h3>What patients need to remember</h3></div></div>{module.notes.map((note, index) => <div className="note-row" key={note}><span>{String(index + 1).padStart(2, '0')}</span><p>{note}</p></div>)}</div><div className="note-panel practice-panel"><div className="panel-title"><span className="numbered green">02</span><div><p className="section-kicker">PRACTICE & TEACH-BACK</p><h3>Turn information into a skill</h3></div></div>{module.practice.map((item) => <label className="check-row" key={item}><input type="checkbox" /><span className="checkmark">✓</span><span>{item}</span></label>)}<div className="teach-back-large"><strong>Ask the patient:</strong><p>“What will you do first when this situation happens at home?”</p></div></div></div><aside className="notes-aside"><div className="note-visual"><TopicIllustration kind={module.kind} accent={module.accent} /></div><div className="redflag-box"><div className="redflag-title"><span>!</span><strong>When to seek help</strong></div><ul>{module.redFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul></div><div className="next-module"><p className="section-kicker">KEEP GOING</p><h3>Next: {allModules[module.id % allModules.length].short}</h3><button className="outline-button" onClick={() => go('learn', allModules[module.id % allModules.length].id)}>Open next module <span>→</span></button></div></aside></div></section>;
}

function QuizView({ module, allModules, progress, updateQuiz, go }) {
  const questions = mcqs.filter((q) => q.moduleId === module.id);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [finished, setFinished] = useState(false);
  const record = progress.quiz[module.id] || { answered: 0, correct: 0 };
  const current = questions[index];
  useEffect(() => { setIndex(0); setSelected(null); setFinished(false); }, [module.id]);
  function choose(option) {
    if (selected !== null) return;
    setSelected(option);
    updateQuiz(module.id, { answered: record.answered + 1, correct: record.correct + (option === current.answer ? 1 : 0) });
  }
  function next() {
    if (index === questions.length - 1) setFinished(true);
    else { setIndex(index + 1); setSelected(null); }
  }
  return <section className="quiz-view"><div className="quiz-top"><div><p className="section-kicker">MCQ PRACTICE · {module.short.toUpperCase()}</p><h1>Check your understanding</h1><p className="muted">Low-pressure practice. Learn from every answer.</p></div><button className="text-button" onClick={() => go('learn', module.id)}>← Back to module</button></div>{finished ? <div className="score-card"><div className="score-orb">{record.correct}/{questions.length}</div><p className="section-kicker">PRACTICE COMPLETE</p><h2>{record.correct >= Math.ceil(questions.length * .7) ? 'Nice work — keep building.' : 'Good start — review and try again.'}</h2><p>You answered {record.correct} correctly in this practice set. Use the training notes to reinforce the concepts.</p><div className="score-actions"><button className="primary-button" onClick={() => { setFinished(false); setIndex(0); setSelected(null); }}>Try again <span>↻</span></button><button className="outline-button" onClick={() => go('notes', module.id)}>Review notes</button></div></div> : <div className="quiz-layout"><div className="quiz-card"><div className="quiz-progress"><span>Question {index + 1} of {questions.length}</span><div><i style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div></div><div className="quiz-question"><span className="quiz-badge">MCQ</span><h2>{current.q}</h2></div><div className="options">{current.options.map((option, optionIndex) => <button key={option} className={selected === null ? 'option' : optionIndex === current.answer ? 'option correct' : optionIndex === selected ? 'option incorrect' : 'option muted-option'} onClick={() => choose(optionIndex)}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{selected !== null && optionIndex === current.answer && <b>✓</b>}{selected !== null && optionIndex === selected && optionIndex !== current.answer && <b>×</b>}</button>)}</div>{selected !== null && <div className={selected === current.answer ? 'feedback good' : 'feedback needs-review'}><strong>{selected === current.answer ? 'Correct.' : 'Review this one.'}</strong><p>{current.why}</p></div>}<div className="quiz-footer"><span>{record.correct} correct so far</span>{selected !== null && <button className="next-button" onClick={next}>{index === questions.length - 1 ? 'See result' : 'Next question'} <span>→</span></button>}</div></div><aside className="quiz-aside"><div className="quiz-aside-art"><TopicIllustration kind={module.kind} accent={module.accent} /></div><p className="section-kicker">PATIENT EDUCATION TIP</p><h3>Explain the “why,” not just the rule.</h3><p>Good teaching helps a person choose a safer action when the situation changes at home.</p><button className="outline-button" onClick={() => go('notes', module.id)}>Read training notes <span>↗</span></button></aside></div>}</section>;
}

function VisualQuiz({ progress, setProgress, go }) {
  const [filter, setFilter] = useState('all');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);

  const categories = [
    { id: 'all', label: 'All Visuals (63)' },
    { id: 'everyday', label: 'Everyday Safety (14)' },
    { id: 'table73sickday', label: 'Table 7.3 Sick-Day Rules (5)' },
    { id: 'syringe', label: 'Syringe Anatomy (5)' },
    { id: 'airshot', label: 'Air Shots & Priming (5)' },
    { id: 'resuspension', label: 'Cloudy Resuspension (5)' },
    { id: 'fitterupdates', label: 'FITTER Updates (5)' },
    { id: 'bleedingafterinjection', label: 'Bleeding & Bruising (5)' },
    { id: 'stingingafterinjection', label: 'Burning or Stinging (5)' },
    { id: 'atlas', label: 'Storage Atlas (13)' }
  ];

  const atlasKinds = ['regimens', 'allstar', 'frioduo', 'friolarge', 'evacase', 'comparecoolers', 'electricflask', 'compactpouch', 'lcdcooler', 'hardshelllcd', 'activefridge', 'zeerpot', 'coolingstudy'];

  const filteredScenarios = visualScenarios.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'everyday') return !s.artKind || s.artKind === 'driving';
    if (filter === 'atlas') return atlasKinds.includes(s.artKind);
    return s.artKind === filter;
  });

  const activeIndex = index % filteredScenarios.length;
  const scenario = filteredScenarios[activeIndex] || visualScenarios[0];
  const module = modules.find((m) => m.id === scenario.moduleId) || modules[0];

  function choose(option) {
    if (selected !== null) return;
    setSelected(option);
    const key = scenario.prompt || scenario.moduleId;
    setProgress((p) => ({ ...p, visual: { ...p.visual, [key]: option === scenario.answer ? 'correct' : 'review' } }));
  }

  function next() {
    setSelected(null);
    setIndex((n) => (n + 1) % filteredScenarios.length);
  }

  function changeFilter(id) {
    setFilter(id);
    setIndex(0);
    setSelected(null);
  }

  return (
    <section className="visual-view">
      <div className="visual-heading">
        <div>
          <p className="section-kicker">IMAGE-BASED QUESTION & ANSWER ({visualScenarios.length} TOTAL)</p>
          <h1>See the situation. Choose the safe action.</h1>
          <p className="muted">Interactive visual picture quizzes and diagrams for patients, families and caregivers.</p>
        </div>
        <div className="visual-counter">
          <strong>{activeIndex + 1}</strong>
          <span>/ {filteredScenarios.length}</span>
        </div>
      </div>

      <div className="module-tabs" style={{ marginBottom: '20px', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={filter === cat.id ? 'active' : ''}
            onClick={() => changeFilter(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="visual-layout">
        <div className="visual-question-card">
          <div className="visual-scene">
            <TopicIllustration kind={scenario.artKind || module.kind} accent={module.accent} large />
          </div>
          <div className="visual-question-copy">
            <div className="visual-module-tag" style={{ color: module.accent }}>
              MODULE {String(module.id).padStart(2, '0')} · {module.short}
            </div>
            <h2>{scenario.prompt}</h2>
            <div className="visual-options">
              {scenario.options.map((option, optionIndex) => (
                <button
                  key={option}
                  className={
                    selected === null
                      ? 'visual-option'
                      : optionIndex === scenario.answer
                        ? 'visual-option correct'
                        : optionIndex === selected
                          ? 'visual-option incorrect'
                          : 'visual-option muted-option'
                  }
                  onClick={() => choose(optionIndex)}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  {option}
                </button>
              ))}
            </div>
            {selected !== null && (
              <div className={selected === scenario.answer ? 'visual-feedback good' : 'visual-feedback needs-review'}>
                <strong>{selected === scenario.answer ? 'That is the safer choice.' : 'Let’s review the safer choice.'}</strong>
                <p>{scenario.explain}</p>
              </div>
            )}
            <div className="visual-footer">
              <button className="text-button" onClick={() => go('notes', module.id)}>
                Open training notes <span>↗</span>
              </button>
              {selected !== null && (
                <button className="next-button" onClick={next}>
                  Next visual <span>→</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <aside className="visual-side">
          <div className="visual-side-card">
            <div className="side-icon">✦</div>
            <p className="section-kicker">HOW TO USE THIS</p>
            <h3>Pause before you answer.</h3>
            <p>Ask: what is happening, what is the risk, and what is the first safe action?</p>
            <div className="three-step">
              <span><b>1</b>Notice</span>
              <span><b>2</b>Choose</span>
              <span><b>3</b>Explain</span>
            </div>
          </div>
          <div className="visual-side-card progress-side">
            <p className="section-kicker">VISUAL PROGRESS</p>
            <div className="progress-track">
              <span style={{ width: `${(Object.keys(progress.visual || {}).length / visualScenarios.length) * 100}%` }} />
            </div>
            <p>{Object.keys(progress.visual || {}).length} of {visualScenarios.length} visual situations attempted</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function TopicIllustration({ kind, accent = '#4f46e5', large = false }) {
  const common = { viewBox: '0 0 320 190', role: 'img', 'aria-label': `${kind} education illustration` };
  const bg = <rect x="0" y="0" width="320" height="190" rx="28" fill={`${accent}14`} />;
  const dot = <><circle cx="30" cy="30" r="4" fill={accent} opacity=".35" /><circle cx="288" cy="38" r="6" fill={accent} opacity=".18" /><circle cx="268" cy="158" r="4" fill={accent} opacity=".35" /></>;
  let art;
  if (kind === 'insulin') art = <><rect x="118" y="42" width="104" height="28" rx="8" fill="#fff" stroke={accent} strokeWidth="3" transform="rotate(12 170 56)" /><rect x="214" y="47" width="50" height="18" rx="6" fill={accent} transform="rotate(12 214 47)" /><line x1="110" y1="76" x2="258" y2="109" stroke={accent} strokeWidth="5" strokeLinecap="round" /><path d="M72 126 C96 88 129 88 149 126 C168 160 215 159 244 124" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" opacity=".75" /><circle cx="76" cy="126" r="12" fill="#fff" stroke={accent} strokeWidth="3" /></>;
  else if (kind === 'nutrition') art = <><circle cx="160" cy="100" r="57" fill="#fff" stroke={accent} strokeWidth="3" /><path d="M160 100 L160 43 A57 57 0 0 1 207 131 Z" fill="#84cc16" /><path d="M160 100 L207 131 A57 57 0 0 1 112 132 Z" fill="#fb923c" /><path d="M160 100 L112 132 A57 57 0 0 1 160 43 Z" fill="#38bdf8" /><path d="M160 43 L160 18" stroke={accent} strokeWidth="5" strokeLinecap="round" /><path d="M160 18 C170 10 181 13 184 22 C173 29 165 27 160 18Z" fill={accent} /></>;
  else if (kind === 'hypo') art = <><path d="M160 31 L205 117 C209 125 203 135 194 135 H126 C117 135 111 125 115 117 Z" fill="#fff" stroke={accent} strokeWidth="4" /><path d="M160 59 V99" stroke={accent} strokeWidth="8" strokeLinecap="round" /><circle cx="160" cy="119" r="5" fill={accent} /><rect x="66" y="144" width="188" height="12" rx="6" fill={accent} opacity=".22" /><rect x="83" y="139" width="48" height="22" rx="8" fill="#fff" stroke={accent} strokeWidth="3" /><rect x="139" y="139" width="48" height="22" rx="8" fill="#fff" stroke={accent} strokeWidth="3" /><rect x="195" y="139" width="35" height="22" rx="8" fill="#fff" stroke={accent} strokeWidth="3" /></>;
  else if (kind === 'monitor') art = <><rect x="93" y="33" width="134" height="94" rx="16" fill="#fff" stroke={accent} strokeWidth="4" /><path d="M112 88 C124 74 136 103 147 79 S171 80 179 63 S204 79 214 51" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" /><circle cx="118" cy="107" r="5" fill="#22c55e" /><rect x="132" y="102" width="40" height="10" rx="5" fill={accent} opacity=".25" /><path d="M160 127 v18" stroke={accent} strokeWidth="4" /><path d="M124 147 h72" stroke={accent} strokeWidth="5" strokeLinecap="round" /><circle cx="239" cy="55" r="20" fill={accent} opacity=".2" /><path d="M232 55 l6 6 11-13" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>;
  else if (kind === 'exercise') art = <><circle cx="160" cy="40" r="14" fill="#fff" stroke={accent} strokeWidth="4" /><path d="M158 57 L148 99 L111 126 M149 78 L193 84 L227 62 M148 98 L180 136 M148 99 L119 155" stroke={accent} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M78 157 h172" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity=".3" /><path d="M88 42 C68 55 61 76 63 94" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" /><path d="M56 86 l7 10 10-8" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" /></>;
  else if (kind === 'illness') art = <><path d="M144 51 h32 v35 h35 v32 h-35 v35 h-32 v-35 h-35 V86 h35 Z" fill="#fff" stroke={accent} strokeWidth="4" /><circle cx="83" cy="118" r="24" fill={accent} opacity=".17" /><path d="M75 120 q8-20 16 0 q8 20 16 0" fill="none" stroke={accent} strokeWidth="4" /><path d="M230 40 q20 15 0 30 q-20 15 0 30 q20 15 0 30" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity=".7" /></>;
  else if (kind === 'dka') art = <><path d="M160 28 L220 150 H100 Z" fill="#fff" stroke={accent} strokeWidth="5" strokeLinejoin="round" /><path d="M160 65 V104" stroke={accent} strokeWidth="9" strokeLinecap="round" /><circle cx="160" cy="125" r="6" fill={accent} /><path d="M64 155 C80 138 94 138 109 155 M211 155 C226 138 240 138 256 155" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" /><path d="M75 67 h30 M215 67 h30" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity=".35" /></>;
  else if (kind === 'complications') art = <><path d="M160 143 C92 107 93 47 132 47 C151 47 160 62 160 62 C160 62 169 47 188 47 C227 47 228 107 160 143Z" fill="#fff" stroke={accent} strokeWidth="5" /><path d="M132 91 l18 18 37-40" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="70" cy="70" r="19" fill="#fff" stroke={accent} strokeWidth="3" /><path d="M60 70 q10-14 20 0 q-10 14-20 0" fill="none" stroke={accent} strokeWidth="3" /><path d="M250 68 q-22 10-28 30 q13 2 24-7" fill="#fff" stroke={accent} strokeWidth="3" /></>;
  else if (kind === 'feelings') art = <><circle cx="160" cy="91" r="58" fill="#fff" stroke={accent} strokeWidth="4" /><circle cx="140" cy="80" r="6" fill={accent} /><circle cx="180" cy="80" r="6" fill={accent} /><path d="M128 108 Q160 132 192 108" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" /><path d="M73 59 q20-25 42-10" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" /><path d="M206 49 q23-15 42 10" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" /><path d="M76 142 l18-18 18 18" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><path d="M226 142 l18-18 18 18" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></>;
  else if (kind === 'travel') art = <><path d="M98 125 L219 73" stroke={accent} strokeWidth="10" strokeLinecap="round" /><path d="M156 102 L125 44 M173 94 L207 45" stroke={accent} strokeWidth="8" strokeLinecap="round" /><path d="M92 126 l-27 23 M216 74 l29-14" stroke={accent} strokeWidth="8" strokeLinecap="round" /><circle cx="160" cy="101" r="20" fill="#fff" stroke={accent} strokeWidth="3" /><path d="M72 154 h179" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity=".3" /><path d="M252 38 v42 M231 59 h42" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity=".5" /></>;
  else if (kind === 'pregnancy') art = <><path d="M160 48 C128 48 102 72 102 105 C102 137 128 157 160 157 C192 157 218 137 218 105 C218 72 192 48 160 48Z" fill="#fff" stroke={accent} strokeWidth="4" /><circle cx="159" cy="92" r="18" fill={accent} opacity=".22" /><path d="M158 111 q-20 5-18 27 q19 9 39 0 q2-22-21-27" fill={accent} opacity=".45" /><path d="M68 76 v50 M48 101 h40" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity=".5" /><path d="M239 55 q19 18 0 35 q-19 17 0 35" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" /></>;
  else if (kind === 'insulintypes') art = <><rect x="80" y="78" width="26" height="62" rx="7" fill="#fff" stroke={accent} strokeWidth="3" /><rect x="88" y="66" width="10" height="14" rx="2" fill={accent} /><rect x="140" y="56" width="26" height="84" rx="7" fill="#fff" stroke={accent} strokeWidth="3" /><rect x="148" y="44" width="10" height="14" rx="2" fill={accent} /><rect x="200" y="34" width="26" height="106" rx="7" fill="#fff" stroke={accent} strokeWidth="3" /><rect x="208" y="22" width="10" height="14" rx="2" fill={accent} /><path d="M236 44 h34 l14 12 -14 12 h-34 Z" fill={accent} opacity=".85" /><circle cx="262" cy="56" r="3" fill="#fff" /></>;
  else if (kind === 'syringe') art = (
    <g>
      {/* Needle shaft */}
      <line x1="220" y1="20" x2="220" y2="52" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      {/* Needle hub */}
      <polygon points="214,64 226,64 222,52 218,52" fill={accent} />
      <rect x="215" y="64" width="10" height="4" fill={accent} />
      {/* Barrel */}
      <rect x="208" y="68" width="24" height="74" rx="2" fill="#ffffff" stroke="#334155" strokeWidth="2.5" />
      {/* Rubber stopper inside barrel */}
      <rect x="210" y="70" width="20" height="7" rx="3" fill="#1e293b" />
      <line x1="210" y1="74" x2="230" y2="74" stroke="#475569" strokeWidth="1" />
      {/* Scale tick marks along barrel */}
      <line x1="212" y1="83" x2="219" y2="83" stroke="#475569" strokeWidth="1.5" />
      <line x1="212" y1="91" x2="216" y2="91" stroke="#64748b" strokeWidth="1" />
      <line x1="212" y1="99" x2="219" y2="99" stroke="#475569" strokeWidth="1.5" />
      <line x1="212" y1="107" x2="216" y2="107" stroke="#64748b" strokeWidth="1" />
      <line x1="212" y1="115" x2="219" y2="115" stroke="#475569" strokeWidth="1.5" />
      <line x1="212" y1="123" x2="216" y2="123" stroke="#64748b" strokeWidth="1" />
      <line x1="212" y1="131" x2="219" y2="131" stroke="#475569" strokeWidth="1.5" />
      {/* Flange */}
      <rect x="198" y="142" width="44" height="5" rx="2.5" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
      {/* Plunger stem */}
      <rect x="216" y="147" width="8" height="24" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />
      {/* Thumb rest */}
      <rect x="203" y="171" width="34" height="5" rx="2.5" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />

      {/* Magnified Inset Circle showing Needle Anatomy (Lumen, Bevel, Shaft) */}
      <circle cx="115" cy="48" r="32" fill="#ffffff" stroke={accent} strokeWidth="2.5" />
      <path d="M108 72 V 42 L116 26 L120 42 V 72 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
      <path d="M116 26 L120 42 L112 42 Z" fill={accent} opacity="0.75" />
      <line x1="147" y1="36" x2="220" y2="22" stroke={accent} strokeWidth="1" strokeDasharray="3 3" />

      {/* Disassembled components on left (Plunger, Barrel, Cap with needle, Cap) */}
      <rect x="18" y="90" width="6" height="65" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
      <rect x="15" y="85" width="12" height="5" rx="2" fill="#334155" />
      <rect x="12" y="155" width="18" height="4" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
      <rect x="42" y="85" width="16" height="70" rx="2" fill="#ffffff" stroke="#64748b" strokeWidth="1.5" />
      <rect x="47" y="79" width="6" height="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
      <rect x="36" y="155" width="28" height="4" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
      <rect x="74" y="95" width="12" height="60" rx="6" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
      <polygon points="77,143 83,143 81,135 79,135" fill={accent} />
      <line x1="80" y1="135" x2="80" y2="108" stroke="#64748b" strokeWidth="1.5" />

      {/* Clean labels */}
      <text x="115" y="88" fontSize="8" fontWeight="bold" textAnchor="middle" fill={accent}>Bevel / Lumen</text>
      <text x="268" y="73" fontSize="8" fontWeight="600" fill="#334155">Rubber stopper</text>
      <text x="268" y="105" fontSize="8" fontWeight="600" fill="#334155">Barrel &amp; Scale</text>
      <text x="268" y="145" fontSize="8" fontWeight="600" fill="#334155">Flange</text>
      <text x="268" y="174" fontSize="8" fontWeight="600" fill="#334155">Thumb rest</text>
    </g>
  );
  else if (kind === 'airshot') art = (
    <g>
      {/* Upright Pen / Syringe Assembly pointing straight up */}
      <line x1="160" y1="36" x2="160" y2="12" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M160 3 C 156 8, 156 12, 160 14 C 164 12, 164 8, 160 3 Z" fill="#0ea5e9" stroke="#0284c7" strokeWidth="1" />
      <circle cx="159" cy="9" r="1.5" fill="#ffffff" opacity="0.8" />

      <polygon points="152,48 168,48 163,36 157,36" fill={accent} />
      <rect x="153" y="48" width="14" height="5" rx="1" fill={accent} />

      <rect x="144" y="53" width="32" height="95" rx="6" fill="#ffffff" stroke="#334155" strokeWidth="2.5" />
      <rect x="150" y="62" width="20" height="60" rx="3" fill="#e0f2fe" stroke="#94a3b8" strokeWidth="1.5" />

      <path d="M150 72 Q 160 76 170 72" fill="none" stroke="#0284c7" strokeWidth="1.5" />
      <circle cx="156" cy="79" r="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
      <circle cx="163" cy="88" r="2.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.2" />
      <circle cx="158" cy="98" r="1.8" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />

      <rect x="148" y="148" width="24" height="15" rx="3" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
      <text x="160" y="159" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#1e293b">2u</text>
      <rect x="153" y="163" width="14" height="10" rx="2" fill={accent} />

      <polygon points="105,40 100,50 110,50" fill={accent} />
      <line x1="105" y1="85" x2="105" y2="48" stroke={accent} strokeWidth="2.5" />
      <text x="105" y="100" fontSize="8" fontWeight="bold" textAnchor="middle" fill={accent}>Hold Upright</text>
      <text x="105" y="111" fontSize="7.5" textAnchor="middle" fill="#64748b">Needle Uppermost</text>

      <circle cx="235" cy="55" r="24" fill="#ffffff" stroke={accent} strokeWidth="2" />
      <path d="M235 41 C 229 48, 229 55, 235 59 C 241 55, 241 48, 235 41 Z" fill="#0ea5e9" stroke="#0284c7" strokeWidth="1.5" />
      <text x="235" y="92" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#0f766e">Insulin Bleb</text>
      <text x="235" y="103" fontSize="7.5" textAnchor="middle" fill="#64748b">Confirms Flow</text>
    </g>
  );
  else if (kind === 'resuspension') art = (
    <g>
      {/* 1. Left: Settled Suspension (NPH/Premix Before Inversion) */}
      <rect x="25" y="35" width="60" height="110" rx="6" fill="#ffffff" stroke="#475569" strokeWidth="2" />
      <rect x="27" y="38" width="56" height="70" fill="#f8fafc" />
      <rect x="27" y="108" width="56" height="35" rx="4" fill="#cbd5e1" />
      <line x1="27" y1="108" x2="83" y2="108" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2,2" />
      <text x="55" y="65" fontSize="7.5" fontWeight="bold" textAnchor="middle" fill="#64748b">Clear Liquid</text>
      <text x="55" y="125" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#334155">Settled Crystals</text>
      <text x="55" y="160" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#dc2626">BEFORE</text>
      <text x="55" y="172" fontSize="7" textAnchor="middle" fill="#64748b">Unmixed Suspension</text>

      {/* 2. Center: Rolling & Inverting Arrows ×10 */}
      <path d="M 105 75 C 115 50, 145 50, 155 75" fill="none" stroke={accent} strokeWidth="2.5" />
      <path d="M 155 105 C 145 130, 115 130, 105 105" fill="none" stroke={accent} strokeWidth="2.5" />
      <circle cx="130" cy="90" r="18" fill="#f0fdf4" stroke={accent} strokeWidth="1.5" />
      <text x="130" y="87" fontSize="9" fontWeight="bold" textAnchor="middle" fill={accent}>×10</text>
      <text x="130" y="97" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#15803d">ROLL / INVERT</text>
      <text x="130" y="160" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#0f766e">GENTLE MOTION</text>
      <text x="130" y="172" fontSize="7" textAnchor="middle" fill="#dc2626">DO NOT SHAKE</text>

      {/* 3. Right: Uniformly Cloudy Resuspended Ready Dose */}
      <rect x="175" y="35" width="60" height="110" rx="6" fill="#f1f5f9" stroke="#0f766e" strokeWidth="2.5" />
      <circle cx="195" cy="65" r="3" fill="#ffffff" opacity="0.8" />
      <circle cx="215" cy="85" r="4" fill="#ffffff" opacity="0.8" />
      <circle cx="190" cy="115" r="3.5" fill="#ffffff" opacity="0.8" />
      <text x="205" y="88" fontSize="8.5" fontWeight="bold" textAnchor="middle" fill="#0f766e">Milky White</text>
      <text x="205" y="160" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#16a34a">RESUSPENDED</text>
      <text x="205" y="172" fontSize="7" textAnchor="middle" fill="#64748b">Ready to Inject</text>

      {/* 4. Far Right: Clear Analogue Reference */}
      <rect x="250" y="45" width="45" height="90" rx="5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
      <text x="272.5" y="90" fontSize="7.5" fontWeight="bold" textAnchor="middle" fill="#0369a1">Clear</text>
      <text x="272.5" y="160" fontSize="7.5" fontWeight="bold" textAnchor="middle" fill="#0284c7">ANALOGUE</text>
      <text x="272.5" y="172" fontSize="6.5" textAnchor="middle" fill="#64748b">No Mix Needed</text>
    </g>
  );
  else if (kind === 'fitterupdates') art = (
    <g>
      {/* Panel 1: 4 mm Needle & Skin Layers */}
      <rect x="10" y="25" width="55" height="145" rx="5" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
      <rect x="15" y="45" width="45" height="15" fill="#fecaca" />
      <rect x="15" y="60" width="45" height="50" fill="#fef08a" />
      <rect x="15" y="110" width="45" height="25" fill="#fca5a5" />
      <line x1="37" y1="30" x2="37" y2="70" stroke="#0284c7" strokeWidth="2.5" />
      <text x="37.5" y="150" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#0f766e">1. 4mm Needle</text>
      <text x="37.5" y="161" fontSize="6.5" textAnchor="middle" fill="#64748b">90° No Skinfold</text>

      {/* Panel 2: Lipohypertrophy Palpation */}
      <rect x="70" y="25" width="55" height="145" rx="5" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.5" />
      <circle cx="97.5" cy="75" r="18" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="3,3" />
      <circle cx="97.5" cy="75" r="8" fill="#f97316" opacity="0.4" />
      <text x="97.5" y="150" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#c2410c">2. Palpation</text>
      <text x="97.5" y="161" fontSize="6.5" textAnchor="middle" fill="#64748b">Every 6 Months</text>

      {/* Panel 3: 4-Quadrant Abdomen Rotation */}
      <rect x="130" y="25" width="55" height="145" rx="5" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
      <rect x="142" y="50" width="31" height="40" rx="3" fill="#dcfce7" stroke="#16a34a" strokeWidth="1" />
      <line x1="157.5" y1="50" x2="157.5" y2="90" stroke="#16a34a" strokeWidth="1" />
      <line x1="142" y1="70" x2="173" y2="70" stroke="#16a34a" strokeWidth="1" />
      <circle cx="157.5" cy="70" r="4" fill="#ffffff" stroke="#16a34a" strokeWidth="1" />
      <text x="157.5" y="150" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#15803d">3. Quadrants</text>
      <text x="157.5" y="161" fontSize="6.5" textAnchor="middle" fill="#64748b">1 Wk/Qtr ≥1cm</text>

      {/* Panel 4: Single-Use Needles vs Reuse */}
      <rect x="190" y="25" width="55" height="145" rx="5" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.5" />
      <circle cx="217.5" cy="70" r="16" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
      <line x1="207.5" y1="60" x2="227.5" y2="80" stroke="#dc2626" strokeWidth="2" />
      <line x1="227.5" y1="60" x2="207.5" y2="80" stroke="#dc2626" strokeWidth="2" />
      <text x="217.5" y="150" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#b91c1c">4. Single-Use</text>
      <text x="217.5" y="161" fontSize="6.5" textAnchor="middle" fill="#64748b">No Reuse</text>

      {/* Panel 5: Connected Smart Pens */}
      <rect x="250" y="25" width="55" height="145" rx="5" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5" />
      <rect x="272" y="45" width="10" height="45" rx="3" fill="#3b82f6" />
      <path d="M265 55 Q 262 60 265 65" fill="none" stroke="#2563eb" strokeWidth="1.5" />
      <path d="M260 52 Q 255 60 260 68" fill="none" stroke="#2563eb" strokeWidth="1.5" />
      <text x="277.5" y="150" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">5. Smart Pen</text>
      <text x="277.5" y="161" fontSize="6.5" textAnchor="middle" fill="#64748b">Timestamp Log</text>
    </g>
  );
  else if (kind === 'bleedingafterinjection') art = (
    <g>
      {/* Panel 1: Microscopic Capillary Network Nick */}
      <rect x="15" y="25" width="65" height="145" rx="5" fill="#fff1f2" stroke="#e11d48" strokeWidth="1.5" />
      <path d="M 25 70 C 45 65, 60 75, 75 68" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="2,2" />
      <line x1="47.5" y1="35" x2="47.5" y2="72" stroke="#0284c7" strokeWidth="2.5" />
      <circle cx="47.5" cy="45" r="4" fill="#e11d48" />
      <text x="47.5" y="140" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#9f1239">1. Capillary Nick</text>
      <text x="47.5" y="152" fontSize="6.5" textAnchor="middle" fill="#64748b">Invisible Microvessel</text>
      <text x="47.5" y="162" fontSize="6" textAnchor="middle" fill="#64748b">Blood Follows Needle</text>

      {/* Panel 2: Immediate Care - Gentle Pressure 5-10s */}
      <rect x="90" y="25" width="65" height="145" rx="5" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
      <rect x="110" y="50" width="25" height="18" rx="4" fill="#ffffff" stroke="#16a34a" strokeWidth="1.5" />
      <text x="122.5" y="62" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#15803d">5-10s</text>
      <text x="122.5" y="140" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#15803d">2. Gentle Press</text>
      <text x="122.5" y="152" fontSize="6.5" textAnchor="middle" fill="#16a34a">Clean Tissue/Cotton</text>
      <text x="122.5" y="162" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#dc2626">DO NOT RUB</text>

      {/* Panel 3: Do Not Redose Warning */}
      <rect x="165" y="25" width="65" height="145" rx="5" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.5" />
      <circle cx="197.5" cy="65" r="16" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
      <text x="197.5" y="69" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#dc2626">STOP</text>
      <text x="197.5" y="140" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#b91c1c">3. Do NOT Redose</text>
      <text x="197.5" y="152" fontSize="6.5" textAnchor="middle" fill="#64748b">Dose Still Absorbed</text>
      <text x="197.5" y="162" fontSize="6" textAnchor="middle" fill="#dc2626">Avoid Hypoglycemia</text>

      {/* Panel 4: 5 Prevention Steps */}
      <rect x="240" y="25" width="65" height="145" rx="5" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5" />
      <text x="272.5" y="48" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">• Fresh 4mm Needle</text>
      <text x="272.5" y="64" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">• Pull Out Straight</text>
      <text x="272.5" y="80" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">• No Wiggle/Twist</text>
      <text x="272.5" y="96" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">• Rotate Site</text>
      <text x="272.5" y="112" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">• Inspect Skin</text>
      <text x="272.5" y="140" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#1e40af">4. Prevention</text>
      <text x="272.5" y="152" fontSize="6.5" textAnchor="middle" fill="#64748b">Minimizes Bruising</text>
      <text x="272.5" y="162" fontSize="6" textAnchor="middle" fill="#2563eb">Smooth Tissue Entry</text>
    </g>
  );
  else if (kind === 'stingingafterinjection') art = (
    <g>
      {/* Panel 1: pH Level (Acidic Glargine ~pH 4 into Fat ~pH 7.4) */}
      <rect x="10" y="25" width="56" height="145" rx="5" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="38" cy="55" r="14" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
      <text x="38" y="59" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#b45309">pH 4.0</text>
      <text x="38" y="138" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#b45309">1. Acidic pH Shift</text>
      <text x="38" y="150" fontSize="6" textAnchor="middle" fill="#64748b">Micro-Crystals Form</text>
      <text x="38" y="160" fontSize="6" textAnchor="middle" fill="#d97706">Normal & Harmless</text>

      {/* Panel 2: Cold vs Room Temp */}
      <rect x="71" y="25" width="56" height="145" rx="5" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
      <rect x="85" y="45" width="28" height="25" rx="4" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
      <text x="99" y="61" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">4°C</text>
      <text x="99" y="138" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">2. Cold Shock</text>
      <text x="99" y="150" fontSize="6" textAnchor="middle" fill="#64748b">Keep Active Pen at</text>
      <text x="99" y="160" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#2563eb">Room Temp (25°C)</text>

      {/* Panel 3: Wet Alcohol Swab */}
      <rect x="132" y="25" width="56" height="145" rx="5" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
      <rect x="146" y="48" width="28" height="18" rx="4" fill="#ffffff" stroke="#16a34a" strokeWidth="1.5" />
      <text x="160" y="60" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#15803d">10-15s</text>
      <text x="160" y="138" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#15803d">3. Air-Dry Swab</text>
      <text x="160" y="150" fontSize="6" textAnchor="middle" fill="#64748b">Wait Until Completely</text>
      <text x="160" y="160" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#16a34a">Dry Before Injection</text>

      {/* Panel 4: Needle Reuse / Burrs */}
      <rect x="193" y="25" width="56" height="145" rx="5" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.5" />
      <path d="M198 65 L 244 45" stroke="#ef4444" strokeWidth="2" />
      <text x="221" y="138" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#b91c1c">4. Fresh Needle</text>
      <text x="221" y="150" fontSize="6" textAnchor="middle" fill="#64748b">Reused Tip Burrs</text>
      <text x="221" y="160" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#dc2626">Tear Tissue & Sting</text>

      {/* Panel 5: Muscle vs Fat */}
      <rect x="254" y="25" width="56" height="145" rx="5" fill="#faf5ff" stroke="#9333ea" strokeWidth="1.5" />
      <text x="282" y="55" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#7e22ce">4 mm</text>
      <text x="282" y="138" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#7e22ce">5. Fat vs Muscle</text>
      <text x="282" y="150" fontSize="6" textAnchor="middle" fill="#64748b">Gentle 90° Contact</text>
      <text x="282" y="160" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#9333ea">Avoid Deep Muscle</text>
    </g>
  );
  else if (kind === 'atlas' || kind === 'regimens') art = (
    <g>
      <rect x="40" y="30" width="240" height="130" rx="6" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="160" y="48" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#b45309">FIGURE 2.1 · INSULIN REGIMENS</text>
      <path d="M50 140 L 90 70 L 130 140 L 170 70 L 210 140 L 250 80 L 270 140" fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
      <path d="M50 135 Q 160 125 270 135" fill="none" stroke="#16a34a" strokeWidth="2" strokeDasharray="3,3" />
      <text x="90" y="152" fontSize="7.5" fill="#0369a1">Meal Bolus Peaks</text>
      <text x="210" y="130" fontSize="7.5" fill="#15803d">Basal Coverage</text>
    </g>
  );
  else if (kind === 'allstar') art = (
    <g>
      <rect x="45" y="75" width="230" height="34" rx="17" fill="#581c87" stroke="#3b0764" strokeWidth="2" />
      <rect x="150" y="82" width="60" height="20" rx="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
      <text x="180" y="96" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#0f172a">AllStar 02</text>
      <path d="M45 92 L 25 92" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
      <text x="160" y="135" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#581c87">Sanofi AllStar Reusable Pen</text>
    </g>
  );
  else if (kind === 'frioduo' || kind === 'friolarge') art = (
    <g>
      <rect x="90" y="35" width="140" height="120" rx="8" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
      <rect x="135" y="48" width="50" height="22" rx="3" fill="#ffffff" />
      <text x="160" y="63" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#0f172a">FRIO®</text>
      <path d="M105 85 Q 160 78 215 85" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4" />
      <text x="160" y="105" fontSize="8.5" textAnchor="middle" fill="#94a1b2">Evaporative Hydrogel Cooling</text>
      <text x="160" y="145" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0284c7">45+ Hours Water-Activated</text>
    </g>
  );
  else if (kind === 'evacase' || kind === 'compactpouch') art = (
    <g>
      <rect x="65" y="45" width="190" height="95" rx="14" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />
      <rect x="85" y="150" width="38" height="24" rx="10" fill="#2563eb" />
      <rect x="140" y="150" width="38" height="24" rx="10" fill="#2563eb" />
      <rect x="195" y="150" width="38" height="24" rx="10" fill="#2563eb" />
      <text x="160" y="95" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#f8fafc">CareVego EVA Case</text>
      <text x="160" y="112" fontSize="8" textAnchor="middle" fill="#94a3b8">Thermal Barrier + 3 Gel Packs</text>
    </g>
  );
  else if (kind === 'lcdcooler' || kind === 'hardshelllcd') art = (
    <g>
      <rect x="85" y="30" width="150" height="130" rx="20" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="3" />
      <rect x="135" y="70" width="50" height="32" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      <text x="160" y="92" fontSize="13" fontWeight="bold" textAnchor="middle" fill="#4ade80">5.8°C</text>
      <text x="160" y="148" fontSize="9.5" fontWeight="bold" textAnchor="middle" fill="#1e3a8a">Digital LCD Thermometer</text>
    </g>
  );
  else if (kind === 'zeerpot' || kind === 'coolingstudy') art = (
    <g>
      <ellipse cx="160" cy="50" rx="65" ry="16" fill="#b45309" stroke="#78350f" strokeWidth="2" />
      <path d="M95 50 C 70 110, 90 145, 120 155 L 200 155 C 230 145, 250 110, 225 50 Z" fill="#d97706" stroke="#92400e" strokeWidth="2.5" />
      <ellipse cx="160" cy="55" rx="45" ry="11" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
      <rect x="145" y="95" width="14" height="24" rx="2" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
      <rect x="165" y="95" width="14" height="24" rx="2" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
      <text x="160" y="138" fontSize="8.5" fontWeight="bold" textAnchor="middle" fill="#78350f">Wet Sand Evaporative Layer</text>
    </g>
  );
  else if (kind === 'comparecoolers' || kind === 'electricflask' || kind === 'activefridge') art = (
    <g>
      <rect x="75" y="40" width="75" height="110" rx="10" fill="#0f766e" stroke="#115e59" strokeWidth="2" />
      <text x="112" y="95" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#ffffff">Flask 16h+</text>
      <rect x="170" y="40" width="85" height="110" rx="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
      <text x="212" y="95" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#1e293b">Active 2-8°C</text>
    </g>
  );
  else if (kind === 'driving') art = <><rect x="86" y="96" width="148" height="44" rx="16" fill="#fff" stroke={accent} strokeWidth="4" /><path d="M100 96 L114 64 H206 L220 96" fill="none" stroke={accent} strokeWidth="4" strokeLinejoin="round" /><rect x="140" y="76" width="40" height="18" rx="4" fill={accent} opacity=".25" /><circle cx="118" cy="140" r="16" fill="#fff" stroke={accent} strokeWidth="4" /><circle cx="202" cy="140" r="16" fill="#fff" stroke={accent} strokeWidth="4" /><circle cx="118" cy="140" r="5" fill={accent} /><circle cx="202" cy="140" r="5" fill={accent} /></>;
  else if (kind === 'table73sickday') art = (
    <g>
      {/* Panel 1: Check Capillary Glucose Every 2 Hours */}
      <rect x="20" y="38" width="85" height="110" rx="8" fill="#ffffff" stroke="#7c3aed" strokeWidth="2.5" />
      <circle cx="62" cy="74" r="18" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="2" />
      <path d="M62 74 L62 62 M62 74 L72 74" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
      <text x="62" y="108" fontSize="8.5" fontWeight="bold" textAnchor="middle" fill="#7c3aed">CHECK EVERY 2H</text>
      <text x="62" y="122" fontSize="7" textAnchor="middle" fill="#64748b">Capillary Glucose</text>
      <text x="62" y="136" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#be123c">&gt;12 mmol/L = Ketones</text>

      {/* Panel 2: Never Stop Insulin & +25-50% Dose */}
      <rect x="117" y="38" width="85" height="110" rx="8" fill="#ffffff" stroke="#0f766e" strokeWidth="2.5" />
      <rect x="145" y="55" width="30" height="30" rx="6" fill="#f0fdf4" stroke="#0f766e" strokeWidth="2" />
      <text x="160" y="74" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#0f766e">+50%</text>
      <text x="160" y="105" fontSize="8.5" fontWeight="bold" textAnchor="middle" fill="#0f766e">NEVER STOP</text>
      <text x="160" y="118" fontSize="7.5" fontWeight="bold" textAnchor="middle" fill="#15803d">Insulin Continued</text>
      <text x="160" y="134" fontSize="7" textAnchor="middle" fill="#64748b">+25% to +50% Dose</text>

      {/* Panel 3: Fluids & Alternative Carbohydrates */}
      <rect x="214" y="38" width="85" height="110" rx="8" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
      <path d="M245 58 H268 L264 90 H249 Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
      <text x="256" y="108" fontSize="8.5" fontWeight="bold" textAnchor="middle" fill="#0284c7">PLENTY FLUIDS</text>
      <text x="256" y="122" fontSize="7" textAnchor="middle" fill="#64748b">Clear Hydration</text>
      <text x="256" y="136" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#ca8a04">Or Glucose Fluids</text>
    </g>
  );
  else if (kind === 'drivingpen') art = (
    <g>
      <rect x="110" y="45" width="100" height="70" rx="8" fill="#fff" stroke={accent} strokeWidth="3" strokeDasharray="6 5" />
      <circle cx="130" cy="63" r="7" fill={accent} opacity=".4" />
      <path d="M118 105 L145 78 L165 98 L185 70 L202 105 Z" fill={accent} opacity=".18" />
      <text x="160" y="135" fontSize="13" fontWeight="700" textAnchor="middle" fill={accent}>Photo coming soon</text>
      <text x="160" y="152" fontSize="10" textAnchor="middle" fill={accent} opacity=".75">Insulin pen kept within reach while driving</text>
    </g>
  );
  else art = <><circle cx="160" cy="95" r="56" fill="#fff" stroke={accent} strokeWidth="4" /><path d="M160 60 v70 M125 95 h70" stroke={accent} strokeWidth="7" strokeLinecap="round" /><circle cx="254" cy="70" r="20" fill={accent} opacity=".18" /></>;
  return <svg className={large ? 'topic-illustration large' : 'topic-illustration'} {...common}>{bg}{dot}{art}</svg>;
}

function HeroIllustration() {
  return <svg viewBox="0 0 420 300" className="hero-illustration" role="img" aria-label="A friendly illustration of a person in a clinical coat" style={{ filter: 'drop-shadow(0 24px 40px rgba(124,58,237,0.16))' }}><circle cx="210" cy="150" r="118" fill="#7c3aed0d" /><path d="M121 223 C107 169 126 114 165 102 C205 90 238 120 254 153 C268 184 295 197 307 220" fill="#fff" opacity=".95" /><circle cx="205" cy="87" r="34" fill="#ffd7bf" /><path d="M170 85 q28-61 69-15 q13 16 4 39 q-15-21-35-20 q-17 1-38-4" fill="#1f2937" /><path d="M165 124 q45 22 89 0 l19 104 h-124Z" fill="#7c3aed" opacity=".92" /><path d="M180 144 l-27 67 M234 144 l30 65" stroke="#ffd7bf" strokeWidth="18" strokeLinecap="round" /><path d="M153 211 l-25 47 M263 209 l27 47" stroke="#334155" strokeWidth="17" strokeLinecap="round" /><rect x="117" y="254" width="48" height="15" rx="7" fill="#334155" /><rect x="267" y="254" width="48" height="15" rx="7" fill="#334155" /><circle cx="211" cy="143" r="8" fill="#fff" /><path d="M176 132 q28 13 54 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".65" /><path d="M72 56 l7 17 18 3-13 12 3 18-15-9-16 9 4-18-14-12 18-3Z" fill="#0d9488" opacity=".6" /><path d="M337 67 l6 14 15 3-11 10 3 16-13-8-14 8 3-16-11-10 15-3Z" fill="#ec4899" opacity=".55" /><path d="M331 190 q23-32 45 0 q-22 30-45 0Z" fill="#7c3aed" opacity=".3" /></svg>;
}

function Footer() {
  return <footer className="footer"><span>PanInsulin · patient education prototype</span><span>Always confirm decisions with your diabetes care team.</span></footer>;
}

createRoot(document.getElementById('root')).render(<App />);
