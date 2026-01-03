/**
 * Candidate Matching Algorithm
 * 
 * Semantic skill matching with alias recognition
 * Experience assessment and role fit calculation
 * 
 * Usage:
 * const matching = matchSkills(candidateSkills, jobRequired)
 * const experience = assessExperience(candidateYears, jobYears)
 * const fit = calculateRoleFit(candidate, job, matchingResults)
 */

interface SkillMatchResult {
  skill: string
  matchScore: number
  matchType: 'exact' | 'alias' | 'partial'
  confidence: number
}

interface CandidateProfile {
  name: string
  experience_years: number
  skills: string[]
  location?: string
  current_company_size?: 'startup' | 'mid' | 'large'
  employment_type?: string
}

interface JobProfile {
  title: string
  required_skills: string[]
  nice_to_have_skills?: string[]
  experience_years: number
  location?: string
  company_size?: 'startup' | 'mid' | 'large'
}

// Skill aliases mapping - aliases that should match despite different names
const SKILL_ALIASES = new Map<string, string[]>([
  // Programming Languages
  ['javascript', ['js', 'node', 'nodejs']],
  ['typescript', ['ts']],
  ['python', ['py']],
  ['csharp', ['c#', 'dotnet', '.net']],
  ['cplusplus', ['c++', 'cpp']],
  
  // Frontend
  ['react', ['reactjs']],
  ['vue', ['vuejs', 'vue.js']],
  ['angular', ['angularjs']],
  ['html', ['html5']],
  ['css', ['css3', 'scss', 'sass']],
  ['tailwind', ['tailwindcss', 'tailwind css']],
  
  // Backend
  ['nodejs', ['node', 'javascript backend']],
  ['express', ['expressjs']],
  ['django', ['djangorest']],
  ['fastapi', ['fast api']],
  ['springboot', ['spring', 'spring boot']],
  
  // Databases
  ['postgresql', ['postgres', 'psql']],
  ['mongodb', ['mongo']],
  ['mysql', ['mariadb']],
  ['redis', ['redis cache']],
  ['elasticsearch', ['elastic search']],
  
  // DevOps/Cloud
  ['aws', ['amazon web services', 'amazon aws']],
  ['azure', ['microsoft azure']],
  ['gcp', ['google cloud', 'google cloud platform']],
  ['docker', ['containerization']],
  ['kubernetes', ['k8s', 'k8']],
  ['ci/cd', ['cicd', 'continuous integration']],
  ['git', ['github', 'gitlab', 'bitbucket']],
  
  // Data
  ['sql', ['sql database', 'relational database']],
  ['nosql', ['non-relational', 'non relational']],
  ['data science', ['machine learning', 'ml', 'ai']],
  ['analytics', ['data analytics', 'business intelligence']],
  
  // Other
  ['rest api', ['api', 'restful']],
  ['graphql', ['graph ql']],
  ['microservices', ['micro services']],
  ['agile', ['scrum', 'kanban']],
  ['testing', ['unit testing', 'integration testing', 'jest', 'pytest']],
  ['design', ['ui/ux', 'ui design', 'ux design', 'figma']],
])

/**
 * Normalize skill name for matching
 * Converts to lowercase and removes special characters
 */
function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim().replace(/[^a-z0-9+\s]/g, '')
}

/**
 * Find canonical skill name from aliases
 * Returns the base skill name if found in SKILL_ALIASES
 */
function getCanonicalSkill(skill: string): string {
  const normalized = normalizeSkill(skill)
  
  for (const [canonical, aliases] of SKILL_ALIASES.entries()) {
    const canonicalNorm = normalizeSkill(canonical)
    if (canonicalNorm === normalized) {
      return canonical
    }
    
    for (const alias of aliases) {
      if (normalizeSkill(alias) === normalized) {
        return canonical
      }
    }
  }
  
  return skill // Return original if no alias found
}

/**
 * Calculate string similarity score (0-1)
 * Uses Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeSkill(str1)
  const s2 = normalizeSkill(str2)
  
  if (s1 === s2) return 1
  
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  
  if (longer.length === 0) return 1
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

/**
 * Levenshtein distance algorithm
 * Measures minimum edits needed to transform one string to another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Match candidate skills against job requirements
 * Returns matched, missing, and additional skills
 */
export function matchSkills(
  candidateSkills: string[],
  requiredSkills: string[],
  niceToHaveSkills: string[] = []
): {
  matchedSkills: string[]
  missingSkills: string[]
  additionalSkills: string[]
  matchedWithAliases: Map<string, string>
  matchPercentage: number
} {
  const matched: string[] = []
  const missing: string[] = []
  const additional: string[] = []
  const aliasMatches = new Map<string, string>()
  
  const candidateCanonical = candidateSkills.map(s => ({
    original: s,
    canonical: getCanonicalSkill(s)
  }))
  
  const requiredCanonical = requiredSkills.map(s => ({
    original: s,
    canonical: getCanonicalSkill(s)
  }))
  
  // Find matched skills
  for (const req of requiredCanonical) {
    let foundExact = false
    
    for (const cand of candidateCanonical) {
      if (cand.canonical.toLowerCase() === req.canonical.toLowerCase()) {
        if (!matched.includes(req.original)) {
          matched.push(req.original)
        }
        if (cand.original !== req.original) {
          aliasMatches.set(req.original, cand.original)
        }
        foundExact = true
        break
      }
    }
    
    // If no exact match, try partial matching
    if (!foundExact) {
      for (const cand of candidateCanonical) {
        const similarity = calculateStringSimilarity(cand.canonical, req.canonical)
        if (similarity > 0.75) {
          if (!matched.includes(req.original)) {
            matched.push(req.original)
          }
          aliasMatches.set(req.original, cand.original)
          foundExact = true
          break
        }
      }
    }
    
    if (!foundExact) {
      missing.push(req.original)
    }
  }
  
  // Find additional skills (nice to have and beyond)
  for (const cand of candidateCanonical) {
    let isRequired = false
    let isNiceToHave = false
    
    for (const req of requiredCanonical) {
      if (cand.canonical.toLowerCase() === req.canonical.toLowerCase()) {
        isRequired = true
        break
      }
    }
    
    if (!isRequired) {
      for (const nice of niceToHaveSkills) {
        if (cand.canonical.toLowerCase() === getCanonicalSkill(nice).toLowerCase()) {
          isNiceToHave = true
          break
        }
      }
    }
    
    if (!isRequired && !isNiceToHave && !additional.includes(cand.original)) {
      additional.push(cand.original)
    }
  }
  
  const matchPercentage = requiredSkills.length > 0 
    ? (matched.length / requiredSkills.length) * 100 
    : 0
  
  return {
    matchedSkills: matched,
    missingSkills: missing,
    additionalSkills: additional,
    matchedWithAliases: aliasMatches,
    matchPercentage: Math.round(matchPercentage)
  }
}

/**
 * Assess candidate's experience level
 * Returns score 0-10 and assessment
 */
export function assessExperience(
  candidateYears: number,
  requiredYears: number
): {
  score: number
  level: 'underqualified' | 'adequate' | 'overqualified'
  yearsGap: number
  assessment: string
} {
  const gap = candidateYears - requiredYears
  
  let score = 5 // baseline
  let level: 'underqualified' | 'adequate' | 'overqualified' = 'adequate'
  let assessment = ''
  
  if (gap < -2) {
    // Under 2 years short
    score = 3 + (gap + 2) * 2 // 3-5 range
    level = 'underqualified'
    assessment = `Candidate has ${candidateYears} years of experience, but role requires ${requiredYears} years. Gap of ${Math.abs(gap)} years may be trainable.`
  } else if (gap >= -2 && gap <= 2) {
    // Within 2 years
    score = Math.min(10, 6 + gap)
    level = 'adequate'
    assessment = `Candidate experience aligns well with job requirements (${candidateYears} vs ${requiredYears} years required).`
  } else if (gap > 2 && gap <= 5) {
    // 2-5 years over
    score = Math.min(10, 8 + (gap - 2) * 0.5)
    level = 'overqualified'
    assessment = `Candidate is ${gap} years overqualified. May have higher salary expectations or seek more challenging roles.`
  } else {
    // 5+ years over
    score = 9
    level = 'overqualified'
    assessment = `Candidate significantly exceeds experience requirements (${candidateYears} vs ${requiredYears} years). May be flight risk or seeking different role.`
  }
  
  return {
    score: Math.min(10, Math.max(0, score)),
    level,
    yearsGap: gap,
    assessment
  }
}

/**
 * Calculate overall role fit
 * Combines skill match, experience, and location/company size fit
 */
export function calculateRoleFit(
  candidate: CandidateProfile,
  job: JobProfile,
  skillMatch: ReturnType<typeof matchSkills>
): {
  technicalFit: number
  experienceFit: number
  culturalFit: number
  overallFit: number
  fitConfidence: number
  concerns: string[]
  strengths: string[]
} {
  const concerns: string[] = []
  const strengths: string[] = []
  
  // Technical fit (skill matching)
  const technicalFit = Math.min(10, skillMatch.matchPercentage / 10)
  
  if (skillMatch.missingSkills.length === 0) {
    strengths.push('All required technical skills are present')
  } else if (skillMatch.missingSkills.length <= 2) {
    strengths.push(`Only ${skillMatch.missingSkills.length} skill gap(s) - easily trainable`)
  } else {
    concerns.push(`Missing ${skillMatch.missingSkills.length} required skills: ${skillMatch.missingSkills.slice(0, 3).join(', ')}`)
  }
  
  // Experience fit
  const expAssessment = assessExperience(candidate.experience_years, job.experience_years)
  const experienceFit = expAssessment.score
  
  if (expAssessment.level === 'adequate') {
    strengths.push('Experience level matches job requirements')
  } else if (expAssessment.level === 'overqualified') {
    concerns.push(`Candidate is ${expAssessment.yearsGap} years overqualified - may have higher expectations`)
  } else {
    concerns.push(`Experience gap of ${Math.abs(expAssessment.yearsGap)} years - may need training`)
  }
  
  // Cultural fit (location, company size)
  let culturalFit = 5 // baseline
  
  if (candidate.location && job.location) {
    if (candidate.location.toLowerCase() === job.location.toLowerCase()) {
      culturalFit += 2
      strengths.push('Located in the same city as role')
    }
  }
  
  if (candidate.current_company_size && job.company_size) {
    if (candidate.current_company_size === job.company_size) {
      culturalFit += 1
      strengths.push('Experience matches company size preference')
    } else if (
      (candidate.current_company_size === 'startup' && job.company_size === 'mid') ||
      (candidate.current_company_size === 'mid' && job.company_size === 'large')
    ) {
      culturalFit += 0.5
      strengths.push('Experience can scale to company size')
    }
  }
  
  // Bonus skills indicate passion/growth
  if (skillMatch.additionalSkills.length > 0) {
    culturalFit += Math.min(1.5, skillMatch.additionalSkills.length * 0.3)
    strengths.push(`${skillMatch.additionalSkills.length} additional technical skill(s) beyond requirements`)
  }
  
  culturalFit = Math.min(10, culturalFit)
  
  // Calculate overall fit as weighted average
  const overallFit = (technicalFit * 0.5 + experienceFit * 0.3 + culturalFit * 0.2)
  
  // Confidence decreases if concerns exist
  let fitConfidence = 85
  if (concerns.length > 0) fitConfidence -= concerns.length * 10
  if (skillMatch.missingSkills.length > 0) fitConfidence -= skillMatch.missingSkills.length * 5
  fitConfidence = Math.max(20, fitConfidence)
  
  return {
    technicalFit: Math.min(10, Math.max(0, technicalFit)),
    experienceFit: Math.min(10, Math.max(0, experienceFit)),
    culturalFit: Math.min(10, Math.max(0, culturalFit)),
    overallFit: Math.min(10, Math.max(0, overallFit)),
    fitConfidence,
    concerns,
    strengths
  }
}

/**
 * Identify specific concerns for hiring manager
 * Based on candidate profile and job requirements
 */
export function identifyConcerns(
  candidate: CandidateProfile,
  job: JobProfile,
  skillMatch: ReturnType<typeof matchSkills>,
  roleFit: ReturnType<typeof calculateRoleFit>
): string[] {
  const concerns: string[] = [...roleFit.concerns]
  
  // Check for red flags
  if (skillMatch.missingSkills.length > 3) {
    concerns.push(`Multiple skill gaps (${skillMatch.missingSkills.length}) may extend onboarding time`)
  }
  
  const expGap = candidate.experience_years - job.experience_years
  if (expGap < -3) {
    concerns.push('Significant experience gap - may need significant mentoring')
  }
  
  // Check employment history (if available)
  if (candidate.employment_type && candidate.employment_type === 'contract') {
    concerns.push('Currently on contract - may have limited availability for onboarding')
  }
  
  return [...new Set(concerns)] // Remove duplicates
}

/**
 * Identify key strengths to highlight
 */
export function identifyStrengths(
  candidate: CandidateProfile,
  job: JobProfile,
  skillMatch: ReturnType<typeof matchSkills>,
  roleFit: ReturnType<typeof calculateRoleFit>
): string[] {
  const strengths: string[] = [...roleFit.strengths]
  
  // Additional strength indicators
  if (skillMatch.matchPercentage === 100) {
    strengths.unshift('Perfect technical skill match - 100% of required skills present')
  }
  
  if (skillMatch.additionalSkills.length >= 3) {
    strengths.push(`Brings ${skillMatch.additionalSkills.length} additional valuable skills beyond requirements`)
  }
  
  if (candidate.experience_years > job.experience_years) {
    strengths.push(`${candidate.experience_years} years of experience exceeds ${job.experience_years} year requirement`)
  }
  
  return [...new Set(strengths)] // Remove duplicates
}

/**
 * Generate a comprehensive match report
 */
export function generateMatchReport(
  candidate: CandidateProfile,
  job: JobProfile,
  skillMatch: ReturnType<typeof matchSkills>,
  roleFit: ReturnType<typeof calculateRoleFit>
) {
  return {
    candidateName: candidate.name,
    jobTitle: job.title,
    skillMatch,
    roleFit,
    concerns: identifyConcerns(candidate, job, skillMatch, roleFit),
    strengths: identifyStrengths(candidate, job, skillMatch, roleFit),
    matchScore: Math.round(roleFit.overallFit * 10), // 0-100
    fitConfidence: roleFit.fitConfidence
  }
}
