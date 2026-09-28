const fs = require('fs');
let c = fs.readFileSync('src/app/landing/page.tsx', 'utf8');

// Replace import
c = c.replace(
  'import { ParallaxScrollModels } from "@/components/ui/parallax-scroll-feature-section";',
  'import { ElasticGallery } from "@/components/ui/elastic-gallery";'
);

// Replace component usage
c = c.replace(
  '<ParallaxScrollModels />',
  '<ElasticGallery />'
);

// Remove unused imports from landing page (models array no longer needed in landing)
// Keep the models array in case it's used elsewhere, but clean up unused lucide imports
// Actually, let's just leave it - models is still used for the nav scroll

fs.writeFileSync('src/app/landing/page.tsx', c);
console.log('Noor section swapped');
