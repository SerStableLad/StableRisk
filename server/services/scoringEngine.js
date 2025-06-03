/**
 * Calculate the overall risk score based on all factors
 * @param {Object} data - All collected data for the stablecoin
 * @returns {Object} - Complete risk report with scores
 */
export function calculateRiskScore(data) {
  const {
    coinInfo,
    githubData,
    auditHistory,
    pegEvents,
    transparencyScore,
    liquidityData
  } = data;
  
  // Calculate individual factor scores
  const auditScore = calculateAuditScore(auditHistory, githubData);
  const pegStabilityScore = calculatePegStabilityScore(pegEvents);
  const transparencyFactor = calculateTransparencyScore(transparencyScore, coinInfo);
  const oracleScore = calculateOracleScore(githubData);
  const liquidityScore = calculateLiquidityScore(liquidityData);
  
  // Calculate weighted average for total score
  // Weights should sum to 1
  const weights = {
    auditHistory: 0.25,
    pegStability: 0.25,
    transparency: 0.2,
    oracleSetup: 0.15,
    liquidity: 0.15
  };
  
  const totalScore = (
    auditScore.score * weights.auditHistory +
    pegStabilityScore.score * weights.pegStability +
    transparencyFactor.score * weights.transparency +
    oracleScore.score * weights.oracleSetup +
    liquidityScore.score * weights.liquidity
  );
  
  // Generate risk summary based on total score
  const summary = generateRiskSummary(
    coinInfo.name,
    totalScore,
    {
      auditScore,
      pegStabilityScore,
      transparencyFactor,
      oracleScore,
      liquidityScore
    }
  );
  
  // Return complete risk report
  return {
    coinInfo,
    totalScore,
    summary,
    factors: {
      auditHistory: auditScore,
      pegStability: pegStabilityScore,
      transparency: transparencyFactor,
      oracleSetup: oracleScore,
      liquidity: liquidityScore
    },
    pegEvents,
    auditHistory,
    liquidityData
  };
}

/**
 * Calculate audit history score
 */
function calculateAuditScore(auditHistory, githubData) {
  // Base score considering number and recency of audits
  let score = 2.5; // Starting neutral score
  
  // Boost score based on number of audits
  if (auditHistory.length >= 4) {
    score += 0.75;
  } else if (auditHistory.length >= 2) {
    score += 0.5;
  } else if (auditHistory.length === 1) {
    score += 0.25;
  } else {
    score -= 1.0; // Penalize for no audits
  }
  
  // Check for recent audits (within last year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const recentAudits = auditHistory.filter(audit => 
    new Date(audit.date) >= oneYearAgo
  );
  
  if (recentAudits.length >= 2) {
    score += 0.75;
  } else if (recentAudits.length === 1) {
    score += 0.5;
  }
  
  // Penalize for critical/high issues
  const criticalIssues = auditHistory.reduce((sum, audit) => 
    sum + audit.issues.critical, 0
  );
  
  const highIssues = auditHistory.reduce((sum, audit) => 
    sum + audit.issues.high, 0
  );
  
  if (criticalIssues > 0) {
    score -= 0.5 * criticalIssues;
  }
  
  if (highIssues > 2) {
    score -= 0.25 * (highIssues - 2);
  }
  
  // Consider GitHub activity
  if (githubData && githubData.recentCommits > 20) {
    score += 0.25;
  }
  
  // Cap score between 0-5
  score = Math.max(0, Math.min(5, score));
  
  return {
    name: 'Audit History',
    score,
    description: getAuditDescription(score),
    details: generateAuditDetails(auditHistory, score)
  };
}

/**
 * Calculate peg stability score
 */
function calculatePegStabilityScore(pegEvents) {
  // Base score
  let score = 3.0;
  
  // Calculate maximum deviation from peg
  const maxDeviation = pegEvents.reduce((max, event) => {
    const deviation = Math.abs((event.price - 1.0) / 1.0 * 100);
    return deviation > max ? deviation : max;
  }, 0);
  
  // Calculate average deviation
  const avgDeviation = pegEvents.reduce((sum, event) => {
    return sum + Math.abs((event.price - 1.0) / 1.0 * 100);
  }, 0) / pegEvents.length;
  
  // Count significant depeg events (>5% deviation)
  const depegEvents = pegEvents.filter(event => 
    Math.abs((event.price - 1.0) / 1.0 * 100) > 5
  ).length;
  
  // Score adjustments based on metrics
  if (maxDeviation < 1) {
    score += 1.5;
  } else if (maxDeviation < 3) {
    score += 1.0;
  } else if (maxDeviation < 5) {
    score += 0.5;
  } else if (maxDeviation > 10) {
    score -= 1.0;
  } else if (maxDeviation > 5) {
    score -= 0.5;
  }
  
  if (avgDeviation < 0.5) {
    score += 0.5;
  } else if (avgDeviation > 2) {
    score -= 0.5;
  }
  
  if (depegEvents === 0) {
    score += 0.5;
  } else {
    score -= 0.5 * depegEvents;
  }
  
  // Cap score between 0-5
  score = Math.max(0, Math.min(5, score));
  
  return {
    name: 'Peg Stability',
    score,
    description: getPegStabilityDescription(score),
    details: generatePegStabilityDetails(pegEvents, maxDeviation, avgDeviation)
  };
}

/**
 * Calculate transparency score
 */
function calculateTransparencyScore(transparencyScore, coinInfo) {
  // Base score incorporating the transparency analysis
  let score = transparencyScore.score;
  
  // Adjust based on website quality and available information
  if (transparencyScore.hasReservesDashboard) {
    score += 0.5;
  }
  
  if (transparencyScore.hasRegularReporting) {
    score += 0.5;
  }
  
  if (!transparencyScore.hasTransparencyPage) {
    score -= 1.0;
  }
  
  // Consider collateral type in transparency expectations
  if (coinInfo.collateralType === 'Fiat-backed' && score < 3) {
    score -= 0.5; // Higher expectations for fiat-backed
  }
  
  if (coinInfo.collateralType === 'Algorithmic' && score > 2) {
    score += 0.25; // Lower expectations for algorithmic
  }
  
  // Cap score between 0-5
  score = Math.max(0, Math.min(5, score));
  
  return {
    name: 'Transparency',
    score,
    description: getTransparencyDescription(score),
    details: transparencyScore.details
  };
}

/**
 * Calculate oracle setup score
 */
function calculateOracleScore(githubData) {
  // Base score
  let score = 2.5;
  
  if (!githubData || !githubData.oracleInfo) {
    // If no GitHub data is available, use a lower default score
    score = 2.0;
    
    return {
      name: 'Oracle Setup',
      score,
      description: 'Limited information available about oracle implementation',
      details: [
        'No public oracle implementation details found',
        'Unable to assess oracle security features',
        'Consider relying on third-party oracle audits for this stablecoin'
      ]
    };
  }
  
  const { oracleInfo } = githubData;
  
  // Score adjustments based on oracle implementation
  if (oracleInfo.usesChainlink) {
    score += 0.75; // Chainlink is considered reliable
  }
  
  if (oracleInfo.hasMultipleOracles) {
    score += 0.75; // Multiple oracles provide redundancy
  }
  
  if (oracleInfo.hasTimelock) {
    score += 0.5; // Timelock adds security
  }
  
  if (oracleInfo.hasPriceDeviation) {
    score += 0.5; // Price deviation checks
  }
  
  if (oracleInfo.centralizedOracle) {
    score -= 1.0; // Penalize centralized oracles
  }
  
  // Cap score between 0-5
  score = Math.max(0, Math.min(5, score));
  
  return {
    name: 'Oracle Setup',
    score,
    description: getOracleDescription(score),
    details: generateOracleDetails(oracleInfo)
  };
}

/**
 * Calculate liquidity score
 */
function calculateLiquidityScore(liquidityData) {
  // Base score
  let score = 2.5;
  
  // Calculate total liquidity
  const totalLiquidity = liquidityData.reduce((sum, item) => 
    sum + item.amount, 0
  );
  
  // Calculate liquidity concentration (top chain percentage)
  const topChainLiquidity = liquidityData.length > 0 
    ? Math.max(...liquidityData.map(item => item.amount)) 
    : 0;
  
  const topChainPercentage = totalLiquidity > 0 
    ? (topChainLiquidity / totalLiquidity) * 100 
    : 0;
  
  // Score adjustments based on total liquidity
  if (totalLiquidity >= 5e9) { // $5B+
    score += 1.5;
  } else if (totalLiquidity >= 1e9) { // $1B+
    score += 1.0;
  } else if (totalLiquidity >= 500e6) { // $500M+
    score += 0.5;
  } else if (totalLiquidity < 100e6) { // Below $100M
    score -= 0.5;
  } else if (totalLiquidity < 10e6) { // Below $10M
    score -= 1.0;
  }
  
  // Score adjustments based on chain diversity
  if (liquidityData.length >= 5) {
    score += 0.5;
  } else if (liquidityData.length <= 1) {
    score -= 0.5;
  }
  
  // Penalize high concentration
  if (topChainPercentage > 90) {
    score -= 0.75;
  } else if (topChainPercentage > 75) {
    score -= 0.5;
  } else if (topChainPercentage < 50) {
    score += 0.5; // Well distributed
  }
  
  // Cap score between 0-5
  score = Math.max(0, Math.min(5, score));
  
  return {
    name: 'Liquidity Depth',
    score,
    description: getLiquidityDescription(score),
    details: generateLiquidityDetails(liquidityData, totalLiquidity, topChainPercentage)
  };
}

/**
 * Generate overall risk summary
 */
function generateRiskSummary(name, totalScore, factors) {
  let riskLevel = '';
  
  if (totalScore >= 4) {
    riskLevel = 'low-risk';
  } else if (totalScore >= 3) {
    riskLevel = 'moderately low-risk';
  } else if (totalScore >= 2) {
    riskLevel = 'moderate-risk';
  } else {
    riskLevel = 'high-risk';
  }
  
  // Identify top strengths and weaknesses
  const factorScores = [
    { name: 'audit history', score: factors.auditScore.score },
    { name: 'peg stability', score: factors.pegStabilityScore.score },
    { name: 'transparency', score: factors.transparencyFactor.score },
    { name: 'oracle setup', score: factors.oracleScore.score },
    { name: 'liquidity', score: factors.liquidityScore.score }
  ];
  
  factorScores.sort((a, b) => b.score - a.score);
  
  const strengths = factorScores.slice(0, 2).map(f => f.name);
  
  factorScores.sort((a, b) => a.score - b.score);
  
  const weaknesses = factorScores.slice(0, 1).map(f => f.name);
  
  return `${name} is a ${riskLevel} stablecoin with strong ${strengths.join(' and ')}. ${weaknesses.length > 0 ? `Its key challenge is in its ${weaknesses.join(' and ')}.` : ''} ${generateAdditionalCommentary(totalScore)}`;
}

/**
 * Generate additional commentary based on overall score
 */
function generateAdditionalCommentary(score) {
  if (score >= 4.5) {
    return 'It demonstrates excellent risk management practices across all evaluated factors.';
  } else if (score >= 4) {
    return 'It shows strong risk management with minor areas for improvement.';
  } else if (score >= 3.5) {
    return 'It maintains good risk management with some notable areas for improvement.';
  } else if (score >= 3) {
    return 'It has adequate risk management with several significant areas that could be strengthened.';
  } else if (score >= 2.5) {
    return 'It shows concerning risk factors that warrant careful consideration.';
  } else if (score >= 2) {
    return 'It has substantial risk factors that should be evaluated carefully before use.';
  } else {
    return 'It has critical risk factors that suggest extreme caution is warranted.';
  }
}

// Helper functions for descriptions and details
function getAuditDescription(score) {
  if (score >= 4.5) return 'Excellent audit history with minimal findings';
  if (score >= 4) return 'Strong audit history with few significant findings';
  if (score >= 3.5) return 'Good audit history with some resolved issues';
  if (score >= 3) return 'Adequate audit history with several findings';
  if (score >= 2.5) return 'Mixed audit history with notable concerns';
  if (score >= 2) return 'Limited audit history with significant findings';
  if (score >= 1) return 'Poor audit history with critical issues';
  return 'No verifiable audit history';
}

function getPegStabilityDescription(score) {
  if (score >= 4.5) return 'Exceptional stability with minimal deviation from peg';
  if (score >= 4) return 'Excellent stability with minimal deviation from peg';
  if (score >= 3.5) return 'Very good stability with occasional minor deviations';
  if (score >= 3) return 'Good stability with manageable deviations';
  if (score >= 2.5) return 'Moderate stability with notable historical deviations';
  if (score >= 2) return 'Fair stability with significant historical deviations';
  if (score >= 1) return 'Poor stability with frequent deviations from peg';
  return 'Very unstable with severe historical depegging events';
}

function getTransparencyDescription(score) {
  if (score >= 4.5) return 'Industry-leading transparency with comprehensive disclosures';
  if (score >= 4) return 'Excellent transparency with detailed disclosures';
  if (score >= 3.5) return 'Very good transparency with regular disclosures';
  if (score >= 3) return 'Good transparency with adequate disclosures';
  if (score >= 2.5) return 'Moderate transparency with some disclosure gaps';
  if (score >= 2) return 'Limited transparency with significant disclosure gaps';
  if (score >= 1) return 'Poor transparency with minimal disclosures';
  return 'Severely lacking transparency with no meaningful disclosures';
}

function getOracleDescription(score) {
  if (score >= 4.5) return 'Exceptional oracle implementation with multiple safeguards';
  if (score >= 4) return 'Excellent oracle implementation with strong security';
  if (score >= 3.5) return 'Very good oracle setup with adequate safeguards';
  if (score >= 3) return 'Good oracle implementation with basic security measures';
  if (score >= 2.5) return 'Moderate oracle setup with some centralization';
  if (score >= 2) return 'Basic oracle implementation with centralization concerns';
  if (score >= 1) return 'Concerning oracle setup with significant vulnerabilities';
  return 'Highly vulnerable or undisclosed oracle implementation';
}

function getLiquidityDescription(score) {
  if (score >= 4.5) return 'Exceptional liquidity across multiple chains';
  if (score >= 4) return 'Excellent liquidity across multiple chains';
  if (score >= 3.5) return 'Very good liquidity with good distribution';
  if (score >= 3) return 'Good liquidity across major platforms';
  if (score >= 2.5) return 'Moderate liquidity with some concentration';
  if (score >= 2) return 'Limited liquidity with significant concentration';
  if (score >= 1) return 'Poor liquidity across most platforms';
  return 'Very low liquidity presenting significant trading risks';
}

function generateAuditDetails(auditHistory, score) {
  const details = [];
  
  if (auditHistory.length === 0) {
    details.push('No public audits found');
    details.push('Consider requesting audit information from the team');
    return details;
  }
  
  // Recent audit information
  const sortedAudits = [...auditHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const recentAudit = sortedAudits[0];
  details.push(`Most recent audit by ${recentAudit.firm} on ${new Date(recentAudit.date).toLocaleDateString()}`);
  
  // Count total issues
  const totalIssues = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  
  auditHistory.forEach(audit => {
    totalIssues.critical += audit.issues.critical;
    totalIssues.high += audit.issues.high;
    totalIssues.medium += audit.issues.medium;
    totalIssues.low += audit.issues.low;
  });
  
  if (totalIssues.critical > 0) {
    details.push(`${totalIssues.critical} critical issues identified across all audits`);
  }
  
  if (totalIssues.high > 0) {
    details.push(`${totalIssues.high} high severity issues identified across all audits`);
  }
  
  // Audit frequency
  details.push(`${auditHistory.length} audits conducted in total`);
  
  // Additional context based on score
  if (score >= 4) {
    details.push('Strong security practices demonstrated through regular audits');
  } else if (score <= 2.5) {
    details.push('Audit frequency and coverage could be improved');
  }
  
  return details;
}

function generatePegStabilityDetails(pegEvents, maxDeviation, avgDeviation) {
  const details = [];
  
  details.push(`Maximum historical deviation of ${maxDeviation.toFixed(2)}% from peg`);
  details.push(`Average deviation of ${avgDeviation.toFixed(2)}% from peg`);
  
  // Count significant depeg events
  const depegEvents = pegEvents.filter(event => 
    Math.abs((event.price - 1.0) / 1.0 * 100) > 5
  );
  
  details.push(`${depegEvents.length} significant depeg events (>5% deviation)`);
  
  if (depegEvents.length > 0) {
    const worstEvent = depegEvents.reduce((worst, current) => {
      const worstDev = Math.abs((worst.price - 1.0) / 1.0 * 100);
      const currentDev = Math.abs((current.price - 1.0) / 1.0 * 100);
      return currentDev > worstDev ? current : worst;
    }, depegEvents[0]);
    
    details.push(`Worst depeg event: ${new Date(worstEvent.date).toLocaleDateString()} with ${Math.abs((worstEvent.price - 1.0) / 1.0 * 100).toFixed(2)}% deviation`);
  } else {
    details.push('No significant depeg events in analyzed history');
  }
  
  return details;
}

function generateOracleDetails(oracleInfo) {
  const details = [];
  
  if (oracleInfo.usesChainlink) {
    details.push('Uses Chainlink price feeds for reliable data');
  }
  
  if (oracleInfo.hasMultipleOracles) {
    details.push('Multiple independent price oracles for redundancy');
  } else {
    details.push('Relies on a single oracle source');
  }
  
  if (oracleInfo.hasTimelock) {
    details.push('Timelock mechanism adds security to price updates');
  }
  
  if (oracleInfo.hasPriceDeviation) {
    details.push('Includes price deviation checks to prevent manipulation');
  }
  
  if (oracleInfo.centralizedOracle) {
    details.push('Centralized oracle components present security risks');
  } else {
    details.push('Decentralized oracle architecture reduces central points of failure');
  }
  
  return details;
}

function generateLiquidityDetails(liquidityData, totalLiquidity, topChainPercentage) {
  const details = [];
  
  // Format total liquidity
  let formattedLiquidity = '';
  if (totalLiquidity >= 1e9) {
    formattedLiquidity = `$${(totalLiquidity / 1e9).toFixed(2)}B`;
  } else if (totalLiquidity >= 1e6) {
    formattedLiquidity = `$${(totalLiquidity / 1e6).toFixed(2)}M`;
  } else {
    formattedLiquidity = `$${(totalLiquidity / 1e3).toFixed(2)}K`;
  }
  
  details.push(`Total liquidity of ${formattedLiquidity} across ${liquidityData.length} chains`);
  
  // Top chain concentration
  if (liquidityData.length > 0) {
    const topChain = liquidityData.reduce((max, current) => 
      current.amount > max.amount ? current : max
    , liquidityData[0]);
    
    details.push(`${topChainPercentage.toFixed(1)}% of liquidity concentrated on ${topChain.chain}`);
  }
  
  // Liquidity distribution assessment
  if (topChainPercentage > 90) {
    details.push('High concentration risk with majority on a single chain');
  } else if (topChainPercentage < 50 && liquidityData.length >= 3) {
    details.push('Well-distributed liquidity across multiple chains');
  }
  
  // Trading volume context (this would normally come from actual data)
  if (totalLiquidity > 1e9) {
    details.push('High trading volume supports market stability');
  } else if (totalLiquidity < 100e6) {
    details.push('Lower liquidity may lead to higher slippage on larger trades');
  }
  
  return details;
}