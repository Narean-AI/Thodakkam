import React, { useState, useEffect, useRef } from 'react'
import api from '../api'

// All topic data tagged by company + role
const ALL_TOPICS = [
  // ── Software Engineer (general DSA/Algo) ──────────────────────────────
  { name: 'Arrays & Hashing', category: 'Data Structures', difficulty: 'Easy',   companies: ['Google','Amazon','Meta','Microsoft'], roles: ['Software Engineer','Backend Developer','Full Stack Developer'], link: 'https://leetcode.com/tag/array/' },
  { name: 'Linked Lists',     category: 'Data Structures', difficulty: 'Easy',   companies: ['Amazon','Microsoft'],                 roles: ['Software Engineer','Backend Developer'],                     link: 'https://leetcode.com/tag/linked-list/' },
  { name: 'Stacks & Queues',  category: 'Data Structures', difficulty: 'Medium', companies: ['Google','Amazon'],                    roles: ['Software Engineer','Backend Developer'],                     link: 'https://leetcode.com/tag/stack/' },
  { name: 'Trees & BST',      category: 'Data Structures', difficulty: 'Medium', companies: ['Google','Meta','Microsoft'],          roles: ['Software Engineer','Backend Developer'],                     link: 'https://leetcode.com/tag/tree/' },
  { name: 'Heaps / Priority Queue', category: 'Data Structures', difficulty: 'Medium', companies: ['Amazon','Google'], roles: ['Software Engineer','Backend Developer'], link: 'https://leetcode.com/tag/heap-priority-queue/' },
  { name: 'Graphs',            category: 'Data Structures', difficulty: 'Hard',   companies: ['Meta','Google'],                     roles: ['Software Engineer','Backend Developer'],                     link: 'https://leetcode.com/tag/graph/' },
  { name: 'Tries',             category: 'Data Structures', difficulty: 'Hard',   companies: ['Google','Microsoft'],                roles: ['Software Engineer'],                                         link: 'https://leetcode.com/tag/trie/' },
  { name: 'Two Pointers',      category: 'Algorithms',      difficulty: 'Easy',   companies: ['Amazon','Google','Meta','Microsoft'], roles: ['Software Engineer','Backend Developer'],                    link: 'https://leetcode.com/tag/two-pointers/' },
  { name: 'Sliding Window',    category: 'Algorithms',      difficulty: 'Medium', companies: ['Google','Meta','Amazon'],            roles: ['Software Engineer','Backend Developer'],                     link: 'https://leetcode.com/tag/sliding-window/' },
  { name: 'Binary Search',     category: 'Algorithms',      difficulty: 'Medium', companies: ['Google','Amazon','Meta','Microsoft'], roles: ['Software Engineer','Backend Developer','Full Stack Developer'], link: 'https://leetcode.com/tag/binary-search/' },
  { name: 'Dynamic Programming', category: 'Algorithms',   difficulty: 'Hard',   companies: ['Amazon','Google','Meta'],            roles: ['Software Engineer'],                                         link: 'https://leetcode.com/tag/dynamic-programming/' },
  { name: 'Backtracking',      category: 'Algorithms',      difficulty: 'Hard',   companies: ['Google','Microsoft'],                roles: ['Software Engineer'],                                         link: 'https://leetcode.com/tag/backtracking/' },
  { name: 'Greedy',            category: 'Algorithms',      difficulty: 'Medium', companies: ['Amazon','Google'],                   roles: ['Software Engineer','Backend Developer'],                     link: 'https://leetcode.com/tag/greedy/' },
  { name: 'Sorting Algorithms', category: 'Algorithms',    difficulty: 'Easy',   companies: ['Google','Amazon','Meta','Microsoft'], roles: ['Software Engineer','Backend Developer'],                    link: 'https://leetcode.com/tag/sorting/' },
  // ── System Design ─────────────────────────────────────────────────────
  { name: 'URL Shortener',     category: 'System Design',   difficulty: 'Medium', companies: ['Amazon','Meta','Google'],            roles: ['Software Engineer','Backend Developer','Full Stack Developer'], link: 'https://github.com/donnemartin/system-design-primer' },
  { name: 'Rate Limiter',      category: 'System Design',   difficulty: 'Medium', companies: ['Google','Amazon'],                   roles: ['Software Engineer','Backend Developer'],                     link: 'https://github.com/donnemartin/system-design-primer' },
  { name: 'Distributed Cache', category: 'System Design',   difficulty: 'Hard',   companies: ['Meta','Amazon'],                     roles: ['Software Engineer','Backend Developer'],                     link: 'https://github.com/donnemartin/system-design-primer' },
  { name: 'Message Queue',     category: 'System Design',   difficulty: 'Hard',   companies: ['Amazon','Google'],                   roles: ['Software Engineer','Backend Developer'],                     link: 'https://github.com/donnemartin/system-design-primer' },
  { name: 'Database Sharding', category: 'System Design',   difficulty: 'Hard',   companies: ['Meta','Microsoft'],                  roles: ['Software Engineer','Backend Developer'],                     link: 'https://github.com/donnemartin/system-design-primer' },
  { name: 'API Gateway Design', category: 'System Design',  difficulty: 'Medium', companies: ['Amazon','Microsoft'],                roles: ['Full Stack Developer','Backend Developer','Software Engineer'], link: 'https://github.com/donnemartin/system-design-primer' },
  // ── Frontend-specific ─────────────────────────────────────────────────
  { name: 'JavaScript: Closures & Event Loop', category: 'Frontend',       difficulty: 'Medium', companies: ['Google','Meta','Microsoft'], roles: ['Frontend Developer','Full Stack Developer'], link: 'https://javascript.info/closure' },
  { name: 'React Hooks & Lifecycle',           category: 'Frontend',       difficulty: 'Medium', companies: ['Meta','Microsoft','Amazon'], roles: ['Frontend Developer','Full Stack Developer'], link: 'https://react.dev/reference/react' },
  { name: 'CSS: Flexbox & Grid',               category: 'Frontend',       difficulty: 'Easy',   companies: ['Meta','Google','Microsoft'], roles: ['Frontend Developer','Full Stack Developer'], link: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/' },
  { name: 'Browser Rendering & Performance',   category: 'Frontend',       difficulty: 'Hard',   companies: ['Google','Meta'],            roles: ['Frontend Developer'],                        link: 'https://web.dev/performance/' },
  { name: 'Accessibility (WCAG)',              category: 'Frontend',       difficulty: 'Medium', companies: ['Microsoft','Google'],       roles: ['Frontend Developer'],                        link: 'https://www.w3.org/WAI/WCAG21/quickref/' },
  { name: 'TypeScript Fundamentals',           category: 'Frontend',       difficulty: 'Medium', companies: ['Microsoft','Google','Meta'], roles: ['Frontend Developer','Full Stack Developer'], link: 'https://www.typescriptlang.org/docs/' },
  { name: 'State Management (Redux/Zustand)',  category: 'Frontend',       difficulty: 'Hard',   companies: ['Meta','Amazon'],            roles: ['Frontend Developer','Full Stack Developer'], link: 'https://redux.js.org/introduction/getting-started' },
  { name: 'REST & GraphQL APIs',               category: 'Frontend',       difficulty: 'Medium', companies: ['Amazon','Meta','Microsoft'], roles: ['Frontend Developer','Full Stack Developer'], link: 'https://graphql.org/learn/' },
  // ── Data Analyst ──────────────────────────────────────────────────────
  { name: 'SQL: JOINs & Subqueries',          category: 'Data & Analytics', difficulty: 'Medium', companies: ['Amazon','Microsoft','Meta'], roles: ['Data Analyst','Data Scientist'], link: 'https://leetcode.com/study-plan/sql/' },
  { name: 'Window Functions & CTEs',          category: 'Data & Analytics', difficulty: 'Hard',   companies: ['Google','Amazon','Meta'],   roles: ['Data Analyst','Data Scientist'],  link: 'https://mode.com/sql-tutorial/sql-window-functions/' },
  { name: 'Pandas & Data Wrangling',          category: 'Data & Analytics', difficulty: 'Medium', companies: ['Meta','Amazon','Google'],   roles: ['Data Analyst','Data Scientist'],  link: 'https://pandas.pydata.org/docs/' },
  { name: 'A/B Testing & Statistics',         category: 'Data & Analytics', difficulty: 'Hard',   companies: ['Meta','Google'],            roles: ['Data Analyst','Data Scientist'],  link: 'https://www.khanacademy.org/math/statistics-probability' },
  { name: 'Data Visualization (Tableau/PowerBI)', category: 'Data & Analytics', difficulty: 'Easy', companies: ['Microsoft','Amazon'],    roles: ['Data Analyst'],                    link: 'https://www.tableau.com/learn/training' },
  { name: 'Machine Learning Fundamentals',    category: 'Data & Analytics', difficulty: 'Hard',   companies: ['Google','Meta','Amazon'],   roles: ['Data Scientist'],                link: 'https://www.coursera.org/learn/machine-learning' },
  { name: 'Probability & Bayesian Thinking',  category: 'Data & Analytics', difficulty: 'Hard',   companies: ['Google','Meta'],            roles: ['Data Scientist'],                link: 'https://www.probabilitycourse.com/' },
  // ── Core CS ───────────────────────────────────────────────────────────
  { name: 'OOP Principles',           category: 'Core CS', difficulty: 'Easy',   companies: ['Microsoft','Amazon'],            roles: ['Software Engineer','Backend Developer','Full Stack Developer'], link: 'https://www.geeksforgeeks.org/oops-object-oriented-design/' },
  { name: 'SOLID & Design Patterns',  category: 'Core CS', difficulty: 'Hard',   companies: ['Microsoft','Google'],            roles: ['Software Engineer','Backend Developer'],                         link: 'https://refactoring.guru/design-patterns' },
  { name: 'OS: Threads & Concurrency',category: 'Core CS', difficulty: 'Medium', companies: ['Google','Meta'],                 roles: ['Software Engineer','Backend Developer'],                         link: 'https://www.geeksforgeeks.org/operating-systems-gq/' },
  { name: 'Computer Networks',        category: 'Core CS', difficulty: 'Medium', companies: ['Google','Amazon'],               roles: ['Software Engineer','Backend Developer','Full Stack Developer'],  link: 'https://www.geeksforgeeks.org/computer-network-tutorials/' },
  { name: 'Behavioral (STAR Method)', category: 'Core CS', difficulty: 'Easy',   companies: ['Amazon','Google','Meta','Microsoft'], roles: ['Software Engineer','Frontend Developer','Backend Developer','Full Stack Developer','Data Analyst','Data Scientist'], link: 'https://www.themuse.com/advice/star-interview-method' },
]

const COMPANY_ROLES = {
  Google:    ['Software Engineer','Backend Developer','Data Scientist','Full Stack Developer'],
  Amazon:    ['Software Engineer','Backend Developer','Full Stack Developer','Data Analyst'],
  Microsoft: ['Software Engineer','Frontend Developer','Full Stack Developer','Data Analyst'],
  Meta:      ['Software Engineer','Frontend Developer','Data Scientist','Full Stack Developer'],
}

const COMPANY_META = {
  Google:    { abbr: 'G', bg: 'bg-blue-600',   tip: 'Heavy algo focus. Expect 4-5 coding rounds + system design. Practice BFS/DFS and complex DP on LeetCode.' },
  Amazon:    { abbr: 'A', bg: 'bg-orange-500', tip: '14 Leadership Principles matter as much as code. Always answer with STAR format tied to LPs.' },
  Microsoft: { abbr: 'M', bg: 'bg-indigo-600', tip: 'OOP and clean code are key. Explain your thinking aloud — interviewers value communication.' },
  Meta:      { abbr: 'F', bg: 'bg-purple-600', tip: 'Speed is critical. Aim to solve coding problems in under 20 mins. Product sense is tested too.' },
}

const ROLE_RESOURCES = {
  'Software Engineer':    [
    { name: 'LeetCode',              abbr: 'LC', bg: 'bg-orange-500', desc: 'Classic DSA practice',          link: 'https://leetcode.com' },
    { name: 'NeetCode 150',          abbr: 'NC', bg: 'bg-green-600',  desc: 'Curated top 150 problems',      link: 'https://neetcode.io/practice' },
    { name: 'System Design Primer',  abbr: 'SD', bg: 'bg-blue-600',   desc: 'Distributed system concepts',    link: 'https://github.com/donnemartin/system-design-primer' },
    { name: 'Striver SDE Sheet',     abbr: 'SS', bg: 'bg-purple-600', desc: 'Step-by-step DSA roadmap',      link: 'https://takeuforward.org/interviews/strivers-sde-sheet' },
    { name: 'Refactoring Guru',      abbr: 'RG', bg: 'bg-red-600',    desc: 'Design patterns explained',     link: 'https://refactoring.guru/design-patterns' },
    { name: 'GeeksforGeeks',         abbr: 'GG', bg: 'bg-emerald-600',desc: 'CS fundamentals & theory',      link: 'https://www.geeksforgeeks.org' },
  ],
  'Frontend Developer':   [
    { name: 'MDN Web Docs',          abbr: 'MD', bg: 'bg-blue-700',   desc: 'HTML/CSS/JS reference',         link: 'https://developer.mozilla.org' },
    { name: 'React Docs',            abbr: 'Re', bg: 'bg-sky-500',    desc: 'Official React documentation',   link: 'https://react.dev' },
    { name: 'JavaScript.info',       abbr: 'JS', bg: 'bg-yellow-500', desc: 'Deep JS concepts',               link: 'https://javascript.info' },
    { name: 'LeetCode',              abbr: 'LC', bg: 'bg-orange-500', desc: 'JS coding challenges',           link: 'https://leetcode.com' },
    { name: 'web.dev (Performance)', abbr: 'WD', bg: 'bg-green-600',  desc: 'Browser performance guides',     link: 'https://web.dev/performance/' },
    { name: 'TypeScript Handbook',   abbr: 'TS', bg: 'bg-indigo-600', desc: 'Official TypeScript docs',       link: 'https://www.typescriptlang.org/docs/' },
  ],
  'Backend Developer':    [
    { name: 'LeetCode',              abbr: 'LC', bg: 'bg-orange-500', desc: 'DSA & system design practice',  link: 'https://leetcode.com' },
    { name: 'System Design Primer',  abbr: 'SD', bg: 'bg-blue-600',   desc: 'Distributed system concepts',   link: 'https://github.com/donnemartin/system-design-primer' },
    { name: 'GeeksforGeeks',         abbr: 'GG', bg: 'bg-emerald-600',desc: 'OS, DB, and networking theory', link: 'https://www.geeksforgeeks.org' },
    { name: 'Refactoring Guru',      abbr: 'RG', bg: 'bg-red-600',    desc: 'Design patterns explained',     link: 'https://refactoring.guru/design-patterns' },
    { name: 'High Scalability Blog', abbr: 'HS', bg: 'bg-purple-600', desc: 'Real-world system case studies', link: 'http://highscalability.com/' },
    { name: 'PostgreSQL Docs',       abbr: 'PG', bg: 'bg-indigo-600', desc: 'DB design & query tuning',      link: 'https://www.postgresql.org/docs/' },
  ],
  'Full Stack Developer': [
    { name: 'MDN Web Docs',          abbr: 'MD', bg: 'bg-blue-700',   desc: 'HTML/CSS/JS reference',         link: 'https://developer.mozilla.org' },
    { name: 'React Docs',            abbr: 'Re', bg: 'bg-sky-500',    desc: 'Official React documentation',   link: 'https://react.dev' },
    { name: 'System Design Primer',  abbr: 'SD', bg: 'bg-blue-600',   desc: 'Distributed system concepts',   link: 'https://github.com/donnemartin/system-design-primer' },
    { name: 'LeetCode',              abbr: 'LC', bg: 'bg-orange-500', desc: 'DSA practice',                  link: 'https://leetcode.com' },
    { name: 'Node.js Docs',          abbr: 'ND', bg: 'bg-green-700',  desc: 'Server-side JavaScript',        link: 'https://nodejs.org/docs/latest/api/' },
    { name: 'Striver SDE Sheet',     abbr: 'SS', bg: 'bg-purple-600', desc: 'DSA roadmap',                   link: 'https://takeuforward.org/interviews/strivers-sde-sheet' },
  ],
  'Data Analyst':         [
    { name: 'LeetCode SQL',          abbr: 'LS', bg: 'bg-orange-500', desc: 'SQL interview problems',        link: 'https://leetcode.com/study-plan/sql/' },
    { name: 'Mode SQL Tutorial',     abbr: 'MS', bg: 'bg-blue-600',   desc: 'Window functions & CTEs',       link: 'https://mode.com/sql-tutorial/' },
    { name: 'Pandas Docs',           abbr: 'PD', bg: 'bg-sky-600',    desc: 'Data wrangling with Python',    link: 'https://pandas.pydata.org/docs/' },
    { name: 'Tableau Training',      abbr: 'TB', bg: 'bg-indigo-600', desc: 'Data visualization skills',     link: 'https://www.tableau.com/learn/training' },
    { name: 'StatQuest (YouTube)',   abbr: 'SQ', bg: 'bg-emerald-600',desc: 'Statistics explained simply',   link: 'https://www.youtube.com/@statquest' },
    { name: 'HackerRank SQL',        abbr: 'HR', bg: 'bg-green-600',  desc: 'SQL challenges & certificates', link: 'https://www.hackerrank.com/domains/sql' },
  ],
  'Data Scientist':       [
    { name: 'Coursera ML Course',    abbr: 'ML', bg: 'bg-blue-600',   desc: 'Andrew Ng ML fundamentals',     link: 'https://www.coursera.org/learn/machine-learning' },
    { name: 'Kaggle',                abbr: 'KG', bg: 'bg-teal-600',   desc: 'Real-world ML competitions',    link: 'https://www.kaggle.com' },
    { name: 'LeetCode SQL',          abbr: 'LS', bg: 'bg-orange-500', desc: 'SQL for data analysis',         link: 'https://leetcode.com/study-plan/sql/' },
    { name: 'Pandas Docs',           abbr: 'PD', bg: 'bg-sky-600',    desc: 'Python data wrangling',         link: 'https://pandas.pydata.org/docs/' },
    { name: 'Probability Course',    abbr: 'PC', bg: 'bg-purple-600', desc: 'Stats & probability theory',    link: 'https://www.probabilitycourse.com/' },
    { name: 'StatQuest (YouTube)',   abbr: 'SQ', bg: 'bg-emerald-600',desc: 'Statistics explained simply',   link: 'https://www.youtube.com/@statquest' },
  ],
}

const ROLE_META = {
  'Software Engineer': {
    focus: ['DSA', 'System Design', 'Algorithms', 'OOP'],
    tip: 'Focus on time/space complexity. Practice on LeetCode daily and mock at least 2 system design questions per week.',
    badge: 'bg-indigo-600',
  },
  'Frontend Developer': {
    focus: ['JavaScript', 'React', 'CSS', 'Browser APIs', 'TypeScript'],
    tip: 'Build 2-3 portfolio projects. Know the event loop, closures, and React lifecycle deeply — these come up in every round.',
    badge: 'bg-pink-600',
  },
  'Backend Developer': {
    focus: ['APIs', 'Databases', 'System Design', 'OS Concepts', 'DSA'],
    tip: 'Know SQL query optimization and REST/gRPC API design. System design rounds are nearly always included.',
    badge: 'bg-emerald-600',
  },
  'Full Stack Developer': {
    focus: ['Frontend + Backend', 'APIs', 'DSA', 'System Design'],
    tip: 'Be ready for both UI and server-side questions. Show experience with end-to-end feature delivery in behaviorals.',
    badge: 'bg-sky-600',
  },
  'Data Analyst': {
    focus: ['SQL', 'Data Visualization', 'Statistics', 'Excel/Pandas'],
    tip: 'SQL window functions (RANK, LEAD, LAG) appear in almost every analyst interview. Practice HackerRank SQL daily.',
    badge: 'bg-amber-500',
  },
  'Data Scientist': {
    focus: ['ML Algorithms', 'Statistics', 'Python/Pandas', 'A/B Testing'],
    tip: 'Explain your ML model choices clearly — interviewers want to hear your reasoning, not just the answer. Know bias-variance tradeoff.',
    badge: 'bg-teal-600',
  },
}

const ROLE_FOCUS_CONTENT = {
  'Software Engineer': {
    notes: [
      'Master arrays, hash maps, two pointers, and binary search patterns.',
      'For every problem, explain brute force first, then optimize.',
      'Practice dry runs and edge-case checks before coding.',
      'Track time complexity in every solution and justify trade-offs.'
    ],
    videos: [
      { title: 'DSA Patterns for Interviews', embed: 'https://www.youtube.com/embed/DjYZk8nrXVY' },
      { title: 'System Design Basics', embed: 'https://www.youtube.com/embed/UzLMhqg3_Wc' }
    ]
  },
  'Frontend Developer': {
    notes: [
      'Revise event loop, closures, and async behavior deeply.',
      'Build reusable React components with clear state boundaries.',
      'Use semantic HTML + accessible keyboard navigation patterns.',
      'Practice performance improvements: memoization, lazy loading, bundle control.'
    ],
    videos: [
      { title: 'JavaScript Event Loop', embed: 'https://www.youtube.com/embed/8aGhZQkoFbQ' },
      { title: 'React Interview Preparation', embed: 'https://www.youtube.com/embed/bMknfKXIFA8' }
    ]
  },
  'Backend Developer': {
    notes: [
      'Design REST APIs with proper status codes and error contracts.',
      'Practice SQL indexing and query optimization scenarios.',
      'Understand caching, rate limiting, and idempotency patterns.',
      'Explain consistency vs availability trade-offs clearly.'
    ],
    videos: [
      { title: 'Backend System Design', embed: 'https://www.youtube.com/embed/umWABit-wbk' },
      { title: 'Database Indexing Explained', embed: 'https://www.youtube.com/embed/fsG1XaZEa78' }
    ]
  },
  'Full Stack Developer': {
    notes: [
      'Connect frontend state and backend APIs with robust error handling.',
      'Practice auth flows: JWT lifecycle, refresh, and route protection.',
      'Ship one end-to-end feature: UI, API, DB, tests, and deployment.',
      'Explain architecture decisions and scaling strategy in interviews.'
    ],
    videos: [
      { title: 'Full Stack Project Architecture', embed: 'https://www.youtube.com/embed/7CqJlxBYj-M' },
      { title: 'JWT Authentication Deep Dive', embed: 'https://www.youtube.com/embed/mbsmsi7l3r4' }
    ]
  },
  'Data Analyst': {
    notes: [
      'Practice SQL joins, CTEs, and window functions daily.',
      'Frame insights with business metrics, not only technical outputs.',
      'Use clear charts and annotate trends/outliers for stakeholders.',
      'Prepare STAR stories for impact, ownership, and experimentation.'
    ],
    videos: [
      { title: 'SQL Interview Questions', embed: 'https://www.youtube.com/embed/7S_tz1z_5bA' },
      { title: 'Data Analyst Interview Prep', embed: 'https://www.youtube.com/embed/4aD8z5Nf3W8' }
    ]
  },
  'Data Scientist': {
    notes: [
      'Revise bias-variance tradeoff and model selection rationale.',
      'Practice A/B testing metrics, assumptions, and pitfalls.',
      'Explain feature engineering and leakage prevention clearly.',
      'Present model results with uncertainty and business impact.'
    ],
    videos: [
      { title: 'ML Interview Preparation', embed: 'https://www.youtube.com/embed/tNa99PG8hR8' },
      { title: 'A/B Testing for Data Science', embed: 'https://www.youtube.com/embed/lOD6f9z_1s0' }
    ]
  }
}

const catColors = {
  'Data Structures': { header: 'bg-indigo-600', border: 'border-indigo-200' },
  Algorithms:        { header: 'bg-sky-600',    border: 'border-sky-200' },
  'System Design':   { header: 'bg-emerald-600',border: 'border-emerald-200' },
  Frontend:          { header: 'bg-pink-600',   border: 'border-pink-200' },
  'Data & Analytics':{ header: 'bg-amber-500',  border: 'border-amber-200' },
  'Core CS':         { header: 'bg-slate-600',  border: 'border-slate-200' },
}

const diffBadge = {
  Easy:   'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard:   'bg-red-100 text-red-700',
}

const FOCUS_OPTIONS = [
  { mins: 20, label: '20 min', desc: 'Quick sprint', color: 'bg-sky-500', border: 'border-sky-400' },
  { mins: 30, label: '30 min', desc: 'Focused session', color: 'bg-indigo-600', border: 'border-indigo-500' },
  { mins: 45, label: '45 min', desc: '40 min study + 5 min break', color: 'bg-purple-600', border: 'border-purple-500' },
]

const BLOCKED_SOCIAL_HOSTS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'snapchat.com',
  'poki.com',
  'crazygames.com',
  'miniclip.com',
  'roblox.com',
  'kongregate.com',
  'agame.com',
  'y8.com',
]

const PENALTY_SECONDS = 2 * 60
const MAX_DISTRACTIONS = 3

const normalizeText = (value) => String(value || '').toLowerCase().replace(/\s+/g, '')

const getHostname = (value) => {
  try {
    const parsed = new URL(value, window.location.origin)
    return normalizeText(parsed.hostname)
  } catch {
    return ''
  }
}

const ALLOWED_STUDY_HOSTS = (() => {
  const hostSet = new Set([
    normalizeText(window.location.hostname),
    'localhost',
    '127.0.0.1',
  ])

  ;[...ALL_TOPICS, ...Object.values(ROLE_RESOURCES).flat()].forEach((item) => {
    const host = getHostname(item?.link)
    if (host) hostSet.add(host)
  })

  return hostSet
})()

const isAllowedStudyUrl = (value) => {
  const host = getHostname(value)
  if (!host) return true
  return Array.from(ALLOWED_STUDY_HOSTS).some((allowedHost) => {
    return host === allowedHost || host.endsWith(`.${allowedHost}`)
  })
}

const isBlockedSocialUrl = (value) => {
  if (isAllowedStudyUrl(value)) return false

  try {
    const parsed = new URL(value, window.location.origin)
    const host = normalizeText(parsed.hostname)
    if (!host) return false
    return BLOCKED_SOCIAL_HOSTS.some(blockedHost => {
      const normalizedBlockedHost = normalizeText(blockedHost)
      return host === normalizedBlockedHost || host.endsWith(`.${normalizedBlockedHost}`)
    })
  } catch {
    return false
  }
}

export default function LearnPage() {
  const [company, setCompany]       = useState('Google')
  const [role, setRole]             = useState('Software Engineer')
  const [filterDiff, setFilterDiff] = useState('All')
  const [search, setSearch]         = useState('')

  // Focus session state
  const [focusState, setFocusState]     = useState('idle') // idle | selecting | active | break | done
  const [focusMins, setFocusMins]       = useState(null)
  const [timeLeft, setTimeLeft]         = useState(0)
  const [violations, setViolations]     = useState(0)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const [blockedAttempt, setBlockedAttempt] = useState('')
  const [penaltySeconds, setPenaltySeconds] = useState(0)
  const [focusNotice, setFocusNotice] = useState('')
  const [focusInsight, setFocusInsight] = useState(null)
  const [focusInsightLoading, setFocusInsightLoading] = useState(false)
  const [focusInsightError, setFocusInsightError] = useState('')
  const [autoStopped, setAutoStopped] = useState(false)
  const timerRef = useRef(null)

  // Tab switch & beforeunload detection
  useEffect(() => {
    if (focusState !== 'active' && focusState !== 'break') return

    const handleVisibility = () => {
      if (document.hidden) {
        setViolations(v => v + 1)
      } else {
        setShowTabWarning(true)
      }
    }
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Your focus session is active. Are you sure you want to leave?'
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [focusState])

  // Block social media links while focus session is running
  useEffect(() => {
    if (focusState !== 'active' && focusState !== 'break') return

    const applyPenalty = () => {
      setTimeLeft(t => t + PENALTY_SECONDS)
      setPenaltySeconds(total => total + PENALTY_SECONDS)
    }

    const showBlockedNotice = (url) => {
      setViolations(v => v + 1)
      applyPenalty()
      setShowTabWarning(false)
      setBlockedAttempt(url || 'Social media / games page')
    }

    const originalOpen = window.open
    window.open = function (url, ...args) {
      if (isBlockedSocialUrl(url)) {
        showBlockedNotice(url)
        return null
      }
      return originalOpen.call(window, url, ...args)
    }

    const handleDocumentClick = (event) => {
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor) return

      const href = anchor.getAttribute('href') || ''
      if (isBlockedSocialUrl(href)) {
        event.preventDefault()
        event.stopPropagation()
        showBlockedNotice(href)
        return
      }

      const isExternal = /^https?:\/\//i.test(href)
      if (isExternal) {
        event.preventDefault()
        event.stopPropagation()
        setFocusNotice('External links are locked during focus. Use the in-page notes and videos below.')
      }
    }

    document.addEventListener('click', handleDocumentClick, true)

    return () => {
      window.open = originalOpen
      document.removeEventListener('click', handleDocumentClick, true)
    }
  }, [focusState])

  // Countdown timer
  useEffect(() => {
    if (focusState !== 'active' && focusState !== 'break') {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          if (focusState === 'active' && focusMins === 45) {
            setFocusState('break')
            setTimeLeft(5 * 60)
            return 0
          }
          setFocusState('done')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [focusState, focusMins])

  const startFocus = (mins) => {
    setFocusMins(mins)
    setTimeLeft(mins === 45 ? 40 * 60 : mins * 60)
    setViolations(0)
    setPenaltySeconds(0)
    setShowTabWarning(false)
    setBlockedAttempt('')
    setFocusNotice('')
    setFocusInsight(null)
    setFocusInsightError('')
    setAutoStopped(false)
    setFocusState('active')
  }

  const stopFocus = () => {
    clearInterval(timerRef.current)
    setFocusState('idle')
    setFocusMins(null)
    setViolations(0)
    setPenaltySeconds(0)
    setShowTabWarning(false)
    setBlockedAttempt('')
    setFocusNotice('')
    setFocusInsight(null)
    setFocusInsightError('')
    setAutoStopped(false)
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const timerPct = () => {
    if (!focusMins) return 0
    const total = focusState === 'break' ? 5 * 60 : (focusMins === 45 ? 40 * 60 : focusMins * 60)
    return Math.round(((total - timeLeft) / total) * 100)
  }

  const roles     = COMPANY_ROLES[company] || []
  const compMeta  = COMPANY_META[company]
  const roleMeta  = ROLE_META[role] || ROLE_META['Software Engineer']
  const resources = ROLE_RESOURCES[role] || ROLE_RESOURCES['Software Engineer']
  const isFocusRunning = focusState === 'active' || focusState === 'break'

  // Reset role if it is not valid for the new company
  const activeRole = roles.includes(role) ? role : roles[0]
  const roleFocusContent = ROLE_FOCUS_CONTENT[activeRole] || ROLE_FOCUS_CONTENT['Software Engineer']

  const loadFocusInsight = async () => {
    if (focusInsightLoading) return
    setFocusInsightLoading(true)
    setFocusInsightError('')
    try {
      const response = await api.post('/ai/focus-insight', {
        company,
        role: activeRole,
        topic: roleMeta?.focus?.[0] || 'Core interview prep'
      })
      setFocusInsight(response?.data?.insight || null)
    } catch (error) {
      setFocusInsightError(error?.response?.data?.message || 'Unable to generate Groq focus challenge right now.')
    } finally {
      setFocusInsightLoading(false)
    }
  }

  const filtered = ALL_TOPICS.filter(t => {
    const matchCompany   = t.companies.includes(company)
    const matchRole      = t.roles.includes(activeRole)
    const matchDiff      = filterDiff === 'All' || t.difficulty === filterDiff
    const matchSearch    = !search || t.name.toLowerCase().includes(search.toLowerCase())
    return matchCompany && matchRole && matchDiff && matchSearch
  })

  // Group by category
  const grouped = filtered.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  useEffect(() => {
    if (!isFocusRunning) return
    if (focusInsight || focusInsightLoading) return
    loadFocusInsight()
  }, [isFocusRunning, company, activeRole])

  useEffect(() => {
    if (!isFocusRunning) return
    if (violations <= MAX_DISTRACTIONS) return

    clearInterval(timerRef.current)
    setShowTabWarning(false)
    setBlockedAttempt('')
    setFocusNotice('')
    setAutoStopped(true)
    setFocusState('done')
  }, [violations, isFocusRunning])

  // ── Focus session: selecting screen ──────────────────────────────────
  if (focusState === 'selecting') {
    return (
      <div className="app-container">
        <div className="max-w-lg mx-auto mt-10">
          <button onClick={() => setFocusState('idle')} className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Choose Focus Duration</h1>
          <p className="text-slate-500 text-sm mb-8">Once started, tab switches are tracked and leaving is blocked. Stay focused!</p>
          <div className="flex flex-col gap-4">
            {FOCUS_OPTIONS.map(opt => (
              <button
                key={opt.mins}
                onClick={() => startFocus(opt.mins)}
                className={`w-full p-5 rounded-2xl border-2 ${opt.border} bg-white hover:shadow-lg transition-all flex items-center gap-4 text-left group`}
              >
                <div className={`w-14 h-14 rounded-xl ${opt.color} text-white font-bold text-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  {opt.mins}m
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-base">{opt.label}</p>
                  <p className="text-sm text-slate-500">{opt.desc}</p>
                </div>
                <span className="ml-auto text-slate-300 group-hover:text-indigo-500 text-xl">→</span>
              </button>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-400 text-center">Social media tab switches will be counted as distractions.</p>
        </div>
      </div>
    )
  }

  // ── Focus session: done screen ──────────────────────────────────────
  if (focusState === 'done') {
    return (
      <div className="app-container">
        <div className="max-w-md mx-auto mt-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Session Complete!</h1>
          <p className="text-slate-500 mb-2">You completed a {focusMins}-minute focus session.</p>
          {autoStopped && (
            <p className="text-sm text-red-600 mb-2">Session auto-stopped: distractions exceeded {MAX_DISTRACTIONS}.</p>
          )}
          {violations > 0 && (
            <p className="text-sm text-red-500 mb-4">You switched tabs {violations} time{violations > 1 ? 's' : ''} during this session.</p>
          )}
          {violations === 0 && (
            <p className="text-sm text-emerald-600 mb-4">Perfect session — zero distractions! 🔥</p>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={() => setFocusState('selecting')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
              Start Another
            </button>
            <button onClick={stopFocus} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors">
              Back to Learn
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* ── Social media blocked overlay ── */}
      {blockedAttempt && (focusState === 'active' || focusState === 'break') && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            <div className="text-5xl mb-3">⛔</div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Not Permitted</h2>
            <p className="text-slate-700 text-sm mb-1">Social media and game pages are blocked until your focus session ends.</p>
            <p className="text-slate-500 text-xs mb-3">Blocked attempt: <span className="font-semibold">{blockedAttempt}</span></p>
            <p className="text-xs text-red-500 mb-1">Penalty added: +02:00</p>
            <p className="text-xs text-slate-400 mb-4">Instagram, Facebook, Snapchat, and game sites are not allowed during focus mode.</p>
            <button
              onClick={() => setBlockedAttempt('')}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continue Focus
            </button>
          </div>
        </div>
      )}

      {/* ── Focus notice overlay ── */}
      {focusNotice && isFocusRunning && (
        <div className="fixed inset-0 z-[55] bg-black/75 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            <div className="text-5xl mb-3">📘</div>
            <h2 className="text-xl font-bold text-indigo-700 mb-2">Stay in Focus Mode</h2>
            <p className="text-slate-700 text-sm mb-5">{focusNotice}</p>
            <button
              onClick={() => setFocusNotice('')}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continue Learning Here
            </button>
          </div>
        </div>
      )}

      {/* ── Tab-switch warning overlay ── */}
      {showTabWarning && (focusState === 'active' || focusState === 'break') && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="text-5xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Tab Switch Detected!</h2>
            <p className="text-slate-600 text-sm mb-2">You left your focus session.</p>
            <p className="text-slate-500 text-xs mb-1">Distractions this session: <span className="font-bold text-red-500">{violations}</span></p>
            {violations >= 3 && (
              <p className="text-xs text-red-400 mt-1 mb-3">Stop checking social media — your interview is counting on this! 💪</p>
            )}
            <button
              onClick={() => setShowTabWarning(false)}
              className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              I'm back — Resume Focus
            </button>
            <button
              onClick={stopFocus}
              className="mt-2 w-full py-2 text-slate-400 text-sm hover:text-slate-600"
            >
              Stop Session
            </button>
          </div>
        </div>
      )}

      {/* ── Active / Break timer bar ── */}
      {(focusState === 'active' || focusState === 'break') && (
        <div className={`sticky top-0 z-40 ${focusState === 'break' ? 'bg-emerald-600' : 'bg-indigo-700'} text-white px-6 py-3 flex items-center gap-4 shadow-lg mb-4 rounded-xl`}>
          <div className="text-2xl font-mono font-bold tracking-widest">{formatTime(timeLeft)}</div>
          <div className="flex-1">
            <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">
              {focusState === 'break' ? '☕ Break Time — relax!' : `🎯 Focus — ${focusMins} min session`}
            </p>
            <div className="mt-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${timerPct()}%` }} />
            </div>
          </div>
          {violations > 0 && (
            <div className="text-xs bg-white/20 px-2 py-1 rounded-lg">
              ⚠️ {violations} switch{violations > 1 ? 'es' : ''}
            </div>
          )}
          {penaltySeconds > 0 && (
            <div className="text-xs bg-red-500/70 px-2 py-1 rounded-lg">
              +{Math.floor(penaltySeconds / 60)}m penalty
            </div>
          )}
          <button
            onClick={stopFocus}
            className="ml-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors"
          >
            Stop
          </button>
        </div>
      )}

      <h1 className="page-title mb-1">Learn</h1>
      <p className="page-subtitle mb-4">Curated study topics and resources tailored to your target company and role.</p>

      {/* ── Focus session CTA (idle) ── */}
      {focusState === 'idle' && (
        <div className="card p-5 mb-6 flex items-center gap-4 border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl flex-shrink-0">
            🎯
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Start a Focus Session</p>
            <p className="text-xs text-slate-500 mt-0.5">Lock in for 20, 30, or 45 minutes. Tab switching is tracked — no distractions.</p>
          </div>
          <button
            onClick={() => setFocusState('selecting')}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors flex-shrink-0"
          >
            Start Focus
          </button>
        </div>
      )}

      {/* ── In-page focus content (role-specific) ── */}
      {isFocusRunning && (
        <div className="card p-5 mb-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${roleMeta.badge}`}>{activeRole}</div>
              <h3 className="text-sm font-semibold text-slate-900">In-page Focus Learning</h3>
            </div>
            <p className="text-xs text-slate-500">Everything stays inside this page during focus mode.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Company</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(COMPANY_ROLES).map(c => (
                    <button
                      key={`focus-company-${c}`}
                      onClick={() => {
                        setCompany(c)
                        const newRoles = COMPANY_ROLES[c]
                        if (!newRoles.includes(role)) setRole(newRoles[0])
                        setFocusInsight(null)
                        setFocusInsightError('')
                      }}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all border ${
                        company === c
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Role</p>
                <div className="flex gap-2 flex-wrap">
                  {roles.map(r => {
                    const rm = ROLE_META[r]
                    return (
                      <button
                        key={`focus-role-${r}`}
                        onClick={() => {
                          setRole(r)
                          setFocusInsight(null)
                          setFocusInsightError('')
                        }}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all border ${
                          activeRole === r
                            ? `${rm?.badge || 'bg-indigo-600'} text-white border-transparent`
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {r}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-5">
            <section className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-3">Role Notes</h4>
              <ul className="space-y-2">
                {roleFocusContent.notes.map((note, idx) => (
                  <li key={`${activeRole}-note-${idx}`} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-3">Role Videos</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {roleFocusContent.videos.map((video, idx) => (
                  <div key={`${activeRole}-video-${idx}`} className="rounded-lg overflow-hidden border border-slate-200">
                    <p className="text-xs font-semibold text-slate-700 px-3 py-2 bg-slate-50">{video.title}</p>
                    <div className="aspect-video bg-slate-100">
                      <iframe
                        src={video.embed}
                        title={`${activeRole}-video-${idx}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-bold text-slate-900">Groq Focus Challenge</h4>
              <button
                onClick={loadFocusInsight}
                disabled={focusInsightLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {focusInsightLoading ? 'Generating...' : 'Refresh with Groq'}
              </button>
            </div>

            {focusInsightError && (
              <p className="text-xs text-red-600 mb-2">{focusInsightError}</p>
            )}

            {focusInsightLoading && !focusInsight && (
              <p className="text-xs text-slate-500">Generating role-specific challenge...</p>
            )}

            {focusInsight && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{focusInsight.title}</p>
                  <p className="text-xs text-slate-600 mt-1">{focusInsight.summary}</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-800 mb-1">Implementation Task</p>
                    <p className="text-xs font-semibold text-slate-700 mb-2">{focusInsight.implementationTask?.title}</p>
                    <ol className="list-decimal pl-4 text-xs text-slate-700 space-y-1">
                      {(focusInsight.implementationTask?.steps || []).map((step, idx) => (
                        <li key={`task-step-${idx}`}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-800 mb-1">Quick Quiz</p>
                    <div className="space-y-2">
                      {(focusInsight.quiz || []).map((item, idx) => (
                        <div key={`quiz-${idx}`} className="text-xs text-slate-700">
                          <p className="font-semibold">Q{idx + 1}: {item.q}</p>
                          <p className="text-slate-600">A: {item.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {!isFocusRunning && (
        <>
      {/* ── Selectors ── */}
      <div className="card p-5 mb-4">
        <div className="flex flex-wrap gap-6 items-start">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company</p>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(COMPANY_ROLES).map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setCompany(c)
                    const newRoles = COMPANY_ROLES[c]
                    if (!newRoles.includes(role)) setRole(newRoles[0])
                    setFilterDiff('All')
                    setSearch('')
                  }}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all border-2 ${
                    company === c
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Role</p>
            <div className="flex gap-2 flex-wrap">
              {roles.map(r => {
                const rm = ROLE_META[r]
                return (
                  <button
                    key={r}
                    onClick={() => { setRole(r); setFilterDiff('All'); setSearch('') }}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all border-2 ${
                      activeRole === r
                        ? `${rm?.badge || 'bg-indigo-600'} text-white border-transparent shadow-md scale-105`
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-700'
                    }`}
                  >{r}</button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Company + Role Focus Card ── */}
      <div className="card p-5 mb-5 border-l-4 border-indigo-500">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-11 h-11 rounded-xl ${compMeta.bg} text-white font-bold text-base flex items-center justify-center flex-shrink-0`}>
            {compMeta.abbr}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-base mb-0.5">{company} — {activeRole}</p>
            <p className="text-xs text-slate-500">Topics filtered to this company + role combination.</p>
          </div>
          <div className={`px-3 py-1 rounded-full ${roleMeta.badge} text-white text-xs font-semibold flex-shrink-0`}>
            {activeRole}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {roleMeta.focus.map(f => (
            <span key={f} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">{f}</span>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-amber-500 font-bold text-xs mt-0.5 shrink-0">Role Tip</span>
            <p className="text-xs text-amber-800">{roleMeta.tip}</p>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-blue-500 font-bold text-xs mt-0.5 shrink-0">{company}</span>
            <p className="text-xs text-blue-800">{compMeta.tip}</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search topics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="field flex-1 min-w-[180px]"
        />
        <div className="flex gap-2">
          {['All','Easy','Medium','Hard'].map(d => (
            <button
              key={d}
              onClick={() => setFilterDiff(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                filterDiff === d
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >{d}</button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} topics found</span>
      </div>

      {/* ── Topic Grid ── */}
      {Object.keys(grouped).length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {Object.entries(grouped).map(([cat, items]) => {
            const cc = catColors[cat] || { header: 'bg-slate-600', border: 'border-slate-200' }
            return (
              <div key={cat} className={`card overflow-hidden border ${cc.border}`}>
                <div className={`${cc.header} px-5 py-3 flex items-center gap-2`}>
                  <h3 className="text-white font-semibold">{cat}</h3>
                  <span className="ml-auto text-white/70 text-xs">{items.length} topics</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map(t => (
                    <a
                      key={t.name}
                      href={t.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <span className="flex-1 text-sm font-medium text-slate-800 group-hover:text-indigo-700 transition-colors">{t.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diffBadge[t.difficulty]}`}>{t.difficulty}</span>
                      <span className="text-slate-300 group-hover:text-indigo-400 text-xs">→</span>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-10 text-center text-slate-400 mb-8">
          <p className="text-3xl mb-3">🔍</p>
          <p className="font-medium">No topics match your filters.</p>
          <button onClick={() => { setSearch(''); setFilterDiff('All') }} className="mt-3 text-indigo-600 text-sm hover:underline">
            Clear filters
          </button>
        </div>
      )}

      {/* ── Resources ── */}
      <div className="card p-6">
        <h2 className="text-base font-bold text-slate-900 mb-1">Resources for {activeRole}</h2>
        <p className="text-xs text-slate-500 mb-4">Handpicked links for this role at {company}.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {resources.map(r => (
            <a
              key={r.name}
              href={r.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${r.bg} text-white font-bold text-xs flex items-center justify-center flex-shrink-0`}>
                {r.abbr}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{r.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  )
}
