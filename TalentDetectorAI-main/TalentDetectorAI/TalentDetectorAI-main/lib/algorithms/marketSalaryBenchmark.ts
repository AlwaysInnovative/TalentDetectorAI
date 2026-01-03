/**
 * Market Salary Benchmark Algorithm
 * 
 * Calculates market-based salary ranges using:
 * - Role & location base salary
 * - Experience multipliers
 * - Match score adjustments
 * - Commission calculations
 * 
 * Usage:
 * const salaryBand = calculateSalaryBand(role, location, experience, matchScore)
 * const commission = calculateCommission(salaryBand, commissionRate)
 */

interface SalaryBandData {
  currency: string
  floor: number
  target: number
  stretch: number
  confidence: number
  demand_level: 'high' | 'medium' | 'low'
  market_trend: 'upward' | 'stable' | 'downward'
}

interface CommissionData {
  percentage: number
  estimated_fee: number
  salary_base: number
  currency: string
}

/**
 * Market data by role, location, and experience level
 * Base data for salary calculations (in INR for India, GBP for UK)
 */
const MARKET_DATA = {
  'software engineer': {
    'bangalore': {
      junior: { floor: 600000, target: 900000, stretch: 1200000 },
      mid: { floor: 1000000, target: 1500000, stretch: 2000000 },
      senior: { floor: 1800000, target: 2500000, stretch: 3500000 }
    },
    'delhi': {
      junior: { floor: 550000, target: 850000, stretch: 1100000 },
      mid: { floor: 900000, target: 1400000, stretch: 1900000 },
      senior: { floor: 1700000, target: 2400000, stretch: 3300000 }
    },
    'mumbai': {
      junior: { floor: 620000, target: 920000, stretch: 1250000 },
      mid: { floor: 1050000, target: 1600000, stretch: 2100000 },
      senior: { floor: 1900000, target: 2600000, stretch: 3600000 }
    },
    'pune': {
      junior: { floor: 580000, target: 880000, stretch: 1150000 },
      mid: { floor: 950000, target: 1450000, stretch: 1950000 },
      senior: { floor: 1750000, target: 2450000, stretch: 3400000 }
    },
    'london': {
      junior: { floor: 35000, target: 50000, stretch: 65000 },
      mid: { floor: 55000, target: 75000, stretch: 95000 },
      senior: { floor: 90000, target: 120000, stretch: 150000 }
    },
    'san francisco': {
      junior: { floor: 110000, target: 150000, stretch: 190000 },
      mid: { floor: 160000, target: 220000, stretch: 280000 },
      senior: { floor: 240000, target: 320000, stretch: 420000 }
    }
  },
  
  'product manager': {
    'bangalore': {
      junior: { floor: 700000, target: 1000000, stretch: 1350000 },
      mid: { floor: 1200000, target: 1800000, stretch: 2400000 },
      senior: { floor: 2100000, target: 3000000, stretch: 4200000 }
    },
    'delhi': {
      junior: { floor: 650000, target: 950000, stretch: 1250000 },
      mid: { floor: 1100000, target: 1700000, stretch: 2250000 },
      senior: { floor: 1950000, target: 2800000, stretch: 3900000 }
    },
    'london': {
      junior: { floor: 45000, target: 60000, stretch: 75000 },
      mid: { floor: 70000, target: 95000, stretch: 120000 },
      senior: { floor: 110000, target: 150000, stretch: 190000 }
    }
  },
  
  'data scientist': {
    'bangalore': {
      junior: { floor: 650000, target: 950000, stretch: 1300000 },
      mid: { floor: 1100000, target: 1700000, stretch: 2350000 },
      senior: { floor: 2000000, target: 2900000, stretch: 4100000 }
    },
    'delhi': {
      junior: { floor: 600000, target: 900000, stretch: 1200000 },
      mid: { floor: 1000000, target: 1600000, stretch: 2200000 },
      senior: { floor: 1850000, target: 2700000, stretch: 3850000 }
    },
    'london': {
      junior: { floor: 40000, target: 55000, stretch: 70000 },
      mid: { floor: 65000, target: 85000, stretch: 105000 },
      senior: { floor: 100000, target: 140000, stretch: 180000 }
    }
  },
  
  'devops engineer': {
    'bangalore': {
      junior: { floor: 700000, target: 1000000, stretch: 1350000 },
      mid: { floor: 1200000, target: 1800000, stretch: 2450000 },
      senior: { floor: 2100000, target: 3000000, stretch: 4200000 }
    },
    'delhi': {
      junior: { floor: 650000, target: 950000, stretch: 1250000 },
      mid: { floor: 1100000, target: 1700000, stretch: 2300000 },
      senior: { floor: 1950000, target: 2850000, stretch: 3950000 }
    }
  },
  
  'qa engineer': {
    'bangalore': {
      junior: { floor: 500000, target: 750000, stretch: 1000000 },
      mid: { floor: 850000, target: 1250000, stretch: 1700000 },
      senior: { floor: 1400000, target: 2000000, stretch: 2800000 }
    },
    'delhi': {
      junior: { floor: 450000, target: 700000, stretch: 950000 },
      mid: { floor: 800000, target: 1200000, stretch: 1600000 },
      senior: { floor: 1300000, target: 1900000, stretch: 2700000 }
    }
  },
  
  'ui/ux designer': {
    'bangalore': {
      junior: { floor: 500000, target: 750000, stretch: 1000000 },
      mid: { floor: 900000, target: 1350000, stretch: 1800000 },
      senior: { floor: 1600000, target: 2300000, stretch: 3200000 }
    },
    'delhi': {
      junior: { floor: 450000, target: 700000, stretch: 950000 },
      mid: { floor: 850000, target: 1300000, stretch: 1700000 },
      senior: { floor: 1500000, target: 2200000, stretch: 3100000 }
    }
  }
}

/**
 * Location multipliers for salary adjustments
 * Tier 1 metros have higher multipliers
 */
const LOCATION_MULTIPLIERS: Record<string, number> = {
  'bangalore': 1.0,
  'delhi': 0.95,
  'mumbai': 1.05,
  'pune': 0.92,
  'hyderabad': 0.9,
  'gurgaon': 1.02,
  'noida': 0.93,
  'london': 1.0,
  'san francisco': 1.3,
  'new york': 1.25,
  'seattle': 1.15,
  'austin': 1.05,
  'toronto': 0.9,
  'sydney': 0.95
}

/**
 * Experience level mapping
 * Determines salary range based on years of experience
 */
function getExperienceLevel(years: number): 'junior' | 'mid' | 'senior' {
  if (years < 2) return 'junior'
  if (years < 6) return 'mid'
  return 'senior'
}

/**
 * Get base salary band for a role and location
 */
function getBaseSalaryBand(
  roleTitle: string,
  location: string
): { floor: number; target: number; stretch: number } | null {
  const normalizedRole = roleTitle.toLowerCase()
  const normalizedLocation = location.toLowerCase()
  
  // Find matching role
  for (const [role, locations] of Object.entries(MARKET_DATA)) {
    if (normalizedRole.includes(role) || role.includes(normalizedRole)) {
      const roleData = locations as Record<string, any>
      
      // Find matching location
      for (const [loc, salaries] of Object.entries(roleData)) {
        if (
          normalizedLocation.includes(loc.replace(/\s+/g, '')) ||
          loc.toLowerCase().includes(normalizedLocation.replace(/\s+/g, ''))
        ) {
          // Return average of all experience levels as base
          const junior = salaries.junior
          const mid = salaries.mid
          const senior = salaries.senior
          
          return {
            floor: Math.round((junior.floor + mid.floor) / 2),
            target: Math.round((mid.target + senior.target) / 2),
            stretch: Math.round((mid.stretch + senior.stretch) / 2)
          }
        }
      }
    }
  }
  
  return null
}

/**
 * Calculate salary multiplier based on experience match
 */
function getExperienceMultiplier(candidateYears: number, requiredYears: number): number {
  const gap = candidateYears - requiredYears
  
  if (gap < -3) return 0.75 // Significantly under
  if (gap < -1) return 0.85 // Somewhat under
  if (gap <= 2) return 1.0 // Match
  if (gap <= 5) return 1.15 // Somewhat over
  return 1.25 // Significantly over
}

/**
 * Calculate salary multiplier based on match score
 */
function getMatchScoreMultiplier(matchScore: number): number {
  // Scale 0-100 match score to 0.8-1.2 multiplier
  return 0.8 + (matchScore / 100) * 0.4
}

/**
 * Calculate market-based salary band
 */
export function calculateSalaryBand(
  roleTitle: string,
  location: string,
  candidateYears: number,
  requiredYears: number,
  matchScore: number,
  currency: string = '₹'
): SalaryBandData {
  // Get base salary band
  let baseBand = getBaseSalaryBand(roleTitle, location)
  
  // Fallback if role/location not found
  if (!baseBand) {
    baseBand = {
      floor: currency === '₹' ? 1000000 : 60000,
      target: currency === '₹' ? 1500000 : 85000,
      stretch: currency === '₹' ? 2200000 : 120000
    }
  }
  
  // Apply multipliers
  const experienceMultiplier = getExperienceMultiplier(candidateYears, requiredYears)
  const matchMultiplier = getMatchScoreMultiplier(matchScore)
  const locationMultiplier = LOCATION_MULTIPLIERS[location.toLowerCase()] || 1.0
  
  // Calculate final band
  const totalMultiplier = experienceMultiplier * matchMultiplier * locationMultiplier
  
  const floor = Math.round(baseBand.floor * totalMultiplier)
  const target = Math.round(baseBand.target * totalMultiplier)
  const stretch = Math.round(baseBand.stretch * totalMultiplier)
  
  // Determine demand level (simplified - in real scenario use market data)
  const demandLevel = matchScore > 80 ? 'high' : matchScore > 60 ? 'medium' : 'low'
  
  // Determine market trend (simplified)
  const marketTrend = candidateYears > requiredYears ? 'upward' : 'stable'
  
  return {
    currency,
    floor,
    target,
    stretch,
    confidence: Math.min(95, 70 + matchScore / 10),
    demand_level: demandLevel,
    market_trend: marketTrend
  }
}

/**
 * Calculate commission based on salary band
 */
export function calculateCommission(
  salaryBand: SalaryBandData,
  commissionPercentage: number = 20
): CommissionData {
  const salary_base = salaryBand.target
  const estimated_fee = Math.round((salary_base * commissionPercentage) / 100)
  
  return {
    percentage: commissionPercentage,
    estimated_fee,
    salary_base,
    currency: salaryBand.currency
  }
}

/**
 * Format salary for display
 * Converts to human-readable format (e.g., ₹12.5L, $150K)
 */
export function formatSalary(amount: number, currency: string = '₹'): string {
  if (currency === '₹') {
    // Indian numbering system
    if (amount >= 10000000) {
      return `${currency}${(amount / 10000000).toFixed(1)}Cr`
    }
    return `${currency}${(amount / 100000).toFixed(1)}L`
  } else {
    // Western numbering system
    if (amount >= 1000000) {
      return `${currency}${(amount / 1000000).toFixed(1)}M`
    }
    return `${currency}${(amount / 1000).toFixed(0)}K`
  }
}

/**
 * Get salary recommendation text for hiring manager
 */
export function getSalaryRecommendation(
  salaryBand: SalaryBandData,
  commission: CommissionData
): string {
  const floor = formatSalary(salaryBand.floor, salaryBand.currency)
  const target = formatSalary(salaryBand.target, salaryBand.currency)
  const stretch = formatSalary(salaryBand.stretch, salaryBand.currency)
  const commFee = formatSalary(commission.estimated_fee, salaryBand.currency)
  const confidence = Math.round(salaryBand.confidence)
  
  return `Based on market analysis (${confidence}% confidence), recommend salary in the range of ${floor} to ${target} (stretch to ${stretch}). Estimated recruitment fee: ${commFee}.`
}

/**
 * Compare salary band with market data
 */
export function compareSalaryWithMarket(
  salaryBand: SalaryBandData,
  proposedSalary: number
): { isCompetitive: boolean; delta: number; recommendation: string } {
  const delta = proposedSalary - salaryBand.target
  const deltaPercent = (delta / salaryBand.target) * 100
  
  let isCompetitive = false
  let recommendation = ''
  
  if (delta < -200000) {
    recommendation = `Proposed salary is ${Math.abs(deltaPercent).toFixed(1)}% below market. Risk of candidate rejection.`
  } else if (delta < 0) {
    recommendation = `Proposed salary is ${Math.abs(deltaPercent).toFixed(1)}% below market recommendation, but within acceptable range.`
    isCompetitive = true
  } else if (delta <= 300000) {
    recommendation = `Proposed salary is competitive and aligns with market data.`
    isCompetitive = true
  } else {
    recommendation = `Proposed salary is ${deltaPercent.toFixed(1)}% above market. Ensure budget allows.`
    isCompetitive = true
  }
  
  return { isCompetitive, delta, recommendation }
}

/**
 * Generate salary analysis report
 */
export function generateSalaryAnalysis(
  roleTitle: string,
  location: string,
  candidateYears: number,
  requiredYears: number,
  matchScore: number,
  commissionRate: number = 20,
  currency: string = '₹'
) {
  const salaryBand = calculateSalaryBand(
    roleTitle,
    location,
    candidateYears,
    requiredYears,
    matchScore,
    currency
  )
  
  const commission = calculateCommission(salaryBand, commissionRate)
  const recommendation = getSalaryRecommendation(salaryBand, commission)
  
  return {
    salaryBand,
    commission,
    recommendation,
    formattedFloor: formatSalary(salaryBand.floor, currency),
    formattedTarget: formatSalary(salaryBand.target, currency),
    formattedStretch: formatSalary(salaryBand.stretch, currency),
    formattedFee: formatSalary(commission.estimated_fee, currency)
  }
}
