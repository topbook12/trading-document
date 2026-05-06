const fs = require('fs');
const files = ['src/App.tsx', 'src/components/AuthProvider.tsx'];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix double prefixes
  content = content.replace(/dark:bg-neutral-[0-9]+ dark:bg-neutral-([0-9]+)/g, 'dark:bg-neutral-$1');
  content = content.replace(/dark:text-neutral-[0-9]+ dark:text-([^ \"]+)/g, 'dark:text-$1');
  content = content.replace(/dark:border-neutral-[0-9]+ dark:border-([^ \"]+)/g, 'dark:border-$1');
  content = content.replace(/dark:placeholder-neutral-[0-9]+ dark:placeholder-([^ \"]+)/g, 'dark:placeholder-$1');
  content = content.replace(/dark:hover:bg-neutral-[0-9]+ dark:hover:bg-([^ \"]+)/g, 'dark:hover:bg-$1');
  
  // Fix repeated dark:placeholder-neutral-500
  content = content.replace(/(dark:placeholder-neutral-500\s*)+/g, 'dark:placeholder-neutral-500 ');
  content = content.replace(/(dark:text-neutral-500\s*)+/g, 'dark:text-neutral-500 ');

  fs.writeFileSync(file, content);
}
console.log('Fixed');
