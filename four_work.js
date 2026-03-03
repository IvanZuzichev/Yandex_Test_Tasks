export function jsonPatch(obj, transformations) {
  function processNode(node, path) {
    let transformedNode = applyTransformations(node, path);
    
    if (transformedNode === null) {
      return null;
    }
    
    if (Array.isArray(transformedNode)) {
      const result = [];
      for (let i = 0; i < transformedNode.length; i++) {
        const itemPath = [...path, i];
        const processedItem = processNode(transformedNode[i], itemPath);
        if (processedItem !== null) {
          result.push(processedItem);
        }
      }
      return result;
    }
    
    if (transformedNode && typeof transformedNode === 'object') {
      const result = {};
      for (const key in transformedNode) {
        if (Object.prototype.hasOwnProperty.call(transformedNode, key)) {
          const valuePath = [...path, key];
          const processedValue = processNode(transformedNode[key], valuePath);
          if (processedValue !== null) {
            result[key] = processedValue;
          }
        }
      }
      return result;
    }
    
    return transformedNode;
  }
  
  function applyTransformations(value, path) {
    let result = value;
    let lastDefinedResult = undefined;
    let hasDefinedResult = false;
    
    for (const transform of transformations) {
      const transformResult = transform(path, value);
      
      if (transformResult !== undefined) {
        lastDefinedResult = transformResult;
        hasDefinedResult = true;
      }
    }
    
    if (hasDefinedResult) {
      result = lastDefinedResult;
    }
    
    return result;
  }
  
  const finalResult = processNode(obj, []);
  
  if (finalResult === null) {
    return undefined;
  }
  
  return finalResult;
}