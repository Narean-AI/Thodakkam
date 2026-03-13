function normalizeTopicName(topic = '') {
  return String(topic || 'Core Problem Solving').trim() || 'Core Problem Solving'
}

function getSubtopics(topic, selectedRole) {
  const label = normalizeTopicName(topic).toLowerCase()

  if (label.includes('array') || label.includes('string')) {
    return ['Pattern review', 'Edge cases', 'Timed drills', 'Mistake review']
  }

  if (label.includes('tree') || label.includes('graph')) {
    return ['Traversal patterns', 'State tracking', 'Complexity review', 'Timed practice']
  }

  if (label.includes('dynamic') || label.includes('dp')) {
    return ['State definition', 'Transitions', 'Tabulation vs memoization', 'Mixed problems']
  }

  if (label.includes('sql') || label.includes('database')) {
    return ['Schema understanding', 'Query writing', 'Optimization', 'Scenario drills']
  }

  if (label.includes('api') || label.includes('rest')) {
    return ['HTTP basics', 'Status codes', 'Authentication', 'Mini implementation']
  }

  if (selectedRole === 'Backend Engineer') {
    return ['Concept revision', 'Implementation practice', 'System thinking', 'Timed assessment']
  }

  return ['Concept revision', 'Guided practice', 'Timed questions', 'Error log review']
}

function getSuggestedTests(topic, selectedRole) {
  const label = normalizeTopicName(topic)

  if (selectedRole === 'Backend Engineer') {
    return [
      `${label} fundamentals quiz`,
      `${label} applied scenario set`,
      `${label} timed checkpoint`
    ]
  }

  return [
    `${label} basics`,
    `${label} timed mock`,
    `${label} revision checkpoint`
  ]
}

export function buildRoadmapFromStudentData(studentData, selectedRole = 'Software Engineer', daysRequired = 30) {
  const weakest = Array.isArray(studentData?.weakestSubjects) ? studentData.weakestSubjects : []
  const strongest = Array.isArray(studentData?.strongestSubjects) ? studentData.strongestSubjects : []
  const summary = studentData?.summary || {}
  const totalTests = Number(summary.totalTests || 0)
  const accuracy = Number(summary.avgScorePercentage || 0)
  const avgSeconds = summary.avgSecondsPerQuestion ? Math.round(summary.avgSecondsPerQuestion) : null
  const totalDays = Math.max(7, Math.min(365, Number(daysRequired) || 30))

  const focusSubjects = (weakest.length ? weakest : [{ subject: 'Core Problem Solving', avgScore: accuracy || 0, attempts: totalTests || 1 }])
    .slice(0, 4)

  const blockSize = Math.max(3, Math.floor(totalDays / Math.max(1, focusSubjects.length)))

  const topics = focusSubjects.map((item, index) => {
    const topic = normalizeTopicName(item.subject)
    const day = Math.min(totalDays, (index * blockSize) + 1)
    const endDay = index === focusSubjects.length - 1
      ? totalDays
      : Math.min(totalDays, (index + 1) * blockSize)

    return {
      topic,
      day,
      endDay,
      subtopics: getSubtopics(topic, selectedRole),
      suggestedTests: getSuggestedTests(topic, selectedRole),
      dailyGoal: accuracy >= 75
        ? '1.5-2 hours review + 1 timed set'
        : '2-3 hours focused practice + 1 revision set'
    }
  })

  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))
  const weeklyMilestones = Array.from({ length: totalWeeks }, (_, index) => {
    const focusTopic = topics[index % topics.length]?.topic || 'Core Problem Solving'
    let goal = `Strengthen ${focusTopic} with timed practice and review.`

    if (index === 0) {
      goal = `Stabilize fundamentals in ${focusTopic} and identify recurring mistakes.`
    } else if (index === totalWeeks - 1) {
      goal = 'Run mixed mocks, review weak patterns, and consolidate final interview readiness.'
    }

    return {
      week: index + 1,
      goal,
      tests: Math.max(2, Math.ceil((topics.length + 1) / 2))
    }
  })

  const improvementTarget = accuracy >= 75 ? 90 : accuracy >= 50 ? 80 : 70
  const strongestTopic = strongest[0]?.subject ? normalizeTopicName(strongest[0].subject) : null

  return {
    selectedRole,
    daysRequired: totalDays,
    successCriteria: [
      `Raise overall mock accuracy from ${accuracy}% to at least ${improvementTarget}%.`,
      avgSeconds ? `Reduce average solve time toward ${Math.max(30, avgSeconds - 10)}s per question while preserving accuracy.` : 'Build consistent solving speed with timed question sets.',
      `Complete at least ${Math.max(3, totalWeeks + 1)} scored mock checkpoints during this plan.`,
      `Improve the lowest-performing topics: ${focusSubjects.map((item) => normalizeTopicName(item.subject)).join(', ')}.`,
      strongestTopic ? `Maintain strength in ${strongestTopic} by revising it once every week.` : 'Keep one strong topic active each week to maintain confidence.'
    ],
    weeklyMilestones,
    topics,
    planMeta: {
      totalTests,
      currentAccuracy: accuracy,
      strongestTopic,
      focusTopics: focusSubjects.map((item) => normalizeTopicName(item.subject))
    }
  }
}