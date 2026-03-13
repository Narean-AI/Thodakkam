const { getDb } = require('../config/db')
const strategyAgent = require('../../../agents/strategyAgent')
const { generateFocusLearningPack } = require('../../../services/geminiService')

const analysisMemory = new Map()
const roadmapCache = new Map()
const ROADMAP_CACHE_TTL_MS = 5 * 60 * 1000

function hasExpectedWeeks(roadmap, daysRequired) {
  const expectedWeeks = Math.max(1, Math.ceil(daysRequired / 7))
  return Array.isArray(roadmap?.weeklyMilestones) && roadmap.weeklyMilestones.length === expectedWeeks
}

function toTopicKey(value = '') {
  return String(value)
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const KNOWN_COMPANIES = [
  'amazon', 'google', 'microsoft', 'meta', 'apple',
  'flipkart', 'adobe', 'zoho', 'tcs', 'infosys', 'wipro'
]

function normalizeSubjectForTarget(subject = '') {
  const raw = String(subject || '').trim()
  if (!raw) return 'General Problem Solving'

  let normalized = raw

  for (const company of KNOWN_COMPANIES) {
    const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const prefixPattern = new RegExp(`^${escaped}\\s*[-:|]\\s*`, 'i')
    const suffixPattern = new RegExp(`\\s*[-:|]\\s*${escaped}$`, 'i')
    const tokenPattern = new RegExp(`\\b${escaped}\\b`, 'gi')
    normalized = normalized
      .replace(prefixPattern, '')
      .replace(suffixPattern, '')
      .replace(tokenPattern, ' ')
  }

  normalized = normalized
    .replace(/\b(oa|online assessment|interview|mock test|test)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return toTopicKey(normalized) || 'General Problem Solving'
}

function alignTextToCompany(value = '', targetCompany = 'Amazon') {
  const text = String(value || '')
  if (!text.trim()) return text

  let aligned = text
  const target = String(targetCompany || '').trim()

  for (const company of KNOWN_COMPANIES) {
    if (target && company.toLowerCase() === target.toLowerCase()) {
      continue
    }
    const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const tokenPattern = new RegExp(`\\b${escaped}\\b`, 'gi')
    aligned = aligned.replace(tokenPattern, target || company)
  }

  return aligned.replace(/\s+/g, ' ').trim()
}

function buildScoresFromRows(rows = []) {
  const topicBucket = new Map()

  rows.forEach((row) => {
    const rawTopic = row.test_title || row.role || 'General Problem Solving'
    const topic = normalizeSubjectForTarget(rawTopic)
    const accuracy = typeof row.accuracy_percent === 'number'
      ? row.accuracy_percent
      : (row.total_questions ? Math.round(((row.score || 0) / row.total_questions) * 100) : 0)

    if (!topicBucket.has(topic)) {
      topicBucket.set(topic, { total: 0, count: 0 })
    }

    const slot = topicBucket.get(topic)
    slot.total += Number.isFinite(accuracy) ? accuracy : 0
    slot.count += 1
  })

  const scores = {}
  topicBucket.forEach((value, key) => {
    scores[key] = Math.round(value.total / Math.max(1, value.count))
  })

  return scores
}

function buildWeeklyMilestones(preparationPlan = []) {
  if (!preparationPlan.length) {
    return []
  }

  const chunks = []
  for (let index = 0; index < preparationPlan.length; index += 2) {
    const group = preparationPlan.slice(index, index + 2)
    chunks.push({
      week: chunks.length + 1,
      goal: group.join(' '),
      tests: Math.max(2, group.length * 2)
    })
  }

  return chunks
}

function normalizeTopics(topics = [], daysRequired = 30, fallbackTopics = []) {
  if (!Array.isArray(topics) || !topics.length) {
    return fallbackTopics
  }

  const normalized = topics
    .map((item, index) => {
      const day = Number.isFinite(Number(item?.day)) ? Math.max(1, Math.round(Number(item.day))) : ((index * 7) + 1)
      const endDay = Number.isFinite(Number(item?.endDay))
        ? Math.max(day, Math.round(Number(item.endDay)))
        : Math.min(daysRequired, day + 6)

      const subtopics = Array.isArray(item?.subtopics)
        ? item.subtopics.filter((value) => typeof value === 'string' && value.trim()).slice(0, 6)
        : []

      const suggestedTests = Array.isArray(item?.suggestedTests)
        ? item.suggestedTests.filter((value) => typeof value === 'string' && value.trim()).slice(0, 5)
        : []

      return {
        topic: String(item?.topic || `Topic ${index + 1}`).trim(),
        day,
        endDay: Math.min(daysRequired, endDay),
        subtopics: subtopics.length ? subtopics : ['Concept revision', 'Timed problem solving', 'Error analysis'],
        suggestedTests: suggestedTests.length ? suggestedTests : ['Topic Quiz', 'Timed Mock', 'Revision Test'],
        dailyGoal: String(item?.dailyGoal || '2-3 hours focused prep + 1 timed practice round').trim()
      }
    })
    .sort((a, b) => a.day - b.day)

  if (!normalized.length) {
    return fallbackTopics
  }

  if (normalized[0].day > 1 || normalized[normalized.length - 1].endDay < daysRequired) {
    return fallbackTopics
  }

  return normalized
}

function normalizeWeeklyMilestones({
  weeklyMilestones = [],
  topics = [],
  company,
  role,
  daysRequired = 30,
  fallbackMilestones = []
}) {
  const totalWeeks = Math.max(1, Math.ceil(daysRequired / 7))
  const valid = Array.isArray(weeklyMilestones)
    ? weeklyMilestones.filter((item) => typeof item?.goal === 'string' && item.goal.trim())
    : []

  if (!valid.length) {
    return fallbackMilestones
  }

  const topicNames = Array.isArray(topics) && topics.length
    ? topics.map((item) => item.topic).filter(Boolean)
    : ['Core Problem Solving']

  return Array.from({ length: totalWeeks }, (_, index) => {
    const source = valid[index] || valid[valid.length - 1]
    const topicName = topicNames[index % topicNames.length]
    const week = index + 1
    const tests = Number.isFinite(Number(source?.tests))
      ? Math.max(2, Math.round(Number(source.tests)))
      : 3

    let goal = String(source?.goal || '').trim()
    if (!goal) {
      goal = `${topicName}: timed ${company} ${role} drills and review.`
    }

    return { week, goal, tests }
  })
}

function buildTopicBlocks({ weakTopics = [], nextTasks = [], mockTests = [], daysRequired = 15 }) {
  const topics = weakTopics.length ? weakTopics : ['Core Problem Solving']
  const blockSize = Math.max(1, Math.floor(daysRequired / topics.length))

  return topics.map((topic, index) => {
    const startDay = (index * blockSize) + 1
    const endDay = index === topics.length - 1 ? daysRequired : Math.min(daysRequired, (index + 1) * blockSize)
    const filteredTasks = nextTasks.filter((task) => task.toLowerCase().includes(topic.toLowerCase())).slice(0, 4)
    const suggestedTests = mockTests
      .map((item) => item.title)
      .filter(Boolean)
      .slice(0, 3)

    return {
      topic,
      day: startDay,
      endDay,
      subtopics: filteredTasks.length ? filteredTasks : ['Concept revision', 'Timed problem solving', 'Error analysis'],
      suggestedTests: suggestedTests.length ? suggestedTests : ['Topic Quiz', 'Timed Mock', 'Revision Test'],
      dailyGoal: '2-3 hours focused prep + 1 timed practice round'
    }
  })
}

function buildDailyPlan({
  dailyPlan = [],
  topics = [],
  company = 'Amazon',
  role = 'Software Engineer',
  daysRequired = 30
}) {
  const getFallbackLink = (day, topic = 'interview prep') => {
    const query = encodeURIComponent(`${company} ${role} ${topic} practice day ${day}`)
    return `https://www.google.com/search?q=${query}`
  }

  const aiEntries = Array.isArray(dailyPlan)
    ? dailyPlan
        .map((item, idx) => {
          const day = Number.isFinite(Number(item?.day)) ? Math.max(1, Math.round(Number(item.day))) : idx + 1
          const focus = String(item?.focus || `Day ${day}: ${company} ${role} preparation`).trim()
          const practiceLink = /^https?:\/\//i.test(String(item?.practiceLink || '').trim())
            ? String(item.practiceLink).trim()
            : getFallbackLink(day, focus)
          return { day, focus, practiceLink }
        })
        .filter((item) => item.day >= 1 && item.day <= daysRequired)
    : []

  const topicByDay = (day) => {
    const match = topics.find((topic) => day >= topic.day && day <= topic.endDay)
    return match?.topic || `${company} ${role} interview prep`
  }

  return Array.from({ length: daysRequired }, (_, index) => {
    const day = index + 1
    const fromAi = aiEntries.find((entry) => entry.day === day)
    if (fromAi) return fromAi

    const topic = topicByDay(day)
    return {
      day,
      focus: `Day ${day}: Practice ${topic}`,
      practiceLink: getFallbackLink(day, topic)
    }
  })
}

function getDSASubtopics(subject, company, role) {
  const s = String(subject).toLowerCase()
  const c = String(company).toLowerCase()
  const r = String(role).toLowerCase()

  if (s.includes('amazon') || c === 'amazon') {
    return ['Amazon OA: array & sliding window patterns', 'BFS/DFS on grids & trees', 'Leadership Principles alignment (behavioral)', 'Two-pointer & hash map problems']
  }
  if (s.includes('google') || c === 'google') {
    return ['Google Kickstart: combinatorics & math', 'Graph BFS/DFS traversal patterns', 'String manipulation & trie problems', 'Time/space optimization strategies']
  }
  if (s.includes('microsoft') || c === 'microsoft') {
    return ['Linked list & recursion patterns', 'Binary search variations', 'String parsing & stack problems', 'System design fundamentals']
  }
  if (s.includes('meta') || c === 'meta') {
    return ['Graph & social network patterns', 'Dynamic programming (LCS, knapsack)', 'Array manipulation & prefix sums', 'Product sense & behavioral rounds']
  }
  if (s.includes('array') || s.includes('string')) {
    return [`Two-pointer & sliding window for ${company} OA`, 'Prefix sum & hash map tricks', 'In-place reversal & rotation', 'Substring, anagram & palindrome patterns']
  }
  if (s.includes('tree') || s.includes('graph')) {
    return [`BFS/DFS — ${company} interview format`, 'Topological sort & cycle detection', 'Tree DP & path problems', 'Binary search tree operations']
  }
  if (s.includes('dynamic') || s.includes('dp')) {
    return [`State machine DP (${company} style)`, 'Bottom-up tabulation strategies', 'Knapsack & interval DP', 'String DP: LCS, edit distance']
  }
  if (s.includes('sql') || s.includes('database')) {
    return ['Complex JOIN & subquery patterns', 'Window functions: RANK, ROW_NUMBER', 'Query optimization & indexing', 'Aggregation & GROUP BY mastery']
  }
  if (s.includes('system') || s.includes('design')) {
    return [`${company} distributed system patterns`, 'CAP theorem & consistency trade-offs', 'Load balancing & caching strategies', 'Microservices & API design']
  }
  if (r.includes('frontend')) {
    return ['JavaScript closures & event loop', 'React component lifecycle & hooks', 'CSS layout: flexbox & grid', 'Browser performance & rendering']
  }
  if (r.includes('data')) {
    return ['SQL window functions & CTEs', 'Pandas groupby & merge operations', 'Statistical analysis & A/B testing', 'Data pipeline design']
  }
  return [`${company} core interview patterns`, 'Algorithm time/space complexity drills', 'Edge case identification practice', `${role}-specific scenario problems`]
}

function getDSATests(subject, company, role) {
  const s = String(subject).toLowerCase()
  const c = String(company).toLowerCase()

  if (s.includes('amazon') || c === 'amazon') {
    return ['Amazon OA simulation (LeetCode medium x5)', 'Sliding window & two-sum variant set', 'BFS maze/grid timed challenge']
  }
  if (s.includes('google') || c === 'google') {
    return ['Google Kickstart practice round (30 min)', 'Graph traversal mock (10 problems)', 'String & trie challenge set']
  }
  if (s.includes('microsoft') || c === 'microsoft') {
    return ['Microsoft OA practice set (45 min)', 'Recursion & backtracking challenge', 'String manipulation timed quiz']
  }
  if (s.includes('array') || s.includes('string')) {
    return ['LeetCode Easy→Medium Array set (10Q, 45 min)', 'String manipulation timed quiz', 'Two-pointer challenge round']
  }
  if (s.includes('tree') || s.includes('graph')) {
    return ['BFS/DFS 10-problem timed set', 'Tree DP challenge round', 'Graph connectivity quiz (30 min)']
  }
  if (s.includes('dynamic') || s.includes('dp')) {
    return ['DP classics: LCS, knapsack, coin change', 'Mixed DP timed challenge (45 min)', 'State machine problems quiz']
  }
  if (s.includes('sql') || s.includes('database')) {
    return ['SQL JOIN challenge set (HackerRank)', 'Window functions quiz (10 problems)', 'Query optimization scenario test']
  }
  return [`${company} ${role} OA simulation (45 min)`, `Mixed ${subject} timed quiz (30 min)`, `Full ${company}-style mock test`]
}

function buildFallbackRoadmap({ weakSubjects, strongSubjects, overallAccuracy, avgSecondsPerQuestion, company, role, daysRequired, riskLevel, coachTasks }) {
  const subjects = weakSubjects.length
    ? weakSubjects
    : [{ subject: `${company} ${role}`, avgScore: overallAccuracy || 50, attempts: 1 }]
  const focusSubjects = subjects.slice(0, 4)
  const blockSize = Math.max(3, Math.floor(daysRequired / focusSubjects.length))

  const topics = focusSubjects.map((item, index) => {
    const topic = item.subject
    const day = index * blockSize + 1
    const endDay = index === focusSubjects.length - 1 ? daysRequired : Math.min(daysRequired, (index + 1) * blockSize)
    const hrs = item.avgScore < 50 ? '2.5-3h' : item.avgScore < 75 ? '2h' : '1.5h'
    const target = Math.min(95, item.avgScore + 20)
    const dailyGoal = `${hrs}: ${company}-style ${topic} drills (current ${item.avgScore}% → target ${target}%)`

    return {
      topic,
      day,
      endDay,
      subtopics: getDSASubtopics(topic, company, role),
      suggestedTests: getDSATests(topic, company, role),
      dailyGoal
    }
  })

  const totalWeeks = Math.max(1, Math.ceil(daysRequired / 7))
  const weeklyMilestones = Array.from({ length: totalWeeks }, (_, i) => {
    const topicItem = focusSubjects[i % focusSubjects.length] || focusSubjects[0]
    const topicName = topicItem?.subject || 'Core Problem Solving'
    const currentScore = topicItem?.avgScore || overallAccuracy || 50
    const weekTarget = Math.min(95, currentScore + 10)
    let goal
    if (i === 0) {
      goal = `Baseline assessment: complete diagnostic ${topicName} set, identify ${company} specific mistake patterns`
    } else if (i === totalWeeks - 1) {
      goal = `Final sprint: full-length ${company} ${role} mock, review all weak areas, simulate real interview conditions`
    } else {
      goal = `${topicName}: reach ${weekTarget}% accuracy on ${company}-style problems through daily timed practice`
    }
    return { week: i + 1, goal, tests: Math.max(3, topics.length + 1) }
  })

  const improvementTarget = overallAccuracy >= 75 ? 90 : overallAccuracy >= 50 ? 80 : 70
  const successCriteria = [
    `Raise overall ${company} mock accuracy from ${overallAccuracy}% → ${improvementTarget}% by Day ${daysRequired}`,
    avgSecondsPerQuestion
      ? `Reduce avg solve time from ${avgSecondsPerQuestion}s → ${Math.max(30, avgSecondsPerQuestion - 10)}s per question`
      : `Build consistent solving speed targeting under 60s per question`,
    `Complete ${Math.max(3, totalWeeks + 1)} full scored ${company} ${role} mock tests`,
    focusSubjects.length
      ? `Improve weakest areas: ${focusSubjects.map(s => `${s.subject} (${s.avgScore}%)`).join(', ')}`
      : 'Build consistent accuracy across all topics',
    riskLevel === 'HIGH'
      ? `HIGH risk detected — immediate ${company} interview topic drills required daily`
      : `Maintain ${riskLevel} risk profile with structured ${daysRequired}-day plan`
  ]

  return { topics, weeklyMilestones, successCriteria }
}

function buildRoadmapResponse({ analysis, company, role, daysRequired, mockTests, weakSubjects = [], strongSubjects = [], overallAccuracy = 0, avgSecondsPerQuestion = null }) {
  const weakTopics = analysis?.performanceAnalysis?.weakTopics || []
  const strongTopics = analysis?.performanceAnalysis?.strongTopics || []
  const riskLevel = analysis?.riskAssessment?.riskLevel || 'LOW'
  const coachTasks = analysis?.coachRecommendations?.nextTasks || []
  const preparationPlan = Array.isArray(analysis?.preparationStrategy?.preparationPlan)
    ? analysis.preparationStrategy.preparationPlan
    : []
  const strategySource = analysis?.preparationStrategy?.source || null

  // Use Gemini's structured roadmap directly if available (most accurate)
  const structuredRoadmap = analysis?.preparationStrategy?.structuredRoadmap || null

  // When Gemini fails: use data-driven fallback (not generic template)
  const fallback = buildFallbackRoadmap({
    weakSubjects,
    strongSubjects,
    overallAccuracy,
    avgSecondsPerQuestion,
    company,
    role,
    daysRequired,
    riskLevel,
    coachTasks
  })

  const topics = normalizeTopics(structuredRoadmap?.topics, daysRequired, fallback.topics)
    .map((item) => ({
      ...item,
      topic: alignTextToCompany(item.topic, company),
      dailyGoal: alignTextToCompany(item.dailyGoal, company),
      subtopics: Array.isArray(item.subtopics) ? item.subtopics.map((entry) => alignTextToCompany(entry, company)) : [],
      suggestedTests: Array.isArray(item.suggestedTests) ? item.suggestedTests.map((entry) => alignTextToCompany(entry, company)) : []
    }))

  const expectedWeeks = Math.max(1, Math.ceil(daysRequired / 7))
  const canUsePreparationPlanMilestones = preparationPlan.length >= expectedWeeks

  const weeklyMilestones = normalizeWeeklyMilestones({
    weeklyMilestones: structuredRoadmap?.weeklyMilestones,
    topics,
    company,
    role,
    daysRequired,
    fallbackMilestones: canUsePreparationPlanMilestones
      ? buildWeeklyMilestones(preparationPlan)
      : fallback.weeklyMilestones
  })

  const successCriteriaRaw = Array.isArray(structuredRoadmap?.successCriteria) && structuredRoadmap.successCriteria.length
    ? structuredRoadmap.successCriteria
    : fallback.successCriteria
  const successCriteria = successCriteriaRaw.map((item) => alignTextToCompany(item, company))
  const isAiGenerated = !!structuredRoadmap

  const alignedWeeklyMilestones = weeklyMilestones.map((item) => ({
    ...item,
    goal: alignTextToCompany(item.goal, company)
  }))

  const alignedDailyPlan = buildDailyPlan({
    dailyPlan: structuredRoadmap?.dailyPlan,
    topics,
    company,
    role,
    daysRequired
  }).map((item) => ({
    ...item,
    focus: alignTextToCompany(item.focus, company)
  }))

  return {
    company,
    selectedRole: role,
    daysRequired,
    isAiGenerated,
    goal: analysis?.goal || 'Improve student placement readiness',
    actionsTaken: analysis?.actionsTaken || [],
    riskAssessment: analysis?.riskAssessment || null,
    reasoning: analysis?.riskAssessment?.reasoning || '',
    performanceAnalysis: analysis?.performanceAnalysis || null,
    coachRecommendations: analysis?.coachRecommendations || { nextTasks: [], focusArea: 'Core Problem Solving' },
    mockInterview: analysis?.mockInterview || { questions: [] },
    successCriteria,
    weeklyMilestones: alignedWeeklyMilestones,
    topics,
    dailyPlan: alignedDailyPlan,
    suggestedMockTests: mockTests.slice(0, 5),
    generatedAt: new Date().toISOString()
  }
}

async function generatePlanForStudent({ studentId, company, role, daysRequired = 15 }) {
  const db = getDb()

  if (!studentId) {
    throw new Error('Unauthorized')
  }

  const rows = db.prepare(`
    SELECT test_title, company, role, score, total_questions, accuracy_percent, created_at
    FROM scoreboard
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(studentId)

  if (!rows.length) {
    throw new Error('No mock test data found. Complete at least one mock test first.')
  }

  const latest = rows[0] || {}
  const targetCompany = company || latest.company || 'Amazon'
  const targetRole = role || latest.role || 'Software Engineer'
  const requestedDays = Number(daysRequired)
  const normalizedDays = Number.isFinite(requestedDays)
    ? Math.max(7, Math.min(365, Math.round(requestedDays)))
    : 30

  const latestStamp = latest?.created_at || 'none'
  const cacheKey = `${studentId}:${targetCompany}:${targetRole}:${normalizedDays}:${latestStamp}`
  const cached = roadmapCache.get(cacheKey)
  if (cached && (Date.now() - cached.createdAt) < ROADMAP_CACHE_TTL_MS && hasExpectedWeeks(cached.value, normalizedDays)) {
    return {
      ...cached.value,
      cached: true,
      generatedAt: cached.value.generatedAt || new Date(cached.createdAt).toISOString()
    }
  }

  const scores = buildScoresFromRows(rows)

  // Build accurate per-subject stats to pass to strategyAgent / Gemini
  const subjectBucket = {}
  rows.forEach((row) => {
    const subject = normalizeSubjectForTarget(row.test_title || row.role || 'General Problem Solving')
    const accuracy = typeof row.accuracy_percent === 'number'
      ? row.accuracy_percent
      : (row.total_questions ? Math.round(((row.score || 0) / row.total_questions) * 100) : 0)
    if (!subjectBucket[subject]) subjectBucket[subject] = { total: 0, count: 0 }
    subjectBucket[subject].total += Number.isFinite(accuracy) ? accuracy : 0
    subjectBucket[subject].count += 1
  })
  const allSubjects = Object.entries(subjectBucket).map(([subject, d]) => ({
    subject,
    avgScore: Math.round(d.total / Math.max(1, d.count)),
    attempts: d.count
  }))
  const weakSubjects = [...allSubjects].sort((a, b) => a.avgScore - b.avgScore).slice(0, 4)
  const strongSubjects = [...allSubjects].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3)
  const overallAccuracy = allSubjects.length
    ? Math.round(allSubjects.reduce((s, x) => s + x.avgScore, 0) / allSubjects.length)
    : 0
  const avgSecondsPerQuestion = rows.some(r => r.avg_seconds_per_question)
    ? Math.round(rows.filter(r => r.avg_seconds_per_question).reduce((s, r) => s + r.avg_seconds_per_question, 0) / rows.filter(r => r.avg_seconds_per_question).length)
    : null

  const memoryKey = `${studentId}:${targetCompany}:${targetRole}`
  const previousAnalysis = analysisMemory.get(memoryKey) || null

  const weakTopics = Object.entries(scores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4)
    .map(([topic]) => topic)

  const strongTopics = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic)

  const riskLevel = overallAccuracy < 50 ? 'HIGH' : overallAccuracy < 75 ? 'MEDIUM' : 'LOW'

  const preparationStrategy = await strategyAgent({
    weakTopics,
    weakSubjects,
    strongSubjects,
    overallAccuracy,
    avgSecondsPerQuestion,
    riskLevel,
    company: targetCompany,
    role: targetRole,
    previousPlan: previousAnalysis?.preparationStrategy?.preparationPlan || null,
    daysRequired: normalizedDays
  })

  const analysis = {
    goal: 'Generate personalized roadmap using single AI strategy agent',
    actionsTaken: ['Ran strategyAgent (single AI agent)'],
    performanceAnalysis: {
      weakTopics,
      strongTopics,
      averageScore: overallAccuracy
    },
    riskAssessment: {
      riskLevel,
      reasoning: `Risk estimated from current overall accuracy (${overallAccuracy}%)`
    },
    preparationStrategy,
    coachRecommendations: {
      nextTasks: [],
      focusArea: weakTopics[0] || 'Core Problem Solving'
    },
    mockInterview: { questions: [] }
  }

  analysisMemory.set(memoryKey, analysis)

  const companyRow = db.prepare('SELECT id FROM companies WHERE LOWER(name) = ?').get(String(targetCompany).toLowerCase())
  const mockTests = companyRow
    ? db.prepare('SELECT title, content FROM mock_tests WHERE company_id = ? ORDER BY id DESC').all(companyRow.id)
    : []

  const response = buildRoadmapResponse({
    analysis,
    company: targetCompany,
    role: targetRole,
    daysRequired: normalizedDays,
    mockTests,
    weakSubjects,
    strongSubjects,
    overallAccuracy,
    avgSecondsPerQuestion
  })

  roadmapCache.set(cacheKey, { value: response, createdAt: Date.now() })
  return response
}

const aiController = {
  generateAutonomousPlan: async (req, res) => {
    try {
      const studentId = req.user?.id
      const { company, role, daysRequired = 15 } = req.body || {}

      const roadmap = await generatePlanForStudent({
        studentId,
        company,
        role,
        daysRequired
      })

      return res.json(roadmap)
    } catch (error) {
      if (error.message === 'Unauthorized') {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      if (error.message && error.message.includes('No mock test data found')) {
        return res.status(400).json({ message: error.message })
      }

      console.error(error)
      return res.status(500).json({
        message: 'Failed to generate autonomous roadmap',
        details: error.message
      })
    }
  },

  generateFocusInsight: async (req, res) => {
    try {
      const { company = 'Google', role = 'Software Engineer', topic = 'Core interview prep' } = req.body || {}

      const insight = await generateFocusLearningPack({
        company,
        role,
        topic
      })

      return res.json({
        company,
        role,
        topic,
        insight,
        generatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({
        message: 'Failed to generate focus insight',
        details: error.message
      })
    }
  }
}

module.exports = {
  ...aiController,
  generatePlanForStudent
}