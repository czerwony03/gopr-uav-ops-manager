/**
 * Dynamic PWA Meta Tags Injection
 * This script runs on page load to inject PWA meta tags into the document head
 * This is a workaround for Expo Router not supporting static meta tag injection
 */

export const injectPWAMetaTags = () => {
  if (typeof document === 'undefined') {
    return; // Not in browser environment
  }

  const head = document.head;
  
  // Meta tags to inject
  const metaTags = [
    { name: 'theme-color', content: '#009688' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'GOPR UAV Ops' },
    { name: 'description', content: 'Comprehensive UAV operations management system for GOPR Bieszczady' },
    { name: 'format-detection', content: 'telephone=no' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'msapplication-config', content: '/browserconfig.xml' },
    { name: 'msapplication-TileColor', content: '#009688' },
    { name: 'msapplication-tap-highlight', content: 'no' },
    { name: 'keywords', content: 'UAV, drone, operations, management, GOPR, Bieszczady, search, rescue' },
    { name: 'author', content: 'GOPR Bieszczady' },
    // Open Graph tags
    { property: 'og:title', content: 'GOPR UAV Ops Manager' },
    { property: 'og:description', content: 'Comprehensive UAV operations management system for GOPR Bieszczady' },
    { property: 'og:image', content: '/assets/images/icon.png' },
    { property: 'og:type', content: 'website' },
    // Twitter tags
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'GOPR UAV Ops Manager' },
    { name: 'twitter:description', content: 'Comprehensive UAV operations management system for GOPR Bieszczady' },
    { name: 'twitter:image', content: '/assets/images/icon.png' },
  ];

  const linkTags = [
    { rel: 'manifest', href: '/manifest.json' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/assets/images/favicon.png' },
    { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/assets/images/icon.png' },
    { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/assets/images/icon.png' },
    { rel: 'apple-touch-icon', href: '/assets/images/icon.png' },
    { rel: 'apple-touch-startup-image', href: '/assets/images/splash-icon.png' },
  ];

  // Function to check if a meta/link tag already exists
  const tagExists = (tagType: string, identifier: string, value: string): boolean => {
    return !!document.querySelector(`${tagType}[${identifier}="${value}"]`);
  };

  // Inject meta tags
  metaTags.forEach(tag => {
    const identifier = tag.name ? 'name' : 'property';
    const value = tag.name || tag.property;
    
    if (!tagExists('meta', identifier, value!)) {
      const metaElement = document.createElement('meta');
      if (tag.name) {
        metaElement.setAttribute('name', tag.name);
      } else if (tag.property) {
        metaElement.setAttribute('property', tag.property);
      }
      metaElement.setAttribute('content', tag.content);
      head.appendChild(metaElement);
    }
  });

  // Inject link tags
  linkTags.forEach(tag => {
    if (!tagExists('link', 'rel', tag.rel)) {
      const linkElement = document.createElement('link');
      Object.keys(tag).forEach(attr => {
        // @ts-ignore
        linkElement.setAttribute(attr, tag[attr as keyof typeof tag]);
      });
      head.appendChild(linkElement);
    }
  });

  // Update the title if needed
  if (!document.title || document.title.trim() === '') {
    document.title = 'GOPR UAV Ops Manager';
  }

  console.log('[PWA] Meta tags and link tags injected successfully');
};
