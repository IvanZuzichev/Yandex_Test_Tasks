const fs = require('fs');
const { execSync } = require('child_process');

const LEVEL_CONFIG = {
  '#ebedf0': { level: 0, minCommits: 0 },
  '#9be9a8': { level: 1, minCommits: 1 },
  '#40c463': { level: 2, minCommits: 3 },
  '#30a14e': { level: 3, minCommits: 6 },
  '#216e39': { level: 4, minCommits: 11 }
};

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Укажите путь к JSON-файлу');
  process.exit(1);
}

const colors = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const today = new Date();
today.setHours(0, 0, 0, 0);

const startDate = new Date(today);
startDate.setDate(today.getDate() - 364);

const dayOfWeek = startDate.getDay(); 
startDate.setDate(startDate.getDate() - dayOfWeek);

const todayDayOfWeek = today.getDay();

const numCols = new Array(7).fill(53);

for (let row = 0; row <= todayDayOfWeek; row++) {
  numCols[row] = 54;
}

const expectedTotal = numCols.reduce((sum, cols) => sum + cols, 0);
if (colors.length !== expectedTotal) {
  console.error(`Ожидалось ${expectedTotal} цветов, получено ${colors.length}`);
  process.exit(1);
}

let colorIndex = 0;
for (let row = 0; row < 7; row++) {
  for (let col = 0; col < numCols[row]; col++) {
    const color = colors[colorIndex++];
    const level = LEVEL_CONFIG[color];
    
    if (!level) {
      console.error(`Неизвестный цвет: ${color}`);
      process.exit(1);
    }
    
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + (col * 7) + row);
    
    if (cellDate > today) {
      console.error(`Дата ${cellDate.toISOString()} в будущем`);
      process.exit(1);
    }
    
    for (let i = 0; i < level.minCommits; i++) {

      const dateWithTime = new Date(cellDate);
      dateWithTime.setHours(
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );
      
      const timestamp = dateWithTime.toISOString().replace('Z', '');
      
      try {
        execSync(`git commit --allow-empty -m "Activity commit ${timestamp}"`, {
          env: {
            ...process.env,
            GIT_AUTHOR_DATE: timestamp,
            GIT_COMMITTER_DATE: timestamp,
          }
        });
      } catch (error) {
        console.error(`Ошибка создания коммита для ${timestamp}:`, error.message);
        process.exit(1);
      }
    }
  }
}

console.log('Все коммиты успешно созданы!');