const fs = require('fs');
let text = fs.readFileSync('src/pages/Home.tsx', 'utf8');

text = text.replace(
  /function BannerBox.*?\{[\s\S]*?return \([\s\S]*?\n\}/,
  `import { useEffect, useState } from 'react';
import { getSettings } from '../lib/api';

function BannerBox({ settingKey, className }: { settingKey: string; className?: string }) {
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    getSettings().then(r => {
      const settings = r.settings as any;
      if (settings[settingKey]) setUrl(settings[settingKey]);
    });
  }, [settingKey]);

  if (!url) return null;

  return (
    <div className={\`card overflow-hidden \${className || ''}\`}>
      <img src={url} alt="Banner" className="w-full h-full object-cover" />
    </div>
  )
}`
);

text = text.replace(/<BannerBox label="BANNER B" className="aspect-\[9\/20\]" \/>/g, '<BannerBox settingKey="banner_sidebar" className="aspect-[9/20]" />');
text = text.replace(/<BannerBox label="BANNER B2" className="aspect-\[9\/16\]" \/>/g, '');
text = text.replace(/<BannerBox label="BANNER B3" className="aspect-\[9\/16\]" \/>/g, '');
text = text.replace(/<BannerBox label="BANNER C \(principal\)" className="aspect-\[16\/9\] sm:aspect-\[21\/9\]" \/>/g, '<BannerBox settingKey="banner_main_1" className="aspect-[16/9] sm:aspect-[21/9]" />');
text = text.replace(/<BannerBox label="BANNER D" \/>/g, '');
text = text.replace(/<BannerBox label="BANNER E" \/>/g, '');

fs.writeFileSync('src/pages/Home.tsx', text);
