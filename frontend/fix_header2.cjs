const fs = require('fs');
let text = fs.readFileSync('src/components/PublicHeader.tsx', 'utf8');
text = text.replace(/<HeroSlider heightClass="[^"]+" \/>/, '<HeroSlider />');
text = text.replace(/<HeroSlider \/>/g, '<HeroSlider />');
fs.writeFileSync('src/components/PublicHeader.tsx', text);
