const fs = require('fs');
let text = fs.readFileSync('src/components/PublicHeader.tsx', 'utf8');

text = text.replace(
  /function HeroSlider.*?\{[\s\S]*?return \([\s\S]*?\)\n\}/,
  `function HeroSlider() {
  const [banner, setBanner] = useState<string | undefined>(undefined);
  useEffect(() => {
    import('../lib/api').then(({ getSettings }) => {
      getSettings().then(r => setBanner(r.settings?.banner_main_1));
    });
  }, []);
  
  if (!banner) return null;
  
  return (
    <div className="relative w-full h-28 md:h-32 bg-slate-100 overflow-hidden">
      <img src={banner} className="w-full h-full object-cover" alt="Banner Principal" />
    </div>
  )
}`
);
fs.writeFileSync('src/components/PublicHeader.tsx', text);
