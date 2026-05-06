const fs = require('fs');

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix duplicates like "bg-white dark:bg-white dark:bg-neutral-900" 
// Or "text-neutral-900 dark:text-neutral-900 dark:text-neutral-50"
content = content.replace(/dark:bg-[a-z0-9-]+\s+dark:bg-([a-z0-9-]+)/g, 'dark:bg-$1');
content = content.replace(/dark:text-[a-z0-9-]+\s+dark:text-([a-z0-9-]+)/g, 'dark:text-$1');
content = content.replace(/dark:border-[a-z0-9-]+\s+dark:border-([a-z0-9-]+)/g, 'dark:border-$1');
content = content.replace(/bg-white\s+dark:bg-white/g, 'bg-white');

fs.writeFileSync(file, content);
console.log("Cleanup done.");
