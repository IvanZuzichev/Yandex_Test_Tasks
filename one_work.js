module.exports = async function interpretNavConfig(config, inputPath) {
  const { pathRules = [], processors = {}, errorPath } = config;
  let currentPath = inputPath.split('/').filter(Boolean);
  const MAX_ITERATIONS = 100;
  let iterations = 0;
  
  while (iterations < MAX_ITERATIONS) {
    iterations++;
    let matchedRule = null;
    let matchedParams = null;
    
    for (const rule of pathRules) {
      const result = matchPattern(rule.pattern, currentPath);
      if (result) {
        matchedRule = rule;
        matchedParams = result;
        break;
      }
    }
    
    if (!matchedRule) {
      return errorPath;
    }
    
    if (matchedRule.redirect) {
      currentPath = substituteParams(matchedRule.redirect, matchedParams).split('/').filter(Boolean);
      continue;
    }
    
    if (matchedRule.processors && matchedRule.processors.length > 0) {
      let processorResult = null;
      let processorReturnedString = false;
      
      for (const processorName of matchedRule.processors) {
        const processor = processors[processorName];
        if (typeof processor === 'function') {
          try {
            processorResult = await processor(matchedParams, currentPath.join('/'));
            if (typeof processorResult === 'string') {
              currentPath = processorResult.split('/').filter(Boolean);
              processorReturnedString = true;
              break;
            }
          } catch (e) {
            return errorPath;
          }
        }
      }
      
      if (processorReturnedString) {
        continue;
      }
    }
    
    if (matchedRule.destination) {
      return substituteParams(matchedRule.destination, matchedParams);
    }
    
    return errorPath;
  }
  
  return errorPath;
}

function matchPattern(pattern, pathSegments) {
  const patternSegments = pattern.split('/').filter(Boolean);
  
  let minSegments = 0;
  let maxSegments = 0;
  
  for (const segment of patternSegments) {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const paramDef = segment.slice(1, -1);
      const isOptional = paramDef.includes('?');
      maxSegments++;
      if (!isOptional) {
        minSegments++;
      }
    } else {
      minSegments++;
      maxSegments++;
    }
  }
  
  if (pathSegments.length < minSegments || pathSegments.length > maxSegments) {
    return null;
  }
  
  const params = {};
  let pathIndex = 0;
  let patternIndex = 0;
  
  while (patternIndex < patternSegments.length && pathIndex < pathSegments.length) {
    const patternSegment = patternSegments[patternIndex];
    
    if (patternSegment.startsWith('[') && patternSegment.endsWith(']')) {
      const paramDef = patternSegment.slice(1, -1);
      
      let paramName = paramDef;
      let isOptional = false;
      let isCaseInsensitive = false;
      
      if (paramName.includes('?')) {
        isOptional = true;
        paramName = paramName.replace('?', '');
      }
      if (paramName.includes('~')) {
        isCaseInsensitive = true;
        paramName = paramName.replace('~', '');
      }
      
      const value = pathSegments[pathIndex];
      
      if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length === 0) {
        return null;
      }
      
      params[paramName] = isCaseInsensitive ? value.toLowerCase() : value;
      pathIndex++;
      patternIndex++;
    } else {
      if (pathSegments[pathIndex] !== patternSegment) {
        return null;
      }
      pathIndex++;
      patternIndex++;
    }
  }
  
  while (patternIndex < patternSegments.length) {
    const patternSegment = patternSegments[patternIndex];
    
    if (patternSegment.startsWith('[') && patternSegment.endsWith(']')) {
      const paramDef = patternSegment.slice(1, -1);
      const isOptional = paramDef.includes('?');
      
      if (!isOptional) {
        return null;
      }
      patternIndex++;
    } else {
      return null;
    }
  }
  
  if (pathIndex !== pathSegments.length) {
    return null;
  }
  
  return params;
}

function substituteParams(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, paramName) => {
    return params[paramName] !== undefined ? params[paramName] : match;
  });
}