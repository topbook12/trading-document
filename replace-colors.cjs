const fs = require('fs');

const files = ['src/App.tsx', 'src/components/AuthProvider.tsx'];

const replacements = [
  { search: /\bbg-neutral-950\b/g, replace: 'bg-neutral-50 dark:bg-neutral-950' },
  { search: /\bbg-neutral-900\b/g, replace: 'bg-white dark:bg-neutral-900' },
  { search: /\bbg-neutral-800\b/g, replace: 'bg-neutral-100 dark:bg-neutral-800' },
  { search: /\bbg-neutral-700\b/g, replace: 'bg-neutral-200 dark:bg-neutral-700' },
  { search: /\bhover:bg-neutral-800\b/g, replace: 'hover:bg-neutral-100 dark:hover:bg-neutral-800' },
  { search: /\bhover:bg-neutral-700\b/g, replace: 'hover:bg-neutral-200 dark:hover:bg-neutral-700' },
  
  { search: /\btext-neutral-50\b/g, replace: 'text-neutral-900 dark:text-neutral-50' },
  { search: /\btext-white\b/g, replace: 'text-neutral-900 dark:text-white' },
  { search: /\btext-neutral-300\b/g, replace: 'text-neutral-700 dark:text-neutral-300' },
  { search: /\btext-neutral-400\b/g, replace: 'text-neutral-600 dark:text-neutral-400' },
  { search: /\btext-neutral-500\b/g, replace: 'text-neutral-500 dark:text-neutral-500' },
  { search: /\bhover:text-white\b/g, replace: 'hover:text-neutral-900 dark:hover:text-white' },
  { search: /\bhover:text-neutral-200\b/g, replace: 'hover:text-neutral-800 dark:hover:text-neutral-200' },
  { search: /\bhover:text-neutral-300\b/g, replace: 'hover:text-neutral-700 dark:hover:text-neutral-300' },
  
  { search: /\bborder-neutral-800\b/g, replace: 'border-neutral-200 dark:border-neutral-800' },
  { search: /\bborder-neutral-700\b/g, replace: 'border-neutral-300 dark:border-neutral-700' },
  
  { search: /\bplaceholder-neutral-600\b/g, replace: 'placeholder-neutral-400 dark:placeholder-neutral-600' },
  { search: /\bplaceholder-neutral-500\b/g, replace: 'placeholder-neutral-500 dark:placeholder-neutral-500' },
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  for (const { search, replace } of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(file, content);
}
console.log('Classes updated');
