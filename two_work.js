export const harvest = async (treesCount, phone, analyzeTree) => {
  return new Promise((resolve) => {
    const maxMemory = phone.maxMemory;
    const results = new Array(treesCount).fill(null);
    let pendingCount = treesCount;
    let clearingInProgress = false;
    let clearCounter = 0;
    
    const inProgress = new Set();
    const retryQueue = new Set();
    
    let shouldStartNewAnalyses = false;
    let checkTimer = null;
    let isResolved = false;
    
    const startAnalysis = (index) => {
      if (index >= 0 && index < treesCount && results[index] === null && !inProgress.has(index)) {
        inProgress.add(index);
        analyzeTree(index);
        return true;
      }
      return false;
    };
    
    const startNewAnalyses = () => {
      if (clearingInProgress || isResolved) return;
      
      const inProgressCount = inProgress.size;
      
      if (inProgressCount >= maxMemory) {
        if (!clearingInProgress) {
          performClear();
        }
        return;
      }
      
      const freeSlots = maxMemory - inProgressCount;
      let started = 0;
      
      const queueArray = Array.from(retryQueue);
      for (let i = 0; i < queueArray.length && started < freeSlots; i++) {
        const index = queueArray[i];
        if (retryQueue.has(index)) {
          retryQueue.delete(index);
          if (startAnalysis(index)) {
            started++;
          }
        }
      }
      
      if (started < freeSlots) {
        for (let i = 0; i < treesCount && started < freeSlots; i++) {
          if (results[i] === null && !inProgress.has(i) && !retryQueue.has(i)) {
            if (startAnalysis(i)) {
              started++;
            }
          }
        }
      }
      
      shouldStartNewAnalyses = false;
    };
    
    const performClear = () => {
      if (clearingInProgress || isResolved) return;
      
      clearingInProgress = true;
      clearCounter++;
      
      phone.clearMessages();
    };
    
    phone.on('analyze', (treeIndex, applesCount) => {
      if (treeIndex < 0 || treeIndex >= treesCount || results[treeIndex] !== null || isResolved) {
        return;
      }
      
      results[treeIndex] = applesCount;
      pendingCount--;
      
      inProgress.delete(treeIndex);
      retryQueue.delete(treeIndex);
      
      if (pendingCount === 0 && !isResolved) {
        isResolved = true;
        if (checkTimer) {
          clearInterval(checkTimer);
          checkTimer = null;
        }
        const maxApples = calculateMaxApples(results);
        
        setTimeout(() => {
          resolve(maxApples);
        }, 0);
        return;
      }
      
      shouldStartNewAnalyses = true;
    });
    
    phone.on('messagesCleared', (memoryLeft) => {
      clearingInProgress = false;
      
      const clearType = clearCounter % 3;
      let messagesRemoved;
      
      if (clearType === 1) messagesRemoved = 1;
      else if (clearType === 2) messagesRemoved = 2;
      else messagesRemoved = 3;
      
      if (inProgress.size > 0) {
        for (const index of inProgress) {
          retryQueue.add(index);
        }
        inProgress.clear();
      }
      
      shouldStartNewAnalyses = true;
    });
    
    const startCount = Math.min(maxMemory, treesCount);
    for (let i = 0; i < startCount; i++) {
      startAnalysis(i);
    }
    
    checkTimer = setInterval(() => {
      if (pendingCount === 0 || isResolved) {
        if (checkTimer) {
          clearInterval(checkTimer);
          checkTimer = null;
        }
        return;
      }
      
      if (shouldStartNewAnalyses && !clearingInProgress) {
        startNewAnalyses();
      }
    }, 5); 
    
    
    const flush = setTimeout(() => {
      if (!isResolved && pendingCount > 0) {
      
        shouldStartNewAnalyses = true;
        startNewAnalyses();
      }
    }, 1000);
    
    const cleanup = () => {
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
      }
      clearTimeout(flush);
    };
    
    const finalCheck = setInterval(() => {
      if (pendingCount === 0 && !isResolved) {
        isResolved = true;
        cleanup();
        const maxApples = calculateMaxApples(results);
        resolve(maxApples);
      }
    }, 10);
    
    function calculateMaxApples(apples) {
      if (apples.length === 0) return 0;
      if (apples.length === 1) return apples[0] || 0;
      
      let prev2 = apples[0] || 0;
      let prev1 = Math.max(apples[0] || 0, apples[1] || 0);
      
      for (let i = 2; i < apples.length; i++) {
        const current = Math.max(prev1, (apples[i] || 0) + prev2);
        prev2 = prev1;
        prev1 = current;
      }
      
      return prev1;
    }
  });
};